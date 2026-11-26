import type { NormalizadoDocumento, Trechos } from "@contratados-rpg/shared/livro";
import { PAGINA } from "./estilos";
import { PALETA_PDF } from "./paleta";
import { MM_POR_PONTO, type ContextoDeDesenho, type EstiloTexto, type Pincel } from "./pincel";
import {
    type Linha, alturaDaLinha, desenharLinha, quebrarEquilibrado, quebrarLinhas, trechosEmCorridas,
} from "./texto-rico";

/*
 * Capa escolhida pelo autor no configurador (25/11/2026): registro oficial em carimbo, logo
 * grande, o nome na fonte das Backrooms e a barra com livro e versão no pé.
 */
const LOGO = 110;
const NOME_PT = 45;
const BARRA_PT = 13;
const BARRA_RESPIRO = 2.6;
const BARRA_ATE_O_PE = 12;
const REGISTRO_PT = 9;
const REGISTRO_LARGURA = 103;
const REGISTRO_ALTURA_MAXIMA = 130;
const CARIMBO = { borda: 1.4, lado: 6, cima: 4, graus: 2 } as const;
const ENTRELINHA = 1.34;
/** O que a fonte das Backrooms tem: fora disso o nome sai no mono. */
const LETRAS_DAS_BACKROOMS = /^[A-Z !"',.:;?]+$/;

/** Cada frase do registro começa em linha própria. */
function umaFrasePorLinha(trechos: Trechos): Trechos {
    return trechos.map((trecho) => {
        if (trecho.tipo === "texto") {
            return { ...trecho, texto: trecho.texto.replace(/(?<=\.["”]?) (?=\p{Lu})/gu, "\n") };
        }
        return "filhos" in trecho ? { ...trecho, filhos: umaFrasePorLinha(trecho.filhos) } : trecho;
    });
}

/** Sem linha em branco entre parágrafos; só a despedida final fica separada. */
function juntarParagrafos(linhas: readonly Linha[]): Linha[] {
    const vazia = (linha: Linha) => linha.segmentos.length === 0;
    const ultimaVazia = linhas.map(vazia).lastIndexOf(true);
    return linhas.filter((linha, indice) => !vazia(linha) || indice === ultimaVazia);
}

function alturaDe(linhas: readonly Linha[]): number {
    return linhas.reduce((soma, linha) => soma + alturaDaLinha(linha.tamanho, ENTRELINHA), 0);
}

function registro(pincel: Pincel, titulo: string, trechos: Trechos): Linha[] {
    let tamanho = REGISTRO_PT;
    for (;;) {
        const estilo: EstiloTexto = { familia: "sans", italico: true, tamanho, cor: PALETA_PDF.texto };
        const linhas = [
            ...quebrarLinhas(pincel, [{
                texto: titulo,
                estilo: { familia: "mono", negrito: true, tamanho: tamanho * 0.92, cor: PALETA_PDF.destaque },
            }], REGISTRO_LARGURA),
            ...juntarParagrafos(quebrarEquilibrado(
                pincel, trechosEmCorridas(umaFrasePorLinha(trechos), estilo), REGISTRO_LARGURA)),
        ];
        if (alturaDe(linhas) <= REGISTRO_ALTURA_MAXIMA || tamanho <= 6) return linhas;
        tamanho -= 0.2;
    }
}

interface Bloco {
    readonly altura: number;
    desenhar(y: number): void;
}

function carimbo(contexto: ContextoDeDesenho, linhas: readonly Linha[]): Bloco {
    const { pincel } = contexto;
    const meio = PAGINA.largura / 2;
    const largura = Math.max(...linhas.map((linha) => linha.largura))
        + (CARIMBO.lado + CARIMBO.borda) * 2;
    const altura = alturaDe(linhas) + (CARIMBO.cima + CARIMBO.borda) * 2;
    return {
        altura,
        desenhar: (y) => pincel.girado(CARIMBO.graus, meio, y + altura / 2, () => {
            // Borda dupla: um fio por fora e outro por dentro, cada um com um terço da borda.
            const fio = CARIMBO.borda / 3;
            for (const recuo of [fio / 2, CARIMBO.borda - fio / 2]) {
                pincel.retangulo(meio - largura / 2 + recuo, y + recuo,
                    largura - recuo * 2, altura - recuo * 2,
                    { borda: PALETA_PDF.destaque, espessura: fio });
            }
            let posicao = y + CARIMBO.borda + CARIMBO.cima;
            for (const linha of linhas) {
                const alturaAtual = alturaDaLinha(linha.tamanho, ENTRELINHA);
                desenharLinha(
                    contexto, linha, meio - linha.largura / 2, posicao + alturaAtual * 0.76);
                posicao += alturaAtual;
            }
        }),
    };
}

/** Capa em uma página; o que sobra de altura se reparte por igual entre os blocos. */
export function desenharCapa(
    contexto: ContextoDeDesenho, documento: NormalizadoDocumento, logo?: string,
): void {
    const { pincel } = contexto;
    const meio = PAGINA.largura / 2;
    const centrado = (texto: string, y: number, estilo: EstiloTexto) => {
        const largura = pincel.medir(texto, estilo)
            + (estilo.espacamento ?? 0) * (texto.length - 1);
        pincel.texto(texto, meio - largura / 2, y, estilo);
    };
    const capa = documento.filhos.find((bloco) => bloco.tipo === "capa");
    const abertura = documento.filhos.find((bloco) => bloco.tipo === "abertura");
    pincel.retangulo(0, 0, PAGINA.largura, 4, { preenchimento: PALETA_PDF.destaque });

    const alturaDoTexto = alturaDaLinha(BARRA_PT, 1.2);
    const peDaBarra = PAGINA.altura - BARRA_ATE_O_PE;
    const topoDaBarra = peDaBarra - alturaDoTexto - BARRA_RESPIRO * 2;
    for (const y of [topoDaBarra, peDaBarra]) {
        pincel.linha(14, y, PAGINA.largura - 14, y, PALETA_PDF.borda, 0.25);
    }
    centrado(`${documento.titulo} · versão ${documento.versao}`.toLocaleUpperCase("pt-BR"),
        topoDaBarra + BARRA_RESPIRO + alturaDoTexto * 0.78,
        { familia: "mono", negrito: true, tamanho: BARRA_PT, cor: PALETA_PDF.secundario, espacamento: 0.5 });

    const topo = 9;
    const area = topoDaBarra - 5 - topo;
    const nome = (capa?.titulo ?? "Contratados").toLocaleUpperCase("pt-BR");
    const blocoDoNome: Bloco = {
        altura: NOME_PT * MM_POR_PONTO,
        desenhar: (y) => centrado(nome, y + NOME_PT * MM_POR_PONTO * 0.82, {
            familia: LETRAS_DAS_BACKROOMS.test(nome) ? "backrooms" : "mono",
            tamanho: NOME_PT, cor: PALETA_PDF.texto, espacamento: 0.8,
        }),
    };
    const blocos: Bloco[] = [];
    if (abertura) blocos.push(
        carimbo(contexto, registro(pincel, abertura.titulo, abertura.trechos)));
    if (logo) {
        const ocupado = blocos.reduce((soma, bloco) => soma + bloco.altura, 0) + blocoDoNome.altura;
        const lado = Math.min(LOGO, area - ocupado - 12);
        blocos.push({
            altura: lado, desenhar: (y) => pincel.imagem(logo, meio - lado / 2, y, lado, lado),
        });
    }
    blocos.push(blocoDoNome);

    const sobra = area - blocos.reduce((soma, bloco) => soma + bloco.altura, 0);
    const respiro = Math.max(0, sobra / (blocos.length + 1));
    let y = topo + respiro;
    for (const bloco of blocos) {
        bloco.desenhar(y);
        y += bloco.altura + respiro;
    }
}
