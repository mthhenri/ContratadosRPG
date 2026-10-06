import { Component, computed, input, output } from "@angular/core";
import type { FichaAtributosDto } from "@contratados-rpg/shared/dtos/ficha";
import type { CategoriaNpcEnum } from "@contratados-rpg/shared/enums";
import { obterCompetenciasPorCategoria } from "@contratados-rpg/shared/regras/npc";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { Chip } from "../../../../shared/ui/chip/chip.component";
import { GRUPOS_ATRIBUTOS } from "../../npc-atributos-campos";

/** Seleção sobre os botões canônicos usados na liberação Civil do guia. */
@Component({
    selector: "app-npc-competencias", imports: [Botao, Chip],
    templateUrl: "./npc-competencias.component.html", styleUrl: "./npc-competencias.component.scss",
})
export class NpcCompetencias {
    readonly categoria = input.required<CategoriaNpcEnum>();
    readonly atributos = input.required<FichaAtributosDto>();
    readonly competencias = input<readonly (keyof FichaAtributosDto)[] | undefined>();
    readonly editavel = input(false);
    readonly desabilitado = input(false);
    readonly competenciasAlteradas = output<readonly (keyof FichaAtributosDto)[]>();
    readonly campos = GRUPOS_ATRIBUTOS.flatMap((grupo) => grupo.campos);
    readonly referencia = computed(() => obterCompetenciasPorCategoria({ categoria: this.categoria() }));
    readonly dado = computed(() => this.referencia().dados > 0
        ? `${this.referencia().dados}D${this.referencia().faces}` : "Sem dados de Competência");
    selecionada(chave: keyof FichaAtributosDto): boolean { return this.competencias()?.includes(chave) ?? false; }
    alternar(chave: keyof FichaAtributosDto): void {
        if (!this.editavel() || this.desabilitado()) return;
        const atuais = this.competencias() ?? [];
        if (!atuais.includes(chave) && this.atributos()[chave] <= 0) return;
        this.competenciasAlteradas.emit(atuais.includes(chave)
            ? atuais.filter((competencia) => competencia !== chave) : [...atuais, chave]);
    }
}
