import { Component, input, output } from "@angular/core";
import { RegrasDocumento, RegrasTrecho } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

/** Fórmula de uma linha (Inventário Máximo = Força × 5), destacada do texto corrido. */
@Component({
    selector: "app-regras-formula",
    imports: [RegrasInline],
    template: `
        <p class="regras-formula">
            <app-regras-inline
                [trechos]="trechos()"
                [documento]="documento()"
                (navegarAncora)="navegarAncora.emit($event)"
            />
        </p>
    `,
    styleUrl: "./regras-formula.component.scss",
})
export class RegrasFormula {
    readonly trechos = input.required<readonly RegrasTrecho[]>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}
