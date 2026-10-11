import { Component, computed, inject, input, output } from "@angular/core";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";

import { Empilhamento } from "../../../shared/ui/empilhamento/empilhamento.component";
import { OficinaEmpilhamentoEditor } from "../oficina/oficina-empilhamento.component";
import { OficinaInsercao } from "../oficina/oficina-insercao.component";
import { OficinaPeca } from "../oficina/oficina-peca.component";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasAmplificadores, RegrasDocumento } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { lerEmpilhamento } from "./regras-modificacoes-motor";

/** Mesmo shell dos itens de Modificações; só muda o conteúdo (sem custo, peso nem Bloqueia). */
@Component({
    selector: "app-regras-amplificadores",
    imports: [Empilhamento, RegrasInline, OficinaPeca, OficinaTexto, OficinaInsercao, OficinaEmpilhamentoEditor],
    templateUrl: "./regras-amplificadores.component.html",
    styleUrl: "./regras-modificacoes.component.scss",
})
export class RegrasAmplificadoresRender {
    readonly bloco = input.required<RegrasAmplificadores>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();

    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly tiposItem = [TipoRegraPecaEnum.AMPLIFICADOR];
    /** O livro está aberto para edição e este bloco tem peça. */
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");

    /** O empilhamento só ganha os contadores no item selecionado: o resto fica como na leitura. */
    protected selecionado(peca: string | undefined): boolean {
        return this.editando() && !!peca && this.oficina?.selecionada() === peca;
    }

    protected readonly itens = computed(() => this.bloco().itens
        .map((item) => ({ item, ...lerEmpilhamento(item.empilhamento) })));
}
