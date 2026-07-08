import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  FichaAcessoInternoRecuperadoDto,
  FichaAcessoInternoRecuperarDto,
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
   * Lista **todas** as fichas ativas de uma campanha (uso do mestre — §14). Recorte resumido: os
   * campos de jogo `classe`/`nivel` são lidos do JSONB (`dados->>'campo'`, §10.4). Ordena por nome.
   */
  async listarPorCampanha(dto: FichaListarDto): Promise<FichaResumoDto[]> {
    return this.executarConsulta<FichaResumoDto>(
      `SELECT ficha.id, ficha.usuario_id AS "usuarioId", ficha.nome,
              ficha.dados->>'classe' AS classe,
              (ficha.dados->>'nivel')::int AS nivel
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
      `SELECT ficha.id, ficha.usuario_id AS "usuarioId", ficha.nome,
              ficha.dados->>'classe' AS classe,
              (ficha.dados->>'nivel')::int AS nivel
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
