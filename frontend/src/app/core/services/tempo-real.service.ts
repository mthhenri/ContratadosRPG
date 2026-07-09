import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import type { CampanhaMembroEntradaDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaAlteradaDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { environment } from '../../../environments/environment';
import { SessaoService } from './sessao.service';

/**
 * Cliente Socket.IO do tempo real (m3-08) — consome o gateway **broadcast-only** da m3-05. Mantém
 * **uma** conexão autenticada pelo JWT da sessão (m2-06), entra nas salas `ficha:<id>` /
 * `campanha:<id>` e repassa os eventos de negócio (`ficha:alterada`, `ficha:criada`,
 * `membro:entrou`) aos consumidores. O estado de conexão fica em **Signals**; os eventos, em
 * `Observable`s (cada evento é um instante, não um estado — as telas reagem por evento).
 *
 * **Nunca emite mutação** (proibição #25): só `*:entrar` para ingressar em sala. Toda escrita
 * continua por REST — a service do backend é o árbitro (§14) e emite o broadcast após persistir.
 *
 * **Ressincronização (§9):** o Render free tier dorme e derruba conexões. A cada **reconexão** o
 * serviço reingressa nas salas conhecidas (o servidor perde as salas ao cair o socket) e sinaliza
 * `reconexao` — as telas refazem o fetch da ficha aberta / da lista. A primeira conexão não conta
 * como reconexão (a tela já carregou pelo caminho normal).
 */
@Injectable({ providedIn: 'root' })
export class TempoRealService {
  private readonly sessaoService = inject(SessaoService);

  private socket: Socket | null = null;
  private jaConectou = false;

  /** Salas já ingressadas — reingressadas a cada reconexão (o servidor as perde ao cair o socket). */
  private readonly salasFicha = new Set<number>();
  private readonly salasCampanha = new Set<number>();

  /** `true` enquanto o socket está conectado ao gateway. */
  readonly conectado = signal(false);
  /** Contador que incrementa a cada **reconexão** — as telas ressincronizam quando ele muda. */
  readonly reconexao = signal(0);

  private readonly fichaAlteradaSubject = new Subject<FichaAlteradaDto>();
  private readonly fichaCriadaSubject = new Subject<FichaResumoDto>();
  private readonly membroEntrouSubject = new Subject<CampanhaMembroEntradaDto>();

  /** Uma ficha da campanha foi alterada (na sala `ficha:<id>` em que o cliente está). */
  readonly fichaAlterada$: Observable<FichaAlteradaDto> = this.fichaAlteradaSubject.asObservable();
  /** Uma ficha foi criada na campanha (resumo, sem `dados` — §14; na sala `campanha:<id>`). */
  readonly fichaCriada$: Observable<FichaResumoDto> = this.fichaCriadaSubject.asObservable();
  /** Um membro entrou na campanha (na sala `campanha:<id>`). */
  readonly membroEntrou$: Observable<CampanhaMembroEntradaDto> =
    this.membroEntrouSubject.asObservable();

  /**
   * Abre a conexão Socket.IO com o JWT da sessão (idempotente — só conecta uma vez). Sem sessão,
   * não conecta (o handshake do gateway exige o token). Em dev `apiBase` é vazio → `io(undefined)`
   * conecta na **mesma origem** (o `/socket.io` é encaminhado ao backend pelo `proxy.conf.json`); em
   * produção `apiBase` aponta ao Render. (Passar `''` a `io` geraria uma URL inválida — só
   * `undefined` cai no default de mesma origem.)
   */
  conectar(): void {
    if (this.socket) {
      return;
    }
    const token = this.sessaoService.obterToken();
    if (!token) {
      return;
    }

    this.socket = io(environment.apiBase || undefined, { auth: { token } });

    this.socket.on('connect', () => {
      this.conectado.set(true);
      this.reingressarSalas();
      if (this.jaConectou) {
        this.reconexao.update((contador) => contador + 1);
      }
      this.jaConectou = true;
    });
    this.socket.on('disconnect', () => this.conectado.set(false));

    this.socket.on('ficha:alterada', (ficha: FichaAlteradaDto) =>
      this.fichaAlteradaSubject.next(ficha),
    );
    this.socket.on('ficha:criada', (resumo: FichaResumoDto) =>
      this.fichaCriadaSubject.next(resumo),
    );
    this.socket.on('membro:entrou', (evento: CampanhaMembroEntradaDto) =>
      this.membroEntrouSubject.next(evento),
    );
  }

  /** Ingressa na sala `ficha:<id>` (permissão de visualização §14 é checada pelo gateway). */
  entrarSalaFicha(fichaId: number): void {
    this.salasFicha.add(fichaId);
    this.socket?.emit('ficha:entrar', { id: fichaId });
  }

  /** Ingressa na sala `campanha:<id>` (só membros — checado pelo gateway). */
  entrarSalaCampanha(campanhaId: number): void {
    this.salasCampanha.add(campanhaId);
    this.socket?.emit('campanha:entrar', { id: campanhaId });
  }

  /** Esquece a sala `ficha:<id>` (ao sair da tela) — para não reingressar nela numa reconexão. */
  sairSalaFicha(fichaId: number): void {
    this.salasFicha.delete(fichaId);
  }

  /** Esquece a sala `campanha:<id>` (ao sair da tela) — para não reingressar nela numa reconexão. */
  sairSalaCampanha(campanhaId: number): void {
    this.salasCampanha.delete(campanhaId);
  }

  /** Encerra a conexão e limpa o estado de salas (ex.: logout). */
  desconectar(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.jaConectou = false;
    this.conectado.set(false);
    this.salasFicha.clear();
    this.salasCampanha.clear();
  }

  /** Reingressa em todas as salas conhecidas — chamado a cada `connect` (inicial e reconexão). */
  private reingressarSalas(): void {
    for (const fichaId of this.salasFicha) {
      this.socket?.emit('ficha:entrar', { id: fichaId });
    }
    for (const campanhaId of this.salasCampanha) {
      this.socket?.emit('campanha:entrar', { id: campanhaId });
    }
  }
}
