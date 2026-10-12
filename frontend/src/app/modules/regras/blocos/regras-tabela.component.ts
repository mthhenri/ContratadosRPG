import { Component, computed, inject, input, output } from "@angular/core";
import { Icone } from "../../../shared/icone/icone.component";
import { OverflowFade } from "../../../shared/overflow-fade/overflow-fade.directive";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { OficinaMatrizControles } from "../oficina/oficina-matriz-controles.component";
import { removerLinha } from "../oficina/oficina-matriz";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasDocumento, RegrasFonteTabela } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
@Component({
    selector: "app-regras-tabela",
    imports: [RegrasInline, OverflowFade, BotaoIcone, Icone, Tooltip, OficinaMatrizControles],
    templateUrl: "./regras-tabela.component.html",
    styleUrl: "./regras-tabela.component.scss",
})
export class RegrasTabela {
    readonly bloco = input.required<RegrasFonteTabela & { readonly peca?: string; readonly pares?: RegrasFonteTabela }>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    protected readonly selecionada = computed(() => this.editando() && this.oficina?.selecionada() === this.bloco().peca);
    /** Na Oficina edita-se a tabela inteira: as duas metades de uma tabela "em pares" são só desenho da Leitura. */
    protected readonly tabela = computed(() => (this.editando() ? this.bloco() : (this.bloco().pares ?? this.bloco())));
    protected readonly colunas = computed(() => Math.max(1,
        this.tabela().cabecalho.length, ...this.tabela().linhas.map(linha => linha.length)));

    protected removerLinha(indice: number): void {
        this.oficina?.alterarMatriz(this.bloco().peca as string, (matriz) => removerLinha(matriz, indice), "Remover linha");
    }
}
