import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { RegraPecaArvoreItemDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoLivroVersaoSituacaoEnum as Situacao, TipoRegraPecaEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessaoService } from "../../../core/services/sessao.service";
import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import { RegrasLeitor } from "../regras-leitor.component";
import type { RegrasDocumento } from "../regras.model";
import { RegrasService } from "../regras.service";
import { OficinaApi } from "./oficina-api.service";
import { ESPERA_COMPARAR_MS } from "./oficina-mudancas.service";

const T = TipoRegraPecaEnum;
const ID = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const texto = (valor: string) => [{ tipo: "texto" as const, texto: valor }];
const pecas: RegraPecaArvoreItemDto[] = [
    { id: 1, livroId: 1, pecaPaiId: null, tipo: T.SECAO, identificador: ID(1), ancora: "agentes", ordem: 0,
        dados: { titulo: "Agentes", nivel: 1, glifo: null }, revisao: 1 },
    { id: 2, livroId: 1, pecaPaiId: 1, tipo: T.PARAGRAFO, identificador: ID(2), ancora: null, ordem: 0,
        dados: { trechos: texto("Parágrafo editado.") }, revisao: 1 },
    { id: 3, livroId: 1, pecaPaiId: 1, tipo: T.PARAGRAFO, identificador: ID(3), ancora: null, ordem: 1,
        dados: { trechos: texto("Parágrafo novo.") }, revisao: 1 },
];
const publicada = { id: 7, livroId: 1, situacao: Situacao.PUBLICADA, numero: "4.1.4", formato: 1, publicacaoData: "2026-10-01T10:00:00Z", usuarioId: 1, nota: null };
const antiga = { ...publicada, id: 5, numero: "4.1.3", publicacaoData: "2026-09-01T10:00:00Z" };
const fotografia = (numero: string, paragrafo: string) => ({
    formato: 1, codigo: "sistema", titulo: "Sistema", subtitulo: "", numero,
    pecas: [{ identificador: ID(1), ancora: "agentes", tipo: T.SECAO, ordem: 0, dados: { titulo: "Agentes", nivel: 1, glifo: null },
        filhos: [{ identificador: ID(2), ancora: null, tipo: T.PARAGRAFO, ordem: 0, dados: { trechos: texto(paragrafo) }, filhos: [] }] }],
});
const documento: RegrasDocumento = {
    tipo: "documento", id: "sistema", titulo: "Sistema", versao: "4.1.4",
    filhos: [{ tipo: "secao", nivel: 1, glifo: "⬢", titulo: "Agentes", ancora: "agentes", filhos: [
        { tipo: "paragrafo", trechos: texto("Parágrafo publicado.") }] }],
};

describe("Oficina: mudanças e versões no leitor (m11-09)", () => {
    let api: Record<string, ReturnType<typeof vi.fn>>;

    async function abrir(modoOficina: boolean) {
        TestBed.overrideProvider(RegrasService, { useValue: {
            carregarLeitura: () => of({ documento, situacao: Situacao.PUBLICADA, numero: "4.1.4", ancorasAntigas: {} }),
        } });
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema");
        leitor.componentRef.setInput("modoOficina", modoOficina);
        leitor.detectChanges();
        await leitor.whenStable();
        leitor.detectChanges();
        return { leitor, raiz: leitor.nativeElement as HTMLElement };
    }

    beforeEach(() => {
        api = {
            listar: vi.fn(() => of(pecas)),
            alterarDados: vi.fn(),
            listarVersoes: vi.fn(() => of([antiga, publicada])),
            recuperarVersao: vi.fn((_c: string, id: number) => of({ ...(id === 7 ? publicada : antiga),
                conteudo: id === 7 ? fotografia("4.1.4", "Parágrafo publicado.") : fotografia("4.1.3", "Parágrafo antigo.") })),
        };
        TestBed.configureTestingModule({
            imports: [RegrasLeitor],
            providers: [
                { provide: RegrasService, useValue: {} },
                { provide: OficinaApi, useValue: api },
                { provide: SessaoService, useValue: { usuario: signal({ tipo: TipoUsuarioEnum.ADMIN }), obterToken: () => "t" } },
                { provide: NotificacaoService, useValue: { notificar: vi.fn() } },
            ],
        });
        vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    });
    afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });

    it("na Oficina marca a peça alterada (amarelo) e a nova (verde) contra a versão publicada e conta as mudanças", async () => {
        const { leitor, raiz } = await abrir(true);
        await new Promise((resolver) => setTimeout(resolver, ESPERA_COMPARAR_MS + 100));
        leitor.detectChanges();
        const marcaDe = (n: number) => raiz.querySelector(`[data-peca-oficina="${ID(n)}"]`)?.classList;
        expect(marcaDe(2)?.contains("oficina-peca--alterada")).toBe(true);
        expect(marcaDe(3)?.contains("oficina-peca--nova")).toBe(true);
        expect(raiz.querySelector(".oficina-barra__contador")?.textContent?.trim()).toBe("2");
        expect(raiz.querySelector(".oficina-barra")?.textContent).toContain("Em edição");
        expect(raiz.querySelector(".oficina-barra")?.textContent).toContain("Versão 4.1.4");
        leitor.destroy();
    });

    it("o botão 'O que mudou' abre a gaveta com a lista classificada", async () => {
        const { leitor, raiz } = await abrir(true);
        await new Promise((resolver) => setTimeout(resolver, ESPERA_COMPARAR_MS + 100));
        leitor.detectChanges();
        Array.from(raiz.querySelectorAll<HTMLButtonElement>(".oficina-barra button"))
            .find((botao) => botao.textContent?.includes("O que mudou"))!.click();
        leitor.detectChanges();
        const selos = Array.from(raiz.querySelectorAll(".oficina-mudancas__cab app-chip")).map((selo) => selo.textContent?.trim());
        expect(selos).toEqual(expect.arrayContaining(["alterada", "nova"]));
        expect(raiz.querySelector(".oficina-mudancas__resumo")?.textContent).toContain("1 nova");
        leitor.destroy();
    });

    it("abrir uma versão antiga mostra o aviso 'somente leitura', esconde a Oficina e volta à atual", async () => {
        const { leitor, raiz } = await abrir(true);
        expect(raiz.querySelector("app-oficina-barra")).not.toBeNull();
        const seletor = raiz.querySelector<HTMLSelectElement>(".regras__versao")!;
        expect(Array.from(seletor.options).map((opcao) => opcao.textContent?.trim()))
            .toEqual(["Atual", "4.1.4 · publicada", "4.1.3 · publicada"]);
        seletor.value = "5";
        seletor.dispatchEvent(new Event("change"));
        await leitor.whenStable();
        leitor.detectChanges();
        expect(raiz.querySelector(".regras__rascunho")?.textContent).toContain("Somente leitura");
        expect(raiz.querySelector("app-oficina-barra")).toBeNull();
        expect(raiz.querySelector(".oficina-texto")).toBeNull();
        expect(raiz.querySelector(".regras__documento")?.textContent).toContain("Parágrafo antigo.");
        raiz.querySelector<HTMLButtonElement>(".regras__rascunho button")!.click();
        await leitor.whenStable();
        leitor.detectChanges();
        expect(raiz.querySelector(".regras__rascunho")).toBeNull();
        expect(raiz.querySelector("app-oficina-barra")).not.toBeNull();
        leitor.destroy();
    });

    it("quem não é ADMIN não vê o seletor de versão", async () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [RegrasLeitor],
            providers: [
                { provide: RegrasService, useValue: {} },
                { provide: OficinaApi, useValue: api },
                { provide: SessaoService, useValue: { usuario: signal({ tipo: TipoUsuarioEnum.TESTER }), obterToken: () => "t" } },
                { provide: NotificacaoService, useValue: { notificar: vi.fn() } },
            ],
        });
        const { leitor, raiz } = await abrir(false);
        expect(raiz.querySelector(".regras__versao")).toBeNull();
        expect(api["listarVersoes"]).not.toHaveBeenCalled();
        leitor.destroy();
    });
});
