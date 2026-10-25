import { DOCUMENT } from "@angular/common";
import { HttpClient, HttpContext } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type { LivroPacoteDto } from "@contratados-rpg/shared/dtos/livro";
import type { StandardResponse } from "@contratados-rpg/shared/interfaces";
import { type Observable, map } from "rxjs";
import { environment } from "../../../../environments/environment";
import { ERROS_TRATADOS_NA_TELA } from "../../../core/interceptors/error-handler.interceptor";

/** Transporte administrativo; a publicação escolhida é responsabilidade da API. */
@Injectable({ providedIn: "root" })
export class OficinaExportacaoService {
    private readonly httpClient = inject(HttpClient);
    private readonly documento = inject(DOCUMENT);

    /** Consulta os dois livros publicados, independente do conteúdo aberto na Oficina. */
    recuperarPacote(): Observable<LivroPacoteDto> {
        const context = new HttpContext()
            .set(ERROS_TRATADOS_NA_TELA, [0, 400, 401, 403, 404, 500, 502, 503, 504]);
        return this.httpClient.get<StandardResponse<LivroPacoteDto>>(
            `${environment.apiBase}/livros/pacotes/publicados`, { context },
        ).pipe(map(resposta => resposta.dados as LivroPacoteDto));
    }

    /** Entrega o pacote como arquivo; nenhuma reconstrução a partir do livro em edição. */
    baixarPacote(pacote: LivroPacoteDto): void {
        const arquivo = new Blob([JSON.stringify(pacote, null, 2) + "\n"], {
            type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(arquivo);
        const link = this.documento.createElement("a");
        link.href = url;
        link.download = `livros-publicados-${pacote.exportacaoData.slice(0, 10)}.json`;
        try {
            this.documento.body.append(link);
            link.click();
        } finally {
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }
}
