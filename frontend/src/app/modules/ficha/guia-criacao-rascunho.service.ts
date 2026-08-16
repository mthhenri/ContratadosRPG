import { Injectable } from '@angular/core';

const PREFIXO = 'contratados-rpg.guia-criacao';

/** Guia que usa o rascunho — cada um tem sua própria chave, senão o guia de agente e o de
 * criatura (mesmo `campanhaId`, mesmo navegador) se sobrescreveriam mutuamente. */
export type TipoGuiaCriacao = 'agente' | 'criatura';

@Injectable({ providedIn: 'root' })
export class GuiaCriacaoRascunhoService {
  recuperar<T>(campanhaId: number | null, tipo: TipoGuiaCriacao): T | null {
    const bruto = localStorage.getItem(this.chave(campanhaId, tipo));
    if (!bruto) return null;
    try { return JSON.parse(bruto) as T; } catch { this.limpar(campanhaId, tipo); return null; }
  }

  salvar<T>(campanhaId: number | null, tipo: TipoGuiaCriacao, estado: T): void {
    localStorage.setItem(this.chave(campanhaId, tipo), JSON.stringify(estado));
  }

  limpar(campanhaId: number | null, tipo: TipoGuiaCriacao): void {
    localStorage.removeItem(this.chave(campanhaId, tipo));
  }

  /** `null` (ficha avulsa, sem campanha) cai numa chave fixa — nunca colide com um `campanhaId` numérico. */
  private chave(campanhaId: number | null, tipo: TipoGuiaCriacao): string {
    return `${PREFIXO}.${tipo}.${campanhaId ?? 'acervo'}`;
  }
}
