import { DatePipe } from "@angular/common";
import { Component, computed, effect, inject, input, output, signal, untracked } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { DomSanitizer } from "@angular/platform-browser";
import type { LivroMudancasPublicadasDto } from "@contratados-rpg/shared/dtos/livro";
import { LivroMudancaSituacaoEnum, LivroTextoOperacaoEnum } from "@contratados-rpg/shared/enums";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import type { Subscription } from "rxjs";
import { renderizarMarkdownSeguro } from "../../../shared/markdown/markdown-seguro";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { Campo } from "../../../shared/ui/campo/campo.component";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { Chip, type ChipSeveridade } from "../../../shared/ui/chip/chip.component";
import { Esqueleto } from "../../../shared/ui/esqueleto/esqueleto.component";
import { EstadoVazio } from "../../../shared/ui/estado-vazio/estado-vazio.component";
import { Seletor } from "../../../shared/ui/seletor/seletor.component";
import { RegrasMudancasPublicadasService } from "./regras-mudancas-publicadas.service";

/** Conteúdo da gaveta pública; o host conserva a leitura e responde pela navegação atual. */
@Component({
    selector: "app-regras-mudancas-publicadas",
    imports: [
        DatePipe, ReactiveFormsModule, Botao, Campo, Cartao, Chip, Esqueleto, EstadoVazio, Seletor,
    ],
    templateUrl: "./regras-mudancas-publicadas.component.html",
    styleUrl: "./regras-mudancas-publicadas.component.scss",
})
export class RegrasMudancasPublicadas {
    readonly codigo = input.required<string>();
    readonly aberta = input(false);
    readonly irPara = output<string>();
    protected readonly origem = new FormControl<string | null>(null);
    protected readonly resultado = signal<LivroMudancasPublicadasDto | null>(null);
    protected readonly carregando = signal(false);
    protected readonly falha = signal(false);
    protected readonly Situacao = LivroMudancaSituacaoEnum;
    protected readonly Operacao = LivroTextoOperacaoEnum;
    protected readonly rotulos = { NOVA: "Adicionada", REMOVIDA: "Removida", ALTERADA: "Alterada", MOVIDA: "Movida" };
    protected readonly severidades: Readonly<Record<LivroMudancaSituacaoEnum, ChipSeveridade>> = {
        NOVA: "sucesso", REMOVIDA: "perigo", ALTERADA: "aviso", MOVIDA: "secundario",
    };
    private readonly servico = inject(RegrasMudancasPublicadasService);
    private readonly sanitizer = inject(DomSanitizer);
    private requisicao?: Subscription;
    private geracao = 0;
    protected readonly opcoes = computed(() => {
        const resultado = this.resultado();
        return resultado?.publicacoes.filter(publicacao => publicacao.id !== resultado.atual.id)
            .map(publicacao => ({ valor: String(publicacao.id), rotulo: `${publicacao.numero} · ${this.formatarData(publicacao.publicacaoData)}` })) ?? [];
    });
    protected readonly notas = computed(() => (this.resultado()?.notas ?? []).map(nota => ({
        ...nota, html: this.markdown(nota.nota ?? ""),
    })));
    protected readonly mudancas = computed(() =>
        (this.resultado()?.mudancas ?? []).map(mudanca => ({
        ...mudanca, antesHtml: this.markdown(mudanca.antesMarkdown ?? ""), depoisHtml: this.markdown(mudanca.depoisMarkdown ?? ""),
        textos: mudanca.campos.filter(campo => campo.texto?.length),
        posicaoTexto: mudanca.posicao
            ? `Da posição ${mudanca.posicao.ordemAntes + 1} para a posição ${mudanca.posicao.ordemDepois + 1}.`
            : "",
    })));

    constructor() {
        this.origem.valueChanges.pipe(takeUntilDestroyed()).subscribe(origem => {
            if (this.aberta()) this.carregar(origem === null ? undefined : Number(origem));
        });
        effect(aoLimpar => {
            const aberta = this.aberta();
            this.codigo();
            untracked(() => {
                this.cancelar();
                this.resultado.set(null);
                this.falha.set(false);
                this.carregando.set(false);
                this.origem.reset(null, { emitEvent: false });
                if (aberta) this.carregar();
            });
            aoLimpar(() => this.cancelar());
        });
    }

    protected tentarNovamente(): void {
        this.carregar(this.origem.value === null ? undefined : Number(this.origem.value));
    }

    private carregar(origemId?: number): void {
        this.cancelar();
        const geracao = this.geracao;
        this.carregando.set(true);
        this.falha.set(false);
        const consulta = this.servico.recuperarMudancas({ codigo: this.codigo(), origemId });
        this.requisicao = consulta.subscribe({
            next: resultado => {
                if (geracao !== this.geracao) return;
                this.resultado.set(resultado);
                const origem = resultado.origem === null ? null : String(resultado.origem.id);
                this.origem.setValue(origem, { emitEvent: false });
                this.carregando.set(false);
            },
            error: () => {
                if (geracao !== this.geracao) return;
                this.falha.set(true);
                this.carregando.set(false);
            },
        });
    }

    private cancelar(): void { this.geracao++; this.requisicao?.unsubscribe(); }
    private markdown(texto: string): string { return texto ? renderizarMarkdownSeguro(texto, this.sanitizer) : ""; }
    private formatarData(data: string): string {
        return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(data));
    }
}
