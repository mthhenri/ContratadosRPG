import { Component, DestroyRef, computed, inject, input, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import type { FichaResumoDto } from "@contratados-rpg/shared/dtos/ficha";
import { TipoFichaEnum } from "@contratados-rpg/shared/enums";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { CartaoFichaAcervo } from "../../../ficha/componentes/cartao-ficha-acervo/cartao-ficha-acervo.component";
import { montarItemCriatura } from "../../../ficha/criatura-acervo";
import { montarItemNpc } from "../../../ficha/npc-acervo";

/**
 * Criaturas e NPCs que o jogador pode ver na campanha — somente leitura, a partir da listagem
 * autorizada do hospedeiro (não busca nem arbitra acesso). A visão do mestre não usa este
 * componente: ela tem abas próprias (`CampanhaFichasAbas`, m4-15).
 */
@Component({
    selector: "app-campanha-fichas-especiais",
    imports: [ReactiveFormsModule, Campo, Cartao, EstadoVazio, CartaoFichaAcervo],
    templateUrl: "./campanha-fichas-especiais.component.html",
    styleUrl: "./campanha-fichas-especiais.component.scss",
})
export class CampanhaFichasEspeciais {
    readonly fichas = input.required<readonly FichaResumoDto[]>();
    readonly campanhaId = input.required<number>();

    private readonly destroyRef = inject(DestroyRef);
    protected readonly TipoFichaEnum = TipoFichaEnum;
    protected readonly filtro = new FormControl("TODOS", { nonNullable: true });
    private readonly filtroSignal = signal("TODOS");
    private readonly especiais = computed(() => this.fichas().filter((ficha) =>
        ficha.tipo === TipoFichaEnum.CRIATURA || ficha.tipo === TipoFichaEnum.NPC));
    protected readonly itens = computed(() => this.especiais()
        .filter((ficha) => this.filtroSignal() === "TODOS" || ficha.tipo === this.filtroSignal())
        .map((ficha) => ({ ficha, item: ficha.tipo === TipoFichaEnum.NPC
            ? montarItemNpc(ficha) : montarItemCriatura(ficha) })));

    constructor() {
        this.filtro.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((valor) => this.filtroSignal.set(valor));
    }
}
