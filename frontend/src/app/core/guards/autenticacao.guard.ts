import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessaoService } from '../services/sessao.service';

/**
 * Protege as áreas privadas: libera a navegação quando há sessão aberta e, sem sessão,
 * redireciona ao login guardando a URL pedida em `retorno` — a tela de login retoma o destino
 * após autenticar. A calculadora (e demais rotas públicas) não usa este guard e continua
 * acessível sem login. Comportamento de negócio → nome em português (CONVENTIONS §Nomes).
 */
export const autenticacaoGuard: CanActivateFn = (_rota, estado) => {
  const sessaoService = inject(SessaoService);
  const router = inject(Router);
  if (sessaoService.autenticado()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { retorno: estado.url } });
};
