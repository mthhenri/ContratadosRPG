import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';

import { AbaAjuda, CONTEUDO_AJUDA } from './conteudo-ajuda';

/** Janela em que o "Tem certeza?" aceita o 2º clique antes de reverter sozinho para "Limpar". */
const JANELA_CONFIRMACAO_MS = 3000;

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
 * Além do gatilho de ajuda, expõe ao lado dele um botão **"Limpar"** em **duas etapas**: o 1º
 * clique arma a confirmação (o rótulo vira "Tem certeza?" por 3s), e só o 2º clique dentro dessa
 * janela **emite** o output `limpar` — protege contra zerar a aba por um clique acidental. O
 * componente permanece burro quanto ao reset: não conhece o formulário da aba, quem sabe voltar
 * ao estado padrão é a página que escuta `limpar`.
 *
 * @example
 * ```html
 * <app-ajuda-calculadora aba="dt" (limpar)="limpar()" />
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

  /** Emitido ao **confirmar** o Limpar (2º clique) — a página faz a aba voltar ao estado padrão. */
  readonly limpar = output<void>();

  /** Se o modal está aberto. */
  protected readonly aberto = signal(false);

  /** Se o Limpar está armado ("Tem certeza?"), aguardando o 2º clique de confirmação. */
  protected readonly confirmandoLimpeza = signal(false);

  /** Conteúdo de ajuda da aba informada. */
  protected readonly conteudo = computed(() => CONTEUDO_AJUDA[this.aba()]);

  /** Handle do temporizador que reverte "Tem certeza?" para "Limpar" após a janela de 3s. */
  private temporizadorConfirmacao: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Não deixa um temporizador pendente disparar depois que a aba (rota lazy) é desmontada.
    inject(DestroyRef).onDestroy(() => this.cancelarConfirmacao());
  }

  protected abrir(): void {
    this.aberto.set(true);
  }

  protected fechar(): void {
    this.aberto.set(false);
  }

  /**
   * Limpeza em duas etapas: o 1º clique arma a confirmação (rótulo "Tem certeza?") e agenda a
   * reversão automática após {@link JANELA_CONFIRMACAO_MS}; o 2º clique dentro da janela cancela
   * o temporizador e emite `limpar`.
   */
  protected aoClicarLimpar(): void {
    if (this.confirmandoLimpeza()) {
      this.cancelarConfirmacao();
      this.limpar.emit();
      return;
    }
    this.confirmandoLimpeza.set(true);
    this.temporizadorConfirmacao = setTimeout(
      () => this.confirmandoLimpeza.set(false),
      JANELA_CONFIRMACAO_MS,
    );
  }

  /** Desarma a confirmação e limpa o temporizador (reversão, confirmação ou destruição). */
  private cancelarConfirmacao(): void {
    clearTimeout(this.temporizadorConfirmacao);
    this.temporizadorConfirmacao = undefined;
    this.confirmandoLimpeza.set(false);
  }
}
