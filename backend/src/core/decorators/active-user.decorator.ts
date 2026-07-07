import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Injeta no parâmetro do método o payload do JWT validado pela `JwtStrategy`
 * (`request.user`) — SYSTEM.SPEC §12. Uso: `metodo(@ActiveUser() usuarioAtivo: JwtPayload)`.
 * Só faz sentido em rotas protegidas pelo `JwtAuthGuard`; em rotas `@Public()` não há
 * usuário autenticado.
 */
export const ActiveUser = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): unknown => {
    const requisicao = contexto.switchToHttp().getRequest<Request>();
    return requisicao.user;
  },
);
