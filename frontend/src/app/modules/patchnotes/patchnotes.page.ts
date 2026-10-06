import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
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
import { Chip } from '../../shared/ui/chip/chip.component';
import { Esqueleto } from '../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { NotificacaoService } from '../../shared/ui/notificacao/notificacao.service';
import { Icone } from '../../shared/icone/icone.component';
import {
  estruturarPatchnote,
  formatarDataPatchnote,
  formatarDataPatchnoteCurta,
} from './patchnote-formato';
import { PatchnoteService } from './patchnote.service';

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
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private assinaturaNota: Subscription | undefined;
  /** Liga a leitura da próxima nota aberta sem o cache do navegador (recarga pós-reinício, pn-06). */
  private proximaNotaSemCache = false;

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

  /** A versão imediatamente mais antiga que a exibida, para o atalho do rodapé da nota. */
  protected readonly versaoAnterior = computed(() => {
    const itens = this.indice();
    const exibida = this.nota()?.versao;
    if (!itens || !exibida) {
      return null;
    }
    return itens[itens.findIndex((item) => item.versao === exibida) + 1] ?? null;
  });

  /** Introdução, grupos e blocos da nota exibida, já renderizados e sanitizados. */
  protected readonly conteudo = computed(() => {
    const nota = this.nota();
    if (!nota) {
      return null;
    }
    const renderizar = (markdown: string): string =>
      markdown ? renderizarMarkdownSeguro(markdown, this.sanitizer) : '';
    const estrutura = estruturarPatchnote(nota.conteudoMarkdown);
    return {
      introducao: renderizar(estrutura.introducao),
      grupos: estrutura.grupos.map((grupo) => ({
        titulo: grupo.titulo,
        introducao: renderizar(grupo.introducao),
        blocos: grupo.blocos.map((bloco) => ({
          titulo: bloco.titulo,
          tom: bloco.tom,
          html: renderizar(bloco.markdown),
        })),
      })),
    };
  });

  constructor() {
    this.carregarIndice();
    this.destroyRef.onDestroy(() => this.assinaturaNota?.unsubscribe());
    effect(() => {
      const itens = this.indice();
      const versao = this.versao();
      if (itens !== null) {
        untracked(() => this.abrirVersao(itens, versao));
      }
    });
  }

  protected formatarData(data: string): string {
    return formatarDataPatchnote(data);
  }

  protected formatarDataCurta(data: string): string {
    return formatarDataPatchnoteCurta(data);
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
        this.nota.set(nota);
        this.estadoNota.set('ok');
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
