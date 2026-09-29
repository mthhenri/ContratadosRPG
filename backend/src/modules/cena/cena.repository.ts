import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  CenaInternoCriarDto,
  CenaLinhaDto,
  CenaOrdemInternoAlterarDto,
  CenaResumoDto,
  CenaStatusInternoAlterarDto,
} from '@contratados-rpg/shared/dtos/cena';
import { CenaStatusEnum } from '@contratados-rpg/shared/enums';
import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/**
 * Repositório do módulo `cena` (m7-22) — SQL bruto only, sem lógica de negócio. Dono das queries
 * de `cena`; permissão, invariante de cena única ativa e trava anti-vazamento são arbitradas na
 * service. `tipo` e `status` traduzem `codigo ↔ id` de `tipo_cena`/`tipo_cena_status` no SQL
 * (§10.2.12) — a service só vê o `codigo` (`CenaTipoEnum`/`CenaStatusEnum`).
 *
 * O encontro da cena é lido por `LEFT JOIN` (no máximo um por cena, `uix_encontro_cena_ativo`) só
 * para saber se ele existe; escrever nele é do `EncontroRepository`.
 */
@Injectable()
export class CenaRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'cena');
  }

  /** Colunas do recorte `CenaLinhaDto`, com os `codigo`s e o encontro resolvidos pelos `JOIN`s. */
  private colunasCena(): string {
    return `cena.id, cena.campanha_id AS "campanhaId", cena.nome,
            tipo_cena.codigo AS tipo, tipo_cena_status.codigo AS status, cena.ordem,
            encontro.id AS "encontroId"`;
  }

  /** `JOIN`s de `colunasCena()` — `LEFT` no encontro, porque nem todo tipo de cena tem um. */
  private juncoesCena(): string {
    return `INNER JOIN tipo_cena
              ON tipo_cena.id = cena.tipo_cena_id
             AND tipo_cena.is_deleted = false
            INNER JOIN tipo_cena_status
              ON tipo_cena_status.id = cena.tipo_cena_status_id
             AND tipo_cena_status.is_deleted = false
            LEFT JOIN encontro
              ON encontro.cena_id = cena.id
             AND encontro.is_deleted = false`;
  }

  /**
   * Insere a cena e devolve a linha já com os `codigo`s resolvidos. Padrão `INSERT ... SELECT ...
   * RETURNING`, BaseEntity explícita, sem `VALUES` e sem `DEFAULT`.
   */
  async criarCena(dto: CenaInternoCriarDto): Promise<CenaLinhaDto> {
    const [cenaInserida] = await this.executarConsulta<{ id: number }>(
      `INSERT INTO cena (campanha_id, tipo_cena_id, tipo_cena_status_id, nome, ordem, created_date, updated_date, is_deleted)
       SELECT :campanhaId,
              (SELECT id FROM tipo_cena WHERE codigo = :tipo AND is_deleted = false),
              (SELECT id FROM tipo_cena_status WHERE codigo = :status AND is_deleted = false),
              :nome, :ordem, NOW(), NOW(), false
       RETURNING id`,
      {
        campanhaId: dto.campanhaId,
        tipo: dto.tipo,
        status: dto.status,
        nome: dto.nome,
        ordem: dto.ordem,
      },
    );

    return this.recuperarPorId({ id: cenaInserida.id }) as Promise<CenaLinhaDto>;
  }

  /** Recupera uma cena por id, ou `null` quando não existe/está excluída. */
  async recuperarPorId(dto: { id: number }): Promise<CenaLinhaDto | null> {
    const [cenaEncontrada] = await this.executarConsulta<CenaLinhaDto>(
      `SELECT ${this.colunasCena()}
       FROM cena
       ${this.juncoesCena()}
       WHERE cena.id = :id AND cena.is_deleted = false`,
      { id: dto.id },
    );
    return cenaEncontrada ?? null;
  }

  /**
   * A cena `ATIVA` da campanha, se houver — a invariante de "no máximo uma ativa" é arbitrada pela
   * service com esta consulta, dentro da transação que troca a cena ativa.
   */
  async recuperarAtivaPorCampanha(dto: { campanhaId: number }): Promise<CenaLinhaDto | null> {
    const [cenaAtiva] = await this.executarConsulta<CenaLinhaDto>(
      `SELECT ${this.colunasCena()}
       FROM cena
       ${this.juncoesCena()}
       WHERE cena.campanha_id = :campanhaId
         AND cena.is_deleted = false
         AND tipo_cena_status.codigo = :statusAtiva
       ORDER BY cena.id ASC
       LIMIT 1`,
      { campanhaId: dto.campanhaId, statusAtiva: CenaStatusEnum.ATIVA },
    );
    return cenaAtiva ?? null;
  }

  /**
   * Cenas da campanha: a ativa primeiro, depois as planejadas na `ordem` manual do mestre e por fim
   * as encerradas, a mais recente primeiro. Sem `incluirPlanejadas`, as `PLANEJADA` ficam de fora;
   * sem `incluirEncerradas`, as `ENCERRADA` — o recorte de cada papel vem de `recorteCenasDoPapel`
   * (`cena-visibilidade.ts`), nunca decidido aqui.
   */
  async listarPorCampanha(dto: {
    campanhaId: number;
    incluirPlanejadas: boolean;
    incluirEncerradas: boolean;
  }): Promise<CenaResumoDto[]> {
    return this.executarConsulta<CenaResumoDto>(
      `SELECT cena.id, cena.nome, tipo_cena.codigo AS tipo, tipo_cena_status.codigo AS status,
              (encontro.id IS NOT NULL) AS "temEncontro"
       FROM cena
       ${this.juncoesCena()}
       WHERE cena.campanha_id = :campanhaId
         AND cena.is_deleted = false
         AND (:incluirPlanejadas::boolean OR tipo_cena_status.codigo <> :statusPlanejada)
         AND (:incluirEncerradas::boolean OR tipo_cena_status.codigo <> :statusEncerrada)
       ORDER BY CASE tipo_cena_status.codigo
                  WHEN :statusAtiva THEN 0
                  WHEN :statusPlanejada THEN 1
                  ELSE 2
                END,
                CASE WHEN tipo_cena_status.codigo = :statusPlanejada THEN cena.ordem END ASC,
                cena.updated_date DESC,
                cena.id DESC`,
      {
        campanhaId: dto.campanhaId,
        incluirPlanejadas: dto.incluirPlanejadas,
        incluirEncerradas: dto.incluirEncerradas,
        statusAtiva: CenaStatusEnum.ATIVA,
        statusPlanejada: CenaStatusEnum.PLANEJADA,
        statusEncerrada: CenaStatusEnum.ENCERRADA,
      },
    );
  }

  /** Maior `ordem` já usada na campanha — a service posiciona a próxima cena no fim da fila. */
  async recuperarMaiorOrdem(dto: { campanhaId: number }): Promise<number> {
    const [linhaMaiorOrdem] = await this.executarConsulta<{ maiorOrdem: number | null }>(
      `SELECT MAX(cena.ordem) AS "maiorOrdem"
       FROM cena
       WHERE cena.campanha_id = :campanhaId AND cena.is_deleted = false`,
      { campanhaId: dto.campanhaId },
    );
    return linhaMaiorOrdem?.maiorOrdem ?? 0;
  }

  /** Troca a situação da cena e devolve a linha atualizada. */
  async alterarStatus(dto: CenaStatusInternoAlterarDto): Promise<CenaLinhaDto> {
    await this.executarComando(
      `UPDATE cena
       SET tipo_cena_status_id = (SELECT id FROM tipo_cena_status WHERE codigo = :status AND is_deleted = false)
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, status: dto.status },
    );
    return this.recuperarPorId({ id: dto.id }) as Promise<CenaLinhaDto>;
  }

  /** Grava a posição de uma cena na fila de planejadas. */
  async alterarOrdem(dto: CenaOrdemInternoAlterarDto): Promise<void> {
    await this.executarComando(
      `UPDATE cena
       SET ordem = :ordem
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, ordem: dto.ordem },
    );
  }
}
