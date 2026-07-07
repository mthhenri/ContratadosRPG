import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '../../config/config.service';
import type { JwtPayload } from './jwt-payload.interface';

/**
 * Estratégia Passport que valida o JWT enviado como `Authorization: Bearer <token>`. O
 * segredo vem do `ConfigService` (`JWT_SECRETO`), nunca de `process.env` direto (proibição
 * #10). Como o token é assinado pelo próprio backend, o payload já validado é confiável e
 * retornado direto (vira `request.user`, lido por `@ActiveUser()`).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const { secreto } = configService.obterConfiguracaoJwt();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secreto,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
