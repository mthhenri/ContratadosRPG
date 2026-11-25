import { DOCUMENT } from "@angular/common";
import { HttpClient, HttpContext } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type { LivroLeituraDto } from "@contratados-rpg/shared/dtos/livro";
import type { StandardResponse } from "@contratados-rpg/shared/interfaces";
import {
    type LivroMarkdownExportadoDto, type VarianteMarkdownExportadoLivro, montarMarkdownExportadoDoLivro,
} from "@contratados-rpg/shared/livro";
import { type Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";
import { ERROS_TRATADOS_NA_TELA } from "../../core/interceptors/error-handler.interceptor";

/**
 * Exportação do livro publicado como arquivo Markdown, feita no navegador com o mesmo conversor de
 * `npm run regras:exportar`. Lê **sempre** a publicação atual (`/publicada`), nunca o rascunho que a
 * Oficina mostra a administrador/tester. O arquivo não é fonte da verdade e nada o importa de volta.
 */
@Injectable({ providedIn: "root" })
export class RegrasExportacaoMarkdownService {
    private readonly httpClient = inject(HttpClient);
    private readonly documento = inject(DOCUMENT);

    /** Consulta a publicação atual do livro e monta o arquivo (não baixa). */
    montarArquivo(
        codigo: string, variante: VarianteMarkdownExportadoLivro,
    ): Observable<LivroMarkdownExportadoDto> {
        const context = new HttpContext().set(ERROS_TRATADOS_NA_TELA, [0, 400, 401, 403, 404, 500, 502, 503, 504]);
        return this.httpClient.get<StandardResponse<LivroLeituraDto>>(
            `${environment.apiBase}/livros/${encodeURIComponent(codigo)}/publicada`, { context },
        ).pipe(map(resposta => {
            const livro = resposta.dados as LivroLeituraDto;
            return montarMarkdownExportadoDoLivro({
                conteudo: livro.conteudo, publicacaoData: livro.publicacaoData,
                geradoEm: new Date().toISOString(), variante,
            });
        }));
    }

    /** Entrega o arquivo ao navegador como download. */
    baixar(arquivo: LivroMarkdownExportadoDto): void {
        const blob = new Blob([arquivo.texto], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = this.documento.createElement("a");
        link.href = url;
        link.download = arquivo.nome;
        try {
            this.documento.body.append(link);
            link.click();
        } finally {
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }
}
