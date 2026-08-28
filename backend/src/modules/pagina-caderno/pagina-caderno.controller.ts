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
} from '@nestjs/common';
import type {
  BuscaCampanhaResultadoDto,
  PaginaCadernoAlterarDto,
  PaginaCadernoCriarDto,
  PaginaCadernoDto,
  PaginaCadernoEsquadraoAlteradaDto,
  PaginaCadernoEsquadraoAlterarDto,
  PaginaCadernoEsquadraoCriarDto,
  PaginaCadernoEsquadraoEstadoDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import { BuscaCampanhaFonteEnum } from '@contratados-rpg/shared/enums';
import type { PaginatedResult } from '@contratados-rpg/shared/interfaces';

import { ActiveUser } from '../../core/decorators';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { BuscaCampanhaFontesPipe } from './busca-campanha-fontes.pipe';
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

  @Get('campanha/:campanhaId/caderno/esquadrao/paginas')
  listarEsquadrao(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoResumoDto[]> {
    return this.service.listarPaginasEsquadrao({ campanhaId }, usuarioAtivo);
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

  @Post('campanha/:campanhaId/caderno/esquadrao/paginas')
  criarEsquadrao(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @Body() dto: PaginaCadernoEsquadraoCriarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoEsquadraoEstadoDto> {
    return this.service.criarPaginaEsquadrao({ ...dto, campanhaId }, usuarioAtivo);
  }

  @Get('pagina-caderno/:id/esquadrao/estado')
  recuperarEstadoEsquadrao(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoEsquadraoEstadoDto> {
    return this.service.recuperarEstadoPaginaEsquadrao({ id }, usuarioAtivo);
  }

  @Put('pagina-caderno/:id/esquadrao/atualizacoes')
  alterarEsquadrao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaginaCadernoEsquadraoAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoEsquadraoAlteradaDto> {
    return this.service.alterarPaginaEsquadrao({ ...dto, id }, usuarioAtivo);
  }

  @Delete('pagina-caderno/:id/esquadrao')
  excluirEsquadrao(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<void> {
    return this.service.excluirPaginaEsquadrao({ id }, usuarioAtivo);
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

  @Get('campanha/:campanhaId/busca')
  buscar(
    @Param('campanhaId', ParseIntPipe) campanhaId: number,
    @Query('termo') termo: string,
    @Query('fontes', new BuscaCampanhaFontesPipe())
    fontes: BuscaCampanhaFonteEnum[] | undefined,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('limite', new DefaultValuePipe(20), ParseIntPipe) limite: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginatedResult<BuscaCampanhaResultadoDto>> {
    return this.service.buscarCampanha(
      { campanhaId, termo, fontes, pagina, limite },
      usuarioAtivo,
    );
  }
}
