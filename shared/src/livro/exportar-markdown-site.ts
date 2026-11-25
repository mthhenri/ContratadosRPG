import type { LivroVersaoConteudoDto } from "../dtos/livro";
import { exportarLivroEmMarkdown } from "./exportar-markdown";

/**
 * Exportação do livro publicado como arquivo, feita pelo próprio site. O corpo é sempre o de
 * `exportarLivroEmMarkdown` (o mesmo que `npm run regras:exportar` grava em `docs/core/`); o arquivo
 * **não é fonte da verdade**: as regras só mudam pela Oficina.
 *
 * - `COMPLETO`: o corpo exato do exportador (âncoras `{#id}` e comentários `<!-- nota -->`, que preservam a
 *   semântica para quem lê por máquina). Só o cabeçalho de procedência é do site.
 * - `LIMPO`: o mesmo texto sem o que a leitura humana não pede: âncoras de título, comentários HTML, `<br>` em
 *   células e links internos (viram só o texto, pois as âncoras saem).
 */
export type VarianteMarkdownExportadoLivro = "COMPLETO" | "LIMPO";

/** Prefixo do arquivo de cada livro (o mesmo de `docs/core/`: `sistema-v4.1.5.md`). */
export const PREFIXO_DO_ARQUIVO_DO_LIVRO: Readonly<Record<string, string>> = {
  sistema: "sistema",
  guia: "guia_de_mestre",
};

export interface LivroMarkdownExportadoEntradaDto {
  readonly conteudo: LivroVersaoConteudoDto;
  /** Instante da publicação (ISO, UTC), vindo da leitura publicada. */
  readonly publicacaoData: string;
  /** Instante da geração (ISO, UTC); entra por parâmetro para a função continuar pura. */
  readonly geradoEm: string;
  readonly variante: VarianteMarkdownExportadoLivro;
}

export interface LivroMarkdownExportadoDto {
  readonly nome: string;
  readonly texto: string;
}

const LINHA_DE_COMENTARIO = /^<!--.*-->$/;
const TITULO_COM_ANCORA = /^(#{1,6} .*?) \{#[^}\s]+\}$/;
// O primeiro grupo consome pares escapados (`\[`, `\\`), para o `[` escapado nunca abrir um link.
const LINK_INTERNO = /(\\.)|\[((?:\\.|[^\]\\])*)\]\(#[^)\s]*\)/g;
const QUEBRAS_EXCEDENTES = /\n{3,}/g;

/** Texto de uma célula pode conter `<br>`; as demais linhas nunca o têm. */
const ehLinhaDeTabela = (linha: string): boolean => linha.startsWith("|");

/**
 * Remove do Markdown exportado o que só serve a máquina. Age só sobre padrões que o exportador gera: linha
 * inteira de comentário, sufixo `{#âncora}` em título, `<br>` em linha de tabela e link para `#âncora`.
 * Texto de regra nunca contém essas formas soltas: `[` e `]` do conteúdo saem escapados.
 */
export function limparMarkdownExportado(markdown: string): string {
  const linhas = markdown
    .split("\n")
    .filter((linha) => !LINHA_DE_COMENTARIO.test(linha))
    .map((linha) => {
      let atual = linha.replace(TITULO_COM_ANCORA, "$1");
      if (ehLinhaDeTabela(atual)) atual = atual.replace(/<br>/g, " / ");
      return atual.replace(LINK_INTERNO, (_inteiro, escapado: string | undefined, textoDoLink: string) => escapado ?? textoDoLink);
    });
  return `${linhas.join("\n").replace(QUEBRAS_EXCEDENTES, "\n\n").replace(/\n*$/, "")}\n`;
}

function cabecalhoCompleto(entrada: LivroMarkdownExportadoEntradaDto): string {
  const { conteudo } = entrada;
  return `<!-- EXPORTADO pelo site Contratados RPG (publicação atual). NÃO é a fonte da verdade: ` +
    `as regras só mudam pela Oficina das Regras. livro: ${conteudo.codigo}; versão: ${conteudo.numero}; ` +
    `publicada em: ${entrada.publicacaoData}; gerado em: ${entrada.geradoEm} -->`;
}

function cabecalhoLimpo(entrada: LivroMarkdownExportadoEntradaDto): string {
  const { conteudo } = entrada;
  return `> ${conteudo.titulo} · versão ${conteudo.numero} · publicada em ${entrada.publicacaoData.slice(0, 10)} · ` +
    `exportada em ${entrada.geradoEm.slice(0, 10)}. Cópia de leitura: as regras só mudam pela Oficina das Regras.`;
}

/** Monta o nome e o texto do arquivo. Lança se o livro não tem prefixo definido. */
export function montarMarkdownExportadoDoLivro(entrada: LivroMarkdownExportadoEntradaDto): LivroMarkdownExportadoDto {
  const { conteudo, variante } = entrada;
  const prefixo = PREFIXO_DO_ARQUIVO_DO_LIVRO[conteudo.codigo];
  if (!prefixo) throw new Error(`Livro "${conteudo.codigo}" sem arquivo definido para exportação.`);
  const corpo = exportarLivroEmMarkdown(conteudo);
  if (variante === "COMPLETO") {
    return { nome: `${prefixo}-v${conteudo.numero}.md`, texto: `${cabecalhoCompleto(entrada)}\n\n${corpo}` };
  }
  return {
    nome: `${prefixo}-v${conteudo.numero}-limpo.md`,
    texto: `${cabecalhoLimpo(entrada)}\n\n${limparMarkdownExportado(corpo)}`,
  };
}
