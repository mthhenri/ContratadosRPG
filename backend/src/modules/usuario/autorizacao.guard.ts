import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { IS_PUBLIC_KEY } from '../../core/decorators/public.decorator';
import { TIPOS_PERMITIDOS_KEY } from '../../core/decorators/tipos-permitidos.decorator';
import { UnauthorizedAccessException } from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { UsuarioService } from './usuario.service';

/** Valida revogação e autorização por tipo com o estado atual do banco. */
@Injectable()
export class AutorizacaoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usuarioService: UsuarioService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const alvos = [contexto.getHandler(), contexto.getClass()];
    const rotaPublica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, alvos);
    if (rotaPublica) {
      return true;
    }

    const requisicao = contexto.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const payload = requisicao.user;
    if (!payload) {
      throw new UnauthorizedException();
    }

    const sessao = await this.usuarioService.recuperarSessao({ id: payload.sub });
    if (!sessao || sessao.isDeleted || sessao.tokenVersao !== payload.tokenVersao) {
      throw new UnauthorizedException();
    }

    const tiposPermitidos = this.reflector.getAllAndOverride<TipoUsuarioEnum[]>(
      TIPOS_PERMITIDOS_KEY,
      alvos,
    );
    if (tiposPermitidos && !tiposPermitidos.includes(sessao.tipo)) {
      throw new UnauthorizedAccessException();
    }
    return true;
  }
}
