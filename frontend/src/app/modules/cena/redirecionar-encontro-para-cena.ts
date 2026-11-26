import { inject } from '@angular/core';
import { RedirectFunction, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { EncontroService } from '../encontro/encontro.service';

/**
 * Redirect de `/campanhas/:campanhaId/iniciativa/:encontroId` (endereço de combate do histórico
 * antes da m7-23) para a cena dona do encontro. A URL antiga só tem o id do encontro, então a cena
 * sai de uma consulta ao backend (`EncontroRecuperadoDto.cenaId`); se ela falhar (encontro
 * inexistente, ou de uma cena que o usuário não pode ver), cai no hub. O `?encontro=` mantém o combate
 * certo: uma cena pode ter vários (`cena-trocar-tipo`).
 */
export const redirecionarEncontroParaCena: RedirectFunction = ({ params }) => {
  const router = inject(Router);
  const hub = router.createUrlTree(['/campanhas', params['campanhaId'], 'cenas']);
  return inject(EncontroService)
    .recuperarEncontro(Number(params['encontroId']))
    .pipe(
      map((encontro) =>
        router.createUrlTree(['/campanhas', params['campanhaId'], 'cenas', encontro.cenaId], {
          queryParams: { encontro: encontro.id },
        }),
      ),
      catchError(() => of(hub)),
    );
};
