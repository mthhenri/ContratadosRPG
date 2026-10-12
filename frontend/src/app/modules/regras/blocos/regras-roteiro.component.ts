import { Component, computed, forwardRef, inject, input, output } from "@angular/core";
import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasDocumento, RegrasRoteiro as Roteiro } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { RegrasConteudoRender } from "./regras-conteudo.component";

type Etapa = Roteiro["etapas"][number];

@Component({
    selector: "app-regras-roteiro",
    imports: [RegrasInline, Botao, BotaoIcone, Icone, Tooltip, forwardRef(() => RegrasConteudoRender)],
    templateUrl: "./regras-roteiro.component.html",
    styleUrl: "./regras-guia.scss",
})
export class RegrasRoteiro {
    readonly bloco = input.required<Roteiro>();
    readonly documento = input<RegrasDocumento["id"]>("guia");
    readonly navegarAncora = output<string>();
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    /** Adicionar e remover etapa só aparecem com o roteiro selecionado. */
    protected readonly selecionado = computed(() => this.editando() && this.oficina?.selecionada() === this.bloco().peca);

    /** As etapas vêm do store, não do template: uma digitação recém-entregue não pode ser sobrescrita. */
    private etapasDe(): readonly Etapa[] {
        const dados = this.oficina?.item(this.bloco().peca as string)?.dados as { etapas?: readonly Etapa[] } | undefined;
        return dados?.etapas ?? this.bloco().etapas;
    }

    private gravar(etapas: readonly Etapa[], rotulo: string): void {
        const numeradas = etapas.map((etapa, indice) => ({ ...etapa, ordem: indice + 1 }));
        this.oficina?.alterarCampo(this.bloco().peca as string, ["etapas"], numeradas, rotulo, false);
    }

    protected adicionarEtapa(): void {
        this.gravar([...this.etapasDe(), { ordem: 0, titulo: [], descricao: [] }], "Adicionar etapa");
    }

    protected removerEtapa(indice: number): void {
        this.gravar(this.etapasDe().filter((_, posicao) => posicao !== indice), "Remover etapa");
    }
}
