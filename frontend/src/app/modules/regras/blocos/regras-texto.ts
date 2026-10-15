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

/** Palavras que, antes de um `+N`, indicam que o bônus continua a mesma frase ("+1 em A e +1 em B"). */
const LIGACOES_DE_BONUS = new Set(["e", "ou"]);

/**
 * Separa bônus de Formação que chegaram colados no mesmo texto (`+3 de resistência … +1 dado em …`):
 * cada bônus começa em `+N` precedido de espaço. Não parte depois de "e"/"ou" nem de vírgula/dois-pontos
 * (a frase continua) e só olha texto simples; marcações como negrito ficam inteiras no grupo em que estão.
 * Sem pelo menos dois bônus, devolve o texto original num único grupo.
 */
export function separarBonusDeFormacao(trechos: readonly RegrasTrecho[]): RegrasTrecho[][] {
    const grupos: RegrasTrecho[][] = [[]];
    for (const trecho of trechos) {
        if (trecho.tipo !== "texto") {
            grupos[grupos.length - 1].push(trecho);
            continue;
        }
        let inicio = 0;
        for (const achado of trecho.texto.matchAll(/(?<=\S)\s+(?=\+\d)/g)) {
            const anterior = trecho.texto.slice(0, achado.index).split(/\s+/).pop() ?? "";
            if (LIGACOES_DE_BONUS.has(anterior.toLowerCase()) || /[,:;]$/.test(anterior)) continue;
            grupos[grupos.length - 1].push({ tipo: "texto", texto: trecho.texto.slice(inicio, achado.index) });
            grupos.push([]);
            inicio = achado.index + achado[0].length;
        }
        grupos[grupos.length - 1].push({ tipo: "texto", texto: trecho.texto.slice(inicio) });
    }
    const limpos = grupos
        .map((grupo) => grupo.filter((trecho) => trecho.tipo !== "texto" || trecho.texto !== ""))
        .filter((grupo) => grupo.length > 0);
    return limpos.length > 1 ? limpos : [[...trechos]];
}

/** Nota com efeitos marcados por ▢: introdução, um item por marcador e a ressalva que vem depois. */
export interface RegrasNotaEstruturada {
    readonly introducao: readonly RegrasTrecho[];
    readonly itens: readonly (readonly RegrasTrecho[])[];
    readonly ressalva: readonly RegrasTrecho[];
}

const MARCADOR_DE_EFEITO = "▢";

/**
 * Reconhece a estrutura de uma nota cujo texto traz os efeitos como `▢ efeito ▢ efeito`: tudo antes do
 * primeiro marcador é a introdução; cada marcador abre um item; o que vem depois do trecho de texto dos
 * itens (outro trecho, como um itálico) é a ressalva. Exige dois ou mais marcadores no mesmo trecho de
 * texto — qualquer outra forma devolve `null` e a nota segue como parágrafo.
 */
export function estruturarNotaComMarcadores(trechos: readonly RegrasTrecho[]): RegrasNotaEstruturada | null {
    const posicao = trechos.findIndex((trecho) =>
        trecho.tipo === "texto" && trecho.texto.split(MARCADOR_DE_EFEITO).length > 2);
    const trecho = trechos[posicao];
    if (trecho?.tipo !== "texto") return null;
    const [antes, ...itens] = trecho.texto.split(MARCADOR_DE_EFEITO);
    const introducao: RegrasTrecho[] = [...trechos.slice(0, posicao), { tipo: "texto" as const, texto: antes.trimEnd() }]
        .filter((parte) => parte.tipo !== "texto" || parte.texto !== "");
    return {
        introducao,
        itens: itens.map((item) => item.trim()).filter(Boolean)
            .map((item): RegrasTrecho[] => [{ tipo: "texto", texto: item }]),
        ressalva: trechos.slice(posicao + 1),
    };
}
