import { Component, input } from "@angular/core";

/**
 * Quadro de destaque de conteúdo do exemplão M10, da mesma família do `regras-nota`:
 * `inicial` (dourado) para a habilidade inicial e `custo` (roxo) para o custo do Experimento.
 */
@Component({
    selector: "app-regras-destaque",
    template: `
        <div [class]="'regras-destaque regras-destaque--' + variante()">
            <span class="regras-destaque__rotulo">{{ rotulo() }}</span>
            <ng-content />
        </div>
    `,
    styleUrl: "./regras-destaque.component.scss",
})
export class RegrasDestaque {
    readonly rotulo = input.required<string>();
    readonly variante = input<"inicial" | "custo">("inicial");
}
