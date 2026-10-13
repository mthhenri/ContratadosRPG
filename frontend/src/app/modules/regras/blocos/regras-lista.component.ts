import { NgTemplateOutlet } from "@angular/common";
import { Component, computed, forwardRef, inject, input, output } from "@angular/core";
import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { OficinaPropriedades } from "../oficina/oficina-propriedades.component";
import { OficinaStore } from "../oficina/oficina.store";
import { lerNoCaminho, nomeDoCaminho, type CaminhoDeDados } from "../oficina/oficina-dados";
import { RegrasBloco, RegrasDocumento } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { RegrasParagrafo } from "./regras-paragrafo.component";

type Lista = Extract<RegrasBloco, { tipo: "lista" }>;
type Item = Lista["itens"][number];

/**
 * Lista com marcadores ou numerada. Na Oficina cada parágrafo de item é um campo editável no lugar
 * (`["itens", i, j, "trechos"]` no `dados` da peça; sublista: o mesmo, a partir do caminho dela) e, com a
 * lista selecionada, aparecem "Remover item" e "+ Item". A sublista não tem peça própria: ela recebe a
 * peça da lista raiz e o `caminho` até si. Com a lista selecionada também aparecem a faixa de propriedades (marcadores
 * ou numerada, número inicial), "+ Sublista" em cada item e "Remover sublista". Fora da Oficina o desenho é o mesmo, só leitura.
 */
@Component({
    selector: "app-regras-lista",
    imports: [
        NgTemplateOutlet, Botao, BotaoIcone, Icone, Tooltip, RegrasParagrafo, OficinaPropriedades,
        forwardRef(() => RegrasConteudoRender), forwardRef(() => RegrasLista),
    ],
    templateUrl: "./regras-lista.component.html",
    styleUrl: "./regras-lista.component.scss",
})
export class RegrasLista {
    readonly bloco = input.required<Lista>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    /** Peça dona do texto: a lista raiz usa a própria; a sublista recebe a da raiz. */
    readonly peca = input<string | undefined>(undefined);
    /** Onde esta lista mora no `dados` da peça (`[]` na raiz). */
    readonly caminho = input<CaminhoDeDados>([]);
    readonly navegarAncora = output<string>();
    private readonly oficina = inject(OficinaStore, { optional: true });

    protected readonly dona = computed(() => this.peca() ?? this.bloco().peca);
    protected readonly editando = computed(() => !!this.dona() && this.oficina?.estado() === "ok");
    /** Remover e adicionar item só aparecem com a lista selecionada. */
    protected readonly selecionada = computed(() => this.editando() && this.oficina?.selecionada() === this.dona());

    /** Os itens vêm do store, não do template: uma digitação recém-entregue não pode ser sobrescrita. */
    private itensDe(): readonly Item[] {
        const dona = this.dona();
        const dados = dona ? this.oficina?.item(dona)?.dados : undefined;
        const doStore = lerNoCaminho(dados, [...this.caminho(), "itens"]);
        return Array.isArray(doStore) ? (doStore as readonly Item[]) : this.bloco().itens;
    }

    private gravar(itens: readonly Item[], rotulo: string): void {
        this.oficina?.alterarCampo(this.dona() as string, [...this.caminho(), "itens"], itens, rotulo, false);
    }

    protected caminhoDoTexto(item: number, bloco: number): CaminhoDeDados {
        return [...this.caminho(), "itens", item, bloco, "trechos"];
    }

    protected caminhoDoBloco(item: number, bloco: number): CaminhoDeDados {
        return [...this.caminho(), "itens", item, bloco];
    }

    protected nomeDoCampo(item: number, bloco: number): string {
        return nomeDoCaminho(this.caminhoDoTexto(item, bloco));
    }

    protected adicionarItem(): void {
        const itens = this.itensDe();
        this.gravar([...itens, [{ tipo: "paragrafo", trechos: [] }]], "Adicionar item");
        this.oficina?.pedirFoco({
            identificador: this.dona() as string, campo: this.nomeDoCampo(itens.length, 0), posicao: "inicio",
        });
    }

    protected removerItem(indice: number): void {
        this.gravar(this.itensDe().filter((_, posicao) => posicao !== indice), "Remover item");
    }

    /** Põe uma sublista de marcadores, com um item vazio, depois do que o item já tem, e pede o foco nele. */
    protected adicionarSublista(indice: number): void {
        const itens = this.itensDe();
        const bloco = itens[indice] ?? [];
        const sublista: Item[number] = {
            tipo: "lista", ordenada: false, inicio: 1, itens: [[{ tipo: "paragrafo", trechos: [] }]],
        };
        this.gravar(itens.map((item, posicao) => (posicao === indice ? [...bloco, sublista] : item)), "Adicionar sublista");
        this.oficina?.pedirFoco({
            identificador: this.dona() as string,
            campo: nomeDoCaminho([...this.caminhoDoBloco(indice, bloco.length), "itens", 0, 0, "trechos"]),
            posicao: "inicio",
        });
    }

    /** Só a sublista tem de onde sair: o caminho dela termina em `[..., "itens", item, bloco]`. */
    protected readonly ehSublista = computed(() => this.caminho().length > 0);

    protected removerSublista(): void {
        const caminho = this.caminho();
        const posicao = caminho.at(-1);
        if (typeof posicao !== "number") return;
        const caminhoDoItem = caminho.slice(0, -1);
        const dona = this.dona();
        const dados = dona ? this.oficina?.item(dona)?.dados : undefined;
        const bloco = lerNoCaminho(dados, caminhoDoItem);
        if (!Array.isArray(bloco)) return;
        this.oficina?.alterarCampo(dona as string, caminhoDoItem,
            bloco.filter((_, indice) => indice !== posicao), "Remover sublista", false);
    }
}
