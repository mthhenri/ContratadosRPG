import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { CampanhaProjecaoService } from '../../modules/campanha/campanha-projecao.service';

/**
 * Restringe `/campanhas/:id/previa/:usuarioAlvoId` a quem o backend realmente deixa abrir a
 * prévia — só o mestre da campanha, e só quando `usuarioAlvoId` é `JOGADOR` ativo dela (m8-04,
 * `recuperarPreviaJogador`). Mesmo racional de `espectadorCampanhaGuard` (m8-03): o guard chama o
 * próprio endpoint que a página vai carregar e propaga sucesso/falha, sem reimplementar
 * permissão (proibição #28).
 */
export const previaJogadorCampanhaGuard: CanActivateFn = (rota) => {
  const campanhaProjecaoService = inject(CampanhaProjecaoService);
  const router = inject(Router);
  const campanhaId = Number(rota.paramMap.get('id'));
  const usuarioAlvoId = Number(rota.paramMap.get('usuarioAlvoId'));

  return campanhaProjecaoService.recuperarPreviaJogador(campanhaId, usuarioAlvoId).pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/acesso-negado']))),
  );
};
