import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Knex } from 'knex';

/** Marcador de início da seção aplicada por `db:migrate`. */
const MARCADOR_UP = /^--\s*UP\s*$/im;
/** Marcador de início da seção aplicada por `db:rollback`. */
const MARCADOR_DOWN = /^--\s*DOWN\s*$/im;
/** Marcador opcional (logo após `-- UP`) que desabilita a transação da migration. */
const MARCADOR_SEM_TRANSACAO = /^--\s*NO TRANSACTION\s*$/im;

interface SecoesMigration {
  up: string;
  down: string;
  semTransacao: boolean;
}

/** O Knex lê `config.transaction` do conteúdo da migration para decidir se a envolve numa transação. */
interface MigrationComConfig extends Knex.Migration {
  config?: { transaction?: boolean };
}

/**
 * Separa o conteúdo de uma migration `.sql` nas seções `-- UP` e `-- DOWN` (cada marcador
 * sozinho na sua linha). Tudo antes do `-- UP` (cabeçalho de comentário) é descartado. Um
 * `-- NO TRANSACTION` logo após o `-- UP` sinaliza que a migration não deve rodar dentro de
 * transação — a linha do marcador é removida do SQL executado. Ver SYSTEM.SPEC §10.7.
 */
function separarSecoes(conteudo: string): SecoesMigration {
  const [antesDoDown, aposDown = ''] = conteudo.split(MARCADOR_DOWN);
  const secoesUp = antesDoDown.split(MARCADOR_UP);
  if (secoesUp.length < 2) {
    throw new Error('Migration sem o marcador "-- UP" numa linha própria.');
  }

  const corpoUp = secoesUp[1];
  const semTransacao = MARCADOR_SEM_TRANSACAO.test(corpoUp);

  return {
    up: corpoUp.replace(MARCADOR_SEM_TRANSACAO, '').trim(),
    down: aposDown.trim(),
    semTransacao,
  };
}

/**
 * Fonte de migrations `.sql` customizada para o Knex (SYSTEM.SPEC §10.7).
 *
 * Lê os arquivos `NNNN - Nome descritivo.sql` do diretório de migrations em ordem de prefixo
 * numérico e executa a seção `-- UP` (em `db:migrate`) ou `-- DOWN` (em `db:rollback`). O
 * Knex continua responsável pela tabela de controle `knex_migrations` e por abrir/fechar uma
 * transação por migration — exceto quando a migration declara `-- NO TRANSACTION`.
 */
export class SqlMigrationSource implements Knex.MigrationSource<string> {
  constructor(
    private readonly diretorioMigrations: string = resolve(__dirname, 'migrations'),
  ) {}

  async getMigrations(): Promise<string[]> {
    return readdirSync(this.diretorioMigrations)
      .filter((arquivo) => arquivo.endsWith('.sql'))
      .sort();
  }

  getMigrationName(arquivo: string): string {
    return arquivo;
  }

  async getMigration(arquivo: string): Promise<Knex.Migration> {
    const conteudo = readFileSync(resolve(this.diretorioMigrations, arquivo), 'utf8');
    const { up, down, semTransacao } = separarSecoes(conteudo);

    const migration: MigrationComConfig = {
      up: async (knex: Knex): Promise<void> => {
        await knex.raw(up);
      },
      down: async (knex: Knex): Promise<void> => {
        if (down.length > 0) {
          await knex.raw(down);
        }
      },
    };

    if (semTransacao) {
      migration.config = { transaction: false };
    }

    return migration;
  }
}
