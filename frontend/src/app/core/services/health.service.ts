import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';

/**
 * Cliente do endpoint operacional `GET /health` do backend. Não há regra de negócio nem DTO
 * de negócio (payload inline, ver m0-04): apenas confirma, a partir do frontend, que o
 * pipeline HTTP → backend → `StandardResponse` está de pé. Em desenvolvimento a chamada
 * passa pelo proxy (`proxy.conf.json`) até `http://localhost:3100`.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly httpClient = inject(HttpClient);

  /** Consulta o healthcheck da API e devolve a resposta padronizada. */
  verificar(): Observable<StandardResponse<{ status: string }>> {
    return this.httpClient.get<StandardResponse<{ status: string }>>('/health');
  }
}
