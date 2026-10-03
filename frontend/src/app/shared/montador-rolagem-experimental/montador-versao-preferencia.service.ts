import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

import { type MontadorVersao, resolverMontadorVersao } from './montador-versao';

const CHAVE_PERSISTENCIA = 'contratados-rpg.montador-rolagem.versao';

/**
 * Versão do montador escolhida neste dispositivo (`montador-rolagem-experimento`, decisão 8): só
 * `localStorage`, best-effort como o `VersaoService` — vazio, inválido ou armazenamento indisponível
 * resolvem para o **Atual**, e uma escrita que falha não quebra a tela (vale até a próxima recarga). Sem
 * banco nem perfil: isso só existe se o montador final mantiver a preferência.
 */
@Injectable({ providedIn: 'root' })
export class MontadorVersaoPreferenciaService {
  private readonly documento = inject(DOCUMENT);

  private readonly versaoAtual = signal<MontadorVersao>(this.restaurar());

  /** Versão escolhida (padrão `ATUAL`). */
  readonly versao = this.versaoAtual.asReadonly();

  escolherVersao(versao: MontadorVersao): void {
    this.versaoAtual.set(versao);
    try {
      this.documento.defaultView?.localStorage.setItem(CHAVE_PERSISTENCIA, versao);
    } catch {
      /* persistência é best-effort */
    }
  }

  private restaurar(): MontadorVersao {
    try {
      return resolverMontadorVersao(this.documento.defaultView?.localStorage.getItem(CHAVE_PERSISTENCIA));
    } catch {
      return resolverMontadorVersao(null);
    }
  }
}
