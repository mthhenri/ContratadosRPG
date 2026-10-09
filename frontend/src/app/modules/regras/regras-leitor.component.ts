import { NgTemplateOutlet } from "@angular/common";
import {
    ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector,
    afterNextRender, computed, effect, inject, input, output, signal, untracked,
} from "@angular/core";
import { Subscription } from "rxjs";

import { Gaveta } from "../../shared/ui/gaveta/gaveta.component";
import { RegrasLeituraStore } from "./regras-leitura.store";
import { RegrasLeitorContexto } from "./regras-leitor-contexto";
import { RegrasConsultaService } from "./regras-consulta.service";
import { RegrasPesquisaController } from "./regras-pesquisa.controller";
import { RegrasImpressaoService } from "./regras-impressao.service";
import { RegrasPesquisa } from "./regras-pesquisa.component";
import { RegrasPesquisaProjecao } from "./regras-pesquisa-projecao.component";
import { BotaoIcone } from "../../shared/ui/botao-icone/botao-icone.component";
import { Tooltip } from "../../shared/tooltip/tooltip.directive";
import { Icone } from "../../shared/icone/icone.component";
import { Botao } from "../../shared/ui/botao/botao.component";
import { Cartao } from "../../shared/ui/cartao/cartao.component";
import { Esqueleto } from "../../shared/ui/esqueleto/esqueleto.component";
import { EstadoVazio } from "../../shared/ui/estado-vazio/estado-vazio.component";
import { NotificacaoService } from "../../shared/ui/notificacao/notificacao.service";
import { Segmentado } from "../../shared/ui/segmentado/segmentado.component";
import { SegmentadoItem } from "../../shared/ui/segmentado/segmentado-item.component";
import { observarSecaoRegras } from "./regras-navegacao";
import { RegrasConteudoRender } from "./blocos/regras-conteudo.component";
import { RegrasDocumento } from "./regras.model";
import { RegrasService } from "./regras.service";
import { construirSumarioRegras, listarAncorasRegras } from "./regras-sumario";

@Component({
    selector: "app-regras-leitor",
    providers: [RegrasLeitorContexto, RegrasPesquisaController],
    imports: [NgTemplateOutlet, Icone, Botao, Cartao, Esqueleto, EstadoVazio,
        Segmentado, SegmentadoItem, Gaveta, RegrasPesquisa, RegrasPesquisaProjecao,
        BotaoIcone, Tooltip,
        RegrasConteudoRender],
    templateUrl: "./regras-leitor.component.html",
    styleUrl: "./regras-leitor.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { "(window:resize)": "redimensionarViewport()",
        "(keydown)": "pesquisa.tratarTecla($event)" },
})
export class RegrasLeitor {
    readonly livro = input.required<RegrasDocumento["id"]>();
    private readonly service = inject(RegrasService);
    readonly ancoraInicial = input<string | null>(null);
    readonly emPainel = input(false);
    readonly maximizada = input(false);
    readonly livroAlterado = output<RegrasDocumento["id"]>();
    readonly secaoAlterada = output<string | null>();
    private readonly memoria = inject(RegrasLeituraStore);
    private readonly consulta = inject(RegrasConsultaService);
    protected readonly pesquisa = inject(RegrasPesquisaController);
    protected readonly impressao = inject(RegrasImpressaoService);
    protected readonly gavetaAberta = signal(false);
    protected readonly mobile = signal(window.innerWidth <= 560);
    protected readonly usarGaveta = computed(() =>
        this.mobile() || (this.emPainel() && !this.maximizada()));
    private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);
    private readonly notificacao = inject(NotificacaoService);
    private assinatura?: Subscription;
    private desconectar?: () => void;
    private geracao = 0;
    private silenciadoAte = 0;

    protected readonly documento = signal<RegrasDocumento | null>(null);
    protected readonly estado = signal<"carregando" | "ok" | "falha">("carregando");
    protected readonly ativo = signal<string | null>(null);
    protected readonly sumario = computed(() =>
        construirSumarioRegras(this.documento()?.filhos ?? []));
    protected readonly ativoSumario = computed(() => {
        const coletar = (itens: ReturnType<typeof construirSumarioRegras>): string[] =>
            itens.flatMap((item) => [item.ancora, ...coletar([...item.filhos])]);
        const visiveis = new Set(coletar(this.sumario()));
        const ancoras = listarAncorasRegras(this.documento()?.filhos ?? []);
        const indice = ancoras.indexOf(this.ativo() ?? "");
        return ancoras.slice(0, indice + 1).reverse().find((ancora) => visiveis.has(ancora));
    });

    constructor() {
        effect(() => {
            const livro = this.livro();
            untracked(() => this.carregarDocumento(livro));
        });
        effect(() => {
            const documento = this.documento();
            const fragmento = this.ancoraInicial();
            if (documento) {
                untracked(() => this.prepararNavegacao(documento, fragmento ?? null));
            }
        });
        effect(() => {
            if (!this.ativoSumario()) {
                return;
            }
            afterNextRender(() => {
                const nav = this.elemento.nativeElement
                    .querySelector<HTMLElement>(".regras__sumario");
                const link = nav?.querySelector<HTMLElement>('[aria-current="location"]');
                if (!nav || !link) {
                    return;
                }
                const area = nav.getBoundingClientRect();
                const item = link.getBoundingClientRect();
                if (item.top < area.top) {
                    nav.scrollTop += item.top - area.top;
                } else if (item.bottom > area.bottom) {
                    nav.scrollTop += item.bottom - area.bottom;
                }
            }, { injector: this.injector });
        });
        this.destroyRef.onDestroy(() => {
            this.geracao++;
            this.assinatura?.unsubscribe();
            this.desconectar?.();
        });
    }

    protected trocarDocumento(livro: RegrasDocumento["id"]): void {
        this.gavetaAberta.set(false);
        this.livroAlterado.emit(livro);
    }

    protected tentarNovamente(): void {
        this.carregarDocumento(this.livro());
    }

    protected navegarAncora(ancora: string): void {
        this.gavetaAberta.set(false);
        this.posicionarAncora(ancora, true);
    }

    protected clicarSumario(evento: MouseEvent, ancora: string): void {
        if (evento.button !== 0 || evento.ctrlKey || evento.metaKey
            || evento.shiftKey || evento.altKey) {
            return;
        }
        evento.preventDefault();
        this.navegarAncora(ancora);
    }

    private carregarDocumento(livro: RegrasDocumento["id"]): void {
        this.pesquisa.desconectarDocumento();
        this.geracao++;
        this.desconectar?.();
        this.assinatura?.unsubscribe();
        this.documento.set(null);
        this.ativo.set(null);
        this.estado.set("carregando");
        this.assinatura = this.service.carregarDocumento(livro).subscribe({
            next: (documento) => {
                this.documento.set(documento);
                this.estado.set("ok");
                this.pesquisa.conectarDocumento(documento, this.elemento.nativeElement,
                    (marca, ancora) => this.posicionarOcorrencia(marca, ancora));
            },
            error: () => this.estado.set("falha"),
        });
    }

    private prepararNavegacao(documento: RegrasDocumento, fragmento: string | null): void {
        this.desconectar?.();
        const geracao = ++this.geracao;
        afterNextRender(() => {
            // Fontes finais antes de medir: a mesma precaução da leitura dos patchnotes.
            const preparar = (): void => {
                if (geracao !== this.geracao || this.destroyRef.destroyed) {
                    return;
                }
                const corpo = this.elemento.nativeElement
                    .querySelector<HTMLElement>(".regras__documento");
                if (!corpo) return;
                this.posicionarAncora(fragmento, false);
                this.desconectar = observarSecaoRegras(corpo,
                    listarAncorasRegras(documento.filhos), (ancora) => {
                        if (!this.emPainel() && this.consulta.aberto()) return;
                        if (performance.now() < this.silenciadoAte) {
                            return;
                        }
                        this.ativo.set(ancora);
                        this.alterarUrl(ancora);
                    }, this.emPainel() ? this.areaRolagem() : undefined,
                    () => this.linhaLeitura());
            };
            if (document.fonts?.status === "loading") {
                void document.fonts.ready.then(preparar);
            } else {
                preparar();
            }
        }, { injector: this.injector });
    }

    private posicionarAncora(ancora: string | null, suave: boolean): void {
        const corpo = this.elemento.nativeElement.querySelector<HTMLElement>(".regras__documento");
        const alvo = ancora ? [...(corpo?.querySelectorAll<HTMLElement>("[data-ancora-regras]") ?? [])]
            .find((titulo) => titulo.dataset["ancoraRegras"] === ancora) : undefined;
        if (alvo) {
            const reduzMovimento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
            // Saltos longos vão direto ao título: a piscada precisa ser vista no destino.
            const area = this.emPainel() ? this.areaRolagem() : null;
            const linha = this.linhaLeitura();
            const distancia = alvo.getBoundingClientRect().top - linha;
            const perto = Math.abs(distancia) < (area?.clientHeight ?? window.innerHeight);
            const animarRolagem = suave && perto && !reduzMovimento;
            this.silenciadoAte = performance.now() + (animarRolagem ? 700 : 0);
            if (area) {
                area.scrollTo({ top: area.scrollTop + distancia,
                    behavior: animarRolagem ? "smooth" : "auto" });
            } else {
                window.scrollTo({ top: window.scrollY + distancia,
                    behavior: animarRolagem ? "smooth" : "auto" });
            }
            if (suave) {
                alvo.tabIndex = -1;
                afterNextRender(() => alvo.isConnected && alvo.focus({ preventScroll: true }),
                    { injector: this.injector });
            }
            this.ativo.set(ancora);
            this.alterarUrl(ancora);
            if (suave && !reduzMovimento) {
                alvo.animate?.([
                    { backgroundColor: getComputedStyle(alvo)
                        .getPropertyValue("--accent-dim").trim() },
                    { backgroundColor: "transparent" },
                ], { duration: 1100 });
            }
        } else {
            this.silenciadoAte = 0;
            if (this.emPainel()) {
                this.areaRolagem()?.scrollTo({ top: 0, behavior: "auto" });
            } else {
                window.scrollTo({ top: 0, behavior: "auto" });
            }
            this.ativo.set(null);
            this.alterarUrl(null);
            if (ancora) {
                this.notificacao.notificar({ severidade: "aviso",
                    resumo: "Seção não encontrada", detalhe: "O documento foi aberto no início." });
            }
        }
    }

    protected redimensionarViewport(): void {
        this.mobile.set(window.innerWidth <= 560);
        if (!this.usarGaveta()) this.gavetaAberta.set(false);
    }

    protected selecionarResultado(indice: number): void {
        this.gavetaAberta.set(false);
        this.pesquisa.selecionarOcorrencia(indice);
    }

    protected abrirOutroDocumento(): void {
        this.trocarDocumento(this.livro() === "sistema" ? "guia" : "sistema");
    }

    private posicionarOcorrencia(marca: HTMLElement, ancora: string | null): void {
        if (!this.emPainel() && this.consulta.aberto()) return;
        const distancia = marca.getBoundingClientRect().top - this.linhaLeitura();
        const area = this.emPainel() ? this.areaRolagem() : null;
        if (area) area.scrollTo({ top: area.scrollTop + distancia, behavior: "auto" });
        else window.scrollTo({ top: window.scrollY + distancia, behavior: "auto" });
        this.ativo.set(ancora); this.alterarUrl(ancora);
        // Clique em resultado leva foco ao texto; teclado/setas continuam no controle de busca.
        if (!this.elemento.nativeElement.contains(document.activeElement)) {
            marca.tabIndex = -1; marca.focus({ preventScroll: true });
        }
    }

    private areaRolagem(): HTMLElement | undefined {
        return this.elemento.nativeElement.querySelector<HTMLElement>(".regras__rolagem")
            ?? undefined;
    }

    private linhaLeitura(): number {
        const contador = this.elemento.nativeElement
            .querySelector(".regras__pesquisa-contador")?.getBoundingClientRect().height ?? 0;
        if (this.emPainel()) {
            return (this.areaRolagem()?.getBoundingClientRect().top ?? 0) + contador + 12;
        }
        // O token usa rem; medir a barra evita tratar sua parte numérica como pixels.
        const topbar = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0;
        const barra = this.elemento.nativeElement.querySelector(".regras__barra");
        return topbar + (barra?.getBoundingClientRect().height ?? 0) + contador + 16;
    }

    private alterarUrl(ancora: string | null): void {
        this.memoria.lembrarSecao(this.livro(), ancora);
        this.secaoAlterada.emit(ancora);
    }
}
