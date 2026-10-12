import type { LivroMudancaDto } from "@contratados-rpg/shared/dtos/livro";
import { LivroMudancaSituacaoEnum } from "@contratados-rpg/shared/enums";

const ROTULOS_DE_CAMPO: Readonly<Record<string, string>> = {
    trechos: "Texto", nome: "Nome", titulo: "Título", custo: "Custo", citacao: "Citação", reacao: "Reação",
    glifo: "Glifo", nivel: "Nível", ancora: "Âncora", tipo: "Tipo", categoria: "Categoria", empilhamento: "Empilhamento",
    efeito: "Efeito", bloqueia: "Bloqueia", descricao: "Descrição", peso: "Peso", porte: "Porte", danos: "Danos",
    atributosBonus: "Atributos bônus", cadencia: "Cadência", vidaMaxima: "Vida máxima", defesaBase: "Defesa base",
};

/** Nome legível do campo alterado: `saude.vida` → "Saúde › vida"; o que não tem nome conhecido sai como veio. */
export function rotuloDoCampo(campo: string): string {
    const partes = campo.split(".");
    const primeiro = ROTULOS_DE_CAMPO[partes[0]] ?? partes[0];
    return partes.length === 1 ? primeiro : [primeiro, ...partes.slice(1)].join(" › ");
}

function textoDeTrechos(trechos: readonly unknown[]): string {
    return trechos.map((trecho) => {
        if (typeof trecho !== "object" || trecho === null) return "";
        const objeto = trecho as { texto?: unknown; filhos?: unknown };
        if (typeof objeto.texto === "string") return objeto.texto;
        return Array.isArray(objeto.filhos) ? textoDeTrechos(objeto.filhos) : "";
    }).join("");
}

const LIMITE_DO_VALOR = 160;

/** O valor de um campo em uma linha só, para mostrar o antes e o depois sem despejar JSON. */
export function valorCurto(valor: unknown): string {
    if (valor === null || valor === undefined) return "—";
    let texto: string;
    if (typeof valor === "string") texto = valor;
    else if (typeof valor === "number" || typeof valor === "boolean") texto = String(valor);
    else if (Array.isArray(valor) && valor.every((item) => typeof item === "object" && item !== null && "tipo" in item)) {
        texto = textoDeTrechos(valor);
    } else texto = JSON.stringify(valor);
    texto = texto.replace(/\s+/g, " ").trim();
    if (!texto) return "—";
    return texto.length > LIMITE_DO_VALOR ? `${texto.slice(0, LIMITE_DO_VALOR)}…` : texto;
}

/** Texto do selo de cada situação, no feminino de "peça". */
export const ROTULO_DA_SITUACAO: Readonly<Record<LivroMudancaSituacaoEnum, string>> = {
    [LivroMudancaSituacaoEnum.NOVA]: "nova",
    [LivroMudancaSituacaoEnum.REMOVIDA]: "removida",
    [LivroMudancaSituacaoEnum.ALTERADA]: "alterada",
    [LivroMudancaSituacaoEnum.MOVIDA]: "movida",
};

/** Contagem por situação do que a lista mostra (o resumo nunca diverge da lista). */
export function contarPorSituacao(lista: readonly LivroMudancaDto[]): Readonly<Record<LivroMudancaSituacaoEnum, number>> {
    const contagem = {
        [LivroMudancaSituacaoEnum.NOVA]: 0, [LivroMudancaSituacaoEnum.REMOVIDA]: 0,
        [LivroMudancaSituacaoEnum.ALTERADA]: 0, [LivroMudancaSituacaoEnum.MOVIDA]: 0,
    };
    for (const mudanca of lista) contagem[mudanca.situacao] += 1;
    return contagem;
}

/**
 * Esconde as filhas de uma peça nova (ou removida): a mãe já as leva. Sem o pai na comparação, a filha é reconhecida
 * pelo caminho da mãe como prefixo do seu próprio, com a mesma situação.
 */
export function semFilhasDeNovasOuRemovidas(lista: readonly LivroMudancaDto[]): readonly LivroMudancaDto[] {
    const maes = lista.filter((m) => m.situacao === LivroMudancaSituacaoEnum.NOVA || m.situacao === LivroMudancaSituacaoEnum.REMOVIDA);
    return lista.filter((mudanca) => !maes.some((mae) => mae.situacao === mudanca.situacao
        && mae.caminho.length < mudanca.caminho.length && mae.caminho.every((titulo, i) => titulo === mudanca.caminho[i])));
}
