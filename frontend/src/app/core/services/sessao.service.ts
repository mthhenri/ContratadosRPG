import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import {
  UsuarioAutenticadoDto,
  UsuarioAutenticarDto,
  UsuarioCriadoDto,
  UsuarioCriarDto,
} from '@contratados-rpg/shared/dtos/usuario';

import { environment } from '../../../environments/environment';

/** Chave única da sessão persistida no `localStorage` (token + identidade do usuário). */
const CHAVE_SESSAO = 'contratados-rpg.sessao';

/**
 * Estado de sessão do usuário autenticado, em runtime (Signals) e persistido. É o único
 * dono do token JWT no frontend: o `auth-token.interceptor` lê o token daqui e o injeta no
 * header das chamadas à API; o `error-handler.interceptor` chama `sair()` num `401`.
 *
 * A sessão guarda o `UsuarioAutenticadoDto` inteiro (token + `{id,login,nome}`) — o mesmo
 * payload devolvido pelo login (m2-02) —, persistido em `localStorage` e restaurado no boot,
 * de modo que um F5 mantém a sessão sem nova chamada à API. Ações: `registrar` (cria a conta,
 * **sem** sessão), `logar` (autentica e abre a sessão) e `sair` (encerra e limpa).
 */
@Injectable({ providedIn: 'root' })
export class SessaoService {
  private readonly httpClient = inject(HttpClient);

  private readonly sessaoAtual = signal<UsuarioAutenticadoDto | null>(this.restaurar());

  /** Usuário autenticado (token + identidade) ou `null` quando deslogado. */
  readonly usuario = this.sessaoAtual.asReadonly();

  /** `true` enquanto houver sessão aberta — base do guard de rota e da topbar. */
  readonly autenticado = computed(() => this.sessaoAtual() !== null);

  /** Token JWT da sessão atual, ou `null`. Lido pelo `auth-token.interceptor`. */
  obterToken(): string | null {
    return this.sessaoAtual()?.token ?? null;
  }

  /**
   * Registra uma nova conta (`POST /autenticacao/registro`). **Não** abre sessão — a tela de
   * registro encadeia um `logar` em seguida para autenticar o usuário recém-criado.
   */
  registrar(dto: UsuarioCriarDto): Observable<UsuarioCriadoDto> {
    return this.httpClient
      .post<StandardResponse<UsuarioCriadoDto>>(`${environment.apiBase}/autenticacao/registro`, dto)
      .pipe(map((resposta) => resposta.dados as UsuarioCriadoDto));
  }

  /**
   * Autentica (`POST /autenticacao/login`) e abre a sessão: guarda o `UsuarioAutenticadoDto`
   * em memória (Signal) e no `localStorage`.
   */
  logar(dto: UsuarioAutenticarDto): Observable<UsuarioAutenticadoDto> {
    return this.httpClient
      .post<StandardResponse<UsuarioAutenticadoDto>>(`${environment.apiBase}/autenticacao/login`, dto)
      .pipe(
        map((resposta) => resposta.dados as UsuarioAutenticadoDto),
        tap((usuarioAutenticado) => this.abrirSessao(usuarioAutenticado)),
      );
  }

  /**
   * Reflete no estado de sessão os dados de perfil alterados (`nome`/`login`) — mantendo o token
   * e o `id`. Chamado pela tela de perfil (m2-14) após um `alterarPerfil` bem-sucedido, para que
   * a identidade exibida na topbar acompanhe a alteração sem novo login.
   */
  atualizarPerfil(dados: { nome: string; login: string }): void {
    this.sessaoAtual.update((sessao) =>
      sessao ? { ...sessao, nome: dados.nome, login: dados.login } : sessao,
    );
    const sessaoAtual = this.sessaoAtual();
    if (sessaoAtual) {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessaoAtual));
    }
  }

  /** Encerra a sessão: limpa o Signal e o `localStorage`. */
  sair(): void {
    this.sessaoAtual.set(null);
    localStorage.removeItem(CHAVE_SESSAO);
  }

  private abrirSessao(usuarioAutenticado: UsuarioAutenticadoDto): void {
    this.sessaoAtual.set(usuarioAutenticado);
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuarioAutenticado));
  }

  /** Restaura a sessão persistida no boot; descarta conteúdo corrompido. */
  private restaurar(): UsuarioAutenticadoDto | null {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) {
      return null;
    }
    try {
      const sessaoPersistida = JSON.parse(bruto) as UsuarioAutenticadoDto;
      return sessaoPersistida?.token ? sessaoPersistida : null;
    } catch {
      localStorage.removeItem(CHAVE_SESSAO);
      return null;
    }
  }
}
