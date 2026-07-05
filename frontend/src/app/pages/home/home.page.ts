import { Component, OnInit, inject, signal } from '@angular/core';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';

import { HealthService } from '../../core/services/health.service';

/**
 * Página inicial do M0. Consome `GET /health` no carregamento e exibe o resultado, provando
 * visualmente o pipeline HTTP frontend → backend → `StandardResponse`. Sem regra de negócio:
 * será substituída pelas páginas reais a partir do M1 (ver docs/CONTEXT.md).
 */
@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class Home implements OnInit {
  private readonly healthService = inject(HealthService);

  protected readonly resposta = signal<StandardResponse<{ status: string }> | null>(null);
  protected readonly erro = signal(false);

  ngOnInit(): void {
    this.healthService.verificar().subscribe({
      next: (respostaRecebida) => {
        this.resposta.set(respostaRecebida);
        this.erro.set(false);
      },
      error: () => {
        this.resposta.set(null);
        this.erro.set(true);
      },
    });
  }
}
