import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { ConfigService } from '../../config/config.service';
import type { ArmazenamentoProvedor } from './armazenamento-provedor.interface';
import { criarArmazenamentoProvedor } from './armazenamento-provedor.factory';

/** Token de injeção do `ArmazenamentoProvedor` ativo — a implementação concreta é resolvida em runtime. */
export const ARMAZENAMENTO_PROVEDOR = Symbol('ARMAZENAMENTO_PROVEDOR');

/**
 * Módulo de armazenamento de blob (m3-62) — expõe o `ArmazenamentoProvedor` ativo, escolhido em
 * runtime por `ARMAZENAMENTO_PROVEDOR` (`ConfigService.obterConfiguracaoArmazenamento`, toggle
 * explícito de ambiente, não "variável ausente"). Só a implementação selecionada é instanciada —
 * em `local`, o `ArmazenamentoR2Provedor` (e suas credenciais `ARMAZENAMENTO_R2_*`) nunca é
 * construído, então nenhuma delas é exigida fora do caminho `r2`.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ARMAZENAMENTO_PROVEDOR,
      useFactory: (configService: ConfigService): ArmazenamentoProvedor =>
        criarArmazenamentoProvedor(configService.obterConfiguracaoArmazenamento()),
      inject: [ConfigService],
    },
  ],
  exports: [ARMAZENAMENTO_PROVEDOR],
})
export class ArmazenamentoModule {}
