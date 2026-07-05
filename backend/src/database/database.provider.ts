import type { Provider } from '@nestjs/common';
import knex from 'knex';
import { ConfigService } from '../config/config.service';

/** Token de injeção da conexão Knex — usado por `BaseRepository` e módulos de negócio. */
export const KNEX_CONNECTION = Symbol('KNEX_CONNECTION');

/**
 * Provider da conexão Knex em tempo de execução (SYSTEM.SPEC §10.7) — mesmo client `pg`
 * do `knexfile.ts` (usado só para CLI de migrations), mas lendo a configuração via
 * `ConfigService` injetado em vez de `process.env` direto.
 */
export const databaseProvider: Provider = {
  provide: KNEX_CONNECTION,
  useFactory: (configService: ConfigService) => {
    const configuracaoBanco = configService.obterConfiguracaoBanco();
    return knex({
      client: 'pg',
      connection: {
        host: configuracaoBanco.host,
        port: configuracaoBanco.porta,
        database: configuracaoBanco.nome,
        user: configuracaoBanco.usuario,
        password: configuracaoBanco.senha,
      },
    });
  },
  inject: [ConfigService],
};
