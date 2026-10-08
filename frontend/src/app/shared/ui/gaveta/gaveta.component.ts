import { DOCUMENT } from "@angular/common";
import {
    ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
    afterRenderEffect, inject, input, model, viewChild,
} from "@angular/core";

import { BotaoIcone } from "../botao-icone/botao-icone.component";

const SELETOR_FOCAVEL =
    "a[href], button, input, select, textarea, [tabindex], [contenteditable='true']";

/**
 * Gaveta sobre o ancestral posicionado: o consumidor define a área de contenção.
 * Não usa top layer nem bloqueia a página inteira; mantém o texto visível sob o véu.
 * O model controla todas as vias de fechamento e preserva o conteúdo projetado.
 */
@Component({
    selector: "app-gaveta",
    imports: [BotaoIcone],
    templateUrl: "./gaveta.component.html",
    styleUrl: "./gaveta.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        "[class.gaveta--aberta]": "aberta()",
        "[class.gaveta--fim]": "lado() === 'fim'",
    },
})
export class Gaveta {
    readonly aberta = model(false);
    readonly lado = input<"inicio" | "fim">("inicio");
    readonly rotulo = input.required<string>();

    private readonly documento = inject(DOCUMENT);
    private readonly painel = viewChild.required<ElementRef<HTMLElement>>("painel");
    private origemFoco: HTMLElement | null = null;
    private estavaAberta = false;

    constructor() {
        // Focar antes de aplicar classe/inert falha no browser, embora passe em jsdom.
        afterRenderEffect(() => {
            const aberta = this.aberta();
            const painel = this.painel().nativeElement;
            if (aberta && !this.estavaAberta) {
                this.origemFoco = this.documento.activeElement as HTMLElement | null;
                painel.focus();
            } else if (!aberta && this.estavaAberta) {
                this.restaurarFoco();
            }
            this.estavaAberta = aberta;
        });
        inject(DestroyRef).onDestroy(() => this.restaurarFoco());
    }

    protected fechar(): void {
        this.aberta.set(false);
    }

    /** Impede que Escape/Tab sejam tratados também pela janela flutuante hospedeira. */
    protected tratarTeclado(evento: KeyboardEvent): void {
        if (!this.aberta()) return;
        if (evento.key === "Escape") {
            evento.preventDefault();
            evento.stopPropagation();
            this.fechar();
            return;
        }
        if (evento.key !== "Tab") return;
        evento.stopPropagation();
        const painel = this.painel().nativeElement;
        const controles = Array.from(painel.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL))
            .filter((elemento) => {
                if (elemento.tabIndex < 0 || elemento.matches(":disabled")) return false;
                if (elemento.closest("[hidden], [inert], [aria-hidden='true']")) return false;
                // Sem depender de layout (jsdom): inclui a visibilidade dos ancestrais.
                for (let ancestral: HTMLElement | null = elemento;
                    ancestral && ancestral !== painel; ancestral = ancestral.parentElement) {
                    const estilo = this.documento.defaultView?.getComputedStyle(ancestral);
                    if (estilo?.display === "none" || estilo?.visibility === "hidden") return false;
                }
                return true;
            });
        const primeiro = controles[0];
        const ultimo = controles[controles.length - 1];
        const ativo = this.documento.activeElement;
        if (!primeiro || !ultimo) {
            evento.preventDefault();
            painel.focus();
        } else if (ativo === painel || !painel.contains(ativo)) {
            evento.preventDefault();
            (evento.shiftKey ? ultimo : primeiro).focus();
        } else if (evento.shiftKey && ativo === primeiro) {
            evento.preventDefault();
            ultimo.focus();
        } else if (!evento.shiftKey && ativo === ultimo) {
            evento.preventDefault();
            primeiro.focus();
        }
    }

    private restaurarFoco(): void {
        if (this.origemFoco?.isConnected) this.origemFoco.focus();
        this.origemFoco = null;
    }
}
