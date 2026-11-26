import type {
    NormalizadoConteudo, NormalizadoDocumento, NormalizadoHabilidade,
} from "@contratados-rpg/shared/livro";
import { comporLivro } from "./compositor";
import { palavrasPerdidas } from "./palavras-do-livro";
import { PincelFalso } from "./pincel-falso";
import type { EstiloTexto } from "./pincel";
import { PALETA_PDF } from "./paleta";
import { largurasAutomaticas } from "./tabela";

const t = (texto: string) => [{ tipo: "texto" as const, texto }];
const habilidade = (nome: string): NormalizadoHabilidade => ({
    tipo: "habilidade", nome, custo: 1, reacao: false, glifo: "◈", trechos: t(`Efeito de ${nome}.`),
});
const FONTE = { cabecalho: [], linhas: [] };
const paragrafo = (texto: string): NormalizadoConteudo => ({ tipo: "paragrafo", trechos: t(texto) });
const secao = (
    titulo: string, filhos: readonly NormalizadoConteudo[], nivel: 1 | 2 | 3 | 4 = 1,
): NormalizadoConteudo => ({
    tipo: "secao", nivel, glifo: "⬢", titulo, ancora: titulo.toLowerCase().replace(/\W+/g, "-"), filhos,
});

const SISTEMA: readonly NormalizadoConteudo[] = [
    { tipo: "tabela", cabecalho: [t("Patente"), t("Salário")], linhas: [[t("Agente"), t("$ 1000")]] },
    { tipo: "tabela", cabecalho: [], linhas: [[t("Irrelevante"), t("Desconhecidos")]] },
    { tipo: "grade", colunas: 3, cabecalho: [t("DT 5 fácil"), t("DT 10 normal")], linhas: [[t("DT 20 difícil"), []]] },
    { tipo: "grade", colunas: 2, cabecalho: [t("Módulo V"), t("Módulo IV")], linhas: [[t("Arma leve"), t("Arma pesada")]] },
    { tipo: "grade", colunas: 2, ...FONTE, referencia: { tipo: "saude", itens: [
        { rotulo: "VIDA", conteudo: t("Inicial = 10"), nota: "Progressão: VIG", variante: "vida" }] } },
    { tipo: "grade", colunas: 3, ...FONTE, referencia: { tipo: "cartoes", titulo: "Alcances", itens: [
        { rotulo: "Curto", conteudo: t("De dois metros.") }] } },
    { tipo: "faixas", ...FONTE, itens: [{ rotulo: "Destreza baixa", valor: "8 Metros" }] },
    { tipo: "origens", ...FONTE, origens: [{ nome: "Bombeiro", citacao: t("Fumaça."), formacao: t("+3 Químico +1 dado"),
        especialidade: t("Carregar aliados."), saberCampo: t("Resgate urbano.") }] },
    { tipo: "amplificadores", ...FONTE, itens: [{ nome: "Atento", empilhamento: "■□", efeito: t("Iniciativa.") }] },
    { tipo: "modulos", ...FONTE, modulos: [{ nivel: "IV", energiaMaxima: 7 }] },
    { tipo: "niveis-ameaca", ...FONTE, niveis: [{ nivel: 1, referenciaImagem: "image1", descricao: t("Perigo real.") }] },
    { tipo: "subclasse", nome: "Bestial", ancora: "bestial", classe: "Combatente", ...FONTE, citacao: t("Extremo."),
        custos: [t("Dobro de sequelas.")], saude: { vida: t("30"), energia: t("22") },
        progressao: { vida: t("9"), energia: t("4") }, atributosBonus: t("+1 em Força +1 em Vigor"),
        habilidadeInicial: habilidade("Garras"), habilidades: [habilidade("Rugido"), habilidade("Faro")] },
    { tipo: "generico", motivo: "importação", trechos: [], origemMarkdown: "Trecho cru." },
];

const ATRIBUTOS = {
    tipo: "atributos" as const, ...FONTE,
    atributos: [{ nome: "Força", valor: 3, modificador: "Médio", bonus: "+9" }],
};
const IDENTIDADE = {
    tipo: "identidade" as const, ...FONTE,
    campos: [{ rotulo: "Designação", valor: t("A Estátua") }, { rotulo: "Conceito", valor: t("Imóvel quando vista.") },
        { rotulo: "NA", valor: t("Alta"), nivel: 3 }],
};
const GUIA: readonly NormalizadoConteudo[] = [
    { tipo: "roteiro", etapas: [{ ordem: 1, titulo: t("Ficha de Identidade"), descricao: t("Designação e conceito.") }],
        introducao: [paragrafo("Ordem de decisão.")], filhos: [paragrafo("Revise ao final.")] },
    { tipo: "ficha-criatura", nome: "Estátua Viva", identidade: IDENTIDADE, atributos: ATRIBUTOS,
        vidaMaxima: "1.050", defesaBase: "30", resistencias: t("Resistências escolhidas: Físico 36"),
        fraquezas: t("Químico"), regeneracao: t("Nenhuma"), porte: t("Médio"), deslocamento: t("Dez metros"),
        cadencia: "2 por rodada",
        ataques: [{ nome: "Estrangular", acao: "Padrão", teste: "Luta", dano: "4D8", efeito: t("Agarra o alvo.") }],
        habilidades: [{ tipo: "habilidade-criatura", nome: "Imobilidade", categoria: "PASSIVA",
            rotulo: "Imobilidade [Passiva]", trechos: t("Parada sob contato visual.") }],
        filhos: [secao("Identidade", [], 3), secao("Atributos", [paragrafo("Base pela VD.")], 3),
            secao("Ações, Ataques e Habilidades", [paragrafo("Habilidades Especiais"),
                paragrafo("Estrangular | Padrão | repetido"), paragrafo("Nota das ações.")], 3)] },
];

const documento = (filhos: readonly NormalizadoConteudo[]): NormalizadoDocumento => ({
    tipo: "documento", id: "sistema", titulo: "Sistema", versao: "9.9.9", filhos: [secao("Capítulo", filhos)],
});

describe("Blocos do PDF", () => {
    const compor = (filhos: readonly NormalizadoConteudo[]) => {
        const pincel = new PincelFalso();
        const livro = comporLivro(documento(filhos), { pincel });
        return { pincel, livro };
    };

    it("não perde palavra nenhuma dos blocos do Sistema", () => {
        expect(palavrasPerdidas(SISTEMA, compor(SISTEMA).pincel.textos)).toEqual([]);
    });

    it("não perde palavra nenhuma dos blocos do Guia", () => {
        const { pincel } = compor(GUIA);
        const perdidas = palavrasPerdidas(GUIA, pincel.textos);
        // O parágrafo que só repete o ataque não é redesenhado (como no leitor).
        expect(perdidas).toEqual(["|", "repetido"]);
    });

    it("começa a subclasse em página nova", () => {
        const { pincel } = compor(SISTEMA);
        const pagina = pincel.porPagina.find((textos) => textos.includes("Bestial"))!;
        expect(pagina.join(" ")).not.toContain("Patente");
    });

    it("não repete na ficha o que o texto de apoio da seção já diz", () => {
        const [roteiro, ficha] = GUIA;
        const comApoio = { ...ficha, filhos: [
            secao("Saúde, Defesa e Resistências",
                [paragrafo("Vida Máxima: 1.050. Defesa Base: 30. Resistências escolhidas: Físico 36. "
                    + "Fraquezas: Químico.")], 3),
            secao("Regeneração e Deslocamento",
                [paragrafo("Regeneração Nenhuma. Porte Médio. Deslocamento Dez metros.")], 3),
            secao("Ações, Ataques e Habilidades", [paragrafo("Cadência: 2 por rodada.")], 3),
        ] } as NormalizadoConteudo;
        const texto = compor([roteiro, comApoio]).pincel.textos.join(" ");
        for (const unico of ["1.050", "Físico", "Nenhuma", "metros", "rodada"]) {
            expect(texto.split(unico).length - 1).toBe(1);
        }
    });

    it("mostra os campos da ficha quando a seção não tem texto", () => {
        expect(compor(GUIA).pincel.textos.join(" ")).toContain("VIDA MÁXIMA");
    });

    /** Três arquétipos com `quantidade` habilidades de descrição longa cada. */
    const arquetipos = (quantidade: number): NormalizadoConteudo => ({
        tipo: "arquetipos", classe: "Suporte", ...FONTE,
        arquetipos: ["Um", "Dois", "Três"].map((nome) => ({
            nome, citacao: t("Citação."), atributosBonus: t("+1"), habilidadesGeraisMelhoradas: [],
            habilidades: Array.from({ length: quantidade }, (_, indice) => ({
                ...habilidade(`${nome}${indice}`), trechos: t("palavra ".repeat(22).trim()),
            })),
        })),
    });
    const paginasComHabilidades = (pincel: PincelFalso) =>
        pincel.porPagina.filter((textos) => textos.join("").includes("palavra")).length;
    const corpoDaDescricao = (pincel: PincelFalso) =>
        pincel.posicoes.find((posicao) => posicao.texto.startsWith("palavra"))!.estilo.tamanho;

    it("aperta a letra o necessário para os três arquétipos caberem numa página", () => {
        const { pincel } = compor([paragrafo("Antes."), arquetipos(10)]);
        expect(paginasComHabilidades(pincel)).toBe(1);
        expect(corpoDaDescricao(pincel)).toBeLessThan(8.4);
        expect(corpoDaDescricao(pincel)).toBeGreaterThanOrEqual(7.3);
    });

    it("mantém a letra normal quando os arquétipos já cabem, ou quando nem apertando caberiam", () => {
        expect(corpoDaDescricao(compor([arquetipos(3)]).pincel)).toBe(8.4);
        const { pincel } = compor([arquetipos(30)]);
        expect(corpoDaDescricao(pincel)).toBe(8.4);
        expect(paginasComHabilidades(pincel)).toBeGreaterThan(1);
    });

    const paginaCom = (pincel: PincelFalso, texto: string) =>
        pincel.porPagina.findIndex((textos, indice) => indice > 1 && textos.includes(texto));
    const classe = {
        tipo: "classe", nome: "Combatente", ancora: "combatente", ...FONTE, citacao: t("Frente."),
        saude: { vida: t("30"), energia: t("15") }, progressao: { vida: t("7"), energia: t("4") },
        arquetipos: [], habilidades: [habilidade("Aparar")],
    } as NormalizadoConteudo;

    it("leva para a página nova o título que anuncia o bloco que a força", () => {
        const { pincel } = compor([paragrafo("Antes."), secao("Classes", [classe], 2)]);
        expect(paginaCom(pincel, "Classes")).toBe(paginaCom(pincel, "Combatente"));
        expect(paginaCom(pincel, "Antes.")).toBeLessThan(paginaCom(pincel, "Combatente"));
    });

    it("não deixa o título do capítulo sozinho quando ele abre com arquétipos", () => {
        const { pincel } = compor([arquetipos(2)]);
        expect(paginaCom(pincel, "CAPÍTULO")).toBe(paginaCom(pincel, "Arquétipos · Suporte"));
    });

    it("desenha o que vem antes do primeiro capítulo, inclusive um segundo registro", () => {
        const pincel = new PincelFalso();
        const livro = documento([paragrafo("Corpo.")]);
        comporLivro({ ...livro, filhos: [
            { tipo: "abertura", titulo: "Registro", trechos: t("Primeiro registro.") },
            { tipo: "capa", titulo: "Contratados", subtitulo: "" },
            { tipo: "abertura", titulo: "Aviso", trechos: t("Segundo registro.") },
            { tipo: "nota", trechos: t("Nota solta.") },
            ...livro.filhos,
        ] }, { pincel });
        const tudo = pincel.textos.join(" ");
        expect(tudo).toContain("Segundo registro.");
        expect(tudo).toContain("Nota solta.");
        expect(tudo.split("Primeiro registro.").length - 1).toBe(1);
    });

    it("não esconde o campo curto da ficha só porque a palavra aparece noutro assunto", () => {
        const [roteiro, ficha] = GUIA;
        const comApoio = { ...ficha, filhos: [secao("Regeneração e Deslocamento",
            [paragrafo("Regeneração Nenhuma. O deslocamento dela é de tamanho médio.")], 3)] };
        const texto = compor([roteiro, comApoio as NormalizadoConteudo]).pincel.textos.join(" ");
        expect(texto).toContain("Porte:");
    });

    it("reconhece como já dito o valor curto que traz o próprio nome do campo", () => {
        const [roteiro, ficha] = GUIA;
        const comApoio = { ...ficha, fraquezas: t("Fraquezas: Explosão: 26."),
            filhos: [secao("Saúde, Defesa e Resistências",
                [paragrafo("Fraquezas: Explosão: 26.")], 3)] };
        const texto = compor([roteiro, comApoio as NormalizadoConteudo]).pincel.textos.join(" ");
        expect(texto.split("Explosão").length - 1).toBe(1);
    });

    it("leva ao sumário as seções de dentro da ficha de criatura", () => {
        expect(compor(GUIA).livro.paginaDaAncora.has("atributos")).toBe(true);
    });

    it("dá a cada coluna a largura que o texto pede, sem passar do total", () => {
        const pincel = new PincelFalso();
        const estilo: EstiloTexto = { familia: "sans", tamanho: 10, cor: PALETA_PDF.texto };
        const celula = (texto: string) => [{ texto, estilo }];
        const [curta, longa] = largurasAutomaticas(pincel, [
            [celula("DT"), celula("uma descrição bem comprida que precisa de várias linhas para caber na folha")],
        ], 100);
        expect(curta + longa).toBeCloseTo(100);
        expect(curta).toBeLessThan(20);
    });
});
