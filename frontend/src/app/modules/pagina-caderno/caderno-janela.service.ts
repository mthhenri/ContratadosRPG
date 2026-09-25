import { Injectable, inject } from '@angular/core';

import { JanelaExternaService } from '../../shared/janela-externa/janela-externa.service';

/** Caderno de uma campanha aberto em janela externa (I-027) — uma janela por campanha nesta aba. */
@Injectable({ providedIn: 'root' })
export class CadernoJanelaService {
  private readonly janelaExterna = inject(JanelaExternaService);

  estaAberta(campanhaId: number): boolean {
    return this.janelaExterna.estaAberta(`caderno:${campanhaId}`);
  }

  /**
   * Nasce com o tamanho inicial do painel (960px de largura), acima do breakpoint mobile (560px):
   * o corpo mantém a lista de páginas ao lado do editor. Abaixo de 640px a lista passa a abrir
   * sobre o editor, como no painel estreitado.
   */
  abrir(campanhaId: number): boolean {
    return this.janelaExterna.abrir(
      `caderno:${campanhaId}`,
      `/janela/campanha/${campanhaId}/caderno`,
      { largura: 960, altura: 720 },
    );
  }
}
