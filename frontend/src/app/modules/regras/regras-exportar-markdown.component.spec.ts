import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { LivroLeituraDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { exportarLivroEmMarkdown } from "@contratados-rpg/shared/livro";
import { SessaoService } from "../../core/services/sessao.service";
import { NotificacaoService } from "../../shared/ui/notificacao/notificacao.service";
import { RegrasExportarMarkdown } from "./regras-exportar-markdown.component";
import { RegrasExportacaoMarkdownService } from "./regras-exportacao-markdown.service";

const leitura: LivroLeituraDto = {
    codigo: "sistema", titulo: "Sistema", situacao: "PUBLICADA" as never, numero: "4.1.5",
    publicacaoData: "2026-10-23T14:30:00.000Z",
    conteudo: {
        formato: 1, codigo: "sistema", titulo: "Sistema", subtitulo: null, numero: "4.1.5",
        pecas: [{
            identificador: "s1", ancora: "intro", tipo: "SECAO" as never, ordem: 0,
            dados: { titulo: "Introdução", nivel: 1, glifo: "⬢" } as never,
            filhos: [{
                identificador: "n1", ancora: null, tipo: "NOTA" as never, ordem: 0,
                dados: { trechos: [{ tipo: "texto", texto: "Atenção." }] } as never, filhos: [],
            }],
        }],
    } as never,
};

describe("RegrasExportarMarkdown", () => {
    const usuario = signal<{ tipo: TipoUsuarioEnum } | null>({ tipo: TipoUsuarioEnum.NORMAL });
    const notificar = vi.fn();
    beforeEach(() => {
        usuario.set({ tipo: TipoUsuarioEnum.NORMAL });
        notificar.mockClear();
        TestBed.configureTestingModule({
            imports: [RegrasExportarMarkdown],
            providers: [provideHttpClient(), provideHttpClientTesting(),
                { provide: SessaoService, useValue: { usuario } },
                { provide: NotificacaoService, useValue: { notificar } }],
        });
    });
    afterEach(() => { TestBed.inject(HttpTestingController).verify(); vi.restoreAllMocks(); });

    const criar = (livro = "sistema") => {
        const fixture = TestBed.createComponent(RegrasExportarMarkdown);
        fixture.componentRef.setInput("livro", livro);
        fixture.detectChanges();
        return fixture;
    };

    it("não aparece para visitante e aparece para usuário logado", () => {
        usuario.set(null);
        const fixture = criar();
        expect(fixture.nativeElement.querySelector("app-menu-acoes")).toBeNull();
        usuario.set({ tipo: TipoUsuarioEnum.NORMAL });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector("app-menu-acoes")).not.toBeNull();
    });

    it("lê a publicação atual (nunca o rascunho) e baixa o arquivo completo", () => {
        const baixar = vi.spyOn(RegrasExportacaoMarkdownService.prototype, "baixar").mockImplementation(() => {});
        const fixture = criar();
        (fixture.componentInstance as unknown as { exportar(v: string): void }).exportar("COMPLETO");
        const http = TestBed.inject(HttpTestingController);
        http.expectOne("/livros/sistema/publicada").flush({ dados: leitura });
        expect(baixar).toHaveBeenCalledTimes(1);
        const arquivo = baixar.mock.calls[0][0];
        expect(arquivo.nome).toBe("sistema-v4.1.5.md");
        expect(arquivo.texto.endsWith(exportarLivroEmMarkdown(leitura.conteudo))).toBe(true);
        expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ severidade: "sucesso" }));
    });

    it("a variante limpa não leva comentário nem âncora", () => {
        const baixar = vi.spyOn(RegrasExportacaoMarkdownService.prototype, "baixar").mockImplementation(() => {});
        const fixture = criar();
        (fixture.componentInstance as unknown as { exportar(v: string): void }).exportar("LIMPO");
        TestBed.inject(HttpTestingController).expectOne("/livros/sistema/publicada").flush({ dados: leitura });
        const arquivo = baixar.mock.calls[0][0];
        expect(arquivo.nome).toBe("sistema-v4.1.5-limpo.md");
        expect(arquivo.texto).not.toMatch(/<!--|\{#/);
        expect(arquivo.texto).toContain("## ⬢ Introdução");
    });

    it("avisa o erro, não baixa nada e libera o botão para nova tentativa", () => {
        const baixar = vi.spyOn(RegrasExportacaoMarkdownService.prototype, "baixar").mockImplementation(() => {});
        const fixture = criar("guia");
        const componente = fixture.componentInstance as unknown as { exportar(v: string): void; exportando(): boolean };
        componente.exportar("COMPLETO");
        expect(componente.exportando()).toBe(true);
        TestBed.inject(HttpTestingController).expectOne("/livros/guia/publicada")
            .flush({}, { status: 404, statusText: "Not Found" });
        expect(baixar).not.toHaveBeenCalled();
        expect(componente.exportando()).toBe(false);
        expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ severidade: "erro" }));
    });

    it("ignora um segundo clique enquanto exporta e variantes desconhecidas", () => {
        const baixar = vi.spyOn(RegrasExportacaoMarkdownService.prototype, "baixar").mockImplementation(() => {});
        const fixture = criar();
        const componente = fixture.componentInstance as unknown as { exportar(v: string): void };
        componente.exportar("OUTRA");
        componente.exportar("COMPLETO");
        componente.exportar("LIMPO");
        TestBed.inject(HttpTestingController).expectOne("/livros/sistema/publicada").flush({ dados: leitura });
        expect(baixar).toHaveBeenCalledTimes(1);
    });
});
