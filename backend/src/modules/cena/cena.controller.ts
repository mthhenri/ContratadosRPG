import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import type {
  CenaCriadaDto,
  CenaCriarDto,
  CenaDocumentoAnexarDto,
  CenaDocumentoReordenarDto,
  CenaDocumentoResumoDto,
  CenaRecuperadaDto,
  CenaReordenarDto,
  CenaResumoDto,
} from '@contratados-rpg/shared/dtos/cena';
import type {
  EncontroCriadoDto,
  EncontroCriarDto,
  EncontroRecuperadoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import { ActiveUser } from '../../core/decorators';
import { DocumentarController } from '../../core/openapi';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CenaDocumentoService } from './cena-documento.service';
import { CenaService } from './cena.service';

/**
 * Endpoints de Cena (m7-22) — rotas **protegidas**, sem prefixo comum: `campanha/:id/cena` para
 * criar/listar/reordenar e `cena/:id/...` para a cena em si. Controller burra: só monta o DTO com
 * o `id` do `@Param` (microinteligência sancionada — §7.1) e repassa à service.
 *
 * Também responde por duas URLs do encontro cujo ciclo de vida passou a ser o da cena-mãe:
 * `POST campanha/:id/encontro` (cria uma cena `COMBATE` já ativa, até a `m7-23` trocar a tela) e
 * `POST encontro/:id/encerrar` (encerra a cena, e com ela o encontro). A URL não muda para o cliente.
 */
@Controller()
@DocumentarController('Cenas')
export class CenaController {
  constructor(
    private readonly cenaService: CenaService,
    private readonly cenaDocumentoService: CenaDocumentoService,
  ) {}

  @Post('campanha/:id/cena')
  criar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CenaCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaCriadaDto> {
    return this.cenaService.criarCena({ ...dto, campanhaId: id }, usuarioAtivo);
  }

  @Get('campanha/:id/cena')
  listarPorCampanha(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaResumoDto[]> {
    return this.cenaService.listarPorCampanha({ campanhaId: id }, usuarioAtivo);
  }

  @Put('campanha/:id/cena/ordem')
  reordenar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CenaReordenarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaResumoDto[]> {
    return this.cenaService.reordenarCenas({ ...dto, campanhaId: id }, usuarioAtivo);
  }

  @Get('cena/:id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaRecuperadaDto> {
    return this.cenaService.recuperarCena({ id }, usuarioAtivo);
  }

  @Post('cena/:id/abrir')
  abrir(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaRecuperadaDto> {
    return this.cenaService.abrirCena({ id }, usuarioAtivo);
  }

  @Post('cena/:id/encerrar')
  encerrar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaRecuperadaDto> {
    return this.cenaService.encerrarCena({ id }, usuarioAtivo);
  }

  @Post('campanha/:id/encontro')
  criarEncontro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroCriadoDto> {
    return this.cenaService.criarEncontro({ ...dto, campanhaId: id }, usuarioAtivo);
  }

  @Post('encontro/:id/encerrar')
  encerrarEncontro(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.cenaService.encerrarCenaDoEncontro({ id }, usuarioAtivo);
  }

  // ── Coluna Documentos (m7-25) ─────────────────────────────────────────────

  @Get('cena/:id/documento')
  listarDocumentos(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    return this.cenaDocumentoService.listar({ cenaId: id }, usuarioAtivo);
  }

  @Post('cena/:id/documento')
  anexarDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CenaDocumentoAnexarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    return this.cenaDocumentoService.anexar({ ...dto, cenaId: id }, usuarioAtivo);
  }

  @Put('cena/:id/documento/ordem')
  reordenarDocumentos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CenaDocumentoReordenarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    return this.cenaDocumentoService.reordenar({ ...dto, cenaId: id }, usuarioAtivo);
  }

  @Delete("cena/:id/documento/foco")
  limparFocoDocumento(
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    return this.cenaDocumentoService.limparFoco({ cenaId: id }, usuarioAtivo);
  }

  @Delete('cena/:id/documento/:documentoId')
  removerDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    return this.cenaDocumentoService.remover({ cenaId: id, documentoId }, usuarioAtivo);
  }

  @Post('cena/:id/documento/:documentoId/focar')
  focarDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    return this.cenaDocumentoService.focar({ cenaId: id, documentoId }, usuarioAtivo);
  }

  @Post('cena/:id/documento/:documentoId/apresentar')
  apresentarDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    return this.cenaDocumentoService.apresentar({ cenaId: id, documentoId }, usuarioAtivo);
  }
}
