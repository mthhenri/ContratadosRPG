import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { SessaoService } from '../services/sessao.service';

/**
 * Injeta o token JWT da sessão (`SessaoService`) no header `Authorization: Bearer <token>`
 * de toda requisição, quando há sessão aberta. Sem sessão, a requisição segue intacta (rotas
 * públicas — calculadora, registro e login — não precisam de token). Registrado em
 * `app.config.ts` via `withInterceptors`, antes do `error-handler.interceptor` (que trata o
 * `401`). Contraparte do `JwtAuthGuard` global do backend (m2-02).
 */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(SessaoService).obterToken();
  if (!token) {
    return next(request);
  }
  const requisicaoAutenticada = request.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(requisicaoAutenticada);
};
