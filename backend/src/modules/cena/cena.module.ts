import { forwardRef, Module } from '@nestjs/common';
import { GatewayModule } from '../../core/gateway/gateway.module';
import { CampanhaModule } from '../campanha/campanha.module';
import { EncontroModule } from '../encontro/encontro.module';
import { CenaController } from './cena.controller';
import { CenaRepository } from './cena.repository';
import { CenaService } from './cena.service';

/**
 * Módulo `cena` (m7-22) — a raiz tipada da mesa; dono das queries de `cena`. Importa o
 * `EncontroModule` porque a cena é quem cria e encerra o encontro dela (o encontro não conhece a
 * `CenaService`: a dependência é de mão única) e o `CampanhaModule` para o papel do solicitante.
 * O `TransacaoService` vem do `DatabaseModule`, global.
 */
@Module({
  imports: [CampanhaModule, EncontroModule, forwardRef(() => GatewayModule)],
  controllers: [CenaController],
  providers: [CenaRepository, CenaService],
})
export class CenaModule {}
