import type { NormalizadoHabilidade } from "@contratados-rpg/shared/livro";
import { type Construtor, type PecaPdf, pecaComposta } from "../construtor";
import { MIUDO, NOME, ROTULO } from "../estilos";
import { desenharGlifo, larguraDoGlifo } from "../glifos";
import { type DesenhoDeIcone, desenharIcone } from "../icones";
import { type Cor, PALETA_PDF } from "../paleta";
import { ENTRELINHA, alturaDaLinha, desenharLinha, medirTexto, quebrarLinhas } from "../texto-rico";

interface Chip {
    readonly texto: string;
    readonly cor: Cor;
    readonly icone?: DesenhoDeIcone;
}

const LADO_DO_ICONE = 2.4;

function chipsDe(habilidade: NormalizadoHabilidade, energia?: DesenhoDeIcone): Chip[] {
    return [
        ...(habilidade.reacao ? [{ texto: "REAÇÃO", cor: PALETA_PDF.secundario }] : []),
        ...(habilidade.custo === null ? [] : [{
            texto: energia ? String(habilidade.custo) : `${habilidade.custo} E`,
            cor: PALETA_PDF.energia, icone: energia,
        }]),
    ];
}

/** Quanto o cartão encolhe quando precisa caber numa página. */
export interface Aperto {
    readonly escala: number;
    readonly entrelinha: number;
}

export const SEM_APERTO: Aperto = { escala: 1, entrelinha: ENTRELINHA };

function cabecalho(
    construtor: Construtor, habilidade: NormalizadoHabilidade, largura: number, aperto: Aperto,
): PecaPdf {
    const { pincel } = construtor;
    const nome = { ...NOME, tamanho: NOME.tamanho * aperto.escala };
    const chips = chipsDe(habilidade, construtor.icone("energia")).map((chip) => ({
        ...chip,
        largura: medirTexto(pincel, chip.texto, { ...ROTULO, cor: chip.cor }) + 2.2
            + (chip.icone ? LADO_DO_ICONE + 0.4 : 0),
    }));
    const ocupado = chips.reduce((soma, chip) => soma + chip.largura + 1, 0);
    const recuo = larguraDoGlifo(nome.tamanho) + 1;
    const linhas = quebrarLinhas(pincel, [{ texto: habilidade.nome, estilo: nome }],
        largura - recuo - ocupado - 1);
    const linha = alturaDaLinha(nome.tamanho, aperto.entrelinha);
    return {
        altura: linha * linhas.length,
        prenderProxima: true,
        desenhar: (contexto, x, y) => {
            desenharGlifo(contexto.pincel, habilidade.glifo ?? "◈", x, y + linha * 0.76, nome.tamanho,
                PALETA_PDF.destaque);
            linhas.forEach((conteudo, indice) =>
                desenharLinha(contexto, conteudo, x + recuo, y + linha * (indice + 0.76)));
            let direita = x + largura;
            for (const chip of [...chips].reverse()) {
                direita -= chip.largura;
                contexto.pincel.retangulo(direita, y + 0.2, chip.largura, linha - 0.6,
                    { borda: chip.cor, espessura: 0.15, raio: 0.6 });
                if (chip.icone) {
                    desenharIcone(contexto.pincel, chip.icone, direita + 0.9,
                        y + (linha - 0.4 - LADO_DO_ICONE) / 2, LADO_DO_ICONE, chip.cor);
                }
                contexto.pincel.texto(
                    chip.texto, direita + 1.2 + (chip.icone ? LADO_DO_ICONE + 0.2 : 0),
                    y + linha * 0.72, { ...ROTULO, cor: chip.cor });
                direita -= 1;
            }
        },
    };
}

/** Cartão de habilidade: nome, custo e descrição, sem partir entre colunas. */
export function cartaoDeHabilidade(
    construtor: Construtor, habilidade: NormalizadoHabilidade, largura: number, destaque = false,
    aperto: Aperto = SEM_APERTO,
): PecaPdf {
    const lado = destaque ? 2.4 : 0;
    const linhas = [
        cabecalho(construtor, habilidade, largura - lado * 2, aperto),
        ...construtor.paragrafo(
            habilidade.trechos, { ...MIUDO, tamanho: MIUDO.tamanho * aperto.escala },
            { espacoAntes: 0.4, entrelinha: aperto.entrelinha }, largura - lado * 2),
    ];
    return pecaComposta(linhas, (contexto, x, y, altura) => {
        if (destaque) {
            contexto.pincel.retangulo(
                x, y, largura, altura, { preenchimento: PALETA_PDF.superficie });
            contexto.pincel.retangulo(x, y, 0.7, altura, { preenchimento: PALETA_PDF.aviso });
        } else {
            contexto.pincel.linha(x, y, x + largura, y, PALETA_PDF.borda, 0.2);
        }
    }, { cima: destaque ? 1.4 : 1.1, baixo: destaque ? 1.6 : 0.8, lado }, { espacoAntes: 1.4 });
}
