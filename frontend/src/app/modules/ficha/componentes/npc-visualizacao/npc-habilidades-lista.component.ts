import { Component, computed, inject, input, signal } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { HabilidadeTipoNpcEnum } from "@contratados-rpg/shared/enums";
import { obterVolumeHabilidadesPorCategoria } from "@contratados-rpg/shared/regras/npc";
import { Icone } from "../../../../shared/icone/icone.component";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Chip } from "../../../../shared/ui/chip/chip.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { NpcEdicaoFormulario, criarHabilidadeFormulario } from "../../npc-edicao-formulario.service";

@Component({
    selector: "app-npc-habilidades-lista",
    imports: [ReactiveFormsModule, Icone, Tooltip, Botao, BotaoIcone, Campo, Chip, EstadoVazio],
    templateUrl: "./npc-habilidades-lista.component.html", styleUrl: "./npc-visualizacao.scss",
})
export class NpcHabilidadesLista {
    readonly formulario = inject(NpcEdicaoFormulario);
    readonly gerenciavel = input(false);
    readonly indiceEditando = signal<number | null>(null);
    readonly tipos = HabilidadeTipoNpcEnum;
    readonly ficha = computed(() => this.formulario.edicao.rascunho()
        ?? this.formulario.edicao.ficha());
    readonly volume = computed(() => obterVolumeHabilidadesPorCategoria({
        categoria: this.ficha()!.dados.categoria,
    }));

    /** Itens só ganham editar/remover depois que o grupo entra em edição (lápis do cabeçalho). */
    readonly modoEdicao = computed(() => this.formulario.grupo() === "habilidades");

    emEdicao(indice: number): boolean {
        return this.gerenciavel() && this.modoEdicao() && this.indiceEditando() === indice;
    }

    editar(indice: number): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.formulario.iniciar("habilidades"); this.indiceEditando.set(indice);
    }

    adicionar(): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.formulario.iniciar("habilidades");
        this.formulario.habilidades.push(criarHabilidadeFormulario());
        this.indiceEditando.set(this.formulario.habilidades.length - 1);
    }

    concluir(): void {
        const indice = this.indiceEditando();
        if (indice === null) return;
        const registro = this.formulario.habilidades.at(indice);
        if (registro.invalid) { registro.markAllAsTouched(); return; }
        this.indiceEditando.set(null);
    }

    remover(indice: number): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.formulario.iniciar("habilidades");
        this.formulario.habilidades.removeAt(indice); this.indiceEditando.set(null);
    }
}
