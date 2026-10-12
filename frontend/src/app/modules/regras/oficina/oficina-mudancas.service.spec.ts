import { HttpErrorResponse } from "@angular/common/http";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { LivroPecaDto, LivroVersaoRecuperadaDto, LivroVersaoResumoDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoLivroVersaoSituacaoEnum as Situacao, TipoRegraPecaEnum as T } from "@contratados-rpg/shared/enums";
import { of, throwError } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import { OficinaApi } from "./oficina-api.service";
import { ESPERA_COMPARAR_MS, OficinaMudancas } from "./oficina-mudancas.service";
import { OficinaStore } from "./oficina.store";

const texto = (valor: string) => [{ tipo: "texto" as const, texto: valor }];
const peca = (identificador: string, valor: string, ordem = 0): LivroPecaDto => ({
    identificador, ancora: null, tipo: T.PARAGRAFO, ordem, dados: { trechos: texto(valor) } as never, filhos: [],
});
const resumo = (id: number, numero: string, situacao: Situacao, data: string): LivroVersaoResumoDto => ({
    id, livroId: 1, situacao, numero, formato: 1, publicacaoData: data, usuarioId: 1, nota: null,
});
const recuperada = (versao: LivroVersaoResumoDto, pecas: LivroPecaDto[]): LivroVersaoRecuperadaDto => ({
    ...versao, conteudo: { formato: 1, codigo: "sistema", titulo: "S", subtitulo: "", numero: versao.numero, pecas },
} as unknown as LivroVersaoRecuperadaDto);

describe("OficinaMudancas", () => {
    const publicada = resumo(2, "4.1.4", Situacao.PUBLICADA, "2026-10-01T10:00:00Z");
    const rascunho = resumo(3, "4.1.5", Situacao.RASCUNHO, "2026-10-02T10:00:00Z");
    let estado = signal<"inativo" | "ok">("ok");
    let conteudo = signal({ pecas: [peca("a", "um"), peca("b", "dois", 1)] });
    let api: { listarVersoes: ReturnType<typeof vi.fn>; recuperarVersao: ReturnType<typeof vi.fn>; publicar: ReturnType<typeof vi.fn> };
    let store: { estado: typeof estado; codigo: ReturnType<typeof signal<string | null>>; conteudo: typeof conteudo; salvarTudo: ReturnType<typeof vi.fn>; temPendenteDeSalvar: boolean; item: () => undefined; pai: () => undefined };
    let notificacoes: string[];

    async function montar(versoes: LivroVersaoResumoDto[] = [rascunho, publicada]) {
        api.listarVersoes.mockReturnValue(of(versoes));
        const servico = TestBed.inject(OficinaMudancas);
        TestBed.tick();
        await vi.advanceTimersByTimeAsync(0);
        return servico;
    }

    beforeEach(() => {
        vi.useFakeTimers();
        estado = signal<"inativo" | "ok">("ok");
        conteudo = signal({ pecas: [peca("a", "um"), peca("b", "dois", 1)] });
        notificacoes = [];
        api = {
            listarVersoes: vi.fn(),
            recuperarVersao: vi.fn((_c: string, id: number) => of(recuperada(id === 2 ? publicada : rascunho,
                id === 2 ? [peca("a", "um"), peca("b", "dois", 1)] : [peca("a", "um")]))),
            publicar: vi.fn(),
        };
        store = { estado, codigo: signal<string | null>("sistema"), conteudo, salvarTudo: vi.fn().mockResolvedValue(undefined), temPendenteDeSalvar: false, item: () => undefined, pai: () => undefined };
        TestBed.configureTestingModule({
            providers: [
                OficinaMudancas,
                { provide: OficinaApi, useValue: api },
                { provide: OficinaStore, useValue: store },
                { provide: NotificacaoService, useValue: { notificar: (n: { resumo: string }) => { notificacoes.push(n.resumo); return 1; } } },
            ],
        });
    });

    afterEach(() => vi.useRealTimers());

    it("carrega as versões da mais recente à mais antiga e o conteúdo da última publicada", async () => {
        const servico = await montar([publicada, rascunho]);
        expect(servico.versoes().map((versao) => versao.id)).toEqual([3, 2]);
        expect(servico.publicada()?.numero).toBe("4.1.4");
        expect(api.recuperarVersao).toHaveBeenCalledWith("sistema", 2);
        expect(servico.maisRecente()?.situacao).toBe(Situacao.RASCUNHO);
        expect(servico.numeroSugerido()).toBe("4.1.5");
    });

    it("marca a peça alterada e a nova contra a publicada, só depois da espera", async () => {
        const servico = await montar();
        conteudo.set({ pecas: [peca("a", "um editado"), peca("b", "dois", 1), peca("c", "novo", 2)] });
        TestBed.tick();
        expect(servico.marcas().size).toBe(0);
        await vi.advanceTimersByTimeAsync(ESPERA_COMPARAR_MS + 10);
        expect(servico.marcas().get("a")).toBe("alterada");
        expect(servico.marcas().get("c")).toBe("nova");
        expect(servico.marcas().has("b")).toBe(false);
        expect(servico.total()).toBe(2);
    });

    it("digitar várias vezes seguidas recalcula uma vez só", async () => {
        const servico = await montar();
        for (const valor of ["u", "um", "um e"]) {
            conteudo.set({ pecas: [peca("a", valor), peca("b", "dois", 1)] });
            TestBed.tick();
            await vi.advanceTimersByTimeAsync(ESPERA_COMPARAR_MS / 3);
        }
        expect(servico.comparacao()).toBeNull();
        await vi.advanceTimersByTimeAsync(ESPERA_COMPARAR_MS);
        expect(servico.comparacao()?.resumo.total).toBe(1);
    });

    it("sem versão publicada não há marcas nem comparação", async () => {
        const servico = await montar([rascunho]);
        conteudo.set({ pecas: [peca("a", "x")] });
        TestBed.tick();
        await vi.advanceTimersByTimeAsync(ESPERA_COMPARAR_MS + 10);
        expect(servico.publicada()).toBeNull();
        expect(servico.comparacao()).toBeNull();
        expect(servico.marcas().size).toBe(0);
        expect(servico.numeroSugerido()).toBe("1.0.0");
    });

    it("compara duas versões quaisquer (Histórico)", async () => {
        const servico = await montar();
        const comparacao = await servico.comparar(3, 2);
        expect(comparacao.resumo.porSituacao.NOVA).toBe(1);
    });

    it("publicar grava o que estava por salvar, manda número e nota limpos e recarrega as versões", async () => {
        const servico = await montar();
        const nova = resumo(4, "4.1.5", Situacao.PUBLICADA, "2026-10-03T10:00:00Z");
        api.publicar.mockReturnValue(of({ versao: nova, pendencias: [] }));
        const resultado = await servico.publicar(Situacao.PUBLICADA, " 4.1.5 ", "  ajuste  ");
        expect(resultado.ok).toBe(true);
        expect(store.salvarTudo).toHaveBeenCalled();
        expect(api.publicar).toHaveBeenCalledWith("sistema", { situacao: Situacao.PUBLICADA, numero: "4.1.5", nota: "ajuste" });
        expect(api.listarVersoes).toHaveBeenCalledTimes(2);
        expect(notificacoes).toEqual(["Versão publicada"]);
        expect(servico.publicando()).toBe(false);
    });

    it("nota vazia vai como null e rascunho avisa como rascunho", async () => {
        const servico = await montar();
        api.publicar.mockReturnValue(of({ versao: rascunho, pendencias: [] }));
        await servico.publicar(Situacao.RASCUNHO, "4.1.6", "   ");
        expect(api.publicar).toHaveBeenCalledWith("sistema", { situacao: Situacao.RASCUNHO, numero: "4.1.6", nota: null });
        expect(notificacoes).toEqual(["Rascunho publicado"]);
    });

    it("a recusa do servidor devolve a mensagem e as pendências, sem notificar sucesso", async () => {
        const servico = await montar();
        api.publicar.mockReturnValue(throwError(() => new HttpErrorResponse({
            status: 400, error: { mensagem: "O livro tem 1 pendência(s).", erros: ["Classes > Lutador: Falta o nome."] },
        })));
        const resultado = await servico.publicar(Situacao.PUBLICADA, "4.1.5", "");
        expect(resultado).toEqual({ ok: false, mensagem: "O livro tem 1 pendência(s).", erros: ["Classes > Lutador: Falta o nome."] });
        expect(notificacoes).toEqual([]);
        expect(servico.publicando()).toBe(false);
    });

    it("não publica quando o salvamento falhou e ficou algo por gravar", async () => {
        const servico = await montar();
        store.temPendenteDeSalvar = true;
        const resultado = await servico.publicar(Situacao.PUBLICADA, "4.1.5", "");
        expect(resultado.ok).toBe(false);
        expect(api.publicar).not.toHaveBeenCalled();
        expect(servico.publicando()).toBe(false);
    });

    it("falha ao listar as versões não vira \"nunca publicado\"", async () => {
        api.listarVersoes.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
        const servico = TestBed.inject(OficinaMudancas);
        TestBed.tick();
        await vi.advanceTimersByTimeAsync(0);
        expect(servico.falhou()).toBe(true);
        expect(servico.carregou()).toBe(true);
    });

    it("o resumo conta o que a lista mostra (sem as filhas de peça nova)", async () => {
        const servico = await montar();
        conteudo.set({ pecas: [peca("a", "um"), peca("b", "dois", 1), peca("c", "novo", 2)] });
        TestBed.tick();
        await vi.advanceTimersByTimeAsync(ESPERA_COMPARAR_MS + 10);
        expect(servico.contagem().NOVA).toBe(1);
        expect(servico.visiveis()).toHaveLength(1);
    });

    it("sair da Oficina limpa tudo", async () => {
        const servico = await montar();
        estado.set("inativo");
        TestBed.tick();
        await vi.advanceTimersByTimeAsync(10);
        expect(servico.versoes()).toEqual([]);
        expect(servico.publicada()).toBeNull();
        expect(servico.carregou()).toBe(false);
    });
});
