import knex from 'knex';
import type { Knex } from 'knex';
import { TransacaoService } from '../../src/database/transacao.service';
import { converterRegrasEmPecas } from '../../src/modules/livro/importador/converter-regras-em-pecas';
import { importarLivros } from '../../src/modules/livro/importador/importar-livro';
import { lerFontesDeRegras } from '../../src/modules/livro/importador/ler-fontes-regras';
import { validarArvoreLivro } from '@contratados-rpg/shared/livro';
import { LivroRepository } from '../../src/modules/livro/livro.repository';
import { LivroVersaoRepository } from '../../src/modules/livro/livro-versao.repository';
import { RegraPecaRepository } from '../../src/modules/livro/regra-peca.repository';
import configuracao from '../../knexfile';
import { validarConfiguracaoResetDev } from '../database/reset-dev.guard';

/**
 * Importação única dos `.md` vigentes (m11-03): popula `livro`, `regra_peca` e cria a primeira
 * `livro_versao` PUBLICADA de cada livro. Uso:
 * `npm run regras:importar --workspace=backend -- --usuario=<id> [--simular] [--refazer] [--se-vazio]`.
 * - `--usuario`: id de quem consta como autor da publicação (obrigatório, exceto com `--simular`).
 * - `--simular`: converte, valida a árvore, lista os avisos do normalizador e não toca o banco.
 * - `--se-vazio`: pula, sem erro, o livro que já tem peças (repetível; é o que o Cloud Build usa a cada deploy).
 * - `--refazer`: só em desenvolvimento (mesmo guard do `db:reset:dev`); descarta as peças e as
 *   fotografias do livro e importa de novo. Os dois livros entram numa única transação.
 */
const ORDEM_DOS_LIVROS: Readonly<Record<string, number>> = { sistema: 1, guia: 2 };

function lerArgumentos(argumentos: readonly string[]): { usuarioId: number | null; simular: boolean; refazer: boolean; seVazio: boolean } {
  const usuario = argumentos.find((argumento) => argumento.startsWith('--usuario='))?.slice('--usuario='.length);
  const usuarioId = usuario ? Number(usuario) : null;
  if (usuario && !Number.isInteger(usuarioId)) throw new Error(`--usuario inválido: "${usuario}".`);
  return {
    usuarioId,
    simular: argumentos.includes('--simular'),
    refazer: argumentos.includes('--refazer'),
    seVazio: argumentos.includes('--se-vazio'),
  };
}

export async function main(argumentos: readonly string[] = process.argv.slice(2)): Promise<void> {
  const { usuarioId, simular, refazer, seVazio } = lerArgumentos(argumentos);
  if (!simular && usuarioId === null) throw new Error('Informe --usuario=<id> (ou use --simular).');

  const fontes = await lerFontesDeRegras();
  const livros = fontes.map((fonte) => ({
    fonte,
    conteudo: converterRegrasEmPecas(fonte.documento),
  }));

  if (simular || usuarioId === null) {
    for (const { fonte, conteudo } of livros) {
      const pendencias = [
        ...validarArvoreLivro({ pecas: conteudo.pecas, modo: 'trabalho' }),
        ...validarArvoreLivro({ pecas: conteudo.pecas, modo: 'fotografia' }),
      ];
      console.log(
        `[regras:importar] (simulação) ${fonte.arquivo}: ${conteudo.pecas.length} peça(s) na raiz, ` +
          `${pendencias.length} pendência(s), ${fonte.avisos.length} aviso(s) do normalizador.`,
      );
      for (const aviso of fonte.avisos) console.log(`  L${aviso.linha}: ${aviso.motivo}`);
      for (const pendencia of pendencias) console.log(`  ! ${pendencia.caminho.join(' > ')}: ${pendencia.mensagem}`);
    }
    return;
  }

  if (refazer) validarConfiguracaoResetDev(process.env);
  const conexao: Knex = knex(configuracao);
  try {
    const transacao = new TransacaoService(conexao);
    const dependencias = {
      livros: new LivroRepository(conexao),
      pecas: new RegraPecaRepository(conexao),
      versoes: new LivroVersaoRepository(conexao),
      executarEmTransacao: <T>(operacao: () => Promise<T>): Promise<T> => transacao.executar(operacao),
    };
    const resumos = await importarLivros(
      dependencias,
      livros.map(({ conteudo }) => ({
        conteudo,
        ordemDoLivro: ORDEM_DOS_LIVROS[conteudo.codigo] ?? 99,
        usuarioId,
        refazer,
        pularSeJaImportado: seVazio,
      })),
    );
    if (resumos.length === 0) console.log('[regras:importar] Todos os livros já estavam importados; nada foi alterado.');
    for (const resumo of resumos) {
      console.log(
        `[regras:importar] livro ${resumo.codigo} ${resumo.numero}: ` +
          `${resumo.pecas} peça(s), fotografia ${resumo.versaoId}.`,
      );
    }
  } finally {
    await conexao.destroy();
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  void main().catch((erro: unknown) => {
    console.error('[regras:importar] Falha.', erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  });
}
