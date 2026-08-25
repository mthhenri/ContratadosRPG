import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    effect,
    inject,
    input,
    signal,
    untracked,
    viewChild,
} from "@angular/core";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

const ZOOM_MINIMO = 0.5;
const ZOOM_MAXIMO = 3;
const ZOOM_PASSO = 0.25;

let workerConfigurado = false;

/**
 * Fallback do mobile para o leitor de documentos (m3-72 delega ao iframe nativo, mas o Edge
 * mobile não incorpora PDF e bloqueia o download automático que o plugin nativo precisaria —
 * a janela ficava em branco). Renderiza o PDF em canvas via pdfjs-dist, sem camada de texto
 * (sem seleção/busca — decisão explícita, é o que causou a duplicação visual que motivou a
 * reversão anterior do PDF.js) e com escala ajustada ao devicePixelRatio para manter nitidez.
 * O desktop continua no iframe nativo (LeitorDocumentos).
 */
@Component({
    selector: "app-leitor-pdf-mobile",
    standalone: true,
    imports: [],
    templateUrl: "./leitor-pdf-mobile.component.html",
    styleUrl: "./leitor-pdf-mobile.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        "(window:resize)": "renderizarPaginaAtual()",
    },
})
export class LeitorPdfMobile {
    readonly url = input.required<string>();
    readonly titulo = input.required<string>();

    protected readonly zoomMinimo = ZOOM_MINIMO;
    protected readonly zoomMaximo = ZOOM_MAXIMO;

    protected readonly pagina = signal(1);
    protected readonly totalPaginas = signal(0);
    protected readonly zoomFator = signal(1);
    protected readonly carregando = signal(true);
    protected readonly erro = signal(false);

    private readonly area = viewChild<ElementRef<HTMLElement>>("area");
    private readonly tela = viewChild<ElementRef<HTMLCanvasElement>>("tela");

    private documento: PDFDocumentProxy | null = null;
    private tarefaRenderizacao: RenderTask | null = null;
    private geracao = 0;

    constructor() {
        effect(() => {
            const url = this.url();
            untracked(() => void this.carregarDocumento(url));
        });

        inject(DestroyRef).onDestroy(() => {
            this.geracao++;
            this.tarefaRenderizacao?.cancel();
            void this.documento?.loadingTask.destroy();
        });
    }

    protected paginaAnterior(): void {
        if (this.pagina() <= 1) return;
        this.pagina.update((valor) => valor - 1);
        void this.renderizarPaginaAtual();
    }

    protected proximaPagina(): void {
        if (this.pagina() >= this.totalPaginas()) return;
        this.pagina.update((valor) => valor + 1);
        void this.renderizarPaginaAtual();
    }

    protected diminuirZoom(): void {
        this.zoomFator.update((valor) => Math.max(ZOOM_MINIMO, arredondar(valor - ZOOM_PASSO)));
        void this.renderizarPaginaAtual();
    }

    protected aumentarZoom(): void {
        this.zoomFator.update((valor) => Math.min(ZOOM_MAXIMO, arredondar(valor + ZOOM_PASSO)));
        void this.renderizarPaginaAtual();
    }

    private async carregarDocumento(url: string): Promise<void> {
        const geracaoAtual = ++this.geracao;
        const documentoAnterior = this.documento;
        this.documento = null;
        this.carregando.set(true);
        this.erro.set(false);
        this.tarefaRenderizacao?.cancel();

        try {
            const pdfjsLib = await import("pdfjs-dist");
            configurarWorker(pdfjsLib);
            const documento = await pdfjsLib.getDocument({ url }).promise;

            if (geracaoAtual !== this.geracao) {
                void documento.loadingTask.destroy();
                return;
            }

            void documentoAnterior?.loadingTask.destroy();
            this.documento = documento;
            this.totalPaginas.set(documento.numPages);
            this.pagina.set(1);
            this.zoomFator.set(1);
            this.carregando.set(false);
            await this.renderizarPaginaAtual();
        } catch {
            if (geracaoAtual !== this.geracao) return;
            void documentoAnterior?.loadingTask.destroy();
            this.carregando.set(false);
            this.erro.set(true);
        }
    }

    protected async renderizarPaginaAtual(): Promise<void> {
        const documento = this.documento;
        const canvas = this.tela()?.nativeElement;
        const area = this.area()?.nativeElement;
        if (!documento || !canvas || !area) return;

        const geracaoAtual = this.geracao;
        this.tarefaRenderizacao?.cancel();

        const pagina = await documento.getPage(this.pagina());
        if (geracaoAtual !== this.geracao) return;

        const viewportBase = pagina.getViewport({ scale: 1 });
        const escalaAjuste = area.clientWidth > 0 ? area.clientWidth / viewportBase.width : 1;
        const viewport = pagina.getViewport({ scale: escalaAjuste * this.zoomFator() });

        const contexto = canvas.getContext("2d");
        if (!contexto) return;

        const escalaSaida = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * escalaSaida);
        canvas.height = Math.floor(viewport.height * escalaSaida);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const tarefa = pagina.render({
            canvasContext: contexto,
            viewport,
            transform: escalaSaida !== 1 ? [escalaSaida, 0, 0, escalaSaida, 0, 0] : undefined,
        });
        this.tarefaRenderizacao = tarefa;

        try {
            await tarefa.promise;
        } catch {
            // Renderização cancelada por uma navegação de página ou zoom mais recente.
        }
    }
}

function configurarWorker(pdfjsLib: typeof import("pdfjs-dist")): void {
    if (workerConfigurado) return;
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";
    workerConfigurado = true;
}

function arredondar(valor: number): number {
    return Math.round(valor * 100) / 100;
}
