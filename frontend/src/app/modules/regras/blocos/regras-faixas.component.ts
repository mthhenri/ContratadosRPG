import { Component, input } from "@angular/core";
import { RegrasFaixas } from "../regras.model";

/** Faixas de uma condição e seu valor (Deslocamento): rótulo pequeno e valor em destaque. */
@Component({
    selector: "app-regras-faixas",
    template: `
        <ul class="regras-faixas">
            @for (item of bloco().itens; track $index) {
                <li class="regras-faixas__item">
                    <span class="regras-faixas__rotulo">{{ item.rotulo }}</span>
                    <strong class="regras-faixas__valor">{{ item.valor }}</strong>
                </li>
            }
        </ul>
    `,
    styleUrl: "./regras-faixas.component.scss",
})
export class RegrasFaixasRender {
    readonly bloco = input.required<RegrasFaixas>();
}
