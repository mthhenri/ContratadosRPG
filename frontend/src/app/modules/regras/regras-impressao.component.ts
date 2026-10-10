import { Component, computed, inject, input, ViewEncapsulation } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { RegrasDocumento } from "./regras.model";
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
        .map(bloco => bloco.tipo === "capa" ? { ...bloco, versao: undefined } : bloco)
        .filter(bloco => !(bloco.tipo === "nota" && bloco.trechos.every(trecho =>
            trecho.tipo === "texto" && /^VERSÃO\s+[\d.]+$/i.test(trecho.texto.trim())))));
    // Definições de imagem do Markdown já saem do JSON no normalizador (revisao-visual-regras).
    protected readonly conteudo = computed(() => this.documento().filhos.slice(this.inicio()));
}
