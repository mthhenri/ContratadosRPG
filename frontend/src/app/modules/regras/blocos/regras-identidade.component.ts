import { Component, input, output } from "@angular/core";
import { RegrasDocumento, RegrasIdentidade as Identidade } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { RegrasAmeaca } from "./regras-ameaca.component";
import { lerTextoRegras } from "./regras-texto";

@Component({
    selector: "app-regras-identidade",
    imports: [RegrasInline, RegrasAmeaca],
    templateUrl: "./regras-identidade.component.html",
    styleUrl: "./regras-guia.scss",
})
export class RegrasIdentidade {
    readonly bloco = input.required<Identidade>();
    readonly documento = input<RegrasDocumento["id"]>("guia");
    readonly navegarAncora = output<string>();
    protected readonly lerTexto = lerTextoRegras;
}
