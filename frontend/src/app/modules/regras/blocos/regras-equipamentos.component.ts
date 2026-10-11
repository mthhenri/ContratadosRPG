import { Component, computed, inject, input, output } from "@angular/core";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";

import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { OficinaInsercao } from "../oficina/oficina-insercao.component";
import { OficinaPeca } from "../oficina/oficina-peca.component";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasDocumento, RegrasEquipamento, RegrasEquipamentos } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

type Dano = RegrasEquipamento["danos"][number];
type RotuloDano = Dano["rotulo"];

/** Os rótulos de dano que o livro usa, na ordem em que o botão do selo os alterna. */
const ROTULOS_DE_DANO: readonly RotuloDano[] = ["DANO", "UMA MÃO", "DUAS MÃOS"];

@Component({
    selector: "app-regras-equipamentos",
    imports: [
        Chip, RegrasInline, Botao, BotaoIcone, Icone, Tooltip, OficinaPeca, OficinaTexto, OficinaInsercao,
    ],
    templateUrl: "./regras-equipamentos.component.html",
    styleUrl: "./regras-equipamentos.component.scss",
})
export class RegrasEquipamentosRender {
    readonly bloco = input.required<RegrasEquipamentos>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();

    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly tiposItem = [TipoRegraPecaEnum.EQUIPAMENTO];
    protected readonly maximoDeDanos = ROTULOS_DE_DANO.length;
    /** O livro está aberto para edição e este bloco tem peça. */
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");

    /** O item está selecionado: só então a Oficina mostra os campos opcionais vazios e o "+ Dano". */
    protected selecionado(item: RegrasEquipamento): boolean {
        return this.editando() && !!item.peca && this.oficina?.selecionada() === item.peca;
    }

    /** Na Oficina o selo existe enquanto o campo opcional tem texto ou o item está selecionado. */
    protected mostrar(item: RegrasEquipamento, valor: readonly unknown[] | undefined): boolean {
        return !!valor?.length || this.selecionado(item);
    }

    protected alternarRotulo(item: RegrasEquipamento, indice: number): void {
        const seguinte = ROTULOS_DE_DANO[(ROTULOS_DE_DANO.indexOf(item.danos[indice].rotulo) + 1) % ROTULOS_DE_DANO.length];
        this.oficina?.alterarCampo(item.peca as string, ["danos", indice, "rotulo"], seguinte, "Tipo de dano");
    }

    /** Os danos vêm do store, não do template: uma entrega de texto recém-feita não pode ser sobrescrita. */
    private danosDe(item: RegrasEquipamento): readonly Dano[] {
        const dados = this.oficina?.item(item.peca as string)?.dados as { danos?: readonly Dano[] } | undefined;
        return dados?.danos ?? item.danos;
    }

    protected adicionarDano(item: RegrasEquipamento): void {
        const danos = this.danosDe(item);
        const usados = new Set(danos.map((dano) => dano.rotulo));
        const rotulo = ROTULOS_DE_DANO.find((candidato) => !usados.has(candidato)) ?? "DANO";
        this.oficina?.alterarCampo(item.peca as string, ["danos"], [...danos, { rotulo, trechos: [] }],
            "Adicionar dano", false);
    }

    protected removerDano(item: RegrasEquipamento, indice: number): void {
        this.oficina?.alterarCampo(item.peca as string, ["danos"],
            this.danosDe(item).filter((_, posicao) => posicao !== indice), "Remover dano", false);
    }
}
