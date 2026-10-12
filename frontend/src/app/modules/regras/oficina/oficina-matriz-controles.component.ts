import { Component, computed, inject, input } from "@angular/core";

import { Icone } from "../../../shared/icone/icone.component";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { adicionarColuna, adicionarLinha, contarColunas, removerLinha, removerUltimaColuna } from "./oficina-matriz";
import { OficinaStore } from "./oficina.store";

/**
 * Controles de uma tabela na Oficina (m11-08): "+ Linha", "+ Coluna" e "− Coluna" (a última). Só aparecem com a peça
 * selecionada; fora da Oficina o componente é vazio. Sem redimensionar colunas nem mesclar: é o mínimo para montar uma
 * tabela sem virar editor de planilha.
 */
@Component({
    selector: "app-oficina-matriz-controles",
    imports: [Botao, Icone],
    template: `
        @if (visivel()) {
            <div class="oficina-matriz-controles">
                <button app-botao variante="secundario" estilo="contorno" tamanho="pequeno" posicaoIcone="esquerda"
                    type="button" aria-label="Adicionar linha" (click)="linha()"><app-icone nome="mais" /> Linha</button>
                @if (comUltimaLinha()) {
                    <button app-botao variante="secundario" estilo="contorno" tamanho="pequeno" type="button"
                        aria-label="Remover a última linha" (click)="semLinha()">− Linha</button>
                }
                <button app-botao variante="secundario" estilo="contorno" tamanho="pequeno" posicaoIcone="esquerda"
                    type="button" aria-label="Adicionar coluna" (click)="coluna()"><app-icone nome="mais" /> Coluna</button>
                <button app-botao variante="secundario" estilo="contorno" tamanho="pequeno" type="button"
                    aria-label="Remover a última coluna" [disabled]="colunas() <= 1" (click)="semColuna()">− Coluna</button>
            </div>
        }
    `,
    styles: `
        .oficina-matriz-controles {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-8);
            padding-top: var(--space-8);
        }
    `,
})
export class OficinaMatrizControles {
    readonly peca = input<string | undefined>(undefined);
    /** Tabelas sem lixeira por linha (a grade) oferecem "− Linha" para a última. */
    readonly comUltimaLinha = input(false);
    private readonly store = inject(OficinaStore, { optional: true });
    protected readonly visivel = computed(() =>
        !!this.peca() && this.store?.estado() === "ok" && this.store.selecionada() === this.peca());
    protected readonly colunas = computed(() => {
        this.store?.itens();
        const dados = this.store?.item(this.peca() as string)?.dados as { cabecalho?: never[]; linhas?: never[][] } | undefined;
        return contarColunas({ cabecalho: dados?.cabecalho ?? [], linhas: dados?.linhas ?? [] });
    });

    protected linha(): void {
        this.store?.alterarMatriz(this.peca() as string, adicionarLinha, "Adicionar linha");
    }

    protected semLinha(): void {
        this.store?.alterarMatriz(this.peca() as string, (matriz) => removerLinha(matriz, matriz.linhas.length - 1), "Remover linha");
    }

    protected coluna(): void {
        this.store?.alterarMatriz(this.peca() as string, adicionarColuna, "Adicionar coluna");
    }

    protected semColuna(): void {
        this.store?.alterarMatriz(this.peca() as string, removerUltimaColuna, "Remover coluna");
    }
}
