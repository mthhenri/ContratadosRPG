import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { map } from 'rxjs';
import type { StandardResponse } from '@contratados-rpg/shared/interfaces';
import type { SessaoTranscricaoResumoDto, SessaoTranscricaoCriadaDto, DispositivoResumoDto,
  DispositivoVinculoRecuperadoDto, TranscricaoIntencaoCriadaDto, TranscricaoIntencaoEstadoDto } from '@contratados-rpg/shared/dtos/transcricao';
import { ERROS_TRATADOS_NA_TELA } from '../../core/interceptors/error-handler.interceptor';
import { environment } from '../../../environments/environment';
/** Transporte somente da API do site; nenhuma chamada a servidor local do aplicativo. */
@Injectable({ providedIn: 'root' })
export class TranscricaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/transcricao`;
  /** Mensagens próprias da tela, inclusive offline; o tratamento global do 401 permanece. */
  private readonly opcoes = { context: new HttpContext().set(ERROS_TRATADOS_NA_TELA, [0, 400, 403, 404, 429, 500, 502, 503, 504]) };
  listarSessoes(campanhaId: number) { return this.http.get<StandardResponse<SessaoTranscricaoResumoDto[]>>(`${this.base}/sessao`, { ...this.opcoes, params: { campanhaId } }).pipe(map(r => r.dados as SessaoTranscricaoResumoDto[])); }
  criarSessao(campanhaId: number, titulo: string) { return this.http.post<StandardResponse<SessaoTranscricaoCriadaDto>>(`${this.base}/sessao`, { campanhaId, titulo }, this.opcoes).pipe(map(r => r.dados as SessaoTranscricaoCriadaDto)); }
  listarDispositivos() { return this.http.get<StandardResponse<DispositivoResumoDto[]>>(`${this.base}/dispositivo`, this.opcoes).pipe(map(r => r.dados as DispositivoResumoDto[])); }
  revogar(id: string) { return this.http.delete(`${this.base}/dispositivo/${id}`, this.opcoes); }
  recuperarPedido(id: string) { return this.http.get<StandardResponse<DispositivoVinculoRecuperadoDto>>(`${this.base}/vinculo/${id}`, this.opcoes).pipe(map(r => r.dados as DispositivoVinculoRecuperadoDto)); }
  confirmar(id: string, codigo: string) { return this.http.post(`${this.base}/vinculo/${id}/confirmar`, { codigo }, this.opcoes); }
  criarIntencao(sessaoId: number) { return this.http.post<StandardResponse<TranscricaoIntencaoCriadaDto>>(`${this.base}/sessao/${sessaoId}/abertura`, {}, this.opcoes).pipe(map(r => r.dados as TranscricaoIntencaoCriadaDto)); }
  consultarIntencao(id: string) { return this.http.get<StandardResponse<TranscricaoIntencaoEstadoDto>>(`${this.base}/abertura/${id}`, this.opcoes).pipe(map(r => r.dados as TranscricaoIntencaoEstadoDto)); }
}
