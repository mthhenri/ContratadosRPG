import { Component, input, output } from "@angular/core";
import { RegrasOrigens as BlocoOrigens, RegrasDocumento } from "../regras.model";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { RegrasInline } from "./regras-inline.component";

@Component({
    selector: "app-regras-origens",
    imports: [Cartao, RegrasInline],
    templateUrl: "./regras-origens.component.html",
    styleUrl: "./regras-origens.component.scss",
})
export class RegrasOrigens {
    readonly bloco = input.required<BlocoOrigens>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}
