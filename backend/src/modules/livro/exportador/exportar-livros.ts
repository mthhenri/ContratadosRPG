import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LivroVersaoConteudoDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoLivroVersaoSituacaoEnum } from "@contratados-rpg/shared/enums";
import type { LivroRepository } from "../livro.repository";
import type { LivroVersaoRepository } from "../livro-versao.repository";
import { type ArquivoGerado, PREFIXO_DO_ARQUIVO, montarArquivoGerado } from "./arquivo-gerado";

/** Livros exportados, na ordem em que aparecem no resumo. */
export const LIVROS_EXPORTADOS = ["sistema", "guia"] as const;

export interface DependenciasExportacao {
  readonly livros: Pick<LivroRepository, "recuperarLivro">;
  readonly versoes: Pick<LivroVersaoRepository, "recuperarVersaoAtual">;
}

export interface ResultadoDaExportacao {
  readonly gravados: readonly string[];
  readonly removidos: readonly string[];
  /** Arquivos que já estavam iguais ao exportado. */
  readonly iguais: readonly string[];
  /** Só no modo `conferir`: o que divergiria e por quê. */
  readonly divergencias: readonly string[];
}

const SEM_CRLF = /\r\n/g;
const normalizar = (texto: string): string => texto.replace(SEM_CRLF, "\n");

/** A fotografia PUBLICADA mais recente de cada livro; falta de livro ou de publicação é erro. */
export async function lerPublicadas(dependencias: DependenciasExportacao): Promise<LivroVersaoConteudoDto[]> {
  const conteudos: LivroVersaoConteudoDto[] = [];
  for (const codigo of LIVROS_EXPORTADOS) {
    const livro = await dependencias.livros.recuperarLivro({ codigo });
    if (!livro) throw new Error(`O livro "${codigo}" não existe no banco; importe-o antes (regras:importar).`);
    const versao = await dependencias.versoes.recuperarVersaoAtual({
      livroId: livro.id,
      situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA,
    });
    if (!versao) throw new Error(`O livro "${codigo}" não tem versão publicada para exportar.`);
    conteudos.push(versao.conteudo);
  }
  return conteudos;
}

async function arquivosGeradosEm(diretorio: string): Promise<string[]> {
  const prefixos = Object.values(PREFIXO_DO_ARQUIVO);
  const existentes = await readdir(diretorio).catch(() => [] as string[]);
  return existentes.filter((nome) => prefixos.some((prefixo) => nome.startsWith(`${prefixo}-v`) && nome.endsWith(".md")));
}

/**
 * Grava (ou, com `conferir`, só compara) os arquivos gerados em `diretorio`. Idempotente: arquivo já
 * igual não é regravado. Arquivos antigos dos mesmos livros (outra versão) saem; nada mais é tocado.
 */
export async function aplicarArquivosGerados(
  arquivos: readonly ArquivoGerado[],
  diretorio: string,
  opcoes: { readonly conferir?: boolean } = {},
): Promise<ResultadoDaExportacao> {
  const gravados: string[] = [];
  const removidos: string[] = [];
  const iguais: string[] = [];
  const divergencias: string[] = [];
  const conferir = opcoes.conferir === true;
  if (!conferir) await mkdir(diretorio, { recursive: true });

  for (const arquivo of arquivos) {
    const atual = await readFile(join(diretorio, arquivo.nome), "utf8").catch(() => null);
    if (atual !== null && normalizar(atual) === arquivo.texto) {
      iguais.push(arquivo.nome);
      continue;
    }
    if (conferir) {
      divergencias.push(`${arquivo.nome}: ${atual === null ? "ausente" : "difere do publicado no banco"}`);
    } else {
      await writeFile(join(diretorio, arquivo.nome), arquivo.texto, "utf8");
      gravados.push(arquivo.nome);
    }
  }

  const esperados = new Set(arquivos.map((arquivo) => arquivo.nome));
  for (const nome of await arquivosGeradosEm(diretorio)) {
    if (esperados.has(nome)) continue;
    if (conferir) divergencias.push(`${nome}: sobra (não é a versão publicada)`);
    else {
      await rm(join(diretorio, nome));
      removidos.push(nome);
    }
  }
  return { gravados, removidos, iguais, divergencias };
}

/** Lê o publicado no banco e aplica em `diretorio`. */
export async function exportarLivros(
  dependencias: DependenciasExportacao,
  diretorio: string,
  opcoes: { readonly conferir?: boolean } = {},
): Promise<ResultadoDaExportacao> {
  const conteudos = await lerPublicadas(dependencias);
  return aplicarArquivosGerados(conteudos.map(montarArquivoGerado), diretorio, opcoes);
}
