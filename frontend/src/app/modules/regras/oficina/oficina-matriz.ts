/** Uma célula de tabela: a lista de trechos do texto rico (vazia = célula vazia). */
export type CelulaDeMatriz = readonly unknown[];
export type LinhaDeMatriz = readonly CelulaDeMatriz[];

/** Estado de uma tabela da Oficina: cabeçalho (pode ser vazio) e linhas. */
export interface Matriz {
    readonly cabecalho: LinhaDeMatriz;
    readonly linhas: readonly LinhaDeMatriz[];
}

/** Quantas colunas a tabela tem: a maior entre o cabeçalho e as linhas (no mínimo uma). */
export function contarColunas(matriz: Matriz): number {
    return Math.max(1, matriz.cabecalho.length, ...matriz.linhas.map((linha) => linha.length));
}

function celulasVazias(quantidade: number): CelulaDeMatriz[] {
    return Array.from({ length: quantidade }, () => []);
}

/** Acrescenta uma linha vazia no fim, com uma célula por coluna. */
export function adicionarLinha(matriz: Matriz): Matriz {
    return { ...matriz, linhas: [...matriz.linhas, celulasVazias(contarColunas(matriz))] };
}

/** Tira a linha na posição dada (posição inexistente não muda nada). */
export function removerLinha(matriz: Matriz, indice: number): Matriz {
    return { ...matriz, linhas: matriz.linhas.filter((_, posicao) => posicao !== indice) };
}

/** Acrescenta uma coluna vazia no fim do cabeçalho (se houver) e de cada linha, igualando antes as linhas curtas. */
export function adicionarColuna(matriz: Matriz): Matriz {
    const colunas = contarColunas(matriz);
    const completar = (linha: LinhaDeMatriz): CelulaDeMatriz[] => [...linha, ...celulasVazias(colunas - linha.length), []];
    return {
        cabecalho: matriz.cabecalho.length ? completar(matriz.cabecalho) : matriz.cabecalho,
        linhas: matriz.linhas.map(completar),
    };
}

/** Tira a última coluna; a tabela nunca fica com menos de uma coluna. */
export function removerUltimaColuna(matriz: Matriz): Matriz {
    const colunas = contarColunas(matriz);
    if (colunas <= 1) return matriz;
    const cortar = (linha: LinhaDeMatriz): CelulaDeMatriz[] => linha.slice(0, colunas - 1);
    return { cabecalho: cortar(matriz.cabecalho), linhas: matriz.linhas.map(cortar) };
}
