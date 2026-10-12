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
    { ...peca(1, T.SECAO, null, 0, { titulo: "Origens", nivel: 1, glifo: null }), ancora: "origens" },
    peca(2, T.ORIGENS, 1, 0, { cabecalho: [], linhas: [] }),
    peca(3, T.ORIGEM, 2, 0, { nome: "Militar", citacao: texto("Disciplina."), formacao: texto("Exército"),
        especialidade: texto("Armas"), saberCampo: texto("Tática") }),
    peca(4, T.TERMOS, 1, 1, { variante: "penalidades" }),
    peca(5, T.TERMO, 4, 0, { nome: "Lento", numero: -1, descricao: texto("Move menos.") }),
    peca(6, T.TERMO, 4, 1, { nome: "Cego", descricao: texto("Não vê.") }),
];

describe("Oficina: origem e termos (m11-08)", () => {
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

    it("origem e termo expõem todos os campos como editáveis", async () => {
        const { leitor, raiz, selecionar } = await abrir();
        const campos = (n: number) => Array.from(raiz.querySelectorAll<HTMLElement>(`.oficina-texto[data-peca="${ID(n)}"]`))
            .map((campo) => campo.dataset["campo"]).sort();
        expect(campos(3)).toEqual(["citacao", "especialidade", "formacao", "nome", "saberCampo"]);
        expect(campos(5)).toEqual(["descricao", "nome"]);
        selecionar(5);
        expect(campos(5)).toEqual(["descricao", "nome", "rotulo"]);
        leitor.destroy();
    });

    it("o termo selecionado adiciona, ajusta e remove o número, e o rótulo vazio some do dados", async () => {
        const { leitor, selecionar, dadosSalvos, botao } = await abrir();
        selecionar(6);
        botao("Adicionar número")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(6) as { numero?: number }).numero).toBe(0));
        await leitor.whenStable();
        leitor.detectChanges();
        botao("Remover número")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect("numero" in (dadosSalvos(6) as object)).toBe(false));
        leitor.destroy();
    });

    it("o fim de cada container oferece só o item dele", async () => {
        const { leitor, raiz, botao } = await abrir();
        botao("Inserir origem")!.click();
        leitor.detectChanges();
        const opcoes = () => Array.from(raiz.querySelectorAll(".menu-insercao__rotulo")).map((e) => e.textContent?.trim());
        expect(opcoes()).toEqual(["Origem"]);
        leitor.destroy();
    });
});
