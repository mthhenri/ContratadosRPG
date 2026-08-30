import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { UnauthorizedAccessException } from '../exceptions';
import type { JwtPayload } from '../../modules/autenticacao/jwt-payload.interface';
import type { CampanhaService } from '../../modules/campanha/campanha.service';
import type { EncontroService } from '../../modules/encontro/encontro.service';
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

interface EncontroServiceDublado {
  sincronizarFichaAlterada: ReturnType<typeof vi.fn>;
}

interface SocketDublado {
  readonly cliente: Socket;
  readonly join: ReturnType<typeof vi.fn>;
  readonly disconnect: ReturnType<typeof vi.fn>;
  readonly toSala: ReturnType<typeof vi.fn>;
  readonly emitirParaSala: ReturnType<typeof vi.fn>;
}

/**
 * Cria um socket dublado com o handshake e as facetas usadas pelo gateway (`data`, `join`,
 * `disconnect`, `rooms`, `to`). `token` alimenta o `handshake.auth.token`; `usuario`, quando
 * informado, simula um socket já autenticado (payload em `data.usuario`); `salas`, quando
 * informado, simula salas já ingressadas (`rooms`, checado por `retransmitirPresencaEsquadrao`
 * sem chamada de serviço). As espiãs são devolvidas à parte (asserções sobre um método do próprio
 * `Socket` disparariam `unbound-method`).
 */
function criarSocket(
  opcoes: { token?: string; usuario?: JwtPayload; salas?: readonly string[] } = {},
): SocketDublado {
  const join = vi.fn();
  const disconnect = vi.fn();
  const emitirParaSala = vi.fn();
  const toSala = vi.fn(() => ({ emit: emitirParaSala }));
  const cliente = {
    data: opcoes.usuario ? { usuario: opcoes.usuario } : {},
    handshake: { auth: { token: opcoes.token }, headers: {} },
    rooms: new Set(opcoes.salas ?? []),
    join,
    disconnect,
    to: toSala,
  } as unknown as Socket;
  return { cliente, join, disconnect, toSala, emitirParaSala };
}

describe('CampanhaGateway', () => {
  let jwtService: JwtServiceDublado;
  let fichaService: FichaServiceDublado;
  let campanhaService: CampanhaServiceDublado;
  let encontroService: EncontroServiceDublado;
  let gateway: CampanhaGateway;

  const usuario: JwtPayload = { sub: 42, login: 'agente.novato', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };

  beforeEach(() => {
    jwtService = { verify: vi.fn() };
    fichaService = { recuperarFicha: vi.fn() };
    campanhaService = { recuperarCampanha: vi.fn() };
    encontroService = { sincronizarFichaAlterada: vi.fn().mockResolvedValue(undefined) };
    gateway = new CampanhaGateway(
      jwtService as unknown as JwtService,
      fichaService as unknown as FichaService,
      campanhaService as unknown as CampanhaService,
      encontroService as unknown as EncontroService,
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

  describe('retransmitirPresencaEsquadrao (presença efêmera, P-039)', () => {
    const evento = { campanhaId: 3, paginaId: 9, atualizacao: 'AQI=' };

    it('encaminha direto quando o socket já está na sala — sem checar a service de novo', async () => {
      const { cliente, toSala, emitirParaSala, join } = criarSocket({
        usuario,
        salas: ['campanha:3'],
      });

      await gateway.retransmitirPresencaEsquadrao(cliente, evento);

      expect(campanhaService.recuperarCampanha).not.toHaveBeenCalled();
      expect(join).not.toHaveBeenCalled();
      expect(toSala).toHaveBeenCalledWith('campanha:3');
      expect(emitirParaSala).toHaveBeenCalledWith('caderno-esquadrao:presenca', evento);
    });

    it('confirma o vínculo e ingressa na sala quando ainda não a tinha (corrida com campanha:entrar)', async () => {
      campanhaService.recuperarCampanha.mockResolvedValue({ id: 3 });
      const { cliente, toSala, emitirParaSala, join } = criarSocket({ usuario });

      await gateway.retransmitirPresencaEsquadrao(cliente, evento);

      expect(campanhaService.recuperarCampanha).toHaveBeenCalledWith({ id: 3 }, usuario);
      expect(join).toHaveBeenCalledWith('campanha:3');
      expect(toSala).toHaveBeenCalledWith('campanha:3');
      expect(emitirParaSala).toHaveBeenCalledWith('caderno-esquadrao:presenca', evento);
    });

    it('não encaminha quando o solicitante não é membro da campanha (§14)', async () => {
      campanhaService.recuperarCampanha.mockRejectedValue(new UnauthorizedAccessException());
      const { cliente, toSala, join } = criarSocket({ usuario });

      await gateway.retransmitirPresencaEsquadrao(cliente, evento);

      expect(join).not.toHaveBeenCalled();
      expect(toSala).not.toHaveBeenCalled();
    });

    it('não encaminha quando o socket não está autenticado', async () => {
      const { cliente, toSala } = criarSocket();

      await gateway.retransmitirPresencaEsquadrao(cliente, evento);

      expect(campanhaService.recuperarCampanha).not.toHaveBeenCalled();
      expect(toSala).not.toHaveBeenCalled();
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

    it('emite alteração do Esquadrão somente na sala da campanha', () => {
      const evento = {
        campanhaId: 3,
        paginaId: 9,
        atualizacao: 'AQI=',
        pagina: { id: 9, campanhaId: 3, usuarioAutorId: null, autorNome: null, tipo: 'ESQUADRAO' },
      };

      gateway.emitirPaginaEsquadraoAlterada(evento as never);

      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('caderno-esquadrao:alterado', evento);
    });

    it('pede ao EncontroService para resincronizar a Iniciativa após ficha:alterada (m7-17, correção)', () => {
      const ficha = { id: 5, campanhaId: 3, usuarioId: 10, nome: 'Agente Alfa', dados: {} };

      gateway.emitirFichaAlterada(ficha as never);

      expect(encontroService.sincronizarFichaAlterada).toHaveBeenCalledWith(5, 3);
    });

    it('emite ficha:visibilidade-alterada na sala da campanha com payload mínimo', () => {
      gateway.emitirFichaVisibilidadeAlterada({ fichaId: 5, campanhaId: 3 });

      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('ficha:visibilidade-alterada', {
        fichaId: 5,
        campanhaId: 3,
      });
    });

    it('omite historia do broadcast de ficha:alterada — sala mista, sem distinção por socket (m3-50)', () => {
      const ficha = {
        id: 5,
        campanhaId: 3,
        usuarioId: 10,
        nome: 'Agente Alfa',
        dados: { classe: 'COMBATENTE', historia: 'Nasceu numa colônia orbital.' },
      };

      gateway.emitirFichaAlterada(ficha as never);

      const payloadEmitido = emitir.mock.calls[0][1] as { dados: Record<string, unknown> };
      expect(payloadEmitido.dados).not.toHaveProperty('historia');
      expect(payloadEmitido.dados).toEqual({ classe: 'COMBATENTE' });
    });

    it('emite ficha:criada na sala campanha:<id> só com o resumo (sem o dados — §14)', () => {
      const ficha = {
        id: 5,
        campanhaId: 3,
        usuarioId: 10,
        nome: 'Agente Alfa',
        dados: {
          classe: 'COMBATENTE',
          arquetipo: 'LUTADOR',
          nivel: 1,
          segredo: 'não vaza',
          estado: { vidaAtual: 34, vidaMaxima: 34, energiaAtual: 18, energiaMaxima: 18, morrendo: true },
        },
      };

      gateway.emitirFichaCriada(ficha as never);

      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('ficha:criada', {
        id: 5,
        campanhaId: 3,
        campanhaNome: null,
        usuarioId: 10,
        nome: 'Agente Alfa',
        classe: 'COMBATENTE',
        arquetipo: 'LUTADOR',
        nivel: 1,
        vidaAtual: 34,
        vidaMaxima: 34,
        energiaAtual: 18,
        energiaMaxima: 18,
        morrendo: true,
        machucado: false,
        inconsciente: false,
      });
      // o payload emitido não carrega o `dados` completo da ficha
      const payloadEmitido = emitir.mock.calls[0][1] as Record<string, unknown>;
      expect(payloadEmitido).not.toHaveProperty('dados');
    });

    it('não emite ficha:criada para uma ficha solta no acervo (m3-28 — campanhaId null, sem sala)', () => {
      const ficha = {
        id: 5,
        campanhaId: null,
        usuarioId: 10,
        nome: 'Agente Alfa',
        dados: { classe: 'COMBATENTE', arquetipo: 'LUTADOR', nivel: 1, estado: { vidaAtual: 34 } },
      };

      gateway.emitirFichaCriada(ficha as never);

      expect(paraSala).not.toHaveBeenCalled();
      expect(emitir).not.toHaveBeenCalled();
    });

    it('emite membro:entrou na sala campanha:<id>', () => {
      gateway.emitirMembroEntrou({ campanhaId: 3, usuarioId: 42 });

      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('membro:entrou', { campanhaId: 3, usuarioId: 42 });
    });

    it('emite campanha:estado-alterado na sala da campanha', () => {
      gateway.emitirEstadoAlterado({ id: 3, naBase: false });

      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('campanha:estado-alterado', { id: 3, naBase: false });
    });

    it('emite campanha:inventario-alterado na sala da campanha', () => {
      gateway.emitirInventarioAlterado({ campanhaId: 3 });

      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('campanha:inventario-alterado', { campanhaId: 3 });
    });

    it('emite ficha:acesso-revogado na sala ficha:<id> (m3-51 — expulsão em tempo real)', () => {
      gateway.emitirAcessoRevogado({ fichaId: 5, usuarioId: 42 });

      expect(paraSala).toHaveBeenCalledWith('ficha:5');
      expect(emitir).toHaveBeenCalledWith('ficha:acesso-revogado', { fichaId: 5, usuarioId: 42 });
    });

    describe('emitirRolagemRegistrada (m3-27/m3-77)', () => {
      it('com campanha, emite só na sala campanha:<id> — nunca também em ficha:<id>', () => {
        const rolagem = { id: 9, fichaId: 5, campanhaId: 3 };

        gateway.emitirRolagemRegistrada(rolagem as never);

        expect(paraSala).toHaveBeenCalledTimes(1);
        expect(paraSala).toHaveBeenCalledWith('campanha:3');
        expect(emitir).toHaveBeenCalledTimes(1);
        expect(emitir).toHaveBeenCalledWith('rolagem:registrada', rolagem);
      });

      it('ficha solta (m3-28, campanhaId null) emite na sala ficha:<id> — só sala que existe pra ela', () => {
        const rolagem = { id: 9, fichaId: 5, campanhaId: null };

        gateway.emitirRolagemRegistrada(rolagem as never);

        expect(paraSala).toHaveBeenCalledTimes(1);
        expect(paraSala).toHaveBeenCalledWith('ficha:5');
        expect(emitir).toHaveBeenCalledTimes(1);
        expect(emitir).toHaveBeenCalledWith('rolagem:registrada', rolagem);
      });

      it('rolagem de avulso sem ficha nem campanha (registrarRolagemAvulso solto) não emite em lugar nenhum', () => {
        const rolagem = { id: 9, fichaId: null, campanhaId: null };

        gateway.emitirRolagemRegistrada(rolagem as never);

        expect(paraSala).not.toHaveBeenCalled();
        expect(emitir).not.toHaveBeenCalled();
      });
    });
  });
});
