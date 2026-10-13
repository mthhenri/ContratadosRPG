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

/** Nó da árvore da paleta: `filhos` ausente ou vazio é folha. */
export interface PaletaNo {
  readonly id: string;
  readonly rotulo: string;
  readonly filhos?: readonly PaletaNo[];
}

/** Linha visível da árvore, já com o nível (1 = raiz) e o estado de abertura. */
export interface PaletaLinha {
  readonly id: string;
  readonly rotulo: string;
  readonly nivel: number;
  readonly temFilhos: boolean;
  readonly aberto: boolean;
  readonly paiId: string | null;
}

/**
 * Linhas visíveis em ordem de leitura: um nó só mostra os filhos quando o id está em `abertos`.
 * Ids repetidos em níveis diferentes abrem juntos, pois a abertura é por id.
 */
export function linhasVisiveisArvore(
  nos: readonly PaletaNo[],
  abertos: ReadonlySet<string>,
): PaletaLinha[] {
  const linhas: PaletaLinha[] = [];
  const percorrer = (lista: readonly PaletaNo[], nivel: number, paiId: string | null): void => {
    for (const no of lista) {
      const temFilhos = (no.filhos?.length ?? 0) > 0;
      const aberto = temFilhos && abertos.has(no.id);
      linhas.push({ id: no.id, rotulo: no.rotulo, nivel, temFilhos, aberto, paiId });
      if (aberto) percorrer(no.filhos!, nivel + 1, no.id);
    }
  };
  percorrer(nos, 1, null);
  return linhas;
}

/** Ids dos ancestrais de `id` (raiz primeiro, sem o próprio); vazio se não existe ou é raiz. */
export function ancestraisDe(nos: readonly PaletaNo[], id: string): string[] {
  const buscar = (lista: readonly PaletaNo[], caminho: readonly string[]): string[] | null => {
    for (const no of lista) {
      if (no.id === id) return [...caminho];
      const achado = buscar(no.filhos ?? [], [...caminho, no.id]);
      if (achado) return achado;
    }
    return null;
  };
  return buscar(nos, []) ?? [];
}
