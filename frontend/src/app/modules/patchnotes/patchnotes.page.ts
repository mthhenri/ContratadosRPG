import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import type {
  PatchnoteRecuperadoDto,
  PatchnoteResumoDto,
} from '@contratados-rpg/shared/dtos/patchnote';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { Subscription, finalize, map, switchMap } from 'rxjs';

import { SessaoService } from '../../core/services/sessao.service';
import { VersaoService } from '../../core/services/versao.service';
import { DocumentoContencao } from '../../shared/documento-contencao/documento-contencao.component';
import { renderizarMarkdownSeguro } from '../../shared/markdown/markdown-seguro';
import { Botao } from '../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../shared/ui/botao-icone/botao-icone.component';
import { ClampTruncado } from '../../shared/clamp-truncado/clamp-truncado.directive';
import { Tooltip } from '../../shared/tooltip/tooltip.directive';
import { Chip } from '../../shared/ui/chip/chip.component';
import { Esqueleto } from '../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { NotificacaoService } from '../../shared/ui/notificacao/notificacao.service';
import { Icone } from '../../shared/icone/icone.component';
import { observarCapituloAtivo } from './capitulo-ativo';
import {
  agruparPatchnotesPorLinha,
  capitularPatchnote,
  estruturarPatchnote,
  formatarDataPatchnote,
  formatarDataPatchnoteCurta,
  type PatchnoteCapitulo,
  versoesNovasPatchnote,
} from './patchnote-formato';
import { PatchnoteService } from './patchnote.service';
import { rolarAoTopo, sinalRolagemPassou } from './rolagem-pagina';
import { SumarioPatchnote } from './sumario-patchnote/sumario-patchnote.component';

type EstadoNota = 'carregando' | 'ok' | 'inexistente' | 'falha';

/**
 * Página pública `/patchnotes` (pn-04) — lista de versões e a nota da versão escolhida
 * (`/patchnotes/:versao`; a raiz leva à mais recente). Não exige login. O Markdown da nota é
 * dividido nos blocos Novidades/Melhorias/Correções e renderizado por `renderizarMarkdownSeguro`
 * (sem HTML cru, imagem nem esquema perigoso). Versão inexistente e falha de carga usam o documento
 * de contenção da tela de Acesso negado. Abrir a página registra a versão atual como vista
 * (`VersaoService`), o que apaga o ponto da topbar. O `ADMIN` ganha, no canto do cabeçalho, o
 * reinício do cache dos patchnotes na API (pn-06), seguido de recarga sem o cache do navegador.
 */
@Component({
  selector: 'app-patchnotes-page',
  imports: [
    RouterLink,
    RouterLinkActive,
    Botao,
    BotaoIcone,
    Chip,
    Esqueleto,
    EstadoVazio,
    Icone,
    DocumentoContencao,
    SumarioPatchnote,
    ClampTruncado,
    Tooltip,
  ],
  templateUrl: './patchnotes.page.html',
  styleUrl: './patchnotes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatchnotesPage {
  /** Versão da URL (`/patchnotes/:versao`), ligada pelo `withComponentInputBinding` do roteador. */
  readonly versao = input<string>();

  private readonly patchnoteService = inject(PatchnoteService);
  private readonly versaoService = inject(VersaoService);
  private readonly sessaoService = inject(SessaoService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injetor = inject(Injector);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private assinaturaNota: Subscription | undefined;
  /** Liga a leitura da próxima nota aberta sem o cache do navegador (recarga pós-reinício, pn-06). */
  private proximaNotaSemCache = false;
  /** `versão#capítulo` já posicionado na tela — impede rolar de novo ao só copiar o link (pn-07). */
  private destinoRolado: string | null = null;
  private desconectarObservador: (() => void) | null = null;
  private geracaoObservador = 0;
  /** Enquanto durar a rolagem de um clique no sumário, o observador não troca o destaque. */
  private observadorSilenciadoAte = 0;

  /** Capítulo que a leitura alcançou (*scroll-spy*, pn-09); `null` antes do primeiro título. */
  protected readonly capituloAtivo = signal<string | null>(null);

  /** Fragmento da URL (`/patchnotes/1.4.0#para-o-mestre`) — o capítulo a abrir posicionado. */
  private readonly fragmento = toSignal(this.rota.fragment, { initialValue: null });

  protected readonly avisosFalha = [
    'Nenhum dado seu foi perdido. A interrupção é do arquivo, não da sua credencial.',
  ];
  protected readonly avisosInexistente = [
    'A consulta a uma revisão fora do índice não gera penalidade. Ainda.',
  ];

  protected readonly indice = signal<PatchnoteResumoDto[] | null>(null);
  protected readonly falhaIndice = signal(false);
  protected readonly nota = signal<PatchnoteRecuperadoDto | null>(null);
  protected readonly estadoNota = signal<EstadoNota>('carregando');
  protected readonly reiniciandoCache = signal(false);

  /** Só o `ADMIN` vê o reinício do cache — a página é pública e a sessão pode nem existir. */
  protected readonly podeReiniciarCache = computed(
    () => this.sessaoService.usuario()?.tipo === TipoUsuarioEnum.ADMIN,
  );

  /** Versão mais recente publicada — a que leva o selo "Atual". */
  protected readonly versaoAtual = computed(() => this.indice()?.[0]?.versao ?? null);

  /** Índice agrupado por linha `MAJOR.MINOR` (`v1.4.x`) para o trilho de versões (pn-10). */
  protected readonly linhas = computed(() => agruparPatchnotesPorLinha(this.indice() ?? []));

  /**
   * Versões publicadas depois da última visita. Lê a "vista anterior" que o `VersaoService` guardou
   * antes de `marcarVista()` sobrescrevê-la — depois da marcação a chave já é a atual e nada seria novo.
   */
  protected readonly versoesNovas = computed(() =>
    versoesNovasPatchnote(
      (this.indice() ?? []).map((item) => item.versao),
      this.versaoService.vistaAnterior(),
    ),
  );

  /** A versão imediatamente mais antiga que a exibida, para o atalho do rodapé da nota. */
  protected readonly versaoAnterior = computed(() => {
    const itens = this.indice();
    const exibida = this.nota()?.versao;
    if (!itens || !exibida) {
      return null;
    }
    return itens[itens.findIndex((item) => item.versao === exibida) + 1] ?? null;
  });

  /** A versão imediatamente mais nova que a exibida; some na mais recente (pn-11). */
  protected readonly versaoProxima = computed(() => {
    const itens = this.indice();
    const exibida = this.nota()?.versao;
    if (!itens || !exibida) {
      return null;
    }
    const posicao = itens.findIndex((item) => item.versao === exibida);
    return posicao > 0 ? itens[posicao - 1] : null;
  });

  /** A leitura passou do começo: liga o botão de voltar ao topo (pn-11). */
  protected readonly rolado = sinalRolagemPassou(400);

  /** Introdução, grupos e blocos da nota exibida, já renderizados e sanitizados. */
  protected readonly conteudo = computed(() => {
    const nota = this.nota();
    if (!nota) {
      return null;
    }
    const renderizar = (markdown: string): string =>
      markdown ? renderizarMarkdownSeguro(markdown, this.sanitizer) : '';
    const estrutura = estruturarPatchnote(nota.conteudoMarkdown);
    // Os capítulos seguem a ordem do documento: um por grupo com título e, no grupo implícito, um por
    // bloco — o cursor os devolve aos títulos renderizados (pn-07).
    const capitulos = capitularPatchnote(estrutura);
    let proximo = 0;
    const todosGrupos = estrutura.grupos.map((grupo) => {
      if (grupo.titulo === null) {
        return {
          titulo: null,
          id: null,
          publico: 'geral' as const,
          introducao: renderizar(grupo.introducao),
          blocos: grupo.blocos.map((bloco) => ({
            titulo: bloco.titulo,
            id: capitulos[proximo++].id,
            tom: bloco.tom,
            html: renderizar(bloco.markdown),
          })),
        };
      }
      const capitulo = capitulos[proximo++];
      return {
        titulo: grupo.titulo,
        id: capitulo.id,
        publico: capitulo.publico,
        introducao: renderizar(grupo.introducao),
        blocos: grupo.blocos.map((bloco, indice) => ({
          titulo: bloco.titulo,
          id: capitulo.filhos[indice].id,
          tom: bloco.tom,
          html: renderizar(bloco.markdown),
        })),
      };
    });
    // O resumo da versão (`# RESUMO…`, só texto) sobe para um cartão logo após o cabeçalho da nota
    // (pn-11); a âncora do capítulo continua a mesma e, no sumário, ele é o primeiro item, "Resumo".
    const resumo = todosGrupos.find(
      (grupo) => grupo.publico === 'resumo' && grupo.blocos.length === 0 && grupo.introducao !== '',
    );
    const capitulosSumario = resumo
      ? [
          { titulo: 'Resumo', id: resumo.id!, publico: 'resumo' as const, filhos: [] },
          ...capitulos.filter((capitulo) => capitulo.id !== resumo.id),
        ]
      : capitulos;
    return {
      capitulos: capitulosSumario,
      /** Itens do sumário: os blocos de cada grupo e os capítulos sem bloco. */
      totalCapitulos: capitulosSumario.reduce(
        (total, capitulo) => total + Math.max(capitulo.filhos.length, 1),
        0,
      ),
      introducao: renderizar(estrutura.introducao),
      resumo: resumo ? { id: resumo.id!, html: resumo.introducao } : null,
      grupos: todosGrupos.filter((grupo) => grupo !== resumo),
    };
  });

  constructor() {
    this.carregarIndice();
    this.destroyRef.onDestroy(() => {
      this.assinaturaNota?.unsubscribe();
      this.desconectarObservador?.();
    });
    effect(() => {
      const itens = this.indice();
      const versao = this.versao();
      if (itens !== null) {
        untracked(() => this.abrirVersao(itens, versao));
      }
    });
    effect(() => {
      const fragmento = this.fragmento();
      const versao = this.nota()?.versao;
      // Na troca de versão a nota antiga ainda está na tela até a nova chegar: o fragmento vale
      // para a versão da URL, nunca para a que está saindo.
      if (fragmento && versao && versao === this.versao() && this.conteudo()) {
        untracked(() => this.rolarAteCapitulo(versao, fragmento));
      }
    });
    effect(() => this.observarCapitulos(this.conteudo()?.capitulos ?? []));
  }

  protected formatarData(data: string): string {
    return formatarDataPatchnote(data);
  }

  protected formatarDataCurta(data: string): string {
    return formatarDataPatchnoteCurta(data);
  }

  /**
   * Copia o link do capítulo (URL absoluta com fragmento) e deixa o fragmento na barra de endereço,
   * sem navegar nem rolar. A falha do clipboard (permissão, contexto inseguro) não quebra nada: o
   * link continua na barra de endereço.
   */
  protected copiarLink(id: string): void {
    const versao = this.nota()?.versao;
    if (!versao) {
      return;
    }
    this.destinoRolado = `${versao}#${id}`;
    const arvore = this.router.createUrlTree(['/patchnotes', versao], { fragment: id });
    const url = `${window.location.origin}${this.router.serializeUrl(arvore)}`;
    void this.router.navigateByUrl(arvore, { replaceUrl: true });
    const copia = navigator.clipboard?.writeText(url) ?? Promise.reject(new Error('sem clipboard'));
    copia.then(
      () => this.notificacaoService.notificar({ severidade: 'sucesso', resumo: 'Link copiado' }),
      () =>
        this.notificacaoService.notificar({
          severidade: 'informacao',
          resumo: 'Não foi possível copiar',
          detalhe: 'O link do capítulo está na barra de endereço.',
        }),
    );
  }

  /** Clique no sumário: rola até o capítulo, deixa o fragmento na URL e já o destaca. */
  protected irParaCapitulo(id: string): void {
    const versao = this.nota()?.versao;
    if (!versao) {
      return;
    }
    this.destinoRolado = `${versao}#${id}`;
    this.capituloAtivo.set(id);
    this.observadorSilenciadoAte = performance.now() + 900;
    this.rolarAteTitulo(id);
    void this.router.navigateByUrl(this.router.createUrlTree(['/patchnotes', versao], { fragment: id }), {
      replaceUrl: true,
    });
  }

  /**
   * "Voltar ao topo": sobe suavemente, limpa o fragmento da URL (sem empilhar histórico) e zera o
   * destaque do sumário — o observador fica quieto durante a subida para não repintar capítulos.
   */
  protected voltarAoTopo(): void {
    const versao = this.nota()?.versao;
    this.destinoRolado = null;
    this.capituloAtivo.set(null);
    this.observadorSilenciadoAte = performance.now() + 900;
    rolarAoTopo(true);
    if (versao && this.fragmento()) {
      void this.router.navigate(['/patchnotes', versao], { replaceUrl: true });
    }
  }

  /** Repete a última carga que falhou: o índice, se foi ele, ou a nota aberta. */
  protected tentarNovamente(): void {
    const itens = this.indice();
    if (itens === null) {
      this.carregarIndice();
      return;
    }
    this.abrirVersao(itens, this.versao());
  }

  /**
   * Esvazia o cache dos patchnotes na API e recarrega índice e nota aberta furando o cache do
   * navegador — sem isso a cópia de até 5 min (`max-age=300`) esconderia a correção. Erro HTTP cai
   * no toast global do interceptor.
   */
  protected reiniciarCache(): void {
    if (this.reiniciandoCache()) {
      return;
    }
    this.reiniciandoCache.set(true);
    this.patchnoteService
      .reiniciarCache()
      .pipe(
        switchMap((resultado) =>
          this.patchnoteService
            .listar({ semCacheNavegador: true })
            .pipe(map((itens) => ({ resultado, itens }))),
        ),
        finalize(() => this.reiniciandoCache.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ resultado, itens }) => {
        this.falhaIndice.set(false);
        this.proximaNotaSemCache = true;
        this.indice.set(itens);
        this.notificacaoService.notificar({
          severidade: 'sucesso',
          resumo: 'Cache dos patchnotes reiniciado',
          detalhe:
            resultado.entradasRemovidas === 1
              ? '1 entrada descartada; as notas foram relidas do arquivo.'
              : `${resultado.entradasRemovidas} entradas descartadas; as notas foram relidas do arquivo.`,
        });
      });
  }

  /**
   * Rola até o capítulo do fragmento depois que a nota está no DOM — antes disso o `[innerHTML]` e
   * os ids ainda não existem. Fragmento sem capítulo correspondente é ignorado; cada destino rola
   * uma única vez (`destinoRolado`).
   */
  private rolarAteCapitulo(versao: string, id: string): void {
    const destino = `${versao}#${id}`;
    if (this.destinoRolado === destino) {
      return;
    }
    this.destinoRolado = destino;
    afterNextRender(() => this.rolarAteTitulo(id), { injector: this.injetor });
  }

  /**
   * Rola até o título do capítulo. Medir força o layout, e é ele que dispara o carregamento das
   * fontes da nota. Rolar antes delas chegarem mira uma posição do texto de reserva, mais alto, e a
   * página para fora do capítulo quando a fonte troca — por isso espera `fonts.ready`.
   */
  private rolarAteTitulo(id: string): void {
    const alvo = this.elemento.nativeElement.querySelector<HTMLElement>(`[id="${id}"]`);
    if (!alvo) {
      return;
    }
    const reduzMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const rolar = (): void =>
      alvo.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
    alvo.getBoundingClientRect();
    if (document.fonts?.status === 'loading') {
      void document.fonts.ready.then(rolar);
    } else {
      rolar();
    }
  }

  /**
   * Liga o *scroll-spy* aos títulos da nota depois que ela renderiza e desfaz o da nota anterior;
   * `geracaoObservador` descarta uma ligação que ficou velha antes de o render acontecer.
   */
  private observarCapitulos(capitulos: readonly PatchnoteCapitulo[]): void {
    this.desconectarObservador?.();
    this.desconectarObservador = null;
    const geracao = ++this.geracaoObservador;
    untracked(() => this.capituloAtivo.set(null));
    if (capitulos.length === 0) {
      return;
    }
    const ids = capitulos.flatMap((capitulo) => [capitulo.id, ...capitulo.filhos.map((filho) => filho.id)]);
    afterNextRender(
      () => {
        if (geracao !== this.geracaoObservador) {
          return;
        }
        this.desconectarObservador = observarCapituloAtivo(this.elemento.nativeElement, ids, (id) => {
          if (performance.now() >= this.observadorSilenciadoAte) {
            this.capituloAtivo.set(id);
          }
        });
      },
      { injector: this.injetor },
    );
  }

  private carregarIndice(): void {
    this.falhaIndice.set(false);
    this.patchnoteService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (itens) => {
          this.indice.set(itens);
          this.versaoService.marcarVista();
        },
        error: () => this.falhaIndice.set(true),
      });
  }

  private abrirVersao(itens: readonly PatchnoteResumoDto[], versao: string | undefined): void {
    this.assinaturaNota?.unsubscribe();
    const semCacheNavegador = this.proximaNotaSemCache;
    this.proximaNotaSemCache = false;
    if (itens.length === 0) {
      this.nota.set(null);
      this.estadoNota.set('ok');
      return;
    }
    if (!versao) {
      void this.router.navigate(['/patchnotes', itens[0].versao], { replaceUrl: true });
      return;
    }
    if (!itens.some((item) => item.versao === versao)) {
      this.nota.set(null);
      this.estadoNota.set('inexistente');
      return;
    }

    this.estadoNota.set('carregando');
    this.assinaturaNota = this.patchnoteService.recuperar(versao, { semCacheNavegador }).subscribe({
      next: (nota) => {
        const versaoSaindo = this.nota()?.versao;
        this.nota.set(nota);
        this.estadoNota.set('ok');
        // Outra versão, sem fragmento: a nota nova abre no topo (e não onde a anterior parou).
        if (versaoSaindo && versaoSaindo !== nota.versao && !this.fragmento()) {
          afterNextRender(() => rolarAoTopo(false), { injector: this.injetor });
        }
      },
      error: (erro: unknown) => {
        this.nota.set(null);
        this.estadoNota.set(
          erro instanceof HttpErrorResponse && erro.status === HttpStatusCode.NotFound
            ? 'inexistente'
            : 'falha',
        );
      },
    });
  }
}
