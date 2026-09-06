import { Component, input, output } from '@angular/core';

import { Botao, type BotaoVariante } from '../botao/botao.component';
import { Tooltip } from '../../tooltip/tooltip.directive';

/**
 * Primitivo de "valor da ficha que vira campo de edição ao clicar" (`P-057`). Absorve a máquina de
 * estado exibição↔edição e a identidade visual do estado de exibição — hoje reimplementadas em
 * CSS local em ~30 ocorrências (`ficha-ident__nome`, `criatura__stat-valor`,
 * `barra-recurso__valor-atual`...).
 *
 * Não genereciza o **tipo** do campo de edição: `number`/`text`/`select` variam de ocorrência
 * para ocorrência, cada um com a própria assinatura de confirmação (`confirmar*()`). O estado de
 * edição continua sendo o `<input>`/`<select>` do consumidor, projetado via `<ng-content />` —
 * este primitivo só decide **quando** mostrá-lo (`[editando]`, controlado como `[aberto]` no
 * `app-modal`).
 *
 * O estado de exibição é um `button[app-botao][estilo="texto"]` interno — reaproveita cor/hover/
 * cursor do primitivo de botão em vez de duplicá-los. `[variante]` deixa o consumidor pedir uma
 * cor semântica (ex.: `aviso` para um valor em alerta); sem valor, cai em `secundario` (neutro).
 * `[desabilitado]` desabilita o botão interno (herda o esmaecido `opacity: 0.55` do `app-botao`) —
 * cobre o padrão `[disabled]="!ajustavel()"` que várias ocorrências já usam.
 *
 * Tamanho/tipografia continuam do consumidor: propriedades herdáveis (`font-size`, `color`,
 * `font-weight`) atravessam o `display: contents` do host a partir da classe-companheira que o
 * consumidor já aplica no próprio `<app-valor-editavel>` (mesma divisão de responsabilidade do
 * `app-botao`).
 */
@Component({
  selector: 'app-valor-editavel',
  imports: [Botao, Tooltip],
  templateUrl: './valor-editavel.component.html',
  styleUrl: './valor-editavel.component.scss',
})
export class ValorEditavel {
  readonly valor = input.required<string | number>();
  /** Controlado pelo consumidor — o mesmo signal que decide qual `<input>`/`<select>` projetar. */
  readonly editando = input.required<boolean>();
  readonly desabilitado = input(false);
  /** Vira `aria-label="Editar " + rotuloAria()` no botão do estado de exibição. */
  readonly rotuloAria = input.required<string>();
  readonly variante = input<BotaoVariante>('secundario');
  /**
   * Texto de `appTooltip` no botão do estado de exibição — precisa ser um input do primitivo
   * (não algo que o consumidor anexe direto no `<app-valor-editavel>`) porque o `Tooltip` mede
   * `getBoundingClientRect()` do próprio host, e o host daqui é `display: contents` (retângulo
   * zerado). Sem valor, nenhum tooltip é anexado.
   */
  readonly tooltip = input<string | null>(null);
  /**
   * Alinhamento do botão dentro do contêiner flex/grid do consumidor. O host é `display: contents`
   * (some da geração de caixa), então `align-self`/`justify-self` postos de fora não têm efeito —
   * o botão interno vira o item de flex/grid de verdade e precisa do próprio alinhamento. Sem
   * valor, `inicio` (não esticar, não centralizar) é o seguro pra contêiner column sem
   * `align-items` explícito (`stretch` é o padrão do CSS); boxes centralizados (ex.: Reações/
   * Contra-ataque) pedem `centro`; um contêiner que já declara o próprio alinhamento (ex.:
   * `align-items: baseline` das tags de Deslocamento) pede `auto` — não sobrescrever o que o
   * consumidor já decidiu.
   */
  readonly alinhamento = input<'inicio' | 'centro' | 'auto'>('inicio');
  /**
   * Ocupa a largura inteira do contêiner (`display: block; width: 100%`) em vez de abraçar só o
   * texto — cobre o padrão "cartão inteiro clicável" (ex.: VD/Tenacidade/Defesa da Criatura, uma
   * caixa de grid inteira), distinto do padrão "texto no meio de uma frase" (Nível/Nome/Vida) que é
   * o default.
   */
  readonly bloco = input(false);
  /**
   * Repassa um valor de `flex` (shorthand CSS) pro botão interno — escape-hatch pro caso de um
   * item de flex-row que precisa crescer/encolher com base própria (ex.: `criatura__info-nota-
   * texto`, `flex: 1 1 200px`, pra empurrar o texto a quebrar linha em vez de estourar a linha).
   * Também zera o `min-width` do botão (senão o texto não quebra dentro do espaço encolhido).
   */
  readonly flex = input<string | null>(null);

  readonly editarSolicitado = output<void>();
}
