import { HttpErrorResponse } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import type { RegraPecaArvoreItemDto, RegraPecaRecuperadaDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";
import { Observable, Subject, of, throwError } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import { OficinaApi } from "./oficina-api.service";
import { ESPERA_SALVAR_MS, JANELA_DESFAZER_MS, OficinaStore } from "./oficina.store";

const ID = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const T = TipoRegraPecaEnum;

function item(id: number, tipo: TipoRegraPecaEnum, pai: number | null, ordem: number, dados: unknown, revisao = 1):
    RegraPecaArvoreItemDto {
    return { id, livroId: 1, pecaPaiId: pai, tipo, identificador: ID(id), ancora: tipo === T.SECAO ? `secao-${id}` : null,
        ordem, dados: dados as RegraPecaArvoreItemDto["dados"], revisao };
}
const texto = (valor: string) => ({ trechos: [{ tipo: "texto", texto: valor }] });

function livro(): RegraPecaArvoreItemDto[] {
    return [
        item(1, T.SECAO, null, 0, { titulo: "Agentes", nivel: 1, glifo: null }),
        item(2, T.PARAGRAFO, 1, 0, texto("primeiro")),
        item(3, T.PARAGRAFO, 1, 1, texto("segundo")),
        item(4, T.HABILIDADE, 1, 2, { nome: "Golpe", custo: 2, reacao: false, glifo: null, trechos: [] }),
    ];
}

function erroHttp(status: number): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: { mensagem: "x" } });
}

describe("OficinaStore", () => {
    let api: {
        listar: ReturnType<typeof vi.fn>; recuperar: ReturnType<typeof vi.fn>; alterarDados: ReturnType<typeof vi.fn>;
        alterarPosicao: ReturnType<typeof vi.fn>; duplicar: ReturnType<typeof vi.fn>; excluir: ReturnType<typeof vi.fn>;
        restaurar: ReturnType<typeof vi.fn>; criar: ReturnType<typeof vi.fn>;
    };
    let notificacoes: { severidade: string; resumo: string }[];
    let servidor: Map<number, RegraPecaArvoreItemDto>;

    async function montar(): Promise<OficinaStore> {
        const store = TestBed.inject(OficinaStore);
        await store.carregar("sistema", { titulo: "Sistema", numero: "4.1.4" });
        return store;
    }

    beforeEach(() => {
        vi.useFakeTimers();
        notificacoes = [];
        servidor = new Map(livro().map((peca) => [peca.id, peca]));
        api = {
            listar: vi.fn(() => of([...servidor.values()])),
            recuperar: vi.fn((_codigo: string, id: number) => of(servidor.get(id) as unknown as RegraPecaRecuperadaDto)),
            alterarDados: vi.fn((_c: string, id: number, dados: unknown, revisao: number) => {
                const atual = servidor.get(id) as RegraPecaArvoreItemDto;
                const nova = { ...atual, dados: dados as RegraPecaArvoreItemDto["dados"], revisao: revisao + 1 };
                servidor.set(id, nova);
                return of(nova as unknown as RegraPecaRecuperadaDto);
            }),
            alterarPosicao: vi.fn(),
            duplicar: vi.fn(),
            excluir: vi.fn(() => of({ removidas: 1 })),
            restaurar: vi.fn(),
            criar: vi.fn(),
        };
        TestBed.configureTestingModule({
            providers: [
                OficinaStore,
                { provide: OficinaApi, useValue: api },
                { provide: NotificacaoService, useValue: { notificar: (n: { severidade: string; resumo: string }) => { notificacoes.push(n); return 1; } } },
            ],
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("carrega a cópia de trabalho e projeta o livro com o identificador de cada peça", async () => {
        const store = await montar();
        expect(store.estado()).toBe("ok");
        const documento = store.documento() as unknown as { filhos: { tipo: string; peca?: string; filhos: { peca?: string }[] }[] };
        const secao = documento.filhos.find((filho) => filho.tipo === "secao");
        expect(secao?.peca).toBe(ID(1));
        expect(secao?.filhos.map((filho) => filho.peca)).toEqual([ID(2), ID(3), ID(4)]);
    });

    it("salva a peça depois da espera, com a revisão lida, e passa a usar a revisão devolvida", async () => {
        const store = await montar();
        store.alterarDados(ID(2), { trechos: [{ tipo: "texto", texto: "novo" }] } as never);
        expect(api.alterarDados).not.toHaveBeenCalled();
        expect(store.indicador()).toBe("pendente");
        await vi.advanceTimersByTimeAsync(ESPERA_SALVAR_MS);
        expect(api.alterarDados).toHaveBeenCalledTimes(1);
        expect(api.alterarDados.mock.calls[0].slice(0, 2)).toEqual(["sistema", 2]);
        expect(api.alterarDados.mock.calls[0][3]).toBe(1);
        expect(store.item(ID(2))?.revisao).toBe(2);
        expect(store.indicador()).toBe("salvo");
    });

    it("edições seguidas dentro da espera viram um único salvamento", async () => {
        const store = await montar();
        store.alterarDados(ID(2), texto("a") as never);
        await vi.advanceTimersByTimeAsync(ESPERA_SALVAR_MS - 100);
        store.alterarDados(ID(2), texto("ab") as never);
        await vi.advanceTimersByTimeAsync(ESPERA_SALVAR_MS);
        expect(api.alterarDados).toHaveBeenCalledTimes(1);
        expect(api.alterarDados.mock.calls[0][2]).toEqual(texto("ab"));
    });

    it("uma edição feita com a requisição em voo é reenviada com a revisão nova e a resposta tardia não a sobrescreve", async () => {
        const respostas: Subject<RegraPecaRecuperadaDto>[] = [];
        api.alterarDados.mockImplementation(() => {
            const resposta = new Subject<RegraPecaRecuperadaDto>();
            respostas.push(resposta);
            return resposta as Observable<RegraPecaRecuperadaDto>;
        });
        const store = await montar();
        store.alterarDados(ID(2), texto("A") as never);
        await vi.advanceTimersByTimeAsync(ESPERA_SALVAR_MS);
        expect(api.alterarDados).toHaveBeenCalledTimes(1);

        store.alterarDados(ID(2), texto("AB") as never);
        await vi.advanceTimersByTimeAsync(ESPERA_SALVAR_MS);
        // Ainda há uma requisição em voo: nada novo sai, a peça espera.
        expect(api.alterarDados).toHaveBeenCalledTimes(1);

        respostas[0].next({ ...(servidor.get(2) as object), dados: texto("A"), revisao: 2 } as unknown as RegraPecaRecuperadaDto);
        respostas[0].complete();
        await vi.advanceTimersByTimeAsync(0);
        // O texto local continua "AB" e o reenvio usa a revisão 2.
        expect(store.item(ID(2))?.dados).toEqual(texto("AB"));
        expect(api.alterarDados).toHaveBeenCalledTimes(2);
        expect(api.alterarDados.mock.calls[1][2]).toEqual(texto("AB"));
        expect(api.alterarDados.mock.calls[1][3]).toBe(2);

        respostas[1].next({ ...(servidor.get(2) as object), dados: texto("AB"), revisao: 3 } as unknown as RegraPecaRecuperadaDto);
        respostas[1].complete();
        await vi.advanceTimersByTimeAsync(0);
        expect(store.item(ID(2))?.revisao).toBe(3);
        expect(store.indicador()).toBe("salvo");
    });

    it("conflito de revisão recarrega a peça, descarta a edição local e avisa", async () => {
        const store = await montar();
        servidor.set(2, { ...(servidor.get(2) as RegraPecaArvoreItemDto), dados: texto("de outro lugar") as never, revisao: 5 });
        api.alterarDados.mockReturnValueOnce(throwError(() => erroHttp(409)));
        store.alterarDados(ID(2), texto("minha") as never);
        await vi.advanceTimersByTimeAsync(ESPERA_SALVAR_MS);
        expect(store.item(ID(2))?.dados).toEqual(texto("de outro lugar"));
        expect(store.item(ID(2))?.revisao).toBe(5);
        expect(notificacoes.some((n) => n.severidade === "aviso")).toBe(true);
        expect(store.podeDesfazer()).toBe(false);
        expect(store.indicador()).toBe("salvo");
    });

    it("falha de rede mantém o texto, mostra falha e tenta de novo", async () => {
        const store = await montar();
        api.alterarDados.mockReturnValueOnce(throwError(() => erroHttp(0)));
        store.alterarDados(ID(2), texto("não perder") as never);
        await vi.advanceTimersByTimeAsync(ESPERA_SALVAR_MS);
        expect(store.indicador()).toBe("falha");
        expect(store.item(ID(2))?.dados).toEqual(texto("não perder"));
        await vi.advanceTimersByTimeAsync(6000);
        expect(api.alterarDados).toHaveBeenCalledTimes(2);
        expect(store.indicador()).toBe("salvo");
    });

    it("Desfazer agrupa edições seguidas do mesmo campo e restaura o texto de antes", async () => {
        const store = await montar();
        const passo = { rotulo: "Edição de texto", chave: `${ID(2)}:trechos` };
        store.alterarDados(ID(2), texto("a") as never, passo);
        store.alterarDados(ID(2), texto("ab") as never, passo);
        await vi.advanceTimersByTimeAsync(ESPERA_SALVAR_MS);
        expect(store.podeDesfazer()).toBe(true);
        await store.desfazer();
        expect(store.item(ID(2))?.dados).toEqual(texto("primeiro"));
        expect(store.podeDesfazer()).toBe(false);
        expect(api.alterarDados.mock.calls.at(-1)?.[2]).toEqual(texto("primeiro"));
    });

    it("edições do mesmo campo longe uma da outra são passos separados", async () => {
        const store = await montar();
        const passo = { rotulo: "Edição de texto", chave: `${ID(2)}:trechos` };
        store.alterarDados(ID(2), texto("a") as never, passo);
        await vi.advanceTimersByTimeAsync(JANELA_DESFAZER_MS + 100);
        store.alterarDados(ID(2), texto("ab") as never, passo);
        await store.desfazer();
        expect(store.item(ID(2))?.dados).toEqual(texto("a"));
        expect(store.podeDesfazer()).toBe(true);
    });

    it("a pilha guarda no máximo 100 passos", async () => {
        const store = await montar();
        for (let i = 0; i < 120; i++) {
            store.alterarDados(ID(2), texto(`v${i}`) as never, { rotulo: "x", chave: `k${i}` });
        }
        let passos = 0;
        while (store.podeDesfazer()) {
            await store.desfazer();
            passos++;
        }
        expect(passos).toBe(100);
    });

    it("remover pede a exclusão com a revisão atual, tira a peça da tela e o Desfazer a restaura", async () => {
        const store = await montar();
        const removida = servidor.get(3) as RegraPecaArvoreItemDto;
        api.restaurar.mockReturnValue(of({ pecas: [removida] }));
        await store.remover(ID(3));
        expect(api.excluir).toHaveBeenCalledWith("sistema", 3, 1);
        expect(store.item(ID(3))).toBeUndefined();
        expect(notificacoes.some((n) => n.resumo === "Peça removida")).toBe(true);
        await store.desfazer();
        expect(api.restaurar).toHaveBeenCalledWith("sistema", 3);
        expect(store.item(ID(3))).toBeDefined();
    });

    it("remover grava antes o que estava pendente na peça, para excluir com a revisão certa", async () => {
        const store = await montar();
        store.alterarDados(ID(3), texto("editado") as never);
        await store.remover(ID(3));
        expect(api.alterarDados).toHaveBeenCalledTimes(1);
        expect(api.excluir).toHaveBeenCalledWith("sistema", 3, 2);
    });

    it("mover pede a posição vizinha, aplica as ordens devolvidas e o Desfazer volta à posição", async () => {
        const store = await montar();
        const aposMover = [
            { ...(servidor.get(3) as RegraPecaArvoreItemDto), ordem: 0, revisao: 2 },
            { ...(servidor.get(2) as RegraPecaArvoreItemDto), ordem: 1 },
        ];
        api.alterarPosicao.mockReturnValueOnce(of({ pecas: aposMover }));
        await store.mover(ID(3), -1);
        expect(api.alterarPosicao).toHaveBeenCalledWith("sistema", 3, 1, 0, 1);
        expect(store.posicaoEntreIrmas(ID(3))).toEqual({ indice: 0, total: 2 });
        api.alterarPosicao.mockReturnValueOnce(of({ pecas: [
            { ...(servidor.get(3) as RegraPecaArvoreItemDto), ordem: 1, revisao: 3 },
            { ...(servidor.get(2) as RegraPecaArvoreItemDto), ordem: 0 },
        ] }));
        await store.desfazer();
        expect(api.alterarPosicao).toHaveBeenLastCalledWith("sistema", 3, 1, 1, 2);
        expect(store.posicaoEntreIrmas(ID(3))).toEqual({ indice: 1, total: 2 });
    });

    it("não move além da primeira nem da última posição", async () => {
        const store = await montar();
        await store.mover(ID(2), -1);
        await store.mover(ID(4), 1);
        expect(api.alterarPosicao).not.toHaveBeenCalled();
    });

    it("Enter no fim cria o parágrafo logo depois, o seleciona e pede o foco nele; Desfazer o remove", async () => {
        const store = await montar();
        const criada = item(9, T.PARAGRAFO, 1, 1, { trechos: [] });
        api.criar.mockReturnValue(of({ peca: criada, pecas: [{ ...(servidor.get(3) as RegraPecaArvoreItemDto), ordem: 2 }] }));
        await store.criarDepois(ID(2), "trechos", { trechos: [] } as never);
        expect(api.criar).toHaveBeenCalledWith("sistema", { tipo: T.PARAGRAFO, pecaPaiId: 1, indice: 1, dados: { trechos: [] } });
        expect(store.selecionada()).toBe(ID(9));
        expect(store.pedidoFoco()).toEqual({ identificador: ID(9), campo: "trechos", posicao: "inicio" });
        await store.desfazer();
        expect(api.excluir).toHaveBeenCalledWith("sistema", 9, 1);
        expect(store.item(ID(9))).toBeUndefined();
    });

    it("Enter no meio deixa o começo na peça e passa o resto à nova, desfazendo os dois juntos", async () => {
        const store = await montar();
        const criada = item(9, T.PARAGRAFO, 1, 1, texto("fim"));
        api.criar.mockReturnValue(of({ peca: criada, pecas: [] }));
        await store.criarDepois(ID(2), "trechos", texto("fim") as never, texto("com") as never);
        expect(store.item(ID(2))?.dados).toEqual(texto("com"));
        await store.desfazer();
        expect(store.item(ID(2))?.dados).toEqual(texto("primeiro"));
        expect(store.item(ID(9))).toBeUndefined();
    });

    it("pendências: habilidade sem texto aparece na peça e no contador, sem bloquear a edição", async () => {
        const store = await montar();
        expect(store.pendencias().length).toBeGreaterThan(0);
        expect((store.pendenciasPorPeca().get(ID(4)) ?? []).length).toBeGreaterThan(0);
        store.alterarDados(ID(4), { nome: "Golpe", custo: 2, reacao: false, glifo: null, trechos: [{ tipo: "texto", texto: "Causa dano." }] } as never);
        expect(store.pendenciasPorPeca().get(ID(4))).toBeUndefined();
    });

    it("Ir para peça: lista as peças com nome ou texto, com o caminho dos títulos", async () => {
        const store = await montar();
        const rotulos = store.rotulos();
        expect(rotulos.map((rotulo) => rotulo.rotulo)).toEqual(["Agentes", "primeiro", "segundo", "Golpe"]);
        expect(rotulos[3].contexto).toBe("Agentes");
    });

    it("encerrar grava o que estava pendente antes de limpar o estado", async () => {
        const store = await montar();
        store.alterarDados(ID(2), texto("não perder") as never);
        const encerrado = store.encerrar();
        await vi.advanceTimersByTimeAsync(0);
        await encerrado;
        expect(api.alterarDados).toHaveBeenCalledTimes(1);
        expect(store.estado()).toBe("inativo");
        expect(store.itens()).toEqual([]);
    });
    it("habilidade inicial e filhas de roteiro não se duplicam, removem nem movem; Enter nelas não cria parágrafo", async () => {
        servidor.set(5, item(5, T.SUBCLASSE, 1, 3, { nome: "S", classe: "C" }));
        servidor.set(6, item(6, T.HABILIDADE, 5, 0, { nome: "Ini", custo: 1, reacao: false, glifo: null, trechos: [], inicial: true }));
        servidor.set(7, item(7, T.ROTEIRO, 1, 4, { etapas: [], introducaoQuantidade: 1, conclusaoQuantidade: 0 }));
        servidor.set(8, item(8, T.PARAGRAFO, 7, 0, texto("a")));
        servidor.set(9, item(9, T.PARAGRAFO, 7, 1, texto("b")));
        const store = await montar();
        expect(store.podeDuplicarOuRemover(ID(6))).toBe(false);
        expect(store.podeDuplicarOuRemover(ID(8))).toBe(false);
        expect(store.podeDuplicarOuRemover(ID(3))).toBe(true);
        expect(store.posicaoEntreIrmas(ID(8))).toBeNull();
        expect(store.ehParagrafo(ID(8))).toBe(false);
        await store.remover(ID(6));
        await store.duplicar(ID(8));
        await store.mover(ID(9), -1);
        expect(api.excluir).not.toHaveBeenCalled();
        expect(api.duplicar).not.toHaveBeenCalled();
        expect(api.alterarPosicao).not.toHaveBeenCalled();
    });

    it("mover só troca com irmãs do mesmo grupo (a inicial não é vizinha das comuns)", async () => {
        servidor.set(5, item(5, T.ARQUETIPO, 1, 3, { nome: "A", citacao: [], atributosBonus: [] }));
        servidor.set(6, item(6, T.HABILIDADE, 5, 0, { nome: "Ini", custo: 1, reacao: false, glifo: null, trechos: [], inicial: true }));
        servidor.set(7, item(7, T.HABILIDADE, 5, 1, { nome: "H7", custo: 1, reacao: false, glifo: null, trechos: [] }));
        servidor.set(8, item(8, T.HABILIDADE, 5, 2, { nome: "H8", custo: 1, reacao: false, glifo: null, trechos: [] }));
        const store = await montar();
        expect(store.posicaoEntreIrmas(ID(7))).toEqual({ indice: 0, total: 2 });
        api.alterarPosicao.mockReturnValueOnce(of({ pecas: [] }));
        await store.mover(ID(7), -1);
        expect(api.alterarPosicao).not.toHaveBeenCalled();
        await store.mover(ID(7), 1);
        expect(api.alterarPosicao).toHaveBeenCalledWith("sistema", 7, 5, 2, 1);
    });

    it("o Desfazer do aviso de remoção desfaz aquela remoção, não o topo da pilha", async () => {
        const store = await montar();
        api.restaurar.mockImplementation((_c: string, id: number) => of({ pecas: [servidor.get(id) as RegraPecaArvoreItemDto] }));
        await store.remover(ID(2));
        const avisoA = vi.mocked(TestBed.inject(NotificacaoService).notificar);
        await store.remover(ID(3));
        const primeiro = (notificacoes as unknown as { acao?: { executar: () => void } }[]).find((n) => n.acao);
        primeiro?.acao?.executar();
        await vi.advanceTimersByTimeAsync(0);
        expect(api.restaurar).toHaveBeenCalledWith("sistema", 2);
        expect(store.item(ID(3))).toBeUndefined();
        expect(avisoA).toBeDefined();
    });

    it("remover o pai tira da pilha as edições das descendentes", async () => {
        const store = await montar();
        store.alterarDados(ID(2), texto("editado") as never, { rotulo: "x", chave: "k" });
        await store.remover(ID(1));
        expect(store.podeDesfazer()).toBe(true);
        expect(store.rotuloDesfazer()).toBe("Remover peça");
        await store.desfazer();
        expect(store.podeDesfazer()).toBe(false);
    });

    it("Ir para peça só lista peças que a tela desenha, e a pendência cai no ancestral visível", async () => {
        servidor.set(5, item(5, T.ARQUETIPO, 1, 3, { nome: "Arquétipo", citacao: [], atributosBonus: [] }));
        const store = await montar();
        expect(store.rotulos().some((r) => r.rotulo === "Arquétipo")).toBe(false);
        expect(store.alvoVisivel(ID(5))).toBe(ID(1));
    });

    it("recarregar a lista nunca devolve uma revisão mais antiga que a local", async () => {
        const store = await montar();
        store.alterarDados(ID(2), texto("novo") as never);
        await vi.advanceTimersByTimeAsync(ESPERA_SALVAR_MS);
        expect(store.item(ID(2))?.revisao).toBe(2);
        api.listar.mockReturnValueOnce(of([...livro()]));
        api.alterarPosicao.mockReturnValueOnce(throwError(() => erroHttp(409)));
        await store.mover(ID(3), -1);
        expect(store.item(ID(2))?.revisao).toBe(2);
    });
});
