import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import { environment } from '../../../environments/environment';

/**
 * Cliente do endpoint operacional `GET /health` do backend. Não há regra de negócio nem DTO
 * de negócio (payload inline, ver m0-04): apenas confirma, a partir do frontend, que o
 * pipeline HTTP → backend → `StandardResponse` está de pé. Em desenvolvimento `apiBase` é
 * vazio e a chamada relativa passa pelo proxy (`proxy.conf.json`) até `http://localhost:3100`;
 * em produção `apiBase` aponta para a URL do backend no Render (CORS liberado para a origem
 * do frontend na Cloudflare).
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly httpClient = inject(HttpClient);

  /** Consulta o healthcheck da API e devolve a resposta padronizada. */
  verificar(): Observable<StandardResponse<{ status: string }>> {
    return this.httpClient.get<StandardResponse<{ status: string }>>(`${environment.apiBase}/health`);
  }
}
