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

const atributo = (nome: string) => ({ nome, valor: 3, modificador: "Médio", bonus: "+1" });
const pecas: RegraPecaArvoreItemDto[] = [
    { ...peca(1, T.SECAO, null, 0, { titulo: "Bestiário", nivel: 1, glifo: null }), ancora: "bestiario" },
    peca(2, T.FICHA_CRIATURA, 1, 0, {
        nome: "Coisa", identidade: [{ rotulo: "Conceito", valor: texto("Um monstro.") }, { rotulo: "NA", valor: texto("NA 3"), nivel: 3 }],
        atributos: [atributo("Força"), atributo("Destreza")], vidaMaxima: "20", defesaBase: "10", resistencias: texto("Resistências escolhidas: Fogo"),
        fraquezas: texto("Frio"), regeneracao: texto("1"), porte: texto("Médio"), deslocamento: texto("5m"), cadencia: "1",
        ataques: [{ nome: "Garra", acao: "Padrão", teste: "5", dano: "1D6", efeito: texto("Rasga.") }] }),
    peca(3, T.HABILIDADE_CRIATURA, 2, 0, { nome: "Fúria", categoria: "PASSIVA", trechos: texto("Bate forte."), rotulo: "Fúria" }),
    peca(4, T.ROTEIRO, 1, 1, { etapas: [{ ordem: 1, titulo: texto("Chegar"), descricao: texto("Entra.") }],
        introducaoQuantidade: 0, conclusaoQuantidade: 0 }),
];

describe("Oficina: ficha de criatura e roteiro (m11-08)", () => {
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

    it("ficha, habilidade de criatura e roteiro expõem seus campos como editáveis", async () => {
        const { leitor, raiz } = await abrir();
        const campos = (n: number) => Array.from(raiz.querySelectorAll<HTMLElement>(`.oficina-texto[data-peca="${ID(n)}"]`))
            .map((campo) => campo.dataset["campo"]).sort();
        expect(campos(2)).toEqual(expect.arrayContaining(["nome", "identidade.0.valor", "identidade.1.valor", "vidaMaxima", "defesaBase",
            "resistencias", "fraquezas", "regeneracao", "porte", "deslocamento", "cadencia", "ataques.0.nome", "ataques.0.acao",
            "ataques.0.teste", "ataques.0.dano", "ataques.0.efeito"]));
        expect(campos(3)).toEqual(["nome", "trechos"]);
        expect(campos(4)).toEqual(["etapas.0.descricao", "etapas.0.titulo"]);
        leitor.destroy();
    });

    it("a ficha selecionada edita atributos e ataques, cada alteração com o próprio passo", async () => {
        const { leitor, selecionar, dadosSalvos, botao, tocar } = await abrir();
        expect(botao("Adicionar ataque")).toBeUndefined();
        selecionar(2);
        tocar(botao("Aumentar valor de Força") as HTMLButtonElement);
        await vi.waitFor(() => expect((dadosSalvos(2) as { atributos: { valor: number }[] }).atributos[0].valor).toBe(4));
        await leitor.whenStable();
        leitor.detectChanges();
        botao("Modificador de Força: Médio, trocar")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(2) as { atributos: { modificador: string }[] }).atributos[0].modificador).toBe("Fraco"));
        await leitor.whenStable();
        leitor.detectChanges();
        botao("Adicionar ataque")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(2) as { ataques: unknown[] }).ataques).toHaveLength(2));
        await leitor.whenStable();
        leitor.detectChanges();
        botao("Remover ataque 2")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(2) as { ataques: unknown[] }).ataques).toHaveLength(1));
        leitor.destroy();
    });

    it("o Nível de Ameaça ganha contador na ficha selecionada", async () => {
        const { leitor, selecionar, dadosSalvos, botao, tocar } = await abrir();
        selecionar(2);
        tocar(botao("Aumentar nível de ameaça") as HTMLButtonElement);
        await vi.waitFor(() => expect((dadosSalvos(2) as { identidade: { nivel?: number }[] }).identidade[1].nivel).toBe(4));
        leitor.destroy();
    });

    it("a categoria da habilidade de criatura alterna e o roteiro adiciona e remove etapas renumerando", async () => {
        const { leitor, selecionar, dadosSalvos, botao } = await abrir();
        selecionar(3);
        botao("Categoria: PASSIVA, trocar")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(3) as { categoria: string }).categoria).toBe("ATIVA"));
        selecionar(4);
        botao("Adicionar etapa")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(4) as { etapas: { ordem: number }[] }).etapas.map((e) => e.ordem)).toEqual([1, 2]));
        await leitor.whenStable();
        leitor.detectChanges();
        botao("Remover etapa 1")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(4) as { etapas: { ordem: number }[] }).etapas.map((e) => e.ordem)).toEqual([1]));
        leitor.destroy();
    });

    it("o fim da ficha oferece só a habilidade de criatura", async () => {
        const { leitor, raiz, botao } = await abrir();
        botao("Inserir habilidade de criatura")!.click();
        leitor.detectChanges();
        const opcoes = Array.from(raiz.querySelectorAll(".menu-insercao__rotulo")).map((e) => e.textContent?.trim());
        expect(opcoes).toEqual(["Habilidade de criatura"]);
        leitor.destroy();
    });
});
