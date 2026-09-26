import { forwardRef, Module } from '@nestjs/common';
import { ArmazenamentoModule } from '../../core/armazenamento';
import { GatewayModule } from '../../core/gateway/gateway.module';
import { CampanhaModule } from '../campanha/campanha.module';
import { DocumentoController } from './documento.controller';
import { DocumentoRepository } from './documento.repository';
import { DocumentoService } from './documento.service';

/**
 * Módulo `documento` (m9-02) — a biblioteca de documentos da campanha; dono das queries de
 * `documento`. Exporta a `DocumentoService` porque a cena de Investigação (`m7-25`) apresenta um
 * documento chamando `revelarDocumento`/`ocultarDocumento`/`recuperarDocumento` — nunca o
 * repositório. A dependência é de mão única: este módulo não conhece o `CenaModule`. O
 * `TransacaoService` vem do `DatabaseModule`, global.
 */
@Module({
  imports: [CampanhaModule, ArmazenamentoModule, forwardRef(() => GatewayModule)],
  controllers: [DocumentoController],
  providers: [DocumentoRepository, DocumentoService],
  exports: [DocumentoService],
})
export class DocumentoModule {}
