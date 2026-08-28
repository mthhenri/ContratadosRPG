import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  PaginaCadernoDto,
  PaginaCadernoEsquadraoEstadoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import { finalize } from 'rxjs';
import * as Y from 'yjs';

import { TempoRealService } from '../../core/services/tempo-real.service';
import { PaginaCadernoService } from './pagina-caderno.service';

type EstadoSincronizacao = 'INATIVO' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'FALHA';

const ORIGEM_INICIAL = Symbol('estado-inicial');
const ORIGEM_REMOTA = Symbol('atualizacao-remota');
const ATRASO_SINCRONIZACAO = 180;

/**
 * Sessão efêmera do editor compartilhado. O Y.Doc é a fonte de verdade enquanto uma página está
 * aberta; a API só recebe deltas CRDT, nunca uma substituição concorrente do documento inteiro.
 */
@Injectable()
export class CadernoEsquadraoColaborativoService {
  private readonly api = inject(PaginaCadernoService);
  private readonly tempoReal = inject(TempoRealService);
  private readonly destroyRef = inject(DestroyRef);
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private atualizacoesPendentes: Uint8Array[] = [];
  private paginaAtualId: number | null = null;
  private campanhaAtualId: number | null = null;
  private documentoAtual: Y.Doc | null = null;
  private conteudoMarkdownAtual = '';

  readonly documento = signal<Y.Doc | null>(null);
  readonly pagina = signal<PaginaCadernoDto | null>(null);
  readonly titulo = signal('');
  readonly estado = signal<EstadoSincronizacao>('INATIVO');

  constructor() {
    this.tempoReal.paginaEsquadraoAtualizada$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        if (evento.paginaId !== this.paginaAtualId) return;
        const documento = this.documentoAtual;
        if (!documento) return;
        Y.applyUpdate(documento, decodificarBase64(evento.atualizacao), ORIGEM_REMOTA);
        this.pagina.update((pagina) => (pagina ? { ...pagina, ...evento.pagina } : pagina));
      });
    this.tempoReal.paginaEsquadraoExcluida$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        if (evento.paginaId === this.paginaAtualId) this.fechar();
      });
  }

  abrir(id: number): void {
    this.fechar();
    this.estado.set('SINCRONIZANDO');
    this.api
      .recuperarEstadoPaginaEsquadrao(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.paginaAtualId === null) this.estado.set('INATIVO');
        }),
      )
      .subscribe({
        next: (estado) => this.ativar(estado),
        error: () => this.estado.set('FALHA'),
      });
  }

  criar(campanhaId: number): void {
    this.estado.set('SINCRONIZANDO');
    this.api
      .criarPaginaEsquadrao(campanhaId, { titulo: 'Nova página' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (estado) => this.ativar(estado), error: () => this.estado.set('FALHA') });
  }

  definirTitulo(titulo: string): void {
    const texto = this.documentoAtual?.getText('titulo');
    if (!texto || texto.toString() === titulo) return;
    this.documentoAtual?.transact(() => {
      texto.delete(0, texto.length);
      texto.insert(0, titulo);
    });
  }

  definirConteudoMarkdown(conteudoMarkdown: string): void {
    this.conteudoMarkdownAtual = conteudoMarkdown;
  }

  fechar(): void {
    if (this.temporizador !== null) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.atualizacoesPendentes = [];
    this.documentoAtual?.destroy();
    this.documentoAtual = null;
    this.documento.set(null);
    this.paginaAtualId = null;
    this.campanhaAtualId = null;
    this.pagina.set(null);
    this.titulo.set('');
    this.conteudoMarkdownAtual = '';
    this.estado.set('INATIVO');
  }

  private ativar(estadoPagina: PaginaCadernoEsquadraoEstadoDto): void {
    const documento = new Y.Doc();
    Y.applyUpdate(documento, decodificarBase64(estadoPagina.estado), ORIGEM_INICIAL);
    const titulo = documento.getText('titulo');
    this.documentoAtual = documento;
    this.paginaAtualId = estadoPagina.pagina.id;
    this.campanhaAtualId = estadoPagina.pagina.campanhaId;
    this.conteudoMarkdownAtual = estadoPagina.pagina.conteudoMarkdown;
    this.pagina.set(estadoPagina.pagina);
    this.titulo.set(titulo.toString() || estadoPagina.pagina.titulo);
    titulo.observe(() => this.titulo.set(titulo.toString()));
    documento.on('update', (atualizacao: Uint8Array, origem: unknown) => {
      if (origem === ORIGEM_INICIAL || origem === ORIGEM_REMOTA) return;
      this.atualizacoesPendentes.push(atualizacao);
      this.agendarSincronizacao();
    });
    this.documento.set(documento);
    this.tempoReal.conectar();
    this.tempoReal.entrarSalaCampanha(estadoPagina.pagina.campanhaId);
    this.estado.set('SINCRONIZADO');
  }

  private agendarSincronizacao(): void {
    if (this.temporizador !== null) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      this.sincronizar();
    }, ATRASO_SINCRONIZACAO);
  }

  private sincronizar(): void {
    const paginaId = this.paginaAtualId;
    const documento = this.documentoAtual;
    if (paginaId === null || !documento || this.atualizacoesPendentes.length === 0) return;
    const atualizacao = Y.mergeUpdates(this.atualizacoesPendentes);
    this.atualizacoesPendentes = [];
    this.estado.set('SINCRONIZANDO');
    this.api
      .alterarPaginaEsquadrao(paginaId, {
        atualizacao: codificarBase64(atualizacao),
        titulo: documento.getText('titulo').toString().trim() || 'Nova página',
        conteudoMarkdown: this.conteudoMarkdownAtual,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          if (paginaId !== this.paginaAtualId) return;
          this.pagina.update((pagina) => (pagina ? { ...pagina, ...resultado.pagina } : pagina));
          this.estado.set('SINCRONIZADO');
          if (this.atualizacoesPendentes.length > 0) this.agendarSincronizacao();
        },
        error: () => {
          if (paginaId !== this.paginaAtualId) return;
          this.atualizacoesPendentes.unshift(atualizacao);
          this.estado.set('FALHA');
        },
      });
  }
}

function codificarBase64(valor: Uint8Array): string {
  let binario = '';
  for (const byte of valor) binario += String.fromCharCode(byte);
  return btoa(binario);
}

function decodificarBase64(valor: string): Uint8Array {
  const binario = atob(valor);
  return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
}
