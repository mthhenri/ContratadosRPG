import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { ResponseFormatInterceptor } from './core/interceptors/response-format.interceptor';
import { HealthController } from './health/health.controller';
import { AutenticacaoModule } from './modules/autenticacao/autenticacao.module';
import { JwtAuthGuard } from './modules/autenticacao/autenticacao.guard';

/**
 * Módulo raiz da aplicação. Registra a infraestrutura genérica (`core/`) global, o
 * `HealthController` (endpoint operacional `GET /health`) e o módulo de negócio
 * `autenticacao` (M2). O `JwtAuthGuard` global (`APP_GUARD`) passa a exigir JWT em todas as
 * rotas, exceto as `@Public()`. Os demais módulos de negócio (`campanha`, `ficha`) nascem
 * nas próximas tasks/milestones.
 */
@Module({
  imports: [ConfigModule, DatabaseModule, AutenticacaoModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseFormatInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
