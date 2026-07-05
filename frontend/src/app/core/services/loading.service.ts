import { Injectable, computed, signal } from '@angular/core';

/**
 * Estado global de carregamento de requisições HTTP. Mantém um contador das requisições em
 * andamento (várias podem estar ativas ao mesmo tempo) e expõe um signal derivado que o
 * shell consome para exibir o indicador de carregamento. Alimentado pelo
 * `loading.interceptor`. Conceito genérico/operacional → inglês (SYSTEM.SPEC §4).
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pendingRequests = signal(0);

  /** Verdadeiro enquanto houver ao menos uma requisição HTTP em andamento. */
  readonly isLoading = computed(() => this.pendingRequests() > 0);

  /** Registra o início de uma requisição HTTP. */
  start(): void {
    this.pendingRequests.update((total) => total + 1);
  }

  /** Registra o término (sucesso ou erro) de uma requisição HTTP. */
  finish(): void {
    this.pendingRequests.update((total) => Math.max(0, total - 1));
  }
}
