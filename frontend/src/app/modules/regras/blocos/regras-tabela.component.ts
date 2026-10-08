import { Component, input, output } from "@angular/core";
import { OverflowFade } from "../../../shared/overflow-fade/overflow-fade.directive";
import { RegrasDocumento, RegrasFonteTabela } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
@Component({
    selector: "app-regras-tabela",
    imports: [RegrasInline, OverflowFade],
    templateUrl: "./regras-tabela.component.html",
    styleUrl: "./regras-tabela.component.scss",
})
export class RegrasTabela {
    readonly bloco = input.required<RegrasFonteTabela>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}

