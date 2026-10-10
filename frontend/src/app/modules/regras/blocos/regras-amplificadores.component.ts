import { Component, computed, input, output } from "@angular/core";
import { Empilhamento } from "../../../shared/ui/empilhamento/empilhamento.component";
import { RegrasAmplificadores, RegrasDocumento } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { lerEmpilhamento } from "./regras-modificacoes-motor";

/** Mesmo shell dos itens de Modificações; só muda o conteúdo (sem custo, peso nem Bloqueia). */
@Component({
    selector: "app-regras-amplificadores",
    imports: [Empilhamento, RegrasInline],
    templateUrl: "./regras-amplificadores.component.html",
    styleUrl: "./regras-modificacoes.component.scss",
})
export class RegrasAmplificadoresRender {
    readonly bloco = input.required<RegrasAmplificadores>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();

    protected readonly itens = computed(() => this.bloco().itens
        .map((item) => ({ item, ...lerEmpilhamento(item.empilhamento) })));
}
