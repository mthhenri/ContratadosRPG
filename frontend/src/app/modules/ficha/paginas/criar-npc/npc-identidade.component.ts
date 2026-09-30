import { Component, inject } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { CategoriaNpcEnum } from "@contratados-rpg/shared/enums";
import { obterReferenciaCategoria } from "@contratados-rpg/shared/regras/npc";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { StepInput } from "../../../../shared/ui/stepper/step-input.component";
import { NpcCriacaoFormulario } from "./npc-criacao-formulario.service";

/** Identidade narrativa e eixos independentes de Categoria e Cooperação. */
@Component({
    selector: "app-npc-identidade", imports: [ReactiveFormsModule, Campo, StepInput],
    templateUrl: "./npc-identidade.component.html", styleUrl: "./npc-etapa.scss",
})
export class NpcIdentidade {
    readonly criacao = inject(NpcCriacaoFormulario);
    readonly controles = this.criacao.formulario.controls;
    readonly categorias = Object.values(CategoriaNpcEnum).map((categoria) =>
        obterReferenciaCategoria({ categoria }));
}
