import { Component, inject } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { FichaAtributosDto } from "@contratados-rpg/shared/dtos/ficha";
import { StepInput } from "../../../../shared/ui/stepper/step-input.component";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { Stat } from "../../../../shared/ui/stat/stat.component";
import { NpcCriacaoFormulario } from "./npc-criacao-formulario.service";

/** Agrupamento de apresentação; valores, teto e DT vêm do motor. */
export const GRUPOS_ATRIBUTOS: readonly {
    readonly nome: string;
    readonly campos: readonly { readonly chave: keyof FichaAtributosDto; readonly nome: string }[];
}[] = [
    { nome: "Físicos", campos: [
        { chave: "destreza", nome: "Destreza" }, { chave: "forca", nome: "Força" },
        { chave: "luta", nome: "Luta" }, { chave: "pontaria", nome: "Pontaria" },
        { chave: "vigor", nome: "Vigor" },
    ] },
    { nome: "Mentais", campos: [
        { chave: "intelecto", nome: "Intelecto" }, { chave: "medicina", nome: "Medicina" },
        { chave: "sentidos", nome: "Sentidos" }, { chave: "social", nome: "Social" },
        { chave: "vontade", nome: "Vontade" },
    ] },
];

@Component({
    selector: "app-npc-atributos", imports: [ReactiveFormsModule, StepInput, Botao, Stat],
    templateUrl: "./npc-atributos.component.html", styleUrl: "./npc-etapa.scss",
})
export class NpcAtributos {
    readonly criacao = inject(NpcCriacaoFormulario);
    readonly grupos = GRUPOS_ATRIBUTOS;

    /** Mostra valores anteriores acima do novo teto, até o mestre corrigir a distribuição. */
    maximoVisivel(chave: keyof FichaAtributosDto): number {
        return Math.max(this.criacao.pontos().limite, this.criacao.estado().atributos[chave]);
    }

    /** Liberação narrativa Civil é explícita e independente para cada atributo. */
    liberado(chave: "luta" | "pontaria"): boolean {
        return chave === "luta" ? this.criacao.lutaCivilLiberada()
            : this.criacao.pontariaCivilLiberada();
    }
}
