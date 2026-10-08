import { Component, input, output } from "@angular/core";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { RegrasDocumento, RegrasNiveisAmeaca as Niveis } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { RegrasAmeaca } from "./regras-ameaca.component";

@Component({
    selector: "app-regras-niveis-ameaca",
    imports: [Cartao, RegrasInline, RegrasAmeaca],
    templateUrl: "./regras-niveis-ameaca.component.html",
    styleUrl: "./regras-niveis-ameaca.component.scss",
})
export class RegrasNiveisAmeaca {
    readonly bloco = input.required<Niveis>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}
