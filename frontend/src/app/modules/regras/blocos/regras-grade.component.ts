import { Component, computed, inject, input, output } from "@angular/core";
import { RegrasDocumento, RegrasGrade as BlocoGrade } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { lerTextoRegras } from "./regras-texto";
import { RegrasGradeReferencia } from "./regras-grade-referencia.component";
import { OficinaMatrizControles } from "../oficina/oficina-matriz-controles.component";
import { OficinaStore } from "../oficina/oficina.store";

/** Tabela de layout sem assinatura conhecida: uma caixa por célula preenchida, na ordem da fonte */
@Component({
    selector: "app-regras-grade",
    imports: [RegrasInline, Cartao, RegrasGradeReferencia, OficinaMatrizControles],
    template: `
        @if (bloco().referencia; as referencia) {
            <app-regras-grade-referencia [referencia]="referencia" [peca]="bloco().peca" [documento]="documento()"
                (navegarAncora)="navegarAncora.emit($event)" />
        } @else if (!editando() && modulos(); as itens) {
            <div class="regras-grade-modulos">
                @for (item of itens; track $index) {
                    <app-cartao [titulo]="item.titulo">
                        <span cartaoIndice>{{ $index + 1 }}</span>
                        @for (trechos of item.conteudo; track $index) {
                            <p class="regras-grade-modulos__texto">
                                <app-regras-inline
                                    [trechos]="trechos"
                                    [documento]="documento()"
                                    (navegarAncora)="navegarAncora.emit($event)"
                                />
                            </p>
                        }
                    </app-cartao>
                }
            </div>
        } @else {
            <div class="regras-grade" [style.--regras-grade-colunas]="colunas()">
                @for (celula of celulas(); track $index) {
                    <div class="regras-grade__celula">
                        <app-regras-inline
                            [trechos]="celula.trechos"
                            [peca]="bloco().peca"
                            [campo]="celula.campo"
                            [caminho]="celula.caminho"
                            [rotuloEdicao]="celula.rotulo"
                            dica="—"
                            [documento]="documento()"
                            (navegarAncora)="navegarAncora.emit($event)"
                        />
                    </div>
                }
            </div>
            <app-oficina-matriz-controles [peca]="bloco().peca" [comUltimaLinha]="true" />
        }
    `,
    styleUrl: "./regras-grade.component.scss",
})
export class RegrasGrade {
    readonly bloco = input.required<BlocoGrade>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    /** Os módulos são colunas comparáveis na fonte; cada título acompanha seus efeitos. */
    protected readonly modulos = computed(() => {
        const bloco = this.bloco();
        const titulos = bloco.cabecalho.map(lerTextoRegras);
        if (!titulos.length || !titulos.every(titulo => /^Módulo [IV]+$/.test(titulo.trim()))) {
            return null;
        }
        return titulos.map((titulo, indice) => ({
            titulo,
            conteudo: bloco.linhas.map(linha => linha[indice] ?? []),
        }));
    });
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    /** Cada célula com o caminho dela no `dados`; a Leitura omite as vazias, a Oficina mostra todas para editá-las. */
    protected readonly celulas = computed(() => {
        const bloco = this.bloco();
        const todas = [
            ...bloco.cabecalho.map((trechos, coluna) => ({ trechos, campo: "cabecalho." + coluna,
                caminho: ["cabecalho", coluna] as const, rotulo: "Cabeçalho da coluna " + (coluna + 1) })),
            ...bloco.linhas.flatMap((linha, indice) => linha.map((trechos, coluna) => ({ trechos,
                campo: "linhas." + indice + "." + coluna, caminho: ["linhas", indice, coluna] as const,
                rotulo: "Linha " + (indice + 1) + ", coluna " + (coluna + 1) }))),
        ];
        return this.editando() ? todas
            : todas.filter(({ trechos }) => trechos.some(trecho => !("texto" in trecho) || trecho.texto.trim()));
    });
    /** Colunas reais: a fonte às vezes reserva colunas vazias para alinhar o Docs. */
    protected readonly colunas = computed(() =>
        Math.max(1, Math.min(this.bloco().colunas, this.editando() ? this.bloco().colunas : this.celulas().length)));
}
