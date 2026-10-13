import { Component, computed, inject, input } from "@angular/core";
import { TipoRegraPecaEnum as Tipo } from "@contratados-rpg/shared/enums";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { Segmentado } from "../../../shared/ui/segmentado/segmentado.component";
import { SegmentadoItem } from "../../../shared/ui/segmentado/segmentado-item.component";
import { StepInput } from "../../../shared/ui/stepper/step-input.component";
import { lerNoCaminho, type CaminhoDeDados } from "./oficina-dados";
import {
    propriedadesDaLista,
    propriedadesDaPeca,
    type Propriedade,
    type PropriedadeAlternar,
    type PropriedadeNumero,
    type PropriedadeOpcoes,
} from "./oficina-propriedades";
import { OficinaStore } from "./oficina.store";

/**
 * Faixa de propriedades estruturais da peça selecionada (`oficina-edicao-blocos-restantes`, fatia 5): glifo,
 * nível, variante, tipo de lista… — o que muda a apresentação e não o texto. Sem `caminhoDaLista` mostra as da
 * própria peça (`propriedadesDaPeca`); com ele, as da lista (raiz ou sublista) que mora nesse caminho do `dados`.
 * Fora da Oficina, sem a peça selecionada ou num tipo sem propriedades, não desenha nada.
 */
@Component({
    selector: "app-oficina-propriedades",
    imports: [Botao, Segmentado, SegmentadoItem, StepInput, Tooltip],
    templateUrl: "./oficina-propriedades.component.html",
    styleUrl: "./oficina-propriedades.component.scss",
})
export class OficinaPropriedades {
    /** `identificador` da peça dona dos dados. */
    readonly peca = input<string | undefined>(undefined);
    /** Onde a lista mora no `dados` da peça; ausente: as propriedades são da própria peça. */
    readonly caminhoDaLista = input<CaminhoDeDados | undefined>(undefined);

    private readonly store = inject(OficinaStore, { optional: true });

    protected readonly propriedades = computed<readonly Propriedade[]>(() => {
        const identificador = this.peca();
        if (!identificador || this.store?.estado() !== "ok" || this.store.selecionada() !== identificador) return [];
        const item = this.store.item(identificador);
        if (!item) return [];
        const dados = item.dados as unknown as Record<string, unknown>;
        const base = this.caminhoDaLista();
        if (base) {
            const lista = lerNoCaminho(dados, base);
            return lista && typeof lista === "object" ? propriedadesDaLista(lista as Record<string, unknown>, base) : [];
        }
        return propriedadesDaPeca(item.tipo as Tipo, dados, this.tipoDoPai());
    });

    private tipoDoPai(): Tipo | null {
        const item = this.store?.item(this.peca() as string);
        const pai = item ? this.store?.pai(item) : undefined;
        return (pai?.tipo as Tipo | undefined) ?? null;
    }

    protected escolher(propriedade: PropriedadeOpcoes, valor: unknown): void {
        if (valor === propriedade.atual) return;
        this.gravar(propriedade.caminho, valor, propriedade.passo);
    }

    protected alternar(propriedade: PropriedadeAlternar): void {
        this.gravar(propriedade.caminho, propriedade.atual ? undefined : true, propriedade.passo);
    }

    protected alterarNumero(propriedade: PropriedadeNumero, valor: number): void {
        if (!Number.isInteger(valor) || valor < propriedade.min || valor > propriedade.max
            || valor === propriedade.atual) return;
        this.gravar(propriedade.caminho, valor, propriedade.passo);
    }

    /** Muda a marca de habilidade inicial para esta: a anterior sai, para continuar existindo uma só. */
    protected tornarInicial(): void {
        const identificador = this.peca();
        const store = this.store;
        const item = identificador ? store?.item(identificador) : undefined;
        if (!identificador || !store || !item) return;
        store.alterarCampo(identificador, ["melhorada"], undefined, "Habilidade inicial", false);
        store.alterarCampo(identificador, ["inicial"], true, "Habilidade inicial", false);
        for (const irma of store.irmas(item)) {
            if (irma.id !== item.id && (irma.dados as unknown as { inicial?: boolean }).inicial === true) {
                store.alterarCampo(irma.identificador, ["inicial"], undefined, "Habilidade inicial", false);
            }
        }
    }

    private gravar(caminho: CaminhoDeDados, valor: unknown, passo: string): void {
        this.store?.alterarCampo(this.peca() as string, caminho, valor, passo, false);
    }
}
