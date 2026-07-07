import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';

import { SessaoService } from '../services/sessao.service';

/**
 * Captura erros de requisição HTTP e exibe um toast PrimeNG com a mensagem padronizada do
 * backend (`StandardResponse.mensagem`) quando disponível, reencaminhando o erro para quem
 * chamou. Registrado em `app.config.ts` via `withInterceptors`, depois do
 * `auth-token.interceptor`.
 *
 * Num `401` com sessão aberta (token ausente/expirado/inválido — o `JwtAuthGuard` do backend
 * reserva o 401 para falta de autenticação), encerra a sessão e leva ao login guardando a URL
 * atual em `retorno` para retomar o destino após reautenticar. O guard só dispara com sessão
 * ativa: um 401 durante o próprio login (credenciais erradas são 400, não 401) não redireciona.
 */
export const errorHandlerInterceptor: HttpInterceptorFn = (request, next) => {
  const messageService = inject(MessageService);
  const sessaoService = inject(SessaoService);
  const router = inject(Router);
  return next(request).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status === HttpStatusCode.Unauthorized && sessaoService.autenticado()) {
        sessaoService.sair();
        void router.navigate(['/login'], { queryParams: { retorno: router.url } });
      }
      const respostaPadrao = erro.error as StandardResponse | null;
      const mensagem =
        respostaPadrao?.mensagem ?? erro.message ?? 'Falha ao comunicar com o servidor.';
      messageService.add({ severity: 'error', summary: 'Erro', detail: mensagem });
      return throwError(() => erro);
    }),
  );
};
