import { Component, computed, inject, input, signal } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { Icone } from "../../../../shared/icone/icone.component";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Chip } from "../../../../shared/ui/chip/chip.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { NpcEdicaoFormulario, criarSequelaFormulario, criarTraumaFormulario }
    from "../../npc-edicao-formulario.service";

type ListaSanidadeNpc = "sequelas" | "traumas";

@Component({
    selector: "app-npc-sanidade-lista",
    imports: [ReactiveFormsModule, Icone, Tooltip, Botao, BotaoIcone, Campo, Chip, EstadoVazio],
    templateUrl: "./npc-sanidade-lista.component.html", styleUrl: "./npc-visualizacao.scss",
})
export class NpcSanidadeLista {
    readonly formulario = inject(NpcEdicaoFormulario);
    readonly gerenciavel = input(false);
    readonly listas = [{ chave: "sequelas", nome: "Sequelas" },
        { chave: "traumas", nome: "Traumas" }] as const;
    readonly editando = signal<{ lista: ListaSanidadeNpc; indice: number } | null>(null);
    readonly ficha = computed(() => this.formulario.edicao.rascunho()
        ?? this.formulario.edicao.ficha());

    /** Itens só ganham editar/remover depois que o grupo entra em edição (lápis do cabeçalho). */
    readonly modoEdicao = computed(() => this.formulario.grupo() === "sanidade");

    emEdicao(lista: ListaSanidadeNpc, indice: number): boolean {
        const atual = this.editando();
        return this.gerenciavel() && this.modoEdicao() && atual?.lista === lista
            && atual.indice === indice;
    }

    editar(lista: ListaSanidadeNpc, indice: number): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.formulario.iniciar("sanidade"); this.editando.set({ lista, indice });
    }

    adicionar(lista: ListaSanidadeNpc): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.formulario.iniciar("sanidade");
        if (lista === "sequelas") this.formulario.sequelas.push(criarSequelaFormulario());
        else this.formulario.traumas.push(criarTraumaFormulario());
        this.editando.set({ lista, indice: this.formulario[lista].length - 1 });
    }

    concluir(): void {
        const editando = this.editando();
        if (!editando) return;
        const registro = this.formulario[editando.lista].at(editando.indice);
        if (registro.invalid) { registro.markAllAsTouched(); return; }
        this.editando.set(null);
    }

    remover(lista: ListaSanidadeNpc, indice: number): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.formulario.iniciar("sanidade");
        this.formulario[lista].removeAt(indice); this.editando.set(null);
    }
}
