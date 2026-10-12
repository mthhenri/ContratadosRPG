import type { RegraPecaArvoreItemDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoRegraPecaEnum as Tipo } from "@contratados-rpg/shared/enums";
import { LIVRO_FILHOS_PERMITIDOS, LIVRO_RAIZ_PERMITIDA } from "@contratados-rpg/shared/livro";

import type { MenuInsercaoOpcao } from "../../../shared/ui/menu-insercao/menu-insercao";

type Item = RegraPecaArvoreItemDto;

/** Peças que aparecem no sumário da Oficina e que se arrastam nele (o exemplão: seções e arquétipos). */
const TIPOS_DO_SUMARIO: readonly Tipo[] = [Tipo.SECAO, Tipo.CLASSE, Tipo.SUBCLASSE, Tipo.ARQUETIPO];

/** Linha do sumário da Oficina: a árvore achatada na ordem de leitura, com a profundidade de cada peça. */
export interface LinhaSumario {
    readonly id: number;
    readonly identificador: string;
    readonly tipo: Tipo;
    readonly rotulo: string;
    readonly profundidade: number;
    readonly pecaPaiId: number | null;
}

/** Para onde uma peça vai: o pai (`null` = raiz do livro) e a posição entre as irmãs, como a API pede. */
export interface DestinoDeMovimento {
    readonly pecaPaiId: number | null;
    readonly indice: number;
    readonly profundidade: number;
}

export type ResultadoDoDestino =
    | { readonly ok: true; readonly destino: DestinoDeMovimento; readonly semMudanca: boolean }
    | { readonly ok: false; readonly motivo: string };

export type TeclaDeEstrutura = "subir" | "descer" | "recuar" | "avancar";

export const NOME_DO_TIPO: Readonly<Partial<Record<Tipo, string>>> = {
    [Tipo.SECAO]: "Seção", [Tipo.PARAGRAFO]: "Parágrafo", [Tipo.NOTA]: "Nota", [Tipo.EXEMPLO]: "Exemplo",
    [Tipo.FORMULA]: "Fórmula", [Tipo.HABILIDADE]: "Habilidade", [Tipo.CLASSE]: "Classe",
    [Tipo.SUBCLASSE]: "Subclasse", [Tipo.ARQUETIPO]: "Arquétipo",
    [Tipo.EQUIPAMENTOS]: "Equipamentos", [Tipo.EQUIPAMENTO]: "Equipamento",
    [Tipo.MODIFICACOES]: "Modificações", [Tipo.MODIFICACAO]: "Modificação",
    [Tipo.AMPLIFICADORES]: "Amplificadores", [Tipo.AMPLIFICADOR]: "Amplificador",
    [Tipo.ORIGENS]: "Origens", [Tipo.ORIGEM]: "Origem", [Tipo.TERMOS]: "Termos", [Tipo.TERMO]: "Termo",
    [Tipo.ROTEIRO]: "Roteiro", [Tipo.FICHA_CRIATURA]: "Ficha de criatura", [Tipo.HABILIDADE_CRIATURA]: "Habilidade de criatura",
    [Tipo.TABELA]: "Tabela", [Tipo.GRADE]: "Grade", [Tipo.FAIXAS]: "Faixas", [Tipo.NIVEIS_AMEACA]: "Níveis de ameaça",
};

/**
 * O que o menu de inserção oferece, por tipo: só as peças que a Oficina já edita na tela. Os blocos
 * ricos (tabelas, fichas…) entram com a edição deles (m11-08). A ordem aqui é a do menu.
 */
const CATALOGO: readonly (MenuInsercaoOpcao & { readonly tipo: Tipo })[] = [
    { id: Tipo.PARAGRAFO, tipo: Tipo.PARAGRAFO, rotulo: "Parágrafo", marca: "¶", termos: ["texto", "par"],
        descricao: "Texto corrido." },
    { id: Tipo.SECAO, tipo: Tipo.SECAO, rotulo: "Seção", marca: "⬡", termos: ["titulo", "capitulo", "sec"],
        descricao: "Título que abre um trecho do livro e entra no sumário." },
    { id: Tipo.HABILIDADE, tipo: Tipo.HABILIDADE, rotulo: "Habilidade", marca: "⬦", termos: ["hab", "custo"],
        descricao: "Nome, custo, Reação e efeito." },
    { id: Tipo.NOTA, tipo: Tipo.NOTA, rotulo: "Nota", marca: "i", termos: ["aviso", "destaque"],
        descricao: "Observação em destaque." },
    { id: Tipo.EXEMPLO, tipo: Tipo.EXEMPLO, rotulo: "Exemplo", marca: "→", termos: ["ex"],
        descricao: "Situação de jogo que ilustra a regra." },
    { id: Tipo.FORMULA, tipo: Tipo.FORMULA, rotulo: "Fórmula", marca: "ƒ", termos: ["calculo", "form"],
        descricao: "Cálculo em linha própria." },
    { id: Tipo.CLASSE, tipo: Tipo.CLASSE, rotulo: "Classe", marca: "⬥", termos: ["cla"],
        descricao: "Saúde, progressão e arquétipos." },
    { id: Tipo.SUBCLASSE, tipo: Tipo.SUBCLASSE, rotulo: "Subclasse", marca: "⬥", termos: ["sub"],
        descricao: "Nasce com a habilidade inicial." },
    { id: Tipo.ARQUETIPO, tipo: Tipo.ARQUETIPO, rotulo: "Arquétipo", marca: "◻", termos: ["arq"],
        descricao: "Nasce com a habilidade inicial." },
    { id: Tipo.EQUIPAMENTOS, tipo: Tipo.EQUIPAMENTOS, rotulo: "Equipamentos", marca: "▤", termos: ["itens", "armas", "equip"],
        descricao: "Categoria de equipamentos: custo, peso e dano." },
    { id: Tipo.EQUIPAMENTO, tipo: Tipo.EQUIPAMENTO, rotulo: "Equipamento", marca: "▪", termos: ["item", "arma"],
        descricao: "Nome, custo, peso, porte, dano e descrição." },
    { id: Tipo.MODIFICACOES, tipo: Tipo.MODIFICACOES, rotulo: "Modificações", marca: "▤", termos: ["mod"],
        descricao: "Modificações de uma categoria de equipamentos." },
    { id: Tipo.MODIFICACAO, tipo: Tipo.MODIFICACAO, rotulo: "Modificação", marca: "▪", termos: ["mod"],
        descricao: "Empilhamento, efeito e o que ela bloqueia." },
    { id: Tipo.AMPLIFICADORES, tipo: Tipo.AMPLIFICADORES, rotulo: "Amplificadores", marca: "▤", termos: ["amp"],
        descricao: "Lista de amplificadores." },
    { id: Tipo.AMPLIFICADOR, tipo: Tipo.AMPLIFICADOR, rotulo: "Amplificador", marca: "▪", termos: ["amp"],
        descricao: "Empilhamento e efeito." },
    { id: Tipo.ORIGENS, tipo: Tipo.ORIGENS, rotulo: "Origens", marca: "▤", termos: ["orig"],
        descricao: "Cartões de origem: formação, especialidade e saber de campo." },
    { id: Tipo.ORIGEM, tipo: Tipo.ORIGEM, rotulo: "Origem", marca: "▪", termos: ["orig"],
        descricao: "Nome, citação, formação, especialidade e saber de campo." },
    { id: Tipo.TERMOS, tipo: Tipo.TERMOS, rotulo: "Termos", marca: "▤", termos: ["verbetes", "glossario"],
        descricao: "Lista de verbetes curtos." },
    { id: Tipo.TERMO, tipo: Tipo.TERMO, rotulo: "Termo", marca: "▪", termos: ["verbete"],
        descricao: "Nome, rótulo e descrição." },
    { id: Tipo.ROTEIRO, tipo: Tipo.ROTEIRO, rotulo: "Roteiro", marca: "≡", termos: ["etapas", "passos"],
        descricao: "Lista numerada de etapas." },
    { id: Tipo.HABILIDADE_CRIATURA, tipo: Tipo.HABILIDADE_CRIATURA, rotulo: "Habilidade de criatura", marca: "⬦", termos: ["hab"],
        descricao: "Nome, categoria e efeito." },
    { id: Tipo.TABELA, tipo: Tipo.TABELA, rotulo: "Tabela", marca: "▦", termos: ["tab", "linhas"],
        descricao: "Colunas e linhas de texto." },
    { id: Tipo.GRADE, tipo: Tipo.GRADE, rotulo: "Grade", marca: "▦", termos: ["celulas"],
        descricao: "Células de texto em colunas." },
    { id: Tipo.FAIXAS, tipo: Tipo.FAIXAS, rotulo: "Faixas", marca: "≡", termos: ["deslocamento"],
        descricao: "Condição e valor em destaque." },
];

/** Tipos que cabem dentro de `paiTipo` (`null` = raiz do livro), pela tabela de aninhamento do validador. */
export function tiposInseriveis(paiTipo: Tipo | null): Tipo[] {
    // Os filhos de um roteiro dependem da posição (introdução, corpo, conclusão): não se estruturam aqui. Na ficha de
    // criatura só a habilidade de criatura entra, pois a ficha as agrupa pelo tipo.
    if (paiTipo === Tipo.ROTEIRO) return [];
    if (paiTipo === Tipo.FICHA_CRIATURA) return [Tipo.HABILIDADE_CRIATURA];
    const permitidos = paiTipo === null ? LIVRO_RAIZ_PERMITIDA : LIVRO_FILHOS_PERMITIDOS[paiTipo];
    return CATALOGO.map((opcao) => opcao.tipo).filter((tipo) => permitidos.includes(tipo));
}

/** As opções do menu de inserção para um pai (`null` = raiz), já filtradas pelo aninhamento. */
export function opcoesDeInsercao(paiTipo: Tipo | null, restritasA?: readonly Tipo[]): MenuInsercaoOpcao[] {
    const tipos = tiposInseriveis(paiTipo).filter((tipo) => !restritasA || restritasA.includes(tipo));
    return CATALOGO.filter((opcao) => tipos.includes(opcao.tipo))
        .map(({ id, rotulo, descricao, marca, termos }) => ({ id, rotulo, descricao, marca, termos }));
}

/** Campo que recebe o cursor quando a peça nasce. */
export function campoInicialDe(tipo: Tipo): string | null {
    switch (tipo) {
        case Tipo.SECAO: return "titulo";
        case Tipo.HABILIDADE: return "nome";
        case Tipo.EQUIPAMENTO: case Tipo.MODIFICACAO: case Tipo.AMPLIFICADOR: case Tipo.ORIGEM: case Tipo.TERMO: case Tipo.HABILIDADE_CRIATURA: return "nome";
        case Tipo.EQUIPAMENTOS: case Tipo.MODIFICACOES: return "categoria";
        // Nome de classe, subclasse e arquétipo ainda não se edita na tela (m11-08): sem campo para o cursor.
        // O container de amplificadores não tem campo próprio.
        case Tipo.CLASSE: case Tipo.SUBCLASSE: case Tipo.ARQUETIPO: case Tipo.AMPLIFICADORES: case Tipo.ORIGENS: case Tipo.TERMOS: case Tipo.ROTEIRO: case Tipo.FICHA_CRIATURA: case Tipo.TABELA: case Tipo.GRADE: case Tipo.FAIXAS: case Tipo.NIVEIS_AMEACA: return null;
        default: return "trechos";
    }
}

function ordenar(itens: readonly Item[]): Item[] {
    return [...itens].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
}

function rotuloDe(item: Item): string {
    const dados = item.dados as unknown as Record<string, unknown> | null;
    const texto = typeof dados?.["titulo"] === "string" ? dados["titulo"]
        : typeof dados?.["nome"] === "string" ? dados["nome"] : "";
    return texto.replace(/\s+/g, " ").trim();
}

/** A árvore de seções, classes, subclasses e arquétipos, achatada na ordem de leitura. */
export function construirLinhasSumario(itens: readonly Item[]): LinhaSumario[] {
    const porPai = new Map<number | null, Item[]>();
    for (const item of itens) porPai.set(item.pecaPaiId, [...(porPai.get(item.pecaPaiId) ?? []), item]);
    const linhas: LinhaSumario[] = [];
    const visitar = (paiId: number | null, profundidade: number): void => {
        for (const item of ordenar(porPai.get(paiId) ?? [])) {
            if (!TIPOS_DO_SUMARIO.includes(item.tipo)) continue;
            linhas.push({
                id: item.id, identificador: item.identificador, tipo: item.tipo, rotulo: rotuloDe(item),
                profundidade, pecaPaiId: item.pecaPaiId,
            });
            visitar(item.id, profundidade + 1);
        }
    };
    visitar(null, 0);
    return linhas;
}

/** Quantas irmãs que o sumário mostra vêm antes de `item` (a posição dele no sumário, sem contá-lo). */
function posicaoNoSumario(itens: readonly Item[], item: Item): number {
    return ordenar(itens.filter((irma) => irma.pecaPaiId === item.pecaPaiId && irma.id !== item.id
        && TIPOS_DO_SUMARIO.includes(irma.tipo)))
        .filter((irma) => irma.ordem < item.ordem || (irma.ordem === item.ordem && irma.id < item.id)).length;
}

/**
 * Onde cair no `ordem` real das irmãs quando o sumário só mostra algumas delas: antes da irmã de sumário
 * que ocupa a posição, depois da última se a posição for o fim, no fim de tudo se não houver nenhuma.
 */
function indiceReal(itens: readonly Item[], paiId: number | null, movidoId: number, posicaoNoSumario: number): number {
    const todas = ordenar(itens.filter((irma) => irma.pecaPaiId === paiId && irma.id !== movidoId));
    const visiveis = todas.filter((irma) => TIPOS_DO_SUMARIO.includes(irma.tipo));
    if (visiveis.length === 0) return todas.length;
    if (posicaoNoSumario < visiveis.length) return todas.indexOf(visiveis[posicaoNoSumario]);
    return todas.indexOf(visiveis[visiveis.length - 1]) + 1;
}

function caber(movido: Item, paiTipo: Tipo | null): boolean {
    const permitidos = paiTipo === null ? LIVRO_RAIZ_PERMITIDA : LIVRO_FILHOS_PERMITIDOS[paiTipo];
    return permitidos.includes(movido.tipo);
}

interface Recorte {
    readonly movido: Item;
    readonly linha: number;
    readonly restantes: readonly LinhaSumario[];
}

/** A linha da peça movida e o sumário sem ela nem o que ela carrega junto. */
function recortar(itens: readonly Item[], linhas: readonly LinhaSumario[], movidoId: number): Recorte | null {
    const movido = itens.find((item) => item.id === movidoId);
    const linha = linhas.findIndex((candidata) => candidata.id === movidoId);
    if (!movido || linha < 0) return null;
    let fim = linha + 1;
    while (fim < linhas.length && linhas[fim].profundidade > linhas[linha].profundidade) fim++;
    return { movido, linha, restantes: [...linhas.slice(0, linha), ...linhas.slice(fim)] };
}

/**
 * Resolve o destino de uma peça solta na posição `posicao` do sumário (entre as linhas que sobram sem
 * ela) com a profundidade `desejada` (a do arrasto horizontal). Só devolve movimentos que a tabela de
 * aninhamento permite; se a profundidade pedida não cabe, vai para a mais próxima que cabe. Com
 * `exata`, recusa em vez de ajustar (os atalhos de teclado).
 */
export function resolverDestino(
    itens: readonly Item[], linhas: readonly LinhaSumario[], movidoId: number, posicao: number,
    desejada: number, exata = false,
): ResultadoDoDestino {
    const recorte = recortar(itens, linhas, movidoId);
    if (!recorte) return { ok: false, motivo: "A peça não está no sumário." };
    const { movido, restantes } = recorte;
    const ponto = Math.max(0, Math.min(posicao, restantes.length));
    const anterior = restantes[ponto - 1];
    const seguinte = restantes[ponto];
    const minima = seguinte ? seguinte.profundidade : 0;
    const maxima = anterior ? anterior.profundidade + 1 : 0;
    const candidatas: number[] = [];
    for (let profundidade = minima; profundidade <= maxima; profundidade++) candidatas.push(profundidade);
    candidatas.sort((a, b) => Math.abs(a - desejada) - Math.abs(b - desejada) || b - a);

    let recusa = "";
    for (const profundidade of exata ? candidatas.filter((d) => d === desejada) : candidatas) {
        let pai: LinhaSumario | undefined;
        if (profundidade > 0) {
            for (let i = ponto - 1; i >= 0; i--) {
                if (restantes[i].profundidade === profundidade - 1) { pai = restantes[i]; break; }
            }
        }
        const paiId = pai?.id ?? null;
        if (!caber(movido, pai?.tipo ?? null)) {
            recusa = `${NOME_DO_TIPO[movido.tipo] ?? "Esta peça"} não pode ficar dentro de ${
                pai ? (NOME_DO_TIPO[pai.tipo] ?? "esta peça").toLowerCase() : "a raiz do livro"}.`;
            continue;
        }
        const irmaAntes = restantes.slice(0, ponto).filter((linha) => linha.pecaPaiId === paiId).length;
        const indice = indiceReal(itens, paiId, movido.id, irmaAntes);
        const semMudanca = paiId === movido.pecaPaiId && irmaAntes === posicaoNoSumario(itens, movido);
        return { ok: true, destino: { pecaPaiId: paiId, indice, profundidade }, semMudanca };
    }
    return { ok: false, motivo: recusa || "Não há lugar válido para a peça nessa posição." };
}

/** Alternativa por teclado ao arrastar: sobe/desce uma linha, recua (sai do pai) ou avança (entra na irmã de cima). */
export function destinoPorTeclado(
    itens: readonly Item[], linhas: readonly LinhaSumario[], movidoId: number, tecla: TeclaDeEstrutura,
): ResultadoDoDestino {
    const recorte = recortar(itens, linhas, movidoId);
    if (!recorte) return { ok: false, motivo: "A peça não está no sumário." };
    const { linha, restantes } = recorte;
    const profundidade = linhas[linha].profundidade;
    switch (tecla) {
        case "subir": {
            // Troca de lugar com a irmã de cima, mantendo o pai; mudar de pai é com ← e →.
            const paiId = linhas[linha].pecaPaiId;
            let anterior = -1;
            for (let i = linha - 1; i >= 0; i--) {
                if (linhas[i].pecaPaiId === paiId) { anterior = i; break; }
            }
            if (anterior < 0) return { ok: false, motivo: "Já é a primeira dentro do pai. Use Alt + ← para sair dele." };
            return resolverDestino(itens, linhas, movidoId, anterior, profundidade, true);
        }
        case "descer": {
            const paiId = linhas[linha].pecaPaiId;
            let fim = linha + 1;
            while (fim < linhas.length && linhas[fim].profundidade > profundidade) fim++;
            if (fim >= linhas.length || linhas[fim].pecaPaiId !== paiId) {
                return { ok: false, motivo: "Já é a última dentro do pai. Use Alt + ← para sair dele." };
            }
            let depoisDaIrma = fim + 1;
            while (depoisDaIrma < linhas.length && linhas[depoisDaIrma].profundidade > profundidade) depoisDaIrma++;
            return resolverDestino(itens, linhas, movidoId, depoisDaIrma - (fim - linha), profundidade, true);
        }
        case "avancar":
            return resolverDestino(itens, linhas, movidoId, linha, profundidade + 1, true);
        case "recuar": {
            if (profundidade === 0) return { ok: false, motivo: "Já está na raiz do livro." };
            let paiLinha = -1;
            for (let i = linha - 1; i >= 0; i--) {
                if (restantes[i].profundidade === profundidade - 1) { paiLinha = i; break; }
            }
            let depois = paiLinha + 1;
            while (depois < restantes.length && restantes[depois].profundidade > profundidade - 1) depois++;
            return resolverDestino(itens, linhas, movidoId, depois, profundidade - 1, true);
        }
    }
}
