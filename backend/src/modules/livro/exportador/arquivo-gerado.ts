import { createHash } from "node:crypto";
import type { LivroVersaoConteudoDto } from "@contratados-rpg/shared/dtos/livro";
import { exportarLivroEmMarkdown } from "@contratados-rpg/shared/livro";

/** Prefixo do arquivo de cada livro em `docs/core/` (o mesmo que o importador procura). */
export const PREFIXO_DO_ARQUIVO: Readonly<Record<string, string>> = {
  sistema: "sistema",
  guia: "guia_de_mestre",
};

export interface ArquivoGerado {
  /** Ex.: `sistema-v4.1.4.md`. */
  readonly nome: string;
  readonly texto: string;
}

const MARCA = /^<!-- GERADO por "npm run regras:exportar" .*? livro: ([\w-]+); versão: ([\w.-]+); sha256 do corpo: ([0-9a-f]{64}) -->\n\n/;
const QUEBRA_CRLF = /\r\n/g;

const sha256 = (texto: string): string => createHash("sha256").update(texto, "utf8").digest("hex");

/**
 * Monta a cópia gerada de um livro publicado: o cabeçalho "não edite" (com o hash do corpo, para a
 * verificação acusar edição à mão sem consultar o banco) e o Markdown do livro. Determinística:
 * nada no arquivo depende de data, id de banco ou máquina.
 */
export function montarArquivoGerado(conteudo: LivroVersaoConteudoDto): ArquivoGerado {
  const prefixo = PREFIXO_DO_ARQUIVO[conteudo.codigo];
  if (!prefixo) throw new Error(`Livro "${conteudo.codigo}" sem arquivo definido em docs/core/.`);
  const corpo = exportarLivroEmMarkdown(conteudo);
  const cabecalho =
    `<!-- GERADO por "npm run regras:exportar" a partir do banco (Oficina das Regras). ` +
    `NÃO EDITE À MÃO: altere o livro pela Oficina, publique e exporte de novo. ` +
    `livro: ${conteudo.codigo}; versão: ${conteudo.numero}; sha256 do corpo: ${sha256(corpo)} -->`;
  return { nome: `${prefixo}-v${conteudo.numero}.md`, texto: `${cabecalho}\n\n${corpo}` };
}

export type ConferenciaDoArquivo =
  | { readonly ok: true; readonly livro: string; readonly versao: string }
  | { readonly ok: false; readonly motivo: string };

/** Confere o cabeçalho e o hash de um arquivo gerado: falha se faltar a marca ou se o corpo mudou. */
export function conferirArquivoGerado(textoLido: string): ConferenciaDoArquivo {
  // O Git no Windows pode trazer CRLF; o hash é do texto com quebras LF.
  const texto = textoLido.replace(QUEBRA_CRLF, "\n");
  const encontrada = MARCA.exec(texto);
  if (!encontrada) return { ok: false, motivo: "cabeçalho de arquivo gerado ausente ou alterado" };
  const [cabecalho, livro, versao, hash] = encontrada;
  if (sha256(texto.slice(cabecalho.length)) !== hash) {
    return { ok: false, motivo: "o corpo difere do exportado (editado à mão?)" };
  }
  return { ok: true, livro, versao };
}
