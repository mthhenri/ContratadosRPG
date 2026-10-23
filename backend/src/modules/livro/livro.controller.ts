import { Body, Controller, Get, Header, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import type {
  LivroLeituraDto,
  LivroMudancasPublicadasDto,
  LivroPublicadoDto,
  LivroPublicarDto,
  LivroResumoDto,
  LivroVersaoRecuperadaDto,
  LivroVersaoResumoDto,
} from "@contratados-rpg/shared/dtos/livro";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { ActiveUser, AutenticacaoOpcional, TiposPermitidos } from "../../core/decorators";
import { DocumentarController } from "../../core/openapi";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { LivroService } from "./livro.service";

/**
 * Endpoints dos livros de regras (m11-04). A leitura é aberta (`@AutenticacaoOpcional()`: sem login
 * lê a publicada; com login, o conteúdo varia por papel); histórico, versão por id e publicação são
 * só `ADMIN`. A resposta da leitura varia por papel, então o navegador nunca a guarda
 * (`Cache-Control: no-store`: o conteúdo muda com o token). Controller burra: só repassa.
 */
@Controller("livros")
@DocumentarController("Livros de regras")
export class LivroController {
  constructor(private readonly livroService: LivroService) {}

  @AutenticacaoOpcional()
  @Header("Cache-Control", "no-store")
  @Get()
  listar(@ActiveUser() usuarioAtivo: JwtPayload | undefined): Promise<LivroResumoDto[]> {
    return this.livroService.listarLivros({ tipoUsuario: usuarioAtivo?.tipo ?? null });
  }

  @AutenticacaoOpcional()
  @Header("Cache-Control", "no-store")
  @Get(":codigo")
  recuperar(
    @Param("codigo") codigo: string,
    @ActiveUser() usuarioAtivo: JwtPayload | undefined,
  ): Promise<LivroLeituraDto> {
    return this.livroService.recuperarLivro({ codigo, tipoUsuario: usuarioAtivo?.tipo ?? null });
  }

  @TiposPermitidos(TipoUsuarioEnum.ADMIN)
  @Get(":codigo/versoes")
  listarVersoes(
    @Param("codigo") codigo: string,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<LivroVersaoResumoDto[]> {
    return this.livroService.listarVersoes({ codigo }, usuarioAtivo);
  }

  @AutenticacaoOpcional()
  @Header("Cache-Control", "no-store")
  @Get(":codigo/publicada")
  recuperarPublicada(@Param("codigo") codigo: string): Promise<LivroLeituraDto> {
    return this.livroService.recuperarPublicada({ codigo });
  }

  @AutenticacaoOpcional()
  @Header("Cache-Control", "no-store")
  @Get(":codigo/mudancas")
  recuperarMudancasPublicadas(
    @Param("codigo") codigo: string,
    @Query("origemId", new ParseIntPipe({ optional: true })) origemId?: number,
  ): Promise<LivroMudancasPublicadasDto> {
    return this.livroService.recuperarMudancasPublicadas({ codigo, origemId });
  }

  @TiposPermitidos(TipoUsuarioEnum.ADMIN)
  @Get(":codigo/versoes/:id")
  recuperarVersao(
    @Param("codigo") codigo: string,
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<LivroVersaoRecuperadaDto> {
    return this.livroService.recuperarVersao({ codigo, id }, usuarioAtivo);
  }

  @TiposPermitidos(TipoUsuarioEnum.ADMIN)
  @Post(":codigo/publicacoes")
  publicar(
    @Param("codigo") codigo: string,
    @Body() dto: Omit<LivroPublicarDto, "codigo">,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<LivroPublicadoDto> {
    return this.livroService.publicar({ ...dto, codigo }, usuarioAtivo);
  }
}
