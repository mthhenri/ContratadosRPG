import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { databaseProvider, KNEX_CONNECTION } from './database.provider';

/**
 * Módulo global da conexão de banco (Knex) — expõe `KNEX_CONNECTION` para
 * `BaseRepository` e módulos de negócio, sem necessidade de reimportação.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [databaseProvider],
  exports: [KNEX_CONNECTION],
})
export class DatabaseModule {}
