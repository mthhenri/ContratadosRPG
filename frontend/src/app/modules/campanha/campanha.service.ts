import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import {
  CampanhaConviteRegeneradoDto,
  CampanhaCriadaDto,
  CampanhaCriarDto,
  CampanhaEntradaDto,
  CampanhaEntrarDto,
  CampanhaMembroResumoDto,
  CampanhaRecuperadaDto,
  CampanhaResumoDto,
} from '@contratados-rpg/shared/dtos/campanha';

import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP do módulo `campanha` (m2-07) — consome os endpoints protegidos das m2-04/m2-05
 * (`/campanha…`), com o JWT injetado pelo `auth-token.interceptor`. Só transporte: extrai o
 * `dados` do `StandardResponse`, sem regra de negócio (a autoridade é o backend, §14). Os DTOs
 * vêm do shared (`./dtos/campanha`) — nunca redefinidos no front. Em dev `apiBase` é vazio e a
 * chamada relativa passa pelo proxy até `http://localhost:3100`; em produção aponta ao Render.
 */
@Injectable({ providedIn: 'root' })
export class CampanhaService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/campanha`;

  /** Lista as campanhas de que o usuário autenticado é membro, com o papel dele em cada uma. */
  listarCampanhas(): Observable<CampanhaResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<CampanhaResumoDto[]>>(this.base)
      .pipe(map((resposta) => resposta.dados as CampanhaResumoDto[]));
  }

  /** Cria uma campanha; o usuário autenticado vira `MESTRE` e recebe o `codigoConvite` gerado. */
  criarCampanha(dto: CampanhaCriarDto): Observable<CampanhaCriadaDto> {
    return this.httpClient
      .post<StandardResponse<CampanhaCriadaDto>>(this.base, dto)
      .pipe(map((resposta) => resposta.dados as CampanhaCriadaDto));
  }

  /** Ingressa numa campanha pelo `codigoConvite`; entra com papel `JOGADOR`. */
  entrarCampanha(dto: CampanhaEntrarDto): Observable<CampanhaEntradaDto> {
    return this.httpClient
      .post<StandardResponse<CampanhaEntradaDto>>(`${this.base}/entrar`, dto)
      .pipe(map((resposta) => resposta.dados as CampanhaEntradaDto));
  }

  /** Recupera uma campanha (exige ser membro) — inclui o `codigoConvite`. */
  recuperarCampanha(id: number): Observable<CampanhaRecuperadaDto> {
    return this.httpClient
      .get<StandardResponse<CampanhaRecuperadaDto>>(`${this.base}/${id}`)
      .pipe(map((resposta) => resposta.dados as CampanhaRecuperadaDto));
  }

  /** Lista os membros de uma campanha (nome + papel) — visível a qualquer membro. */
  listarMembros(id: number): Observable<CampanhaMembroResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<CampanhaMembroResumoDto[]>>(`${this.base}/${id}/membros`)
      .pipe(map((resposta) => resposta.dados as CampanhaMembroResumoDto[]));
  }

  /** Regenera o convite (só mestre — o backend barra o jogador com 403). Invalida o anterior. */
  regenerarConvite(id: number): Observable<CampanhaConviteRegeneradoDto> {
    return this.httpClient
      .post<StandardResponse<CampanhaConviteRegeneradoDto>>(`${this.base}/${id}/convite/regenerar`, {})
      .pipe(map((resposta) => resposta.dados as CampanhaConviteRegeneradoDto));
  }
}
