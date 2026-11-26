import type { NormalizadoDocumento } from "@contratados-rpg/shared/livro";
import type { RegrasConteudo } from "../regras.model";
import { type RegrasSumarioItem, construirSumarioRegras } from "../regras-sumario";
import { Construtor, type GrupoPdf, type PecaPdf } from "./construtor";
import { GEOMETRIA } from "./estilos";
import { PALETA_PDF } from "./paleta";
import type { EstiloTexto, Pincel } from "./pincel";
import { alturaDaLinha, desenharLinha, quebrarLinhas } from "./texto-rico";
import { pecaDeTitulo } from "./blocos/titulos";

export function entradasDoSumario(documento: NormalizadoDocumento): RegrasSumarioItem[] {
    return construirSumarioRegras(documento.filhos as unknown as readonly RegrasConteudo[]);
}

const ESTILOS: readonly {
    readonly estilo: EstiloTexto; readonly recuo: number; readonly antes: number;
}[] = [
    { estilo: { familia: "mono", negrito: true, tamanho: 8.6, cor: PALETA_PDF.texto }, recuo: 0, antes: 2.4 },
    { estilo: { familia: "sans", negrito: true, tamanho: 8, cor: PALETA_PDF.texto }, recuo: 2.6, antes: 0.6 },
    { estilo: { familia: "sans", tamanho: 7.6, cor: PALETA_PDF.secundario }, recuo: 5.4, antes: 0 },
];
const LARGURA_DO_NUMERO = 8;

function entrada(pincel: Pincel, item: RegrasSumarioItem, largura: number): PecaPdf {
    const { estilo, recuo, antes } = ESTILOS[Math.min(item.nivel, 3) - 1];
    const linhas = quebrarLinhas(pincel, [{ texto: item.titulo, estilo }],
        largura - recuo - LARGURA_DO_NUMERO);
    const linha = alturaDaLinha(estilo.tamanho, 1.27);
    const altura = linha * linhas.length;
    return {
        altura,
        espacoAntes: antes,
        prenderProxima: item.nivel === 1,
        desenhar: (contexto, x, y) => {
            linhas.forEach((conteudo, indice) =>
                desenharLinha(contexto, conteudo, x + recuo, y + linha * (indice + 0.76)));
            const base = y + linha * (linhas.length - 1 + 0.76);
            const pagina = contexto.paginaDaAncora(item.ancora);
            const numero = pagina === undefined ? "··" : String(pagina);
            const largoNumero = contexto.pincel.medir(numero, estilo);
            const fimDoTitulo = x + recuo + (linhas[linhas.length - 1]?.largura ?? 0) + 1.2;
            const inicioDoNumero = x + largura - largoNumero;
            if (inicioDoNumero - 1.2 > fimDoTitulo) {
                contexto.pincel.linha(fimDoTitulo, base, inicioDoNumero - 1.2, base,
                    PALETA_PDF.borda, 0.25, true);
            }
            contexto.pincel.texto(numero, inicioDoNumero, base, estilo);
            if (pagina !== undefined) contexto.pincel.linkPagina(x, y, largura, altura, pagina);
        },
    };
}

/** Sumário em duas colunas, com todas as entradas do documento dado. */
export function gruposDoSumario(
    pincel: Pincel, documento: NormalizadoDocumento,
): readonly GrupoPdf[] {
    const construtor = new Construtor(pincel);
    construtor.adicionar(pecaDeTitulo(pincel, "SUMÁRIO", 2, GEOMETRIA.largura));
    const achatar = (itens: readonly RegrasSumarioItem[]): RegrasSumarioItem[] =>
        itens.flatMap((item) => [item, ...achatar(item.filhos)]);
    construtor.emColunas(2, achatar(entradasDoSumario(documento))
        .map((item) => entrada(pincel, item, construtor.largura(2))));
    return construtor.concluir();
}
