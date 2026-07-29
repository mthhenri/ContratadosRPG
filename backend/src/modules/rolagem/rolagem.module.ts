import { forwardRef, Module } from '@nestjs/common';
import { GatewayModule } from '../../core/gateway/gateway.module';
import { CampanhaModule } from '../campanha/campanha.module';
import { FichaModule } from '../ficha/ficha.module';
import { RolagemController } from './rolagem.controller';
import { RolagemRepository } from './rolagem.repository';
import { RolagemService } from './rolagem.service';

/**
 * Módulo `rolagem` (m3-27): persistência das rolagens disparadas a partir de uma ficha — dono das
 * queries de `rolagem`. Importa o `FichaModule` (reusa `FichaService.recuperarFicha` para a
 * permissão de visualização, §14, sem duplicar regra — proibição #28) e o `CampanhaModule` (papel
 * do solicitante no feed da campanha, via `CampanhaRepository`).
 */
@Module({
  imports: [FichaModule, CampanhaModule, forwardRef(() => GatewayModule)],
  controllers: [RolagemController],
  providers: [RolagemRepository, RolagemService],
  exports: [RolagemRepository, RolagemService],
})
export class RolagemModule {}
