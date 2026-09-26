import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type {
  CenaCriadaDto,
  CenaCriarDto,
  CenaRecuperadaDto,
  CenaResumoDto,
} from '@contratados-rpg/shared/dtos/cena';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';

import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP do módulo `cena` (m7-23) — consome os endpoints da m7-22. Só transporte: extrai o
 * `dados` do `StandardResponse` e nada mais (a autoridade é o backend, §14 — inclusive a trava
 * anti-vazamento: a listagem do jogador já chega sem as cenas `PLANEJADA`).
 *
 * Mesma divisão de rotas do `CenaController`: criar/listar/reordenar sob `campanha/:id/cena`, o
 * resto sob `cena/:id`.
 */
@Injectable({ providedIn: 'root' })
export class CenaService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/cena`;

  private baseCampanha(campanhaId: number): string {
    return `${environment.apiBase}/campanha/${campanhaId}/cena`;
  }

  /**
   * Cria uma cena tipada (só mestre). `ativarImediatamente` já a abre, encerrando a ativa atual;
   * sem ele nasce `PLANEJADA`. Tipo com iniciativa já nasce com o encontro em `MONTAGEM`.
   */
  criarCena(campanhaId: number, dto: CenaCriarDto): Observable<CenaCriadaDto> {
    return this.httpClient
      .post<StandardResponse<CenaCriadaDto>>(this.baseCampanha(campanhaId), dto)
      .pipe(map((resposta) => resposta.dados as CenaCriadaDto));
  }

  /** Lista as cenas da campanha, já ordenadas: a ativa, as planejadas pela ordem, as encerradas. */
  listarPorCampanha(campanhaId: number): Observable<CenaResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<CenaResumoDto[]>>(this.baseCampanha(campanhaId))
      .pipe(map((resposta) => resposta.dados as CenaResumoDto[]));
  }

  /** Reordena as planejadas — `ordem` leva **todas** elas, a primeira é a próxima a abrir. */
  reordenarCenas(campanhaId: number, ordem: readonly number[]): Observable<CenaResumoDto[]> {
    return this.httpClient
      .put<StandardResponse<CenaResumoDto[]>>(`${this.baseCampanha(campanhaId)}/ordem`, { ordem })
      .pipe(map((resposta) => resposta.dados as CenaResumoDto[]));
  }

  /** Estado completo da cena, com o encontro dela já no recorte de quem pediu. */
  recuperarCena(id: number): Observable<CenaRecuperadaDto> {
    return this.httpClient
      .get<StandardResponse<CenaRecuperadaDto>>(`${this.base}/${id}`)
      .pipe(map((resposta) => resposta.dados as CenaRecuperadaDto));
  }

  /** `PLANEJADA → ATIVA` — encerra a ativa atual da campanha na mesma operação. */
  abrirCena(id: number): Observable<CenaRecuperadaDto> {
    return this.httpClient
      .post<StandardResponse<CenaRecuperadaDto>>(`${this.base}/${id}/abrir`, {})
      .pipe(map((resposta) => resposta.dados as CenaRecuperadaDto));
  }

  /** `ATIVA → ENCERRADA` — encerra junto o encontro dela, se houver. */
  encerrarCena(id: number): Observable<CenaRecuperadaDto> {
    return this.httpClient
      .post<StandardResponse<CenaRecuperadaDto>>(`${this.base}/${id}/encerrar`, {})
      .pipe(map((resposta) => resposta.dados as CenaRecuperadaDto));
  }
}
