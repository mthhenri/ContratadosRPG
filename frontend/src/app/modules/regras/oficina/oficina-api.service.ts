import { HttpClient, HttpContext } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type {
    RegraPecaAlteradaDto, RegraPecaArvoreItemDto, RegraPecaCriadaDto, RegraPecaCriarDto,
    RegraPecaDuplicadaDto, RegraPecaExcluidaDto, RegraPecaMovidaDto, RegraPecaNomeAlteradaDto,
    LivroPublicadoDto, LivroPublicarDto, LivroVersaoRecuperadaDto, LivroVersaoResumoDto,
    RegraPecaRecuperadaDto, RegraPecaRestauradaDto,
} from "@contratados-rpg/shared/dtos/livro";
import type { StandardResponse } from "@contratados-rpg/shared/interfaces";
import { Observable, map } from "rxjs";

import { environment } from "../../../../environments/environment";
import { ERROS_TRATADOS_NA_TELA } from "../../../core/interceptors/error-handler.interceptor";

type DadosDaPeca = RegraPecaRecuperadaDto["dados"];

/**
 * Chamadas da Oficina à API de edição (`/livros/<código>/pecas`, só ADMIN). O conflito de revisão
 * (409), a recusa de forma (400) e a rede/servidor fora do ar são tratados pela tela da Oficina, não por toast genérico.
 */
@Injectable({ providedIn: "root" })
export class OficinaApi {
    private readonly httpClient = inject(HttpClient);
    private readonly contexto = new HttpContext().set(ERROS_TRATADOS_NA_TELA, [0, 400, 404, 409, 500, 502, 503, 504]);

    private base(codigo: string): string {
        return `${environment.apiBase}/livros/${encodeURIComponent(codigo)}/pecas`;
    }

    listar(codigo: string): Observable<RegraPecaArvoreItemDto[]> {
        return this.httpClient.get<StandardResponse<RegraPecaArvoreItemDto[]>>(this.base(codigo))
            .pipe(map((resposta) => resposta.dados as RegraPecaArvoreItemDto[]));
    }

    recuperar(codigo: string, id: number): Observable<RegraPecaRecuperadaDto> {
        return this.httpClient.get<StandardResponse<RegraPecaRecuperadaDto>>(`${this.base(codigo)}/${id}`)
            .pipe(map((resposta) => resposta.dados as RegraPecaRecuperadaDto));
    }

    alterarDados(codigo: string, id: number, dados: DadosDaPeca, revisao: number): Observable<RegraPecaRecuperadaDto> {
        return this.httpClient.patch<StandardResponse<RegraPecaAlteradaDto>>(
            `${this.base(codigo)}/${id}/dados`, { dados, revisao }, { context: this.contexto })
            .pipe(map((resposta) => (resposta.dados as RegraPecaAlteradaDto).peca));
    }

    alterarPosicao(codigo: string, id: number, pecaPaiId: number | null, indice: number, revisao: number):
        Observable<RegraPecaMovidaDto> {
        return this.httpClient.patch<StandardResponse<RegraPecaMovidaDto>>(
            `${this.base(codigo)}/${id}/posicao`, { pecaPaiId, indice, revisao }, { context: this.contexto })
            .pipe(map((resposta) => resposta.dados as RegraPecaMovidaDto));
    }

    alterarNome(codigo: string, id: number, nome: string, revisao: number): Observable<RegraPecaNomeAlteradaDto> {
        return this.httpClient.patch<StandardResponse<RegraPecaNomeAlteradaDto>>(
            `${this.base(codigo)}/${id}/nome`, { nome, revisao }, { context: this.contexto })
            .pipe(map((resposta) => resposta.dados as RegraPecaNomeAlteradaDto));
    }

    duplicar(codigo: string, id: number): Observable<RegraPecaDuplicadaDto> {
        return this.httpClient.post<StandardResponse<RegraPecaDuplicadaDto>>(
            `${this.base(codigo)}/${id}/duplicacoes`, {}, { context: this.contexto })
            .pipe(map((resposta) => resposta.dados as RegraPecaDuplicadaDto));
    }

    excluir(codigo: string, id: number, revisao: number): Observable<RegraPecaExcluidaDto> {
        return this.httpClient.delete<StandardResponse<RegraPecaExcluidaDto>>(
            `${this.base(codigo)}/${id}`, { params: { revisao }, context: this.contexto })
            .pipe(map((resposta) => resposta.dados as RegraPecaExcluidaDto));
    }

    restaurar(codigo: string, id: number): Observable<RegraPecaRestauradaDto> {
        return this.httpClient.post<StandardResponse<RegraPecaRestauradaDto>>(
            `${this.base(codigo)}/${id}/restauracoes`, {}, { context: this.contexto })
            .pipe(map((resposta) => resposta.dados as RegraPecaRestauradaDto));
    }

    criar(codigo: string, dto: Omit<RegraPecaCriarDto, "codigo">): Observable<RegraPecaCriadaDto> {
        return this.httpClient.post<StandardResponse<RegraPecaCriadaDto>>(
            this.base(codigo), dto, { context: this.contexto })
            .pipe(map((resposta) => resposta.dados as RegraPecaCriadaDto));
    }

    /** As versões do livro (publicadas e rascunhos), da mais recente à mais antiga. */
    listarVersoes(codigo: string): Observable<LivroVersaoResumoDto[]> {
        return this.httpClient.get<StandardResponse<LivroVersaoResumoDto[]>>(this.baseLivro(codigo, "versoes"),
            { context: this.contexto }).pipe(map((resposta) => resposta.dados as LivroVersaoResumoDto[]));
    }

    /** Uma versão com o conteúdo da fotografia (só ADMIN). */
    recuperarVersao(codigo: string, id: number): Observable<LivroVersaoRecuperadaDto> {
        return this.httpClient.get<StandardResponse<LivroVersaoRecuperadaDto>>(
            `${this.baseLivro(codigo, "versoes")}/${id}`, { context: this.contexto })
            .pipe(map((resposta) => resposta.dados as LivroVersaoRecuperadaDto));
    }

    /** Fotografa a cópia de trabalho como rascunho ou versão; a recusa (400) traz as pendências em `erros`. */
    publicar(codigo: string, dto: Omit<LivroPublicarDto, "codigo">): Observable<LivroPublicadoDto> {
        return this.httpClient.post<StandardResponse<LivroPublicadoDto>>(this.baseLivro(codigo, "publicacoes"), dto,
            { context: this.contexto }).pipe(map((resposta) => resposta.dados as LivroPublicadoDto));
    }

    private baseLivro(codigo: string, recurso: string): string {
        return `${environment.apiBase}/livros/${encodeURIComponent(codigo)}/${recurso}`;
    }
}
