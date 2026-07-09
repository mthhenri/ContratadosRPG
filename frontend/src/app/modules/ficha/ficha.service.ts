import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import {
  FichaAcessoConcedidoDto,
  FichaAcessoResumoDto,
  FichaAcessoRevogadoDto,
  FichaAlteradaDto,
  FichaAlterarDto,
  FichaCriadaDto,
  FichaCriarDto,
  FichaRecuperadaDto,
  FichaResumoDto,
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
 * Escopo m3-06: criação, recuperação e alteração da própria ficha (a tela de criação/edição).
 * m3-07 acrescenta a listagem de fichas da campanha, a visualização por terceiros e a UI de
 * concessão/revogação de acesso (m3-04) — cada método só transporta; o recorte visível e a
 * permissão continuam sendo arbitrados pelo backend (§14).
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

  /**
   * Lista as fichas de uma campanha visíveis ao usuário autenticado. O recorte (dono vê a própria,
   * mestre vê todas, outro membro só as concedidas) é filtrado pelo backend (§14) — o front só
   * apresenta, sem duplicar regra.
   */
  listarFichas(campanhaId: number): Observable<FichaResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<FichaResumoDto[]>>(this.base, { params: { campanhaId } })
      .pipe(map((resposta) => resposta.dados as FichaResumoDto[]));
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

  /**
   * Lista as concessões de visualização ativas de uma ficha (membro + `nome`). Só o dono ou o
   * mestre listam (§14) — o backend barra os demais com 403. Base da UI de gestão de acesso (m3-04).
   */
  listarAcessos(fichaId: number): Observable<FichaAcessoResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<FichaAcessoResumoDto[]>>(`${this.base}/${fichaId}/acesso`)
      .pipe(map((resposta) => resposta.dados as FichaAcessoResumoDto[]));
  }

  /**
   * Concede a visualização de uma ficha a outro membro da campanha (só o dono ou o mestre — §14).
   * Idempotente no backend (uma concessão ativa por par ficha/usuário). O `fichaId` vai na rota; o
   * `usuarioId` (membro alvo) no corpo.
   */
  concederAcesso(fichaId: number, usuarioId: number): Observable<FichaAcessoConcedidoDto> {
    return this.httpClient
      .post<StandardResponse<FichaAcessoConcedidoDto>>(`${this.base}/${fichaId}/acesso`, { usuarioId })
      .pipe(map((resposta) => resposta.dados as FichaAcessoConcedidoDto));
  }

  /**
   * Revoga a visualização de uma ficha de um membro — soft delete no backend (só o dono ou o
   * mestre — §14). Após revogar, o membro deixa de ver a ficha (some da listagem/recuperação dele).
   */
  revogarAcesso(fichaId: number, usuarioId: number): Observable<FichaAcessoRevogadoDto> {
    return this.httpClient
      .delete<StandardResponse<FichaAcessoRevogadoDto>>(`${this.base}/${fichaId}/acesso/${usuarioId}`)
      .pipe(map((resposta) => resposta.dados as FichaAcessoRevogadoDto));
  }
}
