import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  PaginaCadernoDto,
  PaginaCadernoEsquadraoEstadoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import { finalize } from 'rxjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';

import { SessaoService } from '../../core/services/sessao.service';
import { TempoRealService } from '../../core/services/tempo-real.service';
import { PaginaCadernoService } from './pagina-caderno.service';

type EstadoSincronizacao = 'INATIVO' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'FALHA';

/** Um colaborador presente na página aberta agora — projeção do awareness Yjs (P-039), nunca
 * persistida nem enviada à busca. */
export interface ParticipanteCaderno {
  readonly clienteId: number;
  readonly nome: string;
  readonly cor: string;
}

const ORIGEM_INICIAL = Symbol('estado-inicial');
const ORIGEM_REMOTA = Symbol('atualizacao-remota');
const ORIGEM_PRESENCA_REMOTA = Symbol('presenca-remota');
const ATRASO_SINCRONIZACAO = 180;

/**
 * Paleta fixa de cores de identidade por participante — mesmo espírito de `ficha.cor`: valor
 * arbitrário associado a uma pessoa, fora do sistema de tokens do tema (não é cor de interface).
 */
const PALETA_PRESENCA: readonly string[] = [
  '#f97316',
  '#22c55e',
  '#38bdf8',
  '#a855f7',
  '#eab308',
  '#ec4899',
  '#14b8a6',
  '#f43f5e',
];

function corDoParticipante(usuarioId: number): string {
  return PALETA_PRESENCA[Math.abs(usuarioId) % PALETA_PRESENCA.length];
}

/**
 * Sessão efêmera do editor compartilhado. O Y.Doc é a fonte de verdade enquanto uma página está
 * aberta; a API só recebe deltas CRDT, nunca uma substituição concorrente do documento inteiro.
 */
@Injectable()
export class CadernoEsquadraoColaborativoService {
  private readonly api = inject(PaginaCadernoService);
  private readonly tempoReal = inject(TempoRealService);
  private readonly sessaoService = inject(SessaoService);
  private readonly destroyRef = inject(DestroyRef);
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private atualizacoesPendentes: Uint8Array[] = [];
  private paginaAtualId: number | null = null;
  private campanhaAtualId: number | null = null;
  private documentoAtual: Y.Doc | null = null;
  private awarenessAtual: Awareness | null = null;
  private conteudoMarkdownAtual = '';

  readonly documento = signal<Y.Doc | null>(null);
  readonly awareness = signal<Awareness | null>(null);
  readonly participantes = signal<readonly ParticipanteCaderno[]>([]);
  readonly pagina = signal<PaginaCadernoDto | null>(null);
  readonly titulo = signal('');
  readonly estado = signal<EstadoSincronizacao>('INATIVO');

  constructor() {
    this.tempoReal.paginaEsquadraoAlterada$
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
    this.tempoReal.presencaEsquadraoCaderno$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        if (evento.paginaId !== this.paginaAtualId) return;
        const awareness = this.awarenessAtual;
        if (!awareness) return;
        try {
          applyAwarenessUpdate(
            awareness,
            decodificarBase64(evento.atualizacao),
            ORIGEM_PRESENCA_REMOTA,
          );
        } catch {
          // Payload de presença corrompido ou incompatível: efêmero, não vale derrubar a sessão
          // colaborativa por isso — a próxima renovação do awareness local se corrige sozinha.
        }
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
    // `Awareness` observa `doc.on('destroy', ...)` desde a própria construção — destruir o
    // documento já cascateia `awareness.destroy()`, que propaga o estado local `null` (protocolo
    // Yjs: "before a client disconnects, it should propagate a null state") para os demais
    // colaboradores antes de soltar o listener. Não precisa de um `awarenessAtual?.destroy()`
    // separado aqui.
    this.documentoAtual?.destroy();
    this.documentoAtual = null;
    this.awarenessAtual = null;
    this.documento.set(null);
    this.awareness.set(null);
    this.participantes.set([]);
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
    const campanhaId = estadoPagina.pagina.campanhaId;
    const paginaId = estadoPagina.pagina.id;
    this.documentoAtual = documento;
    this.paginaAtualId = paginaId;
    this.campanhaAtualId = campanhaId;
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

    const awareness = new Awareness(documento);
    awareness.on(
      'update',
      (
        alteracao: { added: number[]; updated: number[]; removed: number[] },
        origem: unknown,
      ) => {
        this.participantes.set(this.listarParticipantes(awareness));
        if (origem === ORIGEM_PRESENCA_REMOTA) return;
        const clientesAlterados = alteracao.added.concat(alteracao.updated, alteracao.removed);
        const atualizacao = encodeAwarenessUpdate(awareness, clientesAlterados);
        this.tempoReal.enviarPresencaEsquadrao({
          campanhaId,
          paginaId,
          atualizacao: codificarBase64(atualizacao),
        });
      },
    );
    const usuario = this.sessaoService.usuario();
    // Campo `user`/`name`/`color` em inglês: contrato fixo do `y-prosemirror` (o `yCursorPlugin`
    // lê `estado.user.{name,color}` literalmente) — não é conceito de domínio nomeável em
    // português, é o formato de rede da biblioteca de terceiros.
    awareness.setLocalStateField('user', {
      name: usuario?.nome ?? 'Colaborador',
      color: corDoParticipante(usuario?.id ?? 0),
    });
    this.awarenessAtual = awareness;
    this.awareness.set(awareness);

    this.tempoReal.conectar();
    this.tempoReal.entrarSalaCampanha(campanhaId);
    this.estado.set('SINCRONIZADO');
  }

  /** Participantes com estado de presença ativo, exceto o próprio cliente local. */
  private listarParticipantes(awareness: Awareness): readonly ParticipanteCaderno[] {
    const participantes: ParticipanteCaderno[] = [];
    awareness.getStates().forEach((estado, clienteId) => {
      if (clienteId === awareness.clientID) return;
      const usuario = (estado as { user?: { name?: string; color?: string } }).user;
      if (!usuario) return;
      participantes.push({
        clienteId,
        nome: usuario.name ?? 'Colaborador',
        cor: usuario.color ?? corDoParticipante(clienteId),
      });
    });
    return participantes;
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
