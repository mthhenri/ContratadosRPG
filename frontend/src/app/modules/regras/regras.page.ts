import { Location, NgTemplateOutlet } from "@angular/common";
import {
    ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector,
    afterNextRender, computed, effect, inject, input, signal, untracked,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";

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
    selector: "app-regras-page",
    imports: [NgTemplateOutlet, Icone, Botao, Cartao, Esqueleto, EstadoVazio,
        Segmentado, SegmentadoItem,
        RegrasConteudoRender],
    templateUrl: "./regras.page.html",
    styleUrl: "./regras.page.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegrasPage {
    readonly livro = input.required<RegrasDocumento["id"]>();
    private readonly service = inject(RegrasService);
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);
    private readonly notificacao = inject(NotificacaoService);
    private readonly fragmento = toSignal(inject(ActivatedRoute).fragment);
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
    protected readonly pdf = computed(() => this.livro() === "sistema"
        ? "/documentos/sistema-v4.1.3.pdf" : "/documentos/guia_de_mestre-v4.2.0.pdf");

    constructor() {
        effect(() => {
            const livro = this.livro();
            untracked(() => this.carregarDocumento(livro));
        });
        effect(() => {
            const documento = this.documento();
            const fragmento = this.fragmento();
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
        void this.router.navigate(["/regras", livro]);
    }

    protected tentarNovamente(): void {
        this.carregarDocumento(this.livro());
    }

    protected navegarAncora(ancora: string): void {
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
                this.posicionarAncora(fragmento, false);
                this.desconectar = observarSecaoRegras(this.elemento.nativeElement,
                    listarAncorasRegras(documento.filhos), (ancora) => {
                        if (performance.now() < this.silenciadoAte) {
                            return;
                        }
                        this.ativo.set(ancora);
                        this.alterarUrl(ancora);
                    });
            };
            if (document.fonts?.status === "loading") {
                void document.fonts.ready.then(preparar);
            } else {
                preparar();
            }
        }, { injector: this.injector });
    }

    private posicionarAncora(ancora: string | null, suave: boolean): void {
        const alvo = ancora ? [...this.elemento.nativeElement
            .querySelectorAll<HTMLElement>("[data-ancora-regras]")]
            .find((titulo) => titulo.id === ancora) : undefined;
        if (alvo) {
            const reduzMovimento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
            // Saltos longos vão direto ao título: a piscada precisa ser vista no destino.
            const perto = Math.abs(alvo.getBoundingClientRect().top) < window.innerHeight;
            const animarRolagem = suave && perto && !reduzMovimento;
            this.silenciadoAte = performance.now() + (animarRolagem ? 700 : 0);
            alvo.scrollIntoView({ block: "start", behavior: animarRolagem
                ? "smooth" : "auto" });
            if (suave) {
                alvo.tabIndex = -1;
                alvo.focus({ preventScroll: true });
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
            window.scrollTo({ top: 0, behavior: "auto" });
            this.ativo.set(null);
            this.alterarUrl(null);
            if (ancora) {
                this.notificacao.notificar({ severidade: "aviso",
                    resumo: "Seção não encontrada", detalhe: "O documento foi aberto no início." });
            }
        }
    }

    private alterarUrl(ancora: string | null): void {
        const url = this.router.serializeUrl(this.router.createUrlTree(
            ["/regras", this.livro()], { fragment: ancora ?? undefined }));
        if (this.location.path(true) !== url) {
            // Scroll não é navegação nova: conserva o histórico e o estado do Router.
            this.location.replaceState(url, "", this.location.getState());
        }
    }
}
