import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../services/sessao.service';

/** Restringe a área administrativa às sessões cujo tipo global atual é ADMIN. */
export const adminGuard: CanActivateFn = () => {
  const sessaoService = inject(SessaoService);
  const router = inject(Router);

  return sessaoService.usuario()?.tipo === TipoUsuarioEnum.ADMIN
    ? true
    : router.createUrlTree(['/painel']);
};
