import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { NormalizadoDocumento } from "./regras-normalizadas.tipos";

export interface AvisoDoNormalizador {
  readonly documento: "sistema" | "guia";
  readonly linha: number;
  readonly motivo: string;
}

export interface FonteDeRegras {
  readonly documento: NormalizadoDocumento;
  readonly avisos: readonly AvisoDoNormalizador[];
  /** Nome do `.md` lido (ex.: `sistema-v4.1.4.md`). */
  readonly arquivo: string;
}

interface ModuloNormalizador {
  readonly normalizarDocumento: (
    texto: string,
    id: "sistema" | "guia",
    versao: string,
  ) => { documento: NormalizadoDocumento; avisos: AvisoDoNormalizador[] };
  readonly selecionarFonte: (
    arquivos: string[],
    prefixo: string,
  ) => { arquivo: string; versao: string };
}

/** Raiz do repositório a partir de `backend/src/modules/livro/importador`. */
export const RAIZ_DO_REPOSITORIO = resolve(__dirname, "..", "..", "..", "..", "..");

export type ImportadorDeModulo = (especificador: string) => Promise<unknown>;

// `import()` nativo: o normalizador é ESM (.mjs) e o backend compila para CommonJS, onde o
// compilador reescreveria `import()` em `require()`. A string é fixa, nunca entrada externa.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const importarModuloNativo = new Function(
  "especificador",
  "return import(especificador)",
) as ImportadorDeModulo;

/**
 * Lê `docs/core/*.md` com o normalizador do frontend (a mesma etapa de leitura do build do site).
 * O parser não é duplicado: o importador só consome a saída dele. `importarModulo` existe para o
 * teste (vitest tem o próprio `import()`); o comando usa o `import()` nativo.
 */
export async function lerFontesDeRegras(
  raiz = RAIZ_DO_REPOSITORIO,
  importarModulo: ImportadorDeModulo = importarModuloNativo,
): Promise<FonteDeRegras[]> {
  const normalizador = (await importarModulo(
    pathToFileURL(join(raiz, "frontend", "scripts", "normalizar-regras.mjs")).href,
  )) as ModuloNormalizador;
  const diretorio = join(raiz, "docs", "core");
  const arquivos = await readdir(diretorio);
  const fontes: FonteDeRegras[] = [];
  for (const [id, prefixo] of [
    ["sistema", "sistema"],
    ["guia", "guia_de_mestre"],
  ] as const) {
    const fonte = normalizador.selecionarFonte(arquivos, prefixo);
    const texto = await readFile(join(diretorio, fonte.arquivo), "utf8");
    const { documento, avisos } = normalizador.normalizarDocumento(texto, id, fonte.versao);
    fontes.push({ documento, avisos, arquivo: fonte.arquivo });
  }
  return fontes;
}
