import { Component, computed, inject, input, output } from "@angular/core";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { StepInput } from "../../../shared/ui/stepper/step-input.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { Icone } from "../../../shared/icone/icone.component";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasDocumento, RegrasModulos } from "../regras.model";

type Modulo = RegrasModulos["modulos"][number];

/**
 * Módulos de fragmento. Na Oficina o nível é um campo no lugar (`["modulos", i, "nivel"]`) e a Energia Máxima
 * um `app-step-input` (`["modulos", i, "energiaMaxima"]`, inteiro ≥ 0); com o bloco selecionado aparecem
 * "Remover módulo" e "+ Módulo". Fora da Oficina o desenho é o mesmo, só leitura.
 */
@Component({
    selector: "app-regras-modulos",
    imports: [Botao, BotaoIcone, Cartao, Chip, StepInput, Tooltip, Icone, OficinaTexto],
    templateUrl: "./regras-modulos.component.html",
    styleUrl: "./regras-modulos.component.scss",
})
export class RegrasModulosRender {
    readonly bloco = input.required<RegrasModulos>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    private readonly oficina = inject(OficinaStore, { optional: true });

    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    protected readonly selecionada = computed(() =>
        this.editando() && this.oficina?.selecionada() === this.bloco().peca);

    /** Os módulos vêm do store, não do template: uma digitação recém-entregue não pode ser sobrescrita. */
    private modulosDe(): readonly Modulo[] {
        const dados = this.oficina?.item(this.bloco().peca as string)?.dados as { modulos?: readonly Modulo[] } | undefined;
        return dados?.modulos ?? this.bloco().modulos;
    }

    protected alterarEnergia(indice: number, valor: number): void {
        if (!Number.isInteger(valor) || valor < 0 || valor === this.modulosDe()[indice]?.energiaMaxima) return;
        this.oficina?.alterarCampo(this.bloco().peca as string, ["modulos", indice, "energiaMaxima"], valor,
            "Energia Máxima do módulo", false);
    }

    protected adicionar(): void {
        const modulos = this.modulosDe();
        this.oficina?.alterarCampo(this.bloco().peca as string, ["modulos"],
            [...modulos, { nivel: "", energiaMaxima: 0 }], "Adicionar módulo", false);
        this.oficina?.pedirFoco({
            identificador: this.bloco().peca as string, campo: `modulos.${modulos.length}.nivel`, posicao: "inicio",
        });
    }

    protected remover(indice: number): void {
        this.oficina?.alterarCampo(this.bloco().peca as string, ["modulos"],
            this.modulosDe().filter((_, posicao) => posicao !== indice), "Remover módulo", false);
    }
}
