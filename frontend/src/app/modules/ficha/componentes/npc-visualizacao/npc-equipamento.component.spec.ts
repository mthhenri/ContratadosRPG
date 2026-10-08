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
import { listarBibliotecaHabilidadesNpc } from "@contratados-rpg/shared/regras/npc";

function npc(alterar: Partial<FichaNpcRecuperadaDto["dados"]> = {}): FichaNpcRecuperadaDto {
    const ficha = criarFichaNpcTeste();
    return { ...ficha, dados: { ...ficha.dados, ...alterar } };
}

const PISTOLA = { nome: "Pistola", categoria: ItemCategoriaEnum.ARMAS_DE_FOGO, custo: 500, peso: 1,
    quantidade: 1, guardada: false, modificacoes: [] };
const COLETE = { nome: "Colete de Kevlar", categoria: ItemCategoriaEnum.PROTECOES, custo: 500,
    peso: 2, quantidade: 1, guardada: false, modificacoes: [] };

function botaoPorTexto(raiz: HTMLElement, texto: string): HTMLButtonElement | undefined {
    return Array.from(raiz.querySelectorAll<HTMLButtonElement>("button"))
        .find((botao) => botao.textContent?.trim().startsWith(texto));
}

describe("NpcEquipamento (m4-20, layout do Jogador na m4-21)", () => {
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
        return { fixture, edicao, api, formulario: TestBed.inject(NpcEdicaoFormulario),
            componente: fixture.componentInstance, raiz: fixture.nativeElement as HTMLElement };
    }

    it("sem inventário mostra o estado vazio", () => {
        const { raiz } = montar(false);
        expect(raiz.textContent).toContain("Nenhum equipamento");
    });

    it("não escolhe Patente na aba — só mostra o limite que ela dá", () => {
        const { raiz } = montar(true, npc({ categoria: CategoriaNpcEnum.VETERANO,
            patenteEquivalente: PatenteEnum.VETERANO }));
        expect(raiz.querySelector('[aria-label^="Patente equivalente"]')).toBeNull();
        expect(raiz.querySelector(".npc-equip__limite")?.textContent)
            .toContain("até 9 modificações por item");
    });

    it("\"+ Adicionar itens\" abre o bloco e o catálogo; Civil não vê Proteções/Explosivos", () => {
        const { raiz, formulario, fixture } =
            montar(true, npc({ categoria: CategoriaNpcEnum.CIVIL }));
        botaoPorTexto(raiz, "+ Adicionar itens")!.click(); fixture.detectChanges();
        expect(formulario.grupo()).toBe("equipamento");
        const categorias = Array.from(raiz.querySelectorAll(".npc-equip__categorias button"))
            .map((botao) => botao.textContent?.trim());
        expect(categorias.length).toBeGreaterThan(0);
        expect(categorias.some((rotulo) => rotulo?.includes("Proteções"))).toBe(false);
        expect(categorias.some((rotulo) => rotulo?.includes("Explosivos"))).toBe(false);
    });

    it("adicionar do catálogo entra no rascunho; remover pede confirmação no lugar", () => {
        const { raiz, formulario, fixture } = montar(true);
        botaoPorTexto(raiz, "+ Adicionar itens")!.click(); fixture.detectChanges();
        raiz.querySelector<HTMLButtonElement>(".npc-equip__cartao-adicionar")!.click();
        fixture.detectChanges();
        expect(formulario.formulario.controls.inventario.value).toHaveLength(1);
        expect(raiz.querySelectorAll(".npc-equip__item")).toHaveLength(1);
        raiz.querySelector<HTMLButtonElement>('[aria-label^="Remover item"]')!.click();
        fixture.detectChanges();
        expect(raiz.textContent).toContain("Remover item?");
        raiz.querySelector<HTMLButtonElement>('[aria-label="Confirmar remoção"]')!.click();
        fixture.detectChanges();
        expect(formulario.formulario.controls.inventario.value).toHaveLength(0);
    });

    it("fora do bloco, equipar Proteção salva só esse campo na hora", async () => {
        const habilidades = listarBibliotecaHabilidadesNpc({ categoria: CategoriaNpcEnum.VETERANO })
            .slice(0, 3).map(({ habilidade }) => habilidade);
        const { raiz, api, fixture } = montar(true,
            npc({ categoria: CategoriaNpcEnum.VETERANO, inventario: [COLETE], habilidades }));
        raiz.querySelector<HTMLButtonElement>('[aria-label="Na mochila — Colete de Kevlar: alternar"]')!
            .click();
        await fixture.whenStable();
        expect(api.alterarFichaNpc).toHaveBeenCalledTimes(1);
        expect(api.alterarFichaNpc.mock.calls[0][1].dados.inventario[0].equipado).toBe(true);
    });

    it("no bloco, equipar Proteção entra no rascunho", () => {
        const { raiz, formulario, fixture, api } = montar(true,
            npc({ categoria: CategoriaNpcEnum.VETERANO, inventario: [COLETE] }));
        formulario.iniciar("equipamento"); fixture.detectChanges();
        raiz.querySelector<HTMLButtonElement>('[aria-label="Na mochila — Colete de Kevlar: alternar"]')!
            .click();
        fixture.detectChanges();
        expect(formulario.formulario.controls.inventario.value![0].equipado).toBe(true);
        expect(api.alterarFichaNpc).not.toHaveBeenCalled();
    });

    it("leitor não vê controles de edição nem rolagens", () => {
        const { raiz } = montar(false,
            npc({ categoria: CategoriaNpcEnum.VETERANO, inventario: [PISTOLA, COLETE] }));
        expect(raiz.querySelector('[aria-label="Editar equipamento"]')).toBeNull();
        expect(botaoPorTexto(raiz, "+ Adicionar itens")).toBeUndefined();
        expect(raiz.querySelector('[aria-label^="Rolar"]')).toBeNull();
        expect(raiz.querySelector('[aria-label$=": alternar"]')).toBeNull();
        expect(raiz.textContent).toContain("Pistola");
        expect(raiz.textContent).toContain("Na mochila");
    });

    it("dano com faixa narrativa fica explícito sem botão inerte de rolagem", () => {
        const { raiz } = montar(true, npc({ inventario: [{ nome: "Acessório de Combate",
            categoria: ItemCategoriaEnum.CORPO_A_CORPO, custo: 250, peso: 0.5,
            quantidade: 1, guardada: false, modificacoes: [] }] }));
        expect(raiz.textContent).toContain("Dano com escolha manual da fórmula");
        expect(raiz.querySelector('[aria-label^="Rolar dano"]')).toBeNull();
    });

    it("sem patente não oferece Modificar", () => {
        const { raiz, formulario, fixture } = montar(true,
            npc({ categoria: CategoriaNpcEnum.VETERANO, inventario: [PISTOLA] }));
        formulario.iniciar("equipamento"); fixture.detectChanges();
        expect(raiz.querySelector('[aria-label="Modificar Pistola"]')).toBeNull();
        expect(raiz.querySelector(".npc-equip__limite")?.textContent)
            .toContain("defina na Identidade");
    });

    it("com patente abre o painel e adiciona; Salvar não regrava a Patente", () => {
        const { raiz, formulario, fixture, edicao } = montar(true, npc({
            categoria: CategoriaNpcEnum.VETERANO, inventario: [PISTOLA],
            patenteEquivalente: PatenteEnum.VETERANO }));
        formulario.iniciar("equipamento"); fixture.detectChanges();
        raiz.querySelector<HTMLButtonElement>('[aria-label="Modificar Pistola"]')!.click();
        fixture.detectChanges();
        raiz.querySelector<HTMLButtonElement>('[aria-label^="Adicionar modificação"]')!.click();
        fixture.detectChanges();
        expect(formulario.formulario.controls.inventario.value![0].modificacoes).toHaveLength(1);
        // Outro dispositivo troca a Patente na Identidade durante a edição do bloco.
        const remoto = edicao.ficha()!;
        edicao.absorverRemoto({ ...remoto, dados: { ...remoto.dados,
            patenteEquivalente: PatenteEnum.EXPERIENTE } });
        expect(edicao.rascunho()?.dados.patenteEquivalente).toBe(PatenteEnum.EXPERIENTE);
    });

    it("chamada direta do leitor não muda inventário", () => {
        const { componente, formulario } = montar(false);
        componente.ajustarQuantidade(0, 3);
        expect(formulario.formulario.controls.inventario.value).toEqual([]);
    });
});
