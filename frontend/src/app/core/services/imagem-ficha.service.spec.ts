import { TestBed } from "@angular/core/testing";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from "@angular/router";
import { NEVER, Subject } from "rxjs";
import { authTokenInterceptor } from "../interceptors/auth-token.interceptor";
import { ImagemFichaService } from "./imagem-ficha.service";
import { SessaoService } from "./sessao.service";
import { TempoRealService } from "./tempo-real.service";

const CAMINHO = "/uploads/fichas/12345678-1234-4234-8234-123456789abc.png";

describe("ImagemFichaService", () => {
  function montar(url = "/campanhas/9/previa/7") {
    const usuario = signal<{ id: number; token: string } | null>({ id: 1, token: "sessao-a" });
    const eventos = new Subject<unknown>();
    const invalidacoes = new Subject<unknown>();
    const router = { url, events: eventos };
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authTokenInterceptor])), provideHttpClientTesting(),
      { provide: SessaoService, useValue: { usuario, obterToken: () => usuario()?.token ?? null } },
      { provide: Router, useValue: router },
      { provide: TempoRealService, useValue: Object.fromEntries([
        "fichaAlterada$", "fichaVisibilidadeAlterada$", "fichaRecortesAlterados$", "acessoRevogado$",
        "fichaRemovidaDaCampanha$", "rolagemRecortesAlterados$", "reconexao$", "campanhaAcessoAlterado$",
      ].map(nome => [nome, nome === "reconexao$" ? invalidacoes : NEVER])) },
    ] });
    const criar = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:avatar");
    const revogar = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    return { service: TestBed.inject(ImagemFichaService), http: TestBed.inject(HttpTestingController),
      usuario, eventos, router, invalidacoes, criar, revogar };
  }

  it("URLs publicas e blob nao instanciam transporte autenticado", () => {
    const service = TestBed.inject(ImagemFichaService);
    for (const url of ["https://externo.test/a.png", "blob:local", "/publica.png", null]) {
      const valores: (string | null)[] = [];
      service.observarImagem(url).subscribe(valor => valores.push(valor));
      expect(valores).toEqual([url]);
    }
  });

  it("le blob autenticado com contexto da previa e revoga no teardown", () => {
    const { service, http, revogar } = montar();
    const valores: (string | null)[] = [];
    const assinatura = service.observarImagem(CAMINHO).subscribe(valor => valores.push(valor));
    const pedido = http.expectOne(CAMINHO + "?campanhaId=9&usuarioAlvoId=7");
    expect(pedido.request.responseType).toBe("blob");
    expect(pedido.request.headers.get("Authorization")).toBe("Bearer sessao-a");
    pedido.flush(new Blob(["imagem"]));
    expect(valores).toEqual([null, "blob:avatar"]);
    assinatura.unsubscribe();
    expect(revogar).toHaveBeenCalledWith("blob:avatar");
  });

  it("invalidacao cancela GET em voo e limpa o blob antes de refazer", () => {
    const { service, http, invalidacoes, revogar } = montar("/campanhas/9/espectador");
    const valores: (string | null)[] = [];
    const assinatura = service.observarImagem(CAMINHO).subscribe(valor => valores.push(valor));
    const antigo = http.expectOne(CAMINHO + "?campanhaId=9&espectador=true");
    invalidacoes.next({ campanhaId: 9 });
    expect(antigo.cancelled).toBe(true);
    http.expectOne(CAMINHO + "?campanhaId=9&espectador=true").flush(new Blob(["imagem"]));
    invalidacoes.next(undefined);
    expect(valores.at(-1)).toBeNull();
    expect(revogar).toHaveBeenCalledWith("blob:avatar");
    assinatura.unsubscribe();
  });

  it("erro negado fica null e reconexao permite nova leitura", () => {
    const { service, http, invalidacoes } = montar();
    const valores: (string | null)[] = [];
    const assinatura = service.observarImagem(CAMINHO).subscribe(valor => valores.push(valor));
    http.expectOne(CAMINHO + "?campanhaId=9&usuarioAlvoId=7").flush(new Blob(["negado"]), { status: 403, statusText: "Forbidden" });
    expect(valores.at(-1)).toBeNull();
    invalidacoes.next(undefined);
    http.expectOne(CAMINHO + "?campanhaId=9&usuarioAlvoId=7").flush(new Blob(["imagem"]));
    expect(valores.at(-1)).toBe("blob:avatar");
    assinatura.unsubscribe();
  });

  it("navegacao limpa antes do novo contexto e logout impede leitura", () => {
    const { service, http, eventos, router, usuario, revogar } = montar();
    const valores: (string | null)[] = [];
    const assinatura = service.observarImagem(CAMINHO).subscribe(valor => valores.push(valor));
    http.expectOne(CAMINHO + "?campanhaId=9&usuarioAlvoId=7").flush(new Blob(["imagem"]));
    eventos.next(new NavigationStart(1, "/campanhas/9/espectador"));
    expect(valores.at(-1)).toBeNull();
    expect(revogar).toHaveBeenCalledWith("blob:avatar");
    router.url = "/campanhas/9/espectador";
    eventos.next(new NavigationEnd(1, router.url, router.url));
    http.expectOne(CAMINHO + "?campanhaId=9&espectador=true").flush(new Blob(["imagem"]));
    usuario.set(null);
    TestBed.tick();
    expect(valores.at(-1)).toBeNull();
    http.expectNone(CAMINHO + "?campanhaId=9&espectador=true");
    assinatura.unsubscribe();
  });
  it("troca de conta revoga bytes anteriores e exige nova leitura com novo JWT", () => {
    const { service, http, usuario, revogar } = montar();
    const valores: (string | null)[] = [];
    const assinatura = service.observarImagem(CAMINHO).subscribe(valor => valores.push(valor));
    http.expectOne(CAMINHO + "?campanhaId=9&usuarioAlvoId=7").flush(new Blob(["conta-a"]));
    usuario.set({ id: 2, token: "sessao-b" });
    TestBed.tick();
    expect(revogar).toHaveBeenCalledWith("blob:avatar");
    expect(valores.at(-1)).toBeNull();
    const novo = http.expectOne(CAMINHO + "?campanhaId=9&usuarioAlvoId=7");
    expect(novo.request.headers.get("Authorization")).toBe("Bearer sessao-b");
    novo.flush(new Blob(["negado"]), { status: 403, statusText: "Forbidden" });
    expect(valores.at(-1)).toBeNull();
    assinatura.unsubscribe();
  });

  it("assinaturas independentes nunca reutilizam bytes de outra assinatura", () => {
    const { service, http } = montar("/fichas/1");
    const primeira = service.observarImagem(CAMINHO).subscribe();
    http.expectOne(CAMINHO).flush(new Blob(["primeira"]));
    const segunda = service.observarImagem(CAMINHO).subscribe();
    http.expectOne(CAMINHO).flush(new Blob(["segunda"]));
    primeira.unsubscribe(); segunda.unsubscribe();
  });

  it("janela externa do espectador conserva o contexto da projecao", () => {
    const { service, http } = montar("/janela/campanha/9/historico-rolagens?origem=espectador");
    const assinatura = service.observarImagem(CAMINHO).subscribe();
    http.expectOne(CAMINHO + "?campanhaId=9&espectador=true").flush(new Blob(["imagem"]));
    assinatura.unsubscribe();
  });

  it.each([
    new NavigationCancel(2, "/fichas/2", "cancelado"),
    new NavigationError(2, "/fichas/2", new Error("falha")),
  ])("navegacao interrompida restaura o contexto atual e permite invalidacao: %s", evento => {
    const { service, http, eventos, invalidacoes } = montar();
    const valores: (string | null)[] = [];
    const assinatura = service.observarImagem(CAMINHO).subscribe(valor => valores.push(valor));
    http.expectOne(CAMINHO + "?campanhaId=9&usuarioAlvoId=7").flush(new Blob(["imagem"]));
    eventos.next(new NavigationStart(2, "/fichas/2"));
    expect(valores.at(-1)).toBeNull();
    eventos.next(evento);
    http.expectOne(CAMINHO + "?campanhaId=9&usuarioAlvoId=7").flush(new Blob(["restaurada"]));
    expect(valores.at(-1)).toBe("blob:avatar");
    invalidacoes.next(undefined);
    http.expectOne(CAMINHO + "?campanhaId=9&usuarioAlvoId=7").flush(new Blob(["reconectada"]));
    assinatura.unsubscribe();
  });

});
