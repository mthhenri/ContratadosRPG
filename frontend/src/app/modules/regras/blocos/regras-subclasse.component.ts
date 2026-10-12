import { Component, computed, forwardRef, inject, input, output } from "@angular/core";
import { RegrasLeitorContexto } from "../regras-leitor-contexto";
import { RegrasDocumento, RegrasSubclasse as BlocoSubclasse } from "../regras.model";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { Icone } from "../../../shared/icone/icone.component";
import { RegrasInline } from "./regras-inline.component";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { RegrasSaude } from "./regras-saude.component";
import { RegrasDestaque } from "./regras-destaque.component";
import { recuperarIconeIdentidade } from "./regras-identidade-icone";
import { lerTextoRegras } from "./regras-texto";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";

/** Dossiê de subclasse de Experimento, no desenho de classe/arquétipo do exemplão M10. */
@Component({
    selector: "app-regras-subclasse",
    imports: [
        Cartao, Chip, Icone, RegrasInline, RegrasSaude, RegrasDestaque, OficinaTexto, Botao, BotaoIcone, Tooltip,
        forwardRef(() => RegrasConteudoRender),
    ],
    templateUrl: "./regras-subclasse.component.html",
    styleUrl: "./regras-subclasse.component.scss",
})
export class RegrasSubclasse {
    readonly bloco = input.required<BlocoSubclasse>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    private readonly contexto = inject(RegrasLeitorContexto, { optional: true });
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    protected readonly selecionada = computed(() => this.editando() && this.oficina?.selecionada() === this.bloco().peca);
    protected readonly identificador = computed(() => {
        const ancora = this.bloco().ancora;
        return ancora ? this.contexto?.identificar(ancora) ?? ancora : null;
    });
    protected readonly icone = computed(() => recuperarIconeIdentidade(this.bloco().nome));
    /** Um selo por bônus ("+1 em Força"), sem reescrever o texto da fonte. */
    protected readonly bonus = computed(() =>
        lerTextoRegras(this.bloco().atributosBonus).trim().split(/\s+(?=\+\d)/).filter(Boolean));

    /** Custos vêm do store, não do template: uma digitação recém-entregue não pode ser sobrescrita. */
    private custosDe(): readonly (readonly unknown[])[] {
        const dados = this.oficina?.item(this.bloco().peca as string)?.dados as { custos?: readonly (readonly unknown[])[] } | undefined;
        return dados?.custos ?? this.bloco().custos;
    }

    protected adicionarCusto(): void {
        this.oficina?.alterarCampo(this.bloco().peca as string, ["custos"], [...this.custosDe(), []], "Adicionar custo", false);
    }

    protected removerCusto(indice: number): void {
        this.oficina?.alterarCampo(this.bloco().peca as string, ["custos"],
            this.custosDe().filter((_, posicao) => posicao !== indice), "Remover custo", false);
    }
}
