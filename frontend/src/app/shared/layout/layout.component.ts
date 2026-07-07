import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';

import { LoadingService } from '../../core/services/loading.service';
import { SessaoService } from '../../core/services/sessao.service';
import { CampanhaContextoService } from '../../modules/campanha/campanha-contexto.service';
import { ConfiguracoesTema } from '../configuracoes-tema/configuracoes-tema.component';
import { Icone } from '../icone/icone.component';
import { Marca } from '../marca/marca.component';

/**
 * Shell visual da aplicação: topbar institucional (direção "Barra de Comando" do handoff —
 * m2-09), indicador de carregamento global (alimentado pelo `loading.interceptor` via
 * `LoadingService`), área de toasts PrimeNG (alimentada pelo `error-handler.interceptor`) e o
 * `router-outlet` onde as páginas são renderizadas. A topbar reflete o estado de sessão
 * (`SessaoService`, m2-06): entrar/registrar quando deslogado; nav (Painel/Calculadora) +
 * dropdown de perfil quando logado. O seletor de campanha ativa só aparece dentro de
 * `/painel/:id`, alimentado pelo `CampanhaContextoService` — é um link de volta à lista, não um
 * trocador completo (fora de escopo da m2-09). A calculadora permanece pública.
 */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, ConfiguracoesTema, Icone, Marca],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class Layout {
  protected readonly loadingService = inject(LoadingService);
  protected readonly sessaoService = inject(SessaoService);
  protected readonly campanhaContextoService = inject(CampanhaContextoService);
  private readonly router = inject(Router);

  /** Se o dropdown de perfil está aberto (fecha só por botão/ação — mesmo padrão do tema). */
  protected readonly perfilAberto = signal(false);

  protected alternarPerfil(): void {
    this.perfilAberto.update((aberto) => !aberto);
  }

  protected fecharPerfil(): void {
    this.perfilAberto.set(false);
  }

  /** Encerra a sessão e leva o usuário de volta à home pública. */
  protected sair(): void {
    this.fecharPerfil();
    this.sessaoService.sair();
    void this.router.navigateByUrl('/');
  }
}
