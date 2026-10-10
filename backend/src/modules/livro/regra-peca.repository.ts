import { Inject, Injectable } from "@nestjs/common";
import type { Knex } from "knex";
import type {
  RegraPecaAncoraAntigaInternoCriarDto,
  RegraPecaAncoraAntigaResumoDto,
  RegraPecaAncoraInternoAlterarDto,
  RegraPecaAncorasAntigasListarDto,
  RegraPecaArvoreItemDto,
  RegraPecaArvoreListarDto,
  RegraPecaDadosInternoAlterarDto,
  RegraPecaIdentificadorRecuperarDto,
  RegraPecaInternoCriarDto,
  RegraPecaPosicaoInternoAlterarDto,
  RegraPecaRecuperadaDto,
  RegraPecaRecuperarDto,
  RegraPecaRemoverDto,
} from "@contratados-rpg/shared/dtos/livro";
import { BaseRepository } from "../../core/base/base.repository";
import { KNEX_CONNECTION } from "../../database/database.provider";

/**
 * Repositório de `regra_peca` e `regra_peca_ancora_antiga` (m11-02) — SQL bruto only. Guarda a
 * cópia de trabalho dos livros: uma linha por peça, em árvore (`peca_pai_id`). `tipo` traduz
 * `codigo ↔ id` de `tipo_regra_peca` no SQL. Validade da árvore (aninhamento, ciclo, unicidade
 * entre âncora atual e antigas) e permissão são da service.
 *
 * Toda alteração de uma peça existente carrega a `revisao` que o cliente leu: só aplica se ela
 * ainda for a do banco e a incrementa (trava otimista). Quando não aplica, devolve `null`.
 */
@Injectable()
export class RegraPecaRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, "regra_peca");
  }

  /** Colunas da peça no formato dos DTOs; usadas por todas as leituras. */
  private colunasDaPeca(): string {
    return `regra_peca.id, regra_peca.livro_id AS "livroId",
            regra_peca.peca_pai_id AS "pecaPaiId", tipo_regra_peca.codigo AS tipo,
            regra_peca.identificador, regra_peca.ancora, regra_peca.ordem, regra_peca.dados,
            regra_peca.revisao`;
  }

  /** `JOIN` que resolve o `codigo` do tipo. */
  private juncaoTipo(): string {
    return `INNER JOIN tipo_regra_peca
              ON tipo_regra_peca.id = regra_peca.tipo_regra_peca_id
             AND tipo_regra_peca.is_deleted = false`;
  }

  /**
   * Insere a peça com `revisao` 1 na posição (`pecaPaiId`, `ordem`) informada. Só aplica se o pai
   * (quando há) estiver ativo e for do mesmo livro; o `FOR SHARE` trava o pai contra uma remoção
   * concorrente. Devolve `null` quando o pai não serve.
   */
  async criarPeca(dto: RegraPecaInternoCriarDto): Promise<RegraPecaRecuperadaDto | null> {
    const [pecaInserida] = await this.executarConsulta<{ id: number }>(
      `INSERT INTO regra_peca
         (livro_id, peca_pai_id, tipo_regra_peca_id, identificador, ancora, ordem, dados, revisao,
          created_date, updated_date, is_deleted)
       SELECT :livroId, :pecaPaiId,
              (SELECT id FROM tipo_regra_peca WHERE codigo = :tipo AND is_deleted = false),
              :identificador::uuid, :ancora, :ordem, :dados::jsonb, 1, NOW(), NOW(), false
       WHERE :pecaPaiId::integer IS NULL
          OR (SELECT peca_pai.id
              FROM regra_peca AS peca_pai
              WHERE peca_pai.id = :pecaPaiId::integer
                AND peca_pai.livro_id = :livroId
                AND peca_pai.is_deleted = false
              FOR SHARE) IS NOT NULL
       RETURNING id`,
      {
        livroId: dto.livroId,
        pecaPaiId: dto.pecaPaiId,
        tipo: dto.tipo,
        identificador: dto.identificador,
        ancora: dto.ancora,
        ordem: dto.ordem,
        dados: JSON.stringify(dto.dados),
      },
    );
    return pecaInserida ? this.recuperarPeca({ id: pecaInserida.id }) : null;
  }

  /** Peça por id, ou `null` quando não existe/está excluída. */
  async recuperarPeca(dto: RegraPecaRecuperarDto): Promise<RegraPecaRecuperadaDto | null> {
    const [pecaEncontrada] = await this.executarConsulta<RegraPecaRecuperadaDto>(
      `SELECT ${this.colunasDaPeca()}
       FROM regra_peca
       ${this.juncaoTipo()}
       WHERE regra_peca.id = :id AND regra_peca.is_deleted = false`,
      { id: dto.id },
    );
    return pecaEncontrada ?? null;
  }

  /** Peça pelo `identificador` estável, ou `null` quando não existe/está excluída. */
  async recuperarPecaPorIdentificador(
    dto: RegraPecaIdentificadorRecuperarDto,
  ): Promise<RegraPecaRecuperadaDto | null> {
    const [pecaEncontrada] = await this.executarConsulta<RegraPecaRecuperadaDto>(
      `SELECT ${this.colunasDaPeca()}
       FROM regra_peca
       ${this.juncaoTipo()}
       WHERE regra_peca.identificador = :identificador::uuid AND regra_peca.is_deleted = false`,
      { identificador: dto.identificador },
    );
    return pecaEncontrada ?? null;
  }

  /**
   * Todas as peças ativas do livro numa lista plana, ordenada por pai e `ordem` (raiz primeiro).
   * O aninhamento é montado pela service.
   */
  async listarArvore(dto: RegraPecaArvoreListarDto): Promise<RegraPecaArvoreItemDto[]> {
    return this.executarConsulta<RegraPecaArvoreItemDto>(
      `SELECT ${this.colunasDaPeca()}
       FROM regra_peca
       ${this.juncaoTipo()}
       WHERE regra_peca.livro_id = :livroId AND regra_peca.is_deleted = false
       ORDER BY regra_peca.peca_pai_id ASC NULLS FIRST, regra_peca.ordem ASC, regra_peca.id ASC`,
      { livroId: dto.livroId },
    );
  }

  /** Troca o `dados` se a revisão ainda for a do banco; devolve `null` quando defasada. */
  async alterarDados(dto: RegraPecaDadosInternoAlterarDto): Promise<RegraPecaRecuperadaDto | null> {
    const [pecaAlterada] = await this.executarConsulta<{ id: number }>(
      `UPDATE regra_peca
       SET dados = :dados::jsonb, revisao = regra_peca.revisao + 1
       WHERE regra_peca.id = :id AND regra_peca.revisao = :revisao
         AND regra_peca.is_deleted = false
       RETURNING regra_peca.id`,
      { id: dto.id, dados: JSON.stringify(dto.dados), revisao: dto.revisao },
    );
    return pecaAlterada ? this.recuperarPeca({ id: pecaAlterada.id }) : null;
  }

  /** Troca a âncora se a revisão ainda for a do banco; devolve `null` quando defasada. */
  async alterarAncora(
    dto: RegraPecaAncoraInternoAlterarDto,
  ): Promise<RegraPecaRecuperadaDto | null> {
    const [pecaAlterada] = await this.executarConsulta<{ id: number }>(
      `UPDATE regra_peca
       SET ancora = :ancora, revisao = regra_peca.revisao + 1
       WHERE regra_peca.id = :id AND regra_peca.revisao = :revisao
         AND regra_peca.is_deleted = false
       RETURNING regra_peca.id`,
      { id: dto.id, ancora: dto.ancora, revisao: dto.revisao },
    );
    return pecaAlterada ? this.recuperarPeca({ id: pecaAlterada.id }) : null;
  }

  /**
   * Move a peça (novo pai e `ordem`) se a revisão ainda for a do banco; `null` quando defasada.
   * Também devolve `null` quando o novo pai está excluído, é de outro livro ou é a própria peça ou
   * uma descendente dela (mover para dentro da própria subárvore criaria um ciclo).
   */
  async alterarPosicao(
    dto: RegraPecaPosicaoInternoAlterarDto,
  ): Promise<RegraPecaRecuperadaDto | null> {
    const [pecaAlterada] = await this.executarConsulta<{ id: number }>(
      `UPDATE regra_peca
       SET peca_pai_id = :pecaPaiId, ordem = :ordem, revisao = regra_peca.revisao + 1
       WHERE regra_peca.id = :id AND regra_peca.revisao = :revisao
         AND regra_peca.is_deleted = false
         AND (:pecaPaiId::integer IS NULL
              OR ((SELECT peca_pai.id
                   FROM regra_peca AS peca_pai
                   WHERE peca_pai.id = :pecaPaiId::integer
                     AND peca_pai.livro_id = regra_peca.livro_id
                     AND peca_pai.is_deleted = false
                   FOR SHARE) IS NOT NULL
                  AND NOT EXISTS (
                    WITH RECURSIVE ancestrais AS (
                      SELECT peca_ancestral.id, peca_ancestral.peca_pai_id
                      FROM regra_peca AS peca_ancestral
                      WHERE peca_ancestral.id = :pecaPaiId::integer
                      UNION
                      SELECT peca_acima.id, peca_acima.peca_pai_id
                      FROM regra_peca AS peca_acima
                      INNER JOIN ancestrais ON peca_acima.id = ancestrais.peca_pai_id
                    )
                    SELECT 1 FROM ancestrais WHERE ancestrais.id = regra_peca.id)))
       RETURNING regra_peca.id`,
      { id: dto.id, pecaPaiId: dto.pecaPaiId, ordem: dto.ordem, revisao: dto.revisao },
    );
    return pecaAlterada ? this.recuperarPeca({ id: pecaAlterada.id }) : null;
  }

  /**
   * Exclui (soft delete) a peça e todas as descendentes, e as âncoras antigas de todas elas, numa
   * só instrução — nunca sobra filha órfã visível. Só aplica se a revisão da peça ainda for a do
   * banco. Devolve quantas peças saíram (0 se a peça não existe ou a revisão está defasada).
   */
  async removerPeca(dto: RegraPecaRemoverDto): Promise<number> {
    const [resultado] = await this.executarConsulta<{ total: number }>(
      `WITH RECURSIVE descendentes AS (
         SELECT regra_peca.id
         FROM regra_peca
         WHERE regra_peca.id = :id AND regra_peca.revisao = :revisao
           AND regra_peca.is_deleted = false
         UNION
         SELECT filha.id
         FROM regra_peca AS filha
         INNER JOIN descendentes ON filha.peca_pai_id = descendentes.id
         WHERE filha.is_deleted = false
       ),
       pecas_removidas AS (
         UPDATE regra_peca
         SET is_deleted = true, deleted_date = NOW()
         WHERE regra_peca.id IN (SELECT descendentes.id FROM descendentes)
         RETURNING regra_peca.id
       ),
       ancoras_removidas AS (
         UPDATE regra_peca_ancora_antiga
         SET is_deleted = true, deleted_date = NOW()
         WHERE regra_peca_ancora_antiga.regra_peca_id IN (SELECT descendentes.id FROM descendentes)
           AND regra_peca_ancora_antiga.is_deleted = false
         RETURNING regra_peca_ancora_antiga.id
       )
       SELECT COUNT(*)::int AS total FROM pecas_removidas`,
      { id: dto.id, revisao: dto.revisao },
    );
    return resultado.total;
  }

  /**
   * Registra uma âncora que a peça deixou de usar, para o link antigo continuar valendo. O livro
   * vem da própria peça (ativa). Âncora já registrada no livro é ignorada — renomear x→y→x→y não
   * estoura; que a âncora não pertença à outra peça é arbitrado pela service. Devolve se registrou.
   */
  async criarAncoraAntiga(dto: RegraPecaAncoraAntigaInternoCriarDto): Promise<boolean> {
    const registradas = await this.executarConsulta<{ id: number }>(
      `INSERT INTO regra_peca_ancora_antiga
         (livro_id, regra_peca_id, ancora, created_date, updated_date, is_deleted)
       SELECT regra_peca.livro_id, regra_peca.id, :ancora, NOW(), NOW(), false
       FROM regra_peca
       WHERE regra_peca.id = :regraPecaId AND regra_peca.is_deleted = false
       ON CONFLICT (livro_id, ancora) WHERE is_deleted = false DO NOTHING
       RETURNING id`,
      { regraPecaId: dto.regraPecaId, ancora: dto.ancora },
    );
    return registradas.length > 0;
  }

  /** Âncoras antigas do livro com o identificador da peça a que hoje elas levam. */
  async listarAncorasAntigas(
    dto: RegraPecaAncorasAntigasListarDto,
  ): Promise<RegraPecaAncoraAntigaResumoDto[]> {
    return this.executarConsulta<RegraPecaAncoraAntigaResumoDto>(
      `SELECT regra_peca_ancora_antiga.regra_peca_id AS "regraPecaId", regra_peca.identificador,
              regra_peca_ancora_antiga.ancora
       FROM regra_peca_ancora_antiga
       INNER JOIN regra_peca
          ON regra_peca.id = regra_peca_ancora_antiga.regra_peca_id
         AND regra_peca.is_deleted = false
       WHERE regra_peca_ancora_antiga.livro_id = :livroId
         AND regra_peca_ancora_antiga.is_deleted = false
       ORDER BY regra_peca_ancora_antiga.id ASC`,
      { livroId: dto.livroId },
    );
  }
}
