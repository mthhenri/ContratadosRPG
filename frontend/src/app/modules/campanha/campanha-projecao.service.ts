import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import type {
  CampanhaPainelEspectadorDto,
  CampanhaPreviaJogadorDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP das projeções de leitura de `m8-espectadores-campanha` (m8-02 backend, m8-03/m8-04
 * frontend) — `GET campanha/:id/painel-espectador` (legível por `ESPECTADOR` e por `MESTRE` em
 * prévia) e `GET campanha/:id/previa-jogador/:usuarioAlvoId[/ficha/:fichaId]` (só mestre — prévia
 * de jogador, m8-04). Só transporte, sem regra de negócio: quem decide o recorte é sempre
 * `CampanhaProjecaoService` (backend).
 */
@Injectable({ providedIn: 'root' })
export class CampanhaProjecaoService {
  private readonly httpClient = inject(HttpClient);

  private readonly base = `${environment.apiBase}/campanha`;

  /** Painel do espectador — identidade segura da campanha + feed paginado de rolagens `PUBLICA`. */
  recuperarPainelEspectador(
    id: number,
    pagina = 1,
    itensPorPagina = 20,
  ): Observable<CampanhaPainelEspectadorDto> {
    return this.httpClient
      .get<StandardResponse<CampanhaPainelEspectadorDto>>(`${this.base}/${id}/painel-espectador`, {
        params: { pagina, itensPorPagina },
      })
      .pipe(map((resposta) => resposta.dados as CampanhaPainelEspectadorDto));
  }

  /**
   * Prévia de jogador (m8-04) — fichas visíveis, membros/Equipe, feed e capacidade de inventário
   * de esquadrão, tudo calculado com a identidade do **alvo** (`usuarioAlvoId`), nunca do mestre
   * que requisita.
   */
  recuperarPreviaJogador(id: number, usuarioAlvoId: number): Observable<CampanhaPreviaJogadorDto> {
    return this.httpClient
      .get<StandardResponse<CampanhaPreviaJogadorDto>>(
        `${this.base}/${id}/previa-jogador/${usuarioAlvoId}`,
      )
      .pipe(map((resposta) => resposta.dados as CampanhaPreviaJogadorDto));
  }

  /**
   * Ficha completa (com `dados`) dentro da prévia de jogador (m8-04) — visibilidade/redação
   * calculadas para o alvo, nunca para o mestre. Usado ao selecionar a própria ficha do alvo ou a
   * de um colega compartilhada, exatamente como `FichaService.recuperarFicha` alimenta
   * `fichaExibidaDados` na visão normal de jogador.
   */
  recuperarFichaPreviaJogador(
    id: number,
    usuarioAlvoId: number,
    fichaId: number,
  ): Observable<FichaRecuperadaDto> {
    return this.httpClient
      .get<StandardResponse<FichaRecuperadaDto>>(
        `${this.base}/${id}/previa-jogador/${usuarioAlvoId}/ficha/${fichaId}`,
      )
      .pipe(map((resposta) => resposta.dados as FichaRecuperadaDto));
  }
}
