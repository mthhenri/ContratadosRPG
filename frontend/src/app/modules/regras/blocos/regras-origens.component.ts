import { Component, computed, inject, input, output } from "@angular/core";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";

import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { OficinaInsercao } from "../oficina/oficina-insercao.component";
import { OficinaPeca } from "../oficina/oficina-peca.component";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasOrigens as BlocoOrigens, RegrasDocumento } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

@Component({
    selector: "app-regras-origens",
    imports: [Cartao, RegrasInline, OficinaPeca, OficinaTexto, OficinaInsercao],
    templateUrl: "./regras-origens.component.html",
    styleUrl: "./regras-origens.component.scss",
})
export class RegrasOrigens {
    readonly bloco = input.required<BlocoOrigens>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();

    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly tiposItem = [TipoRegraPecaEnum.ORIGEM];
    /** O livro está aberto para edição e este bloco tem peça. */
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
}
