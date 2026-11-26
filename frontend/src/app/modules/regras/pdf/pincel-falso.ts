import { MM_POR_PONTO, type Contorno, type EstiloTexto, type Pincel } from "./pincel";

/** Pincel de teste: letra de largura fixa (meio corpo) e registro do que foi desenhado. */
export class PincelFalso implements Pincel {
    readonly textos: string[] = [];
    readonly posicoes: { texto: string; x: number; y: number; estilo: EstiloTexto }[] = [];
    readonly imagens: { y: number; largura: number; altura: number }[] = [];
    /** Cada bloco inclinado, com o que foi escrito dentro dele. */
    readonly giros: { graus: number; textos: string[] }[] = [];
    /** Só os retângulos preenchidos da primeira página (a capa). */
    readonly preenchidos: { y: number; largura: number }[] = [];
    readonly linksDePagina: number[] = [];
    readonly marcadores: { titulo: string; pagina: number }[] = [];
    readonly porPagina: string[][] = [[]];
    retangulos = 0;
    poligonos = 0;
    caminhos = 0;
    /** Páginas que começaram pelo fundo pintado. */
    readonly fundos: number[] = [];

    get paginas(): number {
        return this.porPagina.length;
    }

    medir(texto: string, estilo: EstiloTexto): number {
        return texto.length * estilo.tamanho * MM_POR_PONTO * 0.5;
    }

    texto(texto: string, x: number, y: number, estilo: EstiloTexto): void {
        this.posicoes.push({ texto, x, y, estilo });
        this.textos.push(texto);
        this.porPagina[this.porPagina.length - 1].push(texto);
    }

    retangulo(_x: number, y: number, largura: number, _altura: number, contorno?: Contorno): void {
        this.retangulos += 1;
        if (contorno?.preenchimento === "fundo" && !this.porPagina[this.porPagina.length - 1].length) {
            this.fundos.push(this.porPagina.length);
        } else if (contorno?.preenchimento && this.porPagina.length === 1) {
            this.preenchidos.push({ y, largura });
        }
    }
    linha(): void { /* só contorno */ }
    poligono(): void { this.poligonos += 1; }
    circulo(): void { this.poligonos += 1; }
    caminho(): void { this.caminhos += 1; }
    imagem(_dados: string, _x: number, y: number, largura: number, altura: number): void {
        this.imagens.push({ y, largura, altura });
    }
    girado(graus: number, _x: number, _y: number, desenhar: () => void): void {
        const antes = this.textos.length;
        desenhar();
        this.giros.push({ graus, textos: this.textos.slice(antes) });
    }
    linkPagina(_x: number, _y: number, _l: number, _a: number, pagina: number): void {
        this.linksDePagina.push(pagina);
    }
    linkExterno(): void { /* sem verificação */ }
    novaPagina(): void { this.porPagina.push([]); }
    marcador(titulo: string, pagina: number): unknown {
        this.marcadores.push({ titulo, pagina });
        return titulo;
    }
}
