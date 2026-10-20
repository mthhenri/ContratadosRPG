import { HttpClient, HttpContext, HttpParams } from "@angular/common/http";
import { Injectable, Injector, effect, inject } from "@angular/core";
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from "@angular/router";
import { Observable, distinctUntilChanged, filter, merge, of, switchMap } from "rxjs";
import { environment } from "../../../environments/environment";
import { ERROS_TRATADOS_NA_TELA } from "../interceptors/error-handler.interceptor";
import { SessaoService } from "./sessao.service";
import { TempoRealService } from "./tempo-real.service";

// Somente caminhos locais canônicos: URL externa nunca recebe transporte/JWT.
const CAMINHO_PRIVADO = /^\/uploads\/(?:fichas\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|agentes\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+)\.(?:png|jpe?g|webp)$/i;

/** Cada assinatura possui seus bytes e objectURL, sem cache entre contextos. */
@Injectable({ providedIn: "root" })
export class ImagemFichaService {
  private readonly injector = inject(Injector);

  /** Lê no contexto atual e revoga a URL temporária ao invalidar ou encerrar a assinatura. */
  observarImagem(url: string | null | undefined): Observable<string | null> {
    if (!url || !CAMINHO_PRIVADO.test(url)) return of(url ?? null);
    return new Observable(saida => {
      const httpClient = this.injector.get(HttpClient);
      const sessao = this.injector.get(SessaoService);
      const router = this.injector.get(Router);
      const tempoReal = this.injector.get(TempoRealService);
      const sessoes = new Observable<ReturnType<typeof sessao.usuario>>(observador => {
        observador.next(sessao.usuario());
        const efeito = effect(() => observador.next(sessao.usuario()), { injector: this.injector });
        return () => efeito.destroy();
      }).pipe(distinctUntilChanged((anterior, atual) =>
        anterior?.token === atual?.token && anterior?.id === atual?.id));
      let navegando = false;
      const assinatura = merge(
        sessoes,
        router.events.pipe(filter(evento => evento instanceof NavigationStart || evento instanceof NavigationEnd
          || evento instanceof NavigationCancel || evento instanceof NavigationError)),
        tempoReal.fichaAlterada$, tempoReal.fichaVisibilidadeAlterada$, tempoReal.fichaRecortesAlterados$,
        tempoReal.acessoRevogado$, tempoReal.fichaRemovidaDaCampanha$, tempoReal.rolagemRecortesAlterados$,
        tempoReal.reconexao$, tempoReal.campanhaAcessoAlterado$,
      ).pipe(switchMap(evento => {
        if (evento instanceof NavigationStart) navegando = true;
        if (evento instanceof NavigationEnd || evento instanceof NavigationCancel || evento instanceof NavigationError) {
          navegando = false;
        }
        return new Observable<string | null>(leitura => {
          leitura.next(null);
          if (navegando || !sessao.usuario()) return;
          let objeto: string | null = null;
          const parametros = this.montarParametrosProjecao(router.url);
          const pedido = httpClient.get(`${environment.apiBase}${url}`, {
            responseType: "blob", params: parametros,
            context: new HttpContext().set(ERROS_TRATADOS_NA_TELA, [403, 404]),
          })
            .subscribe({
              next: blob => {
                objeto = URL.createObjectURL(blob);
                leitura.next(objeto);
              },
              error: () => leitura.next(null),
            });
          return () => {
            pedido.unsubscribe();
            if (objeto !== null) URL.revokeObjectURL(objeto);
          };
        });
      })).subscribe(saida);
      return () => assinatura.unsubscribe();
    });
  }

  private montarParametrosProjecao(url: string): HttpParams {
    const caminho = url.split(/[?#]/)[0];
    const previa = /^\/campanhas\/(\d+)\/previa\/(\d+)(?:\/|$)/.exec(caminho);
    if (previa) return new HttpParams().set("campanhaId", previa[1]).set("usuarioAlvoId", previa[2]);
    const espectador = /^\/campanhas\/(\d+)\/espectador(?:\/|$)/.exec(caminho);
    if (espectador) return new HttpParams().set("campanhaId", espectador[1]).set("espectador", "true");
    const janela = /^\/janela\/campanha\/(\d+)(?:\/|$)/.exec(caminho);
    const consulta = new URLSearchParams(url.split("?")[1]?.split("#")[0] ?? "");
    if (janela && consulta.get("origem") === "espectador") {
      return new HttpParams().set("campanhaId", janela[1]).set("espectador", "true");
    }
    return new HttpParams();
  }
}
