import { RegrasTrecho } from "../regras.model";

/** Texto acessível do mesmo conteúdo inline, sem interpretar fórmulas ou Markdown. */
export function lerTextoRegras(trechos: readonly RegrasTrecho[]): string {
    return trechos.map((trecho) => {
        if ("texto" in trecho) {
            return trecho.texto;
        }
        if ("filhos" in trecho) {
            return lerTextoRegras(trecho.filhos);
        }
        return "Trecho censurado";
    }).join("");
}
