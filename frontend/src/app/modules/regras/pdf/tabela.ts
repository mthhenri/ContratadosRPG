import type { PecaPdf } from "./construtor";
import { type Cor, PALETA_PDF } from "./paleta";
import type { Pincel } from "./pincel";
import {
    type Corrida, type Linha, alturaDaLinha, desenharLinha, medirTexto, quebrarLinhas,
} from "./texto-rico";

export type Celula = readonly Corrida[];

export interface Coluna {
    /** Largura fixa em milímetros; sem ela, divide o que sobrar conforme o `peso`. */
    readonly largura?: number;
    readonly peso?: number;
    readonly centro?: boolean;
}

const RECUO = 1.4;
const MARGEM = 0.9;

export function largurasDasColunas(colunas: readonly Coluna[], total: number): number[] {
    const fixas = colunas.reduce((soma, coluna) => soma + (coluna.largura ?? 0), 0);
    const pesos = colunas.reduce(
        (soma, coluna) => soma + (coluna.largura ? 0 : coluna.peso ?? 1), 0);
    return colunas.map(
        (coluna) => coluna.largura ?? ((total - fixas) * (coluna.peso ?? 1)) / pesos);
}

/**
 * Largura de cada coluna pelo que ela escreve: nunca menos que a palavra mais comprida, e o resto
 * repartido conforme o texto que ainda não coube numa linha.
 */
export function largurasAutomaticas(
    pincel: Pincel, linhas: readonly (readonly Celula[])[], total: number,
): number[] {
    const quantidade = Math.max(1, ...linhas.map((linha) => linha.length));
    const medidas = Array.from({ length: quantidade }, (_, coluna) => {
        let inteira = 0;
        let palavra = 0;
        for (const linha of linhas) {
            const corridas = linha[coluna] ?? [];
            const largura = (texto: string, corrida: Corrida) => corrida.tarja
                ? pincel.medir("0", corrida.estilo) * corrida.tarja : medirTexto(pincel, texto, corrida.estilo);
            inteira = Math.max(
                inteira,
                corridas.reduce((soma, corrida) => soma + largura(corrida.texto, corrida), 0));
            for (const corrida of corridas) {
                for (const parte of corrida.texto.split(/\s+/)) {
                    palavra = Math.max(palavra, largura(parte, corrida));
                }
            }
        }
        return {
            inteira: inteira + RECUO * 2 + 0.2,
            minima: Math.min(palavra, total / 2) + RECUO * 2 + 0.2,
        };
    });
    const soma = (de: (medida: { inteira: number; minima: number }) => number) =>
        medidas.reduce((acumulado, medida) => acumulado + de(medida), 0);
    const inteiras = soma((medida) => medida.inteira);
    if (inteiras <= total) return medidas.map((medida) => (medida.inteira * total) / inteiras);
    const minimas = soma((medida) => medida.minima);
    if (minimas >= total) return medidas.map((medida) => (medida.minima * total) / minimas);
    const falta = soma((medida) => Math.max(0, medida.inteira - medida.minima));
    return medidas.map((medida) =>
        medida.minima + ((total - minimas) * Math.max(0, medida.inteira - medida.minima)) / falta);
}

/** Cabeçalho em faixa (repetido a cada continuação) e linhas zebradas que não se partem. */
export function pecasDeTabela(
    pincel: Pincel, colunas: readonly Coluna[], cabecalho: readonly Celula[],
    linhas: readonly (readonly Celula[])[], largura: number, espacoAntes = 1.5,
): PecaPdf[] {
    const larguras = largurasDasColunas(colunas, largura);
    const posicoes = larguras.map(
        (_, indice) => larguras.slice(0, indice).reduce((a, b) => a + b, 0));
    const medir = (celulas: readonly Celula[]): Linha[][] => celulas.map((celula, indice) =>
        quebrarLinhas(pincel, celula, larguras[indice] - RECUO * 2));
    const alturaDasLinhas = (conteudo: readonly Linha[]) =>
        conteudo.reduce((soma, linha) => soma + alturaDaLinha(linha.tamanho, 1.24), 0);

    const fileira = (celulas: Linha[][], fundo: Cor | null,
        traco: boolean, extras: Partial<PecaPdf>): PecaPdf => {
        const altura = Math.max(...celulas.map(alturaDasLinhas), alturaDaLinha(8)) + MARGEM * 2;
        return {
            ...extras,
            altura,
            desenhar: (contexto, x, y) => {
                if (fundo) contexto.pincel.retangulo(
                    x, y, largura, altura, { preenchimento: fundo });
                celulas.forEach((celula, coluna) => {
                    let posicao = y + MARGEM;
                    for (const linha of celula) {
                        const alturaAtual = alturaDaLinha(linha.tamanho, 1.24);
                        const sobra = larguras[coluna] - RECUO * 2 - linha.largura;
                        desenharLinha(contexto, linha,
                            x + posicoes[coluna] + RECUO + (colunas[coluna].centro ? sobra / 2 : 0),
                            posicao + alturaAtual * 0.77);
                        posicao += alturaAtual;
                    }
                });
                if (traco) {
                    contexto.pincel.linha(
                        x, y + altura, x + largura, y + altura, PALETA_PDF.borda, 0.15);
                }
            },
        };
    };

    // Tabela sem cabeçalho (identidade, listas da fonte) começa direto nas linhas.
    const titulo = cabecalho.length
        ? fileira(
            medir(cabecalho), PALETA_PDF.ameacaFundo, false, { espacoAntes, prenderProxima: true })
        : undefined;
    const corpo = linhas.map((linha, indice) => {
        const medida = medir(linha);
        const fundo = indice % 2 ? PALETA_PDF.zebra : null;
        return fileira(medida, fundo, true, {
            espacoAntes: !titulo && indice === 0 ? espacoAntes : 0,
            repetir: titulo,
            partir: () => {
                const total = Math.max(...medida.map((celula) => celula.length));
                return Array.from({ length: total }, (_, posicao) => fileira(
                    medida.map((celula) => celula[posicao] ? [celula[posicao]] : []),
                    fundo, posicao === total - 1, { repetir: titulo }));
            },
        });
    });
    return titulo ? [titulo, ...corpo] : corpo;
}
