import { Component, computed, inject, input, output } from "@angular/core";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { Stat, StatValor } from "../../../shared/ui/stat/stat.component";
import { Icone } from "../../../shared/icone/icone.component";
import { RegrasDocumento, RegrasGrade } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";

/** Referências reconhecidas: título e conteúdo nunca se separam ao mudar de coluna. */
@Component({
    selector: "app-regras-grade-referencia",
    imports: [Cartao, Stat, StatValor, Icone, RegrasInline, Botao, BotaoIcone, Tooltip, OficinaTexto],
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
                            <app-regras-inline [trechos]="item.conteudo" [peca]="peca()"
                                [campo]="'itens.' + $index + '.conteudo'" [caminho]="['itens', $index, 'conteudo']"
                                [rotuloEdicao]="item.rotulo" [dica]="item.rotulo" [documento]="documento()"
                                (navegarAncora)="navegarAncora.emit($event)" />
                        </span>
                    </app-stat>
                } @else {
                    <app-cartao [titulo]="item.rotulo">
                        <span cartaoIndice>{{ $index + 1 }}</span>
                        @if (editando()) {
                            <app-oficina-texto
                                [campo]="'itens.' + $index + '.rotulo'"
                                [caminho]="['itens', $index, 'rotulo']"
                                rotulo="Título do cartão"
                                vazio="Título"
                                [peca]="peca()!"
                                [texto]="item.rotulo"
                            />
                        }
                        <p class="regras-referencia__texto">
                            <app-regras-inline [trechos]="item.conteudo" [peca]="peca()"
                                [campo]="'itens.' + $index + '.conteudo'" [caminho]="['itens', $index, 'conteudo']"
                                [rotuloEdicao]="'Conteúdo de ' + item.rotulo" dica="Conteúdo" [documento]="documento()"
                                (navegarAncora)="navegarAncora.emit($event)" />
                        </p>
                        @if (selecionada()) {
                            <button app-botao-icone tamanho="compacto" variante="perigo" type="button"
                                [attr.aria-label]="'Remover cartão ' + ($index + 1)" appTooltip="Remover cartão"
                                (click)="remover($index)"><app-icone nome="excluir" /></button>
                        }
                    </app-cartao>
                }
            }
        </div>
        @if (selecionada() && referencia().tipo === "cartoes") {
            <button app-botao variante="secundario" estilo="contorno" tamanho="pequeno" posicaoIcone="esquerda"
                type="button" aria-label="Adicionar cartão" (click)="adicionar()"><app-icone nome="mais" /> Cartão</button>
        }
    `,
    styleUrl: "./regras-grade-referencia.component.scss",
})
export class RegrasGradeReferencia {
    readonly referencia = input.required<NonNullable<RegrasGrade["referencia"]>>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    /** Peça da grade; com ela a Oficina edita título e conteúdo dos cartões (`itens[i]`). */
    readonly peca = input<string | undefined>(undefined);
    readonly navegarAncora = output<string>();
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.peca() && this.oficina?.estado() === "ok");
    protected readonly selecionada = computed(() => this.editando() && this.oficina?.selecionada() === this.peca());

    /** Os itens vêm do store, não do template: uma digitação recém-entregue não pode ser sobrescrita. */
    private itensDe(): NonNullable<RegrasGrade["referencia"]>["itens"] {
        const dados = this.oficina?.item(this.peca() as string)?.dados as { itens?: NonNullable<RegrasGrade["referencia"]>["itens"] } | undefined;
        return dados?.itens ?? this.referencia().itens;
    }

    protected adicionar(): void {
        this.oficina?.alterarCampo(this.peca() as string, ["itens"], [...this.itensDe(), { rotulo: "", conteudo: [] }],
            "Adicionar cartão", false);
    }

    protected remover(indice: number): void {
        this.oficina?.alterarCampo(this.peca() as string, ["itens"],
            this.itensDe().filter((_, posicao) => posicao !== indice), "Remover cartão", false);
    }
}
