import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import type {
  RolagemRegistrarDto,
  RolagemAvulsoRegistrarDto,
  RolagemResumoDto,
} from '@contratados-rpg/shared/dtos/rolagem';
import type { PaginatedResult } from '@contratados-rpg/shared/interfaces';
import { ActiveUser } from '../../core/decorators';
import { DocumentarController } from '../../core/openapi';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { RolagemService } from './rolagem.service';

/**
 * Endpoints de rolagem (m3-27) — rotas **protegidas**, sem prefixo comum: `POST`/`GET
 * /ficha/:id/rolagem` (registro + histórico da ficha) e `GET /campanha/:id/rolagem` (feed da
 * campanha). Controller burra: só monta o DTO com o `id`/`campanhaId` do `@Param`/`@Query`
 * (microinteligência sancionada — §7.1) e repassa à service. Permissões vivem na service.
 */
@Controller()
@DocumentarController('Rolagens')
export class RolagemController {
  constructor(private readonly rolagemService: RolagemService) {}

  @Post('ficha/:id/rolagem')
  registrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RolagemRegistrarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<RolagemResumoDto> {
    return this.rolagemService.registrarRolagem({ ...dto, fichaId: id }, usuarioAtivo);
  }

  @Post('encontro/:encontroId/combatente/:combatenteId/rolagem')
  registrarAvulso(
    @Param('encontroId', ParseIntPipe) encontroId: number,
    @Param('combatenteId', ParseIntPipe) combatenteId: number,
    @Body() dto: RolagemRegistrarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<RolagemResumoDto> {
    return this.rolagemService.registrarRolagemAvulso(
      { ...dto, encontroId, combatenteId } satisfies RolagemAvulsoRegistrarDto,
      usuarioAtivo,
    );
  }

  @Get('ficha/:id/rolagem')
  listarPorFicha(
    @Param('id', ParseIntPipe) id: number,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('itensPorPagina', new DefaultValuePipe(20), ParseIntPipe) itensPorPagina: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<PaginatedResult<RolagemResumoDto>> {
    return this.rolagemService.listarPorFicha({ fichaId: id, pagina, itensPorPagina }, usuarioAtivo);
  }

  @Get('campanha/:id/rolagem')
  listarPorCampanha(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<RolagemResumoDto[]> {
    return this.rolagemService.listarPorCampanha({ campanhaId: id }, usuarioAtivo);
  }
}
