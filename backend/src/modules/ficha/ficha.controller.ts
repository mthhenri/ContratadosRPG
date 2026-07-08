import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type {
  FichaAcessoConcederDto,
  FichaAcessoConcedidoDto,
  FichaAcessoResumoDto,
  FichaAcessoRevogadoDto,
  FichaAlteradaDto,
  FichaAlterarDto,
  FichaCriadaDto,
  FichaCriarDto,
  FichaRecuperadaDto,
  FichaResumoDto,
} from '@contratados-rpg/shared/dtos/ficha';
import { ActiveUser } from '../../core/decorators';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { FichaService } from './ficha.service';

/**
 * Endpoints da ficha de jogador (SYSTEM.SPEC §13). Rotas **protegidas** (sem `@Public()`): o
 * `JwtAuthGuard` global exige o JWT e o `@ActiveUser()` injeta o payload. Controller burra: só
 * expõe a rota e repassa à service (proibição #2), montando o DTO com o `id`/`campanhaId` do
 * `@Param`/`@Query` (microinteligência sancionada — §7.1). Permissões e validação vivem na service.
 */
@Controller('ficha')
export class FichaController {
  constructor(private readonly fichaService: FichaService) {}

  @Post()
  criar(
    @Body() dto: FichaCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaCriadaDto> {
    return this.fichaService.criarFicha(dto, usuarioAtivo);
  }

  @Get()
  listar(
    @Query('campanhaId', ParseIntPipe) campanhaId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaResumoDto[]> {
    return this.fichaService.listarFichas({ campanhaId }, usuarioAtivo);
  }

  @Get(':id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaRecuperadaDto> {
    return this.fichaService.recuperarFicha({ id }, usuarioAtivo);
  }

  @Put(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FichaAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaAlteradaDto> {
    return this.fichaService.alterarFicha({ ...dto, id }, usuarioAtivo);
  }

  @Delete(':id')
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<void> {
    return this.fichaService.excluirFicha({ id }, usuarioAtivo);
  }

  @Get(':id/acesso')
  listarAcessos(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaAcessoResumoDto[]> {
    return this.fichaService.listarAcessos({ fichaId: id }, usuarioAtivo);
  }

  @Post(':id/acesso')
  concederAcesso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FichaAcessoConcederDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaAcessoConcedidoDto> {
    return this.fichaService.concederAcesso({ ...dto, fichaId: id }, usuarioAtivo);
  }

  @Delete(':id/acesso/:usuarioId')
  revogarAcesso(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<FichaAcessoRevogadoDto> {
    return this.fichaService.revogarAcesso({ fichaId: id, usuarioId }, usuarioAtivo);
  }
}
