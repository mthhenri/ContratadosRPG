import { Component, computed, inject, input } from "@angular/core";

import { Empilhamento } from "../../../shared/ui/empilhamento/empilhamento.component";
import { StepInput } from "../../../shared/ui/stepper/step-input.component";
import { lerEmpilhamento } from "../blocos/regras-modificacoes-motor";
import { EMPILHAMENTO_MAXIMO, EMPILHAMENTO_MINIMO, montarEmpilhamento } from "./oficina-empilhamento";
import { OficinaStore } from "./oficina.store";

/**
 * Empilhamento (■□) editável no lugar (m11-08): o desenho é o mesmo `app-empilhamento` da leitura, e dois
 * contadores logo ao lado escolhem quantas caixas o item concede (Início) e o teto (Máx.). Alterar grava o
 * texto `■■□□□` do livro na hora.
 */
@Component({
    selector: "app-oficina-empilhamento",
    imports: [Empilhamento, StepInput],
    templateUrl: "./oficina-empilhamento.component.html",
    styleUrl: "./oficina-empilhamento.component.scss",
})
export class OficinaEmpilhamentoEditor {
    readonly peca = input.required<string>();
    readonly valor = input.required<string>();
    readonly rotulo = input<string>();

    private readonly store = inject(OficinaStore);
    protected readonly lido = computed(() => lerEmpilhamento(this.valor()));
    protected readonly sufixo = computed(() => (this.rotulo() ? ` de ${this.rotulo()}` : ""));
    protected readonly minimo = EMPILHAMENTO_MINIMO;
    protected readonly maximoPermitido = EMPILHAMENTO_MAXIMO;

    protected definir(iniciais: number, maximo: number): void {
        const texto = montarEmpilhamento(iniciais, maximo);
        if (texto === this.valor()) return;
        this.store.alterarCampo(this.peca(), ["empilhamento"], texto, "Empilhamento");
    }
}
