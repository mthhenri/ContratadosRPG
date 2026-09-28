import { forwardRef, Module } from '@nestjs/common';
import { GatewayModule } from '../../core/gateway/gateway.module';
import { CampanhaModule } from '../campanha/campanha.module';
import { DocumentoModule } from '../documento/documento.module';
import { EncontroModule } from '../encontro/encontro.module';
import { CenaDocumentoRepository } from './cena-documento.repository';
import { CenaDocumentoService } from './cena-documento.service';
import { CenaController } from './cena.controller';
import { CenaRepository } from './cena.repository';
import { CenaService } from './cena.service';

/**
 * Módulo `cena` (m7-22) — a raiz tipada da mesa; dono das queries de `cena`. Importa o
 * `EncontroModule` porque a cena é quem cria e encerra o encontro dela (o encontro não conhece a
 * `CenaService`: a dependência é de mão única) e o `CampanhaModule` para o papel do solicitante.
 * `DocumentoModule` (m7-25) — a coluna Documentos do painel de Investigação chama a
 * `DocumentoService` para revelar/ocultar, nunca o repository dela (mão única, o inverso de
 * `EncontroModule`). O `TransacaoService` vem do `DatabaseModule`, global.
 */
@Module({
  imports: [CampanhaModule, EncontroModule, DocumentoModule, forwardRef(() => GatewayModule)],
  controllers: [CenaController],
  providers: [CenaRepository, CenaService, CenaDocumentoRepository, CenaDocumentoService],
})
export class CenaModule {}
