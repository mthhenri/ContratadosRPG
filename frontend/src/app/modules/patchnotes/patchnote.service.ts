import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type {
  PatchnoteRecuperadoDto,
  PatchnoteResumoDto,
} from '@contratados-rpg/shared/dtos/patchnote';
import type { StandardResponse } from '@contratados-rpg/shared/interfaces';

import { environment } from '../../../environments/environment';
import { ERROS_TRATADOS_NA_TELA } from '../../core/interceptors/error-handler.interceptor';

/**
 * Falhas que a página de patchnotes mostra no próprio documento de contenção (404 = versão
 * inexistente; o resto = falha ao carregar, inclusive rede fora do ar, status 0) — sem o toast
 * genérico por cima.
 */
const STATUS_TRATADOS_NA_TELA = [0, 404, 500, 502, 503, 504] as const;

/**
 * Cliente HTTP do módulo `patchnote` (pn-04) — um método por endpoint público do backend. Só
 * transporte: extrai o `dados` do `StandardResponse`; quem interpreta o Markdown é a página.
 */
@Injectable({ providedIn: 'root' })
export class PatchnoteService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/patchnote`;

  private readonly contexto = new HttpContext().set(ERROS_TRATADOS_NA_TELA, STATUS_TRATADOS_NA_TELA);

  /** Índice de versões publicadas, da mais nova para a mais antiga. */
  listar(): Observable<PatchnoteResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<PatchnoteResumoDto[]>>(this.base, { context: this.contexto })
      .pipe(map((resposta) => resposta.dados as PatchnoteResumoDto[]));
  }

  /** Nota completa de uma versão; 404 quando ela não existe. */
  recuperar(versao: string): Observable<PatchnoteRecuperadoDto> {
    return this.httpClient
      .get<StandardResponse<PatchnoteRecuperadoDto>>(`${this.base}/${encodeURIComponent(versao)}`, {
        context: this.contexto,
      })
      .pipe(map((resposta) => resposta.dados as PatchnoteRecuperadoDto));
  }
}
