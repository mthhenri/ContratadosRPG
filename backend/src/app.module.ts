import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { GatewayModule } from './core/gateway/gateway.module';
import { DatabaseModule } from './database/database.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { ResponseFormatInterceptor } from './core/interceptors/response-format.interceptor';
import { HealthController } from './health/health.controller';
import { AutenticacaoModule } from './modules/autenticacao/autenticacao.module';
import { JwtAuthGuard } from './modules/autenticacao/autenticacao.guard';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { AutorizacaoGuard } from './modules/usuario/autorizacao.guard';
import { CampanhaModule } from './modules/campanha/campanha.module';
import { FichaModule } from './modules/ficha/ficha.module';
import { EncontroModule } from './modules/encontro/encontro.module';
import { RolagemModule } from './modules/rolagem/rolagem.module';
import { PaginaCadernoModule } from './modules/pagina-caderno/pagina-caderno.module';

/**
 * Módulo raiz da aplicação. Registra a infraestrutura genérica (`core/`) global, o
 * `HealthController` (endpoint operacional `GET /health`) e os módulos de negócio
 * `autenticacao` (registro/login), `usuario` (perfil e troca de senha), `campanha` (CRUD de
 * campanha, m2-04), `ficha` (CRUD da ficha de jogador com permissões e validação via motor de
 * regras, m3-03) e `rolagem` (persistência das rolagens disparadas a partir de uma ficha, m3-27).
 * O `GatewayModule` provê o gateway de tempo real broadcast-only (§9, m3-05). O `JwtAuthGuard`
 * global (`APP_GUARD`) exige JWT em todas as rotas, exceto as `@Public()`.
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AutenticacaoModule,
    UsuarioModule,
    CampanhaModule,
    FichaModule,
    RolagemModule,
    EncontroModule,
    PaginaCadernoModule,
    GatewayModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseFormatInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AutorizacaoGuard },
  ],
})
export class AppModule {}
