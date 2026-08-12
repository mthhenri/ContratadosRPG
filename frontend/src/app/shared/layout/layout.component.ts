import { Component, Injector, ViewContainerRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Toast } from 'primeng/toast';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { LoadingService } from '../../core/services/loading.service';
import { SessaoService } from '../../core/services/sessao.service';
import { ConfiguracoesTema } from '../configuracoes-tema/configuracoes-tema.component';
import { Icone } from '../icone/icone.component';
import { Marca } from '../marca/marca.component';

/**
 * Shell visual da aplicação: topbar institucional (direção "Barra de Comando" do handoff —
 * m2-09), indicador de carregamento global (alimentado pelo `loading.interceptor` via
 * `LoadingService`), área de toasts PrimeNG (alimentada pelo `error-handler.interceptor`) e o
 * `router-outlet` onde as páginas são renderizadas. A topbar reflete o estado de sessão
 * (`SessaoService`, m2-06): entrar/registrar quando deslogado; nav (Painel/Calculadora) +
 * dropdown de perfil quando logado. A calculadora permanece pública.
 */
@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Toast,
    ConfiguracoesTema,
    Icone,
    Marca,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class Layout {
  protected readonly TipoUsuarioEnum = TipoUsuarioEnum;
  protected readonly loadingService = inject(LoadingService);
  protected readonly sessaoService = inject(SessaoService);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly urlAtual = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  private readonly leitorDocumentosContainer = viewChild.required('leitorDocumentosContainer', {
    read: ViewContainerRef,
  });
  private leitorDocumentosMontado = false;

  /** Se o dropdown de perfil está aberto (fecha só por botão/ação — mesmo padrão do tema). */
  protected readonly perfilAberto = signal(false);
  protected readonly rotaIsolada = computed(() => this.urlAtual().startsWith('/acesso-negado'));

  protected alternarPerfil(): void {
    this.perfilAberto.update((aberto) => !aberto);
  }

  protected fecharPerfil(): void {
    this.perfilAberto.set(false);
  }

  /** Abre o leitor global sem navegar nem alterar os demais utilitários da topbar. */
  protected async abrirDocumentos(): Promise<void> {
    const [{ LeitorDocumentos }, { LeitorDocumentosService }] = await Promise.all([
      import('../leitor-documentos/leitor-documentos.component'),
      import('../leitor-documentos/leitor-documentos.service'),
    ]);
    if (!this.leitorDocumentosMontado) {
      this.leitorDocumentosContainer().createComponent(LeitorDocumentos);
      this.leitorDocumentosMontado = true;
    }
    this.injector.get(LeitorDocumentosService).abrir();
  }

  /** Encerra a sessão e leva o usuário de volta à tela de login. */
  protected sair(): void {
    this.fecharPerfil();
    this.sessaoService.sair();
    void this.router.navigateByUrl('/login');
  }
}
