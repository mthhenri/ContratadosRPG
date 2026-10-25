import { Injectable } from "@nestjs/common";
import type { LivroPacoteDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { BusinessException, UnauthorizedAccessException } from "../../core/exceptions";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { LivroPacoteRepository } from "./livro-pacote.repository";
import { criarPacoteLivros } from "./transporte/pacote-livros";

@Injectable()
export class LivroPacoteService {
  constructor(private readonly livroPacoteRepository: LivroPacoteRepository) {}

  /** Exporta somente as duas publicações atuais; autorização independe da controller. */
  async exportarPublicados(usuarioAtivo: JwtPayload): Promise<LivroPacoteDto> {
    if (usuarioAtivo?.tipo !== TipoUsuarioEnum.ADMIN) {
      throw new UnauthorizedAccessException(
        "Somente administradores podem exportar os livros publicados.",
      );
    }
    const livros = await this.livroPacoteRepository.listarPublicacoesAtuais();
    if (
      livros.length !== 2 ||
      !livros.some((livro) => livro.codigo === "sistema") ||
      !livros.some((livro) => livro.codigo === "guia")
    ) {
      throw new BusinessException(
        "Sistema e Guia precisam ter uma versão publicada para exportação.",
      );
    }
    try {
      return criarPacoteLivros(livros);
    } catch {
      throw new BusinessException(
        "As publicações não formam um pacote válido. Confira conteúdo e referências dos livros.",
      );
    }
  }
}
