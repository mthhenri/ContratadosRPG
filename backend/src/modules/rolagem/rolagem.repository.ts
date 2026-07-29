import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  RolagemCampanhaInternoListarDto,
  RolagemInternoListarDto,
  RolagemInternoRegistrarDto,
  RolagemResumoDto,
} from '@contratados-rpg/shared/dtos/rolagem';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { PaginatedResult } from '@contratados-rpg/shared/interfaces';
import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/**
 * Repositório do módulo `rolagem` (m3-27) — SQL bruto only, sem lógica de negócio. Dono das
 * queries da tabela `rolagem` (proibição #23); a permissão é arbitrada na service. `resultado`
 * viaja em JSONB (cast `::jsonb`); `visibilidade` traduz `codigo ↔ id` de
 * `tipo_rolagem_visibilidade` no SQL (§10.2.12) — a service só vê o `codigo`
 * (`RolagemVisibilidadeEnum`).
 */
@Injectable()
export class RolagemRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'rolagem');
  }

  /**
   * Colunas do recorte `RolagemResumoDto`, compartilhadas pelo registro (re-seleção pós-insert),
   * o histórico da ficha e o feed da campanha. `nomeAutor`/`nomeFicha` vêm de `JOIN` — nunca
   * duplicados como coluna própria de `rolagem`.
   */
  private colunasResumo(): string {
    return `rolagem.id, rolagem.ficha_id AS "fichaId", rolagem.campanha_id AS "campanhaId",
            rolagem.usuario_id AS "usuarioId", usuario.nome AS "nomeAutor", ficha.nome AS "nomeFicha",
            rolagem.rotulo, tipo_rolagem_visibilidade.codigo AS visibilidade,
            rolagem.resultado, rolagem.created_date AS "createdDate"`;
  }

  /** `JOIN`s que resolvem `nomeAutor`/`nomeFicha`/`visibilidade` em `colunasResumo()`. */
  private juncoesResumo(): string {
    return `INNER JOIN usuario ON usuario.id = rolagem.usuario_id AND usuario.is_deleted = false
            INNER JOIN ficha ON ficha.id = rolagem.ficha_id AND ficha.is_deleted = false
            INNER JOIN tipo_rolagem_visibilidade
              ON tipo_rolagem_visibilidade.id = rolagem.tipo_rolagem_visibilidade_id
             AND tipo_rolagem_visibilidade.is_deleted = false`;
  }

  /**
   * Insere a rolagem e devolve o recorte `RolagemResumoDto` (uma segunda consulta, com os `JOIN`s
   * de `nomeAutor`/`nomeFicha`, já que `RETURNING` não junta outras tabelas). Segue o padrão
   * `INSERT ... SELECT ... RETURNING` com BaseEntity explícita, sem `VALUES` e sem `DEFAULT`.
   */
  async registrarRolagem(dto: RolagemInternoRegistrarDto): Promise<RolagemResumoDto> {
    const [inserida] = await this.executarConsulta<{ id: number }>(
      `INSERT INTO rolagem (ficha_id, campanha_id, usuario_id, rotulo, tipo_rolagem_visibilidade_id, resultado, created_date, updated_date, is_deleted)
       SELECT :fichaId, :campanhaId, :usuarioId, :rotulo,
              (SELECT id FROM tipo_rolagem_visibilidade WHERE codigo = :visibilidade AND is_deleted = false),
              :resultado::jsonb, NOW(), NOW(), false
       RETURNING id`,
      {
        fichaId: dto.fichaId,
        campanhaId: dto.campanhaId,
        usuarioId: dto.usuarioId,
        rotulo: dto.rotulo,
        visibilidade: dto.visibilidade,
        resultado: JSON.stringify(dto.resultado),
      },
    );

    const [rolagemRegistrada] = await this.executarConsulta<RolagemResumoDto>(
      `SELECT ${this.colunasResumo()}
       FROM rolagem
       ${this.juncoesResumo()}
       WHERE rolagem.id = :id AND rolagem.is_deleted = false`,
      { id: inserida.id },
    );
    return rolagemRegistrada;
  }

  /**
   * Histórico paginado de uma ficha (§10.5), mais recente primeiro. A permissão de visualização
   * já foi conferida pela service (reusa `FichaService.recuperarFicha`) — aqui só lista.
   */
  async listarPorFicha(dto: RolagemInternoListarDto): Promise<PaginatedResult<RolagemResumoDto>> {
    return this.executarConsultaPaginada<RolagemResumoDto>({
      sqlSelect: `SELECT ${this.colunasResumo()}
                  FROM rolagem
                  ${this.juncoesResumo()}
                  WHERE rolagem.ficha_id = :fichaId AND rolagem.is_deleted = false`,
      sqlContagem: `SELECT COUNT(*) AS total FROM rolagem WHERE rolagem.ficha_id = :fichaId AND rolagem.is_deleted = false`,
      parametrosSql: { fichaId: dto.fichaId },
      pagina: dto.pagina,
      itensPorPagina: dto.itensPorPagina,
      ordenarPor: 'rolagem.created_date',
      direcao: 'DESC',
    });
  }

  /**
   * Feed de uma campanha, mais recente primeiro, filtrado por visibilidade (§14 — a matriz da
   * rolagem): `PUBLICA` para todos os membros; `PRIVADA` só para o próprio autor ou o mestre
   * (`ehMestre`, resolvido pela service a partir do papel do solicitante). Teto de 50 linhas —
   * feed de atividade recente, não histórico completo (esse é o da ficha, paginado).
   */
  async listarPorCampanha(dto: RolagemCampanhaInternoListarDto): Promise<RolagemResumoDto[]> {
    return this.executarConsulta<RolagemResumoDto>(
      `SELECT ${this.colunasResumo()}
       FROM rolagem
       ${this.juncoesResumo()}
       WHERE rolagem.campanha_id = :campanhaId AND rolagem.is_deleted = false
         AND (
           tipo_rolagem_visibilidade.codigo = :visibilidadePublica
           OR rolagem.usuario_id = :usuarioId
           OR :ehMestre
         )
       ORDER BY rolagem.created_date DESC
       LIMIT 50`,
      {
        campanhaId: dto.campanhaId,
        usuarioId: dto.usuarioId,
        ehMestre: dto.ehMestre,
        visibilidadePublica: RolagemVisibilidadeEnum.PUBLICA,
      },
    );
  }
}
