import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

/**
 * Módulo global de configuração — expõe `ConfigService` para toda a aplicação sem
 * necessidade de reimportação por módulo (SYSTEM.SPEC §10.6).
 */
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
