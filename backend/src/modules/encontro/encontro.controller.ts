import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import type {
  EncontroCombatenteAdicionarDto,
  EncontroCombatenteIniciativaAtribuirDto,
  EncontroCriadoDto,
  EncontroCriarDto,
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

  @Put('encontro/combatente/:id/iniciativa')
  atribuirIniciativa(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EncontroCombatenteIniciativaAtribuirDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.atribuirIniciativa({ ...dto, id }, usuarioAtivo);
  }

  @Put('encontro/:id/iniciativa')
  rolarIniciativasFaltantes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { iniciativaPorCombatente: Readonly<Record<number, number>> },
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<EncontroRecuperadoDto> {
    return this.encontroService.rolarIniciativasFaltantes({ ...dto, encontroId: id }, usuarioAtivo);
  }
}
