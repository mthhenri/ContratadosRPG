import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  CampanhaAlteradaDto,
  CampanhaConviteInternoAlterarDto,
  CampanhaConviteRecuperarDto,
  CampanhaConviteRegeneradoDto,
  CampanhaCriadaDto,
  CampanhaExcluirDto,
  CampanhaInternoAlterarDto,
  CampanhaInternoCriarDto,
  CampanhaListarDto,
  CampanhaMembroInternoCriarDto,
  CampanhaMembroInternoRecuperadoDto,
  CampanhaMembroInternoRecuperarDto,
  CampanhaMembroInternoRemoverDto,
  CampanhaMembroResumoDto,
  CampanhaMembrosListarDto,
  CampanhaMestreInternoTransferirDto,
  CampanhaRecuperadaDto,
  CampanhaRecuperarDto,
  CampanhaResumoDto,
} from '@contratados-rpg/shared/dtos/campanha';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/**
 * Repositório do módulo `campanha` — SQL bruto only, sem lógica de negócio (SYSTEM.SPEC
 * §7.1). Dono das queries das tabelas `campanha` e `campanha_membro` (proibição #23). Todo
 * SELECT filtra `is_deleted = false`; a tradução `codigo ↔ id` do papel
 * (`tipo_campanha_membro_papel`) acontece aqui, no SQL (§10.2.12) — a service só vê o `codigo`.
 */
@Injectable()
export class CampanhaRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'campanha');
  }

  /**
   * Insere uma nova campanha e retorna seus dados. O `codigoConvite` já vem gerado da
   * service. Segue o padrão `INSERT ... SELECT ... RETURNING` com BaseEntity explícita, sem
   * `VALUES` e sem `DEFAULT` (§10.2.6/§10.2.8).
   */
  async criarCampanha(dto: CampanhaInternoCriarDto): Promise<CampanhaCriadaDto> {
    const [campanhaCriada] = await this.executarConsulta<CampanhaCriadaDto>(
      `INSERT INTO campanha (nome, descricao, codigo_convite, created_date, updated_date, is_deleted)
       SELECT :nome, :descricao, :codigoConvite, NOW(), NOW(), false
       RETURNING id, nome, descricao, codigo_convite AS "codigoConvite"`,
      { nome: dto.nome, descricao: dto.descricao ?? null, codigoConvite: dto.codigoConvite },
    );
    return campanhaCriada;
  }

  /**
   * Cria o vínculo `campanha_membro` de um usuário numa campanha com o `papel` informado.
   * Traduz o `codigo` do papel para o `id` da tabela de referência via subconsulta
   * (§10.2.12). Fire-and-forget — o `RETURNING id` cumpre a regra de INSERT (§10.2.8).
   */
  async criarMembro(dto: CampanhaMembroInternoCriarDto): Promise<void> {
    await this.executarComando(
      `INSERT INTO campanha_membro (campanha_id, usuario_id, tipo_campanha_membro_papel_id, created_date, updated_date, is_deleted)
       SELECT :campanhaId, :usuarioId,
              (SELECT id FROM tipo_campanha_membro_papel WHERE codigo = :papel AND is_deleted = false),
              NOW(), NOW(), false
       RETURNING id`,
      { campanhaId: dto.campanhaId, usuarioId: dto.usuarioId, papel: dto.papel },
    );
  }

  /**
   * Lista as campanhas de que o usuário é membro, com o `papel` dele em cada uma, enriquecida
   * para o painel de controle (m2-18). Base igual à anterior (`campanha_membro` → `campanha` →
   * `tipo_campanha_membro_papel`); três `LEFT JOIN LATERAL` a mais, cada um correlacionado por
   * `campanha.id` (e, para fichas, também por `campanha_membro.usuario_id`/`papel` — a mesma
   * linha de membro que a query já tem à mão, sem precisar de outro `WHERE` externo):
   *
   * - `membros_agregado`: `COUNT` de `campanha_membro` ativo da campanha → `totalMembros`.
   * - `fichas_agregado`: fichas **visíveis ao usuário atual** (mestre vê todas; jogador só as
   *   próprias + as concedidas via `usuario_ficha_acesso` — mesmo critério de
   *   `FichaRepository.listarVisiveisParaUsuario`, replicado aqui porque isto é agregação, não
   *   listagem) → `totalFichas`, `temFichaCritica` (`BOOL_OR` de Vida atual ≤ 0) e
   *   `fichaCriticaNome` (`MIN(nome) FILTER`, equivalente a "primeira ordenada por nome" já que
   *   a única ordenação é por nome). O mesmo agregado também alimenta `atualizadoEm`
   *   (`MAX(ficha.updated_date)`, combinado via `GREATEST` com `campanha.updated_date` — cai só
   *   na data da campanha quando não há fichas visíveis).
   * - `minha_ficha`: a própria ficha do jogador nesta campanha (primeira por nome) — o `WHERE`
   *   já restringe a `papel = 'JOGADOR'`, então para o mestre a linha nunca casa e
   *   `minhaFichaResumo` sai `null` sem precisar de `CASE` extra por fora.
   *
   * `COUNT(*)` sai `bigint` do Postgres (o driver `pg` devolve como `string` para não perder
   * precisão) — por isso os dois `::int` explícitos, sem os quais `totalMembros`/`totalFichas`
   * chegariam como texto no DTO tipado `number`. `json_build_object` monta `minhaFichaResumo` já
   * no formato aninhado do DTO — o `pg` decodifica `json`/`jsonb` para objeto JS sozinho, sem
   * parse manual na service (que seguiu passthrough, como antes). Todos os `LATERAL` são `LEFT`
   * (nunca `INNER`) para não descartar campanhas sem ficha nenhuma. Ordena por nome da campanha.
   */
  async listarPorUsuario(dto: CampanhaListarDto): Promise<CampanhaResumoDto[]> {
    return this.executarConsulta<CampanhaResumoDto>(
      `SELECT campanha.id, campanha.nome, campanha.descricao,
              tipo_campanha_membro_papel.codigo AS papel,
              membros_agregado.total AS "totalMembros",
              COALESCE(fichas_agregado.total, 0) AS "totalFichas",
              COALESCE(fichas_agregado.tem_critica, false) AS "temFichaCritica",
              fichas_agregado.nome_critica AS "fichaCriticaNome",
              CASE WHEN minha_ficha.nome IS NOT NULL
                   THEN json_build_object(
                          'nome', minha_ficha.nome,
                          'vidaAtual', minha_ficha."vidaAtual",
                          'vidaMaxima', minha_ficha."vidaMaxima"
                        )
              END AS "minhaFichaResumo",
              CASE WHEN tipo_campanha_membro_papel.codigo = :papelMestre
                   THEN campanha.codigo_convite
              END AS "codigoConvite",
              GREATEST(
                campanha.updated_date,
                COALESCE(fichas_agregado.ultima_atualizacao, campanha.updated_date)
              ) AS "atualizadoEm"
       FROM campanha_membro
       INNER JOIN campanha
         ON campanha.id = campanha_membro.campanha_id AND campanha.is_deleted = false
       INNER JOIN tipo_campanha_membro_papel
         ON tipo_campanha_membro_papel.id = campanha_membro.tipo_campanha_membro_papel_id
        AND tipo_campanha_membro_papel.is_deleted = false
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS total
         FROM campanha_membro AS membro_contado
         WHERE membro_contado.campanha_id = campanha.id AND membro_contado.is_deleted = false
       ) membros_agregado ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS total,
                BOOL_OR((ficha.dados->'estado'->>'vidaAtual')::int <= 0) AS tem_critica,
                MIN(ficha.nome) FILTER (WHERE (ficha.dados->'estado'->>'vidaAtual')::int <= 0) AS nome_critica,
                MAX(ficha.updated_date) AS ultima_atualizacao
         FROM ficha
         WHERE ficha.campanha_id = campanha.id AND ficha.is_deleted = false
           AND (
             tipo_campanha_membro_papel.codigo = :papelMestre
             OR ficha.usuario_id = campanha_membro.usuario_id
             OR EXISTS (
               SELECT 1 FROM usuario_ficha_acesso
               WHERE usuario_ficha_acesso.ficha_id = ficha.id
                 AND usuario_ficha_acesso.usuario_id = campanha_membro.usuario_id
                 AND usuario_ficha_acesso.is_deleted = false
             )
           )
       ) fichas_agregado ON true
       LEFT JOIN LATERAL (
         SELECT ficha.nome,
                (ficha.dados->'estado'->>'vidaAtual')::int AS "vidaAtual",
                (ficha.dados->'estado'->>'vidaMaxima')::int AS "vidaMaxima"
         FROM ficha
         WHERE ficha.campanha_id = campanha.id AND ficha.is_deleted = false
           AND ficha.usuario_id = campanha_membro.usuario_id
           AND tipo_campanha_membro_papel.codigo = :papelJogador
         ORDER BY ficha.nome ASC
         LIMIT 1
       ) minha_ficha ON true
       WHERE campanha_membro.usuario_id = :usuarioId AND campanha_membro.is_deleted = false
       ORDER BY campanha.nome ASC`,
      {
        usuarioId: dto.usuarioId,
        papelMestre: TipoCampanhaMembroPapelEnum.MESTRE,
        papelJogador: TipoCampanhaMembroPapelEnum.JOGADOR,
      },
    );
  }

  /**
   * Recupera a campanha ativa pelo `codigoConvite` (ou `null`) — alimenta o `entrarCampanha`.
   * Como o índice único `uix_campanha_codigo_convite_ativo` é parcial (`WHERE is_deleted =
   * false`), um código só resolve para uma campanha ativa; após regeneração, o antigo some.
   */
  async recuperarPorCodigoConvite(
    dto: CampanhaConviteRecuperarDto,
  ): Promise<CampanhaRecuperadaDto | null> {
    const [campanhaEncontrada] = await this.executarConsulta<CampanhaRecuperadaDto>(
      `SELECT id, nome, descricao, codigo_convite AS "codigoConvite"
       FROM campanha
       WHERE codigo_convite = :codigoConvite AND is_deleted = false`,
      { codigoConvite: dto.codigoConvite },
    );
    return campanhaEncontrada ?? null;
  }

  /** Recupera a campanha ativa pelo `id` (ou `null`). */
  async recuperarPorId(dto: CampanhaRecuperarDto): Promise<CampanhaRecuperadaDto | null> {
    const [campanhaEncontrada] = await this.executarConsulta<CampanhaRecuperadaDto>(
      `SELECT id, nome, descricao, codigo_convite AS "codigoConvite"
       FROM campanha
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id },
    );
    return campanhaEncontrada ?? null;
  }

  /**
   * Recupera o vínculo de um usuário numa campanha, devolvendo o `papel` (`codigo` traduzido
   * de `tipo_campanha_membro_papel`) — ou `null` se ele não for membro. Alimenta as checagens
   * de permissão da service (membro/mestre).
   */
  async recuperarMembro(
    dto: CampanhaMembroInternoRecuperarDto,
  ): Promise<CampanhaMembroInternoRecuperadoDto | null> {
    const [membroEncontrado] =
      await this.executarConsulta<CampanhaMembroInternoRecuperadoDto>(
        `SELECT tipo_campanha_membro_papel.codigo AS papel
         FROM campanha_membro
         INNER JOIN tipo_campanha_membro_papel
           ON tipo_campanha_membro_papel.id = campanha_membro.tipo_campanha_membro_papel_id
          AND tipo_campanha_membro_papel.is_deleted = false
         WHERE campanha_membro.campanha_id = :campanhaId
           AND campanha_membro.usuario_id = :usuarioId
           AND campanha_membro.is_deleted = false`,
        { campanhaId: dto.campanhaId, usuarioId: dto.usuarioId },
      );
    return membroEncontrado ?? null;
  }

  /**
   * Altera `nome`/`descricao` da campanha e retorna os dados atualizados. Só toca campanha
   * ativa (`WHERE is_deleted = false`), sem `DEFAULT`.
   */
  async alterarCampanha(dto: CampanhaInternoAlterarDto): Promise<CampanhaAlteradaDto> {
    const [campanhaAlterada] = await this.executarConsulta<CampanhaAlteradaDto>(
      `UPDATE campanha
       SET nome = :nome, descricao = :descricao, updated_date = NOW()
       WHERE id = :id AND is_deleted = false
       RETURNING id, nome, descricao, codigo_convite AS "codigoConvite"`,
      { id: dto.id, nome: dto.nome, descricao: dto.descricao ?? null },
    );
    return campanhaAlterada;
  }

  /** Exclui a campanha via soft delete (nunca `DELETE` físico — proibição #14). */
  async excluirCampanha(dto: CampanhaExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }

  /**
   * Substitui o `codigoConvite` da campanha pelo novo (já gerado na service), invalidando o
   * anterior. Só toca campanha ativa (`WHERE is_deleted = false`), sem `DEFAULT`.
   */
  async alterarConvite(
    dto: CampanhaConviteInternoAlterarDto,
  ): Promise<CampanhaConviteRegeneradoDto> {
    const [conviteRegenerado] = await this.executarConsulta<CampanhaConviteRegeneradoDto>(
      `UPDATE campanha
       SET codigo_convite = :codigoConvite, updated_date = NOW()
       WHERE id = :id AND is_deleted = false
       RETURNING id, codigo_convite AS "codigoConvite"`,
      { id: dto.id, codigoConvite: dto.codigoConvite },
    );
    return conviteRegenerado;
  }

  /**
   * Lista os membros da campanha com o `nome` do usuário e o `papel` dele
   * (`MESTRE`/`JOGADOR`). Junta `campanha_membro` → `usuario` (nome) →
   * `tipo_campanha_membro_papel` (papel), todas filtrando `is_deleted = false`. Ordena por nome.
   */
  async listarMembros(dto: CampanhaMembrosListarDto): Promise<CampanhaMembroResumoDto[]> {
    return this.executarConsulta<CampanhaMembroResumoDto>(
      `SELECT usuario.id AS "usuarioId", usuario.nome,
              tipo_campanha_membro_papel.codigo AS papel
       FROM campanha_membro
       INNER JOIN usuario
         ON usuario.id = campanha_membro.usuario_id AND usuario.is_deleted = false
       INNER JOIN tipo_campanha_membro_papel
         ON tipo_campanha_membro_papel.id = campanha_membro.tipo_campanha_membro_papel_id
        AND tipo_campanha_membro_papel.is_deleted = false
       WHERE campanha_membro.campanha_id = :campanhaId AND campanha_membro.is_deleted = false
       ORDER BY usuario.nome ASC`,
      { campanhaId: dto.campanhaId },
    );
  }

  /**
   * Remove (soft delete) o vínculo `campanha_membro` de um usuário numa campanha, pela chave
   * composta campanha+usuário. Espelha o `executarSoftDelete` da base — que atua por `id` da
   * tabela dona (`campanha`) — para a tabela `campanha_membro` (proibição #14: nunca `DELETE`
   * físico). Só toca vínculo ativo (`is_deleted = false`), sem `DEFAULT`.
   */
  async removerMembro(dto: CampanhaMembroInternoRemoverDto): Promise<void> {
    await this.executarComando(
      `UPDATE campanha_membro
       SET is_deleted = true, deleted_date = NOW(), updated_date = NOW()
       WHERE campanha_id = :campanhaId AND usuario_id = :usuarioId AND is_deleted = false`,
      { campanhaId: dto.campanhaId, usuarioId: dto.usuarioId },
    );
  }

  /**
   * Transfere o papel de mestre **atomicamente** num único `UPDATE`: o `novoMestreUsuarioId`
   * passa a `MESTRE` e o `mestreAtualUsuarioId` a `JOGADOR`, via `CASE` sobre os dois vínculos
   * ativos da campanha. Um só comando mantém a invariante de exatamente um mestre (§14) sem
   * janela intermediária. Traduz `codigo → id` do papel por subconsulta (§10.2.12); só toca
   * vínculo ativo (`is_deleted = false`), sem `DEFAULT`.
   */
  async transferirMestre(dto: CampanhaMestreInternoTransferirDto): Promise<void> {
    await this.executarComando(
      `UPDATE campanha_membro
       SET tipo_campanha_membro_papel_id = CASE
             WHEN usuario_id = :novoMestreUsuarioId
               THEN (SELECT id FROM tipo_campanha_membro_papel WHERE codigo = :papelMestre AND is_deleted = false)
             WHEN usuario_id = :mestreAtualUsuarioId
               THEN (SELECT id FROM tipo_campanha_membro_papel WHERE codigo = :papelJogador AND is_deleted = false)
           END,
           updated_date = NOW()
       WHERE campanha_id = :campanhaId
         AND usuario_id IN (:novoMestreUsuarioId, :mestreAtualUsuarioId)
         AND is_deleted = false`,
      {
        campanhaId: dto.campanhaId,
        novoMestreUsuarioId: dto.novoMestreUsuarioId,
        mestreAtualUsuarioId: dto.mestreAtualUsuarioId,
        papelMestre: TipoCampanhaMembroPapelEnum.MESTRE,
        papelJogador: TipoCampanhaMembroPapelEnum.JOGADOR,
      },
    );
  }
}
