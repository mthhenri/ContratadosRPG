import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TipoCampanhaMembroPapelEnum, TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { ResourceNotFoundException, UnauthorizedAccessException } from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { CampanhaService } from '../campanha/campanha.service';
import type { EncontroService } from '../encontro/encontro.service';
import type { FichaService } from '../ficha/ficha.service';
import type { RolagemRepository } from '../rolagem/rolagem.repository';
import { CampanhaProjecaoService } from './campanha-projecao.service';

interface CampanhaRepositorioDublado {
  recuperarPorId: ReturnType<typeof vi.fn>;
  listarMembros: ReturnType<typeof vi.fn>;
}

interface CampanhaServicoDublado {
  validarMembro: ReturnType<typeof vi.fn>;
  ehEspectador: ReturnType<typeof vi.fn>;
  ehMestre: ReturnType<typeof vi.fn>;
}

interface EncontroServicoDublado {
  recuperarEncontroAtivoParaEspectador: ReturnType<typeof vi.fn>;
  recuperarEncontroAtivoParaAlvo: ReturnType<typeof vi.fn>;
}

interface FichaServicoDublado {
  listarFichasParaAlvo: ReturnType<typeof vi.fn>;
  recuperarFichaParaAlvo: ReturnType<typeof vi.fn>;
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
  let encontroServico: EncontroServicoDublado;
  let fichaServico: FichaServicoDublado;
  let rolagemRepositorio: RolagemRepositorioDublado;
  let service: CampanhaProjecaoService;

  beforeEach(() => {
    campanhaRepositorio = { recuperarPorId: vi.fn(), listarMembros: vi.fn() };
    campanhaServico = {
      validarMembro: vi.fn(),
      ehEspectador: vi.fn((papel: TipoCampanhaMembroPapelEnum) => papel === TipoCampanhaMembroPapelEnum.ESPECTADOR),
      ehMestre: vi.fn((papel: TipoCampanhaMembroPapelEnum) => papel === TipoCampanhaMembroPapelEnum.MESTRE),
    };
    encontroServico = {
      recuperarEncontroAtivoParaEspectador: vi.fn().mockResolvedValue(null),
      recuperarEncontroAtivoParaAlvo: vi.fn().mockResolvedValue(null),
    };
    fichaServico = { listarFichasParaAlvo: vi.fn(), recuperarFichaParaAlvo: vi.fn() };
    rolagemRepositorio = { listarPublicasPorCampanha: vi.fn(), listarPorCampanha: vi.fn() };
    service = new CampanhaProjecaoService(
      campanhaRepositorio as unknown as CampanhaRepository,
      campanhaServico as unknown as CampanhaService,
      encontroServico as unknown as EncontroService,
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
        encontroAtivo: null,
      });
    });

    it('inclui o encontro ativo redigido para espectador (m8-05) — mesmo método para ESPECTADOR e MESTRE em prévia', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      campanhaServico.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.ESPECTADOR });
      rolagemRepositorio.listarPublicasPorCampanha.mockResolvedValue({
        itens: [],
        totalItens: 0,
        paginaAtual: 1,
        totalPaginas: 0,
      });
      const encontroRedigido = { id: 9, campanhaId: 3, status: 'ATIVO' };
      encontroServico.recuperarEncontroAtivoParaEspectador.mockResolvedValue(encontroRedigido);

      const resultado = await service.recuperarPainelEspectador(
        { campanhaId: 3, pagina: 1, itensPorPagina: 20 },
        usuarioEspectador,
      );

      expect(encontroServico.recuperarEncontroAtivoParaEspectador).toHaveBeenCalledWith({ campanhaId: 3 });
      expect(resultado.encontroAtivo).toBe(encontroRedigido);
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
    it('devolve fichas/membros/feed/capacidade calculados com a identidade do alvo', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      campanhaServico.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      const fichasDoAlvo = [{ id: 5, nome: 'Agente Beta' }];
      fichaServico.listarFichasParaAlvo.mockResolvedValue(fichasDoAlvo);
      const membrosParaAlvo = [{ usuarioId: usuarioJogador.sub, nome: 'Agente Beta', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] }];
      campanhaRepositorio.listarMembros.mockResolvedValue(membrosParaAlvo);
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
      // Identidade de VIEWER passada ao repositório é a do alvo, nunca a do mestre requisitante
      // (`usuarioAtivoEhMestre: false` mesmo o requisitante real sendo mestre) — é o cerne do m8-04.
      expect(campanhaRepositorio.listarMembros).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioAtivoId: usuarioJogador.sub,
        usuarioAtivoEhMestre: false,
      });
      expect(rolagemRepositorio.listarPorCampanha).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: usuarioJogador.sub,
        ehMestre: false,
      });
      expect(resultado).toEqual({
        campanha: { id: 3, nome: 'Contenção Alfa', descricao: 'Missão inaugural', naBase: true },
        fichas: fichasDoAlvo,
        membros: membrosParaAlvo,
        rolagens: feedDoAlvo,
        podeAcessarInventarioEsquadrao: true,
        encontroAtivo: null,
      });
    });

    it('inclui o encontro ativo redigido com a identidade do alvo (m8-05), nunca do mestre requisitante', async () => {
      campanhaRepositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      campanhaServico.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
      fichaServico.listarFichasParaAlvo.mockResolvedValue([]);
      campanhaRepositorio.listarMembros.mockResolvedValue([]);
      rolagemRepositorio.listarPorCampanha.mockResolvedValue([]);
      const encontroRedigido = { id: 9, campanhaId: 3, status: 'ATIVO' };
      encontroServico.recuperarEncontroAtivoParaAlvo.mockResolvedValue(encontroRedigido);

      const resultado = await service.recuperarPreviaJogador(
        { campanhaId: 3, usuarioAlvoId: usuarioJogador.sub },
        usuarioMestre,
      );

      expect(encontroServico.recuperarEncontroAtivoParaAlvo).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioAlvoId: usuarioJogador.sub,
      });
      expect(resultado.encontroAtivo).toBe(encontroRedigido);
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

  describe('recuperarFichaPreviaJogador', () => {
    it('delega a FichaService.recuperarFichaParaAlvo e devolve a ficha', async () => {
      const fichaParaAlvo = { id: 5, campanhaId: 3, usuarioId: usuarioJogador.sub, nome: 'Agente Beta' };
      fichaServico.recuperarFichaParaAlvo.mockResolvedValue(fichaParaAlvo);

      const resultado = await service.recuperarFichaPreviaJogador(
        { campanhaId: 3, usuarioAlvoId: usuarioJogador.sub, fichaId: 5 },
        usuarioMestre,
      );

      expect(fichaServico.recuperarFichaParaAlvo).toHaveBeenCalledWith(
        { fichaId: 5, usuarioAlvoId: usuarioJogador.sub },
        usuarioMestre,
      );
      expect(resultado).toBe(fichaParaAlvo);
    });

    it('propaga UnauthorizedAccessException de FichaService (requisitante não-mestre, alvo não-JOGADOR ou sem acesso)', async () => {
      fichaServico.recuperarFichaParaAlvo.mockRejectedValue(new UnauthorizedAccessException());

      await expect(
        service.recuperarFichaPreviaJogador(
          { campanhaId: 3, usuarioAlvoId: usuarioJogador.sub, fichaId: 5 },
          usuarioJogador,
        ),
      ).rejects.toThrow(UnauthorizedAccessException);
    });

    it('lança ResourceNotFoundException quando a ficha pertence a outra campanha (defesa em profundidade do :id)', async () => {
      fichaServico.recuperarFichaParaAlvo.mockResolvedValue({
        id: 5,
        campanhaId: 99,
        usuarioId: usuarioJogador.sub,
        nome: 'Agente Beta',
      });

      await expect(
        service.recuperarFichaPreviaJogador(
          { campanhaId: 3, usuarioAlvoId: usuarioJogador.sub, fichaId: 5 },
          usuarioMestre,
        ),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
