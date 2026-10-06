import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { CategoriaNpcEnum } from "@contratados-rpg/shared/enums";
import type { FichaNpcRecuperadaDto } from "@contratados-rpg/shared/dtos/ficha";
import { TemaService } from "../../../../core/services/tema.service";
import { FichaService } from "../../ficha.service";
import { FichaEdicaoNpcService } from "../../ficha-edicao-npc.service";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { criarFichaNpcTeste } from "../../testing/ficha-npc.fixture";
import { NpcIdentidade } from "./npc-identidade.component";

const aguardarMicrotarefas = () => new Promise((resolve) => setTimeout(resolve));

function npc(alterar: Partial<FichaNpcRecuperadaDto["dados"]> = {}): FichaNpcRecuperadaDto {
    const ficha = criarFichaNpcTeste();
    return { ...ficha, dados: { ...ficha.dados, ...alterar } };
}

const elite = () => npc({ categoria: CategoriaNpcEnum.ELITE,
    energia: { maxima: 27, atual: 20, recargaPorTurno: 3 } });

describe("NpcIdentidade (m4-17)", () => {
    function montar(gerenciavel: boolean, ficha = criarFichaNpcTeste(), falhar = false) {
        const api = { alterarFichaNpc: vi.fn((_id, alteracao) => falhar
            ? throwError(() => new Error("rede")) : of({ ...ficha, ...alteracao })) };
        TestBed.configureTestingModule({ imports: [NpcIdentidade], providers: [
            FichaEdicaoNpcService, NpcEdicaoFormulario,
            { provide: FichaService, useValue: api },
            { provide: TemaService, useValue: { accentEfetivo: () => "var(--accent)" } },
        ] });
        const edicao = TestBed.inject(FichaEdicaoNpcService);
        edicao.definirFicha(ficha);
        const fixture = TestBed.createComponent(NpcIdentidade);
        fixture.componentRef.setInput("gerenciavel", gerenciavel); fixture.detectChanges();
        return { fixture, edicao, api, componente: fixture.componentInstance,
            formulario: TestBed.inject(NpcEdicaoFormulario),
            raiz: fixture.nativeElement as HTMLElement };
    }

    const barrasRecurso = (raiz: HTMLElement) =>
        Array.from(raiz.querySelectorAll<HTMLElement>("app-barra-recurso .barra-recurso"));

    it("Vida e Energia usam a barra de recurso compacta", () => {
        const { raiz } = montar(false, elite());
        const barras = barrasRecurso(raiz);
        expect(barras).toHaveLength(2);
        for (const barra of barras) {
            expect(barra.classList.contains("barra-recurso--compacta")).toBe(true);
        }
    });

    it("Pool + Recarga e Reserva Fixa viram chip ao lado do rótulo da Energia", () => {
        const { raiz, edicao, fixture } = montar(false, elite());
        const chip = () => raiz.querySelector(
            "app-barra-recurso .barra-recurso__rotulo-linha app-chip")?.textContent?.trim()
            .replace(/\s+/g, " ");
        expect(chip()).toBe("Pool · Recarga 3/turno");
        edicao.definirFicha(npc({ categoria: CategoriaNpcEnum.VETERANO,
            energia: { maxima: 21, atual: 21, recargaPorTurno: null } }));
        fixture.detectChanges();
        expect(chip()).toBe("Reserva Fixa");
    });

    it("mestre edita a recarga dentro do chip, alterando só aquele campo", () => {
        const { raiz, fixture, formulario } = montar(true, elite());
        const confirmar = vi.spyOn(formulario, "confirmarAvulso").mockResolvedValue();
        formulario.editarAvulso("recargaPorTurno"); fixture.detectChanges();
        const entrada = raiz.querySelector<HTMLInputElement>(
            'app-chip input[aria-label="Recarga por turno"]')!;
        entrada.value = "5";
        entrada.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
        expect(confirmar).toHaveBeenCalledWith("recargaPorTurno", expect.any(Function));
        const mutar = confirmar.mock.calls[0][1];
        const base = elite();
        expect(mutar(base).dados).toEqual({ ...base.dados,
            energia: { ...base.dados.energia, recargaPorTurno: 5 } });
    });

    it("Civil não tem barra de Energia: chip \"Sem Energia\" no lugar", () => {
        const { raiz } = montar(false);
        expect(barrasRecurso(raiz)).toHaveLength(1);
        const chips = Array.from(raiz.querySelectorAll(".npc-identidade__combate app-chip"))
            .map((chip) => chip.textContent?.trim());
        expect(chips).toContain("Sem Energia");
    });

    it("Defesa/Bloquear/Esquivar e Categoria/Nível são app-stat fino", () => {
        const { raiz } = montar(false);
        const ladrilhos = Array.from(raiz.querySelectorAll<HTMLElement>(
            ".npc-identidade__combate app-stat .stat"));
        expect(ladrilhos.map((ladrilho) =>
            ladrilho.querySelector(".stat__rotulo")?.textContent?.trim()))
            .toEqual(["Categoria", "Nível", "Defesa", "Bloquear", "Esquivar"]);
        for (const ladrilho of ladrilhos) expect(ladrilho.classList).toContain("stat--fino");
        expect(ladrilhos.map((ladrilho) =>
            ladrilho.querySelector(".stat__valor")?.textContent?.trim()))
            .toEqual(["Civil", "3", "18", "23", "21"]);
    });

    it("mestre edita o ladrilho fino no lugar (valor avulso dentro do app-stat)", async () => {
        const { raiz, fixture, api } = montar(true);
        const botao = raiz.querySelector<HTMLButtonElement>(
            'app-stat button[aria-label="Editar bloquear"]')!;
        botao.click(); fixture.detectChanges();
        const entrada = raiz.querySelector<HTMLInputElement>(
            'app-stat .stat__valor input[aria-label="Bloquear"]')!;
        entrada.value = "30";
        entrada.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
        await aguardarMicrotarefas();
        expect(api.alterarFichaNpc.mock.calls[0][1].dados.bloquear).toBe(30);
    });

    it("sem o ladrilho e os subcabeçalhos antigos de Recursos/Cooperação", () => {
        const { raiz } = montar(true);
        expect(raiz.querySelector(".npc__subcabecalho, .npc__stat, .npc__cooperacao")).toBeNull();
        expect(raiz.querySelector('[aria-label="Editar cooperação"]')).toBeNull();
        expect(raiz.textContent).not.toContain("Recursos");
        expect(raiz.textContent).not.toContain("Confirma ou nega");
    });

    describe("Cooperação como barra de escala", () => {
        const medidor = (raiz: HTMLElement) =>
            raiz.querySelector<HTMLElement>('[role="meter"][aria-label="Cooperação"]')!;

        it.each([
            [0, "0%", "Hostil"],
            [1, "10%", "Evasivo"],
            [2, "20%", "Desconfiado"],
            [4, "40%", "Neutro"],
            [7, "70%", "Colaborativo"],
            [10, "100%", "Amigável"],
        ])("%s fica em %s com a faixa %s", (cooperacao, posicao, faixa) => {
            const { raiz } = montar(false, npc({ cooperacao }));
            expect(raiz.querySelector<HTMLElement>(".barra-escala__cursor")!.style.left)
                .toBe(posicao);
            expect(raiz.querySelector(".barra-escala__texto")?.textContent?.trim()).toBe(faixa);
            expect(medidor(raiz).getAttribute("aria-valuenow")).toBe(String(cooperacao));
        });

        it("aria-valuetext traz número, faixa e as frases social e de combate", () => {
            const { raiz } = montar(false, npc({ cooperacao: 5 }));
            expect(medidor(raiz).getAttribute("aria-valuetext")).toBe(
                "5 de 10 — Neutro — Confirma ou nega; fornece informações gerais. "
                + "Não inicia combate; reage se atacado ou ameaçado.");
        });

        it("ticks marcam os limites de faixa 1/2/4/7", () => {
            const { raiz } = montar(false);
            expect(Array.from(raiz.querySelectorAll<HTMLElement>(".barra-escala__tick"))
                .map((tick) => tick.style.left)).toEqual(["10%", "20%", "40%", "70%"]);
        });

        it("valor fora do contrato mantém o fallback \"Valor inválido\" sem quebrar", () => {
            const { raiz } = montar(false, npc({ cooperacao: 15 }));
            expect(raiz.querySelector(".barra-escala__texto")?.textContent?.trim())
                .toBe("Valor inválido");
            expect(raiz.querySelector(".barra-escala__numero")?.textContent?.trim()).toBe("15");
        });

        it("fica sob o retrato, no perfil", () => {
            const { raiz } = montar(false);
            const perfil = raiz.querySelector(".npc-identidade__perfil")!;
            const filhos = Array.from(perfil.children);
            const avatar = filhos.findIndex((filho) =>
                filho.classList.contains("npc-identidade__avatar"));
            expect(filhos[avatar + 1].tagName).toBe("APP-BARRA-ESCALA");
        });

        it("mestre: soltar o slider persiste só a Cooperação, num único PUT", async () => {
            const { raiz, api, formulario } = montar(true);
            const slider = raiz.querySelector<HTMLInputElement>('input[type="range"]')!;
            for (const valor of [6, 7, 8]) {
                slider.value = String(valor); slider.dispatchEvent(new Event("input"));
            }
            slider.dispatchEvent(new Event("pointerup"));
            slider.dispatchEvent(new Event("blur"));
            await aguardarMicrotarefas();
            expect(api.alterarFichaNpc).toHaveBeenCalledTimes(1);
            const enviado = api.alterarFichaNpc.mock.calls[0][1];
            const base = criarFichaNpcTeste();
            expect(enviado.dados).toEqual({ ...base.dados, cooperacao: 8 });
            expect(formulario.ocupado()).toBe(false);
        });

        it("com outra edição aberta, a barra fica desabilitada", () => {
            const { raiz, fixture, formulario } = montar(true);
            formulario.editarAvulso("nivel"); fixture.detectChanges();
            expect(raiz.querySelector<HTMLInputElement>('input[type="range"]')!.disabled)
                .toBe(true);
        });

        it("falha ao salvar libera a trava e mostra o erro sob a barra", async () => {
            const { raiz, fixture, formulario } = montar(true, criarFichaNpcTeste(), true);
            const slider = raiz.querySelector<HTMLInputElement>('input[type="range"]')!;
            slider.value = "9"; slider.dispatchEvent(new Event("input"));
            slider.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
            await aguardarMicrotarefas(); fixture.detectChanges();
            expect(formulario.ocupado()).toBe(false);
            expect(raiz.querySelector(".npc-identidade__perfil .npc-identidade__erro"))
                .not.toBeNull();
            expect(raiz.querySelector(".barra-escala__numero")?.textContent?.trim()).toBe("5");
        });
    });
});
