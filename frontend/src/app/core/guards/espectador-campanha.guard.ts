import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import type { CampanhaPainelEspectadorDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaProjecaoService } from '../../modules/campanha/campanha-projecao.service';

/**
 * Restringe `/campanhas/:id/espectador` a quem o backend realmente deixa abrir o painel do
 * espectador — o espectador real da campanha ou o mestre em prévia (m8-03, matriz de permissões
 * de `m8-espectadores-campanha.spec.md`: "Abrir painel do espectador | prévia | ❌ | ✅"). Não dá
 * para usar `listarMembros`/`recuperarCampanha` como `mestreCampanhaGuard` faz: os dois já
 * recusam `ESPECTADOR` desde o m8-02, então um espectador legítimo cairia sempre em
 * `/acesso-negado`. A única rota que `ESPECTADOR` e `MESTRE`-em-prévia compartilham é a própria
 * projeção do painel — o backend já centraliza a regra ali (proibição #28); este guard só chama o
 * mesmo endpoint que a página vai carregar e propaga sucesso/falha, sem reimplementar permissão.
 */
export const espectadorCampanhaResolver: ResolveFn<CampanhaPainelEspectadorDto | ReturnType<Router['createUrlTree']>> = (rota) => {
  const campanhaProjecaoService = inject(CampanhaProjecaoService);
  const router = inject(Router);
  const campanhaId = Number(rota.paramMap.get('id'));

  return campanhaProjecaoService.recuperarPainelEspectador(campanhaId, 1, 20).pipe(
    catchError(() => of(router.createUrlTree(['/acesso-negado']))),
  );
};
