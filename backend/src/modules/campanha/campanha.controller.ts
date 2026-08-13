import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import type {
  CampanhaAlteradaDto,
  CampanhaAlterarDto,
  CampanhaConviteRegeneradoDto,
  CampanhaCriadaDto,
  CampanhaCriarDto,
  CampanhaEntradaDto,
  CampanhaEntrarDto,
  CampanhaEstadoAlteradaDto,
  CampanhaEstadoAlterarDto,
  CampanhaInventarioDto,
  CampanhaInventarioItemAdicionarDto,
  CampanhaMembroRemovidoDto,
  CampanhaMembroResumoDto,
  CampanhaMestreTransferidoDto,
  CampanhaMestreTransferirDto,
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

  @Post('entrar')
  entrar(
    @Body() dto: CampanhaEntrarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaEntradaDto> {
    return this.campanhaService.entrarCampanha(dto, usuarioAtivo);
  }

  @Get(':id')
  recuperar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaRecuperadaDto> {
    return this.campanhaService.recuperarCampanha({ id }, usuarioAtivo);
  }

  @Get(':id/membros')
  listarMembros(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaMembroResumoDto[]> {
    return this.campanhaService.listarMembros({ campanhaId: id }, usuarioAtivo);
  }

  @Post(':id/convite/regenerar')
  regenerarConvite(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaConviteRegeneradoDto> {
    return this.campanhaService.regenerarConvite({ id }, usuarioAtivo);
  }

  @Delete(':id/membro/:usuarioId')
  removerMembro(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaMembroRemovidoDto> {
    return this.campanhaService.removerMembro({ id, usuarioId }, usuarioAtivo);
  }

  @Post(':id/mestre/transferir')
  transferirMestre(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaMestreTransferirDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaMestreTransferidoDto> {
    return this.campanhaService.transferirMestre({ ...dto, id }, usuarioAtivo);
  }

  @Put(':id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaAlteradaDto> {
    return this.campanhaService.alterarCampanha({ ...dto, id }, usuarioAtivo);
  }

  @Put(':id/estado')
  alterarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaEstadoAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaEstadoAlteradaDto> {
    return this.campanhaService.alterarEstado({ ...dto, id }, usuarioAtivo);
  }

  @Delete(':id')
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<void> {
    return this.campanhaService.excluirCampanha({ id }, usuarioAtivo);
  }

  @Get(':id/inventario')
  listarInventario(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    return this.campanhaService.listarInventario({ campanhaId: id }, usuarioAtivo);
  }

  @Post(':id/inventario/item')
  adicionarItemInventario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaInventarioItemAdicionarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    return this.campanhaService.adicionarItemInventario({ ...dto, campanhaId: id }, usuarioAtivo);
  }

  @Delete(':id/inventario/item/:itemId')
  removerItemInventario(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId') itemId: string,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    return this.campanhaService.removerItemInventario({ campanhaId: id, itemId }, usuarioAtivo);
  }

  @Patch(':id/inventario/item/:itemId/quantidade')
  ajustarQuantidadeItemInventario(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId') itemId: string,
    @Body() dto: { delta: number },
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<CampanhaInventarioDto> {
    return this.campanhaService.ajustarQuantidadeItemInventario(
      { campanhaId: id, itemId, delta: dto.delta },
      usuarioAtivo,
    );
  }
}
