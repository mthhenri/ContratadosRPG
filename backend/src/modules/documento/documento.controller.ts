import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  DocumentoAlteradoDto,
  DocumentoAlterarDto,
  DocumentoBuscaResultadoDto,
  DocumentoCriadoDto,
  DocumentoCriarDto,
  DocumentoImagemAlteradaDto,
  DocumentoOcultadoDto,
  DocumentoRecuperadoDto,
  DocumentoReordenarDto,
  DocumentoResumoDto,
  DocumentoReveladoDto,
} from '@contratados-rpg/shared/dtos/documento';
import type { PaginatedResult } from '@contratados-rpg/shared/interfaces';
import { DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES } from '@contratados-rpg/shared/validators';
import { montarArquivoImagem } from '../../core/armazenamento';
import { ActiveUser } from '../../core/decorators';
import { DocumentarController } from '../../core/openapi';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { DocumentoService } from './documento.service';
import { ImagemDocumentoGrandeInterceptor } from './imagem-documento-grande.interceptor';

/**
 * Endpoints da biblioteca de documentos (m9-02) — rotas **protegidas**:
 * `campanha/:campanhaId/documento` para criar, listar, buscar e reordenar e `documento/:id/...`
 * para o documento em si. Controller burra: só mescla o id da rota no DTO (e monta o arquivo do
 * upload) e repassa à service. Não há `DELETE documento/:id/imagem`: a imagem é o conteúdo do
 * documento — troca-se por upload.
 */
@Controller()
@DocumentarController('Documentos')
export class DocumentoController {
  constructor(private readonly documentoService: DocumentoService) {}

  @Post('campanha/:campanhaId/documento')
  criar(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @Body() dto: DocumentoCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoCriadoDto> {
    return this.documentoService.criarDocumento({ ...dto, campanhaId }, usuarioAtivo);
  }

  @Get('campanha/:campanhaId/documento')
  listar(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoResumoDto[]> {
    return this.documentoService.listarDocumentos({ campanhaId }, usuarioAtivo);
  }

  /** Busca textual na biblioteca (m9-03) — recortada pelo papel de quem busca, na service. */
  @Get('campanha/:campanhaId/documento/busca')
  buscar(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @Query('termo') termo: string,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('limite', new DefaultValuePipe(20), ParseIntPipe) limite: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginatedResult<DocumentoBuscaResultadoDto>> {
    return this.documentoService.buscarDocumentos(
      { campanhaId, termo, pagina, limite },
      usuarioAtivo,
    );
  }

  @Put('campanha/:campanhaId/documento/ordem')
  reordenar(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @Body() dto: DocumentoReordenarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoResumoDto[]> {
    return this.documentoService.reordenarDocumentos({ ...dto, campanhaId }, usuarioAtivo);
  }

  @Get('documento/:id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoRecuperadoDto> {
    return this.documentoService.recuperarDocumento({ id }, usuarioAtivo);
  }

  @Put('documento/:id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DocumentoAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoAlteradoDto> {
    return this.documentoService.alterarDocumento({ ...dto, id }, usuarioAtivo);
  }

  @Delete('documento/:id')
  remover(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<void> {
    return this.documentoService.removerDocumento({ id }, usuarioAtivo);
  }

  @Post('documento/:id/revelar')
  revelar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoReveladoDto> {
    return this.documentoService.revelarDocumento({ id }, usuarioAtivo);
  }

  @Post('documento/:id/ocultar')
  ocultar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoOcultadoDto> {
    return this.documentoService.ocultarDocumento({ id }, usuarioAtivo);
  }

  /**
   * Troca a imagem de um documento `IMAGEM` — multipart, `arquivo` em memória. O teto do Multer
   * é o limite da service **mais um byte**: o busboy recusa o arquivo que *atinge* `fileSize`, e
   * um arquivo de exatamente 10 MB é válido. O que passar do teto sai como 400 pelo
   * `ImagemDocumentoGrandeInterceptor`, declarado antes para envolver o `FileInterceptor`.
   */
  @Post('documento/:id/imagem')
  @UseInterceptors(
    ImagemDocumentoGrandeInterceptor,
    FileInterceptor('arquivo', {
      limits: { fileSize: DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES + 1 },
    }),
  )
  alterarImagem(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() arquivo: Express.Multer.File | undefined,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<DocumentoImagemAlteradaDto> {
    return this.documentoService.alterarImagemDocumento(
      { id, arquivo: montarArquivoImagem(arquivo) },
      usuarioAtivo,
    );
  }
}
