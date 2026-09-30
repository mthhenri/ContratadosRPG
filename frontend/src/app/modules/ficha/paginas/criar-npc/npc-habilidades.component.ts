import { Component, inject } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { HabilidadeTipoNpcEnum } from "@contratados-rpg/shared/enums";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { StepInput } from "../../../../shared/ui/stepper/step-input.component";
import { Icone } from "../../../../shared/icone/icone.component";
import { NpcCriacaoFormulario } from "./npc-criacao-formulario.service";

/** Editor de composição e assinatura mecânica; volume consultado no motor compartilhado. */
@Component({
    selector: "app-npc-habilidades",
    imports: [ReactiveFormsModule, Campo, Botao, Cartao, EstadoVazio, StepInput, Icone],
    templateUrl: "./npc-habilidades.component.html", styleUrl: "./npc-etapa.scss",
})
export class NpcHabilidades {
    readonly criacao = inject(NpcCriacaoFormulario);
    readonly tipos = HabilidadeTipoNpcEnum;
}
