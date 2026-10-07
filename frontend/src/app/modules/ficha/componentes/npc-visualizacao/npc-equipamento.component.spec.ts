import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { CategoriaNpcEnum, ItemCategoriaEnum, PatenteEnum } from "@contratados-rpg/shared/enums";
import type { FichaNpcRecuperadaDto } from "@contratados-rpg/shared/dtos/ficha";
import { FichaService } from "../../ficha.service";
import { FichaEdicaoNpcService } from "../../ficha-edicao-npc.service";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { criarFichaNpcTeste } from "../../testing/ficha-npc.fixture";
import { NpcEquipamento } from "./npc-equipamento.component";
import { NpcRolagemService } from "../../npc-rolagem.service";

function npc(alterar: Partial<FichaNpcRecuperadaDto["dados"]> = {}): FichaNpcRecuperadaDto {
    const ficha = criarFichaNpcTeste();
    return { ...ficha, dados: { ...ficha.dados, ...alterar } };
}

describe("NpcEquipamento (m4-20)", () => {
    function montar(gerenciavel: boolean, ficha = npc({ categoria: CategoriaNpcEnum.VETERANO })) {
        const api = { alterarFichaNpc: vi.fn((_id, alteracao) => of({ ...ficha, ...alteracao })) };
        TestBed.configureTestingModule({ imports: [NpcEquipamento], providers: [
            FichaEdicaoNpcService, NpcEdicaoFormulario,
            { provide: FichaService, useValue: api },
            { provide: NpcRolagemService, useValue: { rolar: vi.fn(), rolarDano: vi.fn() } },
        ] });
        const edicao = TestBed.inject(FichaEdicaoNpcService);
        edicao.definirFicha(ficha);
        const fixture = TestBed.createComponent(NpcEquipamento);
        fixture.componentRef.setInput("gerenciavel", gerenciavel); fixture.detectChanges();
        return { fixture, edicao, formulario: TestBed.inject(NpcEdicaoFormulario),
            componente: fixture.componentInstance, raiz: fixture.nativeElement as HTMLElement };
    }

    it("sem inventário mostra o estado vazio", () => {
        const { raiz } = montar(false);
        expect(raiz.textContent).toContain("Nenhum equipamento");
    });

    it("Civil não vê chips de patente nem Proteções/Explosivos no catálogo", () => {
        const { raiz, formulario, fixture } =
            montar(true, npc({ categoria: CategoriaNpcEnum.CIVIL }));
        formulario.iniciar("equipamento"); fixture.detectChanges();
        expect(raiz.textContent).toContain("Categoria Civil não tem Patente Equivalente");
        const catalogo = raiz.querySelector<HTMLButtonElement>(".npc-equip__catalogo-gatilho")!;
        catalogo.click(); fixture.detectChanges();
        const categorias = Array.from(raiz.querySelectorAll(".npc-equip__categoria"))
            .map((botao) => botao.textContent?.trim());
        expect(categorias.some((rotulo) => rotulo?.includes("Proteções"))).toBe(false);
        expect(categorias.some((rotulo) => rotulo?.includes("Explosivos"))).toBe(false);
    });

    it("Veterano vê a faixa de patente correta e seleciona uma", () => {
        const { raiz, formulario, fixture } = montar(true);
        formulario.iniciar("equipamento"); fixture.detectChanges();
        const botoes = Array.from(raiz.querySelectorAll<HTMLButtonElement>(
            ".npc-equip__patente-opcoes button"));
        expect(botoes.map((botao) => botao.textContent?.trim())).toEqual(
            ["Experiente", "Veterano"]);
        botoes[1].click(); fixture.detectChanges();
        expect(formulario.formulario.controls.patenteEquivalente.value).toBe(PatenteEnum.VETERANO);
        botoes[1].click(); fixture.detectChanges();
        expect(formulario.formulario.controls.patenteEquivalente.value).toBeNull();
    });

    it("adicionar item do catálogo entra no inventário e some ao remover", () => {
        const { raiz, formulario, fixture } = montar(true);
        formulario.iniciar("equipamento"); fixture.detectChanges();
        raiz.querySelector<HTMLButtonElement>(".npc-equip__catalogo-gatilho")!.click();
        fixture.detectChanges();
        const adicionar = raiz.querySelector<HTMLButtonElement>(".npc-equip__cartao-add")!;
        adicionar.click(); fixture.detectChanges();
        expect(formulario.formulario.controls.inventario.value).toHaveLength(1);
        expect(raiz.querySelectorAll(".npc-equip__item app-cartao")).toHaveLength(1);
        raiz.querySelector<HTMLButtonElement>('[aria-label^="Remover"]')!.click();
        fixture.detectChanges();
        expect(formulario.formulario.controls.inventario.value).toHaveLength(0);
    });

    it("só Proteções equipadas mostram o alternador Equipado/Na mochila", () => {
        const protecao = { nome: "Colete de Kevlar", categoria: ItemCategoriaEnum.PROTECOES,
            custo: 500, peso: 2, quantidade: 1, guardada: false, modificacoes: [] };
        const { raiz, formulario, fixture } = montar(true,
            npc({ categoria: CategoriaNpcEnum.VETERANO, inventario: [protecao] }));
        formulario.iniciar("equipamento"); fixture.detectChanges();
        const alternar = raiz.querySelector<HTMLButtonElement>('[aria-label="Na mochila — alternar"]');
        expect(alternar).not.toBeNull();
        alternar!.click(); fixture.detectChanges();
        expect(formulario.formulario.controls.inventario.value![0].equipado).toBe(true);
    });

    it("leitor não vê controles de edição", () => {
        const protecao = { nome: "Pistola", categoria: ItemCategoriaEnum.ARMAS_DE_FOGO,
            custo: 500, peso: 2, quantidade: 1, guardada: false, modificacoes: [] };
        const { raiz } = montar(false,
            npc({ categoria: CategoriaNpcEnum.VETERANO, inventario: [protecao] }));
        expect(raiz.querySelector(".npc-equip__controles")).toBeNull();
        expect(raiz.querySelector('[aria-label="Editar equipamento"]')).toBeNull();
        expect(raiz.textContent).toContain("Pistola");
    });

    it("dano com faixa narrativa fica explícito sem botão inerte de rolagem", () => {
        const { raiz } = montar(true, npc({ inventario: [{ nome: "Acessório de Combate",
            categoria: ItemCategoriaEnum.CORPO_A_CORPO, custo: 250, peso: 0.5,
            quantidade: 1, guardada: false, modificacoes: [] }] }));
        expect(raiz.textContent).toContain("Este dano exige escolha manual da fórmula");
        expect(Array.from(raiz.querySelectorAll("button"))
            .some((botao) => botao.textContent?.trim() === "Dano")).toBe(false);
    });

    it("sem patente selecionada não oferece adicionar modificações", () => {
        const { raiz, formulario, fixture } = montar(true, npc({ categoria: CategoriaNpcEnum.VETERANO,
            inventario: [{ nome: "Pistola",
            categoria: ItemCategoriaEnum.ARMAS_DE_FOGO, custo: 500, peso: 1,
            quantidade: 1, guardada: false, modificacoes: [] }] }));
        formulario.iniciar("equipamento"); fixture.detectChanges();
        expect(raiz.querySelector(".npc-equip__mod-select")).toBeNull();
        formulario.formulario.controls.patenteEquivalente.setValue(PatenteEnum.VETERANO);
        fixture.detectChanges();
        expect(raiz.querySelector(".npc-equip__mod-select")).not.toBeNull();
    });

    it("opção vazia de modificação não altera nem lança erro", () => {
        const { componente, formulario } = montar(true);
        formulario.iniciar("equipamento");
        expect(() => componente.selecionarModificacao(0)).not.toThrow();
        expect(formulario.formulario.controls.inventario.value).toEqual([]);
    });

    it("chamada direta do leitor não muda inventário", () => {
        const { componente, formulario } = montar(false);
        componente.ajustarQuantidade(0, 3);
        expect(formulario.formulario.controls.inventario.value).toEqual([]);
    });
});
