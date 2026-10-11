import type { LivroTrechoDto } from "@contratados-rpg/shared/dtos/livro";

/**
 * Ponte entre o texto rico do livro (`LivroTrechoDto[]`) e o DOM editável da Oficina (m11-06).
 * Texto, negrito e itálico viram nós editáveis; tarja, links e selos de Nível de Ameaça viram
 * átomos (`contenteditable=false`) que carregam o próprio trecho em `data-trecho` e voltam
 * intactos — a edição de texto nunca reescreve o que ela não tocou.
 */

const NOMES_NIVEL = ["Desconhecido", "Nulo", "Baixo", "Médio", "Alto", "Extremo", "Catastrófico", "Apocalíptico"];

/** Texto do selo de um nível, como o conversor da fonte o grava (`NA Médio [3]`). */
export function textoNivelAmeaca(nivel: number): string {
    return `NA ${NOMES_NIVEL[nivel]} [${nivel}]`;
}

/** Reconhece `NA0`…`NA7` (a sigla digitada) e devolve o nível. */
export function lerSiglaNivel(palavra: string): number | null {
    const resultado = /^NA([0-7])$/.exec(palavra);
    return resultado ? Number(resultado[1]) : null;
}

/** Se `textoAntesDoCursor` termina em `NA<n> ` (palavra isolada), devolve o nível e o que sobra antes. */
export function detectarNivelAmeaca(textoAntesDoCursor: string): { nivel: number; antes: string } | null {
    const resultado = /(^|\s)(NA[0-7])\s$/.exec(textoAntesDoCursor);
    if (!resultado) return null;
    const nivel = lerSiglaNivel(resultado[2]);
    if (nivel === null) return null;
    return { nivel, antes: textoAntesDoCursor.slice(0, textoAntesDoCursor.length - resultado[0].length) + resultado[1] };
}

function criarAtomo(documento: Document, trecho: LivroTrechoDto, rotulo: string, classe: string): HTMLElement {
    const atomo = documento.createElement("span");
    atomo.contentEditable = "false";
    atomo.className = `oficina-atomo ${classe}`;
    atomo.dataset["trecho"] = JSON.stringify(trecho);
    atomo.textContent = rotulo;
    return atomo;
}

/** O átomo que representa o selo de um nível de ameaça recém-digitado. */
export function criarSeloNivel(documento: Document, nivel: number): HTMLElement {
    return criarAtomo(documento, { tipo: "nivel-ameaca", nivel, texto: textoNivelAmeaca(nivel) },
        textoNivelAmeaca(nivel), "oficina-atomo--ameaca");
}

function montarTrecho(documento: Document, trecho: LivroTrechoDto): Node {
    switch (trecho.tipo) {
        case "texto":
            return documento.createTextNode(trecho.texto);
        case "negrito":
        case "italico": {
            const elemento = documento.createElement(trecho.tipo === "negrito" ? "strong" : "em");
            for (const filho of trecho.filhos) elemento.append(montarTrecho(documento, filho));
            return elemento;
        }
        case "tarja":
            return criarAtomo(documento, trecho, "████", "oficina-atomo--tarja");
        case "link-interno":
            return criarAtomo(documento, trecho, trecho.texto, "oficina-atomo--link");
        case "link-externo":
            return criarAtomo(documento, trecho, textoDe(trecho.filhos) || trecho.destino, "oficina-atomo--link");
        case "nivel-ameaca":
            return criarAtomo(documento, trecho, trecho.texto, "oficina-atomo--ameaca");
    }
}

/** Texto corrido de uma sequência de trechos (sem marcação). */
export function textoDe(trechos: readonly LivroTrechoDto[]): string {
    return trechos.map((trecho) => {
        switch (trecho.tipo) {
            case "texto": return trecho.texto;
            case "negrito": case "italico": case "link-externo": return textoDe(trecho.filhos);
            case "link-interno": case "nivel-ameaca": return trecho.texto;
            case "tarja": return "";
        }
    }).join("");
}

/** Preenche `raiz` com o DOM editável dos trechos (substitui o conteúdo atual). */
export function montarTrechos(raiz: HTMLElement, trechos: readonly LivroTrechoDto[]): void {
    const documento = raiz.ownerDocument;
    raiz.replaceChildren(...trechos.map((trecho) => montarTrecho(documento, trecho)));
}

function lerFilhos(no: Node): LivroTrechoDto[] {
    const trechos: LivroTrechoDto[] = [];
    for (const filho of Array.from(no.childNodes)) {
        if (filho.nodeType === Node.TEXT_NODE) {
            const texto = (filho.textContent ?? "").replace(/\u00a0/g, " ").replace(/\u200b/g, "");
            if (texto) trechos.push({ tipo: "texto", texto });
        } else if (filho instanceof HTMLElement) {
            const guardado = filho.dataset["trecho"];
            if (guardado) {
                try {
                    trechos.push(JSON.parse(guardado) as LivroTrechoDto);
                } catch {
                    // Átomo adulterado: o texto visível ainda vale, como texto comum.
                    trechos.push({ tipo: "texto", texto: filho.textContent ?? "" });
                }
            } else if (filho.tagName === "STRONG" || filho.tagName === "B"
                || filho.tagName === "EM" || filho.tagName === "I") {
                const dentro = lerFilhos(filho);
                if (dentro.length) {
                    trechos.push({ tipo: filho.tagName === "STRONG" || filho.tagName === "B" ? "negrito" : "italico",
                        filhos: dentro });
                }
            } else if (filho.tagName === "BR") {
                continue;
            } else {
                // Elemento que o navegador inseriu (span, font, div): vale só o conteúdo.
                trechos.push(...lerFilhos(filho));
            }
        }
    }
    return trechos;
}

/** Junta textos vizinhos e elimina marcações vazias, para que dois leitos iguais comparem iguais. */
export function normalizarTrechos(trechos: readonly LivroTrechoDto[]): LivroTrechoDto[] {
    const resultado: LivroTrechoDto[] = [];
    for (const trecho of trechos) {
        const normalizado: LivroTrechoDto = trecho.tipo === "negrito" || trecho.tipo === "italico"
            ? { ...trecho, filhos: normalizarTrechos(trecho.filhos) } : trecho;
        if ((normalizado.tipo === "negrito" || normalizado.tipo === "italico") && normalizado.filhos.length === 0) continue;
        const anterior = resultado.at(-1);
        if (normalizado.tipo === "texto" && anterior?.tipo === "texto") {
            resultado[resultado.length - 1] = { tipo: "texto", texto: anterior.texto + normalizado.texto };
        } else if (normalizado.tipo === "texto" && normalizado.texto === "") {
            continue;
        } else {
            resultado.push(normalizado);
        }
    }
    return resultado;
}

/** Lê o DOM editável de volta para trechos. */
export function lerTrechos(raiz: HTMLElement): LivroTrechoDto[] {
    return normalizarTrechos(lerFilhos(raiz));
}

/** `true` quando dois textos ricos são iguais (para não gravar o que não mudou). */
export function trechosIguais(a: readonly LivroTrechoDto[], b: readonly LivroTrechoDto[]): boolean {
    return JSON.stringify(normalizarTrechos(a)) === JSON.stringify(normalizarTrechos(b));
}

/**
 * Parte os trechos no ponto de texto `deslocamento` (contado nos caracteres de texto simples, no
 * nível de `texto`/marcações): usado para o Enter no meio do parágrafo.
 */
export function dividirTrechos(trechos: readonly LivroTrechoDto[], deslocamento: number):
    [LivroTrechoDto[], LivroTrechoDto[]] {
    let restante = deslocamento;
    const antes: LivroTrechoDto[] = [];
    const depois: LivroTrechoDto[] = [];
    const percorrer = (lista: readonly LivroTrechoDto[], saidaAntes: LivroTrechoDto[], saidaDepois: LivroTrechoDto[]): void => {
        for (const trecho of lista) {
            if (restante <= 0) {
                saidaDepois.push(trecho);
            } else if (trecho.tipo === "texto") {
                if (trecho.texto.length <= restante) {
                    saidaAntes.push(trecho);
                    restante -= trecho.texto.length;
                } else {
                    saidaAntes.push({ tipo: "texto", texto: trecho.texto.slice(0, restante) });
                    saidaDepois.push({ tipo: "texto", texto: trecho.texto.slice(restante) });
                    restante = 0;
                }
            } else if (trecho.tipo === "negrito" || trecho.tipo === "italico") {
                const a: LivroTrechoDto[] = [];
                const d: LivroTrechoDto[] = [];
                percorrer(trecho.filhos, a, d);
                if (a.length) saidaAntes.push({ ...trecho, filhos: a });
                if (d.length) saidaDepois.push({ ...trecho, filhos: d });
            } else {
                // Átomo: conta como um caractere.
                saidaAntes.push(trecho);
                restante -= 1;
            }
        }
    };
    percorrer(trechos, antes, depois);
    return [normalizarTrechos(antes), normalizarTrechos(depois)];
}
