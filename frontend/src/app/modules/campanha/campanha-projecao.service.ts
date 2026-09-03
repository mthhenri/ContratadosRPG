import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import type { CampanhaPainelEspectadorDto } from '@contratados-rpg/shared/dtos/campanha';

import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP das projeções de leitura de `m8-espectadores-campanha` (m8-02 backend, m8-03
 * frontend) — `GET campanha/:id/painel-espectador`, legível por `ESPECTADOR` e por `MESTRE` em
 * prévia (o payload é idêntico nos dois casos — privilégio de mestre nunca vaza). Só transporte,
 * sem regra de negócio: quem decide o recorte é sempre `CampanhaProjecaoService` (backend). A
 * prévia de jogador (`GET campanha/:id/previa-jogador/:usuarioAlvoId`) é consumida só a partir da
 * `m8-04` — fora do escopo desta task.
 */
@Injectable({ providedIn: 'root' })
export class CampanhaProjecaoService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/campanha`;

  /** Painel do espectador — identidade segura da campanha + feed paginado de rolagens `PUBLICA`. */
  recuperarPainelEspectador(
    id: number,
    pagina = 1,
    itensPorPagina = 20,
  ): Observable<CampanhaPainelEspectadorDto> {
    return this.httpClient
      .get<StandardResponse<CampanhaPainelEspectadorDto>>(`${this.base}/${id}/painel-espectador`, {
        params: { pagina, itensPorPagina },
      })
      .pipe(map((resposta) => resposta.dados as CampanhaPainelEspectadorDto));
  }
}
