import { TestBed } from '@angular/core/testing';

import { SessaoService } from './sessao.service';
import { SOCKET_FACTORY, TempoRealService } from './tempo-real.service';

/**
 * Fake do socket do `socket.io-client`: captura os handlers registrados por `on` e as chamadas de
 * `emit`, e deixa o teste **disparar** eventos (`connect`, `ficha:alterada`…) manualmente.
 */
class SocketFake {
  readonly handlers = new Map<string, (payload?: unknown) => void>();
  readonly emitidos: Array<{ evento: string; payload: unknown }> = [];
  desconectado = false;

  on(evento: string, handler: (payload?: unknown) => void): this {
    this.handlers.set(evento, handler);
    return this;
  }

  emit(evento: string, payload: unknown): this {
    this.emitidos.push({ evento, payload });
    return this;
  }

  disconnect(): this {
    this.desconectado = true;
    return this;
  }

  disparar(evento: string, payload?: unknown): void {
    this.handlers.get(evento)?.(payload);
  }
}

/**
 * Prova o cliente Socket.IO do tempo real (m3-08): conecta com o JWT da sessão, entra nas salas,
 * repassa os eventos aos `Observable`s, **nunca emite mutação**, reconecta ao trocar de sessão e, ao
 * reconectar, reingressa nas salas conhecidas e bumpa o Signal de ressincronização (§9).
 *
 * A fábrica do socket é injetada pelo token `SOCKET_FACTORY` (seam de teste) — nada de `vi.mock` do
 * `socket.io-client`, que contaminaria os specs de página que importam o serviço real.
 */
describe('TempoRealService', () => {
  let socketFake: SocketFake;
  let ioMock: ReturnType<typeof vi.fn>;

  function criar(obterToken: () => string | null): { servico: TempoRealService } {
    const sessaoService = { obterToken };
    TestBed.configureTestingModule({
      providers: [
        { provide: SessaoService, useValue: sessaoService },
        { provide: SOCKET_FACTORY, useValue: ioMock },
      ],
    });
    return { servico: TestBed.inject(TempoRealService) };
  }

  beforeEach(() => {
    socketFake = new SocketFake();
    ioMock = vi.fn(() => socketFake);
  });

  it('não conecta sem sessão (o handshake do gateway exige o token)', () => {
    const { servico } = criar(() => null);
    servico.conectar();
    expect(ioMock).not.toHaveBeenCalled();
    expect(servico.conectado()).toBe(false);
  });

  it('conecta uma única vez com o token no auth do handshake (idempotente)', () => {
    const { servico } = criar(() => 'jwt-123');
    servico.conectar();
    servico.conectar();
    expect(ioMock).toHaveBeenCalledTimes(1);
    // `apiBase` vazio (dev) → `undefined` (mesma origem); `''` geraria URL inválida.
    expect(ioMock).toHaveBeenCalledWith(undefined, { auth: { token: 'jwt-123' } });

    socketFake.disparar('connect');
    expect(servico.conectado()).toBe(true);
  });

  it('reconecta quando a sessão troca de token (logout → login como outro usuário)', () => {
    let token = 'jwt-A';
    const fakeA = new SocketFake();
    const fakeB = new SocketFake();
    ioMock.mockReset();
    ioMock.mockReturnValueOnce(fakeA).mockReturnValueOnce(fakeB);

    const { servico } = criar(() => token);
    servico.conectar();
    expect(ioMock).toHaveBeenCalledTimes(1);

    token = 'jwt-B';
    servico.conectar();
    // O socket antigo foi encerrado e um novo aberto com o token novo — senão carregaria a
    // identidade anterior no gateway.
    expect(fakeA.desconectado).toBe(true);
    expect(ioMock).toHaveBeenCalledTimes(2);
    expect(ioMock).toHaveBeenLastCalledWith(undefined, { auth: { token: 'jwt-B' } });
  });

  it('desconecta quando a sessão some (logout)', () => {
    let token: string | null = 'jwt';
    const { servico } = criar(() => token);
    servico.conectar();
    socketFake.disparar('connect');
    expect(servico.conectado()).toBe(true);

    token = null;
    servico.conectar();
    expect(socketFake.desconectado).toBe(true);
    expect(servico.conectado()).toBe(false);
  });

  it('entra nas salas emitindo *:entrar (nunca uma mutação — proibição #25)', () => {
    const { servico } = criar(() => 'jwt');
    servico.conectar();
    socketFake.disparar('connect');
    servico.entrarSalaFicha(42);
    servico.entrarSalaCampanha(9);

    expect(socketFake.emitidos).toEqual([
      { evento: 'ficha:entrar', payload: { id: 42 } },
      { evento: 'campanha:entrar', payload: { id: 9 } },
    ]);
    // Só há eventos de entrada — nada de escrita de ficha/campanha pelo socket.
    expect(socketFake.emitidos.every((e) => e.evento.endsWith(':entrar'))).toBe(true);
  });

  it('repassa ficha:alterada / ficha:criada / membro:entrou aos Observables', () => {
    const { servico } = criar(() => 'jwt');
    servico.conectar();

    const recebidos: string[] = [];
    servico.fichaAlterada$.subscribe((f) => recebidos.push(`alterada:${f.id}`));
    servico.fichaCriada$.subscribe((r) => recebidos.push(`criada:${r.id}`));
    servico.membroEntrou$.subscribe((m) => recebidos.push(`membro:${m.usuarioId}`));

    socketFake.disparar('ficha:alterada', { id: 42 });
    socketFake.disparar('ficha:criada', { id: 7 });
    socketFake.disparar('membro:entrou', { campanhaId: 9, usuarioId: 3 });

    expect(recebidos).toEqual(['alterada:42', 'criada:7', 'membro:3']);
  });

  it('reingressa nas salas e bumpa a reconexão a cada reconexão (§9)', () => {
    const { servico } = criar(() => 'jwt');
    servico.conectar();
    // Salas marcadas antes do connect: o reingresso as ingressa (sem join dobrado com o buffer).
    servico.entrarSalaFicha(42);
    servico.entrarSalaCampanha(9);
    expect(socketFake.emitidos).toEqual([]);

    // Primeira conexão: reingressa, mas NÃO conta como reconexão (a tela já carregou normal).
    socketFake.disparar('connect');
    expect(servico.reconexao()).toBe(0);
    expect(socketFake.emitidos).toEqual([
      { evento: 'ficha:entrar', payload: { id: 42 } },
      { evento: 'campanha:entrar', payload: { id: 9 } },
    ]);

    socketFake.emitidos.length = 0;
    // Reconexão: reingressa nas salas conhecidas e bumpa o Signal.
    socketFake.disparar('connect');
    expect(servico.reconexao()).toBe(1);
    expect(socketFake.emitidos).toEqual([
      { evento: 'ficha:entrar', payload: { id: 42 } },
      { evento: 'campanha:entrar', payload: { id: 9 } },
    ]);
  });

  it('esquece a sala ao sair — não reingressa nela numa reconexão', () => {
    const { servico } = criar(() => 'jwt');
    servico.conectar();
    servico.entrarSalaFicha(42);
    servico.sairSalaFicha(42);

    socketFake.disparar('connect');
    expect(socketFake.emitidos).toEqual([]);
  });

  it('marca desconectado no disconnect e desliga tudo no desconectar()', () => {
    const { servico } = criar(() => 'jwt');
    servico.conectar();
    socketFake.disparar('connect');
    expect(servico.conectado()).toBe(true);

    socketFake.disparar('disconnect');
    expect(servico.conectado()).toBe(false);

    servico.desconectar();
    expect(socketFake.desconectado).toBe(true);
    // Após desconectar, conecta de novo (novo socket) — prova que o estado foi limpo.
    servico.conectar();
    expect(ioMock).toHaveBeenCalledTimes(2);
  });

});
