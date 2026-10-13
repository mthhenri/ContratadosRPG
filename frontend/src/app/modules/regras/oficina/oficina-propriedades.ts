import { TipoRegraPecaEnum as Tipo } from "@contratados-rpg/shared/enums";
import type { CaminhoDeDados } from "./oficina-dados";

/** Um valor possível de uma propriedade de escolha única. */
export interface OpcaoDePropriedade {
    readonly valor: unknown;
    readonly rotulo: string;
    readonly dica?: string;
}

interface Base {
    /** Identifica a propriedade na tela e no Desfazer. */
    readonly chave: string;
    readonly rotulo: string;
    /** Nome da mudança no histórico de Desfazer. */
    readonly passo: string;
}

/** Escolha única entre valores fixos (glifo, variante, apresentação). */
export interface PropriedadeOpcoes extends Base {
    readonly tipo: "opcoes";
    readonly caminho: CaminhoDeDados;
    readonly atual: unknown;
    readonly opcoes: readonly OpcaoDePropriedade[];
}

/** Marca que liga e desliga; desligada, o campo sai do `dados` (campo opcional do contrato). */
export interface PropriedadeAlternar extends Base {
    readonly tipo: "alternar";
    readonly caminho: CaminhoDeDados;
    readonly atual: boolean;
    readonly dica: string;
}

/** Inteiro com passo de mais e menos. */
export interface PropriedadeNumero extends Base {
    readonly tipo: "numero";
    readonly caminho: CaminhoDeDados;
    readonly atual: number;
    readonly min: number;
    readonly max: number;
}

/** A habilidade inicial é única por arquétipo e subclasse: a marca se muda de uma para outra, nunca se liga solta. */
export interface PropriedadeInicial extends Base {
    readonly tipo: "inicial";
    readonly atual: boolean;
}

export type Propriedade = PropriedadeOpcoes | PropriedadeAlternar | PropriedadeNumero | PropriedadeInicial;

type Dados = Readonly<Record<string, unknown>>;

const SEM_GLIFO: OpcaoDePropriedade = { valor: null, rotulo: "Nenhum", dica: "Sem glifo" };

const glifos = (...simbolos: readonly string[]): readonly OpcaoDePropriedade[] =>
    [...simbolos.map((valor) => ({ valor, rotulo: valor })), SEM_GLIFO];

const NIVEIS_DA_SECAO: readonly OpcaoDePropriedade[] = [
    { valor: 1, rotulo: "1", dica: "Capítulo" },
    { valor: 2, rotulo: "2", dica: "Seção" },
    { valor: 3, rotulo: "3", dica: "Subseção" },
    { valor: 4, rotulo: "4", dica: "Verbete" },
];

const VARIANTES_DOS_TERMOS: readonly OpcaoDePropriedade[] = [
    { valor: "atributos", rotulo: "Atributos" },
    { valor: "maestrias", rotulo: "Maestrias" },
    { valor: "penalidades", rotulo: "Penalidades" },
    { valor: "verbetes", rotulo: "Verbetes" },
];

/**
 * Propriedades estruturais editáveis de uma peça — o que muda a apresentação e não o texto
 * (`oficina-edicao-blocos-restantes`, fatia 5). `tipoPai` decide o que cabe: `inicial` e `melhorada` só existem em
 * habilidades de arquétipo e de subclasse. A Reação da habilidade e o texto de cada campo seguem por outros caminhos.
 */
export function propriedadesDaPeca(tipo: Tipo, dados: Dados, tipoPai: Tipo | null): readonly Propriedade[] {
    switch (tipo) {
        case Tipo.SECAO:
            return [
                { tipo: "opcoes", chave: "nivel", rotulo: "Nível", passo: "Nível da seção", caminho: ["nivel"],
                    atual: dados["nivel"], opcoes: NIVEIS_DA_SECAO },
                { tipo: "opcoes", chave: "glifo", rotulo: "Glifo", passo: "Glifo da seção", caminho: ["glifo"],
                    atual: dados["glifo"] ?? null, opcoes: glifos("⬢", "⬡", "⬥", "⬦") },
            ];
        case Tipo.HABILIDADE: {
            const propriedades: Propriedade[] = [
                { tipo: "opcoes", chave: "glifo", rotulo: "Glifo", passo: "Glifo da habilidade", caminho: ["glifo"],
                    atual: dados["glifo"] ?? null, opcoes: glifos("⬦", "◈", "◻") },
            ];
            const dentroDeArquetipo = tipoPai === Tipo.ARQUETIPO;
            const inicial = dados["inicial"] === true;
            if (dentroDeArquetipo || tipoPai === Tipo.SUBCLASSE) {
                propriedades.push({ tipo: "inicial", chave: "inicial", rotulo: "Habilidade inicial",
                    passo: "Habilidade inicial", atual: inicial });
            }
            if (dentroDeArquetipo && !inicial) {
                propriedades.push({ tipo: "alternar", chave: "melhorada", rotulo: "Geral melhorada",
                    passo: "Geral melhorada", caminho: ["melhorada"], atual: dados["melhorada"] === true,
                    dica: "Habilidade geral melhorada por este arquétipo" });
            }
            return propriedades;
        }
        case Tipo.TERMOS:
            return [{ tipo: "opcoes", chave: "variante", rotulo: "Variante", passo: "Variante dos termos",
                caminho: ["variante"], atual: dados["variante"], opcoes: VARIANTES_DOS_TERMOS }];
        case Tipo.GRADE:
            // A grade genérica guarda células, não cartões: trocar de apresentação a converteria. Só saúde e cartões
            // têm a mesma forma (`itens`) e se trocam sem perder nada.
            return dados["apresentacao"] === "saude" || dados["apresentacao"] === "cartoes"
                ? [{ tipo: "opcoes", chave: "apresentacao", rotulo: "Apresentação", passo: "Apresentação da grade",
                    caminho: ["apresentacao"], atual: dados["apresentacao"],
                    opcoes: [{ valor: "saude", rotulo: "Saúde" }, { valor: "cartoes", rotulo: "Cartões" }] }]
                : [];
        case Tipo.TABELA: {
            // As duas metades saem das colunas 1–2 e 3–4: só faz sentido com quatro colunas.
            const colunas = Array.isArray(dados["cabecalho"]) ? dados["cabecalho"].length : 0;
            const emPares = dados["emPares"] === true;
            return colunas === 4 || emPares
                ? [{ tipo: "alternar", chave: "emPares", rotulo: "Em pares", passo: "Tabela em pares",
                    caminho: ["emPares"], atual: emPares,
                    dica: "Mostra as colunas 1–2 e 3–4 como duas tabelas, uma sobre a outra" }]
                : [];
        }
        default:
            return [];
    }
}

/** Propriedades de uma lista (a raiz ou uma sublista): numerada ou com marcadores, e o número em que começa. */
export function propriedadesDaLista(lista: Dados, base: CaminhoDeDados): readonly Propriedade[] {
    const ordenada = lista["ordenada"] === true;
    const propriedades: Propriedade[] = [
        { tipo: "opcoes", chave: "ordenada", rotulo: "Lista", passo: "Tipo da lista", caminho: [...base, "ordenada"],
            atual: ordenada, opcoes: [{ valor: false, rotulo: "Marcadores" }, { valor: true, rotulo: "Numerada" }] },
    ];
    if (ordenada) {
        propriedades.push({ tipo: "numero", chave: "inicio", rotulo: "Começa em", passo: "Início da lista",
            caminho: [...base, "inicio"], atual: typeof lista["inicio"] === "number" ? lista["inicio"] : 1, min: 0, max: 999 });
    }
    return propriedades;
}
