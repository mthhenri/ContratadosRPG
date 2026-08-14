import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

import { CampanhaService } from '../../modules/campanha/campanha.service';
import { SessaoService } from '../services/sessao.service';

/**
 * Restringe rotas ao mestre da campanha do segmento `:campanhaId` — ex.: criação de criatura
 * (m4-04, `AGENTS.md` §14: "Criar criatura/NPC | Dono ❌ | Mestre ✅"). O backend já barra com
 * 403 quem não é mestre (`m4-03`); este guard só evita a viagem até o formulário para quem
 * nunca teria a criação aceita — mesmo espírito de UX do `adminGuard`, mas escopado à campanha
 * em vez do tipo global do usuário.
 */
export const mestreCampanhaGuard: CanActivateFn = (rota) => {
  const campanhaService = inject(CampanhaService);
  const sessaoService = inject(SessaoService);
  const router = inject(Router);
  const campanhaId = Number(rota.paramMap.get('campanhaId'));
  const usuarioId = sessaoService.usuario()?.id;

  return campanhaService.listarMembros(campanhaId).pipe(
    map((membros) =>
      membros.some(
        (membro) => membro.usuarioId === usuarioId && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
      )
        ? true
        : router.createUrlTree(['/acesso-negado']),
    ),
    catchError(() => of(router.createUrlTree(['/acesso-negado']))),
  );
};
