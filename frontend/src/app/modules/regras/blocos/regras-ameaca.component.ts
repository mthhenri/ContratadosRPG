import { Component, computed, input } from "@angular/core";
import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";

/** Identidade do NA: marca própria e cores/fundos aprovados na M10-04. */
@Component({
    selector: "app-regras-ameaca",
    imports: [Icone, Tooltip],
    template: `
        <span [class]="'regras-ameaca regras-ameaca--' + cor()"
            [appTooltip]="texto()" [attr.aria-label]="texto()" tabindex="0">
            <app-icone nome="contratados" />
            <span>{{ texto() }}</span>
        </span>
    `,
    styleUrl: "./regras-ameaca.component.scss",
})
export class RegrasAmeaca {
    readonly nivel = input.required<number>();
    readonly rotulo = input<string>();
    private readonly niveis = ["desconhecida", "nula", "baixa", "media", "alta",
        "extrema", "catastrofica", "apocaliptica"];
    protected readonly cor = computed(() => this.niveis[this.nivel()] ?? "desconhecida");
    protected readonly texto = computed(() => this.rotulo() ?? `NA ${this.nivel()}`);
}
