import { NgTemplateOutlet } from "@angular/common";
import { Component, computed, forwardRef, inject, input, output } from "@angular/core";
import { RegrasLeitorContexto } from "../regras-leitor-contexto";
import { RegrasDocumento, RegrasSecao } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { Icone } from "../../../shared/icone/icone.component";
import { recuperarIconeIdentidade } from "./regras-identidade-icone";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { descreverCondicao } from "../../../shared/condicoes/condicoes";
import { OficinaStore } from "../oficina/oficina.store";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaPropriedades } from "../oficina/oficina-propriedades.component";


@Component({
    selector: "app-regras-secao",
    imports: [forwardRef(() => RegrasConteudoRender), Icone, Tooltip, NgTemplateOutlet, OficinaTexto, OficinaPropriedades],
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
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    protected identificador(): string {
        return this.contexto?.identificar(this.bloco().ancora) ?? this.bloco().ancora;
    }
}

