import { Component, computed, input } from "@angular/core";
import type { FichaResumoDto } from "@contratados-rpg/shared/dtos/ficha";
import { TipoFichaEnum } from "@contratados-rpg/shared/enums";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { CartaoFichaAcervo } from "../../../ficha/componentes/cartao-ficha-acervo/cartao-ficha-acervo.component";
import { montarItemNpc } from "../../../ficha/npc-acervo";

/** Entrada mínima no painel: apresenta somente o recorte autorizado já carregado pelo pai. */
@Component({
    selector: "app-npc-campanha-fichas", imports: [Cartao, CartaoFichaAcervo],
    template: `@if (itens().length) {
        <app-cartao titulo="NPCs"><span cartaoIndice>//</span>
            @for (item of itens(); track item.id) {
                <app-cartao-ficha-acervo [item]="item" [mostrarMenu]="false"
                    [campanhaDestino]="item.campanhaId" />
            }
        </app-cartao>
    }`,
    styles: `:host { display: block; min-width: 0; }
        app-cartao-ficha-acervo { display: block; margin-block: var(--space-8); }`,
})
export class NpcCampanhaFichas {
    readonly fichas = input.required<readonly FichaResumoDto[]>();
    readonly itens = computed(() => this.fichas()
        .filter((ficha) => ficha.tipo === TipoFichaEnum.NPC).map(montarItemNpc));
}
