/**
 * Paginação pura do PDF das Regras: recebe peças já medidas e decide página, coluna e posição de
 * cada uma. Nada aqui desenha; quem desenha é a própria peça, depois, na posição escolhida.
 */

/** Região útil da página, em milímetros. */
export interface Geometria {
    readonly esquerda: number;
    readonly topo: number;
    readonly base: number;
    readonly largura: number;
    /** Espaço entre colunas. */
    readonly vao: number;
}

export interface Peca<TContexto = unknown> {
    readonly altura: number;
    /** Respiro antes da peça; ignorado no topo da coluna. */
    readonly espacoAntes?: number;
    /** Nunca é a última da coluna (título, cabeçalho de tabela). */
    readonly prenderProxima?: boolean;
    /** Redesenhado quando a peça abre uma coluna (linha de tabela que continua). */
    readonly repetir?: Peca<TContexto>;
    /** Âncoras que passam a apontar para a página desta peça. */
    readonly ancoras?: readonly string[];
    /** Divide em pedaços quando é mais alta que a coluna inteira. */
    partir?(): readonly Peca<TContexto>[];
    desenhar(contexto: TContexto, x: number, y: number): void;
}

export type Colunas = 1 | 2 | 3;

export type Grupo<TContexto = unknown> =
    | {
        readonly tipo: "fluxo";
        readonly colunas: Colunas;
        readonly pecas: readonly Peca<TContexto>[];
        readonly novaPagina?: boolean;
        readonly capitulo?: string;
    }
    | {
        /** Colunas independentes lado a lado (arquétipos); cada uma continua na própria coluna. */
        readonly tipo: "paralelo";
        readonly colunas: readonly (readonly Peca<TContexto>[])[];
        readonly novaPagina?: boolean;
        readonly capitulo?: string;
    };

export interface PecaPosta<TContexto = unknown> {
    readonly peca: Peca<TContexto>;
    readonly x: number;
    readonly y: number;
}

export interface Pagina<TContexto = unknown> {
    capitulo: string;
    readonly postas: PecaPosta<TContexto>[];
}

/** Peças que andam juntas (título + o que vem depois). */
type Cadeia<T> = readonly Peca<T>[];

interface ColunaCheia<T> {
    readonly postas: PecaPosta<T>[];
    readonly proximo: number;
    readonly fim: number;
}

const FOLGA = 0.01;
/** Título e primeiras linhas que ficam juntos quando a cadeia inteira não cabe numa coluna. */
const JUNTAS_NO_COMECO = 3;

export function larguraDaColuna(geometria: Geometria, colunas: number): number {
    return (geometria.largura - geometria.vao * (colunas - 1)) / colunas;
}

function alturaDaCadeia<T>(cadeia: Cadeia<T>, noTopo: boolean): number {
    return cadeia.reduce((soma, peca, indice) =>
        soma + peca.altura + (indice === 0 && noTopo ? 0 : peca.espacoAntes ?? 0), 0);
}

function montarCadeias<T>(pecas: readonly Peca<T>[], alturaUtil: number): Cadeia<T>[] {
    const expandidas: Peca<T>[] = [];
    const expandir = (peca: Peca<T>): void => {
        if (peca.altura > alturaUtil && peca.partir) peca.partir().forEach(expandir);
        else expandidas.push(peca);
    };
    pecas.forEach(expandir);

    const cadeias: Peca<T>[][] = [];
    let aberta: Peca<T>[] = [];
    for (const peca of expandidas) {
        aberta.push(peca);
        if (peca.prenderProxima) continue;
        cadeias.push(aberta);
        aberta = [];
    }
    if (aberta.length) cadeias.push(aberta);
    // Cadeia maior que a coluna não anda junta, mas o título segue com o começo do que anuncia.
    return cadeias.flatMap((cadeia) => {
        if (alturaDaCadeia(cadeia, true) <= alturaUtil) return [cadeia];
        const comeco = cadeia.slice(0, JUNTAS_NO_COMECO);
        return alturaDaCadeia(comeco, true) <= alturaUtil
            ? [comeco, ...cadeia.slice(JUNTAS_NO_COMECO).map((peca) => [peca])]
            : cadeia.map((peca) => [peca]);
    });
}

function encherColuna<T>(
    cadeias: readonly Cadeia<T>[], inicio: number, x: number, yInicial: number, limite: number,
    aceitarGrande: boolean, reservaFinal = 0,
): ColunaCheia<T> {
    const postas: PecaPosta<T>[] = [];
    let y = yInicial;
    let indice = inicio;
    while (indice < cadeias.length) {
        const cadeia = cadeias[indice];
        const noTopo = postas.length === 0;
        const repetida = noTopo ? cadeia[0].repetir : undefined;
        const altura = (repetida?.altura ?? 0) + alturaDaCadeia(cadeia, noTopo && !repetida);
        const presa = indice === cadeias.length - 1 && !!cadeia[cadeia.length - 1].prenderProxima;
        const cabe = y + altura + (presa ? reservaFinal : 0) <= limite + FOLGA;
        if (!cabe && !(noTopo && aceitarGrande)) break;
        if (repetida) {
            postas.push({ peca: repetida, x, y });
            y += repetida.altura;
        }
        cadeia.forEach((peca, posicao) => {
            if (!(posicao === 0 && noTopo && !repetida)) y += peca.espacoAntes ?? 0;
            postas.push({ peca, x, y });
            y += peca.altura;
        });
        indice += 1;
        if (!cabe) break;
    }
    return { postas, proximo: indice, fim: y };
}

/** Distribui todo o restante em `colunas` colunas de no máximo `altura`; `null` se não couber. */
function tentarEquilibrar<T>(
    cadeias: readonly Cadeia<T>[], inicio: number, geometria: Geometria, colunas: number,
    yRegiao: number, altura: number,
): { postas: PecaPosta<T>[]; fim: number } | null {
    const largura = larguraDaColuna(geometria, colunas);
    const postas: PecaPosta<T>[] = [];
    let indice = inicio;
    let fim = yRegiao;
    for (let coluna = 0; coluna < colunas && indice < cadeias.length; coluna++) {
        const x = geometria.esquerda + coluna * (largura + geometria.vao);
        const cheia = encherColuna(cadeias, indice, x, yRegiao, yRegiao + altura, false);
        postas.push(...cheia.postas);
        indice = cheia.proximo;
        fim = Math.max(fim, cheia.fim);
    }
    return indice === cadeias.length ? { postas, fim } : null;
}

export function paginar<T>(grupos: readonly Grupo<T>[], geometria: Geometria): Pagina<T>[] {
    const paginas: Pagina<T>[] = [];
    const alturaUtil = geometria.base - geometria.topo;
    let capitulo = "";
    let y = geometria.topo;

    const atual = (): Pagina<T> => paginas[paginas.length - 1];
    const abrirPagina = (): void => {
        paginas.push({ capitulo, postas: [] });
        y = geometria.topo;
    };
    const noTopo = (): boolean => y <= geometria.topo + FOLGA;

    const preparar = (grupo: Grupo<T>): void => {
        capitulo = grupo.capitulo ?? capitulo;
        if (!paginas.length || (grupo.novaPagina && atual().postas.length)) abrirPagina();
        else if (!atual().postas.length) atual().capitulo = capitulo;
    };

    /** Altura que o começo do grupo seguinte pede, para o título que fecha o anterior ir junto. */
    const reservaDe = (grupo: Grupo<T> | undefined): number => {
        if (!grupo || grupo.novaPagina) return 0;
        const primeiras = grupo.tipo === "fluxo"
            ? [montarCadeias(grupo.pecas, alturaUtil)[0]]
            : grupo.colunas.map((coluna) => montarCadeias(coluna, alturaUtil)[0]);
        return Math.max(
            0, ...primeiras.map((cadeia) => cadeia ? alturaDaCadeia(cadeia, false) : 0));
    };

    const fluir = (grupo: Extract<Grupo<T>, { tipo: "fluxo" }>, reserva: number): void => {
        const cadeias = montarCadeias(grupo.pecas, alturaUtil);
        if (!cadeias.length) return;
        preparar(grupo);
        const colunas = grupo.colunas;
        const largura = larguraDaColuna(geometria, colunas);
        let indice = 0;
        let respiro = cadeias[0][0].espacoAntes ?? 0;
        while (indice < cadeias.length) {
            const yRegiao = noTopo() ? geometria.topo : y + respiro;
            const ultima = indice === cadeias.length - 1;
            const presa = ultima && cadeias[indice][cadeias[indice].length - 1].prenderProxima;
            const minimo = alturaDaCadeia(cadeias[indice], true) + (presa ? reserva : 0);
            if (!noTopo() && yRegiao + minimo > geometria.base + FOLGA) {
                abrirPagina();
                respiro = 0;
                continue;
            }
            if (colunas > 1) {
                const disponivel = geometria.base - yRegiao;
                let melhor =
                    tentarEquilibrar(cadeias, indice, geometria, colunas, yRegiao, disponivel);
                if (melhor) {
                    let minima = 0;
                    let maxima = disponivel;
                    while (maxima - minima > 0.1) {
                        const meio = (minima + maxima) / 2;
                        const tentativa = tentarEquilibrar(
                            cadeias, indice, geometria, colunas, yRegiao, meio);
                        if (tentativa) {
                            melhor = tentativa;
                            maxima = meio;
                        } else {
                            minima = meio;
                        }
                    }
                    atual().postas.push(...melhor.postas);
                    y = melhor.fim;
                    return;
                }
            }
            let fim = yRegiao;
            const antes = indice;
            for (let coluna = 0; coluna < colunas && indice < cadeias.length; coluna++) {
                const x = geometria.esquerda + coluna * (largura + geometria.vao);
                const cheia = encherColuna(
                    cadeias, indice, x, yRegiao, geometria.base,
                    yRegiao <= geometria.topo + FOLGA, reserva);
                atual().postas.push(...cheia.postas);
                indice = cheia.proximo;
                fim = Math.max(fim, cheia.fim);
            }
            y = fim;
            if (indice < cadeias.length) {
                if (indice === antes && noTopo()) y = geometria.base;
                abrirPagina();
                respiro = 0;
            }
        }
    };

    const emParalelo = (grupo: Extract<Grupo<T>, { tipo: "paralelo" }>): void => {
        const colunas = grupo.colunas.map((coluna) => montarCadeias(coluna, alturaUtil));
        if (!colunas.some((coluna) => coluna.length)) return;
        preparar(grupo);
        const largura = larguraDaColuna(geometria, colunas.length);
        const indices = colunas.map(() => 0);
        const maiorComeco = Math.max(
            ...colunas.map((coluna) => coluna[0] ? alturaDaCadeia(coluna[0], true) : 0));
        const respiro = Math.max(0, ...colunas.map((coluna) => coluna[0]?.[0].espacoAntes ?? 0));
        if (!noTopo() && y + respiro + maiorComeco > geometria.base) abrirPagina();
        else if (!noTopo()) y += respiro;
        for (;;) {
            const yRegiao = y;
            let fim = yRegiao;
            colunas.forEach((cadeias, coluna) => {
                const x = geometria.esquerda + coluna * (largura + geometria.vao);
                const cheia = encherColuna(
                    cadeias, indices[coluna], x, yRegiao, geometria.base,
                    yRegiao <= geometria.topo + FOLGA);
                atual().postas.push(...cheia.postas);
                indices[coluna] = cheia.proximo;
                fim = Math.max(fim, cheia.fim);
            });
            y = fim;
            if (colunas.every((cadeias, coluna) => indices[coluna] >= cadeias.length)) return;
            abrirPagina();
        }
    };

    grupos.forEach((grupo, indice) => {
        if (grupo.tipo === "fluxo") fluir(grupo, reservaDe(grupos[indice + 1]));
        else emParalelo(grupo);
    });
    return paginas;
}
