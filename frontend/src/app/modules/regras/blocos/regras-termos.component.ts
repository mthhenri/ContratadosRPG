import { Component, input, output } from "@angular/core";
import { RegrasDocumento, RegrasTermos as BlocoTermos } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

/** Lista de verbetes curtos em grade (`.t12` do exemplão M10): nome, rótulo e descrição. */
@Component({
    selector: "app-regras-termos",
    imports: [RegrasInline],
    templateUrl: "./regras-termos.component.html",
    styleUrl: "./regras-termos.component.scss",
})
export class RegrasTermos {
    readonly bloco = input.required<BlocoTermos>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}
