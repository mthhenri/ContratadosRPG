import type {
    NormalizadoFaixas, NormalizadoGrade, NormalizadoTabela, Trechos,
} from "@contratados-rpg/shared/livro";
import type { Construtor } from "../construtor";
import { MIUDO, NOME, ROTULO } from "../estilos";
import { PALETA_PDF } from "../paleta";
import type { EstiloTexto } from "../pincel";
import { type Celula, largurasAutomaticas, pecasDeTabela } from "../tabela";
import { trechosEmCorridas } from "../texto-rico";
import { type Caixa, fileirasDeCaixas } from "./caixas";
import { pecaDeRotulo } from "./titulos";

const CELULA: EstiloTexto = { ...MIUDO, tamanho: 8 };
const CABECALHO: EstiloTexto = { ...ROTULO, cor: PALETA_PDF.sobreEscuro };
const DESTAQUE: EstiloTexto = { ...NOME, tamanho: 12 };

const celula = (trechos: Trechos): Celula => trechosEmCorridas(trechos, CELULA);
const titulo = (trechos: Trechos): Celula =>
    trechosEmCorridas(trechos, CABECALHO, { semCorRecurso: true }).map((corrida) => ({
        ...corrida, texto: corrida.texto.toLocaleUpperCase("pt-BR"), estilo: CABECALHO,
    }));
const temTexto = (trechos: Trechos): boolean =>
    trechos.some((trecho) => !("texto" in trecho) || !!trecho.texto.trim());

export function blocoDeTabela(construtor: Construtor, bloco: NormalizadoTabela): void {
    const fonte = bloco.pares ?? bloco;
    const total = Math.max(1, fonte.cabecalho.length, ...fonte.linhas.map((linha) => linha.length));
    const completar = (linha: readonly Trechos[]) =>
        Array.from({ length: total }, (_, coluna) => linha[coluna] ?? []);
    const cabecalho = fonte.cabecalho.length ? completar(fonte.cabecalho).map(titulo) : [];
    const linhas = fonte.linhas.map((linha) => completar(linha).map(celula));
    const larguras = largurasAutomaticas(
        construtor.pincel, cabecalho.length ? [cabecalho, ...linhas] : linhas,
        construtor.largura());
    construtor.adicionar(...pecasDeTabela(construtor.pincel,
        larguras.map((largura) => ({ largura })), cabecalho, linhas, construtor.largura(), 2.4));
}

function texto(
    construtor: Construtor, trechos: Trechos, estilo: EstiloTexto, largura: number, antes = 0,
) {
    return construtor.paragrafo(trechos, estilo, { espacoAntes: antes }, largura);
}

const rotulo = (construtor: Construtor, valor: string, largura: number) => construtor.paragrafo(
    [{ tipo: "texto", texto: valor.toLocaleUpperCase("pt-BR") }], ROTULO, {}, largura);

/** Referências reconhecidas, colunas de módulo ou, no resto, uma caixa por célula preenchida. */
export function blocoDeGrade(construtor: Construtor, bloco: NormalizadoGrade): void {
    const referencia = bloco.referencia;
    if (referencia) {
        if (referencia.titulo) construtor.adicionar(pecaDeRotulo(referencia.titulo, ROTULO, 3));
        const saude = referencia.tipo === "saude";
        const caixas: Caixa[] = referencia.itens.map((item) => ({
            barra: item.variante === "vida" ? PALETA_PDF.vida
                : item.variante === "energia" ? PALETA_PDF.energia : undefined,
            conteudo: (largura) => [
                ...rotulo(construtor, item.rotulo, largura),
                ...texto(
                    construtor, item.conteudo,
                    saude ? { ...NOME, tamanho: 11 } : CELULA, largura, 0.8),
                ...(item.nota ? texto(construtor, [{ tipo: "texto", texto: item.nota }],
                    { ...CELULA, cor: PALETA_PDF.secundario }, largura, 0.8) : []),
            ],
        }));
        construtor.adicionar(
            ...fileirasDeCaixas(construtor, caixas, Math.min(saude ? 2 : 3, caixas.length)));
        return;
    }
    const titulos = bloco.cabecalho.map((trechos) => trechosEmCorridas(trechos, CELULA)
        .map((corrida) => corrida.texto).join("").trim());
    if (titulos.length && titulos.every((valor) => /^Módulo [IV]+$/.test(valor))) {
        const caixas: Caixa[] = titulos.map((valor, coluna) => ({
            barra: PALETA_PDF.destaque,
            conteudo: (largura) => [
                ...rotulo(construtor, valor, largura),
                ...bloco.linhas.flatMap(
                    (linha) => texto(construtor, linha[coluna] ?? [], CELULA, largura, 1.6)),
            ],
        }));
        construtor.adicionar(...fileirasDeCaixas(construtor, caixas, Math.min(3, caixas.length)));
        return;
    }
    const celulas = [...bloco.cabecalho, ...bloco.linhas.flat()].filter(temTexto);
    if (!celulas.length) return;
    construtor.adicionar(...fileirasDeCaixas(construtor, celulas.map((trechos) => ({
        conteudo: (largura: number) => texto(construtor, trechos, CELULA, largura),
    })), Math.max(1, Math.min(bloco.colunas, celulas.length, 4))));
}

export function blocoDeFaixas(construtor: Construtor, bloco: NormalizadoFaixas): void {
    construtor.adicionar(...fileirasDeCaixas(construtor, bloco.itens.map((item) => ({
        conteudo: (largura: number) => [
            ...rotulo(construtor, item.rotulo, largura),
            ...texto(construtor, [{ tipo: "texto", texto: item.valor }], DESTAQUE, largura, 1),
        ],
    })), Math.max(1, Math.min(3, bloco.itens.length))));
}
