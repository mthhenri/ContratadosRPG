import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { TipoRegraPecaEnum as T } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";

import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import type { LinhaSumario, ResultadoDoDestino } from "./oficina-estrutura";
import { OficinaSumario } from "./oficina-sumario.component";
import { OficinaStore } from "./oficina.store";

const linha = (id: number, tipo: T, rotulo: string, profundidade: number, pecaPaiId: number | null): LinhaSumario =>
    ({ id, identificador: `p-${id}`, tipo, rotulo, profundidade, pecaPaiId });

describe("OficinaSumario", () => {
    function montar(destino: ResultadoDoDestino = { ok: true, semMudanca: false, destino: { pecaPaiId: null, indice: 1, profundidade: 0 } }) {
        const linhas = signal<readonly LinhaSumario[]>([
            linha(1, T.SECAO, "Agentes", 0, null),
            linha(2, T.SECAO, "Combate", 1, 1),
            linha(3, T.CLASSE, "", 0, null),
        ]);
        const store = {
            linhasSumario: linhas,
            selecionada: signal<string | null>("p-2"),
            item: vi.fn((identificador: string) => ({ dados: { titulo: identificador === "p-1" ? "Agentes" : "Combate" } })),
            destinoDeTeclado: vi.fn<(identificador: string, tecla: string) => ResultadoDoDestino>(() => destino),
            moverPara: vi.fn().mockResolvedValue(true),
            renomear: vi.fn().mockResolvedValue(true),
            destinoDoArraste: vi.fn(),
        };
        const notificar = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                { provide: OficinaStore, useValue: store },
                { provide: NotificacaoService, useValue: { notificar } },
            ],
        });
        const fixture = TestBed.createComponent(OficinaSumario);
        fixture.detectChanges();
        const raiz = fixture.nativeElement as HTMLElement;
        const botoes = () => Array.from(raiz.querySelectorAll<HTMLButtonElement>(".oficina-sumario__nome"));
        return { fixture, raiz, store, notificar, botoes };
    }

    it("lista as peças do sumário com recuo por profundidade, a selecionada marcada e a sem nome sinalizada", () => {
        const { raiz, botoes } = montar();
        expect(botoes().map((botao) => botao.textContent?.replace(/\s+/g, ""))).toEqual([
            "⬡Agentes", "⬡Combate", "⬥semnome",
        ]);
        const linhas = Array.from(raiz.querySelectorAll<HTMLElement>(".oficina-sumario__linha"));
        expect(linhas[0].style.paddingLeft).toBe("8px");
        expect(linhas[1].style.paddingLeft).toBe("26px");
        expect(botoes()[1].getAttribute("aria-current")).toBe("location");
        expect(raiz.querySelectorAll(".oficina-sumario__alca")).toHaveLength(3);
    });

    it("clicar na linha pede ao leitor para ir até a peça", () => {
        const { fixture, botoes } = montar();
        const abertos: string[] = [];
        fixture.componentInstance.irPara.subscribe((identificador) => abertos.push(identificador));
        botoes()[0].click();
        expect(abertos).toEqual(["p-1"]);
    });

    it("Alt + seta pede o destino ao store e move quando ele vale", async () => {
        const { fixture, store, botoes } = montar();
        botoes()[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true, bubbles: true, cancelable: true }));
        await fixture.whenStable();
        expect(store.destinoDeTeclado).toHaveBeenCalledWith("p-2", "descer");
        expect(store.moverPara).toHaveBeenCalledWith("p-2", null, 1);
    });

    it("cada seta mapeia para um movimento e a seta sem Alt não faz nada", () => {
        const { store, botoes } = montar();
        const teclar = (key: string, altKey: boolean) =>
            botoes()[1].dispatchEvent(new KeyboardEvent("keydown", { key, altKey, bubbles: true, cancelable: true }));
        teclar("ArrowUp", true);
        teclar("ArrowLeft", true);
        teclar("ArrowRight", true);
        teclar("ArrowDown", false);
        expect(store.destinoDeTeclado.mock.calls.map((chamada) => chamada[1])).toEqual(["subir", "recuar", "avancar"]);
    });

    it("destino proibido avisa o motivo, não move e anuncia para quem usa leitor de tela", async () => {
        const { fixture, raiz, store, notificar, botoes } = montar({ ok: false, motivo: "Seção não pode ficar dentro de classe." });
        botoes()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true, bubbles: true, cancelable: true }));
        await fixture.whenStable();
        fixture.detectChanges();
        expect(store.moverPara).not.toHaveBeenCalled();
        expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ detalhe: "Seção não pode ficar dentro de classe." }));
        expect(raiz.querySelector(".oficina-sumario__anuncio")?.textContent).toContain("não pode ficar dentro de classe");
    });

    it("destino igual ao atual não chama a API", async () => {
        const { fixture, store, botoes } = montar({ ok: true, semMudanca: true, destino: { pecaPaiId: null, indice: 0, profundidade: 0 } });
        botoes()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true, bubbles: true, cancelable: true }));
        await fixture.whenStable();
        expect(store.moverPara).not.toHaveBeenCalled();
    });

    it("F2 abre o campo de nome; Enter renomeia, Esc cancela", async () => {
        const { fixture, raiz, store, botoes } = montar();
        botoes()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "F2", bubbles: true, cancelable: true }));
        fixture.detectChanges();
        let campo = raiz.querySelector<HTMLInputElement>(".oficina-sumario__campo")!;
        expect(campo.value).toBe("Agentes");
        campo.value = "Agentes de Campo";
        campo.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await fixture.whenStable();
        fixture.detectChanges();
        expect(store.renomear).toHaveBeenCalledWith("p-1", "Agentes de Campo");
        expect(raiz.querySelector(".oficina-sumario__campo")).toBeNull();

        botoes()[1].dispatchEvent(new KeyboardEvent("keydown", { key: "F2", bubbles: true, cancelable: true }));
        fixture.detectChanges();
        campo = raiz.querySelector<HTMLInputElement>(".oficina-sumario__campo")!;
        campo.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        fixture.detectChanges();
        expect(store.renomear).toHaveBeenCalledTimes(1);
        expect(raiz.querySelector(".oficina-sumario__campo")).toBeNull();
    });

    it("não renomeia quando o nome não mudou", async () => {
        const { fixture, raiz, store, botoes } = montar();
        botoes()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "F2", bubbles: true, cancelable: true }));
        fixture.detectChanges();
        raiz.querySelector<HTMLInputElement>(".oficina-sumario__campo")!
            .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await fixture.whenStable();
        expect(store.renomear).not.toHaveBeenCalled();
    });
});
