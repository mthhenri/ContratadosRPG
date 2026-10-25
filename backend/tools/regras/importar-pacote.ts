import { config } from "dotenv";
import { resolve } from "node:path";
import { RAIZ_DO_REPOSITORIO } from "../../src/modules/livro/importador/ler-fontes-regras";
config({ path: resolve(RAIZ_DO_REPOSITORIO, ".env") });
import { executarPacoteLocal } from "./importar-pacote-runtime";

export async function main(argumentos = process.argv.slice(2)): Promise<void> {
  await executarPacoteLocal({
    argumentos,
    ambiente: process.env,
    restaurar: false,
  });
}
if (require.main === module)
  void main().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  });
