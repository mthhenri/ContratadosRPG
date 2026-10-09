import { Component, computed, input, output } from "@angular/core";
import { OverflowFade } from "../../../shared/overflow-fade/overflow-fade.directive";
import { RegrasDocumento, RegrasFonteTabela } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { lerTextoRegras } from "./regras-texto";
@Component({
    selector: "app-regras-tabela",
    imports: [RegrasInline, OverflowFade],
    templateUrl: "./regras-tabela.component.html",
    styleUrl: "./regras-tabela.component.scss",
})
export class RegrasTabela {
    readonly bloco = input.required<RegrasFonteTabela>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected readonly colunas = computed(() => Math.max(1,
        this.bloco().cabecalho.length, ...this.bloco().linhas.map(linha => linha.length)));
    protected readonly amplificadores = computed(() => {
        const bloco = this.bloco();
        return bloco.cabecalho.map(lerTextoRegras).filter(texto => texto.trim()).join("|")
            === "Nome|Efeitos"
            && bloco.linhas.length > 0
            && bloco.linhas.every(linha => linha.length === 3
                && /^[■□]+$/.test(lerTextoRegras(linha[1]).trim()));
    });
    protected readonly cabecalho = computed(() => this.amplificadores()
        ? [this.bloco().cabecalho[0], [{ tipo: "texto" as const, texto: "Empilhamento" }],
            this.bloco().cabecalho[1]]
        : this.bloco().cabecalho);
}

