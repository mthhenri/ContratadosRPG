import { Component, computed, input, model, output } from '@angular/core';

import { Icone } from '../../icone/icone.component';
import { Tooltip } from '../../tooltip/tooltip.directive';
import { Botao } from '../botao/botao.component';
import { BotaoIcone } from '../botao-icone/botao-icone.component';

/** Cor da faixa da ficha: um dos tokens `--dano-*` (tipo de dano do termo). */
export type FichaTermoCor = 'fisico' | 'balistico' | 'explosao' | 'quimico' | 'geral';

/**
 * Ficha de termo removível (`montador-rolagem-experimento`; "ficha selecionável/removível" autorizada pelo autor em
 * 2026-10-01 e confirmada em 2026-10-03): o cartão de um termo editável — ícone, rótulo, controles da linha e o "×"
 * de remover —, com uma faixa inferior na cor do tipo de dano (`[cor]`; `[corSecundaria]` divide a faixa ao meio,
 * como o dano Composto) e, opcionalmente, uma área "Mais" recolhível para opções de segundo plano.
 *
 * Slots: `[fichaTermoIcone]`, `[fichaTermoRotulo]`, `[fichaTermoControles]` (primeira linha, com o "×"), o conteúdo
 * padrão (segunda linha, sempre visível, ao lado do botão "Mais") e `[fichaTermoMais]` (só com `[temMais]` e
 * aberto). Projeção por seletor: o elemento do slot precisa ser filho direto da ficha ou raiz única de um bloco de
 * controle de fluxo (um `@if` dentro de outro não é casado). `[compacta]` é a variante de uma
 * linha só (atributo, número, atalho). O primitivo é dono da identidade (superfície, borda, faixa, raio, botões); o
 * consumidor é dono do conteúdo e do layout da lista.
 */
@Component({
  selector: 'app-ficha-termo',
  imports: [Botao, BotaoIcone, Icone, Tooltip],
  templateUrl: './ficha-termo.component.html',
  styleUrl: './ficha-termo.component.scss',
})
export class FichaTermo {
  /** Nome acessível do botão de remover ("Remover 2d6"). */
  readonly rotuloRemover = input.required<string>();

  /** Nome acessível do botão "Mais" ("Mais opções de 2d6"). */
  readonly rotuloMais = input('Mais opções');

  /** Mostra o "×" de remover. */
  readonly removivel = input(true);

  /** Tipo de dano do termo, para a faixa. Sem valor, a faixa é neutra. */
  readonly cor = input<FichaTermoCor | null>(null);

  /** Segundo tipo de um Composto — divide a faixa ao meio. */
  readonly corSecundaria = input<FichaTermoCor | null>(null);

  /** Variante de uma linha só. */
  readonly compacta = input(false);

  /** Oferece a área "Mais". */
  readonly temMais = input(false);

  /** Área "Mais" aberta (o consumidor pode controlar ou deixar o primitivo alternar). */
  readonly maisAberto = model(false);

  /** Pedido de remoção — quem remove é o consumidor. */
  readonly remover = output<void>();

  protected readonly classes = computed(() => {
    const partes = ['ficha-termo'];
    if (this.compacta()) partes.push('ficha-termo--compacta');
    const cor = this.cor();
    if (cor) partes.push(`ficha-termo--cor-${cor}`);
    const secundaria = this.corSecundaria();
    if (secundaria) partes.push(`ficha-termo--cor2-${secundaria}`);
    return partes.join(' ');
  });

  protected alternarMais(): void {
    this.maisAberto.set(!this.maisAberto());
  }
}
