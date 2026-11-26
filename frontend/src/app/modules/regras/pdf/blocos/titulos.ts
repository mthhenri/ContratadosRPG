import type { PecaPdf } from "../construtor";
import { desenharGlifo, larguraDoGlifo } from "../glifos";
import { type DesenhoDeIcone, desenharIcone } from "../icones";
import { PALETA_PDF } from "../paleta";
import { MM_POR_PONTO, type EstiloTexto, type Pincel } from "../pincel";
import { alturaDaLinha, desenharLinha, quebrarLinhas } from "../texto-rico";

interface Desenho {
    readonly glifo: string;
    readonly tamanho: number;
    readonly maiusculas?: boolean;
    readonly espacoAntes: number;
    readonly folga: number;
    readonly regua?: boolean;
}

const NIVEIS: Readonly<Record<1 | 2 | 3 | 4, Desenho>> = {
    1: { glifo: "⬢", tamanho: 19, maiusculas: true, espacoAntes: 0, folga: 4, regua: true },
    2: { glifo: "⬡", tamanho: 13, espacoAntes: 5, folga: 2.4, regua: true },
    3: { glifo: "⬥", tamanho: 10.5, espacoAntes: 3.6, folga: 1.4 },
    4: { glifo: "⬦", tamanho: 9.2, espacoAntes: 2.6, folga: 1 },
};

/** Título de seção: nunca fica no pé da coluna e carrega a âncora do sumário. */
export function pecaDeTitulo(
    pincel: Pincel, texto: string, nivel: 1 | 2 | 3 | 4, largura: number, ancora?: string,
    icone?: DesenhoDeIcone,
): PecaPdf {
    const desenho = NIVEIS[nivel];
    const estilo: EstiloTexto = {
        familia: "mono", negrito: true, tamanho: desenho.tamanho, cor: PALETA_PDF.texto,
        espacamento: desenho.maiusculas ? 0.6 : 0,
    };
    const ladoDoIcone = desenho.tamanho * MM_POR_PONTO;
    const recuo = (icone ? ladoDoIcone : larguraDoGlifo(desenho.tamanho)) + 1.8;
    // O espaçamento entre letras alarga o título; a quebra reserva essa folga.
    const reserva = (estilo.espacamento ?? 0) * texto.length;
    const linhas = quebrarLinhas(pincel,
        [{ texto: desenho.maiusculas ? texto.toLocaleUpperCase("pt-BR") : texto, estilo }],
        largura - recuo - reserva);
    const linha = alturaDaLinha(desenho.tamanho, 1.18);
    const altura = linha * linhas.length + desenho.folga;
    return {
        altura,
        espacoAntes: desenho.espacoAntes,
        prenderProxima: true,
        ancoras: ancora ? [ancora] : [],
        desenhar: (contexto, x, y) => {
            if (icone) {
                desenharIcone(
                    contexto.pincel, icone, x, y + linha * 0.78 - ladoDoIcone * 0.86, ladoDoIcone,
                    PALETA_PDF.destaque);
            } else {
                desenharGlifo(contexto.pincel, desenho.glifo, x, y + linha * 0.78, desenho.tamanho,
                    nivel === 1 ? PALETA_PDF.destaque : PALETA_PDF.texto);
            }
            linhas.forEach((conteudo, indice) =>
                desenharLinha(contexto, conteudo, x + recuo, y + linha * (indice + 0.78)));
            if (desenho.regua) {
                const base = y + linha * linhas.length + desenho.folga * 0.35;
                contexto.pincel.linha(x, base, x + largura, base,
                    nivel === 1 ? PALETA_PDF.destaque : PALETA_PDF.borda, nivel === 1 ? 0.6 : 0.25);
            }
        },
    };
}

/** Rótulo curto em caixa alta ("HABILIDADES DE CLASSE"). */
export function pecaDeRotulo(
    texto: string, estilo: EstiloTexto, espacoAntes = 2.4,
): PecaPdf {
    const altura = alturaDaLinha(estilo.tamanho, 1.5);
    return {
        altura,
        espacoAntes,
        prenderProxima: true,
        desenhar: (contexto, x, y) => contexto.pincel.texto(
            texto.toLocaleUpperCase("pt-BR"), x, y + altura * 0.72, estilo),
    };
}
