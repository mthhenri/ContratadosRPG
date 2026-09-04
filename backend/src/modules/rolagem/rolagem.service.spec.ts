import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import { RolagemVisibilidadeEnum, TipoCampanhaMembroPapelEnum, TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import type { ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';
import { UnauthorizedAccessException } from '../../core/exceptions';
import type { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { FichaService } from '../ficha/ficha.service';
import type { RolagemRepository } from './rolagem.repository';
import { RolagemService } from './rolagem.service';

interface RolagemRepositorioDublado {
  registrarRolagem: ReturnType<typeof vi.fn>;
  listarPorFicha: ReturnType<typeof vi.fn>;
  listarPorCampanha: ReturnType<typeof vi.fn>;
}

interface FichaServiceDublado {
  recuperarFicha: ReturnType<typeof vi.fn>;
}

interface CampanhaRepositorioDublado {
  recuperarMembro: ReturnType<typeof vi.fn>;
}

interface CampanhaGatewayDublado {
  emitirRolagemRegistrada: ReturnType<typeof vi.fn>;
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
    createdDate: new Date().toISOString(),
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
      registrarRolagem: vi.fn(),
      listarPorFicha: vi.fn(),
      listarPorCampanha: vi.fn(),
    };
    fichaService = { recuperarFicha: vi.fn() };
    campanhaRepositorio = { recuperarMembro: vi.fn() };
    campanhaGateway = { emitirRolagemRegistrada: vi.fn() };
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
    );
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

      expect(campanhaGateway.emitirRolagemRegistrada).toHaveBeenCalledWith(rolagemRegistrada);
    });

    it('NÃO emite rolagem:registrada quando PRIVADA', async () => {
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

      expect(campanhaGateway.emitirRolagemRegistrada).not.toHaveBeenCalled();
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

    it('ficha solta (sem campanha) registra com campanhaId null, sem emissão', async () => {
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
      rolagemRepositorio.listarPorCampanha.mockResolvedValue([criarResumo()]);

      const resultado = await service.listarPorCampanha({ campanhaId: 5 }, usuarioAtivo);

      expect(rolagemRepositorio.listarPorCampanha).toHaveBeenCalledWith({
        campanhaId: 5,
        usuarioId: usuarioAtivo.sub,
        ehMestre: false,
      });
      expect(resultado).toEqual([criarResumo()]);
    });
  });
});
