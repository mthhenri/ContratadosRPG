import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { UnauthorizedAccessException } from '../exceptions';
import type { JwtPayload } from '../../modules/autenticacao/jwt-payload.interface';
import type { CampanhaService } from '../../modules/campanha/campanha.service';
import type { FichaService } from '../../modules/ficha/ficha.service';
import { CampanhaGateway } from './campanha.gateway';

interface JwtServiceDublado {
  verify: ReturnType<typeof vi.fn>;
}

interface FichaServiceDublado {
  recuperarFicha: ReturnType<typeof vi.fn>;
}

interface CampanhaServiceDublado {
  recuperarCampanha: ReturnType<typeof vi.fn>;
}

interface SocketDublado {
  readonly cliente: Socket;
  readonly join: ReturnType<typeof vi.fn>;
  readonly disconnect: ReturnType<typeof vi.fn>;
}

/**
 * Cria um socket dublado com o handshake e as facetas usadas pelo gateway (`data`, `join`,
 * `disconnect`). `token` alimenta o `handshake.auth.token`; `usuario`, quando informado, simula um
 * socket já autenticado (payload em `data.usuario`). As espiãs `join`/`disconnect` são devolvidas à
 * parte (asserções sobre um método do próprio `Socket` disparariam `unbound-method`).
 */
function criarSocket(opcoes: { token?: string; usuario?: JwtPayload } = {}): SocketDublado {
  const join = vi.fn();
  const disconnect = vi.fn();
  const cliente = {
    data: opcoes.usuario ? { usuario: opcoes.usuario } : {},
    handshake: { auth: { token: opcoes.token }, headers: {} },
    join,
    disconnect,
  } as unknown as Socket;
  return { cliente, join, disconnect };
}

describe('CampanhaGateway', () => {
  let jwtService: JwtServiceDublado;
  let fichaService: FichaServiceDublado;
  let campanhaService: CampanhaServiceDublado;
  let gateway: CampanhaGateway;

  const usuario: JwtPayload = { sub: 42, login: 'agente.novato' };

  beforeEach(() => {
    jwtService = { verify: vi.fn() };
    fichaService = { recuperarFicha: vi.fn() };
    campanhaService = { recuperarCampanha: vi.fn() };
    gateway = new CampanhaGateway(
      jwtService as unknown as JwtService,
      fichaService as unknown as FichaService,
      campanhaService as unknown as CampanhaService,
    );
  });

  describe('handleConnection (handshake autenticado)', () => {
    it('guarda o payload em data.usuario quando o JWT é válido', () => {
      jwtService.verify.mockReturnValue(usuario);
      const { cliente, disconnect } = criarSocket({ token: 'token.valido' });

      gateway.handleConnection(cliente);

      expect(jwtService.verify).toHaveBeenCalledWith('token.valido');
      expect((cliente.data as { usuario?: JwtPayload }).usuario).toEqual(usuario);
      expect(disconnect).not.toHaveBeenCalled();
    });

    it('desconecta o socket quando o JWT é inválido', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('token inválido');
      });
      const { cliente, disconnect } = criarSocket({ token: 'token.corrompido' });

      gateway.handleConnection(cliente);

      expect(disconnect).toHaveBeenCalledWith(true);
      expect((cliente.data as { usuario?: JwtPayload }).usuario).toBeUndefined();
    });

    it('desconecta o socket quando não há token no handshake', () => {
      const { cliente, disconnect } = criarSocket();

      gateway.handleConnection(cliente);

      expect(jwtService.verify).not.toHaveBeenCalled();
      expect(disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('entrar na sala ficha:<id> (permissão de visualização §14)', () => {
    it('entra na sala quando a service de ficha concede a visualização', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 5 });
      const { cliente, join } = criarSocket({ usuario });

      const resultado = await gateway.entrarSalaFicha(cliente, { id: 5 });

      expect(fichaService.recuperarFicha).toHaveBeenCalledWith({ id: 5 }, usuario);
      expect(join).toHaveBeenCalledWith('ficha:5');
      expect(resultado).toEqual({ sucesso: true });
    });

    it('nega a entrada (sem join) quando a service nega a visualização (§14)', async () => {
      fichaService.recuperarFicha.mockRejectedValue(new UnauthorizedAccessException());
      const { cliente, join } = criarSocket({ usuario });

      const resultado = await gateway.entrarSalaFicha(cliente, { id: 5 });

      expect(join).not.toHaveBeenCalled();
      expect(resultado).toEqual({ sucesso: false });
    });

    it('nega a entrada quando o socket não está autenticado', async () => {
      const { cliente, join } = criarSocket();

      const resultado = await gateway.entrarSalaFicha(cliente, { id: 5 });

      expect(fichaService.recuperarFicha).not.toHaveBeenCalled();
      expect(join).not.toHaveBeenCalled();
      expect(resultado).toEqual({ sucesso: false });
    });
  });

  describe('entrar na sala campanha:<id> (só membros §14)', () => {
    it('entra na sala quando a service de campanha confirma o vínculo', async () => {
      campanhaService.recuperarCampanha.mockResolvedValue({ id: 3 });
      const { cliente, join } = criarSocket({ usuario });

      const resultado = await gateway.entrarSalaCampanha(cliente, { id: 3 });

      expect(campanhaService.recuperarCampanha).toHaveBeenCalledWith({ id: 3 }, usuario);
      expect(join).toHaveBeenCalledWith('campanha:3');
      expect(resultado).toEqual({ sucesso: true });
    });

    it('nega a entrada (sem join) quando o usuário não é membro (§14)', async () => {
      campanhaService.recuperarCampanha.mockRejectedValue(new UnauthorizedAccessException());
      const { cliente, join } = criarSocket({ usuario });

      const resultado = await gateway.entrarSalaCampanha(cliente, { id: 3 });

      expect(join).not.toHaveBeenCalled();
      expect(resultado).toEqual({ sucesso: false });
    });
  });

  describe('emissão de eventos (broadcast-only)', () => {
    let emitir: ReturnType<typeof vi.fn>;
    let paraSala: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      emitir = vi.fn();
      paraSala = vi.fn(() => ({ emit: emitir }));
      const servidor = { to: paraSala } as unknown as Server;
      (gateway as unknown as { servidor: Server }).servidor = servidor;
    });

    it('emite ficha:alterada na sala ficha:<id>', () => {
      const ficha = { id: 5, campanhaId: 3, usuarioId: 10, nome: 'Agente Alfa', dados: {} };

      gateway.emitirFichaAlterada(ficha as never);

      expect(paraSala).toHaveBeenCalledWith('ficha:5');
      expect(emitir).toHaveBeenCalledWith('ficha:alterada', ficha);
    });

    it('emite ficha:criada na sala campanha:<id> só com o resumo (sem o dados — §14)', () => {
      const ficha = {
        id: 5,
        campanhaId: 3,
        usuarioId: 10,
        nome: 'Agente Alfa',
        dados: { classe: 'COMBATENTE', nivel: 1, segredo: 'não vaza' },
      };

      gateway.emitirFichaCriada(ficha as never);

      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('ficha:criada', {
        id: 5,
        usuarioId: 10,
        nome: 'Agente Alfa',
        classe: 'COMBATENTE',
        nivel: 1,
      });
      // o payload emitido não carrega o `dados` completo da ficha
      const payloadEmitido = emitir.mock.calls[0][1] as Record<string, unknown>;
      expect(payloadEmitido).not.toHaveProperty('dados');
    });

    it('emite membro:entrou na sala campanha:<id>', () => {
      gateway.emitirMembroEntrou({ campanhaId: 3, usuarioId: 42 });

      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('membro:entrou', { campanhaId: 3, usuarioId: 42 });
    });
  });
});
