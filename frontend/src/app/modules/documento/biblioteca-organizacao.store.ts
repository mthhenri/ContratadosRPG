import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, filter, finalize, merge, switchMap, tap } from 'rxjs';

import type { DocumentoOrganizacaoRecuperadaDto } from '@contratados-rpg/shared/dtos/documento';

import { TempoRealService } from '../../core/services/tempo-real.service';
import { DocumentoService } from './documento.service';

/**
 * A organização em pastas da Biblioteca que o usuário enxerga (biblioteca-pastas) — provida pelo
 * `BibliotecaCorpo`, que a compartilha com a lista em árvore e com a busca. Vive e morre com o
 * corpo; sair descarta o estado.
 *
 * Cada cargo tem a sua organização e o backend escolhe pelo papel: o mestre recebe a dele, jogador
 * e espectador a compartilhada (o espectador com `editavel: false`). O cliente nunca informa a
 * organização e nunca recebe a do outro cargo.
 *
 * **Fonte única: o GET.** Toda mutação (e todo evento) refaz a leitura em vez de aplicar o delta à
 * mão — duas sessões editando ao mesmo tempo convergem pelo que o servidor gravou por último, e um
 * eco de socket chegando antes do REST só dispara mais uma leitura (`switchMap` descarta a anterior).
 * Eventos que refazem a leitura: `documento:organizacao-alterada` (a organização do cargo mudou),
 * `documento:alterado` (revelar, ocultar e excluir mexem nos vínculos) e a reconexão (`reconexao$`,
 * P-083: o que aconteceu durante a queda).
 */
@Injectable()
export class BibliotecaOrganizacaoStore {
  private readonly documentoService = inject(DocumentoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly organizacaoAtual = signal<DocumentoOrganizacaoRecuperadaDto | null>(null);
  private readonly carregandoInicial = signal(true);
  private readonly operacoesEmVoo = signal(0);
  private campanhaId: number | null = null;
  private readonly recarregar$ = new Subject<void>();

  /** `null` até a primeira leitura (ou se ela falhar): a lista cai para a raiz, sem pastas. */
  readonly organizacao = this.organizacaoAtual.asReadonly();
  readonly carregando = this.carregandoInicial.asReadonly();
  /** Pode criar, renomear, mover e excluir — mestre e jogador; o espectador só navega. */
  readonly editavel = computed(() => this.organizacaoAtual()?.editavel ?? false);
  /** Uma escrita em voo — trava os controles para não repetir a mutação. */
  readonly emOperacao = computed(() => this.operacoesEmVoo() > 0);

  iniciar(campanhaId: number): void {
    if (this.campanhaId !== null) {
      return;
    }
    this.campanhaId = campanhaId;

    merge(
      this.recarregar$,
      this.tempoRealService.documentoOrganizacaoAlterada$.pipe(
        filter((evento) => evento.campanhaId === campanhaId),
      ),
      this.tempoRealService.documentoAlterado$.pipe(
        filter((evento) => evento.campanhaId === campanhaId),
      ),
      // Só reconexões futuras à montagem, nunca uma já ocorrida antes de abrir a Biblioteca.
      this.tempoRealService.reconexao$,
    )
      .pipe(
        switchMap(() => this.ler(campanhaId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((organizacao) => this.organizacaoAtual.set(organizacao));

    this.ler(campanhaId)
      .pipe(
        finalize(() => this.carregandoInicial.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((organizacao) => this.organizacaoAtual.set(organizacao));
  }

  /** Lê a organização; uma falha deixa o que já está na tela (o toast é do interceptor). */
  private ler(campanhaId: number): Observable<DocumentoOrganizacaoRecuperadaDto> {
    return this.documentoService.recuperarOrganizacao(campanhaId).pipe(catchError(() => EMPTY));
  }

  // ── Escritas ────────────────────────────────────────────────────────────────

  criarPasta(nome: string, pastaMaeId: number | null): Observable<unknown> {
    return this.escrever(this.documentoService.criarPasta(this.exigirCampanha(), nome, pastaMaeId));
  }

  renomearPasta(id: number, nome: string): Observable<unknown> {
    return this.escrever(this.documentoService.renomearPasta(id, nome));
  }

  moverPasta(id: number, pastaMaeId: number | null, posicao?: number): Observable<unknown> {
    return this.escrever(this.documentoService.moverPasta(id, pastaMaeId, posicao));
  }

  removerPasta(id: number): Observable<unknown> {
    return this.escrever(this.documentoService.removerPasta(id));
  }

  moverDocumento(id: number, pastaId: number | null, posicao?: number): Observable<unknown> {
    return this.escrever(this.documentoService.moverDocumento(id, pastaId, posicao));
  }

  /**
   * Envolve uma escrita: trava enquanto está em voo e, ao concluir, refaz a leitura. Quem chama
   * assina (e fecha o dialog no `next`); o erro segue para o interceptor e destrava os controles.
   */
  private escrever<T>(chamada: Observable<T>): Observable<T> {
    return new Observable<T>((assinante) => {
      this.operacoesEmVoo.update((total) => total + 1);
      const assinatura = chamada
        .pipe(
          tap(() => this.recarregar$.next()),
          finalize(() => this.operacoesEmVoo.update((total) => total - 1)),
        )
        .subscribe(assinante);
      return () => assinatura.unsubscribe();
    });
  }

  private exigirCampanha(): number {
    if (this.campanhaId === null) {
      throw new Error('BibliotecaOrganizacaoStore usada antes de iniciar()');
    }
    return this.campanhaId;
  }
}
