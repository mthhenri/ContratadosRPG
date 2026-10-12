import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import knex from 'knex';
import type { Knex } from 'knex';
import { RAIZ_DO_REPOSITORIO } from '../../src/modules/livro/importador/ler-fontes-regras';
import { CAMINHO_DAS_CONDICOES, montarCondicoesDados } from '../../src/modules/livro/exportador/condicoes-dados';
import { aplicarArquivosGerados, lerPublicadas } from '../../src/modules/livro/exportador/exportar-livros';
import { montarArquivoGerado } from '../../src/modules/livro/exportador/arquivo-gerado';
import { LivroRepository } from '../../src/modules/livro/livro.repository';
import { LivroVersaoRepository } from '../../src/modules/livro/livro-versao.repository';
import configuracao from '../../knexfile';

/**
 * Exporta a versão PUBLICADA atual de cada livro para `docs/core/` (m11-10): a cópia gerada que o
 * Git e os agentes leem; o banco é a fonte da verdade. Também regenera as descrições das condições
 * do frontend a partir do Sistema publicado. Uso:
 * `npm run regras:exportar` (grava) ou `npm run regras:exportar -- --conferir` (só compara com o banco;
 * sai com código 1 se algo divergir). Idempotente: sem mudança no banco, não há diff.
 */
export async function main(argumentos: readonly string[] = process.argv.slice(2)): Promise<void> {
  const conferir = argumentos.includes('--conferir');
  const diretorio = join(RAIZ_DO_REPOSITORIO, 'docs', 'core');
  const conexao: Knex = knex(configuracao);
  try {
    const dependencias = { livros: new LivroRepository(conexao), versoes: new LivroVersaoRepository(conexao) };
    const conteudos = await lerPublicadas(dependencias);
    const resultado = await aplicarArquivosGerados(conteudos.map(montarArquivoGerado), diretorio, { conferir });

    const sistema = conteudos.find((conteudo) => conteudo.codigo === 'sistema');
    const divergencias = [...resultado.divergencias];
    const gravados = [...resultado.gravados];
    if (sistema) {
      const caminho = join(RAIZ_DO_REPOSITORIO, CAMINHO_DAS_CONDICOES);
      const novo = await montarCondicoesDados(sistema);
      const atual = await readFile(caminho, 'utf8').catch(() => null);
      if (atual?.replace(/\r\n/g, '\n') !== novo) {
        if (conferir) divergencias.push(`${CAMINHO_DAS_CONDICOES}: difere do Sistema publicado`);
        else {
          await writeFile(caminho, novo, 'utf8');
          gravados.push(CAMINHO_DAS_CONDICOES);
        }
      }
    }

    for (const nome of gravados) console.log(`[regras:exportar] gravado ${nome}`);
    for (const nome of resultado.removidos) console.log(`[regras:exportar] removido ${nome}`);
    console.log(`[regras:exportar] ${resultado.iguais.length} arquivo(s) já estavam iguais.`);
    if (divergencias.length) {
      for (const divergencia of divergencias) console.error(`[regras:exportar] DIVERGE ${divergencia}`);
      process.exitCode = 1;
    }
  } finally {
    await conexao.destroy();
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  void main().catch((erro: unknown) => {
    console.error('[regras:exportar] Falha.', erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  });
}
