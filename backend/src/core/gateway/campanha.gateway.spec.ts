import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { TipoCampanhaMembroPapelEnum, TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { UnauthorizedAccessException } from '../exceptions';
import type { JwtPayload } from '../../modules/autenticacao/jwt-payload.interface';
import type { CampanhaService } from '../../modules/campanha/campanha.service';
import type { DocumentoLeituraService } from '../../modules/documento/documento-leitura.service';
import type { DocumentoService } from '../../modules/documento/documento.service';
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
  validarAcessoSalaCampanha: ReturnType<typeof vi.fn>;
}

interface EncontroServiceDublado {
  sincronizarFichaAlterada: ReturnType<typeof vi.fn>;
}

interface DocumentoServiceDublado {
  informarLeitura: ReturnType<typeof vi.fn>;
}

interface DocumentoLeituraServiceDublado {
  removerLeituraConexao: ReturnType<typeof vi.fn>;
  removerLeituraUsuario: ReturnType<typeof vi.fn>;
}

interface SocketDublado {
  readonly cliente: Socket;
  readonly join: ReturnType<typeof vi.fn>;
  readonly leave: ReturnType<typeof vi.fn>;
  readonly disconnect: ReturnType<typeof vi.fn>;
  readonly toSala: ReturnType<typeof vi.fn>;
  readonly emitirParaSala: ReturnType<typeof vi.fn>;
  readonly emit: ReturnType<typeof vi.fn>;
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
  const leave = vi.fn();
  const disconnect = vi.fn();
  const emitirParaSala = vi.fn();
  const emit = vi.fn();
  const toSala = vi.fn(() => ({ emit: emitirParaSala }));
  const cliente = {
    id: 'socket-1',
    data: opcoes.usuario ? { usuario: opcoes.usuario } : {},
    handshake: { auth: { token: opcoes.token }, headers: {} },
    rooms: new Set(opcoes.salas ?? []),
    join,
    leave,
    disconnect,
    to: toSala,
    emit,
  } as unknown as Socket;
  return { cliente, join, leave, disconnect, toSala, emitirParaSala, emit };
}

describe('CampanhaGateway', () => {
  let jwtService: JwtServiceDublado;
  let fichaService: FichaServiceDublado;
  let campanhaService: CampanhaServiceDublado;
  let encontroService: EncontroServiceDublado;
  let documentoService: DocumentoServiceDublado;
  let documentoLeituraService: DocumentoLeituraServiceDublado;
  let gateway: CampanhaGateway;

  const usuario: JwtPayload = { sub: 42, login: 'agente.novato', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };

  beforeEach(() => {
    jwtService = { verify: vi.fn() };
    fichaService = { recuperarFicha: vi.fn() };
    campanhaService = { validarAcessoSalaCampanha: vi.fn() };
    encontroService = { sincronizarFichaAlterada: vi.fn().mockResolvedValue(undefined) };
    documentoService = { informarLeitura: vi.fn().mockResolvedValue(undefined) };
    documentoLeituraService = { removerLeituraConexao: vi.fn(), removerLeituraUsuario: vi.fn() };
    gateway = new CampanhaGateway(
      jwtService as unknown as JwtService,
      fichaService as unknown as FichaService,
      campanhaService as unknown as CampanhaService,
      encontroService as unknown as EncontroService,
      documentoService as unknown as DocumentoService,
      documentoLeituraService as unknown as DocumentoLeituraService,
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

  describe('entrar na sala campanha:<id> (§14, qualquer papel — m8-02)', () => {
    it('entra na sala cheia quando o vínculo é JOGADOR', async () => {
      campanhaService.validarAcessoSalaCampanha.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      const { cliente, join } = criarSocket({ usuario });

      const resultado = await gateway.entrarSalaCampanha(cliente, { id: 3 });

      expect(campanhaService.validarAcessoSalaCampanha).toHaveBeenCalledWith({ id: 3 }, usuario);
      expect(join).toHaveBeenCalledWith('campanha:3');
      expect(resultado).toEqual({ sucesso: true });
    });

    it('entra na sala cheia quando o vínculo é MESTRE', async () => {
      campanhaService.validarAcessoSalaCampanha.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      const { cliente, join } = criarSocket({ usuario });

      await gateway.entrarSalaCampanha(cliente, { id: 3 });

      expect(join).toHaveBeenCalledWith('campanha:3');
    });

    it('m3-27 (correção): MESTRE também ingressa em campanha:<id>:mestre, além da sala cheia', async () => {
      campanhaService.validarAcessoSalaCampanha.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      const { cliente, join } = criarSocket({ usuario });

      await gateway.entrarSalaCampanha(cliente, { id: 3 });

      expect(join).toHaveBeenCalledWith('campanha:3');
      expect(join).toHaveBeenCalledWith('campanha:3:mestre');
    });

    it('JOGADOR não ingressa em campanha:<id>:mestre', async () => {
      campanhaService.validarAcessoSalaCampanha.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      const { cliente, join } = criarSocket({ usuario });

      await gateway.entrarSalaCampanha(cliente, { id: 3 });

      expect(join).not.toHaveBeenCalledWith('campanha:3:mestre');
    });

    it('m8-02: entra numa sala própria (campanha:<id>:espectador), não na sala cheia, quando o vínculo é ESPECTADOR', async () => {
      campanhaService.validarAcessoSalaCampanha.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
      });
      const { cliente, join } = criarSocket({ usuario });

      const resultado = await gateway.entrarSalaCampanha(cliente, { id: 3 });

      expect(join).toHaveBeenCalledWith('campanha:3:espectador');
      expect(join).not.toHaveBeenCalledWith('campanha:3');
      expect(resultado).toEqual({ sucesso: true });
    });

    it('nega a entrada (sem join) quando o usuário não é membro (§14)', async () => {
      campanhaService.validarAcessoSalaCampanha.mockRejectedValue(new UnauthorizedAccessException());
      const { cliente, join } = criarSocket({ usuario });

      const resultado = await gateway.entrarSalaCampanha(cliente, { id: 3 });

      expect(join).not.toHaveBeenCalled();
      expect(resultado).toEqual({ sucesso: false });
    });
  });

  describe('sair de salas (infraestrutura sem mutação)', () => {
    it('abandona somente a sala da ficha, sem consultar services', async () => {
      const { cliente, leave } = criarSocket({ usuario });

      await gateway.sairSalaFicha(cliente, { id: 5 });

      expect(leave).toHaveBeenCalledWith('ficha:5');
      expect(fichaService.recuperarFicha).not.toHaveBeenCalled();
    });

    it('abandona todas as variantes da sala da campanha, sem consultar services', async () => {
      const { cliente, leave } = criarSocket({ usuario });

      await gateway.sairSalaCampanha(cliente, { id: 3 });

      expect(leave).toHaveBeenCalledWith('campanha:3');
      expect(leave).toHaveBeenCalledWith('campanha:3:mestre');
      expect(leave).toHaveBeenCalledWith('campanha:3:espectador');
      expect(campanhaService.validarAcessoSalaCampanha).not.toHaveBeenCalled();
    });

    it('campanha:sair limpa a presença de leitura deste socket nessa campanha (m9-09)', async () => {
      const { cliente } = criarSocket({ usuario });

      await gateway.sairSalaCampanha(cliente, { id: 3 });

      expect(documentoLeituraService.removerLeituraConexao).toHaveBeenCalledWith({
        conexaoId: 'socket-1',
        campanhaId: 3,
      });
    });

    it('a desconexão limpa a presença de leitura do socket em qualquer campanha (m9-09)', () => {
      const { cliente } = criarSocket({ usuario });

      gateway.handleDisconnect(cliente);

      expect(documentoLeituraService.removerLeituraConexao).toHaveBeenCalledWith({
        conexaoId: 'socket-1',
        campanhaId: null,
      });
    });
  });

  describe('documento:leitura (m9-09, presença de leitura — delegação pura)', () => {
    it('delega à DocumentoService com o id da conexão, sem regra própria', async () => {
      const { cliente, join, toSala } = criarSocket({ usuario });

      await gateway.informarLeituraDocumento(cliente, { campanhaId: 3, documentoId: 70 });

      expect(documentoService.informarLeitura).toHaveBeenCalledWith(
        { campanhaId: 3, documentoId: 70, conexaoId: 'socket-1' },
        usuario,
      );
      expect(campanhaService.validarAcessoSalaCampanha).not.toHaveBeenCalled();
      expect(join).not.toHaveBeenCalled();
      expect(toSala).not.toHaveBeenCalled();
    });

    it('socket sem usuário não chega à service', async () => {
      const { cliente } = criarSocket();

      await gateway.informarLeituraDocumento(cliente, { campanhaId: 3, documentoId: null });

      expect(documentoService.informarLeitura).not.toHaveBeenCalled();
    });

    it('recusa da service (não-membro) é silenciosa', async () => {
      documentoService.informarLeitura.mockRejectedValue(new UnauthorizedAccessException());
      const { cliente } = criarSocket({ usuario });

      await expect(
        gateway.informarLeituraDocumento(cliente, { campanhaId: 3, documentoId: 70 }),
      ).resolves.toBeUndefined();
    });
  });

  describe('recalibração pós-permissão', () => {
    it.each([null, TipoCampanhaMembroPapelEnum.ESPECTADOR, TipoCampanhaMembroPapelEnum.MESTRE])(
      "avisa somente os sockets afetados após recalibrar para %s, sem payload de gestão",
      async (papel) => {
        const socketAlvo = criarSocket({ usuario });
        const socketOutraSessao = criarSocket({ usuario });
        const socketOutro = criarSocket({ usuario: { ...usuario, sub: 99 } });
        const fetchSockets = vi.fn().mockResolvedValue([
          socketAlvo.cliente, socketOutraSessao.cliente, socketOutro.cliente,
        ]);
        const emitirParaSala = vi.fn();
        (gateway as unknown as { servidor: Server }).servidor = {
          in: vi.fn(() => ({ fetchSockets })),
          to: vi.fn(() => ({ emit: emitirParaSala })),
        } as unknown as Server;

        await gateway.recalibrarSalasCampanhaUsuario({
          campanhaId: 3, usuarioId: usuario.sub, papel,
        });

        for (const socket of [socketAlvo, socketOutraSessao]) {
          expect(socket.emit).toHaveBeenCalledExactlyOnceWith(
            "campanha:acesso-alterado", { campanhaId: 3 },
          );
          expect(socket.leave.mock.invocationCallOrder.at(-1)).toBeLessThan(
            socket.emit.mock.invocationCallOrder[0],
          );
          if (papel === null) {
            expect(socket.join).not.toHaveBeenCalled();
          } else {
            expect(socket.join.mock.invocationCallOrder.at(-1)).toBeLessThan(
              socket.emit.mock.invocationCallOrder[0],
            );
          }
        }
        expect(socketOutro.emit).not.toHaveBeenCalled();
        expect(socketOutro.leave).not.toHaveBeenCalled();
        expect(emitirParaSala).not.toHaveBeenCalled();
      },
    );
    it('remove o usuário da ficha revogada depois de emitir o aviso', async () => {
      const socketAlvo = criarSocket({ usuario });
      const socketOutro = criarSocket({ usuario: { ...usuario, sub: 99 } });
      const fetchSockets = vi.fn().mockResolvedValue([socketAlvo.cliente, socketOutro.cliente]);
      (gateway as unknown as { servidor: Server }).servidor = {
        in: vi.fn(() => ({ fetchSockets })),
        to: vi.fn(() => ({ emit: vi.fn() })),
      } as unknown as Server;

      gateway.emitirAcessoRevogado({ fichaId: 5, usuarioId: usuario.sub });
      await gateway.expulsarUsuarioDaFicha({ fichaId: 5, usuarioId: usuario.sub });

      expect(socketAlvo.leave).toHaveBeenCalledWith('ficha:5');
      expect(socketOutro.leave).not.toHaveBeenCalled();
    });

    it('troca todas as salas antigas pela sala exclusiva do espectador', async () => {
      const socketAlvo = criarSocket({ usuario });
      const fetchSockets = vi.fn().mockResolvedValue([socketAlvo.cliente]);
      (gateway as unknown as { servidor: Server }).servidor = {
        in: vi.fn(() => ({ fetchSockets })),
      } as unknown as Server;

      await gateway.recalibrarSalasCampanhaUsuario({
        campanhaId: 3,
        usuarioId: usuario.sub,
        papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
      });

      expect(socketAlvo.leave).toHaveBeenCalledWith('campanha:3');
      expect(socketAlvo.leave).toHaveBeenCalledWith('campanha:3:mestre');
      expect(socketAlvo.leave).toHaveBeenCalledWith('campanha:3:espectador');
      expect(socketAlvo.join).toHaveBeenCalledWith('campanha:3:espectador');
      expect(documentoLeituraService.removerLeituraUsuario).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: usuario.sub,
      });
    });

    it('acesso revogado (papel null) também limpa a presença de leitura do usuário (m9-09)', async () => {
      const fetchSockets = vi.fn().mockResolvedValue([]);
      (gateway as unknown as { servidor: Server }).servidor = {
        in: vi.fn(() => ({ fetchSockets })),
      } as unknown as Server;

      await gateway.recalibrarSalasCampanhaUsuario({ campanhaId: 3, usuarioId: 7, papel: null });

      expect(documentoLeituraService.removerLeituraUsuario).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: 7,
      });
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

      expect(campanhaService.validarAcessoSalaCampanha).not.toHaveBeenCalled();
      expect(join).not.toHaveBeenCalled();
      expect(toSala).toHaveBeenCalledWith('campanha:3');
      expect(emitirParaSala).toHaveBeenCalledWith('caderno-esquadrao:presenca', evento);
    });

    it('confirma o vínculo e ingressa na sala quando ainda não a tinha (corrida com campanha:entrar)', async () => {
      campanhaService.validarAcessoSalaCampanha.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      const { cliente, toSala, emitirParaSala, join } = criarSocket({ usuario });

      await gateway.retransmitirPresencaEsquadrao(cliente, evento);

      expect(campanhaService.validarAcessoSalaCampanha).toHaveBeenCalledWith({ id: 3 }, usuario);
      expect(join).toHaveBeenCalledWith('campanha:3');
      expect(toSala).toHaveBeenCalledWith('campanha:3');
      expect(emitirParaSala).toHaveBeenCalledWith('caderno-esquadrao:presenca', evento);
    });

    it('m8-02: ingressa na sala própria do espectador quando o vínculo é ESPECTADOR', async () => {
      campanhaService.validarAcessoSalaCampanha.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
      });
      const { cliente, toSala, join } = criarSocket({ usuario });

      await gateway.retransmitirPresencaEsquadrao(cliente, evento);

      expect(join).toHaveBeenCalledWith('campanha:3:espectador');
      expect(toSala).toHaveBeenCalledWith('campanha:3:espectador');
    });

    it('não encaminha quando o solicitante não é membro da campanha (§14)', async () => {
      campanhaService.validarAcessoSalaCampanha.mockRejectedValue(new UnauthorizedAccessException());
      const { cliente, toSala, join } = criarSocket({ usuario });

      await gateway.retransmitirPresencaEsquadrao(cliente, evento);

      expect(join).not.toHaveBeenCalled();
      expect(toSala).not.toHaveBeenCalled();
    });

    it('não encaminha quando o socket não está autenticado', async () => {
      const { cliente, toSala } = criarSocket();

      await gateway.retransmitirPresencaEsquadrao(cliente, evento);

      expect(campanhaService.validarAcessoSalaCampanha).not.toHaveBeenCalled();
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

    it('não decide invalidadores de campanha ao transportar ficha:alterada', () => {
      const ficha = { id: 5, campanhaId: null, usuarioId: 10, nome: 'Agente Alfa', dados: {} };

      gateway.emitirFichaAlterada(ficha as never);

      expect(emitir).not.toHaveBeenCalledWith('ficha:recortes-alterados', expect.anything());
    });

    it('transporta os recortes alterados na sala da campanha sem dados da ficha', () => {
      const evento = { campanhaId: 3, fichas: true, membros: false };

      gateway.emitirFichaRecortesAlterados(evento);

      expect(paraSala.mock.calls).toEqual([['campanha:3']]);
      expect(emitir.mock.calls).toEqual([
        ['ficha:recortes-alterados', { campanhaId: 3, fichas: true, membros: false }],
      ]);
    });

    // fix-ficha-oculta-eventos-campanha: destinatário = só a sala cheia (nunca a do espectador) e
    // payload **exato** sem identidade — um `fichaId` aqui identificaria a ficha oculta de terceiro.
    it('emite ficha:visibilidade-alterada só na sala cheia da campanha, sem identificar a ficha', () => {
      gateway.emitirFichaVisibilidadeAlterada({ campanhaId: 3 });

      expect(paraSala.mock.calls).toEqual([['campanha:3']]);
      expect(emitir.mock.calls).toEqual([['ficha:visibilidade-alterada', { campanhaId: 3 }]]);
    });

    it('emite ficha:removida-da-campanha só na sala que a ficha deixou, sem identificar a ficha', () => {
      gateway.emitirFichaRemovidaDaCampanha({ campanhaId: 3 });

      expect(paraSala.mock.calls).toEqual([['campanha:3']]);
      expect(emitir.mock.calls).toEqual([['ficha:removida-da-campanha', { campanhaId: 3 }]]);
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

    it('m8-02: emite campanha:membro-papel-alterado só na sala cheia — nunca alcança o espectador', () => {
      const evento = {
        campanhaId: 3,
        usuarioId: 42,
        papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
      };

      gateway.emitirPapelMembroAlterado(evento as never);

      expect(paraSala).toHaveBeenCalledTimes(1);
      expect(paraSala).toHaveBeenCalledWith('campanha:3');
      expect(emitir).toHaveBeenCalledWith('campanha:membro-papel-alterado', evento);
    });

    it('emite ficha:acesso-revogado na sala ficha:<id> (m3-51 — expulsão em tempo real)', () => {
      gateway.emitirAcessoRevogado({ fichaId: 5, usuarioId: 42 });

      expect(paraSala).toHaveBeenCalledWith('ficha:5');
      expect(emitir).toHaveBeenCalledWith('ficha:acesso-revogado', { fichaId: 5, usuarioId: 42 });
    });

    describe('emitirRolagemRegistrada (m3-27/m3-77; m3-27 correção)', () => {
      it('PUBLICA com campanha emite na sala campanha:<id> e na sala do espectador — nunca em ficha:<id>', () => {
        const rolagem = { id: 9, fichaId: 5, campanhaId: 3, visibilidade: 'PUBLICA' };

        gateway.emitirRolagemRegistrada(rolagem as never);

        expect(paraSala).toHaveBeenCalledTimes(1);
        expect(paraSala).toHaveBeenCalledWith(['campanha:3', 'campanha:3:espectador']);
        expect(emitir).toHaveBeenCalledTimes(1);
        expect(emitir).toHaveBeenCalledWith('rolagem:registrada', rolagem);
      });

      it('PUBLICA de ficha solta (m3-28, campanhaId null) emite na sala ficha:<id> — só sala que existe pra ela', () => {
        const rolagem = { id: 9, fichaId: 5, campanhaId: null, visibilidade: 'PUBLICA' };

        gateway.emitirRolagemRegistrada(rolagem as never);

        expect(paraSala).toHaveBeenCalledTimes(1);
        expect(paraSala).toHaveBeenCalledWith('ficha:5');
        expect(emitir).toHaveBeenCalledTimes(1);
        expect(emitir).toHaveBeenCalledWith('rolagem:registrada', rolagem);
      });

      it('PUBLICA de avulso sem ficha nem campanha (registrarRolagemAvulso solto) não emite em lugar nenhum', () => {
        const rolagem = { id: 9, fichaId: null, campanhaId: null, visibilidade: 'PUBLICA' };

        gateway.emitirRolagemRegistrada(rolagem as never);

        expect(paraSala).not.toHaveBeenCalled();
        expect(emitir).not.toHaveBeenCalled();
      });

      it('PRIVADA com campanha emite só na sala campanha:<id>:mestre — nunca na sala cheia nem no espectador', () => {
        const rolagem = { id: 9, fichaId: 5, campanhaId: 3, visibilidade: 'PRIVADA' };

        gateway.emitirRolagemRegistrada(rolagem as never);

        expect(paraSala).toHaveBeenCalledTimes(1);
        expect(paraSala).toHaveBeenCalledWith('campanha:3:mestre');
        expect(emitir).toHaveBeenCalledTimes(1);
        expect(emitir).toHaveBeenCalledWith('rolagem:registrada', rolagem);
      });

      it('PRIVADA de ficha solta (campanhaId null) não emite em lugar nenhum — sem mestre de campanha', () => {
        const rolagem = { id: 9, fichaId: 5, campanhaId: null, visibilidade: 'PRIVADA' };

        gateway.emitirRolagemRegistrada(rolagem as never);

        expect(paraSala).not.toHaveBeenCalled();
        expect(emitir).not.toHaveBeenCalled();
      });
    });

    describe('emitirCenaAlterada (m7-22, trava anti-vazamento)', () => {
      function criarEvento(status: string) {
        return {
          campanhaId: 3,
          cena: { id: 900, nome: 'Emboscada', tipo: 'COMBATE', status, temEncontro: true },
        };
      }

      it('cena PLANEJADA vai só para a sala do mestre — nunca para a sala cheia nem para o espectador', () => {
        const evento = criarEvento('PLANEJADA');

        gateway.emitirCenaAlterada(evento as never);

        expect(paraSala).toHaveBeenCalledTimes(1);
        expect(paraSala).toHaveBeenCalledWith(['campanha:3:mestre']);
        expect(emitir).toHaveBeenCalledWith('cena:alterada', evento);
      });

      it.each(['ATIVA', 'ENCERRADA'])('cena %s vai para a sala cheia e para a do espectador', (status) => {
        const evento = criarEvento(status);

        gateway.emitirCenaAlterada(evento as never);

        expect(paraSala).toHaveBeenCalledWith(['campanha:3', 'campanha:3:espectador']);
        expect(emitir).toHaveBeenCalledWith('cena:alterada', evento);
      });
    });

    describe('emitirDocumentoAlterado (m9-02, trava anti-vazamento)', () => {
      function criarEvento(alteracao: string, documentoId: number | null = 70) {
        return { campanhaId: 3, documentoId, alteracao };
      }

      it.each(['CRIADO', 'ALTERADO', 'REMOVIDO'])(
        '%s de documento oculto vai só para a sala do mestre — nunca para a sala cheia nem para o espectador',
        (alteracao) => {
          const evento = criarEvento(alteracao);

          gateway.emitirDocumentoAlterado(evento as never, false);

          expect(paraSala).toHaveBeenCalledTimes(1);
          expect(paraSala).toHaveBeenCalledWith(['campanha:3:mestre']);
          expect(emitir).toHaveBeenCalledWith('documento:alterado', evento);
        },
      );

      it.each([
        ['ALTERADO', 70],
        ['REMOVIDO', 70],
        ['REVELADO', 70],
        ['OCULTADO', 70],
        ['REORDENADO', null],
      ] as const)('%s visível à mesa vai para a sala cheia e para a do espectador', (alteracao, documentoId) => {
        const evento = criarEvento(alteracao, documentoId);

        gateway.emitirDocumentoAlterado(evento as never, true);

        expect(paraSala).toHaveBeenCalledTimes(1);
        expect(paraSala).toHaveBeenCalledWith(['campanha:3', 'campanha:3:espectador']);
        expect(emitir).toHaveBeenCalledWith('documento:alterado', evento);
      });
    });

    describe('emitirDocumentoLeitores (m9-09, presença só para o mestre)', () => {
      const retrato = {
        campanhaId: 3,
        leitores: [{ documentoId: 70, usuarioId: 2, papel: TipoCampanhaMembroPapelEnum.JOGADOR }],
      };

      it('vai só para campanha:<id>:mestre — nunca a sala cheia nem a do espectador', () => {
        gateway.emitirDocumentoLeitores(retrato);

        expect(paraSala).toHaveBeenCalledTimes(1);
        expect(paraSala).toHaveBeenCalledWith('campanha:3:mestre');
        expect(paraSala).not.toHaveBeenCalledWith(expect.arrayContaining(['campanha:3']));
        expect(paraSala).not.toHaveBeenCalledWith('campanha:3');
        expect(paraSala).not.toHaveBeenCalledWith('campanha:3:espectador');
        expect(emitir).toHaveBeenCalledWith('documento:leitores', retrato);
      });

      it('o retrato inicial vai só para a conexão do mestre que informou', () => {
        gateway.emitirDocumentoLeitoresParaConexao('socket-mestre', retrato);

        expect(paraSala).toHaveBeenCalledTimes(1);
        expect(paraSala).toHaveBeenCalledWith('socket-mestre');
        expect(emitir).toHaveBeenCalledWith('documento:leitores', retrato);
      });
    });

    describe('emitirEncontroAlterado (m7-06, estendido à sala do espectador em m8-05)', () => {
      /** Socket conectado dublado — só o que o laço de `emitirEncontroAlterado` usa. */
      function criarSocketConectado(usuarioConectado: JwtPayload | undefined) {
        return {
          data: usuarioConectado ? { usuario: usuarioConectado } : {},
          emit: vi.fn(),
        };
      }

      it('busca os sockets em campanha:<id> E campanha:<id>:espectador — nunca só a sala de membro', async () => {
        const fetchSockets = vi.fn().mockResolvedValue([]);
        const paraIn = vi.fn(() => ({ fetchSockets }));
        (gateway as unknown as { servidor: Server }).servidor = {
          ...(gateway as unknown as { servidor: Server }).servidor,
          in: paraIn,
        } as unknown as Server;

        await gateway.emitirEncontroAlterado(3, vi.fn());

        expect(paraIn).toHaveBeenCalledWith(['campanha:3', 'campanha:3:espectador']);
      });

      it('emite um payload por usuário conectado, socket a socket — e memoriza por usuário (duas abas custam uma montagem só)', async () => {
        const mestreConectado: JwtPayload = usuario;
        const espectadorConectado: JwtPayload = {
          sub: 99,
          login: 'olheiro',
          tipo: TipoUsuarioEnum.NORMAL,
          tokenVersao: 1,
        };
        const socketMestre = criarSocketConectado(mestreConectado);
        const socketEspectador1 = criarSocketConectado(espectadorConectado);
        const socketEspectador2 = criarSocketConectado(espectadorConectado);
        const fetchSockets = vi
          .fn()
          .mockResolvedValue([socketMestre, socketEspectador1, socketEspectador2]);
        (gateway as unknown as { servidor: Server }).servidor = {
          ...(gateway as unknown as { servidor: Server }).servidor,
          in: vi.fn(() => ({ fetchSockets })),
        } as unknown as Server;

        const montarParaUsuario = vi.fn((usuarioAlvo: JwtPayload) =>
          Promise.resolve({
            id: 9,
            campanhaId: 3,
            recorteDe: usuarioAlvo.sub,
          }),
        );

        await gateway.emitirEncontroAlterado(3, montarParaUsuario as never);

        // Duas identidades distintas conectadas (mestre, espectador) — mas o espectador tem duas
        // abas, então a montagem para ele só acontece uma vez.
        expect(montarParaUsuario).toHaveBeenCalledTimes(2);
        expect(socketMestre.emit).toHaveBeenCalledWith('encontro:alterado', {
          encontro: { id: 9, campanhaId: 3, recorteDe: mestreConectado.sub },
        });
        expect(socketEspectador1.emit).toHaveBeenCalledWith('encontro:alterado', {
          encontro: { id: 9, campanhaId: 3, recorteDe: espectadorConectado.sub },
        });
        expect(socketEspectador2.emit).toHaveBeenCalledWith(
          'encontro:alterado',
          socketEspectador1.emit.mock.calls[0][1],
        );
      });

      it('pula socket sem usuário autenticado em data — nunca emite pra ele', async () => {
        const socketSemUsuario = criarSocketConectado(undefined);
        const fetchSockets = vi.fn().mockResolvedValue([socketSemUsuario]);
        (gateway as unknown as { servidor: Server }).servidor = {
          ...(gateway as unknown as { servidor: Server }).servidor,
          in: vi.fn(() => ({ fetchSockets })),
        } as unknown as Server;

        await gateway.emitirEncontroAlterado(3, vi.fn());

        expect(socketSemUsuario.emit).not.toHaveBeenCalled();
      });
    });
  });
});
