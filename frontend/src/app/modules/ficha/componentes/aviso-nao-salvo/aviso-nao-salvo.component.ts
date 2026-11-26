import { Component, input } from '@angular/core';

import { Icone } from '../../../../shared/icone/icone.component';

/**
 * Aviso fixo de salvamento recusado, logo abaixo do cabeçalho da ficha (Agente e Criatura). A
 * mudança continua na tela e o aviso fica até um salvamento passar (decisão do autor, 2026-11-26;
 * P-140). Mesmo tom do "Falha ao salvar" da ficha de NPC.
 */
@Component({
  selector: 'app-aviso-nao-salvo',
  imports: [Icone],
  template: `
    <p class="aviso-nao-salvo" role="alert">
      <app-icone nome="alerta" />
      <span class="aviso-nao-salvo__texto">
        <span><strong>Não salvo</strong> — {{ motivo() }}</span>
        <span class="aviso-nao-salvo__dica">A mudança continua na tela; corrija e ela salva sozinha.</span>
      </span>
    </p>
  `,
  styles: `
    :host {
      display: block;
    }

    .aviso-nao-salvo {
      display: flex;
      align-items: flex-start;
      gap: var(--space-8);
      margin: 0 0 var(--space-12);
      padding: var(--space-8) var(--space-12);
      font: 13px/1.5 var(--font-sans);
      color: var(--text);
      background: color-mix(in srgb, var(--erro) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--erro) 40%, transparent);
      border-radius: var(--radius-control);

      app-icone {
        flex: none;
        margin-top: 3px;
        color: var(--erro);
      }

      strong {
        color: var(--erro);
      }
    }

    .aviso-nao-salvo__texto {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      overflow-wrap: break-word;
    }

    .aviso-nao-salvo__dica {
      font-size: 12px;
      color: var(--text-dim);
    }
  `,
})
export class AvisoNaoSalvo {
  /** Mensagem do servidor na recusa. */
  readonly motivo = input.required<string>();
}
