import { Component, ElementRef, computed, effect, inject, input, viewChild } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import type { FichaAtributosDto, FichaNpcDadosDto } from "@contratados-rpg/shared/dtos/ficha";
import {
    ROTULO_FORMULA_DT_NPC, calcularDtAtributo, obterCompetenciasPorCategoria,
} from "@contratados-rpg/shared/regras/npc";
import { Icone } from "../../../../shared/icone/icone.component";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { AtributoFicha } from "../../../../shared/ui/atributo-ficha/atributo-ficha.component";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { Stat } from "../../../../shared/ui/stat/stat.component";
import { StepInput } from "../../../../shared/ui/stepper/step-input.component";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { GRUPOS_ATRIBUTOS } from "../../npc-atributos-campos";
import { NpcBlocoAcoes } from "./npc-bloco-acoes.component";
import { NpcRolagemService } from "../../npc-rolagem.service";

/** Card extraído do NPC; edição e validação continuam no formulário/service existentes. */
@Component({
    selector: "app-npc-atributos",
    imports: [ReactiveFormsModule, Icone, Tooltip, AtributoFicha, BotaoIcone, Cartao,
        Stat, StepInput, NpcBlocoAcoes],
    templateUrl: "./npc-atributos.component.html",
    styleUrl: "./npc-atributos.component.scss",
})
export class NpcAtributos {
    readonly dados = input.required<FichaNpcDadosDto>();
    readonly gerenciavel = input(false);
    readonly formulario = inject(NpcEdicaoFormulario);
    readonly rolagens = inject(NpcRolagemService);
    readonly dadosCompetencias = computed(() => this.edicao.rascunho()?.dados ?? this.dados());
    readonly edicao = this.formulario.edicao;
    readonly grupos = GRUPOS_ATRIBUTOS;
    readonly formulaDt = ROTULO_FORMULA_DT_NPC;
    /** Quantidade e dado vêm da Categoria **salva** — o bloco não edita Categoria (m4-21). */
    readonly referenciaCompetencias = computed(() =>
        obterCompetenciasPorCategoria({ categoria: this.dadosCompetencias().categoria }));
    readonly competenciasAtuais = computed(() => this.dadosCompetencias().competencias ?? []);
    readonly rotuloDadoCompetencia = computed(() => {
        const referencia = this.referenciaCompetencias();
        return referencia.dados > 0 ? `+${referencia.dados}D${referencia.faces}` : "";
    });
    readonly violacoes = this.edicao.violacoes;
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

    competenciaMarcada(chave: keyof FichaAtributosDto): boolean {
        return this.competenciasAtuais().includes(chave);
    }

    /** Fora da edição o botão nem aparece; nela, desmarcar sempre pode — marcar exige atributo
     * positivo e vaga na quantidade da Categoria (mesma trava do seletor `NpcCompetencias`). */
    competenciaHabilitada(chave: keyof FichaAtributosDto): boolean {
        if (this.edicao.salvando()) return false;
        if (this.competenciaMarcada(chave)) return true;
        return this.dadosCompetencias().atributos[chave] > 0
            && this.competenciasAtuais().length < this.referenciaCompetencias().quantidade;
    }

    dicaCompetencia(chave: keyof FichaAtributosDto, nome: string): string {
        if (this.competenciaMarcada(chave)) return `Competência em ${nome} — clique para remover`;
        if (this.dadosCompetencias().atributos[chave] <= 0) {
            return "Atributo 0 não pode ser Competência";
        }
        if (this.competenciasAtuais().length >= this.referenciaCompetencias().quantidade) {
            return `Limite de ${this.referenciaCompetencias().quantidade} Competências da Categoria`;
        }
        return `Marcar Competência em ${nome} (${this.rotuloDadoCompetencia()} no teste)`;
    }

    alternarCompetencia(chave: keyof FichaAtributosDto): void {
        if (!this.gerenciavel() || !this.formulario.emEdicaoDe("atributos")) return;
        if (!this.competenciaHabilitada(chave)) return;
        const atuais = this.competenciasAtuais();
        this.formulario.formulario.controls.competencias.setValue(this.competenciaMarcada(chave)
            ? atuais.filter((competencia) => competencia !== chave) : [...atuais, chave]);
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
