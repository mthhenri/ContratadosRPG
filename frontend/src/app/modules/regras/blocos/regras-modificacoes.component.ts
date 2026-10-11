import { Component, computed, inject, input, output } from "@angular/core";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";

import { Empilhamento } from "../../../shared/ui/empilhamento/empilhamento.component";
import { OficinaEmpilhamentoEditor } from "../oficina/oficina-empilhamento.component";
import { OficinaInsercao } from "../oficina/oficina-insercao.component";
import { OficinaPeca } from "../oficina/oficina-peca.component";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasDocumento, RegrasModificacoes } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { RegrasNota } from "./regras-nota.component";
import {
    formatarPesoModificacao, lerEmpilhamento, lerModificacoesCategoria,
} from "./regras-modificacoes-motor";

@Component({
    selector: "app-regras-modificacoes",
    imports: [
        Empilhamento, RegrasInline, RegrasNota, OficinaPeca, OficinaTexto, OficinaInsercao, OficinaEmpilhamentoEditor,
    ],
    templateUrl: "./regras-modificacoes.component.html",
    styleUrl: "./regras-modificacoes.component.scss",
})
export class RegrasModificacoesRender {
    readonly bloco = input.required<RegrasModificacoes>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();

    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly tiposItem = [TipoRegraPecaEnum.MODIFICACAO];
    /** O livro está aberto para edição e este bloco tem peça. */
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    /** A nota (opcional) do bloco aparece vazia só com o bloco selecionado. */
    protected readonly mostrarNota = computed(() =>
        !!this.bloco().nota?.length || (this.editando() && this.oficina?.selecionada() === this.bloco().peca));

    protected readonly motor = computed(() => lerModificacoesCategoria(this.bloco().categoria));
    protected readonly resumo = computed(() => {
        const motor = this.motor();
        if (!motor) return null;
        const peso = motor.pesoPadrao
            ? `${formatarPesoModificacao(motor.pesoPadrao)} por modificação` : "sem peso";
        return `Custo $ ${motor.custo} por modificação · ${peso}`;
    });
    /** O empilhamento só ganha os contadores no item selecionado: o resto fica como na leitura. */
    protected selecionado(peca: string | undefined): boolean {
        return this.editando() && !!peca && this.oficina?.selecionada() === peca;
    }

    protected readonly itens = computed(() => this.bloco().itens.map((item) => ({
        item, ...lerEmpilhamento(item.empilhamento),
        peso: this.motor()?.pesoProprio.get(item.nome),
    })));
    protected readonly formatarPeso = formatarPesoModificacao;
}
