import { Component, forwardRef, input, output } from "@angular/core";
import { RegrasBloco, RegrasDocumento } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";


@Component({
    selector: "app-regras-lista",
    imports: [forwardRef(() => RegrasConteudoRender)],
    templateUrl: "./regras-lista.component.html",
    styleUrl: "./regras-lista.component.scss",
})
export class RegrasLista {
    readonly bloco = input.required<Extract<RegrasBloco, { tipo: "lista" }>>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}

