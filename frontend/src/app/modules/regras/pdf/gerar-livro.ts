/**
 * Porta de entrada do gerador para a aplicação, carregada só no clique: é o que traz o jsPDF para
 * fora do pacote inicial.
 */
import type { NormalizadoDocumento } from "@contratados-rpg/shared/livro";
import type { BaseTema } from "../../../core/services/tema.service";
import { comporLivro } from "./compositor";
import type { DesenhoDeIcone } from "./icones";
import { temaDoPdf } from "./paleta";
import { ARQUIVOS_DE_FONTE, criarPincelJsPdf } from "./pincel-jspdf";

/** Arquivos de `public/fonts/pdf/` que o gerador precisa receber em base64. */
export const FONTES_DO_PDF: readonly string[] = [
    ...new Set(Object.values(ARQUIVOS_DE_FONTE).flatMap((estilos) => Object.values(estilos))),
];

export interface PedidoDeLivro {
    readonly documento: NormalizadoDocumento;
    readonly fontes: Readonly<Record<string, string>>;
    /** PNG em data URL. */
    readonly logo: string;
    readonly icones: Readonly<Record<string, DesenhoDeIcone>>;
    readonly base: BaseTema;
    /** Cor de destaque em `#rrggbb`. */
    readonly destaque: string;
}

export function gerarLivroPdf(pedido: PedidoDeLivro): Blob {
    const { pincel, documento } =
        criarPincelJsPdf(pedido.fontes, temaDoPdf(pedido.base, pedido.destaque));
    comporLivro(pedido.documento, { pincel, logo: pedido.logo, icones: pedido.icones });
    return documento.output("blob");
}
