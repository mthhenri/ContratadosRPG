import { Component, computed, inject, input } from "@angular/core";
import { Stat } from "../../../shared/ui/stat/stat.component";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { StepInput } from "../../../shared/ui/stepper/step-input.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasAtributos as Atributos } from "../regras.model";

const MODIFICADORES = ["Forte", "Médio", "Fraco", "Frágil"] as const;

@Component({
    selector: "app-regras-atributos",
    imports: [Stat, Botao, StepInput, Tooltip, OficinaTexto],
    templateUrl: "./regras-atributos.component.html",
    styleUrl: "./regras-guia.scss",
})
export class RegrasAtributos {
    readonly bloco = input.required<Atributos>();
    /** Peça da ficha de criatura dona dos atributos; com ela a Oficina edita valor, modificador e bônus. */
    readonly peca = input<string | undefined>(undefined);
    private readonly oficina = inject(OficinaStore, { optional: true });
    /** Os controles só aparecem com a ficha selecionada: sem seleção o bloco é o da leitura. */
    protected readonly selecionada = computed(() =>
        !!this.peca() && this.oficina?.estado() === "ok" && this.oficina.selecionada() === this.peca());

    protected corModificador(modificador: string): string {
        const cores: Record<string, string> = {
            Forte: "forte", Médio: "medio", Fraco: "fraco", Frágil: "fragil",
        };
        return cores[modificador] ?? "fraco";
    }

    protected definirValor(indice: number, valor: number): void {
        this.oficina?.alterarCampo(this.peca() as string, ["atributos", indice, "valor"], valor, "Valor do atributo");
    }

    protected alternarModificador(indice: number, atual: string): void {
        const seguinte = MODIFICADORES[(MODIFICADORES.indexOf(atual as (typeof MODIFICADORES)[number]) + 1) % MODIFICADORES.length];
        this.oficina?.alterarCampo(this.peca() as string, ["atributos", indice, "modificador"], seguinte, "Modificador do atributo");
    }
}
