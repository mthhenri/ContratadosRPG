import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpStatusCode,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';

import { SessaoService } from '../services/sessao.service';
import { NotificacaoService } from '../../shared/ui/notificacao/notificacao.service';

/**
 * Status de erro que a tela trata **no próprio controle** — o interceptor não os anuncia em
 * toast, para a mesma falha não aparecer duas vezes. Ex.: a biblioteca (m9-04) mostra a recusa de
 * um upload de imagem junto do botão e o conflito de versão (409) como aviso no editor. O resto
 * continua saindo em toast, e o tratamento do 401 não muda.
 */
export const ERROS_TRATADOS_NA_TELA = new HttpContextToken<readonly number[]>(() => []);

/**
 * Captura erros de requisição HTTP e exibe uma notificação (`NotificacaoService`, ui-02) com a
 * mensagem padronizada do backend (`StandardResponse.mensagem`) quando disponível, reencaminhando
 * o erro para quem chamou. Registrado em `app.config.ts` via `withInterceptors`, depois do
 * `auth-token.interceptor`.
 *
 * Num `401` com sessão aberta (token ausente/expirado/inválido — o `JwtAuthGuard` do backend
 * reserva o 401 para falta de autenticação), encerra a sessão e leva ao login guardando a URL
 * atual em `retorno` para retomar o destino após reautenticar. O guard só dispara com sessão
 * ativa: um 401 durante o próprio login (credenciais erradas são 400, não 401) não redireciona.
 */
export const errorHandlerInterceptor: HttpInterceptorFn = (request, next) => {
  const notificacaoService = inject(NotificacaoService);
  const sessaoService = inject(SessaoService);
  const router = inject(Router);
  return next(request).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status === HttpStatusCode.Unauthorized && sessaoService.autenticado()) {
        sessaoService.sair();
        void router.navigate(['/login'], { queryParams: { retorno: router.url } });
      }
      if (request.context.get(ERROS_TRATADOS_NA_TELA).includes(erro.status)) {
        return throwError(() => erro);
      }
      const respostaPadrao = erro.error as StandardResponse | null;
      const mensagem =
        respostaPadrao?.mensagem ?? erro.message ?? 'Falha ao comunicar com o servidor.';
      notificacaoService.notificar({ severidade: 'erro', resumo: 'Erro', detalhe: mensagem });
      return throwError(() => erro);
    }),
  );
};
