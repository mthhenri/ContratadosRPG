import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  merge,
  of,
  startWith,
  Subject,
  switchMap,
  type Observable,
} from 'rxjs';
import type { CenaDocumentoResumoDto, CenaResumoDto } from '@contratados-rpg/shared/dtos/cena';
import type { DocumentoResumoDto } from '@contratados-rpg/shared/dtos/documento';
import type { PaginaCadernoResumoDto } from '@contratados-rpg/shared/dtos/pagina-caderno';
import { CenaTipoEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CenaService } from '../../../cena/cena.service';
import { DocumentoService } from '../../../documento/documento.service';
import { markdownParaTexto } from '../../../ficha/componentes/habilidade-descricao/habilidade-descricao.component';
import { PaginaCadernoService } from '../../../pagina-caderno/pagina-caderno.service';
import { CampanhaDetalheDadosService } from '../detalhe/campanha-detalhe-dados.service';

/** Estado de carga de um bloco da mesa — cada bloco tem o seu (ui-45, "Riscos"). */
export type EstadoBlocoMesa = 'CARREGANDO' | 'PRONTO' | 'ERRO';

/** Quantos revelados da Biblioteca a mesa mostra sem Investigação ativa (ui-45, entregável 4). */
export const LIMITE_REVELADOS_MESA = 5;

/** Teto do trecho da página do Caderno — o corte visual em três linhas é do CSS. */
const LIMITE_TRECHO_CADERNO = 280;

/** Os revelados mais recentes primeiro (por `updatedDate`), no máximo `LIMITE_REVELADOS_MESA`. */
export function revelacoesRecentes(
  documentos: readonly DocumentoResumoDto[],
): readonly DocumentoResumoDto[] {
  return documentos
    .filter((documento) => documento.revelado)
    .sort((a, b) => Date.parse(b.updatedDate) - Date.parse(a.updatedDate))
    .slice(0, LIMITE_REVELADOS_MESA);
}

/** A página com o `updatedDate` mais recente, ou `null` sem páginas. */
export function paginaMaisRecente(
  paginas: readonly PaginaCadernoResumoDto[],
): PaginaCadernoResumoDto | null {
  return paginas.reduce<PaginaCadernoResumoDto | null>(
    (recente, pagina) =>
      !recente || Date.parse(pagina.updatedDate) > Date.parse(recente.updatedDate)
        ? pagina
        : recente,
    null,
  );
}

/**
 * Dado da "mesa do mestre" e do roteiro da campanha (ui-45) — os documentos da Investigação ativa
 * (ou, sem ela, os últimos revelados da Biblioteca) e a última página editada do Caderno do mestre.
 * Só lê: abrir cena, revelar ou editar continuam nos fluxos donos (hub, cena, Biblioteca, Caderno).
 * Provido pela página do mestre (`providers`), nunca `root` — a cena ativa vem de
 * `CampanhaDetalheDadosService`, escopado à mesma rota.
 */
@Injectable()
export class CampanhaMesaMestreService {
  private readonly dados = inject(CampanhaDetalheDadosService);
  private readonly cenaService = inject(CenaService);
  private readonly documentoService = inject(DocumentoService);
  private readonly paginaCadernoService = inject(PaginaCadernoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly recarregarCaderno$ = new Subject<void>();

  /** A cena ativa quando ela é de Investigação — só ela tem coluna Documentos. */
  readonly investigacaoAtiva = computed<CenaResumoDto | null>(() => {
    const cena = this.dados.cenaAtiva();
    return cena?.tipo === CenaTipoEnum.INVESTIGACAO ? cena : null;
  });

  readonly documentosCena = signal<readonly CenaDocumentoResumoDto[]>([]);
  readonly revelados = signal<readonly DocumentoResumoDto[]>([]);
  readonly estadoDocumentos = signal<EstadoBlocoMesa>('CARREGANDO');

  readonly paginaRecente = signal<PaginaCadernoResumoDto | null>(null);
  readonly trechoPagina = signal<string | null>(null);
  readonly estadoCaderno = signal<EstadoBlocoMesa>('CARREGANDO');

  private iniciado = false;

  private readonly investigacaoAtivaId$ = toObservable(this.investigacaoAtiva).pipe(
    map((cena) => cena?.id ?? null),
    distinctUntilChanged(),
  );

  /**
   * Liga as leituras — chamada pela página quando a campanha já é conhecida (`dados.id`), nunca no
   * construtor: antes disso não há o que pedir.
   */
  iniciar(): void {
    if (this.iniciado) {
      return;
    }
    this.iniciado = true;

    // Documentos seguem a Investigação ativa: trocar de cena, mexer nos anexos dela ou na
    // Biblioteca (revelar/ocultar) e reconectar refazem a leitura autorizada (§9, só invalida).
    this.investigacaoAtivaId$
      .pipe(
        switchMap((cenaId) =>
          merge(
            this.tempoRealService.cenaDocumentoAlterado$.pipe(
              filter((evento) => cenaId !== null && evento.cenaId === cenaId),
            ),
            this.tempoRealService.documentoAlterado$.pipe(
              filter((evento) => evento.campanhaId === this.dados.id),
            ),
            this.tempoRealService.reconexao$,
          ).pipe(
            startWith(undefined),
            switchMap(() => this.lerDocumentos(cenaId)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.recarregarCaderno$
      .pipe(
        startWith(undefined),
        switchMap(() => this.lerCaderno()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /** O Caderno privado não tem broadcast: a página pede de novo quando a janela dele fecha. */
  recarregarCaderno(): void {
    if (this.iniciado) {
      this.recarregarCaderno$.next();
    }
  }

  private lerDocumentos(cenaId: number | null): Observable<unknown> {
    const campanhaId = this.dados.id;
    if (!campanhaId) {
      return of(null);
    }
    if (this.estadoDocumentos() === 'ERRO') {
      this.estadoDocumentos.set('CARREGANDO');
    }
    const leitura: Observable<void> =
      cenaId === null
        ? this.documentoService.listar(campanhaId).pipe(
            map((documentos) => {
              this.documentosCena.set([]);
              this.revelados.set(revelacoesRecentes(documentos));
            }),
          )
        : this.cenaService.listarDocumentos(cenaId).pipe(
            map((documentos) => {
              this.documentosCena.set(documentos);
              this.revelados.set([]);
            }),
          );
    return leitura.pipe(
      map(() => this.estadoDocumentos.set('PRONTO')),
      catchError(() => {
        this.estadoDocumentos.set('ERRO');
        return of(null);
      }),
    );
  }

  private lerCaderno(): Observable<unknown> {
    const campanhaId = this.dados.id;
    if (!campanhaId) {
      return of(null);
    }
    return this.paginaCadernoService.listarPaginas(campanhaId).pipe(
      switchMap((paginas) => {
        const recente = paginaMaisRecente(paginas);
        this.paginaRecente.set(recente);
        if (!recente) {
          this.trechoPagina.set(null);
          return of(null);
        }
        return this.paginaCadernoService.recuperarPagina(recente.id).pipe(
          map((pagina) => {
            const texto = markdownParaTexto(pagina.conteudoMarkdown).replace(/\s+/g, ' ').trim();
            this.trechoPagina.set(texto ? texto.slice(0, LIMITE_TRECHO_CADERNO) : null);
          }),
          // Sem o trecho, o bloco ainda mostra título e data.
          catchError(() => {
            this.trechoPagina.set(null);
            return of(null);
          }),
        );
      }),
      map(() => this.estadoCaderno.set('PRONTO')),
      catchError(() => {
        this.estadoCaderno.set('ERRO');
        return of(null);
      }),
    );
  }
}
