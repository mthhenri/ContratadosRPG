import { Component, input, output } from "@angular/core";
import { RegrasBloco, RegrasDocumento } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

@Component({
    selector: "app-regras-nota",
    imports: [RegrasInline],
    templateUrl: "./regras-nota.component.html",
    styleUrl: "./regras-nota.component.scss",
})
export class RegrasNota {
    readonly bloco = input.required<Extract<RegrasBloco, { tipo: "nota" }>>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    /** Campo da peça que a nota edita na Oficina (`nota` no bloco de modificações, que a guarda no container). */
    readonly campo = input("trechos");
    /** O campo some do `dados` quando esvazia. */
    readonly opcional = input(false);
    readonly navegarAncora = output<string>();
}

