import { HttpClient, HttpContext } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, catchError, shareReplay, throwError } from "rxjs";

import { ERROS_TRATADOS_NA_TELA } from "../../core/interceptors/error-handler.interceptor";
import type { RegrasDocumento } from "./regras.model";

/** Leitura dos livros públicos gerados a partir da fonte canônica, sem depender da API. */
@Injectable({ providedIn: "root" })
export class RegrasService {
    private readonly httpClient = inject(HttpClient);
    private readonly documentos = new Map<RegrasDocumento["id"], Observable<RegrasDocumento>>();
    private readonly contexto = new HttpContext()
        .set(ERROS_TRATADOS_NA_TELA, [0, 404, 500, 502, 503, 504]);

    /** Compartilha a leitura e conserva o sucesso; uma falha permite nova tentativa. */
    carregarDocumento(id: RegrasDocumento["id"]): Observable<RegrasDocumento> {
        const documentoExistente = this.documentos.get(id);
        if (documentoExistente) {
            return documentoExistente;
        }

        const documento = this.httpClient
            .get<RegrasDocumento>(`/regras/${id}.json`, { context: this.contexto })
            .pipe(
                catchError((erro: unknown) => {
                    this.documentos.delete(id);
                    return throwError(() => erro);
                }),
                // A troca de rota pode desinscrever o leitor sem descartar a leitura já iniciada.
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        this.documentos.set(id, documento);
        return documento;
    }
}
