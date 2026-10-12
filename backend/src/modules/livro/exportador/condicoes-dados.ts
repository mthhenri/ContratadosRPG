import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { LivroVersaoConteudoDto } from "@contratados-rpg/shared/dtos/livro";
import { projetarPecasEmRegras } from "@contratados-rpg/shared/livro";
import { RAIZ_DO_REPOSITORIO, type ImportadorDeModulo } from "../importador/ler-fontes-regras";

/** Onde o frontend guarda as descrições das condições, derivadas do livro publicado. */
export const CAMINHO_DAS_CONDICOES = join("frontend", "src", "app", "shared", "condicoes", "condicoes.dados.ts");

type ExtratorDeCondicoes = (documento: unknown) => readonly { readonly nome: string; readonly descricao: string }[];

// `import()` nativo: o extrator é ESM (.mjs) e o backend compila para CommonJS (mesma razão do
// leitor das fontes iniciais). A string é fixa, nunca entrada externa.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const importarModuloNativo = new Function("especificador", "return import(especificador)") as ImportadorDeModulo;

/**
 * Texto de `condicoes.dados.ts`: as descrições do capítulo "Condições" do Sistema publicado. O
 * extrator é o mesmo que o normalizador usava (`regras-condicoes.mjs`), agora sobre a fotografia.
 */
export async function montarCondicoesDados(
  sistema: LivroVersaoConteudoDto,
  raiz = RAIZ_DO_REPOSITORIO,
  importarModulo: ImportadorDeModulo = importarModuloNativo,
): Promise<string> {
  const modulo = (await importarModulo(
    pathToFileURL(resolve(raiz, "frontend", "scripts", "regras-condicoes.mjs")).href,
  )) as { extrairDescricoesCondicoes: ExtratorDeCondicoes };
  const condicoes = modulo.extrairDescricoesCondicoes(projetarPecasEmRegras(sistema));
  return (
    "// Gerado por `npm run regras:exportar` a partir do livro publicado. Não editar manualmente.\n" +
    `// Fonte: livro sistema v${sistema.numero} — Condições.\n` +
    `export const DESCRICOES_CONDICOES = ${JSON.stringify(condicoes, null, 4)} as const;\n`
  );
}
