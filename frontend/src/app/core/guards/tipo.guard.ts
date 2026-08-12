import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../services/sessao.service';

/**
 * Cria um guard para rotas liberadas somente aos tipos informados.
 *
 * @example
 * ```ts
 * {
 *   path: 'modulo-em-teste',
 *   canActivate: [tipoGuard([TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER])],
 *   loadChildren: () => import('./modulo.routes').then((modulo) => modulo.routes),
 * }
 * ```
 *
 * Quando o módulo for aberto a todos os usuários autenticados, substitua este guard pelo
 * `autenticacaoGuard`. Não combine os dois: `tipoGuard` já trata a ausência de sessão.
 */
export function tipoGuard(tiposPermitidos: readonly TipoUsuarioEnum[]): CanActivateFn {
  return (_rota, estado) => {
    const sessaoService = inject(SessaoService);
    const router = inject(Router);
    const usuario = sessaoService.usuario();

    if (!usuario) {
      return router.createUrlTree(['/login'], { queryParams: { retorno: estado.url } });
    }

    return tiposPermitidos.includes(usuario.tipo)
      ? true
      : router.createUrlTree(['/acesso-negado']);
  };
}
