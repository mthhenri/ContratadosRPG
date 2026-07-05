import type { Knex } from 'knex';
import { PaginatedResult } from '@contratados-rpg/shared/interfaces';

/**
 * Parâmetros de uma listagem paginada (SYSTEM.SPEC §10.5). `ordenarPor` deve vir de uma
 * lista de colunas já validada pela service — identificador de coluna não aceita
 * parâmetro nomeado (`:nome`), só valor.
 */
export interface ParametrosConsultaPaginada {
  sqlSelect: string;
  sqlContagem: string;
  parametrosSql?: Record<string, unknown>;
  pagina: number;
  itensPorPagina: number;
  ordenarPor: string;
  direcao: 'ASC' | 'DESC';
  allRows?: boolean;
}

/**
 * Base de todo repositório de negócio (SYSTEM.SPEC §7.1/§7.2). Encapsula acesso ao Knex
 * via SQL bruto (`knex.raw`) — nunca ORM. Toda subclasse informa o nome da tabela (para
 * `executarSoftDelete`) e injeta a conexão explicitamente no próprio construtor:
 *
 * ```typescript
 * @Injectable()
 * export class FichaRepository extends BaseRepository {
 *   constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
 *     super(conexao, 'ficha');
 *   }
 * }
 * ```
 */
export abstract class BaseRepository {
  constructor(
    protected readonly conexao: Knex,
    private readonly nomeTabela: string,
  ) {}

  /**
   * Executa uma consulta SQL bruta (`SELECT`) com parâmetros nomeados e retorna as
   * linhas tipadas. Nunca use `?` posicional — sempre `:nomeParametro` com objeto
   * (SYSTEM.SPEC §10.2.7).
   */
  protected async executarConsulta<TResultado>(
    sql: string,
    parametros: Record<string, unknown> = {},
  ): Promise<TResultado[]> {
    const resultado = await this.conexao.raw<{ rows: TResultado[] }>(sql, parametros);
    return resultado.rows;
  }

  /**
   * Executa um comando SQL bruto sem necessidade de ler linhas (`INSERT`/`UPDATE`
   * fire-and-forget) e retorna a quantidade de linhas afetadas.
   */
  protected async executarComando(
    sql: string,
    parametros: Record<string, unknown> = {},
  ): Promise<number> {
    const resultado = await this.conexao.raw<{ rowCount: number }>(sql, parametros);
    return resultado.rowCount ?? 0;
  }

  /**
   * Marca o registro como excluído (soft delete) — nunca `DELETE` físico
   * (Proibição #14).
   */
  protected async executarSoftDelete(id: number): Promise<void> {
    await this.executarComando(
      `UPDATE ${this.nomeTabela}
       SET is_deleted = true, deleted_date = NOW(), updated_date = NOW()
       WHERE id = :id AND is_deleted = false`,
      { id },
    );
  }

  /**
   * Executa uma listagem paginada (SYSTEM.SPEC §10.5): aplica `ORDER BY`/`LIMIT`/`OFFSET`,
   * salvo `allRows`, que devolve tudo mantendo a estrutura de `PaginatedResult<TItem>`
   * (`totalItens = itens.length`, `paginaAtual = totalPaginas = 1`).
   */
  protected async executarConsultaPaginada<TItem>(
    parametros: ParametrosConsultaPaginada,
  ): Promise<PaginatedResult<TItem>> {
    const {
      sqlSelect,
      sqlContagem,
      parametrosSql = {},
      pagina,
      itensPorPagina,
      ordenarPor,
      direcao,
      allRows,
    } = parametros;

    const [linhaContagem] = await this.executarConsulta<{ total: string }>(sqlContagem, parametrosSql);
    const totalItens = Number(linhaContagem?.total ?? 0);

    if (allRows) {
      const itens = await this.executarConsulta<TItem>(
        `${sqlSelect} ORDER BY ${ordenarPor} ${direcao}`,
        parametrosSql,
      );
      return new PaginatedResult<TItem>({ itens, totalItens, paginaAtual: 1, totalPaginas: 1 });
    }

    const deslocamento = (pagina - 1) * itensPorPagina;
    const itens = await this.executarConsulta<TItem>(
      `${sqlSelect} ORDER BY ${ordenarPor} ${direcao} LIMIT :itensPorPagina OFFSET :deslocamento`,
      { ...parametrosSql, itensPorPagina, deslocamento },
    );

    return new PaginatedResult<TItem>({
      itens,
      totalItens,
      paginaAtual: pagina,
      totalPaginas: Math.ceil(totalItens / itensPorPagina),
    });
  }
}
