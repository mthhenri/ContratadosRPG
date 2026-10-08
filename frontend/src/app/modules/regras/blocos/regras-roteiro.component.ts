import { Component, forwardRef, input, output } from "@angular/core";
import { RegrasDocumento, RegrasRoteiro as Roteiro } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { RegrasConteudoRender } from "./regras-conteudo.component";

@Component({
    selector: "app-regras-roteiro",
    imports: [RegrasInline, forwardRef(() => RegrasConteudoRender)],
    templateUrl: "./regras-roteiro.component.html",
    styleUrl: "./regras-guia.scss",
})
export class RegrasRoteiro {
    readonly bloco = input.required<Roteiro>();
    readonly documento = input<RegrasDocumento["id"]>("guia");
    readonly navegarAncora = output<string>();
}
