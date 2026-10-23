import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { LivroPendenciaGravidadeEnum as Gravidade, TipoLivroVersaoSituacaoEnum as Situacao } from "@contratados-rpg/shared/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OficinaMudancas } from "./oficina-mudancas.service";
import { OficinaPublicar } from "./oficina-publicar.component";
import { OficinaStore } from "./oficina.store";
import { EDITOR_MARKDOWN_FACTORY } from "../../../shared/ui/editor-markdown/editor-markdown.component";

const pendencia = (gravidade: Gravidade) => ({ codigo: "X", gravidade, identificador: "a", caminho: ["A"], mensagem: "falta" });
const resumoCom = (alterada: number, nova = 0) => ({
    total: alterada + nova, porSituacao: { NOVA: nova, REMOVIDA: 0, ALTERADA: alterada, MOVIDA: 0 }, porTipo: {},
});

describe("OficinaPublicar", () => {
    let pendencias = signal<ReturnType<typeof pendencia>[]>([]);
    let comparacao = signal<{ mudancas: never[]; resumo: ReturnType<typeof resumoCom> } | null>(null);
    let publicar: ReturnType<typeof vi.fn>;
    let falhou = signal(false);
    let alterarMarkdown: (markdown: string) => void;

    function montar() {
        const fixture = TestBed.createComponent(OficinaPublicar);
        fixture.detectChanges();
        const raiz = fixture.nativeElement as HTMLElement;
        const abrir = (rotulo: string) => {
            raiz.querySelector<HTMLButtonElement>("app-menu-acoes button")!.click();
            fixture.detectChanges();
            Array.from(raiz.querySelectorAll<HTMLElement>('[role="menuitem"]'))
                .find((item) => item.textContent?.includes(rotulo))!.click();
            fixture.detectChanges();
        };
        const confirmar = () => Array.from(raiz.querySelectorAll<HTMLButtonElement>("[modalAcoes] button, .modal__acoes button"))
            .find((botao) => /Publicar (rascunho|versão)|Publicando/.test(botao.textContent ?? ""))!;
        return { fixture, raiz, abrir, confirmar };
    }

    beforeEach(() => {
        pendencias = signal([]);
        falhou = signal(false);
        comparacao = signal({ mudancas: [], resumo: resumoCom(2, 1) });
        publicar = vi.fn().mockResolvedValue({ ok: true, resultado: {} });
        TestBed.configureTestingModule({
            providers: [
                { provide: EDITOR_MARKDOWN_FACTORY, useValue: (opcoes: {
                    aoAlterar: (markdown: string) => void;
                }) => {
                    alterarMarkdown = opcoes.aoAlterar;
                    return { criar: async () => {}, destruir: () => {},
                        obterMarkdown: () => "", definirMarkdown: () => {},
                        definirSomenteLeitura: () => {}, aplicarAcao: () => {} };
                } },
                { provide: OficinaStore, useValue: { estado: signal("ok"), pendencias } },
                { provide: OficinaMudancas, useValue: {
                    comparacao, total: () => comparacao()?.resumo.total ?? 0, numeroSugerido: () => "4.1.5",
                    publicando: signal(false), publicar, carregou: () => true, falhou: () => falhou(),
                    contagem: () => comparacao()?.resumo.porSituacao,
                } },
            ],
        });
    });

    afterEach(() => document.body.replaceChildren());

    it("abre o diálogo com o resumo das mudanças e o número sugerido", () => {
        const { raiz, abrir } = montar();
        abrir("Publicar versão");
        expect(raiz.querySelector(".oficina-publicar__contagem")?.textContent).toContain("2 alteradas");
        expect(raiz.querySelector(".oficina-publicar__contagem")?.textContent).toContain("1 nova");
        expect(raiz.querySelector<HTMLInputElement>(".oficina-publicar__entrada--numero")!.value).toBe("4.1.5");
    });

    it("versão com pendência bloqueia; rascunho só avisa", () => {
        pendencias.set([pendencia(Gravidade.CONTEUDO)]);
        const { fixture, raiz, abrir, confirmar } = montar();
        abrir("Publicar versão");
        expect(confirmar().disabled).toBe(true);
        expect(raiz.querySelector(".oficina-publicar__alerta")?.textContent).toContain("Resolva antes de publicar a versão");
        raiz.querySelector<HTMLButtonElement>(".modal__acoes button")!.click();
        fixture.detectChanges();
        abrir("Publicar rascunho");
        expect(confirmar().disabled).toBe(false);
        expect(raiz.querySelector(".oficina-publicar__alerta")?.textContent).toContain("Rascunho pode sair assim");
    });

    it("pendência estrutural bloqueia até o rascunho", () => {
        pendencias.set([pendencia(Gravidade.ESTRUTURAL)]);
        const { raiz, abrir, confirmar } = montar();
        abrir("Publicar rascunho");
        expect(confirmar().disabled).toBe(true);
        expect(raiz.querySelector(".oficina-publicar__alerta")?.textContent).toContain("pendência estrutural");
    });

    it("sem mudança desde a publicada não há o que publicar", () => {
        comparacao.set({ mudancas: [], resumo: resumoCom(0) });
        const { raiz, abrir, confirmar } = montar();
        abrir("Publicar versão");
        expect(confirmar().disabled).toBe(true);
        expect(raiz.querySelector(".oficina-publicar__nada")?.textContent).toContain("Nada mudou");
    });

    it("sem versão publicada ainda deixa publicar e explica que tudo entra como novo", () => {
        comparacao.set(null);
        const { raiz, abrir, confirmar } = montar();
        abrir("Publicar rascunho");
        expect(confirmar().disabled).toBe(false);
        expect(raiz.querySelector(".oficina-publicar__nada")?.textContent).toContain("tudo entra como novo");
    });

    it("publica o Markdown do editor canônico com situação e número e fecha o diálogo", async () => {
        const { fixture, raiz, abrir, confirmar } = montar();
        abrir("Publicar versão");
        expect(raiz.querySelector("app-editor-markdown")).not.toBeNull();
        await fixture.whenStable();
        alterarMarkdown("## Equipamentos\n\n- **Ajuste** de custos.");
        fixture.detectChanges();
        confirmar().click();
        await fixture.whenStable();
        expect(publicar).toHaveBeenCalledWith(Situacao.PUBLICADA, "4.1.5",
            "## Equipamentos\n\n- **Ajuste** de custos.");
        fixture.detectChanges();
        expect(raiz.querySelector("dialog")?.hasAttribute("open")).toBe(false);
    });

    it("a recusa do servidor aparece no diálogo, que continua aberto", async () => {
        publicar.mockResolvedValue({ ok: false, mensagem: "O livro tem 1 pendência(s).", erros: ["Classes > Lutador: Falta o nome."] });
        const { fixture, raiz, abrir, confirmar } = montar();
        abrir("Publicar versão");
        confirmar().click();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(raiz.querySelector(".oficina-publicar__alerta--erro")?.textContent).toContain("Classes > Lutador: Falta o nome.");
        expect(raiz.querySelector("dialog")?.hasAttribute("open")).toBe(true);
    });

    it("falha ao ler as versões não diz que o livro nunca foi publicado e bloqueia", () => {
        falhou.set(true);
        const { raiz, abrir, confirmar } = montar();
        abrir("Publicar versão");
        expect(raiz.textContent).toContain("Não foi possível ler as versões");
        expect(raiz.textContent).not.toContain("ainda não tem versão publicada");
        expect(confirmar().disabled).toBe(true);
    });
});
