import type { Geometria } from "./paginacao";
import { PALETA_PDF } from "./paleta";
import type { EstiloTexto } from "./pincel";

/** A4 em milímetros. */
export const PAGINA = { largura: 210, altura: 297 } as const;

export const GEOMETRIA: Geometria = { esquerda: 14, topo: 18, base: 282, largura: 182, vao: 5 };

export const CORPO: EstiloTexto = { familia: "sans", tamanho: 9.2, cor: PALETA_PDF.texto };
/** Cartões, colunas estreitas e tabelas. */
export const MIUDO: EstiloTexto = { familia: "sans", tamanho: 8.4, cor: PALETA_PDF.texto };
export const NOME: EstiloTexto = { familia: "mono", negrito: true, tamanho: 8.6, cor: PALETA_PDF.texto };
export const ROTULO: EstiloTexto = {
    familia: "mono", negrito: true, tamanho: 6.8, cor: PALETA_PDF.secundario, espacamento: 0.25,
};
