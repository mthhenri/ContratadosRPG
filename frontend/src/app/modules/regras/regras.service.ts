import { HttpClient, HttpContext, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type { LivroLeituraDto } from "@contratados-rpg/shared/dtos/livro";
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
    /** `null` quando o livro veio do JSON estático (a API não tem fotografia dele). */
    readonly situacao: LivroLeituraDto["situacao"] | null;
    readonly numero: string | null;
    /** Âncoras renomeadas (`antiga → atual`): a URL publicada antes da troca continua valendo. */
    readonly ancorasAntigas: Readonly<Record<string, string>>;
}

/**
 * Leitura dos livros de Regras. A fonte é a API (`/livros/<código>`: a fotografia que o papel pode
 * ver); o JSON estático gerado do Markdown é o plano B enquanto a Oficina não é a fonte única
 * (`m11-10`) — vale para livro ainda não importado (404) e para API inalcançável (rede).
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
                    // Só "sem fotografia" (404) e "API inalcançável" (0) usam o plano B, e ele não
                    // fica guardado: a próxima abertura tenta a API de novo. Outros erros aparecem.
                    if (erro instanceof HttpErrorResponse && (erro.status === 404 || erro.status === 0)) {
                        this.leituras.delete(chave);
                        return this.carregarEstatico(id);
                    }
                    return throwError(() => erro);
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

    private carregarEstatico(id: RegrasDocumento["id"]): Observable<RegrasLeitura> {
        return this.httpClient
            .get<RegrasDocumento>(`/regras/${id}.json`, { context: this.contexto })
            .pipe(map((documento): RegrasLeitura =>
                ({ documento, situacao: null, numero: null, ancorasAntigas: {} })));
    }
}
