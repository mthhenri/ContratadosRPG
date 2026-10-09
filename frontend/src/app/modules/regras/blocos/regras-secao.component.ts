import { Component, forwardRef, inject, input, output } from "@angular/core";
import { RegrasLeitorContexto } from "../regras-leitor-contexto";
import { RegrasDocumento, RegrasSecao } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { Icone } from "../../../shared/icone/icone.component";
import { recuperarIconeIdentidade } from "./regras-identidade-icone";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { descreverCondicao } from "../../../shared/condicoes/condicoes";


@Component({
    selector: "app-regras-secao",
    imports: [forwardRef(() => RegrasConteudoRender), Icone, Tooltip],
    templateUrl: "./regras-secao.component.html",
    styleUrl: "./regras-secao.component.scss",
})
export class RegrasSecaoRender {
    protected readonly descreverCondicao = descreverCondicao;
    readonly bloco = input.required<RegrasSecao>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected readonly iconeIdentidade = recuperarIconeIdentidade;
    private readonly contexto = inject(RegrasLeitorContexto, { optional: true });
    protected identificador(): string {
        return this.contexto?.identificar(this.bloco().ancora) ?? this.bloco().ancora;
    }
}

