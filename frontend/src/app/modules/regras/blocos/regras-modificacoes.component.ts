import { Component, computed, input, output } from "@angular/core";
import { Empilhamento } from "../../../shared/ui/empilhamento/empilhamento.component";
import { RegrasDocumento, RegrasModificacoes } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { RegrasNota } from "./regras-nota.component";
import {
    formatarPesoModificacao, lerEmpilhamento, lerModificacoesCategoria,
} from "./regras-modificacoes-motor";

@Component({
    selector: "app-regras-modificacoes",
    imports: [Empilhamento, RegrasInline, RegrasNota],
    templateUrl: "./regras-modificacoes.component.html",
    styleUrl: "./regras-modificacoes.component.scss",
})
export class RegrasModificacoesRender {
    readonly bloco = input.required<RegrasModificacoes>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();

    protected readonly motor = computed(() => lerModificacoesCategoria(this.bloco().categoria));
    protected readonly resumo = computed(() => {
        const motor = this.motor();
        if (!motor) return null;
        const peso = motor.pesoPadrao
            ? `${formatarPesoModificacao(motor.pesoPadrao)} por modificação` : "sem peso";
        return `Custo $ ${motor.custo} por modificação · ${peso}`;
    });
    protected readonly itens = computed(() => this.bloco().itens.map((item) => ({
        item, ...lerEmpilhamento(item.empilhamento),
        peso: this.motor()?.pesoProprio.get(item.nome),
    })));
    protected readonly formatarPeso = formatarPesoModificacao;
}
