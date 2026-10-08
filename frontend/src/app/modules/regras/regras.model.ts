/** Formato canônico dos livros públicos, produzido no build a partir de docs/core/. */
export interface RegrasDocumento {
    readonly tipo: "documento";
    readonly id: "sistema" | "guia";
    readonly titulo: string;
    readonly versao: string;
    readonly filhos: readonly RegrasConteudo[];
}

export type RegrasConteudo = RegrasSecao | RegrasBloco;

export interface RegrasSecao {
    readonly tipo: "secao";
    readonly nivel: 1 | 2 | 3 | 4;
    readonly glifo: "⬢" | "⬡" | "⬥" | "⬦" | null;
    readonly titulo: string;
    readonly ancora: string;
    readonly filhos: readonly RegrasConteudo[];
}

export type RegrasTrecho =
    | { readonly tipo: "texto"; readonly texto: string }
    | { readonly tipo: "negrito" | "italico"; readonly filhos: readonly RegrasTrecho[] }
    | { readonly tipo: "tarja"; readonly comprimento: number }
    | { readonly tipo: "link-interno"; readonly ancora: string; readonly texto: string }
    | { readonly tipo: "link-externo"; readonly destino: string;
        readonly filhos: readonly RegrasTrecho[] };

export type RegrasBloco =
    | { readonly tipo: "paragrafo" | "exemplo"; readonly trechos: readonly RegrasTrecho[] }
    | { readonly tipo: "lista"; readonly ordenada: boolean; readonly inicio: number;
        readonly itens: readonly (readonly RegrasBloco[])[] }
    | { readonly tipo: "nota"; readonly trechos: readonly RegrasTrecho[] }
    | { readonly tipo: "tabela"; readonly cabecalho: readonly (readonly RegrasTrecho[])[];
        readonly linhas: readonly (readonly (readonly RegrasTrecho[])[])[] }
    | { readonly tipo: "habilidade"; readonly nome: string; readonly custo: number | "X";
        readonly reacao: boolean; readonly glifo: "⬦" | "◈" | "◻" | null;
        readonly trechos: readonly RegrasTrecho[] }
    | { readonly tipo: "generico"; readonly motivo: string;
        readonly trechos: readonly RegrasTrecho[]; readonly origemMarkdown: string };

/** Diagnóstico não fatal; linha é contada a partir de 1 no arquivo de origem. */
export interface RegrasAviso {
    readonly documento: RegrasDocumento["id"];
    readonly linha: number;
    readonly motivo: string;
}
