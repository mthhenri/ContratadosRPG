import { Component, computed, inject, input } from "@angular/core";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";

import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { BarraFerramentas } from "../../../shared/ui/barra-ferramentas/barra-ferramentas.component";
import { BarraFerramentasSeparador } from "../../../shared/ui/barra-ferramentas/barra-ferramentas-separador.component";
import { OficinaStore } from "./oficina.store";

/**
 * Casca de uma peça na Oficina (m11-06): marca a peça (`data-peca-oficina`), a seleciona ao clicar
 * ou focar, mostra as pendências dela e, selecionada, as ferramentas (REAÇÃO, mover, duplicar,
 * remover). Fora da Oficina, ou num bloco sem peça, é transparente (`display: contents`).
 */
@Component({
    selector: "app-oficina-peca",
    imports: [Botao, BotaoIcone, Icone, Tooltip, BarraFerramentas, BarraFerramentasSeparador],
    templateUrl: "./oficina-peca.component.html",
    styleUrl: "./oficina-peca.component.scss",
    host: {
        "[class.oficina-peca]": "ativa()",
        "[class.oficina-peca--selecionada]": "selecionada()",
        "[class.oficina-peca--pendencia]": "pendencias().length > 0",
        "[attr.data-peca-oficina]": "ativa() ? peca() : null",
        "(click)": "aoClicar($event)",
        "(focusin)": "aoFocar($event)",
    },
})
export class OficinaPeca {
    /** `identificador` da peça que este bloco mostra (`undefined`: bloco sem peça). */
    readonly peca = input<string | undefined>(undefined);
    /** Blocos que não viram peça selecionável (seções: estruturar é a m11-07). */
    readonly semFerramentas = input(false);

    protected readonly store = inject(OficinaStore, { optional: true });
    protected readonly ativa = computed(() => !!this.store && this.store.estado() !== "inativo" && !!this.peca()
        && !this.semFerramentas());
    protected readonly selecionada = computed(() => this.ativa() && this.store?.selecionada() === this.peca());
    protected readonly pendencias = computed(() =>
        this.ativa() ? (this.store?.pendenciasPorPeca().get(this.peca() as string) ?? []) : []);
    protected readonly mensagemPendencia = computed(() =>
        this.pendencias().map((pendencia) => pendencia.mensagem).join(" "));
    protected readonly item = computed(() => {
        this.store?.itens();
        return this.ativa() ? this.store?.item(this.peca() as string) : undefined;
    });
    protected readonly ehHabilidade = computed(() => this.item()?.tipo === TipoRegraPecaEnum.HABILIDADE);
    protected readonly reacao = computed(() => {
        const dados = this.item()?.dados as { reacao?: boolean } | undefined;
        return dados?.reacao === true;
    });
    protected readonly posicao = computed(() => {
        this.store?.itens();
        return this.ativa() ? (this.store?.posicaoEntreIrmas(this.peca() as string) ?? null) : null;
    });
    protected readonly podeEstruturar = computed(() => {
        this.store?.itens();
        return this.ativa() && !!this.store?.podeDuplicarOuRemover(this.peca() as string);
    });
    protected readonly podeSubir = computed(() => (this.posicao()?.indice ?? 0) > 0);
    protected readonly podeDescer = computed(() => {
        const posicao = this.posicao();
        return !!posicao && posicao.indice < posicao.total - 1;
    });

    /** Só a casca mais interna reage: o evento já chegou à peça certa. */
    private maisInterna(evento: Event, host: EventTarget | null): boolean {
        const alvo = evento.target as HTMLElement | null;
        return alvo?.closest("app-oficina-peca.oficina-peca") === host;
    }

    protected aoClicar(evento: MouseEvent): void {
        if (!this.ativa() || !this.maisInterna(evento, evento.currentTarget)) return;
        this.store?.selecionar(this.peca() as string);
    }

    protected aoFocar(evento: FocusEvent): void {
        if (!this.ativa() || !this.maisInterna(evento, evento.currentTarget)) return;
        this.store?.selecionar(this.peca() as string);
    }

    protected alternarReacao(): void {
        const item = this.item();
        if (!item || !this.store) return;
        this.store.alterarDados(item.identificador, { ...item.dados, reacao: !this.reacao() } as typeof item.dados,
            { rotulo: "Reação", chave: `${item.identificador}:reacao` });
        void this.store.salvarAgora(item.id);
    }

    protected mover(direcao: -1 | 1): void {
        void this.store?.mover(this.peca() as string, direcao);
    }

    protected duplicar(): void {
        void this.store?.duplicar(this.peca() as string);
    }

    protected remover(): void {
        void this.store?.remover(this.peca() as string);
    }
}
