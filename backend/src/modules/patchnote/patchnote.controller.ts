import { Controller, Get, Header, Param } from '@nestjs/common';
import type {
  PatchnoteRecuperadoDto,
  PatchnoteResumoDto,
} from '@contratados-rpg/shared/dtos/patchnote';
import { Public } from '../../core/decorators';
import { DocumentarController } from '../../core/openapi';
import { PatchnoteService } from './patchnote.service';

/** Cache curto do navegador — o de 24 h fica no service; este só evita rajadas de recarga. */
const CACHE_NAVEGADOR = 'public, max-age=300';

/**
 * Endpoints dos patchnotes (pn-03) — rotas **públicas** (`@Public()`): a página `/patchnotes`
 * abre sem login. Controller burra: só repassa o `versao` da rota à service.
 */
@Controller('patchnote')
@DocumentarController('Patchnotes')
export class PatchnoteController {
  constructor(private readonly patchnoteService: PatchnoteService) {}

  @Public()
  @Header('Cache-Control', CACHE_NAVEGADOR)
  @Get()
  listar(): Promise<PatchnoteResumoDto[]> {
    return this.patchnoteService.listarPatchnotes();
  }

  @Public()
  @Header('Cache-Control', CACHE_NAVEGADOR)
  @Get(':versao')
  recuperar(@Param('versao') versao: string): Promise<PatchnoteRecuperadoDto> {
    return this.patchnoteService.recuperarPatchnote({ versao });
  }
}
