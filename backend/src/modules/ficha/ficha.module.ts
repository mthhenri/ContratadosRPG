import { forwardRef, Module } from '@nestjs/common';
import { ArmazenamentoModule } from '../../core/armazenamento';
import { GatewayModule } from '../../core/gateway/gateway.module';
import { CampanhaModule } from '../campanha/campanha.module';
import { FichaController } from './ficha.controller';
import { FichaRepository } from './ficha.repository';
import { FichaService } from './ficha.service';

/**
 * Módulo `ficha` (SYSTEM.SPEC §13): CRUD da ficha de jogador com a matriz de permissões (§14) e a
 * validação do documento de jogo contra `shared/regras` (m3-03). Dono das queries de
 * `ficha`/`usuario_ficha_acesso`. Importa o `CampanhaModule` para injetar o `CampanhaRepository`
 * (papel do usuário na campanha — permissão de mestre), sem duplicar a regra de permissão
 * (proibição #28). Importa o `ArmazenamentoModule` para o `ArmazenamentoProvedor` do avatar da
 * ficha (m3-62, disco local em dev / Cloudflare R2 em produção).
 */
@Module({
  imports: [CampanhaModule, ArmazenamentoModule, forwardRef(() => GatewayModule)],
  controllers: [FichaController],
  providers: [FichaRepository, FichaService],
  exports: [FichaRepository, FichaService],
})
export class FichaModule {}
