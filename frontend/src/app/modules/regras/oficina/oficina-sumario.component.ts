import {
    CdkDrag, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, CdkDropList,
    type CdkDragDrop, type CdkDragMove, type CdkDragSortEvent,
} from "@angular/cdk/drag-drop";
import {
    Component, ElementRef, Injector, ViewEncapsulation, afterNextRender, computed, inject, output, signal,
} from "@angular/core";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";

import { Icone } from "../../../shared/icone/icone.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import type { LinhaSumario, ResultadoDoDestino, TeclaDeEstrutura } from "./oficina-estrutura";
import { OficinaStore } from "./oficina.store";

/** Largura de um nível de recuo, em px: é também a distância de arrasto que muda a profundidade. */
const RECUO_PX = 18;

const GLIFO: Readonly<Partial<Record<TipoRegraPecaEnum, string>>> = {
    [TipoRegraPecaEnum.SECAO]: "⬡", [TipoRegraPecaEnum.CLASSE]: "⬥", [TipoRegraPecaEnum.SUBCLASSE]: "⬥",
    [TipoRegraPecaEnum.ARQUETIPO]: "◻",
};

const TECLAS: Readonly<Record<string, TeclaDeEstrutura>> = {
    ArrowUp: "subir", ArrowDown: "descer", ArrowLeft: "recuar", ArrowRight: "avancar",
};

/**
 * Sumário da Oficina (m11-07): as seções, classes, subclasses e arquétipos da cópia de trabalho, na
 * ordem do livro. Arrastar pela alça (`@angular/cdk/drag-drop`) reordena e muda de pai; a distância
 * horizontal escolhe o nível. A alternativa por teclado é Alt + setas (↑ ↓ sobem e descem, ← sai do
 * pai, → entra na irmã de cima), e F2 (ou o botão) renomeia: o nome novo gera a âncora nova e a
 * antiga continua valendo. Só movimentos que a tabela de aninhamento permite são aceitos.
 */
@Component({
    selector: "app-oficina-sumario",
    imports: [CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, Icone, BotaoIcone],
    templateUrl: "./oficina-sumario.component.html",
    styleUrl: "./oficina-sumario.component.scss",
    encapsulation: ViewEncapsulation.None,
})
export class OficinaSumario {
    protected readonly store = inject(OficinaStore);
    private readonly notificacao = inject(NotificacaoService);
    private readonly injector = inject(Injector);
    private readonly raiz = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    /** Pede ao leitor para levar a tela à peça. */
    readonly irPara = output<string>();

    protected readonly recuo = RECUO_PX;
    protected readonly arrastando = signal<number | null>(null);
    protected readonly previa = signal<{ resultado: ResultadoDoDestino; profundidade: number } | null>(null);
    protected readonly renomeando = signal<string | null>(null);
    protected readonly anuncio = signal("");

    private posicaoAtual = 0;
    private distanciaX = 0;

    /** A lista do sumário; enquanto uma peça é arrastada, o que ela carrega junto some (vai com ela). */
    protected readonly linhas = computed<readonly LinhaSumario[]>(() => {
        const todas = this.store.linhasSumario();
        const id = this.arrastando();
        if (id === null) return todas;
        const indice = todas.findIndex((linha) => linha.id === id);
        if (indice < 0) return todas;
        let fim = indice + 1;
        while (fim < todas.length && todas[fim].profundidade > todas[indice].profundidade) fim++;
        return [...todas.slice(0, indice + 1), ...todas.slice(fim)];
    });

    protected glifo(linha: LinhaSumario): string {
        return GLIFO[linha.tipo] ?? "";
    }

    protected nomeBruto(linha: LinhaSumario): string {
        const dados = this.store.item(linha.identificador)?.dados as unknown as Record<string, unknown> | undefined;
        return String(dados?.["titulo"] ?? dados?.["nome"] ?? "");
    }

    protected textoDaPrevia(): string {
        const previa = this.previa();
        if (!previa) return "";
        if (!previa.resultado.ok) return previa.resultado.motivo;
        const pai = previa.resultado.destino.pecaPaiId;
        const nomePai = pai === null ? "a raiz do livro" : (this.rotuloDe(pai) || "peça sem nome");
        return `Fica dentro de ${nomePai}`;
    }

    private rotuloDe(id: number): string {
        return this.store.linhasSumario().find((linha) => linha.id === id)?.rotulo ?? "";
    }

    // ------------------------------------------------------------ arrastar

    protected iniciar(linha: LinhaSumario): void {
        this.arrastando.set(linha.id);
        this.posicaoAtual = this.store.linhasSumario().findIndex((candidata) => candidata.id === linha.id);
        this.distanciaX = 0;
        this.atualizarPrevia(linha);
    }

    protected ordenou(evento: CdkDragSortEvent<readonly LinhaSumario[]>): void {
        this.posicaoAtual = evento.currentIndex;
        this.atualizarPrevia(evento.item.data as unknown as LinhaSumario);
    }

    protected moveu(linha: LinhaSumario, evento: CdkDragMove<LinhaSumario>): void {
        this.distanciaX = evento.distance.x;
        this.atualizarPrevia(linha);
    }

    private profundidadeDesejada(linha: LinhaSumario, distanciaX: number): number {
        return Math.max(0, linha.profundidade + Math.round(distanciaX / RECUO_PX));
    }

    private atualizarPrevia(linha: LinhaSumario): void {
        const desejada = this.profundidadeDesejada(linha, this.distanciaX);
        const resultado = this.store.destinoDoArraste(linha.identificador, this.posicaoAtual, desejada);
        this.previa.set({ resultado, profundidade: resultado.ok ? resultado.destino.profundidade : desejada });
    }

    protected terminar(): void {
        this.arrastando.set(null);
        this.previa.set(null);
    }

    protected async soltar(evento: CdkDragDrop<readonly LinhaSumario[]>): Promise<void> {
        const linha = evento.item.data as LinhaSumario;
        const desejada = this.profundidadeDesejada(linha, evento.distance.x);
        const resultado = this.store.destinoDoArraste(linha.identificador, evento.currentIndex, desejada);
        await this.aplicar(linha, resultado, "movida");
    }

    // ------------------------------------------------------------- teclado

    protected aoTeclar(evento: KeyboardEvent, linha: LinhaSumario): void {
        if (evento.key === "F2") {
            evento.preventDefault();
            this.iniciarRenomeacao(linha);
            return;
        }
        const tecla = evento.altKey && !evento.ctrlKey && !evento.metaKey ? TECLAS[evento.key] : undefined;
        if (!tecla) return;
        evento.preventDefault();
        void this.aplicar(linha, this.store.destinoDeTeclado(linha.identificador, tecla), "movida");
    }

    private async aplicar(linha: LinhaSumario, resultado: ResultadoDoDestino, verbo: string): Promise<void> {
        const nome = linha.rotulo || "A peça";
        if (!resultado.ok) {
            this.anuncio.set(resultado.motivo);
            this.notificacao.notificar({ severidade: "aviso", resumo: "Não dá para mover aí", detalhe: resultado.motivo });
            return;
        }
        if (resultado.semMudanca) return;
        const moveu = await this.store.moverPara(linha.identificador, resultado.destino.pecaPaiId, resultado.destino.indice);
        if (!moveu) return;
        const pai = resultado.destino.pecaPaiId;
        this.anuncio.set(`${nome} ${verbo} para ${pai === null ? "a raiz do livro" : `dentro de ${this.rotuloDe(pai) || "uma peça sem nome"}`}.`);
        this.focarLinha(linha.identificador);
    }

    private focarLinha(identificador: string): void {
        afterNextRender(() => this.raiz.querySelector<HTMLElement>(`[data-sumario-peca="${identificador}"]`)?.focus(),
            { injector: this.injector });
    }

    // ----------------------------------------------------------- renomear

    protected iniciarRenomeacao(linha: LinhaSumario): void {
        this.renomeando.set(linha.identificador);
        afterNextRender(() => {
            const campo = this.raiz.querySelector<HTMLInputElement>(".oficina-sumario__campo");
            campo?.focus();
            campo?.select();
        }, { injector: this.injector });
    }

    protected async confirmarRenomeacao(linha: LinhaSumario, valor: string): Promise<void> {
        if (this.renomeando() !== linha.identificador) return;
        this.renomeando.set(null);
        const nome = valor.trim();
        if (nome && nome !== this.nomeBruto(linha).trim()) {
            if (await this.store.renomear(linha.identificador, nome)) {
                this.anuncio.set(`Peça renomeada para ${nome}. O link antigo continua valendo.`);
            }
        }
        this.focarLinha(linha.identificador);
    }

    protected cancelarRenomeacao(linha: LinhaSumario): void {
        if (this.renomeando() !== linha.identificador) return;
        this.renomeando.set(null);
        this.focarLinha(linha.identificador);
    }
}
