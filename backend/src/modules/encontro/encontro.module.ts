import { forwardRef, Module } from '@nestjs/common';
import { GatewayModule } from '../../core/gateway/gateway.module';
import { ArmazenamentoModule } from '../../core/armazenamento';
import { CampanhaModule } from '../campanha/campanha.module';
import { FichaModule } from '../ficha/ficha.module';
import { EncontroController } from './encontro.controller';
import { EncontroRepository } from './encontro.repository';
import { EncontroService } from './encontro.service';

/**
 * Módulo `encontro` (m7) — o Encontro de Combate; dono das queries de `encontro`,
 * `encontro_combatente` e `encontro_evento`. Importa o `CampanhaModule` (papel do solicitante:
 * mestre conduz, membro lê) e o `FichaModule` — este último é o que sustenta a **fonte única**:
 * toda leitura de permissão de ficha e toda escrita de vida/energia passam pela `FichaService`,
 * dona dessa regra, em vez de serem reimplementadas aqui (proibição #28).
 */
@Module({
  imports: [ArmazenamentoModule, CampanhaModule, FichaModule, forwardRef(() => GatewayModule)],
  controllers: [EncontroController],
  providers: [EncontroRepository, EncontroService],
  exports: [EncontroRepository, EncontroService],
})
export class EncontroModule {}
