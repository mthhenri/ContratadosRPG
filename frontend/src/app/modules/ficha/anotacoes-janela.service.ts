import { Injectable, inject } from '@angular/core';

import { JanelaExternaService } from '../../shared/janela-externa/janela-externa.service';

/** Anotações de uma ficha abertas em janela externa — uma janela por ficha nesta aba. */
@Injectable({ providedIn: 'root' })
export class AnotacoesJanelaService {
  private readonly janelaExterna = inject(JanelaExternaService);

  estaAberta(fichaId: number): boolean {
    return this.janelaExterna.estaAberta(`anotacoes:${fichaId}`);
  }

  /**
   * Nasce com 640px de largura, acima do breakpoint mobile (560px): abaixo dele o editor markdown
   * prende a barra de ferramentas no rodapé enquanto tem foco (lugar do teclado virtual) e, numa
   * janela de desktop sem teclado, ela cobre "Salvar"/"Cancelar" — achado na verificação ao vivo.
   */
  abrir(fichaId: number, tipo: 'jogador' | 'criatura' = 'jogador'): boolean {
    const sufixo = tipo === 'criatura' ? '?tipo=criatura' : '';
    return this.janelaExterna.abrir(
      `anotacoes:${fichaId}`,
      `/janela/ficha/${fichaId}/anotacoes${sufixo}`,
      { largura: 640, altura: 720 },
    );
  }
}
