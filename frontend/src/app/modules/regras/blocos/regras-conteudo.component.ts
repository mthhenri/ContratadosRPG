import { Component, input, output } from "@angular/core";
import { RegrasConteudo, RegrasDocumento } from "../regras.model";
import { RegrasSecaoRender } from "./regras-secao.component";
import { RegrasParagrafo } from "./regras-paragrafo.component";
import { RegrasLista } from "./regras-lista.component";
import { RegrasNota } from "./regras-nota.component";
import { RegrasExemplo } from "./regras-exemplo.component";
import { RegrasTabela } from "./regras-tabela.component";
import { RegrasHabilidade } from "./regras-habilidade.component";
import { RegrasGenerico } from "./regras-generico.component";
import { RegrasRicoFonte } from "./regras-rico-fonte.component";

@Component({
    selector: "app-regras-conteudo",
    imports: [
            RegrasSecaoRender, RegrasParagrafo, RegrasLista, RegrasNota, RegrasExemplo,
            RegrasTabela, RegrasHabilidade, RegrasGenerico, RegrasRicoFonte,
    ],
    templateUrl: "./regras-conteudo.component.html",
})
export class RegrasConteudoRender {
    readonly filhos = input.required<readonly RegrasConteudo[]>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}
