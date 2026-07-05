import { resolve } from 'node:path';
import { config as carregarVariaveisDeAmbiente } from 'dotenv';
import type { Knex } from 'knex';
import { SqlMigrationSource } from './src/database/sql-migration-source';

// Este knexfile é ferramenta de linha de comando (CLI de migrations), executada FORA do
// ciclo de vida do NestJS. Por isso lê variáveis de ambiente diretamente via dotenv — a
// Proibição #10 (nunca process.env direto) vale para o CÓDIGO DA APLICAÇÃO, que a partir
// da task m0-03 consome a conexão via ConfigService injetado. O `.env` fica na raiz do
// repositório (mesmo arquivo lido pelo Docker Compose); ver SYSTEM.SPEC §10.6.
carregarVariaveisDeAmbiente({ path: resolve(__dirname, '..', '.env') });

const configuracao: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NOME,
    user: process.env.DB_USUARIO,
    password: process.env.DB_SENHA,
  },
  migrations: {
    // Migrations são arquivos `.sql` puros carregados pelo SqlMigrationSource (SYSTEM.SPEC
    // §10.7). A tabela de controle continua sendo a `knex_migrations` interna do Knex.
    migrationSource: new SqlMigrationSource(),
    tableName: 'knex_migrations',
  },
};

export default configuracao;
