import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';

import { LoadingService } from '../../core/services/loading.service';
import { SessaoService } from '../../core/services/sessao.service';
import { ConfiguracoesTema } from '../configuracoes-tema/configuracoes-tema.component';

/**
 * Shell visual da aplicação: topbar institucional, indicador de carregamento global
 * (alimentado pelo `loading.interceptor` via `LoadingService`), área de toasts PrimeNG
 * (alimentada pelo `error-handler.interceptor`) e o `router-outlet` onde as páginas são
 * renderizadas. A topbar reflete o estado de sessão (`SessaoService`, m2-06): entrar/registrar
 * quando deslogado; identidade + sair quando logado. A calculadora permanece pública.
 */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, Toast, ConfiguracoesTema],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class Layout {
  protected readonly loadingService = inject(LoadingService);
  protected readonly sessaoService = inject(SessaoService);
  private readonly router = inject(Router);

  /** Encerra a sessão e leva o usuário de volta à home pública. */
  protected sair(): void {
    this.sessaoService.sair();
    void this.router.navigateByUrl('/');
  }
}
