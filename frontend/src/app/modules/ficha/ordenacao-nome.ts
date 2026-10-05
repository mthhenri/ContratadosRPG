/**
 * Ordem alfabética de apresentação das fichas (m4-12, m4-15): `pt-BR`, sem diferenciar acento nem
 * caixa ("Álvaro" antes de "Bruno"). O `ORDER BY ficha.nome` do backend não tem essa colação, então
 * a ordem é aplicada aqui, sobre o que o backend devolve. Empate de nome desempata pelo id, para a
 * ordem ser estável entre renders.
 */
const COMPARADOR_NOME = new Intl.Collator('pt-BR', { sensitivity: 'base' });

export function compararPorNome(
  anterior: { readonly nome: string; readonly id: number },
  seguinte: { readonly nome: string; readonly id: number },
): number {
  return COMPARADOR_NOME.compare(anterior.nome, seguinte.nome) || anterior.id - seguinte.id;
}

export function ordenarPorNome<T extends { readonly nome: string; readonly id: number }>(
  itens: readonly T[],
): T[] {
  return [...itens].sort(compararPorNome);
}
