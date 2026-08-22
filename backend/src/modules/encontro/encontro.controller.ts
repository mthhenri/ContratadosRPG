import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  EncontroCombatenteAdicionarDto,
  EncontroCombatenteCondicaoAtribuirDto,
  EncontroCombatenteCondicaoRemoverDto,
  EncontroCombatenteEnergiaAjustarDto,
  EncontroCombatenteIniciativaAtribuirDto,
  EncontroCombatenteIdentidadeAlterarDto,
  EncontroCombatenteVidaAjustarDto,
  EncontroCriadoDto,
  EncontroCriarDto,
  EncontroIniciativaRolarDto,
  EncontroRecuperadoDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import { ActiveUser } from '../../core/decorators';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { EncontroService } from './encontro.service';

/**
 * Endpoints do Encontro de Combate (m7-03) — rotas **protegidas**, sem prefixo comum:
 * `campanha/:id/encontro` para criar/listar e `encontro/:id/...` para o encontro em si.
 * Controller burra: só monta o DTO com o `id` do `@Param` (microinteligência sancionada — §7.1) e
 * repassa à service. Permissões vivem na service.
 */
@Controller()
export class EncontroController {
  constructor(private readonly encontroService: EncontroService) {}

  @Post('campanha/:id/encontro')
  criar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroCriadoDto> {
    return this.encontroService.criarEncontro({ ...dto, campanhaId: id }, usuarioAtivo);
  }

  @Get('campanha/:id/encontro')
  listarPorCampanha(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroResumoDto[]> {
    return this.encontroService.listarPorCampanha({ campanhaId: id }, usuarioAtivo);
  }

  @Get('encontro/:id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.recuperarEncontro({ id }, usuarioAtivo);
  }

  @Post('encontro/:id/combatente')
  adicionarCombatente(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroCombatenteAdicionarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.adicionarCombatente({ ...dto, encontroId: id }, usuarioAtivo);
  }

  @Delete('encontro/combatente/:id')
  removerCombatente(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.removerCombatente({ id }, usuarioAtivo);
  }

  @Put('encontro/combatente/:id/identidade')
  alterarIdentidadeAvulso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroCombatenteIdentidadeAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.alterarIdentidadeAvulso({ ...dto, id }, usuarioAtivo);
  }

  @Post('encontro/combatente/:id/imagem')
  @UseInterceptors(FileInterceptor('arquivo'))
  alterarImagemAvulso(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() arquivo: Express.Multer.File,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.alterarImagemAvulso(
      { id, arquivo: { conteudo: arquivo.buffer, mimetype: arquivo.mimetype, tamanho: arquivo.size } },
      usuarioAtivo,
    );
  }

  @Delete('encontro/combatente/:id/imagem')
  excluirImagemAvulso(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.excluirImagemAvulso({ id }, usuarioAtivo);
  }

  @Put('encontro/combatente/:id/iniciativa')
  atribuirIniciativa(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroCombatenteIniciativaAtribuirDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.atribuirIniciativa({ ...dto, id }, usuarioAtivo);
  }

  @Post('encontro/:id/iniciar')
  iniciar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.iniciarEncontro({ id }, usuarioAtivo);
  }

  @Post('encontro/:id/encerrar')
  encerrar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.encerrarEncontro({ id }, usuarioAtivo);
  }

  @Post('encontro/:id/turno/avancar')
  avancarTurno(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.avancarTurno({ id }, usuarioAtivo);
  }

  @Post('encontro/:id/turno/voltar')
  voltarTurno(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.voltarTurno({ id }, usuarioAtivo);
  }

  @Post('encontro/:id/iniciativa/pedido')
  pedirIniciativa(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.pedirIniciativa({ id }, usuarioAtivo);
  }

  @Put('encontro/combatente/:id/vida')
  ajustarVida(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroCombatenteVidaAjustarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.ajustarVida({ ...dto, id }, usuarioAtivo);
  }

  @Put('encontro/combatente/:id/energia')
  ajustarEnergia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroCombatenteEnergiaAjustarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.ajustarEnergia({ ...dto, id }, usuarioAtivo);
  }

  @Post('encontro/combatente/:id/condicao')
  aplicarCondicao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroCombatenteCondicaoAtribuirDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.aplicarCondicao({ ...dto, id }, usuarioAtivo);
  }

  @Delete('encontro/combatente/:id/condicao')
  removerCondicao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroCombatenteCondicaoRemoverDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.removerCondicao({ ...dto, id }, usuarioAtivo);
  }

  @Put('encontro/:id/iniciativa')
  rolarIniciativasFaltantes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroIniciativaRolarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.rolarIniciativasFaltantes({ ...dto, encontroId: id }, usuarioAtivo);
  }
}
