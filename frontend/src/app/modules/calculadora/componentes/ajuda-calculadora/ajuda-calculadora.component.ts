import { Component, computed, input, signal } from '@angular/core';

import { AbaAjuda, CONTEUDO_AJUDA } from './conteudo-ajuda';

/**
 * Modal de ajuda reutilizável da calculadora (m1-12): um gatilho ("? Ajuda") + o modal com o
 * guia de uso da aba. **Componente único, consumido pelas 6 páginas** (`agente`, `dt`,
 * `novo-agente`, `patente`, `descanso`, `compras`) — sem duplicação por aba: cada página só
 * informa qual aba é via o input `aba`, e o texto vem de `CONTEUDO_AJUDA`.
 *
 * Abertura/fechamento em Signal; **fecha apenas por botão** (o "×" do cabeçalho ou o "Fechar"),
 * sem clique-fora — mesmo padrão dos modais de exportar/importar da aba `compras` (m1-11), que
 * evita acionar as regras de acessibilidade `click-events-have-key-events`/
 * `interactive-supports-focus` do lint. Consome só os tokens do tema "Terminal de Contenção"
 * (nenhum hex/fonte/raio solto — proibição #29).
 *
 * @example
 * ```html
 * <app-ajuda-calculadora aba="dt" />
 * ```
 */
@Component({
  selector: 'app-ajuda-calculadora',
  imports: [],
  templateUrl: './ajuda-calculadora.component.html',
  styleUrl: './ajuda-calculadora.component.scss',
})
export class AjudaCalculadora {
  /** Qual aba esta ajuda descreve — seleciona a entrada de `CONTEUDO_AJUDA`. */
  readonly aba = input.required<AbaAjuda>();

  /** Se o modal está aberto. */
  protected readonly aberto = signal(false);

  /** Conteúdo de ajuda da aba informada. */
  protected readonly conteudo = computed(() => CONTEUDO_AJUDA[this.aba()]);

  protected abrir(): void {
    this.aberto.set(true);
  }

  protected fechar(): void {
    this.aberto.set(false);
  }
}
