import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import {
  FichaAlteradaDto,
  FichaAlterarDto,
  FichaCriadaDto,
  FichaCriarDto,
  FichaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP do módulo `ficha` (m3-06) — consome os endpoints protegidos do CRUD de ficha
 * (m3-03), com o JWT injetado pelo `auth-token.interceptor`. Só transporte: extrai o `dados` do
 * `StandardResponse`, sem regra de negócio (a autoridade — permissões §14 e validação via
 * `shared/regras` — é do backend). Os DTOs vêm do shared (`./dtos/ficha`) — nunca redefinidos no
 * front. Em dev `apiBase` é vazio e a chamada relativa passa pelo proxy até
 * `http://localhost:3100`; em produção aponta ao Render.
 *
 * Escopo m3-06: criação, recuperação e alteração da própria ficha (a tela de criação/edição). A
 * listagem de fichas da campanha e a visualização por terceiros são m3-07; a concessão de acesso
 * (m3-04) ganha UI em m3-07.
 */
@Injectable({ providedIn: 'root' })
export class FichaService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/ficha`;

  /**
   * Cria a ficha de jogador do usuário autenticado na campanha informada. O documento de jogo
   * (`dados`) é validado contra `shared/regras` no backend antes de persistir (§11 camada 2).
   */
  criarFicha(dto: FichaCriarDto): Observable<FichaCriadaDto> {
    return this.httpClient
      .post<StandardResponse<FichaCriadaDto>>(this.base, dto)
      .pipe(map((resposta) => resposta.dados as FichaCriadaDto));
  }

  /** Recupera uma ficha pelo `id` (exige permissão de visualização — §14; barrado com 403 no back). */
  recuperarFicha(id: number): Observable<FichaRecuperadaDto> {
    return this.httpClient
      .get<StandardResponse<FichaRecuperadaDto>>(`${this.base}/${id}`)
      .pipe(map((resposta) => resposta.dados as FichaRecuperadaDto));
  }

  /**
   * Altera `nome` e o documento de jogo de uma ficha (só o dono ou o mestre — o backend barra os
   * demais com 403). O `dados` é revalidado contra `shared/regras` no backend antes de persistir.
   */
  alterarFicha(id: number, dto: FichaAlterarDto): Observable<FichaAlteradaDto> {
    return this.httpClient
      .put<StandardResponse<FichaAlteradaDto>>(`${this.base}/${id}`, dto)
      .pipe(map((resposta) => resposta.dados as FichaAlteradaDto));
  }
}
