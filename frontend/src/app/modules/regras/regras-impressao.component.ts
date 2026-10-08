import { Component, computed, inject, input, ViewEncapsulation } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { RegrasConteudo, RegrasDocumento } from "./regras.model";
import { RegrasLeitorContexto } from "./regras-leitor-contexto";
import { construirSumarioRegras } from "./regras-sumario";
import { RegrasConteudoRender } from "./blocos/regras-conteudo.component";
import { Icone } from "../../shared/icone/icone.component";

/** Mesmo renderer do leitor, com abertura/sumário e IDs independentes da consulta. */
@Component({
    selector: "app-regras-impressao",
    providers: [RegrasLeitorContexto],
    imports: [NgTemplateOutlet, RegrasConteudoRender, Icone],
    templateUrl: "./regras-impressao.component.html",
    styleUrl: "./regras-impressao.component.scss",
    encapsulation: ViewEncapsulation.None,
})
export class RegrasImpressao {
    readonly documento = input.required<RegrasDocumento>();
    protected readonly contexto = inject(RegrasLeitorContexto);
    protected readonly sumario = computed(() => construirSumarioRegras(this.documento().filhos));
    private readonly inicio = computed(() => {
        const indice = this.documento().filhos.findIndex(bloco => bloco.tipo === "secao");
        return indice < 0 ? this.documento().filhos.length : indice;
    });
    protected readonly abertura = computed(() => this.documento().filhos.slice(0, this.inicio())
        .filter(bloco => !(bloco.tipo === "nota" && bloco.trechos.every(trecho =>
            trecho.tipo === "texto" && /^VERSÃO\s+[\d.]+$/i.test(trecho.texto.trim())))));
    protected readonly conteudo = computed(() =>
        this.prepararConteudo(this.documento().filhos.slice(this.inicio())));

    /** Definições de imagens do Markdown são metadados, não conteúdo legível do livro. */
    private prepararConteudo(blocos: readonly RegrasConteudo[]): readonly RegrasConteudo[] {
        return blocos.filter(bloco => !(bloco.tipo === "generico" &&
            /^\[[^\]]+\]:\s*<?data:image\//i.test(bloco.origemMarkdown.trim())))
            .map(bloco => bloco.tipo === "secao" ||
                (bloco.tipo === "generico" && bloco.filhos)
                ? { ...bloco, filhos: this.prepararConteudo(bloco.filhos!) } : bloco);
    }
}
