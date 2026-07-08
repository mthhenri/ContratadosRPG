import { forwardRef, Module } from '@nestjs/common';
import { GatewayModule } from '../../core/gateway/gateway.module';
import { CampanhaController } from './campanha.controller';
import { CampanhaRepository } from './campanha.repository';
import { CampanhaService } from './campanha.service';

/**
 * Módulo `campanha` (SYSTEM.SPEC §13): CRUD de campanha com o criador virando `MESTRE`,
 * listagem das campanhas do usuário e gestão restrita ao mestre (m2-04). Dono das queries
 * de `campanha`/`campanha_membro`; exporta o repositório para os módulos que o injetam
 * (ex.: `ficha`, nas próximas tasks).
 */
@Module({
  imports: [forwardRef(() => GatewayModule)],
  controllers: [CampanhaController],
  providers: [CampanhaRepository, CampanhaService],
  exports: [CampanhaRepository, CampanhaService],
})
export class CampanhaModule {}
