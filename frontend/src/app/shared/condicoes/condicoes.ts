import { DESCRICOES_CONDICOES } from "./condicoes.dados";

function normalizarNome(nome: string): string {
    return nome.normalize("NFD").replace(/\p{M}/gu, "").trim().toLocaleLowerCase("pt-BR");
}

const descricoes = new Map(DESCRICOES_CONDICOES.map((condicao) =>
    [normalizarNome(condicao.nome), `${condicao.nome}\n${condicao.descricao}`]));

/** Texto de apresentação extraído do livro; desconhecido não ganha efeitos inventados. */
export function descreverCondicao(nome: string): string {
    return descricoes.get(normalizarNome(nome)) ?? "";
}

/** Palavras inteiras, incluindo nomes compostos; preserva o texto e sua capitalização. */
export function separarCondicoesTexto(texto: string): readonly string[] {
    return texto.split(padraoCondicoes).filter(Boolean);
}

const nomes = DESCRICOES_CONDICOES.map((condicao) =>
    condicao.nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((primeiro, segundo) => segundo.length - primeiro.length);
const padraoCondicoes = new RegExp(
    `(?<![\\p{L}\\p{N}_])(${nomes.join("|")})(?![\\p{L}\\p{N}_])`, "giu",
);
