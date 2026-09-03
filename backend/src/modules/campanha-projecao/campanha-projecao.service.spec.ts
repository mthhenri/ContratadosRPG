import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TipoCampanhaMembroPapelEnum, TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { ResourceNotFoundException, UnauthorizedAccessException } from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { CampanhaService } from '../campanha/campanha.service';
import type { FichaService } from '../ficha/ficha.service';
import type { RolagemRepository } from '../rolagem/rolagem.repository';
import { CampanhaProjecaoService } from './campanha-projecao.service';

interface CampanhaRepositorioDublado {
  recuperarPorId: ReturnType<typeof vi.fn>;
}

interface CampanhaServicoDublado {
  validarMembro: ReturnType<typeof vi.fn>;
  ehEspectador: ReturnType<typeof vi.fn>;
  ehMestre: ReturnType<typeof vi.fn>;
}

interface FichaServicoDublado {
  listarFichasParaAlvo: ReturnType<typeof vi.fn>;
}

interface RolagemRepositorioDublado {
  listarPublicasPorCampanha: ReturnType<typeof vi.fn>;
  listarPorCampanha: ReturnType<typeof vi.fn>;
}

const usuarioMestre: JwtPayload = { sub: 7, login: 'mestre', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
const usuarioEspectador: JwtPayload = { sub: 42, login: 'olheiro', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
const usuarioJogador: JwtPayload = { sub: 55, login: 'agente', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };

const campanhaPersistida = {
  id: 3,
  nome: 'Contenção Alfa',
  descricao: 'Missão inaugural',
  codigoConvite: 'ABCD2345',
  codigoConviteEspectador: 'WXYZ6789',
  naBase: true,
};

describe('CampanhaProjecaoService', () => {
  let campanhaRepositorio: CampanhaRepositorioDublado;
  let campanhaServico: CampanhaServicoDublado;
  let fichaServico: FichaServicoDublado;
  let rolagemRepositorio: RolagemRepositorioDublado;
  let service: CampanhaProjecaoService;

  beforeEach(() => {
    campanhaRepositorio = { recuperarPorId: vi.fn() };
    campanhaServico = {
      validarMembro: vi.fn(),
      ehEspectador: vi.fn((papel: TipoCampanhaMembroPapelEnum) => papel === TipoCampanhaMembroPapelEnum.ESPECTADOR),
      ehMestre: vi.fn((papel: TipoCampanhaMembroPapelEnum) => papel === TipoCampanhaMembroPapelEnum.MESTRE),
    };
    fichaServico = { listarFichasParaAlvo: vi.fn() };
    rolagemRepositorio = { listarPublicasPorCampanha: vi.fn(), listarPorCampanha: vi.fn() };
    service = new CampanhaProjecaoService(
      campanhaRepositorio as unknown as CampanhaRepository,
      campanhaServico as unknown as CampanhaService,
      fichaServico as unknown as FichaService,
      rolagemRepositorio as unknown as RolagemRepository,
    );
  });

  describe('recuperarPainelEspectador', () => {
    it('devolve identidade segura + feed público para ESPECTADOR', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      campanhaServico.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.ESPECTADOR });
      const feed = { itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 };
      rolagemRepositorio.listarPublicasPorCampanha.mockResolvedValue(feed);

      const resultado = await service.recuperarPainelEspectador(
        { campanhaId: 3, pagina: 1, itensPorPagina: 20 },
        usuarioEspectador,
      );

      expect(rolagemRepositorio.listarPublicasPorCampanha).toHaveBeenCalledWith({
        campanhaId: 3,
        pagina: 1,
        itensPorPagina: 20,
      });
      expect(resultado).toEqual({
        campanha: { id: 3, nome: 'Contenção Alfa', descricao: 'Missão inaugural', naBase: true },
        rolagens: feed,
      });
    });

    it('devolve o mesmo payload para o MESTRE em modo de prévia — sem dado extra de mestre', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      campanhaServico.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      const feed = { itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 };
      rolagemRepositorio.listarPublicasPorCampanha.mockResolvedValue(feed);

      const resultado = await service.recuperarPainelEspectador(
        { campanhaId: 3, pagina: 1, itensPorPagina: 20 },
        usuarioMestre,
      );

      expect(resultado).not.toHaveProperty('codigoConvite');
      expect(resultado).not.toHaveProperty('codigoConviteEspectador');
      expect(resultado.rolagens).toBe(feed);
    });

    it('lança UnauthorizedAccessException para JOGADOR (não é espectador nem prévia de mestre)', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      campanhaServico.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });

      await expect(
        service.recuperarPainelEspectador({ campanhaId: 3, pagina: 1, itensPorPagina: 20 }, usuarioJogador),
      ).rejects.toThrow(UnauthorizedAccessException);

      expect(rolagemRepositorio.listarPublicasPorCampanha).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a campanha não existe', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(null);

      await expect(
        service.recuperarPainelEspectador({ campanhaId: 99, pagina: 1, itensPorPagina: 20 }, usuarioEspectador),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('recuperarPreviaJogador', () => {
    it('devolve fichas/feed/capacidade calculados com a identidade do alvo', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      campanhaServico.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      const fichasDoAlvo = [{ id: 5, nome: 'Agente Beta' }];
      fichaServico.listarFichasParaAlvo.mockResolvedValue(fichasDoAlvo);
      const feedDoAlvo = [{ id: 1, rotulo: 'Luta' }];
      rolagemRepositorio.listarPorCampanha.mockResolvedValue(feedDoAlvo);

      const resultado = await service.recuperarPreviaJogador(
        { campanhaId: 3, usuarioAlvoId: usuarioJogador.sub },
        usuarioMestre,
      );

      expect(fichaServico.listarFichasParaAlvo).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioAlvoId: usuarioJogador.sub,
      });
      expect(rolagemRepositorio.listarPorCampanha).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: usuarioJogador.sub,
        ehMestre: false,
      });
      expect(resultado).toEqual({
        campanha: { id: 3, nome: 'Contenção Alfa', descricao: 'Missão inaugural', naBase: true },
        fichas: fichasDoAlvo,
        rolagens: feedDoAlvo,
        podeAcessarInventarioEsquadrao: true,
      });
    });

    it('lança UnauthorizedAccessException quando o requisitante não é mestre', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      campanhaServico.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });

      await expect(
        service.recuperarPreviaJogador({ campanhaId: 3, usuarioAlvoId: 99 }, usuarioJogador),
      ).rejects.toThrow(UnauthorizedAccessException);

      expect(fichaServico.listarFichasParaAlvo).not.toHaveBeenCalled();
    });

    it('propaga a rejeição de FichaService quando o alvo não é JOGADOR ativo', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      campanhaServico.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      fichaServico.listarFichasParaAlvo.mockRejectedValue(new UnauthorizedAccessException());

      await expect(
        service.recuperarPreviaJogador({ campanhaId: 3, usuarioAlvoId: usuarioEspectador.sub }, usuarioMestre),
      ).rejects.toThrow(UnauthorizedAccessException);

      expect(rolagemRepositorio.listarPorCampanha).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a campanha não existe', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(null);

      await expect(
        service.recuperarPreviaJogador({ campanhaId: 99, usuarioAlvoId: 55 }, usuarioMestre),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('capacidade de inventário reflete naBase=false', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue({ ...campanhaPersistida, naBase: false });
      campanhaServico.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      fichaServico.listarFichasParaAlvo.mockResolvedValue([]);
      rolagemRepositorio.listarPorCampanha.mockResolvedValue([]);

      const resultado = await service.recuperarPreviaJogador(
        { campanhaId: 3, usuarioAlvoId: usuarioJogador.sub },
        usuarioMestre,
      );

      expect(resultado.podeAcessarInventarioEsquadrao).toBe(false);
    });
  });
});
