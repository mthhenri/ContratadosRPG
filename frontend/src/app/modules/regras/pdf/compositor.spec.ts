import type { NormalizadoConteudo, NormalizadoDocumento, NormalizadoHabilidade } from "@contratados-rpg/shared/livro";
import { NIVEIS_AMEACA } from "../blocos/regras-ameaca.component";
import { comporLivro } from "./compositor";
import { BlocoSemDesenho } from "./despacho";
import { PincelFalso } from "./pincel-falso";
import { NOMES_DE_AMEACA } from "./texto-rico";

const t = (texto: string) => [{ tipo: "texto" as const, texto }];
const habilidade = (nome: string): NormalizadoHabilidade => ({
    tipo: "habilidade", nome, custo: 2, reacao: true, glifo: "◈", trechos: t(`Efeito de ${nome}.`),
});
const secao = (
    nivel: 1 | 2 | 3, titulo: string, filhos: readonly NormalizadoConteudo[],
): NormalizadoConteudo => ({
    tipo: "secao", nivel, glifo: "⬢", titulo, ancora: titulo.toLowerCase().replace(/ /g, "-"), filhos,
});
const FONTE = { cabecalho: [], linhas: [] };

const LIVRO: NormalizadoDocumento = {
    tipo: "documento", id: "sistema", titulo: "Sistema", versao: "9.9.9",
    filhos: [
        { tipo: "abertura", titulo: "Registro oficial", trechos: t("Documento liberado.\n\nBem-vindo.") },
        { tipo: "capa", versao: "VERSÃO 9.9.9", titulo: "Contratados", subtitulo: "- Nova Era -" },
        secao(1, "Introdução", [
            { tipo: "paragrafo", trechos: t("Seja bem-vindo.") },
            { tipo: "lista", ordenada: true, inicio: 3, itens: [[{ tipo: "paragrafo", trechos: t("Terceiro item") }]] },
            { tipo: "nota", trechos: t("Atenção redobrada.") },
            { tipo: "exemplo", trechos: t("Exemplo narrado.") },
            { tipo: "formula", trechos: t("Defesa = 10 + Nível") },
            { tipo: "termos", variante: "penalidades", ...FONTE,
                itens: [{ numero: 4, nome: "Fraqueza", rotulo: "Rótulo", descricao: t("Menos dano.") }] },
        ]),
        secao(1, "Personagem", [
            secao(2, "Classes", [
                { tipo: "classe", nome: "Combatente", ancora: "combatente", ...FONTE,
                    citacao: t("Linha de frente."),
                    saude: { vida: t("30 + VIG"), energia: t("15 + DES") },
                    progressao: { vida: t("+7"), energia: t("+4") },
                    habilidades: [habilidade("Aparar"), habilidade("Berserk")],
                    arquetipos: [{ nome: "Lutador", habilidadeInicial: habilidade("Bruta") }],
                    filhos: [{ tipo: "arquetipos", classe: "Combatente", ...FONTE, arquetipos: [{
                        nome: "Lutador", citacao: t("Corpo a corpo."), atributosBonus: t("+1 em Luta"),
                        habilidades: [habilidade("Devastar")],
                        habilidadesGeraisMelhoradas: [habilidade("Persistir")],
                    }] }] },
            ]),
        ]),
        secao(1, "Equipamentos", [
            { tipo: "equipamentos", categoria: "Corpo a Corpo", ...FONTE, itens: [{
                nome: "Faca", custo: t("$ 500"), descricao: t("Pequena e ágil."), peso: t("1"),
                porte: t("Uma mão"), danos: [{ rotulo: "DANO", trechos: t("1D6") }],
            }] },
            { tipo: "modificacoes", categoria: "Corpo a Corpo", ...FONTE, itens: [{
                nome: "Balanceada", empilhamento: "■□", efeito: t("Recebe um dado."), bloqueia: t("Pesada"),
            }] },
        ]),
    ],
};

/** Todo o texto que o leitor mostra, sem metadados nem o registro bruto das tabelas. */
function palavrasDo(valor: unknown, saida: string[] = []): string[] {
    // `subtitulo`: o autor tirou o "Nova Era" da capa do PDF (25/11/2026).
    const FORA = new Set(["tipo", "ancora", "glifo", "variante", "rotulo", "empilhamento",
        "cabecalho", "linhas", "id", "versao", "subtitulo"]);
    if (typeof valor === "string") {
        saida.push(...valor.replace(/[⬢⬡⬥⬦◈◻■□▢∅⇒]/g, " ").split(/\s+/).filter(Boolean));
    } else if (Array.isArray(valor)) {
        valor.forEach((item) => palavrasDo(item, saida));
    } else if (valor && typeof valor === "object") {
        Object.entries(valor).forEach(([chave, item]) => {
            if (!FORA.has(chave)) palavrasDo(item, saida);
        });
    }
    return saida;
}

describe("Livro em PDF", () => {
    const compor = (documento = LIVRO, sumarioDe?: NormalizadoDocumento) => {
        const pincel = new PincelFalso();
        const livro = comporLivro(documento, { pincel, sumarioDe });
        return { pincel, livro };
    };
    const tudo = (pincel: PincelFalso) => pincel.textos.join(" ").toLocaleUpperCase("pt-BR");

    it("não perde nenhuma palavra do livro", () => {
        const { pincel } = compor();
        const desenhado = tudo(pincel);
        const faltando = palavrasDo(LIVRO.filhos).filter(
            (palavra) => !desenhado.includes(palavra.toLocaleUpperCase("pt-BR")));
        expect(faltando).toEqual([]);
    });

    it("mantém a capa em uma página e o sumário na seguinte", () => {
        const { pincel } = compor();
        expect(pincel.porPagina[0].join(" ")).toContain("Bem-vindo.");
        expect(pincel.porPagina[1].join(" ")).toContain("SUMÁRIO");
    });

    // Capa escolhida pelo autor no configurador (25/11/2026).
    const naCapa = (pincel: PincelFalso) => (texto: string) =>
        pincel.posicoes.find((posicao) => posicao.texto.includes(texto))!;

    it("monta a capa com registro, logo, nome e a barra do livro no pé, sem o subtítulo", () => {
        const pincel = new PincelFalso();
        comporLivro(LIVRO, { pincel, logo: "data:logo" });
        const onde = naCapa(pincel);
        expect(pincel.porPagina[0].join(" ")).not.toContain("Nova Era");
        const [logo] = pincel.imagens;
        expect(logo.largura).toBe(110);
        expect(onde("Documento").y).toBeLessThan(logo.y);
        expect(onde("CONTRATADOS").y).toBeGreaterThan(logo.y + logo.altura);
        expect(onde("SISTEMA · VERSÃO 9.9.9").y).toBeGreaterThan(270);
        expect(onde("SISTEMA · VERSÃO 9.9.9").estilo.tamanho).toBe(13);
    });

    it("carimba o registro oficial: inclinado, centrado e sem fundo", () => {
        const { pincel } = compor();
        expect(pincel.giros).toHaveLength(1);
        expect(pincel.giros[0].graus).toBe(2);
        const carimbado = pincel.giros[0].textos.join(" ");
        expect(carimbado).toContain("Bem-vindo.");
        expect(carimbado).not.toContain("CONTRATADOS");
        for (const texto of ["Documento liberado.", "Bem-vindo."]) {
            const posicao = naCapa(pincel)(texto);
            expect(posicao.x + pincel.medir(posicao.texto, posicao.estilo) / 2).toBeCloseTo(105, 0);
        }
        // Só a linha vermelha do topo é preenchida.
        expect(pincel.preenchidos).toHaveLength(1);
    });

    it("escreve o nome na fonte das Backrooms, e no mono quando ela não tem a letra", () => {
        expect(naCapa(compor().pincel)("CONTRATADOS").estilo.familia).toBe("backrooms");
        const acentuado = { ...LIVRO, filhos: [LIVRO.filhos[0],
            { tipo: "capa" as const, titulo: "Contratação", subtitulo: "" }, ...LIVRO.filhos.slice(2)] };
        expect(naCapa(compor(acentuado).pincel)("CONTRATAÇÃO").estilo.familia).toBe("mono");
    });

    it("leva no sumário a página em que cada capítulo ficou", () => {
        const { pincel, livro } = compor();
        const pagina = livro.paginaDaAncora.get("equipamentos")!;
        expect(pincel.porPagina[pagina - 1].join(" ")).toContain("EQUIPAMENTOS");
        expect(pincel.porPagina[1]).toContain(String(pagina));
        expect(pincel.linksDePagina).toContain(pagina);
        expect(pincel.marcadores).toContainEqual({ titulo: "Equipamentos", pagina });
        expect(livro.paginas).toBe(pincel.paginas);
    });

    it("marca sem número a entrada que ficou fora do recorte", () => {
        const recorte = { ...LIVRO, filhos: LIVRO.filhos.slice(0, 3) };
        const { pincel } = compor(recorte, LIVRO);
        expect(pincel.porPagina[1]).toContain("··");
        expect(pincel.porPagina[1].join(" ")).toContain("Equipamentos");
    });

    it("termina com o crédito da licença do logo", () => {
        const { pincel } = compor();
        expect(pincel.porPagina[pincel.paginas - 1].join(" ")).toContain("CC BY-SA 3.0");
    });

    it("acusa o bloco que ainda não tem desenho em vez de engolir", () => {
        const comTipoNovo = { ...LIVRO, filhos: [secao(1, "X", [
            { tipo: "inventado" } as unknown as NormalizadoConteudo])] };
        expect(() => compor(comTipoNovo)).toThrow(BlocoSemDesenho);
    });

    it("usa os mesmos níveis de ameaça do leitor", () => {
        expect(NOMES_DE_AMEACA).toEqual(NIVEIS_AMEACA);
    });
});
