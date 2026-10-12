import { Component, computed, inject, input } from "@angular/core";
import { RegrasFaixas } from "../regras.model";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";

/** Faixas de uma condição e seu valor (Deslocamento): rótulo pequeno e valor em destaque. */
@Component({
    selector: "app-regras-faixas",
    imports: [Cartao, Botao, BotaoIcone, Icone, Tooltip, OficinaTexto],
    template: `
        <ul class="regras-faixas">
            @for (item of bloco().itens; track $index; let indice = $index) {
                <li class="regras-faixas__item">
                    <app-cartao [titulo]="item.rotulo">
                        <span cartaoIndice>{{ indice + 1 }}</span>
                        @if (editando()) {
                            <app-oficina-texto
                                [campo]="'itens.' + indice + '.rotulo'"
                                [caminho]="['itens', indice, 'rotulo']"
                                rotulo="Condição da faixa"
                                vazio="Condição"
                                [peca]="bloco().peca!"
                                [texto]="item.rotulo"
                            />
                            <strong class="regras-faixas__valor">
                                <app-oficina-texto
                                    [campo]="'itens.' + indice + '.valor'"
                                    [caminho]="['itens', indice, 'valor']"
                                    rotulo="Valor da faixa"
                                    vazio="valor"
                                    [peca]="bloco().peca!"
                                    [texto]="item.valor"
                                />
                            </strong>
                            @if (selecionada()) {
                                <button
                                    app-botao-icone
                                    tamanho="compacto"
                                    variante="perigo"
                                    type="button"
                                    [attr.aria-label]="'Remover faixa ' + (indice + 1)"
                                    appTooltip="Remover faixa"
                                    (click)="remover(indice)"
                                >
                                    <app-icone nome="excluir" />
                                </button>
                            }
                        } @else {
                            <strong class="regras-faixas__valor">{{ item.valor }}</strong>
                        }
                    </app-cartao>
                </li>
            }
        </ul>
        @if (selecionada()) {
            <button app-botao variante="secundario" estilo="contorno" tamanho="pequeno" posicaoIcone="esquerda"
                type="button" aria-label="Adicionar faixa" (click)="adicionar()"><app-icone nome="mais" /> Faixa</button>
        }
    `,
    styleUrl: "./regras-faixas.component.scss",
})
export class RegrasFaixasRender {
    readonly bloco = input.required<RegrasFaixas>();
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    protected readonly selecionada = computed(() => this.editando() && this.oficina?.selecionada() === this.bloco().peca);

    /** Os itens vêm do store, não do template: uma digitação recém-entregue não pode ser sobrescrita. */
    private itensDe(): RegrasFaixas["itens"] {
        const dados = this.oficina?.item(this.bloco().peca as string)?.dados as { itens?: RegrasFaixas["itens"] } | undefined;
        return dados?.itens ?? this.bloco().itens;
    }

    protected adicionar(): void {
        this.oficina?.alterarCampo(this.bloco().peca as string, ["itens"], [...this.itensDe(), { rotulo: "", valor: "" }],
            "Adicionar faixa", false);
    }

    protected remover(indice: number): void {
        this.oficina?.alterarCampo(this.bloco().peca as string, ["itens"],
            this.itensDe().filter((_, posicao) => posicao !== indice), "Remover faixa", false);
    }
}
