import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type {
  PatchnoteCacheReiniciadoDto,
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
 * Leitura que fura o cache do navegador (`max-age=300` das rotas públicas) — usada logo depois do
 * reinício do cache da API (pn-06). Um `Cache-Control` no pedido põe o fetch em modo `no-store`.
 */
export interface PatchnoteLeituraOpcoes {
  readonly semCacheNavegador?: boolean;
}

const CABECALHOS_SEM_CACHE = new HttpHeaders({ 'Cache-Control': 'no-cache' });

/**
 * Cliente HTTP do módulo `patchnote` (pn-04) — um método por endpoint do backend. Só
 * transporte: extrai o `dados` do `StandardResponse`; quem interpreta o Markdown é a página.
 */
@Injectable({ providedIn: 'root' })
export class PatchnoteService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/patchnote`;

  private readonly contexto = new HttpContext().set(ERROS_TRATADOS_NA_TELA, STATUS_TRATADOS_NA_TELA);

  /** Índice de versões publicadas, da mais nova para a mais antiga. */
  listar(opcoes: PatchnoteLeituraOpcoes = {}): Observable<PatchnoteResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<PatchnoteResumoDto[]>>(this.base, this.opcoesLeitura(opcoes))
      .pipe(map((resposta) => resposta.dados as PatchnoteResumoDto[]));
  }

  /** Nota completa de uma versão; 404 quando ela não existe. */
  recuperar(versao: string, opcoes: PatchnoteLeituraOpcoes = {}): Observable<PatchnoteRecuperadoDto> {
    return this.httpClient
      .get<StandardResponse<PatchnoteRecuperadoDto>>(
        `${this.base}/${encodeURIComponent(versao)}`,
        this.opcoesLeitura(opcoes),
      )
      .pipe(map((resposta) => resposta.dados as PatchnoteRecuperadoDto));
  }

  /** Esvazia o cache em memória dos patchnotes na API (pn-06) — só `ADMIN`; erro vai ao toast global. */
  reiniciarCache(): Observable<PatchnoteCacheReiniciadoDto> {
    return this.httpClient
      .post<StandardResponse<PatchnoteCacheReiniciadoDto>>(`${this.base}/cache/reiniciar`, {})
      .pipe(map((resposta) => resposta.dados as PatchnoteCacheReiniciadoDto));
  }

  private opcoesLeitura(opcoes: PatchnoteLeituraOpcoes): {
    context: HttpContext;
    headers?: HttpHeaders;
  } {
    return opcoes.semCacheNavegador
      ? { context: this.contexto, headers: CABECALHOS_SEM_CACHE }
      : { context: this.contexto };
  }
}
