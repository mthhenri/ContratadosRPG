import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { LivroPecaDto, LivroTrechoDto, LivroVersaoConteudoDto } from "../dtos/livro";
import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";
import { exportarLivroEmMarkdown } from "./exportar-markdown";
import { limparMarkdownExportado, montarMarkdownExportadoDoLivro } from "./exportar-markdown-site";

const texto = (valor: string): LivroTrechoDto => ({ tipo: "texto", texto: valor });
let contador = 0;
const peca = (tipo: Tipo, dados: unknown, filhos: LivroPecaDto[] = [], ancora: string | null = null): LivroPecaDto => ({
  identificador: `id-${++contador}`, ancora, tipo, ordem: 0, dados: dados as never, filhos,
});
const secao = (titulo: string, nivel: 1 | 2 | 3 | 4, filhos: LivroPecaDto[], ancora: string | null = null) =>
  peca(Tipo.SECAO, { titulo, nivel, glifo: nivel === 1 ? "⬢" : "⬡" }, filhos, ancora);
const livro = (pecas: LivroPecaDto[], codigo = "sistema"): LivroVersaoConteudoDto => ({
  formato: 1, codigo, titulo: "Sistema", subtitulo: null, numero: "4.1.5", pecas,
} as LivroVersaoConteudoDto);

const conteudoRico = (): LivroVersaoConteudoDto => livro([
  secao("Introdução", 1, [
    peca(Tipo.PARAGRAFO, { trechos: [texto("Veja "), { tipo: "link-interno", texto: "Testes", ancora: "testes" }, texto(".")] }),
    peca(Tipo.NOTA, { trechos: [texto("Cuidado com o crítico.")] }),
    peca(Tipo.EXEMPLO, { trechos: [texto("Exemplo de teste.")] }),
    peca(Tipo.TABELA, {
      cabecalho: [[texto("Nome")], [texto("Valor")]],
      linhas: [[[texto("A"), { tipo: "texto", texto: "x\ny" }], [texto("1")]]],
      emPares: true,
    }),
    secao("Testes", 2, [peca(Tipo.PARAGRAFO, { trechos: [texto("Role dados.")] })], "testes"),
  ], "introducao"),
]);

const entrada = (variante: "COMPLETO" | "LIMPO", conteudo = conteudoRico()) => ({
  conteudo, publicacaoData: "2026-10-23T14:30:00.000Z", geradoEm: "2026-11-25T09:00:00.000Z", variante,
});

describe("montarMarkdownExportadoDoLivro", () => {
  it("COMPLETO: cabeçalho de procedência e, depois dele, o corpo exato do exportador", () => {
    const conteudo = conteudoRico();
    const { nome, texto: arquivo } = montarMarkdownExportadoDoLivro(entrada("COMPLETO", conteudo));
    expect(nome).toBe("sistema-v4.1.5.md");
    const [cabecalho, ...resto] = arquivo.split("\n\n");
    expect(cabecalho).toContain("NÃO é a fonte da verdade");
    expect(cabecalho).toContain("versão: 4.1.5");
    expect(cabecalho).toContain("publicada em: 2026-10-23T14:30:00.000Z");
    expect(resto.join("\n\n")).toBe(exportarLivroEmMarkdown(conteudo));
  });

  it("usa o prefixo do Guia e rejeita livro sem prefixo", () => {
    expect(montarMarkdownExportadoDoLivro(entrada("COMPLETO", livro([], "guia"))).nome).toBe("guia_de_mestre-v4.1.5.md");
    expect(() => montarMarkdownExportadoDoLivro(entrada("COMPLETO", livro([], "outro")))).toThrow(/sem arquivo/);
  });

  it("LIMPO: sem âncoras, comentários HTML, <br> e links internos, e com cabeçalho legível", () => {
    const { nome, texto: arquivo } = montarMarkdownExportadoDoLivro(entrada("LIMPO"));
    expect(nome).toBe("sistema-v4.1.5-limpo.md");
    expect(arquivo.startsWith("> Sistema · versão 4.1.5 · publicada em 2026-10-23 · exportada em 2026-11-25.")).toBe(true);
    expect(arquivo).not.toMatch(/<!--|<br>|\{#|\]\(#/);
    expect(arquivo).toContain("## ⬢ Introdução\n");
    expect(arquivo).toContain("### ⬡ Testes\n");
    expect(arquivo).toContain("Veja Testes.");
    expect(arquivo).toContain("Cuidado com o crítico.");
    expect(arquivo).toContain("| Ax / y | 1 |");
  });
});

describe("limparMarkdownExportado", () => {
  it("é idempotente e termina com uma quebra de linha", () => {
    const bruto = exportarLivroEmMarkdown(conteudoRico());
    const uma = limparMarkdownExportado(bruto);
    expect(limparMarkdownExportado(uma)).toBe(uma);
    expect(uma.endsWith("\n")).toBe(true);
    expect(uma.endsWith("\n\n")).toBe(false);
  });

  it("não deixa mais de uma linha em branco seguida depois de remover um comentário isolado", () => {
    expect(limparMarkdownExportado("A\n\n<!-- origens -->\n\nB\n")).toBe("A\n\nB\n");
  });

  it("preserva links externos, texto escapado e títulos sem âncora", () => {
    const bruto = "## Título\n\n[site](https://exemplo.com) e \\[colchete\\] e [vai](#ancora)\n";
    expect(limparMarkdownExportado(bruto)).toBe("## Título\n\n[site](https://exemplo.com) e \\[colchete\\] e vai\n");
  });
});

/**
 * Conferência contra a cópia real de `docs/core/` (gerada do banco): o corpo exportado pelo site, na variante
 * limpa, não pode manter nada que a variante promete remover.
 */
describe("variante limpa sobre os livros reais de docs/core", () => {
  const raiz = fileURLToPath(new URL("../../../docs/core/", import.meta.url));
  const arquivos = (() => {
    try {
      return ["sistema", "guia_de_mestre"].map((prefixo) => {
        const nome = readdirSync(raiz).find((item) => item.startsWith(`${prefixo}-v`));
        return nome ? readFileSync(`${raiz}${nome}`, "utf8").replace(/\r\n/g, "\n") : null;
      });
    } catch {
      return [null, null];
    }
  })();

  it.each([["Sistema", 0], ["Guia", 1]])("%s: nenhuma marca de máquina sobra", (_rotulo, indice) => {
    const completo = arquivos[indice];
    expect(completo, "cópia gerada em docs/core").toBeTruthy();
    if (!completo) return;
    const corpo = completo.replace(/^<!--.*?-->\n\n/, "");
    const limpo = limparMarkdownExportado(corpo);
    expect(limpo).not.toMatch(/^<!--.*-->$/m);
    expect(limpo).not.toMatch(/^#{1,6} .* \{#[^}]+\}$/m);
    expect(limpo).not.toMatch(/\]\(#/);
    expect(limpo).not.toMatch(/^\|.*<br>/m);
    expect(limpo).not.toMatch(/\n{3,}/);
    expect(limpo.length).toBeGreaterThan(corpo.length * 0.8);
  });
});
