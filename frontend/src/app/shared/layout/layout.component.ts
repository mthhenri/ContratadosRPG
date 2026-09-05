import {
  Component,
  ElementRef,
  Injector,
  ViewContainerRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { LoadingService } from '../../core/services/loading.service';
import { SessaoService } from '../../core/services/sessao.service';
import { TopbarContextoService } from '../../core/services/topbar-contexto.service';
import { ConfiguracoesTema } from '../configuracoes-tema/configuracoes-tema.component';
import { Icone } from '../icone/icone.component';
import { Marca } from '../marca/marca.component';
import { IndicadorTempoReal } from '../tempo-real/indicador-tempo-real.component';
import { Botao } from '../ui/botao/botao.component';
import { Confirmacao } from '../ui/confirmacao/confirmacao.component';
import { Notificacoes } from '../ui/notificacao/notificacao.component';

/**
 * Shell visual da aplicação: topbar institucional (direção "Barra de Comando" do handoff —
 * m2-09), indicador de carregamento global (alimentado pelo `loading.interceptor` via
 * `LoadingService`), fila de notificações (`app-notificacoes`, ui-02 — alimentada pelo
 * `error-handler.interceptor`) e o `router-outlet` onde as páginas são renderizadas. A topbar
 * reflete o estado de sessão (`SessaoService`, m2-06): entrar/registrar quando deslogado; nav
 * (Campanhas/Simulação) + dropdown de perfil quando logado. A simulacao permanece pública.
 */
@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Notificacoes,
    Confirmacao,
    ConfiguracoesTema,
    Icone,
    Marca,
    Botao,
    IndicadorTempoReal,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class Layout {
  protected readonly TipoUsuarioEnum = TipoUsuarioEnum;
  protected readonly loadingService = inject(LoadingService);
  protected readonly sessaoService = inject(SessaoService);
  protected readonly topbarContexto = inject(TopbarContextoService);
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

  // `read: ElementRef` explícito (ui-28): sem ele, `#perfilGatilho` passaria a resolver a
  // instância do componente `Botao` (agora que o botão leva `app-botao`), não o `ElementRef`
  // nativo que `fecharPerfilPeloTeclado` precisa para devolver o foco.
  private readonly perfilGatilho = viewChild<
    ElementRef<HTMLButtonElement>,
    ElementRef<HTMLButtonElement>
  >('perfilGatilho', { read: ElementRef });

  /** Se o dropdown de perfil está aberto (fecha só por botão/ação/`Escape` — mesmo padrão do tema
   *  quanto a não fechar por clique-fora; `Escape` é diferente porque é o que modal e painel de
   *  histórico já fazem, sem conflitar com essa decisão — ui-21). */
  protected readonly perfilAberto = signal(false);
  protected readonly rotaIsolada = computed(() => this.urlAtual().startsWith('/acesso-negado'));

  protected alternarPerfil(): void {
    this.perfilAberto.update((aberto) => !aberto);
  }

  protected fecharPerfil(): void {
    this.perfilAberto.set(false);
  }

  /** `Escape` fecha o dropdown de perfil e devolve o foco ao próprio gatilho (ui-21) — só age
   *  quando o dropdown está aberto, então não interfere com outro uso de `Escape` na página. */
  protected fecharPerfilPeloTeclado(): void {
    if (!this.perfilAberto()) {
      return;
    }
    this.fecharPerfil();
    this.perfilGatilho()?.nativeElement.focus();
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
