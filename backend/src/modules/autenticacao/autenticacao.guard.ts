import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../core/decorators/public.decorator';

/**
 * Guard global de autenticação (registrado via `APP_GUARD` — SYSTEM.SPEC §12). Exige um
 * JWT válido em **todas** as rotas, salvo as marcadas `@Public()` (registro, login,
 * `GET /health`) — é o primeiro consumidor real do `@Public()` nascido no M0. Delega a
 * verificação do token à `JwtStrategy` via Passport (`AuthGuard('jwt')`).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(contexto: ExecutionContext) {
    const rotaPublica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (rotaPublica) {
      return true;
    }
    return super.canActivate(contexto);
  }
}
