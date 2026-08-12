import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  UsuarioAutenticadoDto,
  UsuarioIdentidadeSessaoDto,
} from '@contratados-rpg/shared/dtos/usuario';
import type { JwtPayload } from './jwt-payload.interface';

/** Emissor canônico de sessões JWT usado tanto pelo login quanto pela impersonação. */
@Injectable()
export class SessaoTokenService {
  constructor(private readonly jwtService: JwtService) {}

  emitirSessao(usuario: UsuarioIdentidadeSessaoDto): UsuarioAutenticadoDto {
    const payload: JwtPayload = {
      sub: usuario.id,
      login: usuario.login,
      tipo: usuario.tipo,
      tokenVersao: usuario.tokenVersao,
    };
    return {
      token: this.jwtService.sign(payload),
      id: usuario.id,
      login: usuario.login,
      nome: usuario.nome,
      tipo: usuario.tipo,
    };
  }
}
