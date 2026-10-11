import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import type {
  RegraPecaAlteradaDto,
  RegraPecaArvoreItemDto,
  RegraPecaDadosAlterarDto,
  RegraPecaDuplicadaDto,
  RegraPecaExcluidaDto,
  RegraPecaMovidaDto,
  RegraPecaPosicaoAlterarDto,
  RegraPecaRecuperadaDto,
  RegraPecaRestauradaDto,
} from "@contratados-rpg/shared/dtos/livro";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { ActiveUser, TiposPermitidos } from "../../core/decorators";
import { DocumentarController } from "../../core/openapi";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { RegraPecaService } from "./regra-peca.service";

/**
 * Edição da cópia de trabalho dos livros (m11-06) — só `ADMIN`. Controller burra: mescla o código e
 * o id da rota nos DTOs e repassa à service.
 */
@Controller("livros")
@DocumentarController("Livros de regras")
@TiposPermitidos(TipoUsuarioEnum.ADMIN)
export class RegraPecaController {
  constructor(private readonly regraPecaService: RegraPecaService) {}

  @Get(":codigo/pecas")
  listar(@Param("codigo") codigo: string, @ActiveUser() usuarioAtivo: JwtPayload): Promise<RegraPecaArvoreItemDto[]> {
    return this.regraPecaService.listarArvore({ codigo }, usuarioAtivo);
  }

  @Get(":codigo/pecas/:id")
  recuperar(
    @Param("codigo") codigo: string,
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<RegraPecaRecuperadaDto> {
    return this.regraPecaService.recuperarPeca({ codigo, id }, usuarioAtivo);
  }

  @Patch(":codigo/pecas/:id/dados")
  alterarDados(
    @Param("codigo") codigo: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: Omit<RegraPecaDadosAlterarDto, "codigo" | "id">,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<RegraPecaAlteradaDto> {
    return this.regraPecaService.alterarDados({ ...dto, codigo, id }, usuarioAtivo);
  }

  @Patch(":codigo/pecas/:id/posicao")
  alterarPosicao(
    @Param("codigo") codigo: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: Omit<RegraPecaPosicaoAlterarDto, "codigo" | "id">,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<RegraPecaMovidaDto> {
    return this.regraPecaService.alterarPosicao({ ...dto, codigo, id }, usuarioAtivo);
  }

  @Post(":codigo/pecas/:id/duplicacoes")
  duplicar(
    @Param("codigo") codigo: string,
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<RegraPecaDuplicadaDto> {
    return this.regraPecaService.duplicar({ codigo, id }, usuarioAtivo);
  }

  @Delete(":codigo/pecas/:id")
  excluir(
    @Param("codigo") codigo: string,
    @Param("id", ParseIntPipe) id: number,
    @Query("revisao", ParseIntPipe) revisao: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<RegraPecaExcluidaDto> {
    return this.regraPecaService.excluir({ codigo, id, revisao }, usuarioAtivo);
  }

  @Post(":codigo/pecas/:id/restauracoes")
  restaurar(
    @Param("codigo") codigo: string,
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<RegraPecaRestauradaDto> {
    return this.regraPecaService.restaurar({ codigo, id }, usuarioAtivo);
  }
}
