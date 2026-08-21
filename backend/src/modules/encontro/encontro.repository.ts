import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  EncontroCombatenteInternoAdicionarDto,
  EncontroCombatenteInternoAlterarCondicoesDto,
  EncontroCombatenteInternoAlterarIniciativaDto,
  EncontroCombatenteInternoAlterarVidaAvulsoDto,
  EncontroCombatenteLinhaDto,
  EncontroEventoDto,
  EncontroEventoInternoRegistrarDto,
  EncontroInternoAlterarStatusDto,
  EncontroInternoAlterarTurnoDto,
  EncontroInternoCriarDto,
  EncontroLinhaDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import { EncontroStatusEnum } from '@contratados-rpg/shared/enums';
import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/**
 * Repositório do módulo `encontro` (m7-03) — SQL bruto only, sem lógica de negócio. Dono das
 * queries de `encontro`, `encontro_combatente` e `encontro_evento` (proibição #23); permissão e
 * regra são arbitradas na service. `status` traduz `codigo ↔ id` de `tipo_encontro_status` no SQL
 * (§10.2.12) — a service só vê o `codigo` (`EncontroStatusEnum`).
 *
 * **Fonte única:** nenhuma query aqui grava vida/energia de combatente com ficha. Só o avulso tem
 * `vida_atual_avulso`; quem tem ficha muda pela `FichaService`, dona dessa regra.
 */
@Injectable()
export class EncontroRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'encontro');
  }

  /** Colunas do recorte `EncontroLinhaDto`, com o `codigo` do status resolvido pelo `JOIN`. */
  private colunasEncontro(): string {
    return `encontro.id, encontro.campanha_id AS "campanhaId", encontro.nome,
            tipo_encontro_status.codigo AS status,
            encontro.rodada_atual AS "rodadaAtual", encontro.turno_indice AS "turnoIndice"`;
  }

  /** `JOIN` que resolve o `codigo` do status em `colunasEncontro()`. */
  private juncaoStatus(): string {
    return `INNER JOIN tipo_encontro_status
              ON tipo_encontro_status.id = encontro.tipo_encontro_status_id
             AND tipo_encontro_status.is_deleted = false`;
  }

  /**
   * Insere o encontro e devolve a linha já com o `codigo` do status (o `RETURNING` não junta a
   * tabela de referência). Padrão `INSERT ... SELECT ... RETURNING`, BaseEntity explícita, sem
   * `VALUES` e sem `DEFAULT`.
   */
  async criarEncontro(dto: EncontroInternoCriarDto): Promise<EncontroLinhaDto> {
    const [encontroInserido] = await this.executarConsulta<{ id: number }>(
      `INSERT INTO encontro (campanha_id, tipo_encontro_status_id, nome, rodada_atual, turno_indice, created_date, updated_date, is_deleted)
       SELECT :campanhaId,
              (SELECT id FROM tipo_encontro_status WHERE codigo = :status AND is_deleted = false),
              :nome, 0, 0, NOW(), NOW(), false
       RETURNING id`,
      { campanhaId: dto.campanhaId, status: dto.status, nome: dto.nome },
    );

    return this.recuperarPorId({ id: encontroInserido.id }) as Promise<EncontroLinhaDto>;
  }

  /** Recupera um encontro por id, ou `null` quando não existe/está excluído. */
  async recuperarPorId(dto: { id: number }): Promise<EncontroLinhaDto | null> {
    const [encontroEncontrado] = await this.executarConsulta<EncontroLinhaDto>(
      `SELECT ${this.colunasEncontro()}
       FROM encontro
       ${this.juncaoStatus()}
       WHERE encontro.id = :id AND encontro.is_deleted = false`,
      { id: dto.id },
    );
    return encontroEncontrado ?? null;
  }

  /**
   * O encontro **não-encerrado** da campanha, se houver — a invariante de "um por campanha" é
   * arbitrada pela service com esta consulta (o PostgreSQL não aceita subquery no predicado de um
   * índice parcial; ver a migration 0021).
   */
  async recuperarAbertoPorCampanha(dto: { campanhaId: number }): Promise<EncontroLinhaDto | null> {
    const [encontroAberto] = await this.executarConsulta<EncontroLinhaDto>(
      `SELECT ${this.colunasEncontro()}
       FROM encontro
       ${this.juncaoStatus()}
       WHERE encontro.campanha_id = :campanhaId
         AND encontro.is_deleted = false
         AND tipo_encontro_status.codigo <> :statusEncerrado`,
      { campanhaId: dto.campanhaId, statusEncerrado: EncontroStatusEnum.ENCERRADO },
    );
    return encontroAberto ?? null;
  }

  /** Encontros de uma campanha (corrente + histórico), mais recente primeiro. */
  async listarPorCampanha(dto: { campanhaId: number }): Promise<EncontroResumoDto[]> {
    return this.executarConsulta<EncontroResumoDto>(
      `SELECT encontro.id, encontro.campanha_id AS "campanhaId", encontro.nome,
              tipo_encontro_status.codigo AS status,
              encontro.rodada_atual AS "rodadaAtual",
              (SELECT COUNT(*) FROM encontro_combatente
                WHERE encontro_combatente.encontro_id = encontro.id
                  AND encontro_combatente.is_deleted = false)::int AS "quantidadeCombatentes",
              encontro.created_date AS "createdDate"
       FROM encontro
       ${this.juncaoStatus()}
       WHERE encontro.campanha_id = :campanhaId AND encontro.is_deleted = false
       ORDER BY encontro.created_date DESC`,
      { campanhaId: dto.campanhaId },
    );
  }

  /** Troca a situação do encontro, reposicionando rodada/turno na mesma escrita. */
  async alterarStatus(dto: EncontroInternoAlterarStatusDto): Promise<EncontroLinhaDto> {
    await this.executarComando(
      `UPDATE encontro
       SET tipo_encontro_status_id = (SELECT id FROM tipo_encontro_status WHERE codigo = :status AND is_deleted = false),
           rodada_atual = :rodadaAtual,
           turno_indice = :turnoIndice
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, status: dto.status, rodadaAtual: dto.rodadaAtual, turnoIndice: dto.turnoIndice },
    );
    return this.recuperarPorId({ id: dto.id }) as Promise<EncontroLinhaDto>;
  }

  /** Avança/volta o turno — só as duas colunas de posição. */
  async alterarTurno(dto: EncontroInternoAlterarTurnoDto): Promise<EncontroLinhaDto> {
    await this.executarComando(
      `UPDATE encontro
       SET rodada_atual = :rodadaAtual, turno_indice = :turnoIndice
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, rodadaAtual: dto.rodadaAtual, turnoIndice: dto.turnoIndice },
    );
    return this.recuperarPorId({ id: dto.id }) as Promise<EncontroLinhaDto>;
  }

  /** Soft delete do encontro (proibição #14 — nunca DELETE físico). */
  async excluirEncontro(dto: { id: number }): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }

  /**
   * Colunas do recorte `EncontroCombatenteLinhaDto`, com a ficha resolvida por `LEFT JOIN` (o
   * combatente avulso não tem ficha). `fichaDados` sai como o JSONB cru — a service interpreta a
   * forma (jogador × criatura).
   */
  private colunasCombatente(): string {
    return `encontro_combatente.id, encontro_combatente.encontro_id AS "encontroId",
            encontro_combatente.ficha_id AS "fichaId",
            encontro_combatente.nome_avulso AS "nomeAvulso",
            encontro_combatente.iniciativa, encontro_combatente.cadencia, encontro_combatente.ordem,
            encontro_combatente.vida_maxima_avulso AS "vidaMaximaAvulso",
            encontro_combatente.vida_atual_avulso AS "vidaAtualAvulso",
            encontro_combatente.condicoes,
            ficha.nome AS "fichaNome", ficha.cor AS "fichaCor",
            ficha.imagem_url AS "fichaImagemUrl", ficha.imagem_foco AS "fichaImagemFoco",
            tipo_ficha.codigo AS "tipoFicha", ficha.dados AS "fichaDados"`;
  }

  /** `JOIN`s de `colunasCombatente()` — `LEFT`, porque avulso não tem ficha. */
  private juncoesCombatente(): string {
    return `LEFT JOIN ficha ON ficha.id = encontro_combatente.ficha_id AND ficha.is_deleted = false
            LEFT JOIN tipo_ficha ON tipo_ficha.id = ficha.tipo_ficha_id AND tipo_ficha.is_deleted = false`;
  }

  /** Combatentes ativos do encontro, na ordem de entrada (a ordem de turno é do motor puro). */
  async listarCombatentes(dto: { encontroId: number }): Promise<EncontroCombatenteLinhaDto[]> {
    return this.executarConsulta<EncontroCombatenteLinhaDto>(
      `SELECT ${this.colunasCombatente()}
       FROM encontro_combatente
       ${this.juncoesCombatente()}
       WHERE encontro_combatente.encontro_id = :encontroId AND encontro_combatente.is_deleted = false
       ORDER BY encontro_combatente.ordem ASC, encontro_combatente.id ASC`,
      { encontroId: dto.encontroId },
    );
  }

  /** Um combatente por id, ou `null` quando não existe/está excluído. */
  async recuperarCombatentePorId(dto: { id: number }): Promise<EncontroCombatenteLinhaDto | null> {
    const [combatenteEncontrado] = await this.executarConsulta<EncontroCombatenteLinhaDto>(
      `SELECT ${this.colunasCombatente()}
       FROM encontro_combatente
       ${this.juncoesCombatente()}
       WHERE encontro_combatente.id = :id AND encontro_combatente.is_deleted = false`,
      { id: dto.id },
    );
    return combatenteEncontrado ?? null;
  }

  /** Confirma a posse da ficha ligada ao combatente sem ampliar o recorte público do encontro. */
  async combatentePertenceAoUsuario(dto: { id: number; usuarioId: number }): Promise<boolean> {
    const [resultado] = await this.executarConsulta<{ pertence: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM encontro_combatente
         INNER JOIN ficha ON ficha.id = encontro_combatente.ficha_id
           AND ficha.is_deleted = false
         WHERE encontro_combatente.id = :id
           AND encontro_combatente.is_deleted = false
           AND ficha.usuario_id = :usuarioId
       ) AS pertence`,
      dto,
    );
    return resultado?.pertence ?? false;
  }

  /** Maior `ordem` já usada no encontro — a service posiciona o próximo combatente no fim. */
  async recuperarMaiorOrdem(dto: { encontroId: number }): Promise<number> {
    const [linhaMaiorOrdem] = await this.executarConsulta<{ maiorOrdem: number | null }>(
      `SELECT MAX(encontro_combatente.ordem) AS "maiorOrdem"
       FROM encontro_combatente
       WHERE encontro_combatente.encontro_id = :encontroId AND encontro_combatente.is_deleted = false`,
      { encontroId: dto.encontroId },
    );
    return linhaMaiorOrdem?.maiorOrdem ?? 0;
  }

  /** Insere o combatente e devolve a linha já com a ficha resolvida. */
  async adicionarCombatente(
    dto: EncontroCombatenteInternoAdicionarDto,
  ): Promise<EncontroCombatenteLinhaDto> {
    const [combatenteInserido] = await this.executarConsulta<{ id: number }>(
      `INSERT INTO encontro_combatente (encontro_id, ficha_id, nome_avulso, iniciativa, cadencia, ordem, vida_maxima_avulso, vida_atual_avulso, condicoes, created_date, updated_date, is_deleted)
       SELECT :encontroId, :fichaId, :nomeAvulso, NULL, :cadencia, :ordem,
              :vidaMaximaAvulso, :vidaAtualAvulso, :condicoes::jsonb, NOW(), NOW(), false
       RETURNING id`,
      {
        encontroId: dto.encontroId,
        fichaId: dto.fichaId,
        nomeAvulso: dto.nomeAvulso,
        cadencia: dto.cadencia,
        ordem: dto.ordem,
        vidaMaximaAvulso: dto.vidaMaximaAvulso,
        vidaAtualAvulso: dto.vidaAtualAvulso,
        condicoes: JSON.stringify([]),
      },
    );

    return this.recuperarCombatentePorId({
      id: combatenteInserido.id,
    }) as Promise<EncontroCombatenteLinhaDto>;
  }

  /** Soft delete de um combatente — a tabela não é a do `BaseRepository`, então o UPDATE é local. */
  async removerCombatente(dto: { id: number }): Promise<void> {
    await this.executarComando(
      `UPDATE encontro_combatente
       SET is_deleted = true, deleted_date = NOW()
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id },
    );
  }

  /** Grava a iniciativa de um combatente (rolagem do jogador ou override do mestre). */
  async alterarIniciativa(
    dto: EncontroCombatenteInternoAlterarIniciativaDto,
  ): Promise<EncontroCombatenteLinhaDto> {
    await this.executarComando(
      `UPDATE encontro_combatente
       SET iniciativa = :iniciativa
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, iniciativa: dto.iniciativa },
    );
    return this.recuperarCombatentePorId({ id: dto.id }) as Promise<EncontroCombatenteLinhaDto>;
  }

  /** Reescreve o JSONB de condições de um combatente. */
  async alterarCondicoes(
    dto: EncontroCombatenteInternoAlterarCondicoesDto,
  ): Promise<EncontroCombatenteLinhaDto> {
    await this.executarComando(
      `UPDATE encontro_combatente
       SET condicoes = :condicoes::jsonb
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, condicoes: JSON.stringify(dto.condicoes) },
    );
    return this.recuperarCombatentePorId({ id: dto.id }) as Promise<EncontroCombatenteLinhaDto>;
  }

  /**
   * Ajusta a vida de um combatente **avulso**. Combatente com ficha nunca passa por aqui: a vida
   * dele é a da ficha (fonte única) e muda pela `FichaService`.
   */
  async alterarVidaAvulso(
    dto: EncontroCombatenteInternoAlterarVidaAvulsoDto,
  ): Promise<EncontroCombatenteLinhaDto> {
    await this.executarComando(
      `UPDATE encontro_combatente
       SET vida_atual_avulso = :vidaAtualAvulso
       WHERE id = :id AND is_deleted = false AND ficha_id IS NULL`,
      { id: dto.id, vidaAtualAvulso: dto.vidaAtualAvulso },
    );
    return this.recuperarCombatentePorId({ id: dto.id }) as Promise<EncontroCombatenteLinhaDto>;
  }

  /** Registra uma entrada no log do encontro. */
  async registrarEvento(dto: EncontroEventoInternoRegistrarDto): Promise<void> {
    await this.executarComando(
      `INSERT INTO encontro_evento (encontro_id, encontro_combatente_id, tipo, rodada, turno, texto, created_date, updated_date, is_deleted)
       SELECT :encontroId, :combatenteId, :tipo, :rodada, :turno, :texto, NOW(), NOW(), false`,
      {
        encontroId: dto.encontroId,
        combatenteId: dto.combatenteId,
        tipo: dto.tipo,
        rodada: dto.rodada,
        turno: dto.turno,
        texto: dto.texto,
      },
    );
  }

  /**
   * Log do encontro, mais recente primeiro. Teto de 100 linhas — o painel mostra a rodada corrente
   * e as vizinhas, não o histórico integral de um combate longo.
   */
  async listarEventos(dto: { encontroId: number }): Promise<EncontroEventoDto[]> {
    return this.executarConsulta<EncontroEventoDto>(
      `SELECT encontro_evento.id, encontro_evento.tipo, encontro_evento.rodada, encontro_evento.turno,
              encontro_evento.texto,
              encontro_evento.encontro_combatente_id AS "combatenteId",
              encontro_evento.created_date AS "createdDate"
       FROM encontro_evento
       WHERE encontro_evento.encontro_id = :encontroId AND encontro_evento.is_deleted = false
       ORDER BY encontro_evento.id DESC
       LIMIT 100`,
      { encontroId: dto.encontroId },
    );
  }
}
