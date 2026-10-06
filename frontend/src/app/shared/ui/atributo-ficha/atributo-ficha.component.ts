import { Component, computed, input, output } from "@angular/core";
import { Icone } from "../../icone/icone.component";
import { Tooltip } from "../../tooltip/tooltip.directive";
import { BotaoIcone } from "../botao-icone/botao-icone.component";

/** Ladrilho extraído da ficha de Jogador. Só apresenta valores já calculados pelo consumidor;
 * steppers projetados conservam seus controles, limites e eventos de edição. */
@Component({
    selector: "app-atributo-ficha",
    imports: [Icone, Tooltip, BotaoIcone],
    templateUrl: "./atributo-ficha.component.html",
    styleUrl: "./atributo-ficha.component.scss",
    host: {
        class: "ficha-atributo",
        "[class.ficha-atributo--edicao]": "editando()",
        "[class.ficha-atributo--maestria]": "!editando() && mostrarMaestria() && maestria()",
        "[class.ficha-atributo--lesionado]": "!editando() && mostrarLesao() && lesao() > 0",
    },
})
export class AtributoFicha {
    readonly sigla = input.required<string>();
    readonly nome = input.required<string>();
    readonly valor = input.required<number>();
    readonly dt = input.required<number>();
    readonly maestria = input(false);
    readonly lesao = input(0);
    readonly modificador = input(0);
    readonly dados = input(0);
    readonly mostrarModificador = input(true);
    readonly mostrarDados = input(true);
    readonly mostrarMaestria = input(true);
    readonly mostrarLesao = input(true);
    readonly mostrarRolar = input(true);
    readonly podeRolar = input(false);
    readonly editando = input(false);
    readonly maestriaHabilitada = input(true);
    readonly dicaMaestria = input("");
    readonly dicaLesao = input("");
    /** O Jogador conserva a dica de edição original (só nome); NPC usa nome + DT também aqui. */
    readonly dicaEdicao = input<string | null>(null);
    readonly rolar = output<void>();
    readonly maestriaAlternada = output<void>();
    protected readonly descricao = computed(() => `${this.nome()} — DT ${this.dt()}`);
}
