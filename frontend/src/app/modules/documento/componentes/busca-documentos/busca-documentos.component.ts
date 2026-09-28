import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, Subject, catchError, debounceTime, filter, map, switchMap, tap } from 'rxjs';

import type { DocumentoBuscaResultadoDto } from '@contratados-rpg/shared/dtos/documento';
import { BUSCA_CAMPANHA_TERMO_MAXIMO } from '@contratados-rpg/shared/validators';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import {
  NENHUM_LEITOR,
  leitoresDoDocumento,
  type DocumentoLeitoresPorDocumento,
} from '../../documento-leitores';
import { DocumentoService } from '../../documento.service';
import { segmentarTrecho, type SegmentoTrecho } from '../../trecho-destacado';
import { DocumentoCartao } from '../documento-cartao/documento-cartao.component';

/** Resultados por página — o mesmo passo da busca do Caderno. */
const RESULTADOS_POR_PAGINA = 20;
/** Espera entre a última tecla e a consulta. */
const ESPERA_DIGITACAO_MS = 250;

type EstadoBusca = 'OCIOSO' | 'BUSCANDO' | 'ERRO' | 'PRONTO';

interface PedidoBusca {
  readonly termo: string;
  readonly pagina: number;
  /** Refazer por evento ou carregar mais: sem esqueleto, para não piscar o que está na tela. */
  readonly silencioso: boolean;
}

interface ResultadoExibido {
  readonly resultado: DocumentoBuscaResultadoDto;
  readonly segmentos: readonly SegmentoTrecho[];
}

/**
 * Busca da biblioteca (m9-05) — a mesma nas três visões (mestre, jogador, espectador), sobre `GET
 * campanha/:id/documento/busca` (m9-03). O recorte é do backend: jogador e espectador só acham o
 * revelado; o mestre acha tudo e vê o chip Revelado/Oculto (`mostrarEstado`).
 *
 * Estados: ocioso (sem termo — a página mostra a lista), buscando (esqueleto), erro, sem resultado
 * e com resultado, com "Carregar mais" enquanto houver páginas. O `trecho` é segmentado pelos
 * marcadores `⟦ ⟧` e cada parte vai como **texto** — o destaque é um `<mark>`, nunca `innerHTML`.
 *
 * **Tempo real:** com a busca ativa, todo `documento:alterado` da campanha (e a reconexão) refaz a
 * primeira página em silêncio — um documento ocultado sai dos resultados da mesa na hora. Quem
 * entra na sala da campanha é a página que hospeda a busca.
 */
@Component({
  selector: 'app-busca-documentos',
  imports: [ReactiveFormsModule, Icone, Botao, Campo, Esqueleto, EstadoVazio, DocumentoCartao],
  templateUrl: './busca-documentos.component.html',
  styleUrl: './busca-documentos.component.scss',
})
export class BuscaDocumentos {
  private readonly documentoService = inject(DocumentoService);
  private readonly tempoRealService = inject(TempoRealService);

  readonly campanhaId = input.required<number>();
  /** Chip Revelado/Oculto nos resultados — só o mestre (para a mesa é sempre revelado). */
  readonly mostrarEstado = input(false);
  /** Quem está lendo cada documento (m9-10) — só o mestre; o mesmo chip do cartão da lista. */
  readonly leitoresPorDocumento = input<DocumentoLeitoresPorDocumento>(NENHUM_LEITOR);
  /** O documento aberto na página, para marcar o resultado correspondente. */
  readonly abertoId = input<number | null>(null);

  readonly selecionar = output<number>();
  /** Há termo digitado — a página troca a lista pelos resultados. */
  readonly ativaChange = output<boolean>();
  /** Total de resultados da última busca concluída; `null` enquanto não há um. */
  readonly totalChange = output<number | null>();

  protected readonly termoMaximo = BUSCA_CAMPANHA_TERMO_MAXIMO;
  protected readonly leitoresDoDocumento = leitoresDoDocumento;
  protected readonly termo = new FormControl('', { nonNullable: true });

  /** O termo como está no campo agora (sem esperar o debounce) — decide se a busca está ativa. */
  private readonly termoDigitado = signal('');
  /** O termo da última consulta enviada — o que "Carregar mais" e os eventos refazem. */
  protected readonly termoBuscado = signal('');

  protected readonly ativa = computed(() => this.termoDigitado().trim().length > 0);
  protected readonly estado = signal<EstadoBusca>('OCIOSO');
  protected readonly carregandoMais = signal(false);
  private readonly resultados = signal<readonly DocumentoBuscaResultadoDto[]>([]);
  private readonly total = signal(0);
  private readonly paginaAtual = signal(0);
  private readonly totalPaginas = signal(0);

  protected readonly temMais = computed(() => this.paginaAtual() < this.totalPaginas());
  protected readonly exibidos = computed<readonly ResultadoExibido[]>(() =>
    this.resultados().map((resultado) => ({
      resultado,
      segmentos: segmentarTrecho(resultado.trecho),
    })),
  );

  /** `null` sai da busca e descarta a consulta em voo (`switchMap`). */
  private readonly pedidos$ = new Subject<PedidoBusca | null>();

  constructor() {
    this.termo.valueChanges
      .pipe(
        tap((termo) => {
          this.termoDigitado.set(termo);
          if (!termo.trim()) {
            this.pedidos$.next(null);
          }
        }),
        debounceTime(ESPERA_DIGITACAO_MS),
        map((termo) => termo.trim()),
        filter((termo) => !!termo && termo !== this.termoBuscado()),
        takeUntilDestroyed(),
      )
      .subscribe((termo) => this.buscar(termo, 1, false));

    this.pedidos$
      .pipe(
        switchMap((pedido) => {
          if (!pedido) {
            this.limpar();
            return EMPTY;
          }
          return this.documentoService
            .buscar({
              campanhaId: this.campanhaId(),
              termo: pedido.termo,
              pagina: pedido.pagina,
              limite: RESULTADOS_POR_PAGINA,
            })
            .pipe(
              map((resposta) => ({ pedido, resposta })),
              catchError(() => {
                this.carregandoMais.set(false);
                // Falhou ao carregar mais ou ao refazer em silêncio: o que já está na tela fica.
                if (!pedido.silencioso) {
                  this.estado.set('ERRO');
                }
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ pedido, resposta }) => {
        this.resultados.update((atuais) =>
          pedido.pagina === 1 ? resposta.itens : [...atuais, ...resposta.itens],
        );
        this.total.set(resposta.totalItens);
        this.paginaAtual.set(resposta.paginaAtual);
        this.totalPaginas.set(resposta.totalPaginas);
        this.carregandoMais.set(false);
        this.estado.set('PRONTO');
      });

    this.tempoRealService.documentoAlterado$
      .pipe(
        filter((evento) => evento.campanhaId === this.campanhaId()),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.refazer());
    // `reconexao$` (P-083): só reconexões futuras à montagem, nunca uma já ocorrida antes de
    // abrir a busca.
    this.tempoRealService.reconexao$.pipe(takeUntilDestroyed()).subscribe(() => this.refazer());

    effect(() => {
      const ativa = this.ativa();
      untracked(() => this.ativaChange.emit(ativa));
    });
    effect(() => {
      const total = this.estado() === 'PRONTO' ? this.total() : null;
      untracked(() => this.totalChange.emit(total));
    });
  }

  protected carregarMais(): void {
    if (!this.temMais() || this.carregandoMais()) {
      return;
    }
    this.carregandoMais.set(true);
    this.pedidos$.next({
      termo: this.termoBuscado(),
      pagina: this.paginaAtual() + 1,
      silencioso: true,
    });
  }

  protected tentarDeNovo(): void {
    this.buscar(this.termoBuscado(), 1, false);
  }

  private buscar(termo: string, pagina: number, silencioso: boolean): void {
    this.termoBuscado.set(termo);
    if (!silencioso) {
      this.estado.set('BUSCANDO');
    }
    this.pedidos$.next({ termo, pagina, silencioso });
  }

  /**
   * Evento ou reconexão com a busca ativa: a primeira página de novo (as páginas já carregadas
   * recolhem). Sem esqueleto quando já há resultados na tela; depois de um erro, com.
   */
  private refazer(): void {
    if (this.ativa() && this.termoBuscado() && this.estado() !== 'BUSCANDO') {
      this.buscar(this.termoBuscado(), 1, this.estado() === 'PRONTO');
    }
  }

  private limpar(): void {
    this.termoBuscado.set('');
    this.resultados.set([]);
    this.total.set(0);
    this.paginaAtual.set(0);
    this.totalPaginas.set(0);
    this.carregandoMais.set(false);
    this.estado.set('OCIOSO');
  }
}
