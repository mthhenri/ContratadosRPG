import { Component, input, output } from "@angular/core";
import { RegrasBloco, RegrasDocumento } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

@Component({
    selector: "app-regras-exemplo",
    imports: [RegrasInline],
    templateUrl: "./regras-exemplo.component.html",
    styleUrl: "./regras-exemplo.component.scss",
})
export class RegrasExemplo {
    readonly bloco = input.required<Extract<RegrasBloco, { tipo: "paragrafo" | "exemplo" }>>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}

