import { Module } from '@nestjs/common';
import { CampanhaModule } from '../campanha/campanha.module';
import { FichaModule } from '../ficha/ficha.module';
import { RolagemModule } from '../rolagem/rolagem.module';
import { CampanhaProjecaoController } from './campanha-projecao.controller';
import { CampanhaProjecaoService } from './campanha-projecao.service';

/**
 * Módulo das projeções de leitura de `m8-espectadores-campanha` (m8-02) — painel do espectador e
 * prévia de jogador. Importa `CampanhaModule`, `FichaModule` e `RolagemModule` (nenhum dos três
 * importa este módulo de volta), evitando o ciclo que existiria se a projeção vivesse dentro de
 * qualquer um deles (`FichaModule`/`RolagemModule` já importam `CampanhaModule`).
 */
@Module({
  imports: [CampanhaModule, FichaModule, RolagemModule],
  controllers: [CampanhaProjecaoController],
  providers: [CampanhaProjecaoService],
})
export class CampanhaProjecaoModule {}
