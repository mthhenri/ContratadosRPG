import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import { RolagemVisibilidadeEnum, TipoCampanhaMembroPapelEnum, TipoUsuarioEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';
import type { ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';
import { ResourceNotFoundException, UnauthorizedAccessException } from '../../core/exceptions';
import type { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { FichaService } from '../ficha/ficha.service';
import type { RolagemRepository } from './rolagem.repository';
import { RolagemService } from './rolagem.service';
import { RolagemIdentidadeService } from './rolagem-identidade.service';

interface RolagemRepositorioDublado {
  listarCampanhasPorFicha: ReturnType<typeof vi.fn>;
  registrarRolagem: ReturnType<typeof vi.fn>;
  listarPorFicha: ReturnType<typeof vi.fn>;
  listarPorCampanha: ReturnType<typeof vi.fn>;
  recuperarParaExclusao: ReturnType<typeof vi.fn>;
  excluirRolagem: ReturnType<typeof vi.fn>;
}

interface FichaServiceDublado {
  recuperarFicha: ReturnType<typeof vi.fn>;
  avaliarIdentidadeRolagem: ReturnType<typeof vi.fn<FichaService['avaliarIdentidadeRolagem']>>;
}

interface CampanhaRepositorioDublado {
  recuperarMembro: ReturnType<typeof vi.fn>;
}

interface CampanhaGatewayDublado {
  emitirRolagemRecortesAlterados: ReturnType<typeof vi.fn>;
  emitirRolagemRegistrada: ReturnType<typeof vi.fn>;
  emitirRolagemExcluida: ReturnType<typeof vi.fn>;
}

interface EncontroRepositorioDublado {
  recuperarCombatentePorId: ReturnType<typeof vi.fn>;
  recuperarPorId: ReturnType<typeof vi.fn>;
}

const usuarioAtivo: JwtPayload = { sub: 7, login: 'agente.novato', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };

const resultado: ResultadoRolagemDto = {
  dados: [],
  atributos: [],
  constante: 4,
  total: 4,
};

function criarResumo(overrides: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
  return {
    id: 1,
    fichaId: 10,
    encontroCombatenteId: null,
    campanhaId: 5,
    usuarioId: usuarioAtivo.sub,
    nomeAutor: 'Agente Novato',
    nomeFicha: 'Ficha de Teste',
    rotulo: 'Luta',
    formula: null,
    visibilidade: RolagemVisibilidadeEnum.PUBLICA,
    resultado,
    createdDate: "2026-10-05T12:00:00.000Z",
    corFicha: null,
    ...overrides,
  };
}

describe('RolagemService', () => {
  let rolagemRepositorio: RolagemRepositorioDublado;
  let fichaService: FichaServiceDublado;
  let campanhaRepositorio: CampanhaRepositorioDublado;
  let campanhaGateway: CampanhaGatewayDublado;
  let encontroRepositorio: EncontroRepositorioDublado;
  let service: RolagemService;

  beforeEach(() => {
    rolagemRepositorio = {
      listarCampanhasPorFicha: vi.fn().mockResolvedValue([]),
      registrarRolagem: vi.fn(),
      listarPorFicha: vi.fn().mockResolvedValue({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 }),
      listarPorCampanha: vi.fn(),
      recuperarParaExclusao: vi.fn(),
      excluirRolagem: vi.fn(),
    };
    fichaService = { recuperarFicha: vi.fn(), avaliarIdentidadeRolagem: vi.fn().mockResolvedValue(false) };
    campanhaRepositorio = { recuperarMembro: vi.fn() };
    campanhaGateway = { emitirRolagemRegistrada: vi.fn(), emitirRolagemExcluida: vi.fn(), emitirRolagemRecortesAlterados: vi.fn() };
    encontroRepositorio = {
      recuperarCombatentePorId: vi.fn(),
      recuperarPorId: vi.fn(),
    };
    service = new RolagemService(
      rolagemRepositorio as unknown as RolagemRepository,
      fichaService as unknown as FichaService,
      campanhaRepositorio as unknown as CampanhaRepository,
      campanhaGateway as unknown as CampanhaGateway,
      encontroRepositorio as never,
      new RolagemIdentidadeService(fichaService as unknown as FichaService),
    );
  });

  describe('excluirRolagem', () => {
    const admin: JwtPayload = { ...usuarioAtivo, tipo: TipoUsuarioEnum.ADMIN };
    const alvo = { id: 9, fichaId: 10, campanhaId: 5, visibilidade: RolagemVisibilidadeEnum.PUBLICA };

    it('exclui por soft delete e emite rolagem:excluida quando o usuário é ADMIN', async () => {
      rolagemRepositorio.recuperarParaExclusao.mockResolvedValue(alvo);

      const resposta = await service.excluirRolagem({ id: 9 }, admin);

      expect(rolagemRepositorio.excluirRolagem).toHaveBeenCalledWith(9);
      expect(campanhaGateway.emitirRolagemExcluida).toHaveBeenCalledWith(alvo, expect.any(Function));
      expect(resposta).toEqual(alvo);
    });

    it('nega quem não é ADMIN, sem consultar nem excluir', async () => {
      await expect(service.excluirRolagem({ id: 9 }, usuarioAtivo)).rejects.toBeInstanceOf(
        UnauthorizedAccessException,
      );
      expect(rolagemRepositorio.recuperarParaExclusao).not.toHaveBeenCalled();
      expect(rolagemRepositorio.excluirRolagem).not.toHaveBeenCalled();
    });

    it('responde não encontrada para rolagem inexistente ou já excluída, sem emitir', async () => {
      rolagemRepositorio.recuperarParaExclusao.mockResolvedValue(null);

      await expect(service.excluirRolagem({ id: 9 }, admin)).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
      expect(rolagemRepositorio.excluirRolagem).not.toHaveBeenCalled();
      expect(campanhaGateway.emitirRolagemExcluida).not.toHaveBeenCalled();
    });
  });

  it('recorta rolagens antigas no estado atual da ficha, preservando resultado e autoria', async () => {
    campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });
    fichaService.avaliarIdentidadeRolagem.mockResolvedValue(true);
    const original = criarResumo({ encontroCombatenteId: 33, corFicha: '#123456' });
    rolagemRepositorio.listarPorCampanha.mockResolvedValue([original, { ...original, id: 2 }]);
    const resposta = await service.listarPorCampanha({ campanhaId: 5 }, usuarioAtivo);
    expect(resposta).toEqual([1, 2].map(id => ({ ...original, id, fichaId: null,
      encontroCombatenteId: null, nomeFicha: null, corFicha: null, identidadeReservada: true })));
    expect(fichaService.avaliarIdentidadeRolagem).toHaveBeenCalledTimes(1);
    expect(fichaService.avaliarIdentidadeRolagem).toHaveBeenCalledWith({ fichaId: 10, usuarioId: 7 });
    expect(original.fichaId).toBe(10);
  });

  it('invalida também a terceira campanha histórica e deduplica origem/destino', async () => {
    rolagemRepositorio.listarCampanhasPorFicha.mockResolvedValue([{ campanhaId: 1 }, { campanhaId: 3 }]);
    await service.invalidarRecortesDaFicha({ fichaId: 10, campanhaIds: [3, 9] });
    expect(rolagemRepositorio.listarCampanhasPorFicha).toHaveBeenCalledExactlyOnceWith({ fichaId: 10 });
    expect(campanhaGateway.emitirRolagemRecortesAlterados.mock.calls).toEqual([
      [{ campanhaId: 1 }], [{ campanhaId: 3 }], [{ campanhaId: 9 }],
    ]);
  });

  it('entrega recorte ao autor e callbacks WS autorizados distintos para registro/exclusão', async () => {
    const original = criarResumo();
    fichaService.recuperarFicha.mockResolvedValue({ id: 10, campanhaId: 5 });
    rolagemRepositorio.registrarRolagem.mockResolvedValue(original);
    campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });
    fichaService.avaliarIdentidadeRolagem.mockImplementation(({ usuarioId }) => Promise.resolve(usuarioId !== 7));
    const resposta = await service.registrarRolagem({ fichaId: 10, rotulo: 'Luta', formula: null,
      resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA }, usuarioAtivo);
    expect(resposta).toEqual(original);
    const montar = campanhaGateway.emitirRolagemRegistrada.mock.calls[0][1] as (usuario: JwtPayload) => Promise<RolagemResumoDto>;
    expect(await montar({ ...usuarioAtivo, sub: 42 })).toMatchObject({ fichaId: null, identidadeReservada: true });
    expect(await montar(usuarioAtivo)).toEqual(original);
    campanhaRepositorio.recuperarMembro.mockResolvedValue(null);
    await expect(montar({ ...usuarioAtivo, sub: 99 })).rejects.toThrow(UnauthorizedAccessException);

    campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });
    const excluida = { id: 1, fichaId: 10, campanhaId: 5, visibilidade: RolagemVisibilidadeEnum.PUBLICA };
    rolagemRepositorio.recuperarParaExclusao.mockResolvedValue(excluida);
    const excluidaParaAdmin = await service.excluirRolagem({ id: 1 }, { ...usuarioAtivo, sub: 42, tipo: TipoUsuarioEnum.ADMIN });
    expect(excluidaParaAdmin).toEqual({ ...excluida, fichaId: null });
    const excluirPara = campanhaGateway.emitirRolagemExcluida.mock.calls[0][1] as (usuario: JwtPayload) => Promise<unknown>;
    expect(await excluirPara({ ...usuarioAtivo, sub: 42 })).toEqual({ ...excluida, fichaId: null });
    expect(await excluirPara(usuarioAtivo)).toEqual(excluida);
  });

  describe('NPC: gestão e privacidade obrigatórias', () => {
    it('força PRIVADA mesmo quando o dono solicita PUBLICA', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 10, usuarioId: 7, campanhaId: 5, tipo: TipoFichaEnum.NPC });
      rolagemRepositorio.registrarRolagem.mockResolvedValue(criarResumo({ visibilidade: RolagemVisibilidadeEnum.PRIVADA }));
      await service.registrarRolagem({ fichaId: 10, rotulo: 'Luta', formula: 'LUTd20kh1+NIV',
        resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA }, usuarioAtivo);
      expect(rolagemRepositorio.registrarRolagem).toHaveBeenCalledWith(expect.objectContaining({ visibilidade: RolagemVisibilidadeEnum.PRIVADA }));
      expect(campanhaGateway.emitirRolagemRegistrada).toHaveBeenCalledWith(expect.objectContaining({ visibilidade: RolagemVisibilidadeEnum.PRIVADA }), expect.any(Function));
    });
    it('concessão de leitura não permite registro nem histórico privado', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 10, usuarioId: 99, campanhaId: 5, tipo: TipoFichaEnum.NPC });
      campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });
      await expect(service.registrarRolagem({ fichaId: 10, rotulo: 'Luta', formula: null,
        resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA }, usuarioAtivo)).rejects.toBeInstanceOf(UnauthorizedAccessException);
      await expect(service.listarPorFicha({ fichaId: 10, pagina: 1, itensPorPagina: 20 }, usuarioAtivo)).rejects.toBeInstanceOf(UnauthorizedAccessException);
      expect(rolagemRepositorio.registrarRolagem).not.toHaveBeenCalled();
      expect(rolagemRepositorio.listarPorFicha).not.toHaveBeenCalled();
      expect(campanhaGateway.emitirRolagemRegistrada).not.toHaveBeenCalled();
    });
    it('mestre da campanha pode registrar e consultar NPC de outro dono', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 10, usuarioId: 99, campanhaId: 5, tipo: TipoFichaEnum.NPC });
      campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      rolagemRepositorio.registrarRolagem.mockResolvedValue(criarResumo());
      await service.registrarRolagem({ fichaId: 10, rotulo: 'Luta', formula: null,
        resultado, visibilidade: RolagemVisibilidadeEnum.PRIVADA }, usuarioAtivo);
      await service.listarPorFicha({ fichaId: 10, pagina: 1, itensPorPagina: 20 }, usuarioAtivo);
      expect(rolagemRepositorio.listarPorFicha).toHaveBeenCalled();
    });
  });

  describe('registrarRolagemAvulso', () => {
    it('registra a rolagem em nome do avulso quando o autor é mestre da campanha', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue({
        id: 31,
        encontroId: 12,
        fichaId: null,
        nomeAvulso: 'Capanga',
        corAvulso: '#d53030',
      });
      encontroRepositorio.recuperarPorId.mockResolvedValue({ id: 12, campanhaId: 5 });
      campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      const registrada = criarResumo({ fichaId: null, encontroCombatenteId: 31, nomeFicha: 'Capanga' });
      rolagemRepositorio.registrarRolagem.mockResolvedValue(registrada);

      const resposta = await service.registrarRolagemAvulso(
        {
          encontroId: 12,
          combatenteId: 31,
          rotulo: 'Rolagem livre',
          formula: '1d6+2',
          visibilidade: RolagemVisibilidadeEnum.PRIVADA,
          resultado,
        },
        usuarioAtivo,
      );

      expect(rolagemRepositorio.registrarRolagem).toHaveBeenCalledWith({
        fichaId: null,
        encontroCombatenteId: 31,
        campanhaId: 5,
        usuarioId: usuarioAtivo.sub,
        rotulo: 'Rolagem livre',
        formula: '1d6+2',
        visibilidade: RolagemVisibilidadeEnum.PRIVADA,
        resultado,
      });
      expect(resposta).toEqual(registrada);
    });
  });

  describe('registrarRolagemAvulsaDaCampanha', () => {
    it('registra uma rolagem sem ficha nem combatente quando o autor é mestre', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      const registrada = criarResumo({ fichaId: null, encontroCombatenteId: null, campanhaId: 5 });
      rolagemRepositorio.registrarRolagem.mockResolvedValue(registrada);

      await service.registrarRolagemAvulsaDaCampanha(
        { campanhaId: 5, rotulo: 'Rolagem rápida', formula: '2d6', visibilidade: RolagemVisibilidadeEnum.PUBLICA, resultado },
        usuarioAtivo,
      );

      expect(rolagemRepositorio.registrarRolagem).toHaveBeenCalledWith(expect.objectContaining({
        fichaId: null,
        encontroCombatenteId: null,
        campanhaId: 5,
        usuarioId: usuarioAtivo.sub,
      }));
      expect(campanhaGateway.emitirRolagemRegistrada).toHaveBeenCalledWith(registrada, expect.any(Function));
    });
  });

  describe('registrarRolagem', () => {
    it('resolve campanhaId/usuarioId da ficha e do autenticado (não da ficha) e persiste', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 10, campanhaId: 5, usuarioId: 99, nome: 'Ficha' });
      const rolagemRegistrada = criarResumo();
      rolagemRepositorio.registrarRolagem.mockResolvedValue(rolagemRegistrada);

      const resultadoServico = await service.registrarRolagem(
        {
          fichaId: 10,
          rotulo: 'Luta',
          formula: null,
          visibilidade: RolagemVisibilidadeEnum.PUBLICA,
          resultado,
        },
        usuarioAtivo,
      );

      expect(fichaService.recuperarFicha).toHaveBeenCalledWith({ id: 10 }, usuarioAtivo);
      expect(rolagemRepositorio.registrarRolagem).toHaveBeenCalledWith({
        fichaId: 10,
        encontroCombatenteId: null,
        campanhaId: 5,
        usuarioId: usuarioAtivo.sub,
        rotulo: 'Luta',
        formula: null,
        visibilidade: RolagemVisibilidadeEnum.PUBLICA,
        resultado,
      });
      expect(resultadoServico).toEqual(rolagemRegistrada);
    });

    it('emite rolagem:registrada quando PUBLICA', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 10, campanhaId: 5, usuarioId: 99, nome: 'Ficha' });
      const rolagemRegistrada = criarResumo({ visibilidade: RolagemVisibilidadeEnum.PUBLICA });
      rolagemRepositorio.registrarRolagem.mockResolvedValue(rolagemRegistrada);

      await service.registrarRolagem(
        {
          fichaId: 10,
          rotulo: 'Luta',
          formula: null,
          visibilidade: RolagemVisibilidadeEnum.PUBLICA,
          resultado,
        },
        usuarioAtivo,
      );

      expect(campanhaGateway.emitirRolagemRegistrada).toHaveBeenCalledWith(rolagemRegistrada, expect.any(Function));
    });

    it('também emite rolagem:registrada quando PRIVADA (m3-27 correção — o gateway decide a sala pela visibilidade)', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 10, campanhaId: 5, usuarioId: 99, nome: 'Ficha' });
      const rolagemRegistrada = criarResumo({ visibilidade: RolagemVisibilidadeEnum.PRIVADA });
      rolagemRepositorio.registrarRolagem.mockResolvedValue(rolagemRegistrada);

      await service.registrarRolagem(
        {
          fichaId: 10,
          rotulo: 'Luta',
          formula: null,
          visibilidade: RolagemVisibilidadeEnum.PRIVADA,
          resultado,
        },
        usuarioAtivo,
      );

      expect(campanhaGateway.emitirRolagemRegistrada).toHaveBeenCalledWith(rolagemRegistrada, expect.any(Function));
    });

    it('propaga a negação de permissão de recuperarFicha sem persistir', async () => {
      fichaService.recuperarFicha.mockRejectedValue(new UnauthorizedAccessException());

      await expect(
        service.registrarRolagem(
          {
            fichaId: 10,
            rotulo: 'Luta',
            formula: null,
            visibilidade: RolagemVisibilidadeEnum.PUBLICA,
            resultado,
          },
          usuarioAtivo,
        ),
      ).rejects.toThrow(UnauthorizedAccessException);
      expect(rolagemRepositorio.registrarRolagem).not.toHaveBeenCalled();
    });

    it('ficha solta (sem campanha) registra com campanhaId null', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 10, campanhaId: null, usuarioId: 99, nome: 'Ficha' });
      const rolagemRegistrada = criarResumo({ campanhaId: null });
      rolagemRepositorio.registrarRolagem.mockResolvedValue(rolagemRegistrada);

      await service.registrarRolagem(
        {
          fichaId: 10,
          rotulo: 'Luta',
          formula: null,
          visibilidade: RolagemVisibilidadeEnum.PUBLICA,
          resultado,
        },
        usuarioAtivo,
      );

      expect(rolagemRepositorio.registrarRolagem).toHaveBeenCalledWith(
        expect.objectContaining({ campanhaId: null }),
      );
    });
  });

  describe('listarPorFicha', () => {
    it('reavalia a identidade após a consulta histórica mesmo que a leitura tenha sido autorizada antes de ocultar', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 10, campanhaId: 5 });
      fichaService.avaliarIdentidadeRolagem.mockResolvedValue(true);
      rolagemRepositorio.listarPorFicha.mockResolvedValue({ itens: [criarResumo()], totalItens: 1, paginaAtual: 1, totalPaginas: 1 });
      const resposta = await service.listarPorFicha({ fichaId: 10, pagina: 1, itensPorPagina: 20 }, usuarioAtivo);
      expect(resposta.itens[0]).toMatchObject({ fichaId: null, nomeFicha: null, corFicha: null, identidadeReservada: true });
    });
    it('confere a permissão de visualização antes de listar', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 10, campanhaId: 5, usuarioId: 99, nome: 'Ficha' });
      const paginado = { itens: [criarResumo()], totalItens: 1, paginaAtual: 1, totalPaginas: 1 };
      rolagemRepositorio.listarPorFicha.mockResolvedValue(paginado);

      const resultadoServico = await service.listarPorFicha(
        { fichaId: 10, pagina: 1, itensPorPagina: 20 },
        usuarioAtivo,
      );

      expect(fichaService.recuperarFicha).toHaveBeenCalledWith({ id: 10 }, usuarioAtivo);
      expect(rolagemRepositorio.listarPorFicha).toHaveBeenCalledWith({
        fichaId: 10,
        pagina: 1,
        itensPorPagina: 20,
      });
      expect(resultadoServico).toEqual(paginado);
    });

    it('propaga a negação de permissão sem listar', async () => {
      fichaService.recuperarFicha.mockRejectedValue(new UnauthorizedAccessException());

      await expect(
        service.listarPorFicha({ fichaId: 10, pagina: 1, itensPorPagina: 20 }, usuarioAtivo),
      ).rejects.toThrow(UnauthorizedAccessException);
      expect(rolagemRepositorio.listarPorFicha).not.toHaveBeenCalled();
    });
  });

  describe('listarPorCampanha', () => {
    it('barra quem não é membro da campanha', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(null);

      await expect(service.listarPorCampanha({ campanhaId: 5 }, usuarioAtivo)).rejects.toThrow(
        UnauthorizedAccessException,
      );
      expect(rolagemRepositorio.listarPorCampanha).not.toHaveBeenCalled();
    });

    it('resolve ehMestre a partir do papel do solicitante (mestre)', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      rolagemRepositorio.listarPorCampanha.mockResolvedValue([criarResumo()]);

      await service.listarPorCampanha({ campanhaId: 5 }, usuarioAtivo);

      expect(rolagemRepositorio.listarPorCampanha).toHaveBeenCalledWith({
        campanhaId: 5,
        usuarioId: usuarioAtivo.sub,
        ehMestre: true,
      });
    });

    it('resolve ehMestre a partir do papel do solicitante (jogador comum)', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });
      rolagemRepositorio.listarPorCampanha.mockResolvedValue([]);

      await service.listarPorCampanha({ campanhaId: 5 }, usuarioAtivo);

      expect(rolagemRepositorio.listarPorCampanha).toHaveBeenCalledWith({
        campanhaId: 5,
        usuarioId: usuarioAtivo.sub,
        ehMestre: false,
      });
    });

    it('m8-02: aceita ESPECTADOR (é membro) e resolve ehMestre=false — repository já filtra só PUBLICA pra quem não é mestre nem autor', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
      });
      const resumoRolagem = criarResumo();
      rolagemRepositorio.listarPorCampanha.mockResolvedValue([resumoRolagem]);

      const resultado = await service.listarPorCampanha({ campanhaId: 5 }, usuarioAtivo);

      expect(rolagemRepositorio.listarPorCampanha).toHaveBeenCalledWith({
        campanhaId: 5,
        usuarioId: usuarioAtivo.sub,
        ehMestre: false,
      });
      expect(resultado).toEqual([resumoRolagem]);
    });
  });
});
