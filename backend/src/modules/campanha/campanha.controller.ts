import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import type {
  CampanhaAlteradaDto,
  CampanhaAlterarDto,
  CampanhaCriadaDto,
  CampanhaCriarDto,
  CampanhaRecuperadaDto,
  CampanhaResumoDto,
} from '@contratados-rpg/shared/dtos/campanha';
import { ActiveUser } from '../../core/decorators';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaService } from './campanha.service';

/**
 * Endpoints de campanha (SYSTEM.SPEC §13). Rotas **protegidas** (sem `@Public()`): o
 * `JwtAuthGuard` global exige o JWT e o `@ActiveUser()` injeta o payload. Controller burra:
 * só expõe a rota e repassa à service (proibição #2), montando o DTO com o `id` do `@Param`
 * ou o `usuarioId` do token (microinteligência sancionada — §7.1).
 */
@Controller('campanha')
export class CampanhaController {
  constructor(private readonly campanhaService: CampanhaService) {}

  @Post()
  criar(
    @Body() dto: CampanhaCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaCriadaDto> {
    return this.campanhaService.criarCampanha(dto, usuarioAtivo);
  }

  @Get()
  listar(@ActiveUser() usuarioAtivo: JwtPayload): Promise<CampanhaResumoDto[]> {
    return this.campanhaService.listarCampanhas({ usuarioId: usuarioAtivo.sub });
  }

  @Get(':id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaRecuperadaDto> {
    return this.campanhaService.recuperarCampanha({ id }, usuarioAtivo);
  }

  @Put(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaAlteradaDto> {
    return this.campanhaService.alterarCampanha({ ...dto, id }, usuarioAtivo);
  }

  @Delete(':id')
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<void> {
    return this.campanhaService.excluirCampanha({ id }, usuarioAtivo);
  }
}
