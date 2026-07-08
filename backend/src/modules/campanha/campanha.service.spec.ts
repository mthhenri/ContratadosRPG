import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

// randomBytes dublado para tornar o código de convite determinístico no teste. Os bytes
// 0..7 mapeiam para os 8 primeiros caracteres do alfabeto de convite → 'ABCDEFGH'.
vi.mock('node:crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from([0, 1, 2, 3, 4, 5, 6, 7])),
}));
import type { CampanhaRecuperadaDto } from '@contratados-rpg/shared/dtos/campanha';
import {
  BusinessException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from './campanha.repository';
import { CampanhaService } from './campanha.service';

interface RepositorioDublado {
  criarCampanha: ReturnType<typeof vi.fn>;
  criarMembro: ReturnType<typeof vi.fn>;
  listarPorUsuario: ReturnType<typeof vi.fn>;
  recuperarPorCodigoConvite: ReturnType<typeof vi.fn>;
  recuperarPorId: ReturnType<typeof vi.fn>;
  recuperarMembro: ReturnType<typeof vi.fn>;
  alterarCampanha: ReturnType<typeof vi.fn>;
  alterarConvite: ReturnType<typeof vi.fn>;
  listarMembros: ReturnType<typeof vi.fn>;
  excluirCampanha: ReturnType<typeof vi.fn>;
  removerMembro: ReturnType<typeof vi.fn>;
  transferirMestre: ReturnType<typeof vi.fn>;
}

describe('CampanhaService', () => {
  let repositorio: RepositorioDublado;
  let service: CampanhaService;

  const usuarioMestre: JwtPayload = { sub: 7, login: 'senhor.contratados' };
  const usuarioNaoMestre: JwtPayload = { sub: 42, login: 'agente.novato' };

  const campanhaPersistida: CampanhaRecuperadaDto = {
    id: 3,
    nome: 'Contenção Alfa',
    descricao: 'Missão inaugural',
    codigoConvite: 'ABCD2345',
  };

  beforeEach(() => {
    repositorio = {
      criarCampanha: vi.fn(),
      criarMembro: vi.fn(),
      listarPorUsuario: vi.fn(),
      recuperarPorCodigoConvite: vi.fn(),
      recuperarPorId: vi.fn(),
      recuperarMembro: vi.fn(),
      alterarCampanha: vi.fn(),
      alterarConvite: vi.fn(),
      listarMembros: vi.fn(),
      excluirCampanha: vi.fn(),
      removerMembro: vi.fn(),
      transferirMestre: vi.fn(),
    };
    service = new CampanhaService(repositorio as unknown as CampanhaRepository);
  });

  describe('criarCampanha', () => {
    it('cria a campanha e o campanha_membro do criador com papel MESTRE', async () => {
      repositorio.criarCampanha.mockResolvedValue({
        id: 3,
        nome: 'Contenção Alfa',
        descricao: 'Missão inaugural',
        codigoConvite: 'ABCD2345',
      });
      repositorio.criarMembro.mockResolvedValue(undefined);

      const resultado = await service.criarCampanha(
        { nome: 'Contenção Alfa', descricao: 'Missão inaugural' },
        usuarioMestre,
      );

      expect(repositorio.criarCampanha).toHaveBeenCalledTimes(1);
      expect(repositorio.criarCampanha).toHaveBeenCalledWith({
        nome: 'Contenção Alfa',
        descricao: 'Missão inaugural',
        codigoConvite: 'ABCDEFGH',
      });

      expect(repositorio.criarMembro).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: usuarioMestre.sub,
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      expect(resultado).toEqual({
        id: 3,
        nome: 'Contenção Alfa',
        descricao: 'Missão inaugural',
        codigoConvite: 'ABCD2345',
      });
    });
  });

  describe('listarCampanhas', () => {
    it('devolve as campanhas de que o usuário é membro', async () => {
      const campanhas = [
        {
          id: 3,
          nome: 'Contenção Alfa',
          descricao: null,
          papel: TipoCampanhaMembroPapelEnum.MESTRE,
        },
      ];
      repositorio.listarPorUsuario.mockResolvedValue(campanhas);

      const resultado = await service.listarCampanhas({ usuarioId: usuarioMestre.sub });

      expect(repositorio.listarPorUsuario).toHaveBeenCalledWith({ usuarioId: usuarioMestre.sub });
      expect(resultado).toBe(campanhas);
    });
  });

  describe('recuperarCampanha', () => {
    it('devolve a campanha quando o usuário é membro', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      const resultado = await service.recuperarCampanha({ id: 3 }, usuarioNaoMestre);

      expect(repositorio.recuperarMembro).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: usuarioNaoMestre.sub,
      });
      expect(resultado).toBe(campanhaPersistida);
    });

    it('lança ResourceNotFoundException quando a campanha não existe', async () => {
      repositorio.recuperarPorId.mockResolvedValue(null);

      await expect(service.recuperarCampanha({ id: 99 }, usuarioMestre)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('lança UnauthorizedAccessException quando o usuário não é membro', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue(null);

      await expect(service.recuperarCampanha({ id: 3 }, usuarioNaoMestre)).rejects.toThrow(
        UnauthorizedAccessException,
      );
    });
  });

  describe('alterarCampanha', () => {
    it('altera a campanha quando o usuário é o mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      const campanhaAlterada = {
        id: 3,
        nome: 'Contenção Beta',
        descricao: null,
        codigoConvite: 'ABCD2345',
      };
      repositorio.alterarCampanha.mockResolvedValue(campanhaAlterada);

      const resultado = await service.alterarCampanha(
        { id: 3, nome: 'Contenção Beta' },
        usuarioMestre,
      );

      expect(repositorio.alterarCampanha).toHaveBeenCalledWith({ id: 3, nome: 'Contenção Beta' });
      expect(resultado).toBe(campanhaAlterada);
    });

    it('lança UnauthorizedAccessException quando o usuário não é o mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(
        service.alterarCampanha({ id: 3, nome: 'Contenção Beta' }, usuarioNaoMestre),
      ).rejects.toThrow(UnauthorizedAccessException);

      expect(repositorio.alterarCampanha).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a campanha não existe', async () => {
      repositorio.recuperarPorId.mockResolvedValue(null);

      await expect(
        service.alterarCampanha({ id: 99, nome: 'Contenção Beta' }, usuarioMestre),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(repositorio.recuperarMembro).not.toHaveBeenCalled();
    });
  });

  describe('excluirCampanha', () => {
    it('exclui a campanha quando o usuário é o mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      repositorio.excluirCampanha.mockResolvedValue(undefined);

      await service.excluirCampanha({ id: 3 }, usuarioMestre);

      expect(repositorio.excluirCampanha).toHaveBeenCalledWith({ id: 3 });
    });

    it('lança UnauthorizedAccessException quando o usuário não é o mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue(null);

      await expect(service.excluirCampanha({ id: 3 }, usuarioNaoMestre)).rejects.toThrow(
        UnauthorizedAccessException,
      );

      expect(repositorio.excluirCampanha).not.toHaveBeenCalled();
    });
  });

  describe('entrarCampanha', () => {
    it('cria o campanha_membro do ingressante com papel JOGADOR', async () => {
      repositorio.recuperarPorCodigoConvite.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue(null);
      repositorio.criarMembro.mockResolvedValue(undefined);

      const resultado = await service.entrarCampanha(
        { codigoConvite: 'ABCD2345' },
        usuarioNaoMestre,
      );

      expect(repositorio.recuperarPorCodigoConvite).toHaveBeenCalledWith({
        codigoConvite: 'ABCD2345',
      });
      expect(repositorio.criarMembro).toHaveBeenCalledWith({
        campanhaId: campanhaPersistida.id,
        usuarioId: usuarioNaoMestre.sub,
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      expect(resultado).toEqual({
        id: campanhaPersistida.id,
        nome: campanhaPersistida.nome,
        descricao: campanhaPersistida.descricao,
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
    });

    it('lança ResourceNotFoundException quando o código não existe', async () => {
      repositorio.recuperarPorCodigoConvite.mockResolvedValue(null);

      await expect(
        service.entrarCampanha({ codigoConvite: 'INVALIDO' }, usuarioNaoMestre),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(repositorio.criarMembro).not.toHaveBeenCalled();
    });

    it('lança BusinessException quando o usuário já é membro', async () => {
      repositorio.recuperarPorCodigoConvite.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(
        service.entrarCampanha({ codigoConvite: 'ABCD2345' }, usuarioNaoMestre),
      ).rejects.toThrow(BusinessException);

      expect(repositorio.criarMembro).not.toHaveBeenCalled();
    });
  });

  describe('regenerarConvite', () => {
    it('gera um novo código quando o usuário é o mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      const conviteRegenerado = { id: 3, codigoConvite: 'ABCDEFGH' };
      repositorio.alterarConvite.mockResolvedValue(conviteRegenerado);

      const resultado = await service.regenerarConvite({ id: 3 }, usuarioMestre);

      expect(repositorio.alterarConvite).toHaveBeenCalledWith({
        id: 3,
        codigoConvite: 'ABCDEFGH',
      });
      expect(resultado).toBe(conviteRegenerado);
    });

    it('lança UnauthorizedAccessException quando o usuário não é o mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(service.regenerarConvite({ id: 3 }, usuarioNaoMestre)).rejects.toThrow(
        UnauthorizedAccessException,
      );

      expect(repositorio.alterarConvite).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a campanha não existe', async () => {
      repositorio.recuperarPorId.mockResolvedValue(null);

      await expect(service.regenerarConvite({ id: 99 }, usuarioMestre)).rejects.toThrow(
        ResourceNotFoundException,
      );

      expect(repositorio.recuperarMembro).not.toHaveBeenCalled();
    });
  });

  describe('listarMembros', () => {
    it('devolve os membros quando o usuário é membro da campanha', async () => {
      const membros = [
        {
          usuarioId: usuarioMestre.sub,
          nome: 'Matheus',
          papel: TipoCampanhaMembroPapelEnum.MESTRE,
        },
      ];
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      repositorio.listarMembros.mockResolvedValue(membros);

      const resultado = await service.listarMembros({ campanhaId: 3 }, usuarioNaoMestre);

      expect(repositorio.listarMembros).toHaveBeenCalledWith({ campanhaId: 3 });
      expect(resultado).toBe(membros);
    });

    it('lança UnauthorizedAccessException quando o usuário não é membro', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue(null);

      await expect(service.listarMembros({ campanhaId: 3 }, usuarioNaoMestre)).rejects.toThrow(
        UnauthorizedAccessException,
      );

      expect(repositorio.listarMembros).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a campanha não existe', async () => {
      repositorio.recuperarPorId.mockResolvedValue(null);

      await expect(service.listarMembros({ campanhaId: 99 }, usuarioMestre)).rejects.toThrow(
        ResourceNotFoundException,
      );

      expect(repositorio.recuperarMembro).not.toHaveBeenCalled();
    });
  });

  describe('removerMembro', () => {
    it('remove o membro quando o autor é o mestre e o alvo é outro membro', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro
        .mockResolvedValueOnce({ papel: TipoCampanhaMembroPapelEnum.MESTRE }) // validarMestre (autor)
        .mockResolvedValueOnce({ papel: TipoCampanhaMembroPapelEnum.JOGADOR }); // membro-alvo
      repositorio.removerMembro.mockResolvedValue(undefined);

      const resultado = await service.removerMembro(
        { id: 3, usuarioId: usuarioNaoMestre.sub },
        usuarioMestre,
      );

      expect(repositorio.removerMembro).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: usuarioNaoMestre.sub,
      });
      expect(resultado).toEqual({ campanhaId: 3, usuarioId: usuarioNaoMestre.sub });
    });

    it('lança UnauthorizedAccessException quando o autor não é o mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(
        service.removerMembro({ id: 3, usuarioId: 99 }, usuarioNaoMestre),
      ).rejects.toThrow(UnauthorizedAccessException);

      expect(repositorio.removerMembro).not.toHaveBeenCalled();
    });

    it('lança BusinessException quando o mestre tenta remover a si mesmo', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });

      await expect(
        service.removerMembro({ id: 3, usuarioId: usuarioMestre.sub }, usuarioMestre),
      ).rejects.toThrow(BusinessException);

      expect(repositorio.removerMembro).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando o membro-alvo não existe', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro
        .mockResolvedValueOnce({ papel: TipoCampanhaMembroPapelEnum.MESTRE }) // validarMestre (autor)
        .mockResolvedValueOnce(null); // membro-alvo inexistente

      await expect(
        service.removerMembro({ id: 3, usuarioId: 99 }, usuarioMestre),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(repositorio.removerMembro).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a campanha não existe', async () => {
      repositorio.recuperarPorId.mockResolvedValue(null);

      await expect(
        service.removerMembro({ id: 99, usuarioId: 42 }, usuarioMestre),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(repositorio.recuperarMembro).not.toHaveBeenCalled();
    });
  });

  describe('transferirMestre', () => {
    it('troca os papéis: o alvo vira MESTRE e o mestre atual vira JOGADOR', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro
        .mockResolvedValueOnce({ papel: TipoCampanhaMembroPapelEnum.MESTRE }) // validarMestre (autor)
        .mockResolvedValueOnce({ papel: TipoCampanhaMembroPapelEnum.JOGADOR }); // alvo é jogador
      repositorio.transferirMestre.mockResolvedValue(undefined);

      const resultado = await service.transferirMestre(
        { id: 3, novoMestreUsuarioId: usuarioNaoMestre.sub },
        usuarioMestre,
      );

      expect(repositorio.transferirMestre).toHaveBeenCalledWith({
        campanhaId: 3,
        mestreAtualUsuarioId: usuarioMestre.sub,
        novoMestreUsuarioId: usuarioNaoMestre.sub,
      });
      expect(resultado).toEqual({
        campanhaId: 3,
        mestreAnteriorUsuarioId: usuarioMestre.sub,
        novoMestreUsuarioId: usuarioNaoMestre.sub,
      });
    });

    it('lança UnauthorizedAccessException quando o autor não é o mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(
        service.transferirMestre({ id: 3, novoMestreUsuarioId: 99 }, usuarioNaoMestre),
      ).rejects.toThrow(UnauthorizedAccessException);

      expect(repositorio.transferirMestre).not.toHaveBeenCalled();
    });

    it('lança BusinessException quando o alvo é o próprio mestre', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });

      await expect(
        service.transferirMestre(
          { id: 3, novoMestreUsuarioId: usuarioMestre.sub },
          usuarioMestre,
        ),
      ).rejects.toThrow(BusinessException);

      expect(repositorio.transferirMestre).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando o alvo não é membro', async () => {
      repositorio.recuperarPorId.mockResolvedValue(campanhaPersistida);
      repositorio.recuperarMembro
        .mockResolvedValueOnce({ papel: TipoCampanhaMembroPapelEnum.MESTRE }) // validarMestre (autor)
        .mockResolvedValueOnce(null); // alvo não é membro

      await expect(
        service.transferirMestre({ id: 3, novoMestreUsuarioId: 99 }, usuarioMestre),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(repositorio.transferirMestre).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a campanha não existe', async () => {
      repositorio.recuperarPorId.mockResolvedValue(null);

      await expect(
        service.transferirMestre({ id: 99, novoMestreUsuarioId: 42 }, usuarioMestre),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(repositorio.recuperarMembro).not.toHaveBeenCalled();
    });
  });
});
