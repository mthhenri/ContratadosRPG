import { forwardRef, Module } from '@nestjs/common';
import { AutenticacaoModule } from '../../modules/autenticacao/autenticacao.module';
import { CampanhaModule } from '../../modules/campanha/campanha.module';
import { FichaModule } from '../../modules/ficha/ficha.module';
import { CampanhaGateway } from './campanha.gateway';

/**
 * Módulo do gateway de tempo real (SYSTEM.SPEC §9). Provê o `CampanhaGateway` (broadcast-only) e o
 * exporta para que `FichaService`/`CampanhaService` emitam eventos após a mutação. Importa o
 * `AutenticacaoModule` (que exporta o `JwtModule`) para validar o JWT do handshake com o **mesmo**
 * mecanismo do REST, e as services de ficha/campanha para consultar a permissão de entrada em sala
 * (sem duplicar a regra — proibição #28).
 *
 * `FichaModule`/`CampanhaModule` importam este módulo (para injetar o gateway nas services) e este
 * módulo importa aqueles (para consultar as services na entrada em sala): a dependência é mútua,
 * resolvida com `forwardRef` nos dois lados.
 */
@Module({
  imports: [
    AutenticacaoModule,
    forwardRef(() => FichaModule),
    forwardRef(() => CampanhaModule),
  ],
  providers: [CampanhaGateway],
  exports: [CampanhaGateway],
})
export class GatewayModule {}
