import { Module } from '@nestjs/common';
import { CampanhaModule } from '../campanha/campanha.module';
import { EncontroModule } from '../encontro/encontro.module';
import { FichaModule } from '../ficha/ficha.module';
import { RolagemModule } from '../rolagem/rolagem.module';
import { CampanhaProjecaoController } from './campanha-projecao.controller';
import { CampanhaProjecaoService } from './campanha-projecao.service';

/**
 * Módulo das projeções de leitura de `m8-espectadores-campanha` (m8-02/m8-05) — painel do
 * espectador e prévia de jogador. Importa `CampanhaModule`, `EncontroModule`, `FichaModule` e
 * `RolagemModule` (nenhum dos quatro importa este módulo de volta), evitando o ciclo que existiria
 * se a projeção vivesse dentro de qualquer um deles (`EncontroModule`/`FichaModule`/`RolagemModule`
 * já importam `CampanhaModule`).
 */
@Module({
  imports: [CampanhaModule, EncontroModule, FichaModule, RolagemModule],
  controllers: [CampanhaProjecaoController],
  providers: [CampanhaProjecaoService],
})
export class CampanhaProjecaoModule {}
