import { Component, computed, effect, input, signal, untracked } from '@angular/core';

import { Icone } from '../../icone/icone.component';
import { Tooltip } from '../../tooltip/tooltip.directive';
import { BotaoIcone } from '../botao-icone/botao-icone.component';

/** Uma preferência só, para todas as colunas do site (ui-43). */
const CHAVE_ARMAZENAMENTO = 'contratados-rpg:coluna-acoes';
/** Chave antiga, uma por tela (`<prefixo><id>`) — só lida para migrar quem ainda não tem a nova. */
const PREFIXO_ARMAZENAMENTO_POR_TELA = 'contratados-rpg:coluna-acoes:';

/**
 * Expandida ou retraída — **o mesmo estado em todas as telas** (ui-43, pedido do autor: "se a minha
 * barra lateral está aberta, ela tem que ficar aberta em todos"). Fica no módulo, e não na
 * instância, para duas colunas vivas ao mesmo tempo (o esqueleto e a coluna real da campanha, ou a
 * tela que sai e a que entra) nunca discordarem. `null` até a primeira coluna ler o armazenamento.
 */
const expandidaCompartilhada = signal<boolean | null>(null);

/**
 * Coluna de ações lateral (`campanha-detalhe-mestre-coluna-acoes.spec.md`) — substitui
 * `.utilitario-flutuante` na visão de mestre da campanha, por ora (os outros 6 consumidores de
 * `.utilitario-flutuante` ficam fora de escopo). Participa do fluxo normal do layout (flex, nunca
 * `position: fixed`) — expandir/retrair empurra o conteúdo ao lado em vez de sobrepor. Estado
 * expandido/retraído é **um só para o site inteiro** (ui-43), persistido em `localStorage`; antes
 * era um por `[id]`, e a primeira leitura ainda migra a chave antiga da tela.
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
  /** Identifica a tela da coluna; desde a ui-43 só serve para migrar a preferência antiga dela. */
  readonly id = input.required<string>();
  readonly rotulo = input.required<string>();

  protected readonly expandida = computed(() => expandidaCompartilhada() ?? false);

  constructor() {
    // A primeira coluna do site lê o armazenamento; as demais já encontram o estado no módulo.
    // `[id]` é input required, só legível a partir do primeiro `effect()` (NG0118 no construtor).
    effect(() => {
      const id = this.id();
      if (untracked(expandidaCompartilhada) !== null) return;
      expandidaCompartilhada.set(carregarEstado(id));
    });
  }

  protected alternar(): void {
    const proximo = !this.expandida();
    expandidaCompartilhada.set(proximo);
    persistirEstado(proximo);
  }
}

/** A preferência do site; sem ela, a antiga da tela que abriu primeiro (migração da ui-43). */
function carregarEstado(id: string): boolean {
  try {
    const armazenamento = globalThis.localStorage;
    const valor =
      armazenamento?.getItem(CHAVE_ARMAZENAMENTO) ??
      armazenamento?.getItem(PREFIXO_ARMAZENAMENTO_POR_TELA + id);
    return valor === 'true';
  } catch {
    return false;
  }
}

function persistirEstado(expandida: boolean): void {
  try {
    globalThis.localStorage?.setItem(CHAVE_ARMAZENAMENTO, String(expandida));
  } catch {
    // Preferência efêmera se o armazenamento local estiver indisponível.
  }
}

/** Só para testes: esquece o estado do módulo, como um carregamento novo da página. */
export function reiniciarColunaAcoesParaTeste(): void {
  expandidaCompartilhada.set(null);
}
