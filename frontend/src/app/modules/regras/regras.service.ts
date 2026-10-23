import { HttpClient, HttpContext } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type { LivroCodigoRecuperarDto, LivroLeituraDto } from "@contratados-rpg/shared/dtos/livro";
import { projetarPecasEmRegras } from "@contratados-rpg/shared/livro";
import type { StandardResponse } from "@contratados-rpg/shared/interfaces";
import { Observable, catchError, map, shareReplay, throwError } from "rxjs";

import { environment } from "../../../environments/environment";
import { SessaoService } from "../../core/services/sessao.service";
import { ERROS_TRATADOS_NA_TELA } from "../../core/interceptors/error-handler.interceptor";
import type { RegrasDocumento } from "./regras.model";

/** O que o leitor recebe de um livro: o documento e de onde ele veio. */
export interface RegrasLeitura {
    readonly documento: RegrasDocumento;
    readonly situacao: LivroLeituraDto["situacao"];
    readonly numero: string;
    /** Âncoras renomeadas (`antiga → atual`): a URL publicada antes da troca continua valendo. */
    readonly ancorasAntigas: Readonly<Record<string, string>>;
}

/**
 * Leitura dos livros de Regras. A fonte única é a API (`/livros/<código>`: a fotografia que o papel
 * pode ver); sem ela (404 ou rede) o leitor mostra o erro e permite tentar de novo. O JSON estático
 * gerado do Markdown saiu do build na `m11-10`.
 */
@Injectable({ providedIn: "root" })
export class RegrasService {
    private readonly httpClient = inject(HttpClient);
    private readonly sessao = inject(SessaoService);
    /** Uma leitura por livro **e por sessão**: o conteúdo varia por papel, então sair ou entrar
     * nunca reaproveita o que outra sessão recebeu (rascunho de tester não vaza). */
    private readonly leituras = new Map<string, Observable<RegrasLeitura>>();
    private readonly contexto = new HttpContext()
        .set(ERROS_TRATADOS_NA_TELA, [0, 404, 500, 502, 503, 504]);

    carregarDocumento(id: RegrasDocumento["id"]): Observable<RegrasDocumento> {
        return this.carregarLeitura(id).pipe(map((leitura) => leitura.documento));
    }

    /** Lê a regra oficial ao navegar da comparação, mesmo com sessão de tester/admin. */
    carregarPublicada(dto: LivroCodigoRecuperarDto): Observable<RegrasLeitura> {
        return this.httpClient.get<StandardResponse<LivroLeituraDto>>(
            `${environment.apiBase}/livros/${encodeURIComponent(dto.codigo)}/publicada`,
            { context: this.contexto },
        ).pipe(map(resposta => {
            const livro = resposta.dados as LivroLeituraDto;
            return {
                documento: projetarPecasEmRegras(livro.conteudo) as unknown as RegrasDocumento,
                situacao: livro.situacao,
                numero: livro.numero,
                ancorasAntigas: livro.conteudo.ancorasAntigas ?? {},
            };
        }));
    }

    /** Descarta a leitura em cache do livro (a Oficina gravou ou publicou desde então). */
    invalidarLeitura(id: RegrasDocumento["id"]): void {
        this.leituras.delete(`${id}|${this.sessao.obterToken() ?? ""}`);
    }

    /** Compartilha a leitura e conserva o sucesso; uma falha permite nova tentativa. */
    carregarLeitura(id: RegrasDocumento["id"]): Observable<RegrasLeitura> {
        const chave = `${id}|${this.sessao.obterToken() ?? ""}`;
        const existente = this.leituras.get(chave);
        if (existente) {
            return existente;
        }

        const leitura = this.httpClient
            .get<StandardResponse<LivroLeituraDto>>(`${environment.apiBase}/livros/${id}`,
                { context: this.contexto })
            .pipe(
                map((resposta): RegrasLeitura => {
                    const livro = resposta.dados as LivroLeituraDto;
                    return {
                        documento: projetarPecasEmRegras(livro.conteudo) as unknown as RegrasDocumento,
                        situacao: livro.situacao,
                        numero: livro.numero,
                        ancorasAntigas: livro.conteudo.ancorasAntigas ?? {},
                    };
                }),
                catchError((erro: unknown) => {
                    this.leituras.delete(chave);
                    return throwError(() => erro);
                }),
                // A troca de rota pode desinscrever o leitor sem descartar a leitura já iniciada.
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        this.leituras.set(chave, leitura);
        return leitura;
    }
}
