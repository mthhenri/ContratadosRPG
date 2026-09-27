import { HttpClient, HttpContext, HttpParams, HttpStatusCode } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type {
  DocumentoAlteradoDto,
  DocumentoAlterarDto,
  DocumentoBuscaResultadoDto,
  DocumentoBuscarDto,
  DocumentoCriadoDto,
  DocumentoCriarDto,
  DocumentoImagemAlteradaDto,
  DocumentoOcultadoDto,
  DocumentoRecuperadoDto,
  DocumentoResumoDto,
  DocumentoReveladoDto,
} from '@contratados-rpg/shared/dtos/documento';
import type { PaginatedResult, StandardResponse } from '@contratados-rpg/shared/interfaces';

import { environment } from '../../../environments/environment';
import { ERROS_TRATADOS_NA_TELA } from '../../core/interceptors/error-handler.interceptor';

/**
 * Cliente HTTP do módulo `documento` (m9-04) — um método por endpoint da m9-02 e da busca da m9-03.
 * Só transporte: extrai o `dados` do `StandardResponse` (a autoridade é o backend, §14 — inclusive
 * a trava anti-vazamento: quem não é mestre nunca recebe um documento oculto).
 *
 * Mesma divisão de rotas do `DocumentoController`: criar/listar/reordenar sob
 * `campanha/:id/documento`, o resto sob `documento/:id`. Duas chamadas declaram erros que a tela
 * mostra no próprio controle (`ERROS_TRATADOS_NA_TELA`), sem o toast genérico: o conflito de versão
 * do `alterar` e a recusa do upload de imagem.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/documento`;

  private baseCampanha(campanhaId: number): string {
    return `${environment.apiBase}/campanha/${campanhaId}/documento`;
  }

  /** Lista a biblioteca na ordem manual — o mestre recebe todos, os demais só os revelados. */
  listar(campanhaId: number): Observable<DocumentoResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<DocumentoResumoDto[]>>(this.baseCampanha(campanhaId))
      .pipe(map((resposta) => resposta.dados as DocumentoResumoDto[]));
  }

  /**
   * Busca textual na biblioteca (m9-03) — título e conteúdo, já recortada pelo papel no backend: o
   * mestre acha os ocultos, jogador e espectador só o revelado. `trecho` traz o termo entre `⟦ ⟧`.
   */
  buscar(dto: DocumentoBuscarDto): Observable<PaginatedResult<DocumentoBuscaResultadoDto>> {
    let parametros = new HttpParams().set('termo', dto.termo);
    if (dto.pagina !== undefined) {
      parametros = parametros.set('pagina', dto.pagina);
    }
    if (dto.limite !== undefined) {
      parametros = parametros.set('limite', dto.limite);
    }
    return this.httpClient
      .get<StandardResponse<PaginatedResult<DocumentoBuscaResultadoDto>>>(
        `${this.baseCampanha(dto.campanhaId)}/busca`,
        { params: parametros },
      )
      .pipe(map((resposta) => resposta.dados as PaginatedResult<DocumentoBuscaResultadoDto>));
  }

  /** O documento completo, com o conteúdo para o leitor. */
  recuperar(id: number): Observable<DocumentoRecuperadoDto> {
    return this.httpClient
      .get<StandardResponse<DocumentoRecuperadoDto>>(`${this.base}/${id}`)
      .pipe(map((resposta) => resposta.dados as DocumentoRecuperadoDto));
  }

  /** Cria um documento (só mestre) — nasce oculto, no fim da ordem. */
  criar(
    campanhaId: number,
    dto: Omit<DocumentoCriarDto, 'campanhaId'>,
  ): Observable<DocumentoCriadoDto> {
    return this.httpClient
      .post<StandardResponse<DocumentoCriadoDto>>(this.baseCampanha(campanhaId), dto)
      .pipe(map((resposta) => resposta.dados as DocumentoCriadoDto));
  }

  /**
   * Salva título e conteúdo contra a versão editada (`updatedDate`). Versão defasada volta `409`,
   * que a tela mostra como aviso no editor em vez de toast.
   */
  alterar(dto: DocumentoAlterarDto): Observable<DocumentoAlteradoDto> {
    const { id, ...corpo } = dto;
    return this.httpClient
      .put<StandardResponse<DocumentoAlteradoDto>>(`${this.base}/${id}`, corpo, {
        context: new HttpContext().set(ERROS_TRATADOS_NA_TELA, [HttpStatusCode.Conflict]),
      })
      .pipe(map((resposta) => resposta.dados as DocumentoAlteradoDto));
  }

  /** Remove (soft delete) o documento. */
  remover(id: number): Observable<void> {
    return this.httpClient
      .delete<StandardResponse<null>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }

  /** Revela à mesa — idempotente no backend. */
  revelar(id: number): Observable<DocumentoReveladoDto> {
    return this.httpClient
      .post<StandardResponse<DocumentoReveladoDto>>(`${this.base}/${id}/revelar`, {})
      .pipe(map((resposta) => resposta.dados as DocumentoReveladoDto));
  }

  /** Oculta da mesa — idempotente no backend. */
  ocultar(id: number): Observable<DocumentoOcultadoDto> {
    return this.httpClient
      .post<StandardResponse<DocumentoOcultadoDto>>(`${this.base}/${id}/ocultar`, {})
      .pipe(map((resposta) => resposta.dados as DocumentoOcultadoDto));
  }

  /** Reordena a biblioteca — `ordem` leva os ids de **todos** os documentos, na nova ordem. */
  reordenar(campanhaId: number, ordem: readonly number[]): Observable<DocumentoResumoDto[]> {
    return this.httpClient
      .put<StandardResponse<DocumentoResumoDto[]>>(`${this.baseCampanha(campanhaId)}/ordem`, {
        ordem,
      })
      .pipe(map((resposta) => resposta.dados as DocumentoResumoDto[]));
  }

  /**
   * Troca a imagem de um documento `IMAGEM` — multipart com o campo `arquivo`. A recusa do backend
   * (`400`: tipo, tamanho, arquivo vazio) volta à tela, que a mostra junto do controle.
   */
  enviarImagem(id: number, arquivo: File): Observable<DocumentoImagemAlteradaDto> {
    const formulario = new FormData();
    formulario.append('arquivo', arquivo);
    return this.httpClient
      .post<StandardResponse<DocumentoImagemAlteradaDto>>(`${this.base}/${id}/imagem`, formulario, {
        context: new HttpContext().set(ERROS_TRATADOS_NA_TELA, [HttpStatusCode.BadRequest]),
      })
      .pipe(map((resposta) => resposta.dados as DocumentoImagemAlteradaDto));
  }
}
