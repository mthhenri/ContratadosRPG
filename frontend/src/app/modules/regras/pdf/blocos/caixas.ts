import type { Construtor, PecaPdf } from "../construtor";
import { type DesenhoDeIcone, desenharIcone } from "../icones";
import { type Cor, PALETA_PDF } from "../paleta";

const RECUO = 2.4;
const VAO = 2.5;

export interface Caixa {
    /** Monta o conteúdo na largura útil da caixa. */
    readonly conteudo: (largura: number) => readonly PecaPdf[];
    readonly barra?: Cor;
    /** Ícone no canto, na cor da barra. */
    readonly icone?: DesenhoDeIcone;
}

function alturaDe(pecas: readonly PecaPdf[]): number {
    return pecas.reduce(
        (soma, peca, indice) => soma + peca.altura + (indice ? peca.espacoAntes ?? 0 : 0), 0);
}

/** Caixas lado a lado, em fileiras de mesma altura que não se partem. */
export function fileirasDeCaixas(
    construtor: Construtor, caixas: readonly Caixa[], colunas: number, espacoAntes = 2.4,
): PecaPdf[] {
    const largura = (construtor.largura() - VAO * (colunas - 1)) / colunas;
    const fileiras: PecaPdf[] = [];
    for (let inicio = 0; inicio < caixas.length; inicio += colunas) {
        const medidas = caixas.slice(inicio, inicio + colunas).map((caixa) => ({
            barra: caixa.barra, icone: caixa.icone, pecas: caixa.conteudo(largura - RECUO * 2),
        }));
        const altura = Math.max(...medidas.map((medida) => alturaDe(medida.pecas))) + RECUO * 2;
        fileiras.push({
            altura,
            espacoAntes: inicio ? VAO : espacoAntes,
            // Mais alta que a página: uma caixa embaixo da outra, sem o fundo.
            partir: () => medidas.flatMap((medida) => medida.pecas),
            desenhar: (contexto, x, y) => medidas.forEach((medida, coluna) => {
                const esquerda = x + coluna * (largura + VAO);
                contexto.pincel.retangulo(esquerda, y, largura, altura,
                    { preenchimento: PALETA_PDF.superficie });
                if (medida.barra) {
                    contexto.pincel.retangulo(
                        esquerda, y, 0.9, altura, { preenchimento: medida.barra });
                }
                if (medida.icone) {
                    desenharIcone(
                        contexto.pincel, medida.icone, esquerda + largura - RECUO - 4, y + RECUO, 4,
                        medida.barra ?? PALETA_PDF.secundario);
                }
                let posicao = y + RECUO;
                medida.pecas.forEach((peca, indice) => {
                    if (indice) posicao += peca.espacoAntes ?? 0;
                    peca.desenhar(contexto, esquerda + RECUO, posicao);
                    posicao += peca.altura;
                });
            }),
        });
    }
    return fileiras;
}
