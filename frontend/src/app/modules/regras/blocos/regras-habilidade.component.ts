import { Component, computed, inject, input, output } from "@angular/core";
import { RegrasBloco, RegrasDocumento } from "../regras.model";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { RegrasInline } from "./regras-inline.component";
import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { OficinaStore } from "../oficina/oficina.store";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaCusto } from "../oficina/oficina-custo.component";
@Component({
    selector: "app-regras-habilidade",
    imports: [Chip, RegrasInline, Icone, Tooltip, OficinaTexto, OficinaCusto],
    templateUrl: "./regras-habilidade.component.html",
    styleUrl: "./regras-habilidade.component.scss",
})
export class RegrasHabilidade {
    readonly bloco = input.required<Extract<RegrasBloco, { tipo: "habilidade" }>>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
}

