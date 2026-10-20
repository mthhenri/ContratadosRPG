import { forwardRef, Module } from '@nestjs/common';
import { ArmazenamentoModule } from '../../core/armazenamento';
import { GatewayModule } from '../../core/gateway/gateway.module';
import { CampanhaModule } from '../campanha/campanha.module';
import { DocumentoController } from './documento.controller';
import { DocumentoPastaController } from './documento-pasta.controller';
import { DocumentoPastaRepository } from './documento-pasta.repository';
import { DocumentoPastaService } from './documento-pasta.service';
import { DocumentoLeituraService } from './documento-leitura.service';
import { DocumentoRepository } from './documento.repository';
import { DocumentoService } from './documento.service';

/**
 * Módulo `documento` (m9-02) — a biblioteca de documentos da campanha; dono das queries de
 * `documento`. Exporta a `DocumentoService` porque a cena de Investigação (`m7-25`) apresenta um
 * documento chamando `revelarDocumento`/`ocultarDocumento`/`recuperarDocumento` — nunca o
 * repositório. A dependência é de mão única: este módulo não conhece o `CenaModule`. O
 * `TransacaoService` vem do `DatabaseModule`, global.
 *
 * Exporta também a `DocumentoLeituraService` (`m9-09`, presença de leitura em memória): o
 * `CampanhaGateway` delega a ela a limpeza na desconexão, em `campanha:sair` e na recalibração de
 * papel — o gateway importa este módulo por `forwardRef`, como este importa o dele.
 *
 * As pastas da Biblioteca (`DocumentoPastaService`) são serviço próprio no mesmo módulo; a
 * `DocumentoService` só a chama para limpar vínculos ao ocultar ou excluir um documento.
 */
@Module({
  imports: [CampanhaModule, ArmazenamentoModule, forwardRef(() => GatewayModule)],
  controllers: [DocumentoController, DocumentoPastaController],
  providers: [
    DocumentoRepository,
    DocumentoService,
    DocumentoLeituraService,
    DocumentoPastaRepository,
    DocumentoPastaService,
  ],
  exports: [DocumentoService, DocumentoLeituraService],
})
export class DocumentoModule {}
