import { Component, computed, input, output } from "@angular/core";
import { RegrasDocumento, RegrasGrade as BlocoGrade } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { lerTextoRegras } from "./regras-texto";

/** Tabela de layout sem assinatura conhecida: uma caixa por célula preenchida, na ordem da fonte */
@Component({
    selector: "app-regras-grade",
    imports: [RegrasInline, Cartao],
    template: `
        @if (modulos(); as itens) {
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
                            [trechos]="celula"
                            [documento]="documento()"
                            (navegarAncora)="navegarAncora.emit($event)"
                        />
                    </div>
                }
            </div>
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
    protected readonly celulas = computed(() => [this.bloco().cabecalho, ...this.bloco().linhas]
        .flat().filter(celula => celula.some(trecho => !("texto" in trecho) || trecho.texto.trim())));
    /** Colunas reais: a fonte às vezes reserva colunas vazias para alinhar o Docs. */
    protected readonly colunas = computed(() =>
        Math.max(1, Math.min(this.bloco().colunas, this.celulas().length)));
}
