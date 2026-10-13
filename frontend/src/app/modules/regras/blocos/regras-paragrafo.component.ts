import { Component, input, output } from "@angular/core";
import { RegrasBloco, RegrasDocumento } from "../regras.model";
import type { CaminhoDeDados } from "../oficina/oficina-dados";
import { RegrasInline } from "./regras-inline.component";

@Component({
    selector: "app-regras-paragrafo",
    imports: [RegrasInline],
    templateUrl: "./regras-paragrafo.component.html",
    styleUrl: "./regras-paragrafo.component.scss",
})
export class RegrasParagrafo {
    readonly bloco = input.required<Extract<RegrasBloco, { tipo: "paragrafo" | "exemplo" }>>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    /** Onde o texto mora no `dados` da peça; o padrão é o campo `trechos`. O item de lista informa o seu. */
    readonly campo = input("trechos");
    readonly caminho = input<CaminhoDeDados | null>(null);
    /** Peça dona do texto quando não é a do próprio bloco (item de lista: a peça da lista). */
    readonly peca = input<string | undefined>(undefined);
    readonly rotuloEdicao = input("Parágrafo");
    readonly dica = input("Escreva aqui");
    readonly navegarAncora = output<string>();
}
