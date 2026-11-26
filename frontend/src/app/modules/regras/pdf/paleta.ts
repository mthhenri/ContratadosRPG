import type { BaseTema } from "../../../core/services/tema.service";

export type Rgb = readonly [number, number, number];

/** Papéis de cor do livro: o valor de cada um depende do tema de quem exporta. */
export type Token =
    | "fundo" | "superficie" | "zebra" | "texto" | "secundario" | "borda" | "destaque" | "vida"
    | "energia" | "aviso" | "ameacaFundo" | "sobreEscuro";

/** O que o gerador pede ao pincel: um papel do tema ou uma cor fixa (níveis de ameaça). */
export type Cor = Token | Rgb;

export const PALETA_PDF = {
    fundo: "fundo",
    superficie: "superficie",
    zebra: "zebra",
    texto: "texto",
    secundario: "secundario",
    borda: "borda",
    destaque: "destaque",
    vida: "vida",
    energia: "energia",
    aviso: "aviso",
    ameacaFundo: "ameacaFundo",
    sobreEscuro: "sobreEscuro",
} as const satisfies { readonly [T in Token]: T };

export type Tema = Readonly<Record<Token, Rgb>>;

/*
 * Única fonte de cor do gerador (o jsPDF não lê variável CSS). A base clara é o papel; a escura
 * repete os tokens de `styles/tema/_tokens.scss`. O destaque vem de fora: é a cor que a pessoa usa
 * no site.
 */
const BASES: Readonly<Record<BaseTema, Omit<Tema, "destaque">>> = {
    claro: {
        fundo: [255, 255, 255], // --papel-fundo
        superficie: [238, 240, 243], // --papel-superficie
        zebra: [246, 247, 249], // metade de --papel-superficie sobre o fundo
        texto: [18, 21, 26], // --papel-texto
        secundario: [74, 79, 87], // --papel-texto-secundario
        borda: [214, 214, 214], // --papel-borda sobre branco
        vida: [213, 48, 48], // --vida
        energia: [47, 108, 170], // --energy escurecido para texto no papel
        aviso: [150, 108, 28], // --warning escurecido para texto no papel
        ameacaFundo: [19, 22, 27], // --ameaca-fundo-escuro
        sobreEscuro: [255, 255, 255],
    },
    escuro: {
        fundo: [10, 12, 15], // --bg
        superficie: [26, 30, 36], // --surface-2
        zebra: [19, 22, 27], // --surface
        texto: [230, 232, 235], // --text
        secundario: [150, 155, 163], // --text-dim
        borda: [44, 46, 49], // --border-strong sobre --bg
        vida: [213, 48, 48], // --vida
        energia: [76, 141, 208], // --energy
        aviso: [217, 164, 65], // --warning
        ameacaFundo: [42, 47, 56], // faixa um tom acima das caixas, para o cabeçalho aparecer
        sobreEscuro: [255, 255, 255],
    },
};

/** Logo de `public/` que aparece sobre o fundo de cada base. */
export const LOGO_DO_PDF: Readonly<Record<BaseTema, string>> = {
    claro: "logo-black.png",
    escuro: "logo-white.png",
};

function rgbDeHex(hex: string): Rgb {
    const valor = Number.parseInt(hex.replace("#", ""), 16);
    return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255];
}

/** O vermelho da identidade, o preset padrão do `TemaService`. */
const DESTAQUE_PADRAO = "#d53030";

/** `destaque` em `#rrggbb`: o `accentAplicado` do `TemaService`, já legível na base. */
export function temaDoPdf(base: BaseTema = "claro", destaque = DESTAQUE_PADRAO): Tema {
    return { ...BASES[base], destaque: rgbDeHex(destaque) };
}

export function rgbDe(cor: Cor, tema: Tema): Rgb {
    return typeof cor === "string" ? tema[cor] : cor;
}

/** Cores dos níveis de ameaça (`--ameaca-*`), na ordem de `NIVEIS_AMEACA`. */
export const CORES_AMEACA: Readonly<Record<string, Rgb>> = {
    desconhecida: [0, 255, 252],
    nula: [127, 255, 142],
    baixa: [253, 255, 127],
    media: [255, 199, 127],
    alta: [255, 127, 127],
    extrema: [178, 120, 255], // --ameaca-extrema clareado para ler sobre o fundo escuro
    catastrofica: [255, 255, 255], // --ameaca-catastrofica é preto: no selo escuro vira branco
    apocaliptica: [255, 255, 255],
};
