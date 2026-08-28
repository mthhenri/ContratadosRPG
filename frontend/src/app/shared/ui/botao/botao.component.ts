import { Component, input } from '@angular/core';

/**
 * Variantes do botão. A lista sai da auditoria da ui-01 sobre os 142 usos de `.botao` em
 * template — `secundario` (62), `primario` (59), `perigo` (3) e `positivo` (1) — e não de
 * hipótese: variante sem caso real no produto não entra.
 */
export type BotaoVariante = 'primario' | 'secundario' | 'perigo' | 'positivo';

/**
 * Primitivo de botão da biblioteca própria (ui-01 · `P-034`). Substitui o bloco `.botao` que
 * hoje está copiado em 20 arquivos SCSS.
 *
 * Veste o `<button>`/`<a>` do consumidor por seletor de atributo em vez de embrulhá-lo: o host
 * É o elemento nativo, então não há nó novo dentro dos containers flex/grid onde os botões
 * vivem, `type`/`disabled`/foco/semântica continuam nativos, e a classe-companheira que o
 * consumidor já usa para dimensionar (`autenticacao__enviar`, `detalhe__acao`…) segue valendo.
 *
 * Divisão de responsabilidade — o primitivo é dono da **identidade** (raio, fonte mono, cursor,
 * transição, cores da variante, estado desabilitado); o consumidor continua dono do **tamanho**
 * (padding, `font-size`/`weight`, `min-height`, alvo de toque no mobile) e do layout. A auditoria
 * não autoriza outra divisão: não existe um padding "padrão" a extrair — existem mais de dez.
 *
 * O foco de teclado não é definido aqui: `styles/tema/_base.scss` já dá
 * `outline: 2px solid var(--accent-border)` a todo `a`/`button` em `:focus-visible`.
 */
@Component({
  selector: 'button[app-botao], a[app-botao]',
  template: '<ng-content />',
  styleUrl: './botao.component.scss',
  host: {
    class: 'botao',
    '[class.botao--primario]': "variante() === 'primario'",
    '[class.botao--secundario]': "variante() === 'secundario'",
    '[class.botao--perigo]': "variante() === 'perigo'",
    '[class.botao--positivo]': "variante() === 'positivo'",
  },
})
export class Botao {
  /**
   * Variante visual. Opcional: 3 chamadas usam `class="botao"` sem modificador e ficam só com a
   * base (raio, fonte, cursor), sem preenchimento nem borda.
   */
  readonly variante = input<BotaoVariante>();
}
