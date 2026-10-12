import { Component, computed, effect, inject, output, signal, untracked } from "@angular/core";
import type { LivroComparacaoDto, LivroMudancaDto } from "@contratados-rpg/shared/dtos/livro";
import { LivroMudancaSituacaoEnum, LivroTextoOperacaoEnum, TipoLivroVersaoSituacaoEnum } from "@contratados-rpg/shared/enums";

import { Campo } from "../../../shared/ui/campo/campo.component";
import { Chip, type ChipSeveridade } from "../../../shared/ui/chip/chip.component";
import { Segmentado } from "../../../shared/ui/segmentado/segmentado.component";
import { SegmentadoItem } from "../../../shared/ui/segmentado/segmentado-item.component";
import { NOME_DO_TIPO } from "./oficina-estrutura";
import { ROTULO_DA_SITUACAO, contarPorSituacao, rotuloDoCampo, semFilhasDeNovasOuRemovidas, valorCurto } from "./oficina-mudancas-texto";
import { OficinaMudancas } from "./oficina-mudancas.service";
import { OficinaStore } from "./oficina.store";

type Modo = "edicao" | "historico";

/**
 * Conteúdo da gaveta "O que mudou" (m11-09). Duas abas: *Edição × publicada* (a cópia de trabalho contra a última
 * versão publicada; clicar numa mudança leva à peça) e *Histórico* (duas versões quaisquer). A lista é classificada em
 * nova, removida, alterada (campo a campo, texto palavra a palavra) e movida, com o caminho da peça. Só apresenta o
 * `OficinaMudancas`.
 */
@Component({
    selector: "app-oficina-mudancas",
    imports: [Segmentado, SegmentadoItem, Campo, Chip],
    templateUrl: "./oficina-mudancas.component.html",
    styleUrl: "./oficina-mudancas.component.scss",
})
export class OficinaMudancasLista {
    protected readonly mudancas = inject(OficinaMudancas);
    private readonly store = inject(OficinaStore);
    /** Pedido de ir até a peça (aba Edição); quem hospeda fecha a gaveta e navega. */
    readonly irPara = output<string>();

    protected readonly modo = signal<Modo>("edicao");
    protected readonly versaoAntes = signal<number | null>(null);
    protected readonly versaoDepois = signal<number | null>(null);
    protected readonly historico = signal<LivroComparacaoDto | null>(null);
    protected readonly carregandoHistorico = signal(false);
    protected readonly falhaHistorico = signal(false);
    protected readonly Situacao = LivroMudancaSituacaoEnum;
    protected readonly Operacao = LivroTextoOperacaoEnum;
    protected readonly rotuloSituacao = ROTULO_DA_SITUACAO;
    protected readonly severidade: Readonly<Record<LivroMudancaSituacaoEnum, ChipSeveridade>> = {
        [LivroMudancaSituacaoEnum.NOVA]: "sucesso",
        [LivroMudancaSituacaoEnum.REMOVIDA]: "perigo",
        [LivroMudancaSituacaoEnum.ALTERADA]: "aviso",
        [LivroMudancaSituacaoEnum.MOVIDA]: "secundario",
    };
    protected readonly rotuloCampo = rotuloDoCampo;
    protected readonly valor = valorCurto;
    private geracao = 0;

    protected readonly comparacao = computed(() => this.modo() === "edicao" ? this.mudancas.comparacao() : this.historico());
    /** As filhas de uma peça nova não aparecem separadas: a nova já as leva (nas duas abas). */
    protected readonly lista = computed<readonly LivroMudancaDto[]>(() =>
        this.modo() === "edicao" ? this.mudancas.visiveis() : semFilhasDeNovasOuRemovidas(this.historico()?.mudancas ?? []));
    /** O resumo conta o que a lista mostra. */
    protected readonly resumo = computed(() => this.comparacao() ? contarPorSituacao(this.lista()) : null);
    protected readonly publicadaNumero = computed(() => this.mudancas.publicada()?.numero ?? null);

    constructor() {
        effect(() => {
            const versoes = this.mudancas.versoes();
            untracked(() => {
                if (versoes.length === 0) return;
                if (this.versaoDepois() === null) this.versaoDepois.set(versoes[0].id);
                if (this.versaoAntes() === null) this.versaoAntes.set((versoes[1] ?? versoes[0]).id);
            });
        });
        effect(() => {
            const modo = this.modo();
            const antes = this.versaoAntes();
            const depois = this.versaoDepois();
            untracked(() => {
                if (modo === "historico" && antes !== null && depois !== null) void this.carregarHistorico(antes, depois);
            });
        });
    }

    private async carregarHistorico(antes: number, depois: number): Promise<void> {
        const geracao = ++this.geracao;
        this.carregandoHistorico.set(true);
        this.falhaHistorico.set(false);
        try {
            const resultado = await this.mudancas.comparar(antes, depois);
            if (geracao === this.geracao) this.historico.set(resultado);
        } catch {
            if (geracao === this.geracao) {
                this.historico.set(null);
                this.falhaHistorico.set(true);
            }
        } finally {
            if (geracao === this.geracao) this.carregandoHistorico.set(false);
        }
    }

    protected rotuloVersao(versao: { numero: string; situacao: TipoLivroVersaoSituacaoEnum }): string {
        return `${versao.numero} · ${versao.situacao === TipoLivroVersaoSituacaoEnum.PUBLICADA ? "publicada" : "rascunho"}`;
    }

    protected nome(mudanca: LivroMudancaDto): string {
        const titulo = mudanca.caminho.at(-1);
        if (titulo && titulo !== mudanca.tipo) return titulo;
        // Peça sem título (parágrafo, nota…): o começo do texto a identifica; a removida cai no nome do tipo.
        const dados = this.store.item(mudanca.identificador)?.dados as { trechos?: readonly unknown[] } | undefined;
        const inicio = dados?.trechos ? valorCurto(dados.trechos) : "—";
        return inicio !== "—" ? (inicio.length > 70 ? `${inicio.slice(0, 70)}…` : inicio) : (NOME_DO_TIPO[mudanca.tipo] ?? "Peça");
    }

    protected onde(mudanca: LivroMudancaDto): string {
        const pai = mudanca.caminho.slice(0, -1).join(" › ");
        return pai || "Raiz do livro";
    }

    protected tipo(mudanca: LivroMudancaDto): string {
        return NOME_DO_TIPO[mudanca.tipo] ?? mudanca.tipo.toLowerCase().replace(/_/g, " ");
    }

    protected podeIr(mudanca: LivroMudancaDto): boolean {
        return this.modo() === "edicao" && mudanca.situacao !== LivroMudancaSituacaoEnum.REMOVIDA;
    }

    protected ir(mudanca: LivroMudancaDto): void {
        if (this.podeIr(mudanca)) this.irPara.emit(mudanca.identificador);
    }

    protected escolherVersao(lado: "antes" | "depois", evento: Event): void {
        const id = Number((evento.target as HTMLSelectElement).value);
        (lado === "antes" ? this.versaoAntes : this.versaoDepois).set(id);
    }

    protected textoDoPosicao(mudanca: LivroMudancaDto): string {
        const posicao = mudanca.posicao;
        if (!posicao) return "";
        return posicao.paiAntes !== posicao.paiDepois
            ? "Mudou de lugar no livro." : `Passou da posição ${posicao.ordemAntes + 1} para a ${posicao.ordemDepois + 1}.`;
    }
}
