import { HttpClient, HttpContext, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type { LivroMudancasPublicadasDto, LivroMudancasPublicadasRecuperarDto } from "@contratados-rpg/shared/dtos/livro";
import type { StandardResponse } from "@contratados-rpg/shared/interfaces";
import { map, type Observable } from "rxjs";
import { environment } from "../../../../environments/environment";
import { ERROS_TRATADOS_NA_TELA } from "../../../core/interceptors/error-handler.interceptor";

/** Consulta independente da Oficina e sem cache: reabrir observa a publicação vigente. */
@Injectable({ providedIn: "root" })
export class RegrasMudancasPublicadasService {
    private readonly httpClient = inject(HttpClient);

    recuperarMudancas(
        consulta: LivroMudancasPublicadasRecuperarDto,
    ): Observable<LivroMudancasPublicadasDto> {
        const params = consulta.origemId === undefined
            ? new HttpParams() : new HttpParams().set("origemId", consulta.origemId);
        const context = new HttpContext()
            .set(ERROS_TRATADOS_NA_TELA, [0, 400, 401, 403, 404, 500, 502, 503, 504]);
        return this.httpClient.get<StandardResponse<LivroMudancasPublicadasDto>>(
            `${environment.apiBase}/livros/${encodeURIComponent(consulta.codigo)}/mudancas`, { params, context },
        ).pipe(map(resposta => resposta.dados as LivroMudancasPublicadasDto));
    }
}
