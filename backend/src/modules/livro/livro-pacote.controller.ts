import { Controller, Get, Header } from "@nestjs/common";
import type { LivroPacoteDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { ActiveUser, TiposPermitidos } from "../../core/decorators";
import { DocumentarController } from "../../core/openapi";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { LivroPacoteService } from "./livro-pacote.service";

@Controller("livros/pacotes")
@DocumentarController("Livros de regras")
export class LivroPacoteController {
  constructor(private readonly livroPacoteService: LivroPacoteService) {}

  @TiposPermitidos(TipoUsuarioEnum.ADMIN)
  @Header("Cache-Control", "no-store")
  @Get("publicados")
  exportarPublicados(@ActiveUser() usuarioAtivo: JwtPayload): Promise<LivroPacoteDto> {
    return this.livroPacoteService.exportarPublicados(usuarioAtivo);
  }
}
