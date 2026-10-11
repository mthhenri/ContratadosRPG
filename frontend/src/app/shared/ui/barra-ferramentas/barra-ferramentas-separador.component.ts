import { Component } from '@angular/core';

/** Traço vertical entre grupos de ações de `app-barra-ferramentas`. */
@Component({
  selector: 'app-barra-ferramentas-separador',
  template: '',
  styles: [
    `
      :host {
        display: block;
        align-self: stretch;
        width: 1px;
        margin: var(--space-4) 2px;
        background: var(--border-strong);
      }
    `,
  ],
  host: { role: 'separator', 'aria-orientation': 'vertical' },
})
export class BarraFerramentasSeparador {}
