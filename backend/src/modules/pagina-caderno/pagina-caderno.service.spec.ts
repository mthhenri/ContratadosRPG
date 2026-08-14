import type { PaginaCadernoInternoRecuperadaDto } from '@contratados-rpg/shared/dtos/pagina-caderno';
import { TipoCampanhaMembroPapelEnum, TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BusinessException,
  ResourceConflictException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { PaginaCadernoRepository } from './pagina-caderno.repository';
import { PaginaCadernoService } from './pagina-caderno.service';

interface PaginaRepositorioDublado {
  criarPagina: ReturnType<typeof vi.fn>;
  listarPaginas: ReturnType<typeof vi.fn>;
  recuperarPagina: ReturnType<typeof vi.fn>;
  alterarPagina: ReturnType<typeof vi.fn>;
  excluirPagina: ReturnType<typeof vi.fn>;
}

interface CampanhaRepositorioDublado {
  recuperarMembro: ReturnType<typeof vi.fn>;
}

const usuarioAutor: JwtPayload = {
  sub: 7,
  login: 'agente.autor',
  tipo: TipoUsuarioEnum.NORMAL,
  tokenVersao: 1,
};
const usuarioMestre: JwtPayload = {
  sub: 11,
  login: 'mestre',
  tipo: TipoUsuarioEnum.NORMAL,
  tokenVersao: 1,
};
const outroJogador: JwtPayload = {
  sub: 22,
  login: 'outro.jogador',
  tipo: TipoUsuarioEnum.NORMAL,
  tokenVersao: 1,
};
const paginaPersistida: PaginaCadernoInternoRecuperadaDto = {
  id: 9,
  campanhaId: 3,
  usuarioAutorId: 7,
  autorNome: 'Agente Autor',
  titulo: 'Relatório',
  conteudoMarkdown: 'Texto',
  createdDate: '2026-08-14T12:00:00.000Z',
  updatedDate: '2026-08-14T12:00:00.000Z',
};

describe('PaginaCadernoService', () => {
  let paginaRepositorio: PaginaRepositorioDublado;
  let campanhaRepositorio: CampanhaRepositorioDublado;
  let service: PaginaCadernoService;

  beforeEach(() => {
    paginaRepositorio = {
      criarPagina: vi.fn(),
      listarPaginas: vi.fn(),
      recuperarPagina: vi.fn(),
      alterarPagina: vi.fn(),
      excluirPagina: vi.fn(),
    };
    campanhaRepositorio = { recuperarMembro: vi.fn() };
    service = new PaginaCadernoService(
      paginaRepositorio as unknown as PaginaCadernoRepository,
      campanhaRepositorio as unknown as CampanhaRepository,
    );
  });

  it('cria página para o próprio membro e a devolve editável', async () => {
    campanhaRepositorio.recuperarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    });
    paginaRepositorio.criarPagina.mockResolvedValue(paginaPersistida);

    const resultado = await service.criarPagina(
      { campanhaId: 3, titulo: '  Relatório  ', conteudoMarkdown: 'Texto' },
      usuarioAutor,
    );

    expect(resultado).toEqual({ ...paginaPersistida, somenteLeitura: false });
    expect(paginaRepositorio.criarPagina).toHaveBeenCalledWith({
      campanhaId: 3,
      usuarioAutorId: 7,
      titulo: 'Relatório',
      conteudoMarkdown: 'Texto',
    });
  });

  it.each([
    ['', 'Título da página é obrigatório'],
    [' '.repeat(2), 'Título da página é obrigatório'],
    ['x'.repeat(121), 'Título da página deve ter no máximo 120 caracteres'],
  ])('recusa título inválido sem escrever: %j', async (titulo, mensagem) => {
    try {
      await service.criarPagina({ campanhaId: 3, titulo, conteudoMarkdown: '' }, usuarioAutor);
      expect.fail('A criação deveria ter sido recusada');
    } catch (erro) {
      expect(erro).toBeInstanceOf(BusinessException);
      expect((erro as BusinessException).getResponse()).toMatchObject({ mensagem });
    }
    expect(paginaRepositorio.criarPagina).not.toHaveBeenCalled();
  });

  it('recusa Markdown acima do limite sem escrever', async () => {
    await expect(
      service.criarPagina(
        { campanhaId: 3, titulo: 'Página', conteudoMarkdown: 'x'.repeat(100_001) },
        usuarioAutor,
      ),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(paginaRepositorio.criarPagina).not.toHaveBeenCalled();
  });

  it('mestre lista o caderno de um jogador ativo', async () => {
    campanhaRepositorio.recuperarMembro
      .mockResolvedValueOnce({ papel: TipoCampanhaMembroPapelEnum.MESTRE })
      .mockResolvedValueOnce({ papel: TipoCampanhaMembroPapelEnum.JOGADOR });
    paginaRepositorio.listarPaginas.mockResolvedValue([{ ...paginaPersistida }]);

    const resultado = await service.listarPaginasMembro(
      { campanhaId: 3, usuarioId: 7 },
      usuarioMestre,
    );

    expect(resultado).toHaveLength(1);
    expect(paginaRepositorio.listarPaginas).toHaveBeenCalledWith({
      campanhaId: 3,
      usuarioAutorId: 7,
    });
  });

  it('jogador não lista caderno alheio', async () => {
    campanhaRepositorio.recuperarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    });

    await expect(
      service.listarPaginasMembro({ campanhaId: 3, usuarioId: 7 }, outroJogador),
    ).rejects.toBeInstanceOf(UnauthorizedAccessException);
    expect(paginaRepositorio.listarPaginas).not.toHaveBeenCalled();
  });

  it('autor abre a própria página em modo editável', async () => {
    paginaRepositorio.recuperarPagina.mockResolvedValue(paginaPersistida);
    campanhaRepositorio.recuperarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    });

    const resultado = await service.recuperarPagina({ id: 9 }, usuarioAutor);

    expect(resultado.somenteLeitura).toBe(false);
  });

  it('mestre abre página de jogador somente para leitura', async () => {
    paginaRepositorio.recuperarPagina.mockResolvedValue(paginaPersistida);
    campanhaRepositorio.recuperarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
    });

    const resultado = await service.recuperarPagina({ id: 9 }, usuarioMestre);

    expect(resultado.somenteLeitura).toBe(true);
    expect(resultado.conteudoMarkdown).toBe('Texto');
  });

  it('outro jogador não abre página alheia', async () => {
    paginaRepositorio.recuperarPagina.mockResolvedValue(paginaPersistida);
    campanhaRepositorio.recuperarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    });

    await expect(service.recuperarPagina({ id: 9 }, outroJogador)).rejects.toBeInstanceOf(
      UnauthorizedAccessException,
    );
  });

  it('mestre não altera página de jogador', async () => {
    paginaRepositorio.recuperarPagina.mockResolvedValue(paginaPersistida);
    campanhaRepositorio.recuperarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
    });

    await expect(
      service.alterarPagina(
        { id: 9, titulo: 'Mudança', conteudoMarkdown: '', updatedDate: paginaPersistida.updatedDate },
        usuarioMestre,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessException);
    expect(paginaRepositorio.alterarPagina).not.toHaveBeenCalled();
  });

  it('autor recebe conflito sem perder silenciosamente a versão persistida', async () => {
    paginaRepositorio.recuperarPagina.mockResolvedValue(paginaPersistida);
    campanhaRepositorio.recuperarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    });
    paginaRepositorio.alterarPagina.mockResolvedValue(null);

    await expect(
      service.alterarPagina(
        { id: 9, titulo: 'Mudança', conteudoMarkdown: '', updatedDate: paginaPersistida.updatedDate },
        usuarioAutor,
      ),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });

  it('mestre não exclui página de jogador', async () => {
    paginaRepositorio.recuperarPagina.mockResolvedValue(paginaPersistida);
    campanhaRepositorio.recuperarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
    });

    await expect(service.excluirPagina({ id: 9 }, usuarioMestre)).rejects.toBeInstanceOf(
      UnauthorizedAccessException,
    );
    expect(paginaRepositorio.excluirPagina).not.toHaveBeenCalled();
  });

  it('autor exclui logicamente a própria página', async () => {
    paginaRepositorio.recuperarPagina.mockResolvedValue(paginaPersistida);
    campanhaRepositorio.recuperarMembro.mockResolvedValue({
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    });

    await service.excluirPagina({ id: 9 }, usuarioAutor);

    expect(paginaRepositorio.excluirPagina).toHaveBeenCalledWith({ id: 9 });
  });

  it('página inexistente ou de ex-membro permanece indisponível', async () => {
    paginaRepositorio.recuperarPagina.mockResolvedValue(null);

    await expect(service.recuperarPagina({ id: 99 }, usuarioMestre)).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
    expect(campanhaRepositorio.recuperarMembro).not.toHaveBeenCalled();
  });
});
