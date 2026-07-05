import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';

import { LoadingService } from '../../core/services/loading.service';

/**
 * Shell visual da aplicação: topbar institucional, indicador de carregamento global
 * (alimentado pelo `loading.interceptor` via `LoadingService`), área de toasts PrimeNG
 * (alimentada pelo `error-handler.interceptor`) e o `router-outlet` onde as páginas são
 * renderizadas. A identidade visual definitiva está adiada (ver docs/CONTEXT.md); até lá o
 * shell apoia-se nas variáveis de tema do PrimeNG (preset base).
 */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Toast],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class Layout {
  protected readonly loadingService = inject(LoadingService);
}
