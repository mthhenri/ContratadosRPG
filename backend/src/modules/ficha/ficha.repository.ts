import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  FichaAcessoConcederDto,
  FichaAcessoConcedidoDto,
  FichaAcessoInternoRecuperadoDto,
  FichaAcessoInternoRecuperarDto,
  FichaAcessoResumoDto,
  FichaAcessoRevogarDto,
  FichaAcessosListarDto,
  FichaCriadaDto,
  FichaExcluirDto,
  FichaInternoAlterarDto,
  FichaInternoCriarDto,
  FichaListarDto,
  FichaRecuperadaDto,
  FichaRecuperarDto,
  FichaResumoDto,
  FichaVisiveisInternoListarDto,
} from '@contratados-rpg/shared/dtos/ficha';
import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/**
 * Repositório do módulo `ficha` — SQL bruto only, sem lógica de negócio (SYSTEM.SPEC §7.1). Dono
 * das queries das tabelas `ficha` e `usuario_ficha_acesso` (proibição #23); a permissão em si é
 * arbitrada na service. Identidade/posse são colunas (`campanha_id`/`usuario_id`/`nome`); o
 * conteúdo de jogo vive no JSONB `dados` (§10.4) — as listagens leem só o recorte `dados->>'campo'`.
 * Todo SELECT filtra `is_deleted = false`; a tradução `codigo ↔ id` de `tipo_ficha` acontece aqui,
 * no SQL (§10.2.12) — a service só vê o `codigo` (`TipoFichaEnum`).
 */
@Injectable()
export class FichaRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'ficha');
  }

  /**
   * Insere uma nova ficha e retorna seus dados. O `dono` (`usuarioId`) e o `tipo` já vêm
   * resolvidos da service; o `codigo` do tipo é traduzido para o `id` de `tipo_ficha` por
   * subconsulta (§10.2.12) e o documento de jogo entra no JSONB `dados` (cast `::jsonb`). Segue o
   * padrão `INSERT ... SELECT ... RETURNING` com BaseEntity explícita, sem `VALUES` e sem `DEFAULT`
   * (§10.2.6/§10.2.8).
   */
  async criarFicha(dto: FichaInternoCriarDto): Promise<FichaCriadaDto> {
    const [fichaCriada] = await this.executarConsulta<FichaCriadaDto>(
      `INSERT INTO ficha (campanha_id, usuario_id, tipo_ficha_id, nome, dados, created_date, updated_date, is_deleted)
       SELECT :campanhaId, :usuarioId,
              (SELECT id FROM tipo_ficha WHERE codigo = :tipo AND is_deleted = false),
              :nome, :dados::jsonb, NOW(), NOW(), false
       RETURNING id, campanha_id AS "campanhaId", usuario_id AS "usuarioId", nome, dados`,
      {
        campanhaId: dto.campanhaId,
        usuarioId: dto.usuarioId,
        tipo: dto.tipo,
        nome: dto.nome,
        dados: JSON.stringify(dto.dados),
      },
    );
    return fichaCriada;
  }

  /** Recupera a ficha ativa pelo `id` (ou `null`) — inclui posse/campanha para a checagem de permissão. */
  async recuperarPorId(dto: FichaRecuperarDto): Promise<FichaRecuperadaDto | null> {
    const [fichaEncontrada] = await this.executarConsulta<FichaRecuperadaDto>(
      `SELECT id, campanha_id AS "campanhaId", usuario_id AS "usuarioId", nome, dados
       FROM ficha
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id },
    );
    return fichaEncontrada ?? null;
  }

  /**
   * Colunas do recorte `FichaResumoDto` (§10.4) — compartilhadas por `listarPorCampanha` e
   * `listarVisiveisParaUsuario`, que só diferem no `WHERE`. Vida/Energia e as três condições
   * (m2-16b — mini-card de ficha no detalhe da campanha) somam-se a `classe`/`nivel`, todas lidas
   * do JSONB `dados`. As condições usam `COALESCE(..., false)`: ausentes no documento (fichas sem
   * o campo, ou nunca marcadas) viram `false` explícito — o resumo nunca devolve `undefined` aqui,
   * diferente de `FichaEstadoDto` (que é opcional por retrocompatibilidade do documento completo).
   */
  private colunasResumo(): string {
    return `ficha.id, ficha.usuario_id AS "usuarioId", ficha.nome,
              ficha.dados->>'classe' AS classe,
              (ficha.dados->>'nivel')::int AS nivel,
              (ficha.dados->'estado'->>'vidaAtual')::int AS "vidaAtual",
              (ficha.dados->'estado'->>'vidaMaxima')::int AS "vidaMaxima",
              (ficha.dados->'estado'->>'energiaAtual')::int AS "energiaAtual",
              (ficha.dados->'estado'->>'energiaMaxima')::int AS "energiaMaxima",
              COALESCE((ficha.dados->'estado'->>'morrendo')::boolean, false) AS morrendo,
              COALESCE((ficha.dados->'estado'->>'machucado')::boolean, false) AS machucado,
              COALESCE((ficha.dados->'estado'->>'inconsciente')::boolean, false) AS inconsciente`;
  }

  /**
   * Lista **todas** as fichas ativas de uma campanha (uso do mestre — §14). Recorte resumido: os
   * campos de jogo `classe`/`nivel` são lidos do JSONB (`dados->>'campo'`, §10.4). Ordena por nome.
   */
  async listarPorCampanha(dto: FichaListarDto): Promise<FichaResumoDto[]> {
    return this.executarConsulta<FichaResumoDto>(
      `SELECT ${this.colunasResumo()}
       FROM ficha
       WHERE ficha.campanha_id = :campanhaId AND ficha.is_deleted = false
       ORDER BY ficha.nome ASC`,
      { campanhaId: dto.campanhaId },
    );
  }

  /**
   * Lista as fichas da campanha **visíveis** a um membro comum (§14): as do próprio dono ou as
   * concedidas por `usuario_ficha_acesso`. Mesmo recorte resumido de `listarPorCampanha`; a
   * concessão é conferida por `EXISTS` sobre `usuario_ficha_acesso` (ativo). Ordena por nome.
   */
  async listarVisiveisParaUsuario(dto: FichaVisiveisInternoListarDto): Promise<FichaResumoDto[]> {
    return this.executarConsulta<FichaResumoDto>(
      `SELECT ${this.colunasResumo()}
       FROM ficha
       WHERE ficha.campanha_id = :campanhaId AND ficha.is_deleted = false
         AND (
           ficha.usuario_id = :usuarioId
           OR EXISTS (
             SELECT 1 FROM usuario_ficha_acesso
             WHERE usuario_ficha_acesso.ficha_id = ficha.id
               AND usuario_ficha_acesso.usuario_id = :usuarioId
               AND usuario_ficha_acesso.is_deleted = false
           )
         )
       ORDER BY ficha.nome ASC`,
      { campanhaId: dto.campanhaId, usuarioId: dto.usuarioId },
    );
  }

  /**
   * Recupera a concessão de visualização (`usuario_ficha_acesso`) ativa de um usuário sobre uma
   * ficha, ou `null` — alimenta a checagem de permissão de um membro comum na service (§14).
   */
  async recuperarAcesso(
    dto: FichaAcessoInternoRecuperarDto,
  ): Promise<FichaAcessoInternoRecuperadoDto | null> {
    const [acessoEncontrado] = await this.executarConsulta<FichaAcessoInternoRecuperadoDto>(
      `SELECT id
       FROM usuario_ficha_acesso
       WHERE ficha_id = :fichaId AND usuario_id = :usuarioId AND is_deleted = false`,
      { fichaId: dto.fichaId, usuarioId: dto.usuarioId },
    );
    return acessoEncontrado ?? null;
  }

  /**
   * Concede acesso de visualização de uma ficha a um usuário — insere a linha em
   * `usuario_ficha_acesso` e retorna a concessão (m3-04). Segue o padrão
   * `INSERT ... SELECT ... RETURNING` com BaseEntity explícita, sem `VALUES` e sem `DEFAULT`
   * (§10.2.6/§10.2.8). A unicidade do par (ficha, usuário) entre ativos é garantida pelo índice
   * `uix_usuario_ficha_acesso_ficha_usuario_ativo` — a service confere a concessão existente antes
   * de inserir (idempotência), então este método só é chamado quando ainda não há linha ativa.
   */
  async concederAcesso(dto: FichaAcessoConcederDto): Promise<FichaAcessoConcedidoDto> {
    const [acessoConcedido] = await this.executarConsulta<FichaAcessoConcedidoDto>(
      `INSERT INTO usuario_ficha_acesso (ficha_id, usuario_id, created_date, updated_date, is_deleted)
       SELECT :fichaId, :usuarioId, NOW(), NOW(), false
       RETURNING id, ficha_id AS "fichaId", usuario_id AS "usuarioId"`,
      { fichaId: dto.fichaId, usuarioId: dto.usuarioId },
    );
    return acessoConcedido;
  }

  /**
   * Revoga o acesso de visualização de uma ficha a um usuário via soft delete da linha ativa de
   * `usuario_ficha_acesso` (chave composta `ficha_id`/`usuario_id`; nunca `DELETE` físico —
   * proibição #14). Idempotente: se não houver concessão ativa, nenhuma linha é afetada.
   */
  async revogarAcesso(dto: FichaAcessoRevogarDto): Promise<void> {
    await this.executarComando(
      `UPDATE usuario_ficha_acesso
       SET is_deleted = true, deleted_date = NOW(), updated_date = NOW()
       WHERE ficha_id = :fichaId AND usuario_id = :usuarioId AND is_deleted = false`,
      { fichaId: dto.fichaId, usuarioId: dto.usuarioId },
    );
  }

  /**
   * Lista as concessões de visualização **ativas** de uma ficha (m3-04): cada membro que recebeu
   * acesso, com o `nome` lido de `usuario`. Todo SELECT filtra `is_deleted = false` (nos dois
   * lados do `JOIN`). Ordena por nome.
   */
  async listarAcessos(dto: FichaAcessosListarDto): Promise<FichaAcessoResumoDto[]> {
    return this.executarConsulta<FichaAcessoResumoDto>(
      `SELECT usuario_ficha_acesso.usuario_id AS "usuarioId", usuario.nome
       FROM usuario_ficha_acesso
       INNER JOIN usuario
         ON usuario.id = usuario_ficha_acesso.usuario_id
        AND usuario.is_deleted = false
       WHERE usuario_ficha_acesso.ficha_id = :fichaId
         AND usuario_ficha_acesso.is_deleted = false
       ORDER BY usuario.nome ASC`,
      { fichaId: dto.fichaId },
    );
  }

  /**
   * Altera `nome` e o documento de jogo `dados` (cast `::jsonb`) da ficha e retorna os dados
   * atualizados. Só toca ficha ativa (`WHERE is_deleted = false`), sem `DEFAULT`.
   */
  async alterarFicha(dto: FichaInternoAlterarDto): Promise<FichaRecuperadaDto> {
    const [fichaAlterada] = await this.executarConsulta<FichaRecuperadaDto>(
      `UPDATE ficha
       SET nome = :nome, dados = :dados::jsonb, updated_date = NOW()
       WHERE id = :id AND is_deleted = false
       RETURNING id, campanha_id AS "campanhaId", usuario_id AS "usuarioId", nome, dados`,
      { id: dto.id, nome: dto.nome, dados: JSON.stringify(dto.dados) },
    );
    return fichaAlterada;
  }

  /** Exclui a ficha via soft delete (nunca `DELETE` físico — proibição #14). */
  async excluirFicha(dto: FichaExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }
}
