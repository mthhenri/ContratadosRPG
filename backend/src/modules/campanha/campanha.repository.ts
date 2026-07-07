import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  CampanhaAlteradaDto,
  CampanhaCriadaDto,
  CampanhaExcluirDto,
  CampanhaInternoAlterarDto,
  CampanhaInternoCriarDto,
  CampanhaListarDto,
  CampanhaMembroInternoCriarDto,
  CampanhaMembroInternoRecuperadoDto,
  CampanhaMembroInternoRecuperarDto,
  CampanhaRecuperadaDto,
  CampanhaRecuperarDto,
  CampanhaResumoDto,
} from '@contratados-rpg/shared/dtos/campanha';
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
   * Lista as campanhas de que o usuário é membro, com o `papel` dele em cada uma. Junta
   * `campanha_membro` → `campanha` → `tipo_campanha_membro_papel`, todas filtrando
   * `is_deleted = false`. Ordena por nome da campanha.
   */
  async listarPorUsuario(dto: CampanhaListarDto): Promise<CampanhaResumoDto[]> {
    return this.executarConsulta<CampanhaResumoDto>(
      `SELECT campanha.id, campanha.nome, campanha.descricao,
              tipo_campanha_membro_papel.codigo AS papel
       FROM campanha_membro
       INNER JOIN campanha
         ON campanha.id = campanha_membro.campanha_id AND campanha.is_deleted = false
       INNER JOIN tipo_campanha_membro_papel
         ON tipo_campanha_membro_papel.id = campanha_membro.tipo_campanha_membro_papel_id
        AND tipo_campanha_membro_papel.is_deleted = false
       WHERE campanha_membro.usuario_id = :usuarioId AND campanha_membro.is_deleted = false
       ORDER BY campanha.nome ASC`,
      { usuarioId: dto.usuarioId },
    );
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
}
