import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import {
  UsuarioPerfilAlteradoDto,
  UsuarioPerfilAlterarDto,
  UsuarioRecuperadoDto,
  UsuarioSenhaAlteradaDto,
  UsuarioSenhaAlterarDto,
} from '@contratados-rpg/shared/dtos/usuario';

import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP do módulo `usuario` (m2-14) — consome os endpoints self-service protegidos do
 * perfil (m2-11) e da troca de senha (m2-03) sob `/usuario`, com o JWT injetado pelo
 * `auth-token.interceptor`. Só transporte: extrai o `dados` do `StandardResponse`, sem regra de
 * negócio (a autoridade é o backend, §14). Os DTOs vêm do shared (`./dtos/usuario`) — nunca
 * redefinidos no front. Em dev `apiBase` é vazio e a chamada relativa passa pelo proxy até
 * `http://localhost:3100`; em produção aponta ao Render.
 */
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/usuario`;

  /** Recupera o perfil do usuário autenticado (nome/login) — o `id` sai do JWT no backend. */
  recuperarPerfil(): Observable<UsuarioRecuperadoDto> {
    return this.httpClient
      .get<StandardResponse<UsuarioRecuperadoDto>>(`${this.base}/perfil`)
      .pipe(map((resposta) => resposta.dados as UsuarioRecuperadoDto));
  }

  /** Altera nome/login do próprio perfil; login em uso é barrado pelo backend (400 → toast). */
  alterarPerfil(dto: UsuarioPerfilAlterarDto): Observable<UsuarioPerfilAlteradoDto> {
    return this.httpClient
      .patch<StandardResponse<UsuarioPerfilAlteradoDto>>(`${this.base}/perfil`, dto)
      .pipe(map((resposta) => resposta.dados as UsuarioPerfilAlteradoDto));
  }

  /** Troca a própria senha (`senhaAtual` + `novaSenha`); senha atual incorreta é barrada no backend. */
  alterarSenha(dto: UsuarioSenhaAlterarDto): Observable<UsuarioSenhaAlteradaDto> {
    return this.httpClient
      .patch<StandardResponse<UsuarioSenhaAlteradaDto>>(`${this.base}/senha`, dto)
      .pipe(map((resposta) => resposta.dados as UsuarioSenhaAlteradaDto));
  }

  /** Exclui (soft delete) a própria conta. Cabe à tela encerrar a sessão em seguida. */
  excluirConta(): Observable<void> {
    return this.httpClient
      .delete<StandardResponse<null>>(this.base)
      .pipe(map(() => undefined));
  }
}
