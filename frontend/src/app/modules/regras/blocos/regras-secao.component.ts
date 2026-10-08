import { Component, forwardRef, input, output } from "@angular/core";
import { RegrasDocumento, RegrasSecao } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";


@Component({
    selector: "app-regras-secao",
    imports: [forwardRef(() => RegrasConteudoRender)],
    templateUrl: "./regras-secao.component.html",
    styleUrl: "./regras-secao.component.scss",
})
export class RegrasSecaoRender {
    readonly bloco = input.required<RegrasSecao>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}

