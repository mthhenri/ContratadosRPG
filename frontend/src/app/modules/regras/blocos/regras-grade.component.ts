import { Component, computed, input, output } from "@angular/core";
import { RegrasDocumento, RegrasGrade as BlocoGrade } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

/** Tabela de layout sem assinatura conhecida: uma caixa por célula preenchida, na ordem da fonte */
@Component({
    selector: "app-regras-grade",
    imports: [RegrasInline],
    template: `
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
    `,
    styleUrl: "./regras-grade.component.scss",
})
export class RegrasGrade {
    readonly bloco = input.required<BlocoGrade>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected readonly celulas = computed(() => [this.bloco().cabecalho, ...this.bloco().linhas]
        .flat().filter(celula => celula.some(trecho => !("texto" in trecho) || trecho.texto.trim())));
    /** Colunas reais: a fonte às vezes reserva colunas vazias para alinhar o Docs. */
    protected readonly colunas = computed(() =>
        Math.max(1, Math.min(this.bloco().colunas, this.celulas().length)));
}
