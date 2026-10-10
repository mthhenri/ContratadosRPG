import { Component, input } from "@angular/core";
import { RegrasFaixas } from "../regras.model";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";

/** Faixas de uma condição e seu valor (Deslocamento): rótulo pequeno e valor em destaque. */
@Component({
    selector: "app-regras-faixas",
    imports: [Cartao],
    template: `
        <ul class="regras-faixas">
            @for (item of bloco().itens; track $index) {
                <li class="regras-faixas__item">
                    <app-cartao [titulo]="item.rotulo">
                        <span cartaoIndice>{{ $index + 1 }}</span>
                        <strong class="regras-faixas__valor">{{ item.valor }}</strong>
                    </app-cartao>
                </li>
            }
        </ul>
    `,
    styleUrl: "./regras-faixas.component.scss",
})
export class RegrasFaixasRender {
    readonly bloco = input.required<RegrasFaixas>();
}
