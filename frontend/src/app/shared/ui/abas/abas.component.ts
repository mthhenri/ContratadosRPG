import { Component, contentChildren, input, output } from '@angular/core';

import { Aba } from './aba.component';

/**
 * Barra de abas (`ui-03` · `P-034`), companion de `app-aba`. Auditoria comparou as duas origens
 * do catálogo (`ficha-visualizacao` e `simulacao-shell`): a Ficha e a `criatura-visualizacao`
 * batem quase 1:1 com o `.abas` canônico (fundo/borda/raio do container, `--bg` sobre `--accent`
 * no item ativo); a Simulação usa outro estilo de ativo (`.selecionavel--ativo`, sem moldura no
 * container) e é feita de `<a routerLink>` — navegação de rota, não troca de painel no lugar, o
 * que não é semântica de `tablist`/`tab` da WAI-ARIA. Por isso o primitivo segue o par
 * Ficha/Criatura; a barra da Simulação fica fora da adoção-piloto desta task.
 *
 * A `criatura-visualizacao` já tinha `role="tablist"`/`role="tab"`/`aria-selected` corretos, mas
 * nenhuma das barras reais tinha navegação por teclado — só existia, escrita e correta, porém
 * nunca ligada ao template, em `ficha-visualizacao.component.ts` (`navegarAbas`/`focarAba`,
 * m3-11). Este componente recupera esse algoritmo (ativação automática: mover o foco com as
 * setas já seleciona, como o código morto fazia) em vez de reescrevê-lo.
 *
 * Papéis: `Abas` é o `tablist`, `Aba` é o `tab`. O `tabpanel` fica com `AbaPainel`
 * (`[appAbaPainel]`), que o consumidor aplica no próprio container de conteúdo — este primitivo
 * não assume dono do conteúdo de cada aba.
 */
@Component({
  selector: 'app-abas',
  template: `<ng-content />`,
  styleUrl: './abas.component.scss',
  host: {
    class: 'abas',
    role: 'tablist',
    '[attr.aria-label]': 'rotulo()',
    '(keydown)': 'onTeclado($event)',
  },
})
export class Abas {
  /** Rótulo acessível da barra (`aria-label` do `tablist`). */
  readonly rotulo = input.required<string>();

  /**
   * Emite o `[valor]` do item para o qual o foco acabou de mover (seta ou Home/End) — o
   * consumidor chama a mesma seleção que já usa no `(click)` de cada `app-aba`.
   */
  readonly navegou = output<string>();

  private readonly itens = contentChildren(Aba);

  protected onTeclado(evento: KeyboardEvent): void {
    const itens = this.itens();
    if (itens.length === 0) return;

    // `estaFocado()` (foco real de DOM, síncrono) em vez de `ativa()` (sinal do consumidor, só
    // atualiza no próximo ciclo de detecção de mudanças) — ver o comentário de `Aba.estaFocado`.
    let indiceAtivo = itens.findIndex((item) => item.estaFocado());
    if (indiceAtivo === -1) indiceAtivo = itens.findIndex((item) => item.ativa());
    let proximoIndice: number;

    switch (evento.key) {
      case 'ArrowRight':
        proximoIndice = indiceAtivo === -1 ? 0 : (indiceAtivo + 1) % itens.length;
        break;
      case 'ArrowLeft':
        proximoIndice = indiceAtivo === -1 ? itens.length - 1 : (indiceAtivo - 1 + itens.length) % itens.length;
        break;
      case 'Home':
        proximoIndice = 0;
        break;
      case 'End':
        proximoIndice = itens.length - 1;
        break;
      default:
        return;
    }

    evento.preventDefault();
    const alvo = itens[proximoIndice];
    alvo.focar();
    this.navegou.emit(alvo.valor());
  }
}
