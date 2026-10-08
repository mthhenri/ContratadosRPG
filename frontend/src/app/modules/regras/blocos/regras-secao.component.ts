import { Component, forwardRef, input, output } from "@angular/core";
import { RegrasDocumento, RegrasSecao } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { Icone } from "../../../shared/icone/icone.component";
import { recuperarIconeIdentidade } from "./regras-identidade-icone";


@Component({
    selector: "app-regras-secao",
    imports: [forwardRef(() => RegrasConteudoRender), Icone],
    templateUrl: "./regras-secao.component.html",
    styleUrl: "./regras-secao.component.scss",
})
export class RegrasSecaoRender {
    readonly bloco = input.required<RegrasSecao>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected readonly iconeIdentidade = recuperarIconeIdentidade;
}

