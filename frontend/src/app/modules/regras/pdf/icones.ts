/**
 * Ícones do site desenhados como vetor no PDF. A geometria continua só no componente `Icone`: quem
 * gera o livro entrega o `<svg>` já renderizado e aqui ele vira retas e curvas em uma grade de 24.
 */
import type { IconeNome } from "../../../shared/icone/icone.component";
import { ICONE_ARQUETIPO, ICONE_CLASSE } from "../../../shared/icone/icones-dominio";
import type { Cor } from "./paleta";
import type { Pincel } from "./pincel";

export type Comando =
    | readonly ["M", number, number]
    | readonly ["L", number, number]
    | readonly ["C", number, number, number, number, number, number]
    | readonly ["Z"];

export interface Traco {
    readonly comandos: readonly Comando[];
    readonly cheio: boolean;
}

export interface DesenhoDeIcone {
    readonly preenchido: boolean;
    readonly tracos: readonly Traco[];
}

/** O que se lê de um elemento SVG (o `Element` do navegador atende). */
export interface ElementoSvg {
    readonly tagName: string;
    readonly children: ArrayLike<ElementoSvg>;
    getAttribute(nome: string): string | null;
}

export const ICONES_DO_PDF: readonly IconeNome[] = [
    ...new Set([...Object.values(ICONE_CLASSE), ...Object.values(ICONE_ARQUETIPO)]),
    "npc", "vida", "energia", "defesa",
];

const LADO_DA_GRADE = 24;
const ESPESSURA = 1.75;
/** Distância do controle que faz uma cúbica imitar um quarto de círculo. */
const QUARTO = 0.5522847498;

type Ponto = readonly [number, number];
/** Matriz afim `[a b c d e f]`, como a do SVG. */
type Matriz = readonly [number, number, number, number, number, number];

const IDENTIDADE: Matriz = [1, 0, 0, 1, 0, 0];

function multiplicar(m: Matriz, n: Matriz): Matriz {
    return [
        m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
        m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
        m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
    ];
}

function matrizDe(transformacao: string): Matriz {
    let matriz = IDENTIDADE;
    for (const [, nome, argumentos] of transformacao.matchAll(/(\w+)\(([^)]*)\)/g)) {
        const [a, b, c] = argumentos.trim().split(/[\s,]+/).map(Number);
        if (nome === "translate") {
            matriz = multiplicar(matriz, [1, 0, 0, 1, a, b ?? 0]);
        } else if (nome === "scale") {
            matriz = multiplicar(matriz, [a, 0, 0, b ?? a, 0, 0]);
        } else if (nome === "rotate") {
            const radianos = (a * Math.PI) / 180;
            const cos = Math.cos(radianos);
            const sen = Math.sin(radianos);
            const cx = b ?? 0;
            const cy = c ?? 0;
            matriz = multiplicar(matriz,
                [cos, sen, -sen, cos, cx - cos * cx + sen * cy, cy - sen * cx - cos * cy]);
        } else {
            throw new Error(`Transformação de ícone desconhecida: ${nome}`);
        }
    }
    return matriz;
}

function transformar(matriz: Matriz, comandos: readonly Comando[]): Comando[] {
    return comandos.map((comando) => {
        const [letra, ...numeros] = comando;
        const saida: number[] = [];
        for (let indice = 0; indice < numeros.length; indice += 2) {
            const x = numeros[indice] as number;
            const y = numeros[indice + 1] as number;
            saida.push(
                matriz[0] * x + matriz[2] * y + matriz[4],
                matriz[1] * x + matriz[3] * y + matriz[5]);
        }
        return [letra, ...saida] as unknown as Comando;
    });
}

/** Arco elíptico do SVG (ponta a ponta) em cúbicas de no máximo um quarto de volta. */
function arco(
    [x1, y1]: Ponto, raioX: number, raioY: number, giro: number, grande: boolean, horario: boolean,
    [x2, y2]: Ponto,
): Comando[] {
    if (!raioX || !raioY) return [["L", x2, y2]];
    const phi = (giro * Math.PI) / 180;
    const cos = Math.cos(phi);
    const sen = Math.sin(phi);
    const mx = (x1 - x2) / 2;
    const my = (y1 - y2) / 2;
    const px = cos * mx + sen * my;
    const py = -sen * mx + cos * my;
    let rx = Math.abs(raioX);
    let ry = Math.abs(raioY);
    const excesso = (px * px) / (rx * rx) + (py * py) / (ry * ry);
    if (excesso > 1) {
        rx *= Math.sqrt(excesso);
        ry *= Math.sqrt(excesso);
    }
    const numerador = rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px;
    const raiz = Math.sqrt(Math.max(0, numerador / (rx * rx * py * py + ry * ry * px * px)));
    const sinal = grande === horario ? -raiz : raiz;
    const cxLocal = (sinal * rx * py) / ry;
    const cyLocal = (-sinal * ry * px) / rx;
    const cx = cos * cxLocal - sen * cyLocal + (x1 + x2) / 2;
    const cy = sen * cxLocal + cos * cyLocal + (y1 + y2) / 2;
    const angulo = (x: number, y: number) => Math.atan2((y - cyLocal) / ry, (x - cxLocal) / rx);
    const inicio = angulo(px, py);
    let volta = angulo(-px, -py) - inicio;
    if (horario && volta < 0) volta += 2 * Math.PI;
    if (!horario && volta > 0) volta -= 2 * Math.PI;

    const partes = Math.max(1, Math.ceil(Math.abs(volta) / (Math.PI / 2) - 1e-6));
    const passo = volta / partes;
    const alfa = (4 / 3) * Math.tan(passo / 4);
    const naElipse = (t: number): Ponto =>
        [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sen,
            cy + rx * Math.cos(t) * sen + ry * Math.sin(t) * cos];
    const tangente = (t: number): Ponto =>
        [
            -rx * Math.sin(t) * cos - ry * Math.cos(t) * sen,
            -rx * Math.sin(t) * sen + ry * Math.cos(t) * cos,
        ];
    return Array.from({ length: partes }, (_, indice): Comando => {
        const t1 = inicio + passo * indice;
        const t2 = t1 + passo;
        const [ax, ay] = naElipse(t1);
        const [bx, by] = indice === partes - 1 ? [x2, y2] : naElipse(t2);
        const [dax, day] = tangente(t1);
        const [dbx, dby] = tangente(t2);
        return ["C", ax + alfa * dax, ay + alfa * day, bx - alfa * dbx, by - alfa * dby, bx, by];
    });
}

/** `d` de um `<path>` com os comandos M, L, H, V, C, S, A e Z, absolutos ou relativos. */
export function comandosDoCaminho(d: string): Comando[] {
    const saida: Comando[] = [];
    let posicao = 0;
    let atual: Ponto = [0, 0];
    let comeco: Ponto = [0, 0];
    let controle: Ponto | null = null;
    let letra = "";

    const pular = (): void => {
        while (/[\s,]/.test(d[posicao] ?? "")) posicao++;
    };
    const numero = (): number => {
        pular();
        const achado = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(d.slice(posicao));
        if (!achado) throw new Error(`Caminho de ícone ilegível: ${d}`);
        posicao += achado[0].length;
        return Number(achado[0]);
    };
    /** As bandeiras do arco podem vir coladas ("0 013 3"). */
    const bandeira = (): boolean => {
        pular();
        return d[posicao++] === "1";
    };

    for (pular(); posicao < d.length; pular()) {
        if (/[a-z]/i.test(d[posicao])) letra = d[posicao++];
        const relativo = letra === letra.toLowerCase();
        const [baseX, baseY] = relativo ? atual : [0, 0];
        const ponto = (): Ponto => {
            const x = numero() + baseX;
            return [x, numero() + baseY];
        };
        let proximoControle: Ponto | null = null;
        switch (letra.toUpperCase()) {
            case "M":
                atual = comeco = ponto();
                saida.push(["M", ...atual]);
                // Pares que sobram depois do M são retas.
                letra = relativo ? "l" : "L";
                break;
            case "L":
                atual = ponto();
                saida.push(["L", ...atual]);
                break;
            case "H":
                atual = [numero() + baseX, atual[1]];
                saida.push(["L", ...atual]);
                break;
            case "V":
                atual = [atual[0], numero() + baseY];
                saida.push(["L", ...atual]);
                break;
            case "C":
            case "S": {
                const primeiro: Ponto = letra.toUpperCase() === "C" ? ponto()
                    : controle ? [2 * atual[0] - controle[0], 2 * atual[1] - controle[1]] : atual;
                const segundo = ponto();
                atual = ponto();
                saida.push(["C", ...primeiro, ...segundo, ...atual]);
                proximoControle = segundo;
                break;
            }
            case "A": {
                const [rx, ry, giro] = [numero(), numero(), numero()];
                const grande = bandeira();
                const horario = bandeira();
                const destino = ponto();
                saida.push(...arco(atual, rx, ry, giro, grande, horario, destino));
                atual = destino;
                break;
            }
            case "Z":
                saida.push(["Z"]);
                atual = comeco;
                break;
            default:
                throw new Error(`Comando de ícone desconhecido: ${letra}`);
        }
        controle = proximoControle;
    }
    return saida;
}

function elipse(cx: number, cy: number, rx: number, ry: number): Comando[] {
    const x = rx * QUARTO;
    const y = ry * QUARTO;
    return [
        ["M", cx + rx, cy],
        ["C", cx + rx, cy + y, cx + x, cy + ry, cx, cy + ry],
        ["C", cx - x, cy + ry, cx - rx, cy + y, cx - rx, cy],
        ["C", cx - rx, cy - y, cx - x, cy - ry, cx, cy - ry],
        ["C", cx + x, cy - ry, cx + rx, cy - y, cx + rx, cy],
        ["Z"],
    ];
}

function retangulo(x: number, y: number, largura: number, altura: number, raio: number): Comando[] {
    const r = Math.min(raio, largura / 2, altura / 2);
    if (!r) {
        return [["M", x, y], ["L", x + largura, y], ["L", x + largura, y + altura], ["L", x, y + altura], ["Z"]];
    }
    return comandosDoCaminho(`M${x + r} ${y}H${x + largura - r}A${r} ${r} 0 0 1 ${x + largura} ${y + r}`
        + `V${y + altura - r}A${r} ${r} 0 0 1 ${x + largura - r} ${y + altura}H${x + r}`
        + `A${r} ${r} 0 0 1 ${x} ${y + altura - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`);
}

export function desenhoDeIcone(raiz: ElementoSvg, preenchido: boolean): DesenhoDeIcone {
    const tracos: Traco[] = [];
    const visitar = (elemento: ElementoSvg, matriz: Matriz): void => {
        const valor = (nome: string) => Number(elemento.getAttribute(nome) ?? 0);
        const transformacao = elemento.getAttribute("transform");
        const propria = transformacao ? multiplicar(matriz, matrizDe(transformacao)) : matriz;
        let comandos: Comando[];
        switch (elemento.tagName.toLowerCase()) {
            case "svg":
            case "g":
                Array.from(elemento.children).forEach((filho) => visitar(filho, propria));
                return;
            case "path":
                comandos = comandosDoCaminho(elemento.getAttribute("d") ?? "");
                break;
            case "circle":
                comandos = elipse(valor("cx"), valor("cy"), valor("r"), valor("r"));
                break;
            case "rect":
                comandos = retangulo(valor("x"), valor("y"), valor("width"), valor("height"), valor("rx"));
                break;
            default:
                throw new Error(`Elemento de ícone desconhecido: ${elemento.tagName}`);
        }
        tracos.push({
            comandos: transformar(propria, comandos),
            cheio: preenchido || elemento.getAttribute("fill") === "currentColor",
        });
    };
    visitar(raiz, IDENTIDADE);
    return { preenchido, tracos };
}

/** Desenha o ícone num quadrado de `lado` milímetros com o canto em (`x`, `y`). */
export function desenharIcone(
    pincel: Pincel, icone: DesenhoDeIcone, x: number, y: number, lado: number, cor: Cor,
): void {
    const escala = lado / LADO_DA_GRADE;
    for (const traco of icone.tracos) {
        const comandos = transformar([escala, 0, 0, escala, x, y], traco.comandos);
        pincel.caminho(comandos, traco.cheio
            ? { preenchimento: cor } : { borda: cor, espessura: ESPESSURA * escala });
    }
}
