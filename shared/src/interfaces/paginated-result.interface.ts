/**
 * Estrutura padrão de listagem paginada (SYSTEM.SPEC §10.5). DTOs de saída de listagem
 * herdam desta classe — nunca a redefinem por composição.
 */
export class PaginatedResult<TItem> {
  itens: TItem[];
  totalItens: number;
  paginaAtual: number;
  totalPaginas: number;

  constructor(parametros: {
    itens: TItem[];
    totalItens: number;
    paginaAtual: number;
    totalPaginas: number;
  }) {
    this.itens = parametros.itens;
    this.totalItens = parametros.totalItens;
    this.paginaAtual = parametros.paginaAtual;
    this.totalPaginas = parametros.totalPaginas;
  }
}
