import type { Trechos } from "@contratados-rpg/shared/livro";
import { descreverCondicao, separarCondicoesTexto } from "../../../shared/condicoes/condicoes";
import { GLIFOS_DESENHADOS, desenharGlifo, larguraDoGlifo } from "./glifos";
import type { Peca } from "./paginacao";
import { CORES_AMEACA, PALETA_PDF } from "./paleta";
import { MM_POR_PONTO, type ContextoDeDesenho, type EstiloTexto, type Pincel } from "./pincel";

/** Pedaço de texto com um estilo só. */
export interface Corrida {
    readonly texto: string;
    readonly estilo: EstiloTexto;
    /** Largura da tarja de censura, em caracteres. */
    readonly tarja?: number;
    readonly sublinhado?: boolean;
    readonly tachado?: boolean;
    /** Selo de fundo escuro (nível de ameaça): não quebra. */
    readonly selo?: boolean;
    /** Fundo escuro atrás do próprio texto, que quebra como o resto. */
    readonly realcado?: boolean;
    readonly ancora?: string;
    readonly destino?: string;
}

export interface Segmento {
    readonly corrida: Corrida;
    readonly texto: string;
    readonly x: number;
    readonly largura: number;
}

export interface Linha {
    readonly segmentos: readonly Segmento[];
    readonly largura: number;
    /** Maior corpo da linha, em pontos. */
    readonly tamanho: number;
    /** O texto segue na linha de baixo porque esta encheu (só essa se justifica). */
    readonly continua?: boolean;
}

export const ENTRELINHA = 1.32;
const MARGEM_DO_SELO = 0.8;
/** Quanto, em milímetros, um espaço pode crescer ao justificar; acima disso a linha fica solta. */
const VAO_MAXIMO = 2.4;
/** Na ordem de `NIVEIS_AMEACA` do leitor. */
export const NOMES_DE_AMEACA = Object.keys(CORES_AMEACA);

export function trechosEmCorridas(
    trechos: Trechos, base: EstiloTexto, opcoes: { readonly semCorRecurso?: boolean } = {},
): Corrida[] {
    return trechos.flatMap((trecho): Corrida[] => {
        switch (trecho.tipo) {
            case "texto":
                return separarCondicoesTexto(trecho.texto).flatMap((parte): Corrida[] => {
                    if (descreverCondicao(parte)) {
                        return [{ texto: parte, estilo: base, sublinhado: true }];
                    }
                    if (opcoes.semCorRecurso) return [{ texto: parte, estilo: base }];
                    return parte.split(/\b(Vida|Energia)\b/).filter(Boolean).map((pedaco) => ({
                        texto: pedaco,
                        estilo: pedaco === "Vida" ? { ...base, cor: PALETA_PDF.vida }
                            : pedaco === "Energia" ? { ...base, cor: PALETA_PDF.energia } : base,
                    }));
                });
            case "negrito":
                return trechosEmCorridas(
                    trecho.filhos, { ...base, negrito: true, cor: PALETA_PDF.texto }, opcoes);
            case "italico":
                return trechosEmCorridas(trecho.filhos, { ...base, italico: true }, opcoes);
            case "tachado":
                return trechosEmCorridas(trecho.filhos, base, opcoes)
                    .map((corrida) => ({ ...corrida, tachado: true }));
            case "tarja":
                return [{ texto: "", estilo: base, tarja: Math.max(1, Math.min(120, trecho.comprimento)) }];
            case "link-interno":
                return [
                    { texto: trecho.texto, estilo: base, sublinhado: true, ancora: trecho.ancora },
                ];
            case "link-externo":
                return trechosEmCorridas(trecho.filhos, base, opcoes)
                    .map((corrida) => ({ ...corrida, sublinhado: true, destino: trecho.destino }));
            case "nivel-ameaca": {
                const cor = CORES_AMEACA[NOMES_DE_AMEACA[trecho.nivel] ?? "desconhecida"];
                if (trecho.compacto) {
                    return [{ texto: trecho.texto, realcado: true, estilo: { ...base, cor } }];
                }
                return [{
                    texto: trecho.texto,
                    selo: true,
                    estilo: {
                        ...base, familia: "mono", negrito: true, tamanho: base.tamanho * 0.86,
                        cor,
                    },
                }];
            }
        }
    });
}

/** Largura do texto já contando os símbolos desenhados como figura. */
export function medirTexto(pincel: Pincel, texto: string, estilo: EstiloTexto): number {
    return texto.split(GLIFOS_DESENHADOS).filter(Boolean).reduce((soma, parte) => soma
        + (GLIFOS_DESENHADOS.test(parte) ? larguraDoGlifo(estilo.tamanho)
            : pincel.medir(parte, estilo) + (estilo.espacamento ?? 0) * parte.length), 0);
}

interface Pedaco {
    readonly corrida: Corrida;
    readonly texto: string;
    readonly largura: number;
}

type Item =
    | { readonly tipo: "palavra"; readonly pedacos: Pedaco[] }
    | { readonly tipo: "espaco"; readonly pedacos: Pedaco[] }
    | { readonly tipo: "quebra" };

function itensDe(pincel: Pincel, corridas: readonly Corrida[]): Item[] {
    const itens: Item[] = [];
    const juntar = (tipo: "palavra" | "espaco", pedaco: Pedaco): void => {
        const ultimo = itens[itens.length - 1];
        // Palavra partida entre estilos ("**Contratados**!") continua uma palavra só.
        if (ultimo && ultimo.tipo === tipo) ultimo.pedacos.push(pedaco);
        else itens.push({ tipo, pedacos: [pedaco] });
    };
    for (const corrida of corridas) {
        if (corrida.tarja) {
            const largura = pincel.medir("0", corrida.estilo) * corrida.tarja;
            juntar("palavra", { corrida, texto: "", largura });
            continue;
        }
        if (corrida.selo) {
            const largura = medirTexto(pincel, corrida.texto, corrida.estilo) + MARGEM_DO_SELO * 2;
            juntar("palavra", { corrida, texto: corrida.texto, largura });
            continue;
        }
        for (const parte of corrida.texto.split(/(\n| +)/)) {
            if (!parte) continue;
            if (parte === "\n") {
                itens.push({ tipo: "quebra" });
                continue;
            }
            juntar(parte.startsWith(" ") ? "espaco" : "palavra",
                { corrida, texto: parte, largura: medirTexto(pincel, parte, corrida.estilo) });
        }
    }
    return itens;
}

export function quebrarLinhas(
    pincel: Pincel, corridas: readonly Corrida[], largura: number,
): Linha[] {
    const linhas: Linha[] = [];
    let segmentos: Segmento[] = [];
    let ocupado = 0;
    let pendentes: Pedaco[] = [];
    const tamanhoBase = corridas[0]?.estilo.tamanho ?? 10;

    const fechar = (continua = false): void => {
        const tamanho = segmentos.length
            ? Math.max(...segmentos.map((segmento) => segmento.corrida.estilo.tamanho))
            : tamanhoBase;
        linhas.push({ segmentos, largura: ocupado, tamanho, continua });
        segmentos = [];
        ocupado = 0;
        pendentes = [];
    };
    const anexar = (pedaco: Pedaco): void => {
        const ultimo = segmentos[segmentos.length - 1];
        if (ultimo && ultimo.corrida === pedaco.corrida
            && !pedaco.corrida.selo && !pedaco.corrida.tarja) {
            segmentos[segmentos.length - 1] = {
                ...ultimo, texto: ultimo.texto + pedaco.texto,
                largura: ultimo.largura + pedaco.largura,
            };
        } else {
            segmentos.push({ ...pedaco, x: ocupado });
        }
        ocupado += pedaco.largura;
    };

    for (const item of itensDe(pincel, corridas)) {
        if (item.tipo === "quebra") {
            fechar();
            continue;
        }
        if (item.tipo === "espaco") {
            if (segmentos.length) pendentes = item.pedacos;
            continue;
        }
        const espaco = pendentes.reduce((soma, pedaco) => soma + pedaco.largura, 0);
        const palavra = item.pedacos.reduce((soma, pedaco) => soma + pedaco.largura, 0);
        if (segmentos.length && ocupado + espaco + palavra > largura + 0.01) fechar(true);
        pendentes.forEach(anexar);
        pendentes = [];
        if (palavra <= largura + 0.01) {
            item.pedacos.forEach(anexar);
            continue;
        }
        // Palavra maior que a linha: parte por caractere.
        for (const pedaco of item.pedacos) {
            if (pedaco.corrida.tarja || pedaco.corrida.selo) {
                anexar(pedaco);
                continue;
            }
            for (const letra of pedaco.texto) {
                const larguraDaLetra = medirTexto(pincel, letra, pedaco.corrida.estilo);
                if (segmentos.length && ocupado + larguraDaLetra > largura + 0.01) fechar(true);
                anexar({ corrida: pedaco.corrida, texto: letra, largura: larguraDaLetra });
            }
        }
    }
    if (segmentos.length) fechar();
    while (linhas.length && !linhas[linhas.length - 1].segmentos.length) linhas.pop();
    return linhas;
}

/**
 * Como `quebrarLinhas`, mas reparte cada frase (o que está entre quebras do texto) em linhas de
 * comprimento parecido, sem palavra sozinha na última.
 */
export function quebrarEquilibrado(
    pincel: Pincel, corridas: readonly Corrida[], largura: number,
): Linha[] {
    const frases: Corrida[][] = [[]];
    for (const corrida of corridas) {
        corrida.texto.split("\n").forEach((texto, indice) => {
            if (indice) frases.push([]);
            if (texto || corrida.tarja) {
                frases[frases.length - 1].push(
                    texto === corrida.texto ? corrida : { ...corrida, texto });
            }
        });
    }
    const vazia: Linha = { segmentos: [], largura: 0, tamanho: corridas[0]?.estilo.tamanho ?? 10 };
    const linhas = frases.flatMap((frase) => {
        let melhor = quebrarLinhas(pincel, frase, largura);
        if (!melhor.length) return [vazia];
        if (melhor.length === 1) return melhor;
        let minima = largura / melhor.length / 2;
        let maxima = largura;
        while (maxima - minima > 0.5) {
            const meio = (minima + maxima) / 2;
            const tentativa = quebrarLinhas(pincel, frase, meio);
            if (tentativa.length > melhor.length) {
                minima = meio;
            } else {
                melhor = tentativa;
                maxima = meio;
            }
        }
        return melhor;
    });
    while (linhas.length && !linhas[linhas.length - 1].segmentos.length) linhas.pop();
    return linhas;
}

export function alturaDaLinha(tamanho: number, entrelinha = ENTRELINHA): number {
    return tamanho * MM_POR_PONTO * entrelinha;
}

function espacosDe({ corrida, texto }: Segmento): number {
    return corrida.selo || corrida.tarja ? 0 : texto.split(" ").length - 1;
}

/** Quanto cada espaço da linha cresce para ela chegar a `largura`. */
function vaoDaJustificacao(linha: Linha, largura: number): number {
    const espacos = linha.segmentos.reduce((soma, segmento) => soma + espacosDe(segmento), 0);
    if (!linha.continua || !espacos) return 0;
    const vao = (largura - linha.largura) / espacos;
    return vao > 0 && vao <= VAO_MAXIMO ? vao : 0;
}

export function desenharLinha(
    contexto: ContextoDeDesenho, linha: Linha, x: number, linhaDeBase: number, vao = 0,
): void {
    const { pincel } = contexto;
    let deslocado = 0;
    for (const segmento of linha.segmentos) {
        const { corrida } = segmento;
        const { estilo } = corrida;
        const em = estilo.tamanho * MM_POR_PONTO;
        const inicio = x + segmento.x + deslocado;
        const crescimento = vao * espacosDe(segmento);
        const largura = segmento.largura + crescimento;
        deslocado += crescimento;
        const topo = linhaDeBase - em * 0.82;
        if (corrida.tarja) {
            pincel.retangulo(inicio, topo, largura, em, { preenchimento: PALETA_PDF.texto });
            continue;
        }
        if (corrida.selo) {
            pincel.retangulo(inicio, topo - 0.2, largura, em + 0.5,
                { preenchimento: PALETA_PDF.ameacaFundo, raio: 0.6 });
            pincel.texto(segmento.texto, inicio + MARGEM_DO_SELO, linhaDeBase, estilo);
            continue;
        }
        if (corrida.realcado) {
            pincel.retangulo(inicio - 0.3, topo - 0.2, largura + 0.6, em + 0.5,
                { preenchimento: PALETA_PDF.ameacaFundo, raio: 0.6 });
        }
        let posicao = inicio;
        // Justificada, a linha é escrita palavra a palavra para o vão entrar entre elas.
        const partes = segmento.texto.split(GLIFOS_DESENHADOS)
            .flatMap((parte) => vao ? parte.split(/(?<= )/) : [parte]);
        for (const parte of partes) {
            if (!parte) continue;
            if (GLIFOS_DESENHADOS.test(parte)) {
                desenharGlifo(pincel, parte, posicao, linhaDeBase, estilo.tamanho, estilo.cor);
                posicao += larguraDoGlifo(estilo.tamanho);
            } else {
                pincel.texto(parte, posicao, linhaDeBase, estilo);
                posicao += medirTexto(pincel, parte, estilo);
            }
            if (vao && parte.endsWith(" ")) posicao += vao;
        }
        if (corrida.sublinhado) {
            pincel.linha(inicio, linhaDeBase + em * 0.14, inicio + largura, linhaDeBase + em * 0.14,
                PALETA_PDF.secundario, 0.1);
        }
        if (corrida.tachado) {
            pincel.linha(inicio, linhaDeBase - em * 0.28, inicio + largura, linhaDeBase - em * 0.28,
                estilo.cor, 0.15);
        }
        const pagina = corrida.ancora ? contexto.paginaDaAncora(corrida.ancora) : undefined;
        if (pagina) pincel.linkPagina(inicio, topo, largura, em, pagina);
        if (corrida.destino) pincel.linkExterno(inicio, topo, largura, em, corrida.destino);
    }
}

export interface OpcoesDeBloco {
    readonly entrelinha?: number;
    readonly recuo?: number;
    readonly espacoAntes?: number;
    readonly justificar?: boolean;
}

/**
 * Uma peça por linha. O que está entre duas quebras do próprio texto não se parte entre colunas,
 * e o texto que termina em dois-pontos vai junto com o que ele anuncia.
 */
export function pecasDeTexto(
    pincel: Pincel, corridas: readonly Corrida[], largura: number, opcoes: OpcoesDeBloco = {},
): Peca<ContextoDeDesenho>[] {
    const recuo = opcoes.recuo ?? 0;
    const linhas = quebrarLinhas(pincel, corridas, largura - recuo);
    const anuncia = corridas.map((corrida) => corrida.texto).join("").trimEnd().endsWith(":");
    return linhas.map((linha, indice) => {
        const altura = alturaDaLinha(linha.tamanho, opcoes.entrelinha);
        return {
            altura,
            espacoAntes: indice === 0 ? opcoes.espacoAntes : 0,
            prenderProxima: !!linha.continua || (anuncia && indice === linhas.length - 1),
            desenhar: (contexto, x, y) => desenharLinha(
                contexto, linha, x + recuo, y + altura * 0.76,
                opcoes.justificar ? vaoDaJustificacao(linha, largura - recuo) : 0),
        };
    });
}
