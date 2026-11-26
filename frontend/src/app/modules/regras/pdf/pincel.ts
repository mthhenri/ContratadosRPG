import type { Comando } from "./icones";
import type { Cor } from "./paleta";

export interface EstiloTexto {
    /** `backrooms` só tem A–Z e pontuação básica: é usada no nome da capa. */
    readonly familia: "sans" | "mono" | "backrooms";
    readonly negrito?: boolean;
    readonly italico?: boolean;
    /** Em pontos. */
    readonly tamanho: number;
    readonly cor: Cor;
    /** Espaço extra entre letras, em milímetros. */
    readonly espacamento?: number;
}

export interface Contorno {
    readonly preenchimento?: Cor;
    readonly borda?: Cor;
    readonly espessura?: number;
    readonly raio?: number;
}

/**
 * Tudo o que o gerador desenha passa por aqui (medidas em milímetros). A implementação real usa o
 * jsPDF; os testes usam uma falsa que só anota.
 */
export interface Pincel {
    medir(texto: string, estilo: EstiloTexto): number;
    texto(texto: string, x: number, linhaDeBase: number, estilo: EstiloTexto): void;
    retangulo(x: number, y: number, largura: number, altura: number, contorno: Contorno): void;
    linha(x1: number, y1: number, x2: number, y2: number, cor: Cor, espessura: number,
        pontilhada?: boolean): void;
    poligono(pontos: readonly (readonly [number, number])[], contorno: Contorno): void;
    circulo(x: number, y: number, raio: number, contorno: Contorno): void;
    /** Retas e curvas em milímetros, com pontas e junções arredondadas (ícones). */
    caminho(comandos: readonly Comando[], contorno: Contorno): void;
    imagem(dados: string, x: number, y: number, largura: number, altura: number): void;
    /** Desenha inclinado em torno de um ponto; graus positivos giram no sentido anti-horário. */
    girado(graus: number, x: number, y: number, desenhar: () => void): void;
    linkPagina(x: number, y: number, largura: number, altura: number, pagina: number): void;
    linkExterno(x: number, y: number, largura: number, altura: number, destino: string): void;
    novaPagina(): void;
    /** Marcador no índice lateral do leitor de PDF; devolve o nó para aninhar filhos. */
    marcador(titulo: string, pagina: number, pai?: unknown): unknown;
}

export interface ContextoDeDesenho {
    readonly pincel: Pincel;
    /** Página (a partir de 1) em que a âncora ficou; `undefined` fora do que foi gerado. */
    paginaDaAncora(ancora: string): number | undefined;
}

/** Milímetros de um ponto tipográfico. */
export const MM_POR_PONTO = 0.352778;
