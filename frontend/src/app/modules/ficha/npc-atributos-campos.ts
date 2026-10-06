import type { FichaAtributosDto } from "@contratados-rpg/shared/dtos/ficha";

/** Agrupamento de apresentação compartilhado pelo assistente e pela ficha de NPC. */
export const GRUPOS_ATRIBUTOS: readonly {
    readonly nome: string;
    readonly campos: readonly { readonly chave: keyof FichaAtributosDto; readonly nome: string; readonly sigla: string }[];
}[] = [
    { nome: "Físicos", campos: [
        { chave: "destreza", sigla: "DES", nome: "Destreza" }, { chave: "forca", sigla: "FOR", nome: "Força" },
        { chave: "luta", sigla: "LUT", nome: "Luta" }, { chave: "pontaria", sigla: "PON", nome: "Pontaria" },
        { chave: "vigor", sigla: "VIG", nome: "Vigor" },
    ] },
    { nome: "Mentais", campos: [
        { chave: "intelecto", sigla: "INT", nome: "Intelecto" }, { chave: "medicina", sigla: "MED", nome: "Medicina" },
        { chave: "sentidos", sigla: "SEN", nome: "Sentidos" }, { chave: "social", sigla: "SOC", nome: "Social" },
        { chave: "vontade", sigla: "VON", nome: "Vontade" },
    ] },
];
