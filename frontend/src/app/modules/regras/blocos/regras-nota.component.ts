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
    readonly navegarAncora = output<string>();
}

