import { Module } from '@nestjs/common';

/**
 * Módulo raiz da aplicação. Mínimo por enquanto — os módulos de infraestrutura
 * (`core/`) nascem na task `m0-03` e os módulos de negócio (`usuario`, `campanha`,
 * `ficha`) nos milestones seguintes.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
