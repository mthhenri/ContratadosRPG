/** Item da paleta: `contexto` é o caminho em texto secundário (ex.: ancestrais da seção). */
export interface PaletaItem {
  readonly id: string;
  readonly rotulo: string;
  readonly contexto?: string;
}

/** Minúsculas e sem acento, para a busca não depender de como o termo foi digitado. */
export function normalizarPaleta(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/**
 * Filtra e ordena: título que começa com o termo, depois início de palavra no título, depois
 * trecho do título e por fim trecho do caminho. Empates mantêm a ordem original dos itens.
 * Termo vazio devolve todos, na ordem recebida.
 */
export function filtrarPaleta(itens: readonly PaletaItem[], consulta: string): PaletaItem[] {
  const termo = normalizarPaleta(consulta);
  if (!termo) return [...itens];
  const pontuados: { item: PaletaItem; ponto: number; ordem: number }[] = [];
  itens.forEach((item, ordem) => {
    const rotulo = normalizarPaleta(item.rotulo);
    const contexto = normalizarPaleta(item.contexto ?? '');
    const ponto = rotulo.startsWith(termo) ? 0
      : rotulo.includes(` ${termo}`) ? 1
      : rotulo.includes(termo) ? 2
      : contexto.includes(termo) ? 3 : -1;
    if (ponto >= 0) pontuados.push({ item, ponto, ordem });
  });
  return pontuados.sort((a, b) => a.ponto - b.ponto || a.ordem - b.ordem).map(({ item }) => item);
}
