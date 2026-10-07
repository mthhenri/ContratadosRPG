import { Component, computed, inject } from "@angular/core";
import { CategoriaNpcEnum, PatenteEnum } from "@contratados-rpg/shared/enums";
import { CATEGORIAS_VETADAS_NPC_CIVIL, listarPatentesEquivalentes } from "@contratados-rpg/shared/regras/npc";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { GuiaEquipamentoLoja } from "../../componentes/guia-equipamento-loja/guia-equipamento-loja.component";
import { NpcCriacaoFormulario } from "./npc-criacao-formulario.service";
import { ROTULOS_PATENTE } from "../../../simulacao/rotulos";

/**
 * Equipamento inicial do NPC (`m4-20`): reusa o catálogo/carrinho do Jogador
 * (`app-guia-equipamento-loja`) sem orçamento nem modificação — o mestre atribui o kit
 * diretamente, igual ao resto da criação do NPC. Categoria Civil não vê Proteções/Explosivos
 * (`categoriasVetadas`, mesmo padrão já proposto para o Civil jogador). Patente Equivalente é
 * escolha explícita opcional; as modificações e o estado equipado são configurados na ficha.
 */
@Component({
    selector: "app-npc-equipamento-inicial",
    imports: [GuiaEquipamentoLoja, Botao],
    templateUrl: "./npc-equipamento-inicial.component.html", styleUrl: "./npc-etapa.scss",
})
export class NpcEquipamentoInicial {
    readonly rotulosPatente = ROTULOS_PATENTE;
    readonly criacao = inject(NpcCriacaoFormulario);
    readonly patentes = computed(() => listarPatentesEquivalentes({
        categoria: this.criacao.estado().categoria,
    }));
    /** Seleção explícita; ausência nunca assume o piso da Categoria. */
    selecionarPatente(patente: PatenteEnum | null): void {
        const controle = this.criacao.formulario.controls.patenteEquivalente;
        controle.setValue(controle.value === patente ? null : patente);
        controle.markAsDirty();
    }
    readonly categoriasVetadas = computed(() => {
        const civil = this.criacao.estado().categoria === CategoriaNpcEnum.CIVIL;
        return civil ? CATEGORIAS_VETADAS_NPC_CIVIL : [];
    });
}
