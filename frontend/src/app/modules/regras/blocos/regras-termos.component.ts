import { Component, computed, inject, input, output } from "@angular/core";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";

import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { StepInput } from "../../../shared/ui/stepper/step-input.component";
import { OficinaInsercao } from "../oficina/oficina-insercao.component";
import { OficinaPeca } from "../oficina/oficina-peca.component";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasDocumento, RegrasTermo, RegrasTermos as BlocoTermos } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

/** Lista de verbetes curtos em grade (`.t12` do exemplão M10): nome, rótulo e descrição. */
@Component({
    selector: "app-regras-termos",
    imports: [
        RegrasInline, OficinaPeca, OficinaTexto, OficinaInsercao, StepInput, Botao, BotaoIcone, Icone, Tooltip,
    ],
    templateUrl: "./regras-termos.component.html",
    styleUrl: "./regras-termos.component.scss",
})
export class RegrasTermos {
    readonly bloco = input.required<BlocoTermos>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();

    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly tiposItem = [TipoRegraPecaEnum.TERMO];
    /** O livro está aberto para edição e este bloco tem peça. */
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");

    /** Número e rótulo vazios só aparecem para escolher no termo selecionado. */
    protected selecionado(item: RegrasTermo): boolean {
        return this.editando() && !!item.peca && this.oficina?.selecionada() === item.peca;
    }

    /** `undefined` retira o número do termo. */
    protected definirNumero(item: RegrasTermo, numero: number | undefined): void {
        this.oficina?.alterarCampo(item.peca as string, ["numero"], numero, "Número do termo");
    }
}
