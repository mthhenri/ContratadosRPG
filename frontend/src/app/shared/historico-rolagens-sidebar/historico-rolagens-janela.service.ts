import { Injectable, inject } from '@angular/core';

import { JanelaExternaService } from '../janela-externa/janela-externa.service';

/** Visão que abriu o histórico da campanha — define para onde a janela oferece voltar. */
export type OrigemJanelaCampanha = 'campanha' | 'espectador';

/** Mantém a janela externa e o espaço do histórico local sincronizados nesta aba. */
@Injectable({ providedIn: 'root' })
export class HistoricoRolagensJanelaService {
  private readonly janelaExterna = inject(JanelaExternaService);

  estaAbertaFicha(fichaId: number): boolean {
    return this.janelaExterna.estaAberta(`ficha:${fichaId}`);
  }

  estaAbertaCampanha(campanhaId: number): boolean {
    return this.janelaExterna.estaAberta(`campanha:${campanhaId}`);
  }

  abrirFicha(fichaId: number, tipo: 'jogador' | 'criatura' = 'jogador'): boolean {
    const sufixo = tipo === 'criatura' ? '?tipo=criatura' : '';
    return this.janelaExterna.abrir(
      `ficha:${fichaId}`,
      `/janela/ficha/${fichaId}/historico-rolagens${sufixo}`,
    );
  }

  /**
   * A origem só decide o "Voltar" da janela: o espectador não pode abrir `/campanhas/:id`. A janela
   * continua sendo uma por campanha, qualquer que seja a visão que a abriu.
   */
  abrirCampanha(campanhaId: number, origem: OrigemJanelaCampanha = 'campanha'): boolean {
    const sufixo = origem === 'espectador' ? '?origem=espectador' : '';
    return this.janelaExterna.abrir(
      `campanha:${campanhaId}`,
      `/janela/campanha/${campanhaId}/historico-rolagens${sufixo}`,
    );
  }
}
