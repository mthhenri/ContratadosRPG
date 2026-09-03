import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import type {
  CampanhaPainelEspectadorDto,
  CampanhaPreviaJogadorDto,
} from '@contratados-rpg/shared/dtos/campanha';
import { ActiveUser } from '../../core/decorators';
import { DocumentarController } from '../../core/openapi';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaProjecaoService } from './campanha-projecao.service';

/**
 * Endpoints das projeções de leitura de `m8-espectadores-campanha` (m8-02) — rotas
 * **protegidas**. Controller burra: só monta o DTO com `id`/`usuarioAlvoId` do `@Param` e
 * `pagina`/`itensPorPagina` da `@Query` (microinteligência sancionada — §7.1), repassa à service.
 * Permissões e cálculo do recorte vivem em `CampanhaProjecaoService`.
 */
@Controller()
@DocumentarController('Campanhas')
export class CampanhaProjecaoController {
  constructor(private readonly campanhaProjecaoService: CampanhaProjecaoService) {}

  @Get('campanha/:id/painel-espectador')
  recuperarPainelEspectador(
    @Param('id', ParseIntPipe) id: number,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('itensPorPagina', new DefaultValuePipe(20), ParseIntPipe) itensPorPagina: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaPainelEspectadorDto> {
    return this.campanhaProjecaoService.recuperarPainelEspectador(
      { campanhaId: id, pagina, itensPorPagina },
      usuarioAtivo,
    );
  }

  @Get('campanha/:id/previa-jogador/:usuarioAlvoId')
  recuperarPreviaJogador(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioAlvoId', ParseIntPipe) usuarioAlvoId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaPreviaJogadorDto> {
    return this.campanhaProjecaoService.recuperarPreviaJogador(
      { campanhaId: id, usuarioAlvoId },
      usuarioAtivo,
    );
  }
}
