import { Injectable } from '@angular/core';

const PREFIXO = 'contratados-rpg.guia-criacao';

@Injectable({ providedIn: 'root' })
export class GuiaCriacaoRascunhoService {
  recuperar<T>(campanhaId: number): T | null {
    const bruto = localStorage.getItem(this.chave(campanhaId));
    if (!bruto) return null;
    try { return JSON.parse(bruto) as T; } catch { this.limpar(campanhaId); return null; }
  }

  salvar<T>(campanhaId: number, estado: T): void {
    localStorage.setItem(this.chave(campanhaId), JSON.stringify(estado));
  }

  limpar(campanhaId: number): void {
    localStorage.removeItem(this.chave(campanhaId));
  }

  private chave(campanhaId: number): string { return `${PREFIXO}.${campanhaId}`; }
}
