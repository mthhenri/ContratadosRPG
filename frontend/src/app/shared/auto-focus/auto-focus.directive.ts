import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

/**
 * Foca o elemento hospedeiro assim que ele é renderizado — via script (`HTMLElement.focus()`),
 * não pelo atributo HTML `autofocus`. O `autofocus` declarativo só é honrado **uma vez por
 * documento** (a "autofocus processed flag" da spec): num SPA como este, a primeira vez que ele
 * dispara em qualquer elemento da página trava a flag, e todo `autofocus` inserido depois (ex.: um
 * botão de confirmação que troca de lugar com outro ao pedir confirmação de remover) é
 * silenciosamente ignorado — o elemento nunca ganha foco de verdade, então clicar fora nunca
 * dispara `(blur)` pra cancelar. Chamar `.focus()` via script não tem essa limitação.
 *
 * Achado ao vivo (não coberto por teste unitário — `TestBed` sempre insere a fixture no DOM real
 * antes do `afterNextRender`, mascarando a corrida): neste app **zoneless** (sem `zone.js`), o
 * `afterNextRender` às vezes roda antes de o nó físico do elemento estar `isConnected` — o commit
 * do template que o insere no DOM pode ficar um passo atrás do que o `afterNextRender` observa.
 * `.focus()` num nó desconectado é *no-op* silencioso: o elemento nunca ganha foco de verdade, e
 * por isso clicar fora não fecha (nada estava focado pra disparar `(blur)`) — só um clique manual
 * nele (foco real do usuário) resolveria. Reagendar para o próximo macrotask quando ainda
 * desconectado resolve sem custo perceptível no caso comum (conectado de primeira, sem o
 * `setTimeout`). Conteúdo projetado atrás do `@if` de **outro** componente (ex.: o campo dentro de
 * `app-valor-editavel`) tem uma corrida mais séria — o próprio `editando()` lido nesse outro
 * componente pode ainda não ter o DOM atualizado quando o hook roda — e por isso é resolvido no
 * próprio primitivo (`valor-editavel.component.ts`), não aqui.
 *
 * @example
 * ```html
 * <button appAutoFocus (blur)="cancelar()">✓</button>
 * ```
 */
@Directive({
  selector: '[appAutoFocus]',
})
export class AutoFocus {
  private readonly elemento = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => this.focar());
  }

  private focar(): void {
    const elemento = this.elemento.nativeElement;
    if (!elemento.isConnected) {
      setTimeout(() => elemento.focus());
      return;
    }
    elemento.focus();
  }
}
