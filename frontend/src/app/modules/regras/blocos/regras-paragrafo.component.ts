import { Component, input, output } from "@angular/core";
import { RegrasBloco, RegrasDocumento } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

@Component({
    selector: "app-regras-paragrafo",
    imports: [RegrasInline],
    templateUrl: "./regras-paragrafo.component.html",
    styleUrl: "./regras-paragrafo.component.scss",
})
export class RegrasParagrafo {
    readonly bloco = input.required<Extract<RegrasBloco, { tipo: "paragrafo" | "exemplo" }>>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}

