import { Component, input, output } from "@angular/core";
import { RegrasDocumento, RegrasModificacoes } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { RegrasNota } from "./regras-nota.component";

@Component({
    selector: "app-regras-modificacoes",
    imports: [RegrasInline, RegrasNota],
    templateUrl: "./regras-modificacoes.component.html",
    styleUrl: "./regras-modificacoes.component.scss",
})
export class RegrasModificacoesRender {
    readonly bloco = input.required<RegrasModificacoes>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}
