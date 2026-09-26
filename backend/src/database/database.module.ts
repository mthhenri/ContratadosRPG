import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { databaseProvider, KNEX_CONNECTION } from './database.provider';
import { TransacaoService } from './transacao.service';

/**
 * Módulo global da conexão de banco (Knex) — expõe `KNEX_CONNECTION` para
 * `BaseRepository` e módulos de negócio, sem necessidade de reimportação, e o
 * `TransacaoService` para as services que precisam de escrita atômica.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [databaseProvider, TransacaoService],
  exports: [KNEX_CONNECTION, TransacaoService],
})
export class DatabaseModule {}
