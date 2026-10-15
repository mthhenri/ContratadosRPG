/**
 * Texto rico de um livro de regras: sequência de trechos inline. Value-object sem entidade nem
 * verbo. É o mesmo formato que o leitor de Regras renderiza.
 *
 * O `link-interno` aponta para uma peça pelo `identificador` (estável: renomear a peça não quebra a
 * referência). A `ancora` é a do destino no instante da publicação e é preenchida ao montar a
 * fotografia; na cópia de trabalho vale o `identificador`, e a `ancora` guardada é só cache.
 */
export type LivroTrechoDto =
  | { readonly tipo: "texto"; readonly texto: string }
  | { readonly tipo: "negrito" | "italico" | "tachado"; readonly filhos: readonly LivroTrechoDto[] }
  | { readonly tipo: "tarja"; readonly comprimento: number }
  | {
      readonly tipo: "link-interno";
      readonly texto: string;
      readonly ancora: string;
      readonly identificador?: string;
    }
  | {
      readonly tipo: "nivel-ameaca";
      readonly nivel: number;
      readonly texto: string;
      /** Menção em prosa ("ameaças Nulas"): só colorida, sem o selo da sigla `NA`. */
      readonly compacto?: boolean;
    }
  | {
      readonly tipo: "link-externo";
      readonly destino: string;
      readonly filhos: readonly LivroTrechoDto[];
    };
