import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';

/**
 * Captura erros de requisição HTTP e exibe um toast PrimeNG com a mensagem padronizada do
 * backend (`StandardResponse.mensagem`) quando disponível, reencaminhando o erro para quem
 * chamou. Registrado em `app.config.ts` via `withInterceptors`. O `auth-token.interceptor`
 * (JWT) nasce no M2.
 */
export const errorHandlerInterceptor: HttpInterceptorFn = (request, next) => {
  const messageService = inject(MessageService);
  return next(request).pipe(
    catchError((erro: HttpErrorResponse) => {
      const respostaPadrao = erro.error as StandardResponse | null;
      const mensagem =
        respostaPadrao?.mensagem ?? erro.message ?? 'Falha ao comunicar com o servidor.';
      messageService.add({ severity: 'error', summary: 'Erro', detail: mensagem });
      return throwError(() => erro);
    }),
  );
};
