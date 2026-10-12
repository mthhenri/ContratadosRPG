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

const saude = { vida: texto("10"), energia: texto("5") };
const hab = (inicial: boolean) => ({ nome: inicial ? "Inicial" : "Outra", custo: 1, reacao: false, glifo: null, trechos: texto("Efeito."), inicial });
const pecas: RegraPecaArvoreItemDto[] = [
    { ...peca(1, T.SECAO, null, 0, { titulo: "Classes", nivel: 1, glifo: null }), ancora: "classes" },
    peca(2, T.CLASSE, 1, 0, { nome: "Combatente", citacao: texto("Força."), saude, progressao: { vida: texto("2"), energia: texto("1") }, cabecalho: [], linhas: [] }),
    peca(3, T.ARQUETIPO, 2, 0, { nome: "Lutador", citacao: texto("Soco."), atributosBonus: texto("+1 Luta") }),
    peca(4, T.HABILIDADE, 3, 0, hab(true)),
    peca(5, T.SUBCLASSE, 1, 1, { nome: "Quimera", classe: "Experimento", citacao: texto("Mistura."), custos: [texto("2 Vida")],
        saude, progressao: { vida: texto("3"), energia: texto("2") }, atributosBonus: texto("+1 Vigor") }),
    peca(6, T.HABILIDADE, 5, 0, hab(true)),
];

describe("Oficina: classe, arquétipo e subclasse (m11-08)", () => {
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

    it("classe, arquétipo e subclasse expõem nome, citação, saúde, progressão e bônus como campos", async () => {
        const { leitor, raiz } = await abrir();
        const campos = (n: number) => Array.from(raiz.querySelectorAll<HTMLElement>(`.oficina-texto[data-peca="${ID(n)}"]`))
            .map((campo) => campo.dataset["campo"]).sort();
        expect(campos(2)).toEqual(["citacao", "nome", "progressao.energia", "progressao.vida", "saude.energia", "saude.vida"]);
        expect(campos(3)).toEqual(["atributosBonus", "citacao", "nome"]);
        expect(campos(5)).toEqual(["atributosBonus", "citacao", "classe", "custos.0", "nome", "progressao.energia",
            "progressao.vida", "saude.energia", "saude.vida"]);
        leitor.destroy();
    });

    it("editar a Vida inicial grava dentro de saude e preserva a Energia", async () => {
        const { leitor, raiz, dadosSalvos } = await abrir();
        const campo = raiz.querySelector<HTMLElement>(`.oficina-texto[data-peca="${ID(2)}"][data-campo="saude.vida"]`)!;
        campo.textContent = "12";
        campo.dispatchEvent(new Event("input"));
        campo.dispatchEvent(new Event("blur"));
        await vi.waitFor(() => {
            const dados = dadosSalvos(2) as { saude: { vida: unknown; energia: unknown } };
            expect(dados.saude.vida).toEqual([{ tipo: "texto", texto: "12" }]);
            expect(dados.saude.energia).toEqual(texto("5"));
        });
        leitor.destroy();
    });

    it("a subclasse selecionada adiciona e remove custos, cada um com o próprio passo", async () => {
        const { leitor, selecionar, dadosSalvos, botao } = await abrir();
        expect(botao("Adicionar custo")).toBeUndefined();
        selecionar(5);
        botao("Adicionar custo")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(5) as { custos: unknown[] }).custos).toHaveLength(2));
        await leitor.whenStable();
        leitor.detectChanges();
        expect(botao("Remover custo 1")).not.toBeUndefined();
        botao("Remover custo 1")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(5) as { custos: unknown[] }).custos).toEqual([[]]));
        leitor.destroy();
    });
});
