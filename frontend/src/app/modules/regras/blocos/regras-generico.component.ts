import { Component, forwardRef, input, output } from "@angular/core";
import { RegrasBloco, RegrasDocumento } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { RegrasInline } from "./regras-inline.component";

@Component({
    selector: "app-regras-generico",
    imports: [forwardRef(() => RegrasConteudoRender), RegrasInline],
    templateUrl: "./regras-generico.component.html",
    styleUrl: "./regras-generico.component.scss",
})
export class RegrasGenerico {
    readonly bloco = input.required<Extract<RegrasBloco, { tipo: "generico" }>>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}

