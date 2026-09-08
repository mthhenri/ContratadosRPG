import { Component, effect, input, signal } from '@angular/core';

import { Icone } from '../../icone/icone.component';
import { Tooltip } from '../../tooltip/tooltip.directive';
import { BotaoIcone } from '../botao-icone/botao-icone.component';

const PREFIXO_ARMAZENAMENTO = 'contratados-rpg:coluna-acoes:';

/**
 * Coluna de ações lateral (`campanha-detalhe-mestre-coluna-acoes.spec.md`) — substitui
 * `.utilitario-flutuante` na visão de mestre da campanha, por ora (os outros 6 consumidores de
 * `.utilitario-flutuante` ficam fora de escopo). Participa do fluxo normal do layout (flex, nunca
 * `position: fixed`) — expandir/retrair empurra o conteúdo ao lado em vez de sobrepor. Estado
 * expandido/retraído persiste em `localStorage` por `[id]`, mesmo padrão de `app-painel-flutuante`.
 * No mobile vira barra inferior fixa (mesmo racional de `.ficha-nav`), sempre com rótulo abaixo do
 * ícone e sem o botão de alternar (decisão validada no POC visual do autor).
 */
@Component({
  selector: 'app-coluna-acoes',
  imports: [BotaoIcone, Icone, Tooltip],
  templateUrl: './coluna-acoes.component.html',
  styleUrl: './coluna-acoes.component.scss',
  host: {
    class: 'coluna-acoes',
    role: 'navigation',
    '[class.coluna-acoes--expandida]': 'expandida()',
    '[attr.aria-label]': 'rotulo()',
  },
})
export class ColunaAcoes {
  /** Chave de persistência (`localStorage`) — única por instância da coluna. */
  readonly id = input.required<string>();
  readonly rotulo = input.required<string>();

  protected readonly expandida = signal(false);
  private carregouEstadoPersistido = false;

  constructor() {
    // Estado persistido depende de `[id]`, input required — só disponível a partir do primeiro
    // `effect()` (NG0118 se lido no corpo do construtor). `carregouEstadoPersistido` garante que
    // só carrega uma vez, mesmo que o `effect` rode de novo por outro motivo.
    effect(() => {
      const id = this.id();
      if (this.carregouEstadoPersistido) return;
      this.carregouEstadoPersistido = true;
      this.expandida.set(carregarEstado(id));
    });
  }

  protected alternar(): void {
    this.expandida.update((atual) => {
      const proximo = !atual;
      persistirEstado(this.id(), proximo);
      return proximo;
    });
  }
}

function carregarEstado(id: string): boolean {
  try {
    return globalThis.localStorage?.getItem(PREFIXO_ARMAZENAMENTO + id) === 'true';
  } catch {
    return false;
  }
}

function persistirEstado(id: string, expandida: boolean): void {
  try {
    globalThis.localStorage?.setItem(PREFIXO_ARMAZENAMENTO + id, String(expandida));
  } catch {
    // Preferência efêmera se o armazenamento local estiver indisponível.
  }
}
