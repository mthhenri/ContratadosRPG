import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { RegraPecaArvoreItemDto, RegraPecaRecuperadaDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoLivroVersaoSituacaoEnum, TipoRegraPecaEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessaoService } from "../../../core/services/sessao.service";
import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import { RegrasLeitor } from "../regras-leitor.component";
import type { RegrasDocumento } from "../regras.model";
import { RegrasService } from "../regras.service";
import { OficinaApi } from "./oficina-api.service";

const T = TipoRegraPecaEnum;
const ID = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const pecas: RegraPecaArvoreItemDto[] = [
    { id: 1, livroId: 1, pecaPaiId: null, tipo: T.SECAO, identificador: ID(1), ancora: "agentes", ordem: 0,
        dados: { titulo: "Agentes", nivel: 1, glifo: null }, revisao: 1 },
    { id: 2, livroId: 1, pecaPaiId: 1, tipo: T.PARAGRAFO, identificador: ID(2), ancora: null, ordem: 0,
        dados: { trechos: [{ tipo: "texto", texto: "Um parágrafo." }] }, revisao: 1 },
    { id: 3, livroId: 1, pecaPaiId: 1, tipo: T.HABILIDADE, identificador: ID(3), ancora: null, ordem: 1,
        dados: { nome: "Golpe", custo: 2, reacao: false, glifo: "⬦", trechos: [{ tipo: "texto", texto: "Causa dano." }] },
        revisao: 1 },
];
const documento: RegrasDocumento = {
    tipo: "documento", id: "sistema", titulo: "Sistema", versao: "4.1.4",
    filhos: [{ tipo: "secao", nivel: 1, glifo: "⬢", titulo: "Agentes", ancora: "agentes", filhos: [
        { tipo: "paragrafo", trechos: [{ tipo: "texto", texto: "Um parágrafo." }] }] }],
};

describe("Oficina no leitor de Regras", () => {
    let tipo: TipoUsuarioEnum;
    let api: { listar: ReturnType<typeof vi.fn>; alterarDados: ReturnType<typeof vi.fn> };

    function criar(modoOficina: boolean, situacao: TipoLivroVersaoSituacaoEnum | null = TipoLivroVersaoSituacaoEnum.RASCUNHO) {
        TestBed.overrideProvider(RegrasService, { useValue: {
            carregarLeitura: () => of({ documento, situacao, numero: "4.1.4", ancorasAntigas: {} }),
        } });
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema");
        leitor.componentRef.setInput("modoOficina", modoOficina);
        leitor.detectChanges();
        return { leitor, raiz: leitor.nativeElement as HTMLElement };
    }

    beforeEach(() => {
        tipo = TipoUsuarioEnum.ADMIN;
        api = {
            listar: vi.fn(() => of(pecas)),
            alterarDados: vi.fn((_c: string, id: number, dados: unknown, revisao: number) =>
                of({ ...pecas.find((peca) => peca.id === id), dados, revisao: revisao + 1 } as unknown as RegraPecaRecuperadaDto)),
        };
        TestBed.configureTestingModule({
            imports: [RegrasLeitor],
            providers: [
                { provide: RegrasService, useValue: {} },
                { provide: OficinaApi, useValue: api },
                { provide: SessaoService, useValue: { usuario: signal({ tipo }), obterToken: () => "t" } },
                { provide: NotificacaoService, useValue: { notificar: vi.fn() } },
            ],
        });
        vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    });
    afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });

    it("o alternador de modo aparece só para ADMIN, com o livro vindo da API", () => {
        const admin = criar(false);
        expect(admin.raiz.querySelector(".regras__modo")).not.toBeNull();
        expect(admin.raiz.querySelector("app-oficina-barra")).toBeNull();
        admin.leitor.destroy();
    });

    it("quem não é ADMIN não vê o alternador, nem com ?modo=oficina na URL", () => {
        tipo = TipoUsuarioEnum.TESTER;
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [RegrasLeitor],
            providers: [
                { provide: RegrasService, useValue: {} },
                { provide: OficinaApi, useValue: api },
                { provide: SessaoService, useValue: { usuario: signal({ tipo }), obterToken: () => "t" } },
                { provide: NotificacaoService, useValue: { notificar: vi.fn() } },
            ],
        });
        const { raiz, leitor } = criar(true);
        expect(raiz.querySelector(".regras__modo")).toBeNull();
        expect(raiz.querySelector("app-oficina-barra")).toBeNull();
        expect(api.listar).not.toHaveBeenCalled();
        leitor.destroy();
    });

    it("sem fotografia na API (JSON estático) a Oficina não é oferecida", () => {
        const { raiz, leitor } = criar(true, null);
        expect(raiz.querySelector(".regras__modo")).toBeNull();
        expect(api.listar).not.toHaveBeenCalled();
        leitor.destroy();
    });

    it("no modo Oficina carrega a cópia de trabalho e mostra campos editáveis, ferramentas só na peça selecionada", async () => {
        const { raiz, leitor } = criar(true);
        await leitor.whenStable();
        leitor.detectChanges();
        expect(api.listar).toHaveBeenCalledWith("sistema");
        expect(raiz.querySelector("app-oficina-barra")).not.toBeNull();
        const campos = Array.from(raiz.querySelectorAll<HTMLElement>(".oficina-texto")).map((campo) => campo.dataset["campo"]);
        expect(campos).toEqual(["titulo", "trechos", "nome", "trechos"]);
        expect(raiz.querySelector("app-barra-ferramentas")).toBeNull();

        raiz.querySelector<HTMLElement>('[data-peca-oficina="' + ID(3) + '"]')!.click();
        leitor.detectChanges();
        const barra = raiz.querySelector("app-barra-ferramentas");
        expect(barra?.getAttribute("role")).toBe("toolbar");
        expect(barra?.textContent).toContain("Reação");
        leitor.destroy();
    });

    it("Ctrl+Z na Oficina desfaz o último passo e não repassa o atalho ao navegador", async () => {
        const { raiz, leitor } = criar(true);
        await leitor.whenStable();
        leitor.detectChanges();
        const campo = raiz.querySelector<HTMLElement>('.oficina-texto[data-peca="' + ID(2) + '"]')!;
        campo.focus();
        campo.textContent = "Editado.";
        campo.dispatchEvent(new Event("blur"));
        const evento = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true });
        campo.dispatchEvent(evento);
        expect(evento.defaultPrevented).toBe(true);
        await leitor.whenStable();
        expect(api.alterarDados.mock.calls.at(-1)?.[2]).toEqual({ trechos: [{ tipo: "texto", texto: "Um parágrafo." }] });
        leitor.destroy();
    });
});
