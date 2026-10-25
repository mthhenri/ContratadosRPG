import {
    ChangeDetectionStrategy, Component, effect, inject, signal, untracked, viewChild,
} from "@angular/core";
import { Router } from "@angular/router";
import { Icone } from "../../shared/icone/icone.component";
import { BotaoIcone } from "../../shared/ui/botao-icone/botao-icone.component";
import {
    PainelFlutuante, PainelFlutuantePosicao,
} from "../../shared/ui/painel-flutuante/painel-flutuante.component";
import { RegrasConsultaService } from "./regras-consulta.service";
import { RegrasLeitor } from "./regras-leitor.component";
import { RegrasLeituraStore } from "./regras-leitura.store";
import { RegrasDocumento } from "./regras.model";

const BREAKPOINT_MOBILE = 560;

/** Casca da Biblioteca: o leitor e sua memória são os mesmos usados na página. */
@Component({
    selector: "app-regras-flutuante",
    imports: [PainelFlutuante, BotaoIcone, Icone, RegrasLeitor],
    templateUrl: "./regras-flutuante.component.html",
    styleUrl: "./regras-flutuante.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        "(window:resize)": "aoRedimensionarViewport()",
        "(window:pointermove)": "redimensionarJanela($event)",
        "(window:pointerup)": "encerrarRedimensionamento()",
        "(window:pointercancel)": "encerrarRedimensionamento()",
    },
})
export class RegrasFlutuante {
    protected readonly consulta = inject(RegrasConsultaService);
    private readonly memoria = inject(RegrasLeituraStore);
    private readonly roteador = inject(Router);
    protected readonly painel = viewChild(PainelFlutuante);
    protected readonly livro = signal<RegrasDocumento["id"]>("sistema");
    protected readonly ancoraInicial = signal<string | null>(null);
    protected readonly iniciado = signal(false);
    protected readonly ehMobile = signal(window.innerWidth <= BREAKPOINT_MOBILE);
    protected readonly maximizada = signal(false);
    protected readonly tamanho = signal({ largura: 760, altura: 680 });
    protected readonly posicaoInicial: PainelFlutuantePosicao = { x: 280, y: 88 };
    private posicaoAntesDeMaximizar: PainelFlutuantePosicao | null = null;
    private tamanhoNormal = { largura: 760, altura: 680 };
    private origemRedimensionamento: {
        ponteiroX: number; ponteiroY: number; x: number; y: number;
        largura: number; altura: number; pointerId: number;
    } | null = null;

    constructor() {
        effect(() => {
            const solicitacao = this.consulta.solicitacao();
            if (solicitacao === 0) return;
            untracked(() => {
                this.livro.set(this.memoria.livro());
                this.ancoraInicial.set(this.memoria.recuperarSecao(this.livro()));
                this.iniciado.set(true);
                this.aoRedimensionarViewport();
                this.painel()?.restaurar();
            });
        });
    }

    protected selecionarLivro(livro: RegrasDocumento["id"]): void {
        this.memoria.selecionarLivro(livro);
        this.livro.set(livro);
        this.ancoraInicial.set(this.memoria.recuperarSecao(livro));
    }

    protected abrirPagina(): void {
        void this.roteador.navigate(["/regras", this.livro()], {
            fragment: this.memoria.recuperarSecao(this.livro()) ?? undefined,
        });
        this.fechar();
    }

    protected fechar(): void {
        this.encerrarRedimensionamento();
        this.consulta.fechar();
    }

    protected alternarMaximizacao(): void {
        if (this.ehMobile()) return;
        this.encerrarRedimensionamento();
        this.ancoraInicial.set(this.memoria.recuperarSecao(this.livro()));
        if (this.maximizada()) {
            this.maximizada.set(false);
            this.aoRedimensionarViewport();
            if (this.posicaoAntesDeMaximizar) {
                this.painel()?.moverPara({
                    x: Math.min(this.posicaoAntesDeMaximizar.x,
                        Math.max(0, window.innerWidth - this.tamanho().largura)),
                    y: Math.min(this.posicaoAntesDeMaximizar.y,
                        Math.max(0, window.innerHeight - this.tamanho().altura)),
                }, { persistir: false });
            }
            return;
        }
        this.posicaoAntesDeMaximizar = this.painel()?.obterPosicaoAtual() ?? null;
        this.maximizada.set(true);
        this.aoRedimensionarViewport();
    }

    protected aoRedimensionarViewport(): void {
        this.encerrarRedimensionamento();
        this.ehMobile.set(window.innerWidth <= BREAKPOINT_MOBILE);
        const alturaTopbar = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 56;
        const altura = Math.max(0, window.innerHeight - alturaTopbar);
        this.tamanho.set(this.maximizada()
            ? { largura: window.innerWidth, altura }
            : { largura: Math.min(this.tamanhoNormal.largura, window.innerWidth),
                altura: Math.min(this.tamanhoNormal.altura, altura) });
        if (this.maximizada() && !this.ehMobile()) {
            this.painel()?.moverPara({ x: 0, y: alturaTopbar }, { persistir: false });
        }
    }

    protected iniciarRedimensionamento(evento: PointerEvent): void {
        if (this.ehMobile() || this.maximizada() || evento.button !== 0) return;
        const retangulo = this.painel()?.obterElemento()?.getBoundingClientRect();
        if (!retangulo) return;
        evento.preventDefault();
        evento.stopPropagation();
        if (evento.currentTarget instanceof HTMLElement) {
            evento.currentTarget.setPointerCapture(evento.pointerId);
        }
        this.origemRedimensionamento = {
            ponteiroX: evento.clientX, ponteiroY: evento.clientY,
            x: retangulo.left, y: retangulo.top,
            largura: retangulo.width, altura: retangulo.height, pointerId: evento.pointerId,
        };
    }

    protected redimensionarJanela(evento: PointerEvent): void {
        const origem = this.origemRedimensionamento;
        if (!origem || (evento.pointerId !== undefined
            && evento.pointerId !== origem.pointerId)) return;
        const larguraDisponivel = Math.max(0, window.innerWidth - origem.x);
        const alturaDisponivel = Math.max(0, window.innerHeight - origem.y);
        this.tamanhoNormal = {
            largura: Math.min(larguraDisponivel,
                Math.max(360, origem.largura + evento.clientX - origem.ponteiroX)),
            altura: Math.min(alturaDisponivel,
                Math.max(360, origem.altura + evento.clientY - origem.ponteiroY)),
        };
        this.tamanho.set(this.tamanhoNormal);
    }

    protected encerrarRedimensionamento(): void {
        this.origemRedimensionamento = null;
    }
}
