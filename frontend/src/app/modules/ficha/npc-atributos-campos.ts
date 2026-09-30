import type { FichaAtributosDto } from "@contratados-rpg/shared/dtos/ficha";

/** Agrupamento de apresentação compartilhado pelo assistente e pela ficha de NPC. */
export const GRUPOS_ATRIBUTOS: readonly {
    readonly nome: string;
    readonly campos: readonly { readonly chave: keyof FichaAtributosDto; readonly nome: string }[];
}[] = [
    { nome: "Físicos", campos: [
        { chave: "destreza", nome: "Destreza" }, { chave: "forca", nome: "Força" },
        { chave: "luta", nome: "Luta" }, { chave: "pontaria", nome: "Pontaria" },
        { chave: "vigor", nome: "Vigor" },
    ] },
    { nome: "Mentais", campos: [
        { chave: "intelecto", nome: "Intelecto" }, { chave: "medicina", nome: "Medicina" },
        { chave: "sentidos", nome: "Sentidos" }, { chave: "social", nome: "Social" },
        { chave: "vontade", nome: "Vontade" },
    ] },
];
