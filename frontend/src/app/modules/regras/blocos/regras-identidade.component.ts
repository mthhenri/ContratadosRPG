import { Component, computed, inject, input, output } from "@angular/core";
import { RegrasDocumento, RegrasIdentidade as Identidade } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { RegrasAmeaca } from "./regras-ameaca.component";
import { lerTextoRegras } from "./regras-texto";
import { StepInput } from "../../../shared/ui/stepper/step-input.component";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";

@Component({
    selector: "app-regras-identidade",
    imports: [RegrasInline, RegrasAmeaca, StepInput, OficinaTexto],
    templateUrl: "./regras-identidade.component.html",
    styleUrl: "./regras-guia.scss",
})
export class RegrasIdentidade {
    readonly bloco = input.required<Identidade>();
    readonly documento = input<RegrasDocumento["id"]>("guia");
    /** Peça da ficha de criatura dona da identidade; com ela a Oficina edita os campos (`identidade[i]`). */
    readonly peca = input<string | undefined>(undefined);
    readonly navegarAncora = output<string>();
    protected readonly lerTexto = lerTextoRegras;
    protected readonly niveisAmeaca = 7;
    /** O cabeçalho da ficha acha o conceito por este nome: o rótulo dele não se renomeia. */
    protected readonly rotuloDoConceito = "Conceito";
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.peca() && this.oficina?.estado() === "ok");
    /** O contador do Nível de Ameaça só aparece com a ficha selecionada. */
    protected readonly selecionada = computed(() => this.editando() && this.oficina?.selecionada() === this.peca());

    protected definirNivel(indice: number, nivel: number): void {
        this.oficina?.alterarCampo(this.peca() as string, ["identidade", indice, "nivel"], nivel, "Nível de Ameaça");
    }
}
