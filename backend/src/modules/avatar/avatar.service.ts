import { Injectable, StreamableFile } from "@nestjs/common";
import type { FichaImagemRecuperarDto } from "@contratados-rpg/shared/dtos/ficha";
import { recuperarChaveImagem } from "../../core/armazenamento/armazenamento-chave.util";
import { ResourceNotFoundException } from "../../core/exceptions";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { FichaService } from "../ficha/ficha.service";
import { EncontroService } from "../encontro/encontro.service";

/** Coordena os donos dos vínculos; não concede permissão sobre uma ficha por uma URL pública. */
@Injectable()
export class AvatarService {
  constructor(private readonly fichaService: FichaService, private readonly encontroService: EncontroService) {}

  /** Resolve o vínculo atual e delega sua autorização ao módulo proprietário. */
  async recuperarAvatar(dto: FichaImagemRecuperarDto, usuarioAtivo?: JwtPayload): Promise<StreamableFile> {
    try {
      const chave = recuperarChaveImagem(dto.caminho);
      if (!chave.startsWith('fichas/') && !chave.startsWith('agentes/')) throw new Error('Pasta inválida');
    } catch {
      throw new ResourceNotFoundException('Avatar');
    }
    const ficha = await this.fichaService.recuperarImagem(dto, usuarioAtivo);
    if (ficha) return ficha;
    if (dto.caminho.startsWith('/uploads/agentes/')) {
      const avulso = await this.encontroService.recuperarImagemAvulso({ caminho: dto.caminho });
      if (avulso) return avulso;
    }
    throw new ResourceNotFoundException('Avatar');
  }
}
