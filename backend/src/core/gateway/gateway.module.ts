import { forwardRef, Module } from '@nestjs/common';
import { AutenticacaoModule } from '../../modules/autenticacao/autenticacao.module';
import { CampanhaModule } from '../../modules/campanha/campanha.module';
import { DocumentoModule } from '../../modules/documento/documento.module';
import { EncontroModule } from '../../modules/encontro/encontro.module';
import { FichaModule } from '../../modules/ficha/ficha.module';
import { CampanhaGateway } from './campanha.gateway';

/**
 * Módulo do gateway de tempo real (SYSTEM.SPEC §9). Provê o `CampanhaGateway` (broadcast-only) e o
 * exporta para que `FichaService`/`CampanhaService` emitam eventos após a mutação. Importa o
 * `AutenticacaoModule` (que exporta o `JwtModule`) para validar o JWT do handshake com o **mesmo**
 * mecanismo do REST, e as services de ficha/campanha para consultar a permissão de entrada em sala
 * (sem duplicar a regra — proibição #28). Importa também o `EncontroModule`: quando uma ficha muda
 * (`emitirFichaAlterada`), o gateway pergunta ao `EncontroService` se ela é combatente de um
 * encontro aberto da campanha e, se for, pede a ele que resincronize os cartões da Iniciativa — o
 * gateway não decide isso sozinho (proibição #25), só encaminha para quem já é dono da regra.
 *
 * `FichaModule`/`CampanhaModule`/`EncontroModule` importam este módulo (para injetar o gateway nas
 * services) e este módulo importa aqueles (para consultar as services na entrada em sala e, no caso
 * de `EncontroModule`, para acionar a resincronização): a dependência é mútua, resolvida com
 * `forwardRef` nos dois lados.
 *
 * `DocumentoModule` (m9-09) entra pelo mesmo motivo: `documento:leitura` é delegado à
 * `DocumentoService` (que decide quem pode ler o quê) e a limpeza da presença à
 * `DocumentoLeituraService` (dona do estado em memória).
 */
@Module({
  imports: [
    AutenticacaoModule,
    forwardRef(() => FichaModule),
    forwardRef(() => CampanhaModule),
    forwardRef(() => EncontroModule),
    forwardRef(() => DocumentoModule),
  ],
  providers: [CampanhaGateway],
  exports: [CampanhaGateway],
})
export class GatewayModule {}
