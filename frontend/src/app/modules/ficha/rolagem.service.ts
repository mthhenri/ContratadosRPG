import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import type { PaginatedResult, StandardResponse } from '@contratados-rpg/shared/interfaces';
import type {
  RolagemExcluidaDto,
  RolagemRegistrarDto,
  RolagemResumoDto,
} from '@contratados-rpg/shared/dtos/rolagem';

import { environment } from '../../../environments/environment';
import { TempoRealService } from '../../core/services/tempo-real.service';

/**
 * Cliente HTTP do módulo `rolagem` (m3-27) — registra e lista as rolagens disparadas a partir de
 * uma ficha. Só transporte: extrai o `dados` do `StandardResponse`, sem regra de negócio (a
 * permissão — §14, "quem vê a ficha rola" — e o recorte de visibilidade do feed são arbitrados
 * pelo backend). DTOs do shared (`./dtos/rolagem`), nunca redefinidos no front.
 */
@Injectable({ providedIn: 'root' })
export class RolagemService {
  private readonly httpClient = inject(HttpClient);
  private readonly tempoRealService = inject(TempoRealService);

  private readonly baseFicha = `${environment.apiBase}/ficha`;
  private readonly baseCampanha = `${environment.apiBase}/campanha`;
  private readonly baseEncontro = `${environment.apiBase}/encontro`;
  private readonly baseRolagem = `${environment.apiBase}/rolagem`;

  /**
   * Registra uma rolagem disparada a partir da ficha `fichaId`. Fire-and-forget do ponto de vista
   * de quem rola (o resultado já está na bandeja de dados antes desta chamada terminar) — quem
   * chama normalmente só assina para reconciliar o histórico local (`HistoricoRolagensSidebar`).
   */
  registrar(fichaId: number, dto: RolagemRegistrarDto): Observable<RolagemResumoDto> {
    return this.httpClient
      .post<StandardResponse<RolagemResumoDto>>(`${this.baseFicha}/${fichaId}/rolagem`, dto)
      .pipe(map((resposta) => resposta.dados as RolagemResumoDto));
  }

  /** Registra uma rolagem livre em nome de um combatente avulso do encontro. */
  registrarAvulso(
    encontroId: number,
    combatenteId: number,
    dto: RolagemRegistrarDto,
  ): Observable<RolagemResumoDto> {
    return this.httpClient
      .post<StandardResponse<RolagemResumoDto>>(
        `${this.baseEncontro}/${encontroId}/combatente/${combatenteId}/rolagem`,
        dto,
      )
      .pipe(map((resposta) => resposta.dados as RolagemResumoDto));
  }

  /** Histórico paginado de uma ficha (§10.5), mais recente primeiro. */
  listarPorFicha(
    fichaId: number,
    pagina = 1,
    itensPorPagina = 20,
  ): Observable<PaginatedResult<RolagemResumoDto>> {
    return this.httpClient
      .get<StandardResponse<PaginatedResult<RolagemResumoDto>>>(`${this.baseFicha}/${fichaId}/rolagem`, {
        params: { pagina, itensPorPagina },
      })
      .pipe(map((resposta) => resposta.dados as PaginatedResult<RolagemResumoDto>));
  }

  /** Feed de uma campanha (rolagens recentes, mais recente primeiro; privadas já filtradas pelo backend). */
  listarPorCampanha(campanhaId: number): Observable<RolagemResumoDto[]> {
    return this.httpClient
      .get<StandardResponse<RolagemResumoDto[]>>(`${this.baseCampanha}/${campanhaId}/rolagem`)
      .pipe(map((resposta) => resposta.dados as RolagemResumoDto[]));
  }

  /**
   * Exclui (soft delete) uma rolagem — só `ADMIN` (I-033). Depois do REST, avisa os consumidores
   * locais por `TempoRealService.notificarRolagemExcluida`, porque o admin pode não estar na sala
   * que receberia o broadcast (ex.: histórico de uma ficha solta privada).
   */
  excluir(id: number): Observable<RolagemExcluidaDto> {
    return this.httpClient.delete<StandardResponse<RolagemExcluidaDto>>(`${this.baseRolagem}/${id}`).pipe(
      map((resposta) => resposta.dados as RolagemExcluidaDto),
      tap((excluida) => this.tempoRealService.notificarRolagemExcluida(excluida)),
    );
  }
}
