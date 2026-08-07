import { Injectable } from '@angular/core';

const PREFIXO = 'contratados-rpg.guia-criacao';

@Injectable({ providedIn: 'root' })
export class GuiaCriacaoRascunhoService {
  recuperar<T>(campanhaId: number | null): T | null {
    const bruto = localStorage.getItem(this.chave(campanhaId));
    if (!bruto) return null;
    try { return JSON.parse(bruto) as T; } catch { this.limpar(campanhaId); return null; }
  }

  salvar<T>(campanhaId: number | null, estado: T): void {
    localStorage.setItem(this.chave(campanhaId), JSON.stringify(estado));
  }

  limpar(campanhaId: number | null): void {
    localStorage.removeItem(this.chave(campanhaId));
  }

  /** `null` (ficha avulsa, sem campanha) cai numa chave fixa — nunca colide com um `campanhaId` numérico. */
  private chave(campanhaId: number | null): string { return `${PREFIXO}.${campanhaId ?? 'acervo'}`; }
}
