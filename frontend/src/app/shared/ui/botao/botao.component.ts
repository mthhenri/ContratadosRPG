import { Component, computed, input } from '@angular/core';

import { Icone } from '../../icone/icone.component';

/**
 * Severidade do botão — escolhe a **cor**. Cobre as oito do `ButtonSeverity` do PrimeNG 21
 * (`primary`, `secondary`, `success`, `info`, `warn`, `danger`, `help`, `contrast`), para que a
 * saída do PrimeNG (`ui-05`) não deixe a biblioteca própria mais pobre do que o que existia.
 * `positivo` mantém o nome que o produto já usa para o `success`.
 */
export type BotaoVariante =
  | 'primario'
  | 'secundario'
  | 'positivo'
  | 'info'
  | 'aviso'
  | 'perigo'
  | 'ajuda'
  | 'contraste';

/**
 * Estilo — escolhe **como** a cor da variante é aplicada. Equivale a `outlined`/`text`/`link` do
 * PrimeNG. Cada variante tem um padrão (ver `botao.component.scss`): `secundario` e `perigo`
 * nascem em `contorno`, porque é o que o produto já pratica nas 20 cópias de `.botao`; as demais
 * nascem em `preenchido`. Informar `estilo` sobrescreve o padrão.
 */
export type BotaoEstilo = 'preenchido' | 'contorno' | 'texto' | 'link';

/**
 * Degraus de tamanho oferecidos pelo primitivo, medidos nos agrupamentos reais da auditoria da
 * `ui-01` — não convertidos das medidas do PrimeNG. **Opcional de propósito:** sem `tamanho`, o
 * primitivo não define dimensão nenhuma e o consumidor continua dono do tamanho, como a `ui-01`
 * estabeleceu.
 */
export type BotaoTamanho = 'pequeno' | 'medio' | 'grande';

/** Posição do ícone projetado em relação ao rótulo. Equivale ao `iconPos` do PrimeNG. */
export type BotaoPosicaoIcone = 'esquerda' | 'direita' | 'acima' | 'abaixo';

/**
 * Primitivo de botão da biblioteca própria (ui-01 · ui-01b · `P-034`). Substitui o bloco `.botao`
 * que hoje está copiado em 20 arquivos SCSS.
 *
 * Veste o `<button>`/`<a>` do consumidor por seletor de atributo em vez de embrulhá-lo: o host
 * É o elemento nativo, então não há nó novo dentro dos containers flex/grid onde os botões
 * vivem, `type`/`disabled`/foco/semântica continuam nativos, e a classe-companheira que o
 * consumidor já usa para dimensionar (`autenticacao__enviar`, `detalhe__acao`…) segue valendo.
 *
 * Divisão de responsabilidade — o primitivo é dono da **identidade** (raio, fonte mono, cursor,
 * transição, cores da variante, estado desabilitado); o consumidor continua dono do **tamanho**
 * e do layout, a menos que peça um `tamanho` explícito.
 *
 * O foco de teclado não é definido aqui: `styles/tema/_base.scss` já dá
 * `outline: 2px solid var(--accent-border)` a todo `a`/`button` em `:focus-visible`.
 *
 * Fora da paridade com o PrimeNG, por decisão registrada na `ui-01b`: `rounded` e `raised`, que
 * contrariam "sem raio maior que 6px" e "sem sombra pesada" do `DESIGN.md`; e `badge`, que é
 * outro componente dentro do botão, não uma variante dele.
 */
@Component({
  selector: 'button[app-botao], a[app-botao]',
  imports: [Icone],
  template: `
    @if (carregando()) {
      <app-icone class="botao__carregando" nome="carregando" />
    }
    <ng-content />
  `,
  styleUrl: './botao.component.scss',
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'carregando() ? "true" : null',
  },
})
export class Botao {
  /**
   * Severidade/cor. Opcional: 3 chamadas do produto usam `class="botao"` sem modificador e ficam
   * só com a base (raio, fonte, cursor), sem preenchimento nem borda.
   */
  readonly variante = input<BotaoVariante>();

  /** Sobrescreve o estilo padrão da variante. */
  readonly estilo = input<BotaoEstilo>();

  /** Degrau de tamanho. Sem valor, o tamanho continua sendo do consumidor. */
  readonly tamanho = input<BotaoTamanho>();

  /** Posição do ícone projetado. Sem valor, a ordem é a que o consumidor escreveu no template. */
  readonly posicaoIcone = input<BotaoPosicaoIcone>();

  /** Ocupa toda a largura disponível. Equivale ao `fluid` do PrimeNG. */
  readonly fluido = input(false);

  /**
   * Mostra o giro de carregamento e marca `aria-busy`, além de barrar o clique por ponteiro.
   * **Não** desabilita o botão: `disabled` continua sendo do consumidor — que é como o produto
   * já faz (`[disabled]="enviando()"`) — para as duas fontes não brigarem pelo mesmo atributo.
   */
  readonly carregando = input(false);

  /**
   * Classes BEM do host. São emitidas como uma lista só porque são muitas; o
   * `botao.component.spec` prova que isso preserva a classe-companheira do consumidor.
   *
   * A classe de estilo só sai quando o estilo é **explícito** — nenhum SCSS legado usa o nome
   * `botao--estilo-*`, então a coexistência com as cópias durante a `ui-04` segue sem empate de
   * especificidade.
   */
  protected readonly classes = computed(() => {
    const partes = ['botao'];
    const variante = this.variante();
    const estilo = this.estilo();
    const tamanho = this.tamanho();
    const posicaoIcone = this.posicaoIcone();

    if (variante) partes.push(`botao--${variante}`);
    if (estilo) partes.push(`botao--estilo-${estilo}`);
    if (tamanho) partes.push(`botao--${tamanho}`);
    if (posicaoIcone) partes.push(`botao--icone-${posicaoIcone}`);
    if (this.fluido()) partes.push('botao--fluido');
    if (this.carregando()) partes.push('botao--carregando');

    return partes.join(' ');
  });
}
