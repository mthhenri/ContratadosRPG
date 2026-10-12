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
    { ...peca(1, T.SECAO, null, 0, { titulo: "Tabelas", nivel: 1, glifo: null }), ancora: "tabelas" },
    peca(2, T.TABELA, 1, 0, { cabecalho: [texto("Nível"), texto("Bônus")], linhas: [[texto("1"), texto("+1")], [texto("2"), texto("+2")]] }),
    peca(3, T.GRADE, 1, 1, { apresentacao: "generica", colunas: 2, cabecalho: [], linhas: [[texto("A"), texto("B")], [texto("C"), texto("D")]] }),
    peca(4, T.GRADE, 1, 2, { apresentacao: "cartoes", colunas: 2, itens: [{ rotulo: "Curto", conteudo: texto("1m") }, { rotulo: "Médio", conteudo: texto("5m") }] }),
    peca(5, T.FAIXAS, 1, 3, { itens: [{ rotulo: "Normal", valor: "5m" }, { rotulo: "Lento", valor: "2m" }] }),
    peca(6, T.NIVEIS_AMEACA, 1, 4, { niveis: [{ nivel: 1, referenciaImagem: "", descricao: texto("Fraca.") }, { nivel: 2, referenciaImagem: "", descricao: texto("Média.") }] }),
];

describe("Oficina: tabela, grade, faixas e níveis (m11-08)", () => {
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

    it("tabela, grade, faixas e níveis expõem as células como campos editáveis", async () => {
        const { leitor, raiz } = await abrir();
        const campos = (n: number) => Array.from(raiz.querySelectorAll<HTMLElement>(`.oficina-texto[data-peca="${ID(n)}"]`))
            .map((campo) => campo.dataset["campo"]).sort();
        expect(campos(2)).toEqual(["cabecalho.0", "cabecalho.1", "linhas.0.0", "linhas.0.1", "linhas.1.0", "linhas.1.1"]);
        expect(campos(3)).toEqual(["linhas.0.0", "linhas.0.1", "linhas.1.0", "linhas.1.1"]);
        expect(campos(4)).toEqual(["itens.0.conteudo", "itens.0.rotulo", "itens.1.conteudo", "itens.1.rotulo"]);
        expect(campos(5)).toEqual(["itens.0.rotulo", "itens.0.valor", "itens.1.rotulo", "itens.1.valor"]);
        expect(campos(6)).toEqual(["niveis.0.descricao", "niveis.1.descricao"]);
        leitor.destroy();
    });

    it("a tabela selecionada adiciona e remove linhas e colunas, cada uma com o próprio passo", async () => {
        const { leitor, selecionar, dadosSalvos, botao } = await abrir();
        expect(botao("Adicionar linha")).toBeUndefined();
        selecionar(2);
        const passo = async (rotulo: string, verificar: (d: { cabecalho: unknown[]; linhas: unknown[][] }) => void) => {
            await leitor.whenStable();
            leitor.detectChanges();
            botao(rotulo)!.click();
            leitor.detectChanges();
            await vi.waitFor(() => verificar(dadosSalvos(2) as { cabecalho: unknown[]; linhas: unknown[][] }));
        };
        await passo("Adicionar linha", (d) => expect(d.linhas).toHaveLength(3));
        await passo("Adicionar coluna", (d) => { expect(d.cabecalho).toHaveLength(3); expect(d.linhas[0]).toHaveLength(3); });
        await passo("Remover a última coluna", (d) => { expect(d.cabecalho).toHaveLength(2); expect(d.linhas[2]).toHaveLength(2); });
        await passo("Remover linha 1", (d) => { expect(d.linhas).toHaveLength(2); expect(d.linhas[0]).toEqual([texto("2"), texto("+2")]); });
        leitor.destroy();
    });

    it("a grade genérica acompanha a largura em colunas e o cartão novo da referência é adicionado e removido", async () => {
        const { leitor, selecionar, dadosSalvos, botao } = await abrir();
        selecionar(3);
        botao("Adicionar coluna")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(3) as { colunas: number }).colunas).toBe(3));
        await leitor.whenStable();
        leitor.detectChanges();
        botao("Remover a última linha")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(3) as { linhas: unknown[] }).linhas).toHaveLength(1));
        selecionar(4);
        botao("Adicionar cartão")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(4) as { itens: unknown[] }).itens).toHaveLength(3));
        await leitor.whenStable();
        leitor.detectChanges();
        botao("Remover cartão 1")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(4) as { itens: { rotulo: string }[] }).itens.map((i) => i.rotulo)).toEqual(["Médio", ""]));
        leitor.destroy();
    });

    it("as faixas adicionam e removem itens", async () => {
        const { leitor, selecionar, dadosSalvos, botao } = await abrir();
        selecionar(5);
        botao("Adicionar faixa")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(5) as { itens: unknown[] }).itens).toHaveLength(3));
        await leitor.whenStable();
        leitor.detectChanges();
        botao("Remover faixa 1")!.click();
        leitor.detectChanges();
        await vi.waitFor(() => expect((dadosSalvos(5) as { itens: { rotulo: string }[] }).itens.map((i) => i.rotulo)).toEqual(["Lento", ""]));
        leitor.destroy();
    });

    it("o fim da seção oferece tabela, grade e faixas no menu", async () => {
        const { leitor, raiz, botao } = await abrir();
        botao("Inserir peça aqui")!.click();
        leitor.detectChanges();
        const opcoes = Array.from(raiz.querySelectorAll(".menu-insercao__rotulo")).map((e) => e.textContent?.trim());
        expect(opcoes).toEqual(expect.arrayContaining(["Tabela", "Grade", "Faixas"]));
        leitor.destroy();
    });
});
