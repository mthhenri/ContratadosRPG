import { Component, DestroyRef, computed, inject, input, signal, viewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import type { VarianteMarkdownExportadoLivro } from "@contratados-rpg/shared/livro";
import { finalize } from "rxjs";
import { SessaoService } from "../../core/services/sessao.service";
import { Icone } from "../../shared/icone/icone.component";
import { Botao } from "../../shared/ui/botao/botao.component";
import { MenuAcoes, type MenuAcoesItem } from "../../shared/ui/menu-acoes/menu-acoes.component";
import { NotificacaoService } from "../../shared/ui/notificacao/notificacao.service";
import { RegrasExportacaoMarkdownService } from "./regras-exportacao-markdown.service";

const ITENS: readonly MenuAcoesItem[] = [
    { id: "COMPLETO", rotulo: "Markdown completo", descricao: "Com âncoras e marcas das regras, para IA e conferência" },
    { id: "LIMPO", rotulo: "Markdown limpo", descricao: "Sem âncoras nem comentários, para ler" },
];

/**
 * Ação "Markdown" do cabeçalho do leitor de Regras. Só existe para quem está logado e sempre exporta a
 * **publicação atual** do livro aberto, mesmo com a Oficina mostrando um rascunho.
 *
 * O gatilho é um botão próprio e o menu abre no modo `contextual` do `app-menu-acoes`: ele vai para a camada
 * superior da página e se posiciona pela tela, então não corta nem desloca dentro da gaveta mobile (um
 * `position: fixed` dentro de um ancestral com `transform` seria posicionado em relação a ele).
 */
@Component({
    selector: "app-regras-exportar-markdown",
    imports: [Botao, Icone, MenuAcoes],
    template: `
        @if (logado()) {
            <button
                app-botao
                type="button"
                variante="secundario"
                estilo="contorno"
                tamanho="pequeno"
                posicaoIcone="direita"
                aria-haspopup="menu"
                [attr.aria-expanded]="aberto()"
                [disabled]="exportando()"
                (click)="abrirMenu($event)"
            >
                Markdown
                <app-icone nome="chevron" />
            </button>
            <app-menu-acoes
                rotulo="Exportar Markdown"
                [contextual]="true"
                [itens]="itens"
                (escolheu)="exportar($event)"
                (fechou)="aberto.set(false)"
            />
        }
    `,
})
export class RegrasExportarMarkdown {
    /** Código do livro aberto (`sistema` ou `guia`). */
    readonly livro = input.required<string>();

    private readonly sessao = inject(SessaoService);
    private readonly servico = inject(RegrasExportacaoMarkdownService);
    private readonly notificacao = inject(NotificacaoService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly menu = viewChild(MenuAcoes);
    protected readonly itens = ITENS;
    protected readonly logado = computed(() => this.sessao.usuario() !== null);
    protected readonly exportando = signal(false);
    protected readonly aberto = signal(false);

    protected abrirMenu(evento: Event): void {
        const botao = evento.currentTarget as HTMLElement;
        const retangulo = botao.getBoundingClientRect();
        this.aberto.set(true);
        this.menu()?.abrirContextual(retangulo.left, retangulo.bottom + 4);
    }

    protected exportar(variante: string): void {
        if (this.exportando() || (variante !== "COMPLETO" && variante !== "LIMPO")) return;
        this.exportando.set(true);
        this.servico.montarArquivo(this.livro(), variante as VarianteMarkdownExportadoLivro).pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.exportando.set(false)),
        ).subscribe({
            next: arquivo => {
                try {
                    this.servico.baixar(arquivo);
                    this.notificacao.notificar({
                        severidade: "sucesso", resumo: "Markdown exportado",
                        detalhe: `${arquivo.nome} (publicação atual do livro).`,
                    });
                } catch {
                    this.informarFalha();
                }
            },
            error: () => this.informarFalha(),
        });
    }

    private informarFalha(): void {
        this.notificacao.notificar({
            severidade: "erro", resumo: "Não foi possível exportar o Markdown",
            detalhe: "Tente novamente. O livro precisa ter uma publicação.",
        });
    }
}
