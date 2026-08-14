import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import type {
  PaginaCadernoAlterarDto,
  PaginaCadernoCriarDto,
  PaginaCadernoDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';

import { ActiveUser } from '../../core/decorators';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { PaginaCadernoService } from './pagina-caderno.service';

/** Endpoints protegidos do caderno; ids de rota são apenas mesclados aos DTOs. */
@Controller()
export class PaginaCadernoController {
  constructor(private readonly service: PaginaCadernoService) {}

  @Get('campanha/:campanhaId/caderno/paginas')
  listar(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoResumoDto[]> {
    return this.service.listarPaginas({ campanhaId }, usuarioAtivo);
  }

  @Get('campanha/:campanhaId/caderno/membros/:usuarioId/paginas')
  listarMembro(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoResumoDto[]> {
    return this.service.listarPaginasMembro({ campanhaId, usuarioId }, usuarioAtivo);
  }

  @Get('pagina-caderno/:id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoDto> {
    return this.service.recuperarPagina({ id }, usuarioAtivo);
  }

  @Post('campanha/:campanhaId/caderno/paginas')
  criar(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @Body() dto: PaginaCadernoCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoDto> {
    return this.service.criarPagina({ ...dto, campanhaId }, usuarioAtivo);
  }

  @Put('pagina-caderno/:id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaginaCadernoAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoDto> {
    return this.service.alterarPagina({ ...dto, id }, usuarioAtivo);
  }

  @Delete('pagina-caderno/:id')
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<void> {
    return this.service.excluirPagina({ id }, usuarioAtivo);
  }
}
