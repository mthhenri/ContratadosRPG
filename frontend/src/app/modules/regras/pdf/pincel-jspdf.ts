import { jsPDF } from "jspdf";
import { type Cor, type Tema, rgbDe, temaDoPdf } from "./paleta";
import type { Contorno, EstiloTexto, Pincel } from "./pincel";

/** TTF de `public/fonts/pdf/`, por família e estilo do jsPDF. O mono não tem itálico. */
export const ARQUIVOS_DE_FONTE = {
    "plex-sans": {
        normal: "IBMPlexSans-Regular.ttf",
        bold: "IBMPlexSans-SemiBold.ttf",
        italic: "IBMPlexSans-Italic.ttf",
        bolditalic: "IBMPlexSans-SemiBoldItalic.ttf",
    },
    "plex-mono": {
        normal: "IBMPlexMono-Regular.ttf",
        bold: "IBMPlexMono-SemiBold.ttf",
        italic: "IBMPlexMono-Regular.ttf",
        bolditalic: "IBMPlexMono-SemiBold.ttf",
    },
    "backrooms": {
        normal: "BackroomsEndCredits-Regular.ttf",
        bold: "BackroomsEndCredits-Regular.ttf",
        italic: "BackroomsEndCredits-Regular.ttf",
        bolditalic: "BackroomsEndCredits-Regular.ttf",
    },
} as const;

const FAMILIAS = { sans: "plex-sans", mono: "plex-mono", backrooms: "backrooms" } as const;

interface Marcadores {
    add(pai: unknown, titulo: string, opcoes: { pageNumber: number }): unknown;
}

/** Pincel real. `fontes` traz o base64 de cada arquivo de `ARQUIVOS_DE_FONTE`. */
export function criarPincelJsPdf(
    fontes: Readonly<Record<string, string>>, tema: Tema = temaDoPdf(),
): { readonly pincel: Pincel; readonly documento: jsPDF } {
    const documento = new jsPDF({ unit: "mm", format: "a4", compress: true });
    for (const [familia, estilos] of Object.entries(ARQUIVOS_DE_FONTE)) {
        for (const [estilo, arquivo] of Object.entries(estilos)) {
            if (!documento.existsFileInVFS(arquivo)) documento.addFileToVFS(
                arquivo, fontes[arquivo]);
            documento.addFont(arquivo, familia, estilo);
        }
    }

    const rgb = (cor: Cor) => rgbDe(cor, tema) as [number, number, number];
    const preparar = (estilo: EstiloTexto): void => {
        const variante = estilo.negrito
            ? (estilo.italico ? "bolditalic" : "bold") : (estilo.italico ? "italic" : "normal");
        documento.setFont(FAMILIAS[estilo.familia], variante);
        documento.setFontSize(estilo.tamanho);
    };
    const pintar = (contorno: Contorno): "F" | "S" | "FD" => {
        if (contorno.preenchimento) documento.setFillColor(...rgb(contorno.preenchimento));
        if (contorno.borda) {
            documento.setDrawColor(...rgb(contorno.borda));
            documento.setLineWidth(contorno.espessura ?? 0.2);
        }
        return contorno.preenchimento ? (contorno.borda ? "FD" : "F") : "S";
    };

    const pincel: Pincel = {
        medir: (texto, estilo) => {
            preparar(estilo);
            return documento.getTextWidth(texto);
        },
        texto: (texto, x, linhaDeBase, estilo) => {
            preparar(estilo);
            documento.setTextColor(...rgb(estilo.cor));
            documento.text(texto, x, linhaDeBase, { charSpace: estilo.espacamento ?? 0 });
        },
        retangulo: (x, y, largura, altura, contorno) => {
            const modo = pintar(contorno);
            if (contorno.raio) {
                documento.roundedRect(x, y, largura, altura, contorno.raio, contorno.raio, modo);
            } else {
                documento.rect(x, y, largura, altura, modo);
            }
        },
        linha: (x1, y1, x2, y2, cor: Cor, espessura, pontilhada) => {
            documento.setDrawColor(...rgb(cor));
            documento.setLineWidth(espessura);
            if (pontilhada) documento.setLineDashPattern([0.3, 1.1], 0);
            documento.line(x1, y1, x2, y2);
            if (pontilhada) documento.setLineDashPattern([], 0);
        },
        poligono: (pontos, contorno) => {
            const modo = pintar(contorno);
            const passos = pontos.slice(1).map(
                ([x, y], indice) => [x - pontos[indice][0], y - pontos[indice][1]]);
            documento.lines(passos, pontos[0][0], pontos[0][1], [1, 1], modo, true);
        },
        circulo: (x, y, raio, contorno) => {
            documento.circle(x, y, raio, pintar(contorno));
        },
        caminho: (comandos, contorno) => {
            const modo = pintar(contorno);
            documento.setLineCap("round");
            documento.setLineJoin("round");
            for (const comando of comandos) {
                if (comando[0] === "M") documento.moveTo(comando[1], comando[2]);
                else if (comando[0] === "L") documento.lineTo(comando[1], comando[2]);
                else if (comando[0] === "C") {
                    documento.curveTo(
                        comando[1], comando[2], comando[3], comando[4], comando[5], comando[6]);
                } else documento.close();
            }
            if (modo === "F") documento.fill();
            else documento.stroke();
            documento.setLineCap("butt");
            documento.setLineJoin("miter");
        },
        imagem: (dados, x, y, largura, altura) => {
            documento.addImage(dados, "PNG", x, y, largura, altura, undefined, "FAST");
        },
        girado: (graus, x, y, desenhar) => {
            // Matriz em coordenadas do PDF (pontos, origem embaixo), com o centro parado.
            const escala = documento.internal.scaleFactor;
            const centroX = x * escala;
            const centroY = (documento.internal.pageSize.getHeight() - y) * escala;
            const cos = Math.cos((graus * Math.PI) / 180);
            const sen = Math.sin((graus * Math.PI) / 180);
            const matriz = [cos, sen, -sen, cos,
                centroX - cos * centroX + sen * centroY, centroY - sen * centroX - cos * centroY];
            documento.saveGraphicsState();
            (documento.internal as unknown as { write(comando: string): void })
                .write(`${matriz.map((valor) => valor.toFixed(6)).join(" ")} cm`);
            desenhar();
            documento.restoreGraphicsState();
        },
        linkPagina: (x, y, largura, altura, pagina) => {
            documento.link(x, y, largura, altura, { pageNumber: pagina });
        },
        linkExterno: (x, y, largura, altura, destino) => {
            documento.link(x, y, largura, altura, { url: destino });
        },
        novaPagina: () => {
            documento.addPage();
        },
        marcador: (titulo, pagina, pai) => (documento as unknown as { outline: Marcadores })
            .outline.add(pai ?? null, titulo, { pageNumber: pagina }),
    };
    return { pincel, documento };
}
