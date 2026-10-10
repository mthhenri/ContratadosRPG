import { Component, input, output } from "@angular/core";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { Stat, StatValor } from "../../../shared/ui/stat/stat.component";
import { Icone } from "../../../shared/icone/icone.component";
import { RegrasDocumento, RegrasGrade } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

/** Referências reconhecidas: título e conteúdo nunca se separam ao mudar de coluna. */
@Component({
    selector: "app-regras-grade-referencia",
    imports: [Cartao, Stat, StatValor, Icone, RegrasInline],
    template: `
        @if (referencia().titulo; as titulo) {
            <app-cartao [titulo]="titulo" [semCaixa]="true">
                <span cartaoIndice>//</span>
            </app-cartao>
        }
        <div class="regras-referencia">
            @for (item of referencia().itens; track $index) {
                @if (referencia().tipo === "saude") {
                    <app-stat [rotulo]="item.rotulo" [variante]="item.variante"
                        [faixa]="true" tamanho="compacto" [nota]="item.nota ?? ''">
                        <app-icone statIcone [nome]="item.variante === 'vida' ? 'vida' : 'energia'" />
                        <span appStatValor class="regras-referencia__valor">
                            <app-regras-inline [trechos]="item.conteudo" [documento]="documento()"
                                (navegarAncora)="navegarAncora.emit($event)" />
                        </span>
                    </app-stat>
                } @else {
                    <app-cartao [titulo]="item.rotulo">
                        <span cartaoIndice>{{ $index + 1 }}</span>
                        <p class="regras-referencia__texto">
                            <app-regras-inline [trechos]="item.conteudo" [documento]="documento()"
                                (navegarAncora)="navegarAncora.emit($event)" />
                        </p>
                    </app-cartao>
                }
            }
        </div>
    `,
    styleUrl: "./regras-grade-referencia.component.scss",
})
export class RegrasGradeReferencia {
    readonly referencia = input.required<NonNullable<RegrasGrade["referencia"]>>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}
