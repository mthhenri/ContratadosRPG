import { Component, computed, ElementRef, inject, input, signal } from "@angular/core";
import type { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";

import { Icone } from "../../../shared/icone/icone.component";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { MenuInsercao } from "../../../shared/ui/menu-insercao/menu-insercao.component";
import { opcoesDeInsercao } from "./oficina-estrutura";
import { OficinaStore } from "./oficina.store";

/**
 * Ponto de inserção da Oficina (m11-07), o "+" entre as peças e no fim das listas: abre o menu com os
 * tipos que cabem no pai (a tabela de aninhamento do validador) e cria a peça nova com o esqueleto do
 * tipo. Fora da Oficina é transparente (`display: contents`, sem nada dentro).
 *
 * `pai` é o identificador da peça que contém a lista (`null` = raiz do livro); `depoisDe`, o da peça
 * logo antes do ponto (`null` = no começo). `restritoA` estreita o menu (o "+ Arquétipo" da classe).
 */
@Component({
    selector: "app-oficina-insercao",
    imports: [Botao, Icone, MenuInsercao],
    templateUrl: "./oficina-insercao.component.html",
    styleUrl: "./oficina-insercao.component.scss",
    host: {
        "[class.oficina-insercao]": "visivel()",
        "[class.oficina-insercao--fim]": "fim()",
        "[class.oficina-insercao--selecionada]": "aoLadoDaSelecionada()",
    },
})
export class OficinaInsercao {
    readonly pai = input<string | null>(null);
    readonly depoisDe = input<string | null>(null);
    /** Ponto do fim da lista (ou lista vazia): sempre à vista, sem esperar o mouse. */
    readonly fim = input(false);
    readonly restritoA = input<readonly TipoRegraPecaEnum[] | undefined>(undefined);
    readonly rotulo = input("Inserir");

    private readonly store = inject(OficinaStore, { optional: true });
    protected readonly gatilho = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    protected readonly aberto = signal(false);
    /** Tipo do pai (`null` = raiz; `undefined` = peça que sumiu). Só muda de valor quando o tipo muda: digitar não recalcula o menu. */
    private readonly tipoDoPai = computed(() => {
        const pai = this.pai();
        return pai === null ? null : this.store?.item(pai)?.tipo;
    });
    protected readonly opcoes = computed(() => {
        const tipo = this.tipoDoPai();
        if (!this.store || this.store.estado() !== "ok" || tipo === undefined) return [];
        return opcoesDeInsercao(tipo, this.restritoA());
    });
    protected readonly visivel = computed(() => this.opcoes().length > 0);
    /** Em tela sem mouse só o ponto logo depois da peça selecionada (e os do fim) fica à vista. */
    protected readonly aoLadoDaSelecionada = computed(() => {
        const depoisDe = this.depoisDe();
        return depoisDe !== null && this.store?.selecionada() === depoisDe;
    });
    protected readonly rotuloAcessivel = computed(() =>
        this.rotulo() === "Inserir" ? "Inserir peça aqui" : `Inserir ${this.rotulo().toLowerCase()}`);

    protected alternar(): void {
        this.aberto.update((aberto) => !aberto);
    }

    protected fechar(motivo: "teclado" | "fora"): void {
        this.aberto.set(false);
        if (motivo === "teclado") this.gatilho.querySelector<HTMLElement>("button")?.focus();
    }

    protected escolher(tipo: string): void {
        this.aberto.set(false);
        void this.store?.inserir(tipo as TipoRegraPecaEnum, this.pai(), this.depoisDe(), undefined,
            this.fim() && this.depoisDe() === null);
    }
}
