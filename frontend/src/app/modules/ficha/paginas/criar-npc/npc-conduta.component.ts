import { Component, inject } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { EditorMarkdown } from "../../../../shared/ui/editor-markdown/editor-markdown.component";
import { Icone } from "../../../../shared/icone/icone.component";
import { NpcCriacaoFormulario } from "./npc-criacao-formulario.service";

/** Conduta obrigatória e listas opcionais, preservadas ao sair e voltar à etapa. */
@Component({
    selector: "app-npc-conduta",
    imports: [ReactiveFormsModule, Campo, Botao, Cartao, EstadoVazio, EditorMarkdown, Icone],
    templateUrl: "./npc-conduta.component.html", styleUrl: "./npc-etapa.scss",
})
export class NpcConduta {
    readonly criacao = inject(NpcCriacaoFormulario);
    readonly controles = this.criacao.formulario.controls;
    readonly grupos = [
        { chave: "sequelas", nome: "Sequelas" }, { chave: "traumas", nome: "Traumas" },
    ] as const;
}
