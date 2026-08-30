import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  BuscaCampanhaDto,
  BuscaCampanhaResultadoDto,
  PaginaCadernoAlterarDto,
  PaginaCadernoCriarDto,
  PaginaCadernoDto,
  PaginaCadernoEsquadraoAlteradaDto,
  PaginaCadernoEsquadraoAlterarDto,
  PaginaCadernoEsquadraoCriarDto,
  PaginaCadernoEsquadraoEstadoDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import type { PaginatedResult, StandardResponse } from '@contratados-rpg/shared/interfaces';
import { type Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Cliente HTTP do caderno; autorização e validação permanecem no backend. */
@Injectable({ providedIn: 'root' })
export class PaginaCadernoService {
  private readonly httpClient = inject(HttpClient);
  private readonly base = environment.apiBase;

  listarPaginas(campanhaId: number): Observable<PaginaCadernoResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<PaginaCadernoResumoDto[]>>(
        `${this.base}/campanha/${campanhaId}/caderno/paginas`,
      )
      .pipe(map((resposta) => resposta.dados as PaginaCadernoResumoDto[]));
  }

  listarPaginasMembro(
    campanhaId: number,
    usuarioId: number,
  ): Observable<PaginaCadernoResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<PaginaCadernoResumoDto[]>>(
        `${this.base}/campanha/${campanhaId}/caderno/membros/${usuarioId}/paginas`,
      )
      .pipe(map((resposta) => resposta.dados as PaginaCadernoResumoDto[]));
  }

  listarPaginasEsquadrao(campanhaId: number): Observable<PaginaCadernoResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<PaginaCadernoResumoDto[]>>(
        `${this.base}/campanha/${campanhaId}/caderno/esquadrao/paginas`,
      )
      .pipe(map((resposta) => resposta.dados as PaginaCadernoResumoDto[]));
  }

  recuperarEstadoPaginaEsquadrao(id: number): Observable<PaginaCadernoEsquadraoEstadoDto> {
    return this.httpClient
      .get<StandardResponse<PaginaCadernoEsquadraoEstadoDto>>(
        `${this.base}/pagina-caderno/${id}/esquadrao/estado`,
      )
      .pipe(map((resposta) => resposta.dados as PaginaCadernoEsquadraoEstadoDto));
  }

  criarPaginaEsquadrao(
    campanhaId: number,
    dto: Omit<PaginaCadernoEsquadraoCriarDto, 'campanhaId'>,
  ): Observable<PaginaCadernoEsquadraoEstadoDto> {
    return this.httpClient
      .post<StandardResponse<PaginaCadernoEsquadraoEstadoDto>>(
        `${this.base}/campanha/${campanhaId}/caderno/esquadrao/paginas`,
        dto,
      )
      .pipe(map((resposta) => resposta.dados as PaginaCadernoEsquadraoEstadoDto));
  }

  alterarPaginaEsquadrao(
    id: number,
    dto: Omit<PaginaCadernoEsquadraoAlterarDto, 'id'>,
  ): Observable<PaginaCadernoEsquadraoAlteradaDto> {
    return this.httpClient
      .put<StandardResponse<PaginaCadernoEsquadraoAlteradaDto>>(
        `${this.base}/pagina-caderno/${id}/esquadrao/alteracoes`,
        dto,
      )
      .pipe(map((resposta) => resposta.dados as PaginaCadernoEsquadraoAlteradaDto));
  }

  excluirPaginaEsquadrao(id: number): Observable<void> {
    return this.httpClient
      .delete<StandardResponse<null>>(`${this.base}/pagina-caderno/${id}/esquadrao`)
      .pipe(map(() => undefined));
  }

  recuperarPagina(id: number): Observable<PaginaCadernoDto> {
    return this.httpClient
      .get<StandardResponse<PaginaCadernoDto>>(`${this.base}/pagina-caderno/${id}`)
      .pipe(map((resposta) => resposta.dados as PaginaCadernoDto));
  }

  criarPagina(
    campanhaId: number,
    dto: Omit<PaginaCadernoCriarDto, 'campanhaId'>,
  ): Observable<PaginaCadernoDto> {
    return this.httpClient
      .post<StandardResponse<PaginaCadernoDto>>(
        `${this.base}/campanha/${campanhaId}/caderno/paginas`,
        dto,
      )
      .pipe(map((resposta) => resposta.dados as PaginaCadernoDto));
  }

  alterarPagina(
    id: number,
    dto: Omit<PaginaCadernoAlterarDto, 'id'>,
  ): Observable<PaginaCadernoDto> {
    return this.httpClient
      .put<StandardResponse<PaginaCadernoDto>>(`${this.base}/pagina-caderno/${id}`, dto)
      .pipe(map((resposta) => resposta.dados as PaginaCadernoDto));
  }

  excluirPagina(id: number): Observable<void> {
    return this.httpClient
      .delete<StandardResponse<null>>(`${this.base}/pagina-caderno/${id}`)
      .pipe(map(() => undefined));
  }

  buscarCampanha(
    dto: BuscaCampanhaDto,
  ): Observable<PaginatedResult<BuscaCampanhaResultadoDto>> {
    let parametros = new HttpParams().set('termo', dto.termo);
    if (dto.fontes !== undefined) {
      parametros = parametros.set('fontes', dto.fontes.join(','));
    }
    if (dto.pagina !== undefined) {
      parametros = parametros.set('pagina', dto.pagina);
    }
    if (dto.limite !== undefined) {
      parametros = parametros.set('limite', dto.limite);
    }
    return this.httpClient
      .get<StandardResponse<PaginatedResult<BuscaCampanhaResultadoDto>>>(
        `${this.base}/campanha/${dto.campanhaId}/busca`,
        { params: parametros },
      )
      .pipe(
        map(
          (resposta) =>
            resposta.dados as PaginatedResult<BuscaCampanhaResultadoDto>,
        ),
      );
  }
}
