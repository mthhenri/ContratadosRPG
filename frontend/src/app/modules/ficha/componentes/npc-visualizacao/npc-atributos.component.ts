import { Component, ElementRef, computed, effect, inject, input, viewChild } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import type { FichaAtributosDto, FichaNpcDadosDto } from "@contratados-rpg/shared/dtos/ficha";
import { calcularDtAtributo } from "@contratados-rpg/shared/regras/npc";
import { Icone } from "../../../../shared/icone/icone.component";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { AtributoFicha } from "../../../../shared/ui/atributo-ficha/atributo-ficha.component";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { StepInput } from "../../../../shared/ui/stepper/step-input.component";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { GRUPOS_ATRIBUTOS } from "../../npc-atributos-campos";
import { NpcBlocoAcoes } from "./npc-bloco-acoes.component";

/** Card extraído do NPC; edição e validação continuam no formulário/service existentes. */
@Component({
    selector: "app-npc-atributos",
    imports: [ReactiveFormsModule, Icone, Tooltip, AtributoFicha, BotaoIcone, Cartao,
        StepInput, NpcBlocoAcoes],
    templateUrl: "./npc-atributos.component.html",
    styleUrl: "./npc-atributos.component.scss",
})
export class NpcAtributos {
    readonly dados = input.required<FichaNpcDadosDto>();
    readonly gerenciavel = input(false);
    readonly formulario = inject(NpcEdicaoFormulario);
    readonly edicao = this.formulario.edicao;
    readonly grupos = GRUPOS_ATRIBUTOS;
    private readonly chaves = GRUPOS_ATRIBUTOS.flatMap((grupo) =>
        grupo.campos.map((campo) => campo.chave));
    readonly violacoes = computed(() => this.edicao.violacoes().filter((violacao) =>
        this.chaves.some((chave) => violacao.startsWith(`${chave}:`))));
    private readonly editor = viewChild<ElementRef<HTMLElement>>("editor");

    constructor() {
        effect(() => {
            if (!this.formulario.emEdicaoDe("atributos")) return;
            const elemento = this.editor()?.nativeElement;
            if (!elemento) return;
            setTimeout(() => (elemento.querySelector<HTMLElement>(
                "app-step-input button:not(:disabled)") ?? elemento).focus());
        });
    }

    iniciar(): void {
        if (this.gerenciavel()) this.formulario.iniciar("atributos");
    }

    dt(chave: keyof FichaAtributosDto): number {
        return calcularDtAtributo({ nivel: this.dados().nivel,
            valorAtributo: this.dados().atributos[chave] });
    }

    aoTeclaBloco(evento: KeyboardEvent): void {
        if (!this.formulario.emEdicaoDe("atributos")) return;
        if (evento.key === "Escape") {
            evento.stopPropagation(); this.formulario.cancelar();
        } else if (evento.key === "Enter" && (evento.ctrlKey || evento.metaKey)) {
            evento.preventDefault(); void this.formulario.salvar();
        }
    }
}
