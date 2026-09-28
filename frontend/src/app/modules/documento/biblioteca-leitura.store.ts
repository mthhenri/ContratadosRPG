import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, filter, finalize, merge, switchMap, tap } from 'rxjs';

import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoRecuperadoDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { DocumentoAlteracaoEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../core/services/tempo-real.service';
import { NotificacaoService } from '../../shared/ui/notificacao/notificacao.service';
import { DocumentoService } from './documento.service';

/**
 * Estado da Biblioteca em leitura (m9-05) — o que a página do jogador e a do espectador têm em
 * comum: a lista do revelado, o documento aberto e o tempo real. Provida por página (`providers:
 * [BibliotecaLeituraStore]`), vive e morre com ela.
 *
 * O recorte é do backend (m9-02): a lista já chega só com o revelado, e um oculto pedido direto
 * volta 404. Aqui nada é escondido por conta própria.
 *
 * **Tempo real:** todo `documento:alterado` da campanha (e a reconexão) refaz a lista. Do documento
 * aberto: `OCULTADO`/`REMOVIDO` fecham o painel com o aviso "Este documento não está mais
 * disponível."; uma versão nova (`ALTERADO`) recarrega o conteúdo em silêncio, sem esqueleto;
 * `REVELADO` só acrescenta à lista — nada abre sozinho, para não interromper quem está lendo. Se o
 * aberto sumir da lista sem evento (a reconexão depois de um ocultar perdido), fecha do mesmo
 * jeito.
 *
 * **Presença de leitura (m9-09):** a store informa ao gateway o documento aberto — ao abrir, ao
 * fechar (`null`), ao destruir a página (`null`) e de novo a cada reconexão, porque o backend perde
 * o estado do socket antigo. Só o mestre recebe quem está lendo; a exibição é da `m9-10`.
 */
@Injectable()
export class BibliotecaLeituraStore {
  private readonly documentoService = inject(DocumentoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly documentos = signal<readonly DocumentoResumoDto[]>([]);
  readonly carregandoLista = signal(true);
  /** O documento escolhido — decide a vista do celular antes mesmo de ele carregar. */
  readonly abertoId = signal<number | null>(null);
  readonly aberto = signal<DocumentoRecuperadoDto | null>(null);

  /** Pedidos de recarga da lista (evento). */
  private readonly recarregar$ = new Subject<void>();
  /** A campanha desta página — `null` até `iniciar`; a presença só é informada depois dele. */
  private campanhaId: number | null = null;

  /** Carrega a lista e entra na sala da campanha; sai dela quando a página é destruída. */
  iniciar(campanhaId: number): void {
    this.campanhaId = campanhaId;
    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(campanhaId);
    this.destroyRef.onDestroy(() => {
      this.tempoRealService.informarLeitura(campanhaId, null);
      this.tempoRealService.sairSalaCampanha(campanhaId);
    });

    // `reconexao$` (P-083): o backend perdeu a presença do socket antigo — informa o aberto de novo.
    this.tempoRealService.reconexao$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tempoRealService.informarLeitura(campanhaId, this.abertoId()));

    merge(
      this.recarregar$,
      this.tempoRealService.documentoAlterado$.pipe(
        filter((evento) => evento.campanhaId === campanhaId),
        tap((evento) => this.aoAlterarDocumento(evento)),
      ),
      // `reconexao$` (P-083): só reconexões futuras a este `iniciar`, nunca uma já ocorrida antes.
      this.tempoRealService.reconexao$,
    )
      .pipe(
        // `switchMap`: numa rajada de eventos, só a última lista vale.
        switchMap(() => this.documentoService.listar(campanhaId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (documentos) => this.aplicarLista(documentos) });

    this.documentoService
      .listar(campanhaId)
      .pipe(
        finalize(() => this.carregandoLista.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (documentos) => this.documentos.set(documentos) });
  }

  /** A lista alterna entre o documento aberto e o painel vazio. */
  selecionar(id: number): void {
    if (id === this.abertoId()) {
      this.fecharDocumento();
      return;
    }
    this.abrirDocumento(id);
  }

  /** Resultado da busca abre sem alternar a seleção atual. */
  abrirDocumento(id: number): void {
    if (id !== this.abertoId()) {
      this.carregar(id, false);
    }
  }

  /** "Voltar" do celular: fecha o documento e mostra a lista. */
  fecharDocumento(): void {
    const estavaAberto = this.abertoId() !== null;
    this.abertoId.set(null);
    this.aberto.set(null);
    if (estavaAberto) {
      this.informarLeitura(null);
    }
  }

  /** `silencioso`: troca o conteúdo sem passar pelo esqueleto (versão nova do mesmo documento). */
  private carregar(id: number, silencioso: boolean): void {
    const trocou = id !== this.abertoId();
    this.abertoId.set(id);
    if (trocou) {
      this.informarLeitura(id);
    }
    if (!silencioso) {
      this.aberto.set(null);
    }
    this.documentoService
      .recuperar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (documento) => {
          if (this.abertoId() === documento.id) {
            this.aberto.set(documento);
          }
        },
        error: () => {
          // Ocultado entre a lista e o clique (404): o painel não fica preso no esqueleto.
          if (this.abertoId() === id) {
            this.fecharIndisponivel();
          }
        },
      });
  }

  /**
   * Nova lista. O aberto saiu dela? Fecha com o aviso. A versão dele mudou? Recarrega em silêncio.
   * Enquanto o aberto ainda carrega, a resposta do `recuperar` é que manda.
   */
  private aplicarLista(documentos: readonly DocumentoResumoDto[]): void {
    this.documentos.set(documentos);
    const abertoId = this.abertoId();
    if (abertoId === null) {
      return;
    }
    const resumo = documentos.find((item) => item.id === abertoId);
    if (!resumo) {
      this.fecharIndisponivel();
      return;
    }
    const aberto = this.aberto();
    if (aberto && resumo.updatedDate !== aberto.updatedDate) {
      this.carregar(abertoId, true);
    }
  }

  private aoAlterarDocumento(evento: DocumentoBibliotecaAlteradaDto): void {
    if (
      evento.documentoId !== null &&
      evento.documentoId === this.abertoId() &&
      (evento.alteracao === DocumentoAlteracaoEnum.OCULTADO ||
        evento.alteracao === DocumentoAlteracaoEnum.REMOVIDO)
    ) {
      this.fecharIndisponivel();
    }
  }

  private informarLeitura(documentoId: number | null): void {
    if (this.campanhaId !== null) {
      this.tempoRealService.informarLeitura(this.campanhaId, documentoId);
    }
  }

  private fecharIndisponivel(): void {
    this.fecharDocumento();
    this.notificacaoService.notificar({
      severidade: 'aviso',
      resumo: 'Documento indisponível',
      detalhe: 'Este documento não está mais disponível.',
    });
  }
}
