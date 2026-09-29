import { Module } from '@nestjs/common';
import { ArmazenamentoModule } from '../../core/armazenamento';
import { PatchnoteController } from './patchnote.controller';
import { PatchnoteService } from './patchnote.service';

/**
 * Módulo `patchnote` (pn-03) — notas de versão públicas lidas do armazenamento. Sem repository nem
 * tabela: o R2 é a fonte de verdade (ver `PatchnoteService`).
 */
@Module({
  imports: [ArmazenamentoModule],
  controllers: [PatchnoteController],
  providers: [PatchnoteService],
})
export class PatchnoteModule {}
