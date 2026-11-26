import type {
    NormalizadoTermos, NormalizadoTexto, Trechos,
} from "@contratados-rpg/shared/livro";
import { type Construtor, type PecaPdf, pecaComposta } from "../construtor";
import { CORPO, MIUDO, NOME, ROTULO } from "../estilos";
import { type Cor, PALETA_PDF } from "../paleta";
import { pecasDeTexto, trechosEmCorridas } from "../texto-rico";
import { pecaDeRotulo } from "./titulos";

/** Parágrafo, fórmula, nota ou exemplo na largura pedida. */
export function pecasDoTexto(
    construtor: Construtor, bloco: NormalizadoTexto, largura: number, recuo = 0,
): PecaPdf[] {
    switch (bloco.tipo) {
        case "paragrafo":
            return construtor.paragrafo(bloco.trechos, CORPO, { espacoAntes: 1.6, recuo }, largura);
        case "formula":
            return [formula(construtor, bloco.trechos, largura - recuo)];
        case "nota":
            return [caixa(construtor, "Nota", bloco.trechos, largura - recuo, PALETA_PDF.aviso)];
        case "exemplo":
            return [caixa(construtor, "Exemplo", bloco.trechos, largura - recuo, PALETA_PDF.destaque)];
    }
}

function formula(construtor: Construtor, trechos: Trechos, largura: number): PecaPdf {
    const corridas = trechosEmCorridas(trechos, { ...NOME, tamanho: 9 });
    const linhas = pecasDeTexto(construtor.pincel, corridas, largura - 8);
    const texto = corridas.map((corrida) => corrida.texto).join("");
    // Centraliza pela linha única, que é o caso das fórmulas do livro.
    const sobra = Math.max(
        0, (largura - 8 - construtor.pincel.medir(texto, corridas[0]?.estilo ?? NOME)) / 2);
    return pecaComposta(linhas, (contexto, x, y, altura) => {
        contexto.pincel.retangulo(
            x, y, largura, altura, { preenchimento: PALETA_PDF.superficie, raio: 1 });
    }, { cima: 1.8, baixo: 1.8, lado: linhas.length === 1 ? 4 + sobra : 4 }, { espacoAntes: 2.4 });
}

function caixa(
    construtor: Construtor, rotulo: string, trechos: Trechos, largura: number,
    cor: Cor,
): PecaPdf {
    const linhas = [
        pecaDeRotulo(rotulo, { ...ROTULO, cor }, 0),
        ...construtor.paragrafo(trechos, MIUDO, {}, largura - 7),
    ];
    return pecaComposta(linhas, (contexto, x, y, altura) => {
        contexto.pincel.retangulo(x, y, largura, altura, { preenchimento: PALETA_PDF.superficie });
        contexto.pincel.retangulo(x, y, 0.9, altura, { preenchimento: cor });
    }, { cima: 1.4, baixo: 1.8, lado: 4 }, { espacoAntes: 2.4 });
}

/** Atributos, maestrias, penalidades e verbetes em grade. */
export function blocoDeTermos(construtor: Construtor, bloco: NormalizadoTermos): void {
    const colunas = bloco.variante === "penalidades" ? 3 : 2;
    const largura = construtor.largura(colunas);
    construtor.emColunas(colunas, bloco.itens.map((item, indice) => {
        const nome = [item.numero === undefined ? "" : `${item.numero}. `, item.nome].join("");
        const titulo = [{ texto: nome, estilo: NOME }];
        const linhas: PecaPdf[] = pecasDeTexto(construtor.pincel, [
            ...titulo,
            ...(item.rotulo ? [{ texto: `  ${item.rotulo.toLocaleUpperCase("pt-BR")}`,
                estilo: { ...ROTULO, negrito: false } }] : []),
        ], largura - 4);
        linhas.push(...construtor.paragrafo(item.descricao, MIUDO, {}, largura - 4));
        return pecaComposta(linhas, (contexto, x, y, altura) => {
            contexto.pincel.retangulo(
                x, y, largura, altura, { preenchimento: PALETA_PDF.superficie });
        }, { cima: 1.2, baixo: 1.4, lado: 2 }, { espacoAntes: indice ? 1.4 : 2.4 });
    }));
}
