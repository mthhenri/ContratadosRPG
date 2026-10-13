import { Component, computed, inject, input, output } from "@angular/core";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { StepInput } from "../../../shared/ui/stepper/step-input.component";
import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasDocumento, RegrasNiveisAmeaca as Niveis } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { RegrasAmeaca } from "./regras-ameaca.component";

type Nivel = Niveis["niveis"][number];

const NIVEL_MINIMO = 0;
const NIVEL_MAXIMO = 7;

/**
 * Níveis de ameaça. Na Oficina o número do nível é um `app-step-input` (0–7, `["niveis", i, "nivel"]`) e o selo
 * `NA n` acompanha; com o bloco selecionado aparecem "Remover nível" e "+ Nível". A `referenciaImagem` é um
 * identificador interno da importação (ex.: `image1`), nunca desenhado: a edição a preserva e um nível novo a leva vazia.
 * Repetido ou fora de 0–7 vira pendência do validador, não bloqueio aqui.
 */
@Component({
    selector: "app-regras-niveis-ameaca",
    imports: [Botao, BotaoIcone, Cartao, StepInput, Icone, Tooltip, RegrasInline, RegrasAmeaca],
    templateUrl: "./regras-niveis-ameaca.component.html",
    styleUrl: "./regras-niveis-ameaca.component.scss",
})
export class RegrasNiveisAmeaca {
    readonly bloco = input.required<Niveis>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    private readonly oficina = inject(OficinaStore, { optional: true });

    protected readonly nivelMinimo = NIVEL_MINIMO;
    protected readonly nivelMaximo = NIVEL_MAXIMO;
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    protected readonly selecionada = computed(() =>
        this.editando() && this.oficina?.selecionada() === this.bloco().peca);
    /** Há número livre de 0 a 7 para um nível novo. */
    protected readonly podeAdicionar = computed(() => this.proximoNumeroLivre(this.niveisDe()) !== null);

    /** Os níveis vêm do store, não do template: uma digitação recém-entregue não pode ser sobrescrita. */
    private niveisDe(): readonly Nivel[] {
        const dados = this.oficina?.item(this.bloco().peca as string)?.dados as { niveis?: readonly Nivel[] } | undefined;
        return dados?.niveis ?? this.bloco().niveis;
    }

    private proximoNumeroLivre(niveis: readonly Nivel[]): number | null {
        const usados = new Set(niveis.map((nivel) => nivel.nivel));
        for (let numero = NIVEL_MINIMO; numero <= NIVEL_MAXIMO; numero++) {
            if (!usados.has(numero)) return numero;
        }
        return null;
    }

    protected alterarNivel(indice: number, valor: number): void {
        if (!Number.isInteger(valor) || valor < NIVEL_MINIMO || valor > NIVEL_MAXIMO
            || valor === this.niveisDe()[indice]?.nivel) return;
        this.oficina?.alterarCampo(this.bloco().peca as string, ["niveis", indice, "nivel"], valor,
            "Nível de ameaça", false);
    }

    protected adicionar(): void {
        const niveis = this.niveisDe();
        const numero = this.proximoNumeroLivre(niveis);
        if (numero === null) return;
        this.oficina?.alterarCampo(this.bloco().peca as string, ["niveis"],
            [...niveis, { nivel: numero, referenciaImagem: "", descricao: [] }], "Adicionar nível de ameaça", false);
        this.oficina?.pedirFoco({
            identificador: this.bloco().peca as string, campo: `niveis.${niveis.length}.descricao`, posicao: "inicio",
        });
    }

    protected remover(indice: number): void {
        this.oficina?.alterarCampo(this.bloco().peca as string, ["niveis"],
            this.niveisDe().filter((_, posicao) => posicao !== indice), "Remover nível de ameaça", false);
    }
}
