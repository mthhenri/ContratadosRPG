import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { RegraPecaArvoreItemDto, RegraPecaRecuperadaDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoLivroVersaoSituacaoEnum, TipoRegraPecaEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessaoService } from "../../../core/services/sessao.service";
import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import { RegrasLeitor } from "../regras-leitor.component";
import { RegrasService } from "../regras.service";
import { OficinaApi } from "./oficina-api.service";

const T = TipoRegraPecaEnum;
const ID = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const texto = (valor: string) => [{ tipo: "texto", texto: valor }];

function peca(id: number, tipo: TipoRegraPecaEnum, pai: number | null, ordem: number, dados: unknown): RegraPecaArvoreItemDto {
    return { id, livroId: 1, pecaPaiId: pai, tipo, identificador: ID(id), ancora: null, ordem, revisao: 1,
        dados: dados as RegraPecaArvoreItemDto["dados"] };
}

const pecas: RegraPecaArvoreItemDto[] = [
    { ...peca(1, T.SECAO, null, 0, { titulo: "Equipamentos", nivel: 1, glifo: null }), ancora: "equipamentos" },
    peca(2, T.EQUIPAMENTOS, 1, 0, { categoria: "Corpo a Corpo" }),
    peca(3, T.EQUIPAMENTO, 2, 0, {
        nome: "Faca", custo: texto("$ 10"), descricao: texto("Curta."), peso: texto("1"),
        porte: texto("Leve"), danos: [{ rotulo: "DANO", trechos: texto("1D4") }],
    }),
    peca(4, T.MODIFICACOES, 1, 1, { categoria: "Corpo a Corpo" }),
    peca(5, T.MODIFICACAO, 4, 0, {
        nome: "Leve", empilhamento: "■□□", efeito: texto("Menos peso."), bloqueia: texto("—"),
    }),
    peca(6, T.AMPLIFICADORES, 1, 2, {}),
    peca(7, T.AMPLIFICADOR, 6, 0, { nome: "Vida", empilhamento: "■", efeito: texto("+5 Vida.") }),
];

describe("Oficina: equipamentos, modificações e amplificadores (m11-08)", () => {
    let api: { listar: ReturnType<typeof vi.fn>; alterarDados: ReturnType<typeof vi.fn> };

    async function abrir() {
        TestBed.overrideProvider(RegrasService, { useValue: {
            carregarLeitura: () => of({
                documento: { tipo: "documento", id: "sistema", titulo: "Sistema", versao: "4.1.4", filhos: [] },
                situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "4.1.4", ancorasAntigas: {},
            }),
        } });
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema");
        leitor.componentRef.setInput("modoOficina", true);
        leitor.detectChanges();
        await leitor.whenStable();
        leitor.detectChanges();
        const raiz = leitor.nativeElement as HTMLElement;
        const selecionar = (n: number) => {
            raiz.querySelector<HTMLElement>(`[data-peca-oficina="${ID(n)}"]`)!.click();
            leitor.detectChanges();
        };
        const dadosSalvos = (id: number) => api.alterarDados.mock.calls.filter((chamada) => chamada[1] === id).at(-1)?.[2];
        const botao = (rotulo: string) => Array.from(raiz.querySelectorAll<HTMLButtonElement>("button"))
            .find((candidato) => (candidato.textContent ?? "").trim() === rotulo || candidato.getAttribute("aria-label") === rotulo);
        /** Os contadores usam segurar-para-repetir (pointer events), não click. */
        const tocar = (alvo: HTMLButtonElement) => {
            alvo.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
            alvo.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 }));
            leitor.detectChanges();
        };
        return { leitor, raiz, selecionar, dadosSalvos, botao, tocar };
    }

    beforeEach(() => {
        api = {
            listar: vi.fn(() => of(pecas)),
            alterarDados: vi.fn((_c: string, id: number, dados: unknown, revisao: number) =>
                of({ ...pecas.find((candidata) => candidata.id === id), dados, revisao: revisao + 1 } as unknown as RegraPecaRecuperadaDto)),
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

    it("cada campo dos três blocos vira campo editável, com a categoria acima da lista", async () => {
        const { leitor, raiz } = await abrir();
        const campos = (n: number) => Array.from(raiz.querySelectorAll<HTMLElement>(`.oficina-texto[data-peca="${ID(n)}"]`))
            .map((campo) => campo.dataset["campo"]);
        expect(campos(2)).toEqual(["categoria"]);
        expect(campos(3)).toEqual(["nome", "custo", "danos.0.trechos", "porte", "peso", "descricao"]);
        expect(campos(4)).toEqual(["categoria"]);
        expect(campos(5)).toEqual(["nome", "efeito", "bloqueia"]);
        expect(campos(7)).toEqual(["nome", "efeito"]);
        leitor.destroy();
    });

    it("mostra o '+ Dano' e os campos opcionais vazios só no equipamento selecionado", async () => {
        const { leitor, raiz, selecionar, botao } = await abrir();
        expect(botao("Adicionar dano")).toBeUndefined();
        expect(raiz.querySelector(`.oficina-texto[data-peca="${ID(3)}"][data-campo="duracao"]`)).toBeNull();
        selecionar(3);
        expect(botao("Adicionar dano")).not.toBeUndefined();
        expect(raiz.querySelector(`.oficina-texto[data-peca="${ID(3)}"][data-campo="duracao"]`)).not.toBeNull();
        expect(raiz.querySelector(`.oficina-texto[data-peca="${ID(3)}"][data-campo="especificacoes"]`)).not.toBeNull();
        leitor.destroy();
    });

    it("troca o tipo de dano, adiciona e remove um dano, salvando a peça a cada passo", async () => {
        const { leitor, selecionar, dadosSalvos, botao } = await abrir();
        selecionar(3);
        botao("DANO")!.click();
        leitor.detectChanges();
        await leitor.whenStable();
        await vi.waitFor(() => expect((dadosSalvos(3) as { danos: { rotulo: string }[] }).danos[0].rotulo).toBe("UMA MÃO"));

        botao("Adicionar dano")!.click();
        leitor.detectChanges();
        await leitor.whenStable();
        await vi.waitFor(() => expect((dadosSalvos(3) as { danos: { rotulo: string }[] }).danos.map((dano) => dano.rotulo)).toEqual(["UMA MÃO", "DANO"]));

        botao("Remover dano 1")!.click();
        leitor.detectChanges();
        await leitor.whenStable();
        await vi.waitFor(() => expect((dadosSalvos(3) as { danos: { rotulo: string }[] }).danos.map((dano) => dano.rotulo)).toEqual(["DANO"]));
        leitor.destroy();
    });

    it("os contadores do empilhamento gravam o texto ■□ do livro", async () => {
        const { leitor, selecionar, dadosSalvos, botao, tocar } = await abrir();
        expect(botao("Aumentar teto de empilhamentos de Leve")).toBeUndefined();
        selecionar(5);
        tocar(botao("Aumentar teto de empilhamentos de Leve") as HTMLButtonElement);
        await leitor.whenStable();
        await vi.waitFor(() => expect((dadosSalvos(5) as { empilhamento: string }).empilhamento).toBe("■□□□"));
        tocar(botao("Aumentar empilhamentos iniciais de Leve") as HTMLButtonElement);
        await leitor.whenStable();
        await vi.waitFor(() => expect((dadosSalvos(5) as { empilhamento: string }).empilhamento).toBe("■■□□"));
        leitor.destroy();
    });

    it("o amplificador de um único ■ não deixa os iniciais abaixo de um", async () => {
        const { leitor, selecionar, botao } = await abrir();
        selecionar(7);
        const diminuir = botao("Diminuir empilhamentos iniciais de Vida");
        expect(diminuir).not.toBeUndefined();
        expect(diminuir!.disabled).toBe(true);
        leitor.destroy();
    });

    it("o fim de cada bloco oferece só o item daquele bloco", async () => {
        const { leitor, raiz, botao } = await abrir();
        botao("Inserir equipamento")!.click();
        leitor.detectChanges();
        const opcoes = () => Array.from(raiz.querySelectorAll(".menu-insercao__rotulo")).map((e) => e.textContent?.trim());
        expect(opcoes()).toEqual(["Equipamento"]);
        leitor.destroy();
    });
});
