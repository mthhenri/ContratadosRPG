import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { Gaveta } from "./gaveta.component";

@Component({
    imports: [Gaveta],
    template: `
        <button class="gatilho" (click)="aberta.set(true)">Abrir</button>
        <app-gaveta [(aberta)]="aberta" [lado]="lado()" rotulo="Sumário">
            <button class="primeiro">Introdução</button>
            <button class="ultimo">Equipamentos</button>
            <button hidden>Oculto</button>
            <button disabled>Desabilitado</button>
        </app-gaveta>
    `,
})
class Hospedeiro {
    readonly aberta = signal(false);
    readonly lado = signal<"inicio" | "fim">("inicio");
}

describe("Gaveta", () => {
    function montar() {
        TestBed.configureTestingModule({ imports: [Hospedeiro] });
        const fixture = TestBed.createComponent(Hospedeiro);
        fixture.detectChanges();
        const raiz = fixture.nativeElement as HTMLElement;
        const gatilho = raiz.querySelector<HTMLButtonElement>(".gatilho")!;
        const painel = raiz.querySelector<HTMLElement>("[role=dialog]")!;
        const abrir = () => {
            gatilho.focus();
            gatilho.click();
            fixture.detectChanges();
        };
        return { fixture, raiz, gatilho, painel, abrir };
    }

    it("projeta conteúdo e mantém a gaveta fechada inerte e fora da leitura", () => {
        const { painel, raiz } = montar();
        expect(painel.getAttribute("aria-label")).toBe("Sumário");
        expect(painel.getAttribute("aria-modal")).toBe("false");
        expect(painel.hasAttribute("inert")).toBe(true);
        expect(painel.getAttribute("aria-hidden")).toBe("true");
        expect(raiz.querySelector(".ultimo")?.textContent).toBe("Equipamentos");
    });

    it("abre pelo model, foca a região e devolve foco ao fechar pelo consumidor", () => {
        const { fixture, painel, gatilho, abrir } = montar();
        abrir();
        expect(painel.hasAttribute("inert")).toBe(false);
        expect(document.activeElement).toBe(painel);
        fixture.componentInstance.aberta.set(false);
        fixture.detectChanges();
        expect(document.activeElement).toBe(gatilho);
    });

    it.each(["escape", "veu", "botao"])("fecha por %s e altera o model", (via) => {
        const { fixture, raiz, painel, gatilho, abrir } = montar();
        abrir();
        if (via === "escape") {
            const evento = new KeyboardEvent("keydown", {
                key: "Escape", bubbles: true, cancelable: true,
            });
            painel.dispatchEvent(evento);
            expect(evento.defaultPrevented).toBe(true);
        } else {
            const seletor = via === "veu" ? ".gaveta__veu" : "[aria-label='Fechar Sumário']";
            raiz.querySelector<HTMLElement>(seletor)!.click();
        }
        fixture.detectChanges();
        expect(fixture.componentInstance.aberta()).toBe(false);
        expect(document.activeElement).toBe(gatilho);
    });

    it("circula Tab nos controles visíveis e consome o evento antes do painel pai", () => {
        const { raiz, painel, abrir } = montar();
        abrir();
        const fechar = raiz.querySelector<HTMLElement>("[aria-label='Fechar Sumário']")!;
        const ultimo = raiz.querySelector<HTMLElement>(".ultimo")!;
        const teclado = (shiftKey = false) => {
            const evento = new KeyboardEvent("keydown", {
                key: "Tab", shiftKey, bubbles: true, cancelable: true,
            });
            document.activeElement!.dispatchEvent(evento);
            return evento;
        };
        expect(teclado().defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(fechar);
        expect(teclado(true).defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(ultimo);
        expect(teclado().defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(fechar);
        painel.focus();
        teclado(true);
        expect(document.activeElement).toBe(ultimo);
    });

    it("troca de borda sem perder o conteúdo nem fechar", () => {
        const { fixture, raiz, abrir } = montar();
        abrir();
        fixture.componentInstance.lado.set("fim");
        fixture.detectChanges();
        expect(raiz.querySelector(".gaveta--fim")).not.toBeNull();
        expect(fixture.componentInstance.aberta()).toBe(true);
    });

    it("restaura o gatilho se a gaveta aberta for destruída", () => {
        const { fixture } = montar();
        const externo = document.createElement("button");
        document.body.append(externo);
        externo.focus();
        fixture.componentInstance.aberta.set(true);
        fixture.detectChanges();
        fixture.destroy();
        expect(document.activeElement).toBe(externo);
        externo.remove();
    });
});
