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
    host: { "(window:resize)": "aoRedimensionarViewport()" },
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
        this.consulta.fechar();
    }

    protected alternarMaximizacao(): void {
        if (this.ehMobile()) return;
        this.ancoraInicial.set(this.memoria.recuperarSecao(this.livro()));
        if (this.maximizada()) {
            this.maximizada.set(false);
            this.aoRedimensionarViewport();
            if (this.posicaoAntesDeMaximizar) {
                this.painel()?.moverPara(this.posicaoAntesDeMaximizar, { persistir: false });
            }
            return;
        }
        this.posicaoAntesDeMaximizar = this.painel()?.obterPosicaoAtual() ?? null;
        this.maximizada.set(true);
        this.aoRedimensionarViewport();
    }

    protected aoRedimensionarViewport(): void {
        this.ehMobile.set(window.innerWidth <= BREAKPOINT_MOBILE);
        const alturaTopbar = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 56;
        const altura = Math.max(0, window.innerHeight - alturaTopbar);
        this.tamanho.set(this.maximizada()
            ? { largura: window.innerWidth, altura }
            : { largura: Math.min(760, window.innerWidth), altura: Math.min(680, altura) });
        if (this.maximizada() && !this.ehMobile()) {
            this.painel()?.moverPara({ x: 0, y: alturaTopbar }, { persistir: false });
        }
    }
}
