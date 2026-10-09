import {
    DestroyRef, Injectable, Injector, afterNextRender, effect, inject, signal, untracked,
} from "@angular/core";
import { Subscription } from "rxjs";
import { RegrasDocumento } from "./regras.model";
import { RegrasLeituraStore } from "./regras-leitura.store";
import { RegrasService } from "./regras.service";
import { pesquisarRegras, normalizarPesquisaRegras, RegrasOcorrenciaPesquisa } from "./regras-pesquisa";
import {
    destacarPesquisa, projetarTextosPesquisa, revelarOcorrencia, RegrasMarcasPesquisa,
} from "./regras-pesquisa-dom";

/** Estado e projeção da pesquisa por hospedeiro; a memória do termo é da consulta global. */
@Injectable()
export class RegrasPesquisaController {
    private readonly memoria = inject(RegrasLeituraStore);
    private readonly service = inject(RegrasService);
    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);
    readonly termo = this.memoria.termoPesquisa;
    readonly resultados = signal<readonly RegrasOcorrenciaPesquisa[]>([]);
    readonly selecionado = signal(0);
    readonly outroDocumento = signal<RegrasDocumento | null>(null);
    readonly quantidadeOutro = signal(0);
    readonly falhaOutro = signal(false);
    private readonly documento = signal<RegrasDocumento | null>(null);
    private raiz?: HTMLElement;
    private marcas?: RegrasMarcasPesquisa;
    private assinatura?: Subscription;
    private geracao = 0;
    private esperaPesquisa?: ReturnType<typeof setTimeout>;
    private aoSelecionar?: (marca: HTMLElement, ancora: string | null) => void;

    constructor() {
        effect(() => {
            const termo = this.termo(), documento = this.documento();
            untracked(() => {
                this.limparMarcas();
                if (!documento || normalizarPesquisaRegras(termo.trim()).length < 2) return;
                if (!this.outroDocumento() && !this.assinatura && !this.falhaOutro()) {
                    this.carregarOutro();
                }
                const geracao = this.geracao;
                afterNextRender(() => {
                    if (geracao !== this.geracao || !this.raiz) return;
                    const corpo = this.raiz.querySelector<HTMLElement>(".regras__documento");
                    if (!corpo) return;
                    const textos = projetarTextosPesquisa(corpo);
                    const resultados = pesquisarRegras(textos, termo);
                    this.resultados.set(resultados);
                    this.marcas = destacarPesquisa(textos, resultados);
                    if (resultados.length) {
                        this.selecionarOcorrencia(this.memoria.ocorrenciasPesquisa()[documento.id]);
                    }
                }, { injector: this.injector });
            });
        });
        effect(() => {
            const outro = this.outroDocumento(), termo = this.termo();
            afterNextRender(() => {
                const raiz = this.raiz?.querySelector<HTMLElement>(".regras__outro-livro");
                this.quantidadeOutro.set(outro && raiz
                    ? pesquisarRegras(projetarTextosPesquisa(raiz), termo).length : 0);
            }, { injector: this.injector });
        });
        effect(() => {
            const livro = this.documento()?.id;
            const ocorrencias = this.memoria.ocorrenciasPesquisa();
            untracked(() => {
                if (livro) {
                    this.selecionado.set(ocorrencias[livro]);
                    this.marcas?.marcas.forEach((marcas, numero) => marcas.forEach(marca =>
                        marca.classList.toggle("regras-pesquisa__marca--atual",
                            numero === ocorrencias[livro])));
                }
            });
        });
        this.destroyRef.onDestroy(() => {
            clearTimeout(this.esperaPesquisa);
            this.limparMarcas(); this.assinatura?.unsubscribe();
        });
    }

    conectarDocumento(documento: RegrasDocumento, raiz: HTMLElement,
        aoSelecionar: (marca: HTMLElement, ancora: string | null) => void): void {
        this.raiz = raiz; this.aoSelecionar = aoSelecionar;
        this.documento.set(documento);
    }

    desconectarDocumento(): void {
        this.limparMarcas(); this.documento.set(null);
        this.assinatura?.unsubscribe(); this.assinatura = undefined;
        this.outroDocumento.set(null); this.falhaOutro.set(false);
    }

    alterarTermo(termo: string): void {
        clearTimeout(this.esperaPesquisa);
        if (termo.trim().length < 2) {
            this.confirmarTermo(termo);
            return;
        }
        this.esperaPesquisa = setTimeout(() => this.confirmarTermo(termo), 300);
    }

    confirmarTermo(termo: string): void {
        clearTimeout(this.esperaPesquisa);
        this.esperaPesquisa = undefined;
        this.memoria.alterarTermoPesquisa(termo);
    }

    limpar(): void { this.confirmarTermo(""); }

    carregarOutro(): void {
        const livro = this.documento()?.id;
        if (!livro) return;
        this.falhaOutro.set(false);
        const assinatura = this.service.carregarDocumento(livro === "sistema" ? "guia" : "sistema")
            .subscribe({
                next: documento => this.outroDocumento.set(documento),
                error: () => { this.falhaOutro.set(true); this.assinatura = undefined; },
            });
        this.assinatura = assinatura.closed ? undefined : assinatura;
    }

    selecionarOcorrencia(indice: number): void {
        const quantidade = this.resultados().length;
        if (!quantidade) return;
        const selecionado = (indice + quantidade) % quantidade;
        const livro = this.documento()?.id;
        if (livro) this.memoria.selecionarOcorrenciaPesquisa(livro, selecionado);
        this.selecionado.set(selecionado);
        this.marcas?.marcas.forEach((marcas, numero) => marcas.forEach(marca =>
            marca.classList.toggle("regras-pesquisa__marca--atual", numero === selecionado)));
        const marca = this.marcas?.marcas[selecionado]?.[0];
        if (!marca) return;
        revelarOcorrencia(marca);
        afterNextRender(() => {
            if (marca.isConnected) {
                this.aoSelecionar?.(marca, this.resultados()[selecionado]?.ancora ?? null);
            }
        }, { injector: this.injector });
    }

    navegar(direcao: number): void { this.selecionarOcorrencia(this.selecionado() + direcao); }

    tratarTecla(evento: KeyboardEvent): void {
        if (normalizarPesquisaRegras(this.termo().trim()).length < 2) return;
        if (evento.key === "Escape") {
            evento.preventDefault(); evento.stopPropagation(); this.limpar();
        } else if (evento.key === "Enter" && evento.target instanceof HTMLInputElement) {
            evento.preventDefault(); evento.stopPropagation();
            this.navegar(evento.shiftKey ? -1 : 1);
        }
    }

    private limparMarcas(): void {
        this.geracao++; this.marcas?.limpar(); this.marcas = undefined;
        this.resultados.set([]); this.quantidadeOutro.set(0); this.selecionado.set(0);
    }
}
