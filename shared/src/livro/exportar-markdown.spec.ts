import { describe, expect, it } from "vitest";
import type { LivroPecaDto, LivroTrechoDto, LivroVersaoConteudoDto } from "../dtos/livro";
import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";
import { exportarLivroEmMarkdown } from "./exportar-markdown";

const texto = (valor: string): LivroTrechoDto => ({ tipo: "texto", texto: valor });
let contador = 0;
const peca = (tipo: Tipo, dados: unknown, filhos: LivroPecaDto[] = [], ancora: string | null = null): LivroPecaDto => ({
  identificador: `id-${++contador}`, ancora, tipo, ordem: 0, dados: dados as never, filhos,
});
const livro = (pecas: LivroPecaDto[]): LivroVersaoConteudoDto => ({
  formato: 1, codigo: "sistema", titulo: "Contratados", subtitulo: "- Nova Era -", numero: "4.1.4", pecas,
});
const secao = (titulo: string, nivel: 1 | 2 | 3 | 4, filhos: LivroPecaDto[], ancora: string | null = null) =>
  peca(Tipo.SECAO, { titulo, nivel, glifo: nivel === 1 ? "⬢" : "⬡" }, filhos, ancora);
const paragrafo = (...trechos: LivroTrechoDto[]) => peca(Tipo.PARAGRAFO, { trechos });

describe("exportarLivroEmMarkdown (m11-10)", () => {
  it("abre com o título e o subtítulo do livro e termina com uma quebra de linha", () => {
    const saida = exportarLivroEmMarkdown(livro([]));
    expect(saida).toBe("# Contratados\n\n*- Nova Era -*\n");
  });

  it("seções viram títulos (nível 1 → ##) com glifo e âncora; o parágrafo vem logo abaixo", () => {
    const saida = exportarLivroEmMarkdown(livro([
      secao("Introdução", 1, [secao("Testes", 2, [paragrafo(texto("Role dados."))], "testes")], "introducao"),
    ]));
    expect(saida).toContain("## ⬢ Introdução {#introducao}\n\n### ⬡ Testes {#testes}\n\nRole dados.\n");
  });

  it("formata negrito, itálico, tarja e link, e escapa o que quebraria o Markdown", () => {
    const saida = exportarLivroEmMarkdown(livro([paragrafo(
      texto("a * b _ c [d] "),
      { tipo: "negrito", filhos: [texto("forte")] },
      texto(" "),
      { tipo: "italico", filhos: [texto("leve ")] },
      { tipo: "tarja", comprimento: 4 },
      { tipo: "link-interno", texto: "Testes", ancora: "testes" },
    )]));
    expect(saida).toContain("a \\* b \\_ c \\[d\\] **forte** *leve* ████[Testes](#testes)");
  });

  it("devolve o tachado como ~~ e deixa o espaço de borda fora do marcador", () => {
    const saida = exportarLivroEmMarkdown(livro([paragrafo(
      texto("é "),
      { tipo: "tachado", filhos: [texto("torturar ")] },
      texto("divertir"),
    )]));
    expect(saida).toContain("é ~~torturar~~ divertir");
  });

  it("exemplo, nota e fórmula levam uma marca em comentário; listas aninham", () => {
    const saida = exportarLivroEmMarkdown(livro([
      peca(Tipo.EXEMPLO, { trechos: [texto("Um exemplo.")] }),
      peca(Tipo.NOTA, { trechos: [texto("Uma nota.")] }),
      peca(Tipo.LISTA, {
        ordenada: false, inicio: 1,
        itens: [
          [{ tipo: "paragrafo", trechos: [texto("um")] }, { tipo: "lista", ordenada: true, inicio: 3, itens: [[{ tipo: "paragrafo", trechos: [texto("fundo")] }]] }],
          [{ tipo: "paragrafo", trechos: [texto("dois")] }],
        ],
      }),
    ]));
    expect(saida).toContain("<!-- exemplo -->\nUm exemplo.");
    expect(saida).toContain("<!-- nota -->\nUma nota.");
    expect(saida).toContain("- um\n  3. fundo\n- dois");
  });

  it("tabela vira tabela de pipes sem quebrar com | ou células faltando", () => {
    const saida = exportarLivroEmMarkdown(livro([peca(Tipo.TABELA, {
      cabecalho: [[texto("A")], [texto("B")]],
      linhas: [[[texto("x | y")]], [[texto("1")], [texto("2")]]],
    })]));
    expect(saida).toContain("| A | B |\n| --- | --- |\n| x \\| y |  |\n| 1 | 2 |");
  });

  it("habilidade traz glifo, nome, custo e reação; a de classe sai agrupada sob a classe", () => {
    const habilidade = (nome: string, extra: object = {}) =>
      peca(Tipo.HABILIDADE, { nome, custo: 3, reacao: false, glifo: "◈", trechos: [texto("Faz algo.")], ...extra });
    const saida = exportarLivroEmMarkdown(livro([secao("Classes", 2, [peca(Tipo.CLASSE, {
      nome: "Combatente", citacao: [texto("“Ofensiva.”")],
      saude: { vida: [texto("30")], energia: [texto("15")] }, progressao: { vida: [texto("7")], energia: [texto("4")] },
      cabecalho: [], linhas: [],
    }, [
      habilidade("Aparar", { reacao: true }),
      peca(Tipo.ARQUETIPO, { nome: "Lutador", citacao: [], atributosBonus: [texto("+1 em Luta")] }, [
        habilidade("Força Bruta", { custo: 4, inicial: true }),
        habilidade("Golpe"),
      ]),
    ], "combatente")])]));
    expect(saida).toContain("### Combatente {#combatente}");
    expect(saida).toContain("**◈ Aparar** [3 E] (Reação) Faz algo.");
    expect(saida).toContain("#### Lutador");
    expect(saida).toContain("**⬦ Habilidade Inicial**\n\n**◈ Força Bruta** [4 E] Faz algo.");
    expect(saida).toContain("**⬦ Habilidades de Arquétipo**\n\n**◈ Golpe** [3 E] Faz algo.");
  });

  it("parágrafo que começa com marcador de bloco não vira citação, título nem lista", () => {
    const saida = exportarLivroEmMarkdown(livro([
      paragrafo(texto(">>>> Registro")), paragrafo(texto("1. primeiro passo")), paragrafo(texto("+ 5 Fragmentos")),
      paragrafo(texto("- item solto")), paragrafo(texto("# não é título")), paragrafo(texto("1.5 metros")),
    ]));
    expect(saida).toContain("\\>>>> Registro");
    expect(saida).toContain("1\\. primeiro passo");
    expect(saida).toContain("\\+ 5 Fragmentos");
    expect(saida).toContain("\\- item solto");
    expect(saida).toContain("\\# não é título");
    expect(saida).toContain("\n1.5 metros");
  });

  it("a mesma fotografia gera exatamente o mesmo texto", () => {
    const entrada = livro([secao("Introdução", 1, [paragrafo(texto("Olá."))])]);
    expect(exportarLivroEmMarkdown(entrada)).toBe(exportarLivroEmMarkdown(entrada));
  });
});
