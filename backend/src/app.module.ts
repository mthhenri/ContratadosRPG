import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { ResponseFormatInterceptor } from './core/interceptors/response-format.interceptor';

/**
 * Módulo raiz da aplicação. Registra a infraestrutura genérica (`core/`) global — os
 * módulos de negócio (`autenticacao`, `usuario`, `campanha`, `ficha`) nascem a partir
 * do M2.
 */
@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseFormatInterceptor },
  ],
})
export class AppModule {}
