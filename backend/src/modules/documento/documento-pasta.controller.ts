import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import type {
  DocumentoOrganizacaoRecuperadaDto,
  DocumentoPastaAlteradaDto,
  DocumentoPastaAlterarDto,
  DocumentoPastaCriadaDto,
  DocumentoPastaCriarDto,
  DocumentoPastaMovidaDto,
  DocumentoPastaMoverDto,
  DocumentoPastaVinculoAlteradoDto,
  DocumentoPastaVinculoAlterarDto,
} from '@contratados-rpg/shared/dtos/documento';
import { ActiveUser } from '../../core/decorators';
import { DocumentarController } from '../../core/openapi';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { DocumentoPastaService } from './documento-pasta.service';

/**
 * Endpoints das pastas da Biblioteca — rotas **protegidas**. A organização lida e escrita é a do
 * cargo do usuário (a service decide; nenhuma rota recebe a organização). Controller burra: só
 * mescla o id da rota no DTO e repassa à service.
 */
@Controller()
@DocumentarController('Documentos')
export class DocumentoPastaController {
  constructor(private readonly documentoPastaService: DocumentoPastaService) {}

  @Get('campanha/:campanhaId/documento-organizacao')
  recuperarOrganizacao(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoOrganizacaoRecuperadaDto> {
    return this.documentoPastaService.recuperarOrganizacao({ campanhaId }, usuarioAtivo);
  }

  @Post('campanha/:campanhaId/documento-pasta')
  criar(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @Body() dto: DocumentoPastaCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoPastaCriadaDto> {
    return this.documentoPastaService.criarPasta({ ...dto, campanhaId }, usuarioAtivo);
  }

  @Put('documento-pasta/:id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DocumentoPastaAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoPastaAlteradaDto> {
    return this.documentoPastaService.alterarPasta({ ...dto, id }, usuarioAtivo);
  }

  @Put('documento-pasta/:id/posicao')
  mover(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DocumentoPastaMoverDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoPastaMovidaDto> {
    return this.documentoPastaService.moverPasta({ ...dto, id }, usuarioAtivo);
  }

  @Delete('documento-pasta/:id')
  remover(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<void> {
    return this.documentoPastaService.removerPasta({ id }, usuarioAtivo);
  }

  @Put('documento/:id/pasta')
  alterarVinculo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DocumentoPastaVinculoAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoPastaVinculoAlteradoDto> {
    return this.documentoPastaService.alterarVinculo({ ...dto, id }, usuarioAtivo);
  }
}
