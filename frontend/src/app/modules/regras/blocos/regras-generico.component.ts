import { Component, computed, forwardRef, inject, input, output } from "@angular/core";
import { OficinaStore } from "../oficina/oficina.store";
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
    private readonly oficina = inject(OficinaStore, { optional: true });
    /** Na Oficina os `trechos` são editáveis no lugar; o `motivo` (metadado da importação) fica só para leitura. */
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
}

