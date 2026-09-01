import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../icone/icone.component';
import { ResultadoRolagem } from '../resultado-rolagem/resultado-rolagem.component';
import { Chip } from '../ui/chip/chip.component';
import { BandejaDadosService } from './bandeja-dados.service';

/** Largura máxima da carta (casa com o SCSS) — usada em telas largas o bastante para acomodá-la. */
const LARGURA_CARTA_MAXIMA = 640;
const GAP_CARTAS = 12;
/** Margem lateral mínima reservada no mobile (m3-56) — casa com o `calc(100vw - 32px)` do SCSS. */
const MARGEM_LATERAL_MINIMA = 32;

/**
 * Bandeja de dados flutuante (m3-22): fixa na base central da tela, exibe as rolagens recentes
 * empilhadas (teste de atributo da Visão Geral, passos de preset). Lê o estado de
 * `BandejaDadosService`; não rola nada — só apresenta. Container preparado para "dados físicos" (3D)
 * numa feature futura. Só tokens do tema "Terminal de Contenção" (proibição #29).
 */
@Component({
  selector: 'app-bandeja-dados',
  imports: [Icone, ResultadoRolagem, Chip],
  templateUrl: './bandeja-dados.component.html',
  styleUrl: './bandeja-dados.component.scss',
})
export class BandejaDados {
  protected readonly RolagemVisibilidadeEnum = RolagemVisibilidadeEnum;
  protected readonly bandeja = inject(BandejaDadosService);

  /** Largura da viewport (m3-56) — reativa via `window:resize`, usada para encolher a carta no mobile. */
  private readonly larguraJanela = signal(window.innerWidth);

  @HostListener('window:resize')
  protected aoRedimensionarJanela(): void {
    this.larguraJanela.set(window.innerWidth);
  }

  /**
   * Largura real da carta (m3-56): a máxima de 640px (m3-55) quando a viewport comporta, encolhida
   * pra caber com folga (`MARGEM_LATERAL_MINIMA`) em telas de 360-430px — sem isso a carta ficava
   * clipada (`overflow-x: clip` do container) em vez de simplesmente menor. Exposta como CSS custom
   * property (`--bandeja-carta-largura`, ver SCSS) pra `width`/`flex-basis` da carta e usada aqui
   * também no cálculo do deslocamento — as duas fontes ficam sempre em sincronia.
   */
  protected readonly larguraCarta = computed(() =>
    Math.min(LARGURA_CARTA_MAXIMA, this.larguraJanela() - MARGEM_LATERAL_MINIMA),
  );

  /**
   * Desloca a pilha (px) para a **esquerda** de modo que a carta mais nova (índice 0) fique sempre
   * centralizada na tela; as anteriores acumulam à esquerda dela. 0 quando há uma só (já centrada).
   * Conta só as cartas **não** `saindo`: uma carta em saída já colapsa pra largura 0 via CSS (m3-55);
   * se o desvio só reagisse depois que ela some do array (280ms depois, em `remover`), a pilha dava
   * um salto adicional bem depois do colapso — visível só com 2+ cartas (com 1 só, o desvio é sempre 0).
   */
  protected readonly deslocamento = computed(() => {
    const visiveis = this.bandeja.entradas().filter((entrada) => !entrada.saindo).length;
    return (-Math.max(visiveis - 1, 0) * (this.larguraCarta() + GAP_CARTAS)) / 2;
  });

  /** Opacidade por posição: a mais nova (índice 0, centralizada) cheia; o histórico à esquerda esmaece. */
  protected opacidade(indice: number): number {
    return Math.max(0.3, 1 - indice * 0.22);
  }
}
