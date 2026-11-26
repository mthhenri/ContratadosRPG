import type { Cor } from "./paleta";
import { MM_POR_PONTO, type Pincel } from "./pincel";

/** Símbolos do livro que o IBM Plex não tem: são desenhados como figura. */
export const GLIFOS_DESENHADOS = /([⬢⬡⬥⬦◈◻■□▢∅⇒])/;

export function larguraDoGlifo(tamanho: number): number {
    return tamanho * MM_POR_PONTO * 0.82;
}

/** Desenha o símbolo com o canto esquerdo em `x`, apoiado na linha de base. */
export function desenharGlifo(
    pincel: Pincel, glifo: string, x: number, linhaDeBase: number, tamanho: number, cor: Cor,
): void {
    const em = tamanho * MM_POR_PONTO;
    const raio = em * 0.3;
    const cx = x + larguraDoGlifo(tamanho) / 2;
    const cy = linhaDeBase - em * 0.34;
    const cheio = { preenchimento: cor };
    const vazio = { borda: cor, espessura: Math.max(0.12, em * 0.07) };
    const regular = (lados: number, giro: number, r: number): [number, number][] =>
        Array.from({ length: lados }, (_, indice) => {
            const angulo = giro + (indice * 2 * Math.PI) / lados;
            return [cx + r * Math.cos(angulo), cy + r * Math.sin(angulo)];
        });
    switch (glifo) {
        case "⬢": pincel.poligono(regular(6, -Math.PI / 2, raio * 1.15), cheio); break;
        case "⬡": pincel.poligono(regular(6, -Math.PI / 2, raio * 1.1), vazio); break;
        case "⬥": pincel.poligono(regular(4, -Math.PI / 2, raio * 1.15), cheio); break;
        case "⬦": pincel.poligono(regular(4, -Math.PI / 2, raio * 1.1), vazio); break;
        case "◈":
            pincel.poligono(regular(4, -Math.PI / 2, raio * 1.15), vazio);
            pincel.poligono(regular(4, -Math.PI / 2, raio * 0.5), cheio);
            break;
        case "■": pincel.poligono(regular(4, Math.PI / 4, raio * 1.2), cheio); break;
        case "□":
        case "◻":
        case "▢": pincel.poligono(regular(4, Math.PI / 4, raio * 1.15), vazio); break;
        case "∅":
            pincel.circulo(cx, cy, raio, vazio);
            pincel.linha(cx - raio, cy + raio, cx + raio, cy - raio, cor, vazio.espessura);
            break;
        case "⇒":
            pincel.linha(cx - raio, cy, cx + raio, cy, cor, vazio.espessura);
            pincel.poligono(
                [
                    [cx + raio, cy], [cx + raio * 0.2, cy - raio * 0.6],
                    [cx + raio * 0.2, cy + raio * 0.6],
                ],
                cheio);
            break;
    }
}
