import type {
    NormalizadoAmplificadores, NormalizadoEquipamentos, NormalizadoModificacoes, Trechos,
} from "@contratados-rpg/shared/livro";
import {
    formatarPesoModificacao, lerModificacoesCategoria,
} from "../../blocos/regras-modificacoes-motor";
import type { Construtor } from "../construtor";
import { MIUDO, NOME, ROTULO } from "../estilos";
import { PALETA_PDF } from "../paleta";
import type { EstiloTexto } from "../pincel";
import { type Corrida, trechosEmCorridas } from "../texto-rico";
import { type Celula, type Coluna, pecasDeTabela } from "../tabela";
import { pecasDoTexto } from "./textos";

const CELULA: EstiloTexto = { ...MIUDO, tamanho: 7.8 };
const NOME_NA_CELULA: EstiloTexto = { ...NOME, tamanho: 7.8 };
const TITULO: EstiloTexto = { ...ROTULO, cor: PALETA_PDF.sobreEscuro };

const titulo = (texto: string): Celula => [{ texto: texto.toLocaleUpperCase("pt-BR"), estilo: TITULO }];
const celula = (trechos: Trechos | undefined): Celula =>
    trechos ? trechosEmCorridas(trechos, CELULA) : [];

type Item = NormalizadoEquipamentos["itens"][number];

function dano(item: Item): Celula {
    return item.danos.flatMap((entrada, indice): Corrida[] => [
        ...(indice ? [{ texto: "\n", estilo: CELULA }] : []),
        ...(entrada.rotulo === "DANO" ? [] : [{ texto: `${entrada.rotulo}: `, estilo: { ...ROTULO, tamanho: 6 } }]),
        ...trechosEmCorridas(entrada.trechos, CELULA),
    ]);
}

/** Itens de uma categoria em tabela; só entram as colunas que a categoria usa. */
export function blocoDeEquipamentos(construtor: Construtor, bloco: NormalizadoEquipamentos): void {
    const algum = (teste: (item: Item) => boolean) => bloco.itens.some(teste);
    const colunas: (Coluna & { nome: string; de: (item: Item) => Celula; usar: boolean })[] = [
        { nome: "Item", largura: 28, usar: true, de: (item) => [{ texto: item.nome, estilo: NOME_NA_CELULA }] },
        { nome: "Dano", largura: 27, usar: algum((item) => item.danos.length > 0), de: dano },
        { nome: "Especificações", largura: 32, usar: algum((item) => !!item.especificacoes),
            de: (item) => celula(item.especificacoes) },
        { nome: "Descrição", usar: true, de: (item) => celula(item.descricao) },
        { nome: "Porte", largura: 15, usar: algum((item) => !!item.porte), de: (item) => celula(item.porte) },
        { nome: "Duração", largura: 17, usar: algum((item) => !!item.duracao),
            de: (item) => celula(item.duracao) },
        { nome: "Peso", largura: 11, centro: true, usar: true, de: (item) => celula(item.peso) },
        { nome: "Custo", largura: 14, usar: true, de: (item) => celula(item.custo) },
    ];
    const usadas = colunas.filter((coluna) => coluna.usar);
    construtor.adicionar(...pecasDeTabela(construtor.pincel, usadas,
        usadas.map((coluna) => titulo(coluna.nome)),
        bloco.itens.map((item) => usadas.map((coluna) => coluna.de(item))),
        construtor.largura(), 2.4));
}

export function blocoDeAmplificadores(
    construtor: Construtor, bloco: NormalizadoAmplificadores,
): void {
    construtor.adicionar(...pecasDeTabela(construtor.pincel,
        [{ largura: 42 }, {}],
        [titulo("Amplificador"), titulo("Efeito")],
        bloco.itens.map((item) => [[
            { texto: `${item.nome}\n`, estilo: NOME_NA_CELULA },
            { texto: item.empilhamento, estilo: { ...NOME_NA_CELULA, cor: PALETA_PDF.destaque } },
        ], celula(item.efeito)]),
        construtor.largura(), 2.4));
}

export function blocoDeModificacoes(construtor: Construtor, bloco: NormalizadoModificacoes): void {
    if (bloco.nota?.length) {
        construtor.adicionar(...pecasDoTexto(
            construtor, { tipo: "nota", trechos: bloco.nota }, construtor.largura()));
    }
    const motor = lerModificacoesCategoria(bloco.categoria);
    if (motor) {
        const peso = motor.pesoPadrao
            ? `${formatarPesoModificacao(motor.pesoPadrao)} por modificação` : "sem peso";
        construtor.adicionar(...construtor.paragrafo(
            [{ tipo: "texto", texto: `Custo $ ${motor.custo} por modificação · ${peso}` }],
            { ...CELULA, familia: "mono", cor: PALETA_PDF.secundario }, { espacoAntes: 1.6 }));
    }
    const nome = (item: NormalizadoModificacoes["itens"][number]): Celula => {
        const proprio = motor?.pesoProprio.get(item.nome);
        return [
            { texto: `${item.nome}\n`, estilo: NOME_NA_CELULA },
            { texto: item.empilhamento, estilo: { ...NOME_NA_CELULA, cor: PALETA_PDF.destaque } },
            ...(proprio === undefined ? [] : [{ texto: `  ${formatarPesoModificacao(proprio)}`,
                estilo: { ...CELULA, cor: PALETA_PDF.secundario } }]),
        ];
    };
    construtor.adicionar(...pecasDeTabela(construtor.pincel,
        [{ largura: 42 }, {}, { largura: 36 }],
        [titulo("Modificação"), titulo("Efeito"), titulo("Bloqueia")],
        bloco.itens.map((item) => [nome(item), celula(item.efeito), celula(item.bloqueia)]),
        construtor.largura(), 1.6));
}
