import { Component, computed, inject, input, output } from "@angular/core";
import { RegrasBloco, RegrasDocumento } from "../regras.model";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasInline } from "./regras-inline.component";
import { estruturarNotaComMarcadores } from "./regras-texto";

@Component({
    selector: "app-regras-nota",
    imports: [RegrasInline],
    templateUrl: "./regras-nota.component.html",
    styleUrl: "./regras-nota.component.scss",
})
export class RegrasNota {
    readonly bloco = input.required<Extract<RegrasBloco, { tipo: "nota" }>>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    /** Campo da peça que a nota edita na Oficina (`nota` no bloco de modificações, que a guarda no container). */
    readonly campo = input("trechos");
    /** O campo some do `dados` quando esvazia. */
    readonly opcional = input(false);
    readonly navegarAncora = output<string>();
    private readonly oficina = inject(OficinaStore, { optional: true });
    /** Só a leitura estrutura a nota; na Oficina o texto segue um campo único editável. */
    protected readonly estrutura = computed(() => {
        const editando = !!this.bloco().peca && this.oficina?.estado() === "ok";
        return editando || this.campo() !== "trechos" ? null : estruturarNotaComMarcadores(this.bloco().trechos);
    });
}

