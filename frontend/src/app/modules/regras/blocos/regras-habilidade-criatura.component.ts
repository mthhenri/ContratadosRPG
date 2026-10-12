import { Component, computed, inject, input, output } from "@angular/core";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { OficinaPeca } from "../oficina/oficina-peca.component";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasDocumento, RegrasHabilidadeCriatura as Habilidade } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

const CATEGORIAS = ["PASSIVA", "ATIVA", "DE GATILHO"] as const;

@Component({
    selector: "app-regras-habilidade-criatura",
    imports: [Chip, RegrasInline, OficinaPeca, OficinaTexto, Botao, Tooltip],
    templateUrl: "./regras-habilidade-criatura.component.html",
    styleUrl: "./regras-guia.scss",
})
export class RegrasHabilidadeCriatura {
    readonly bloco = input.required<Habilidade>();
    readonly documento = input<RegrasDocumento["id"]>("guia");
    readonly navegarAncora = output<string>();
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    protected readonly selecionada = computed(() => this.editando() && this.oficina?.selecionada() === this.bloco().peca);

    protected alternarCategoria(): void {
        const seguinte = CATEGORIAS[(CATEGORIAS.indexOf(this.bloco().categoria) + 1) % CATEGORIAS.length];
        this.oficina?.alterarCampo(this.bloco().peca as string, ["categoria"], seguinte, "Categoria da habilidade");
    }
}
