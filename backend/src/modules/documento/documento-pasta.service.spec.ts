import type {
  DocumentoPastaInternoCriarDto,
  DocumentoPastaInternoRecuperadaDto,
  DocumentoRecuperadoDto,
} from '@contratados-rpg/shared/dtos/documento';
import {
  TipoCampanhaMembroPapelEnum,
  TipoDocumentoEnum,
  TipoDocumentoOrganizacaoEnum,
} from '@contratados-rpg/shared/enums';
import { DOCUMENTO_PASTA_PROFUNDIDADE_MAXIMA } from '@contratados-rpg/shared/validators';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  BusinessException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import type { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { TransacaoService } from '../../database/transacao.service';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { DocumentoPastaRepository } from './documento-pasta.repository';
import { DocumentoPastaService } from './documento-pasta.service';
import type { DocumentoRepository } from './documento.repository';

const MESTRE = 1;
const JOGADOR = 2;
const ESPECTADOR = 3;
const FORA = 9;
const PAPEL_POR_USUARIO: Record<number, TipoCampanhaMembroPapelEnum> = {
  [MESTRE]: TipoCampanhaMembroPapelEnum.MESTRE,
  [JOGADOR]: TipoCampanhaMembroPapelEnum.JOGADOR,
  [ESPECTADOR]: TipoCampanhaMembroPapelEnum.ESPECTADOR,
};

const usuario = (sub: number): JwtPayload => ({ sub }) as JwtPayload;

const pasta = (
  sobrescrita: Partial<DocumentoPastaInternoRecuperadaDto> = {},
): DocumentoPastaInternoRecuperadaDto => ({
  id: 10,
  campanhaId: 5,
  organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
  nome: 'Pistas',
  pastaMaeId: null,
  ordem: 1,
  ...sobrescrita,
});

const documento = (sobrescrita: Partial<DocumentoRecuperadoDto> = {}): DocumentoRecuperadoDto => ({
    id: 70,
    campanhaId: 5,
    titulo: 'Carta',
    tipo: TipoDocumentoEnum.TEXTO,
    conteudoMarkdown: 'x',
    imagemUrl: null,
    revelado: true,
    ordem: 1,
    createdDate: '2026-10-16T12:00:00.000000Z',
    updatedDate: '2026-10-16T12:00:00.000000Z',
    ...sobrescrita,
  });

describe('DocumentoPastaService', () => {
  let pastaRepositorio: { [K in keyof DocumentoPastaRepository]: Mock<DocumentoPastaRepository[K]> };
  let documentoRepositorio: { recuperarPorId: Mock<DocumentoRepository['recuperarPorId']> };
  let campanhaRepositorio: { recuperarMembro: Mock<CampanhaRepository['recuperarMembro']> };
  let campanhaGateway: {
    emitirDocumentoOrganizacaoAlterada: Mock<CampanhaGateway['emitirDocumentoOrganizacaoAlterada']>;
  };
  let service: DocumentoPastaService;

  beforeEach(() => {
    const repositorioDublado = {
      listarPastas: vi.fn().mockResolvedValue([]),
      listarVinculos: vi.fn().mockResolvedValue([]),
      recuperarPasta: vi.fn().mockResolvedValue(pasta()),
      criarPasta: vi.fn((dto: DocumentoPastaInternoCriarDto) =>
        Promise.resolve(
          pasta({ id: 11, nome: dto.nome, pastaMaeId: dto.pastaMaeId, organizacao: dto.organizacao }),
        ),
      ),
      alterarPasta: vi.fn().mockResolvedValue(undefined),
      alterarPosicaoPasta: vi.fn().mockResolvedValue(undefined),
      listarIdsIrmas: vi.fn().mockResolvedValue([20, 21, 22]),
      listarIdsSubarvore: vi.fn().mockResolvedValue([10]),
      recuperarNivel: vi.fn().mockResolvedValue(1),
      recuperarAlturaSubarvore: vi.fn().mockResolvedValue(1),
      removerSubarvore: vi.fn().mockResolvedValue(undefined),
      listarIdsDocumentosPasta: vi.fn().mockResolvedValue([80, 81]),
      gravarVinculo: vi.fn().mockResolvedValue(undefined),
      removerVinculo: vi.fn().mockResolvedValue(undefined),
      removerVinculosDocumento: vi.fn().mockResolvedValue(undefined),
      removerVinculoJogadores: vi.fn().mockResolvedValue(1),
    };
    pastaRepositorio = repositorioDublado as unknown as typeof pastaRepositorio;
    documentoRepositorio = { recuperarPorId: vi.fn().mockResolvedValue(documento()) };
    campanhaRepositorio = {
      recuperarMembro: vi.fn(({ usuarioId }: { usuarioId: number }) =>
        Promise.resolve(
          PAPEL_POR_USUARIO[usuarioId] ? { papel: PAPEL_POR_USUARIO[usuarioId] } : null,
        ),
      ),
    };
    campanhaGateway = { emitirDocumentoOrganizacaoAlterada: vi.fn() };
    const transacaoService = { executar: vi.fn((operacao: () => Promise<unknown>) => operacao()) };
    service = new DocumentoPastaService(
      pastaRepositorio as unknown as DocumentoPastaRepository,
      documentoRepositorio as unknown as DocumentoRepository,
      campanhaRepositorio as unknown as CampanhaRepository,
      transacaoService as unknown as TransacaoService,
      campanhaGateway as unknown as CampanhaGateway,
    );
  });

  describe('organização por cargo', () => {
    it('o mestre lê só a sua organização, o jogador e o espectador, a dos jogadores', async () => {
      const doMestre = await service.recuperarOrganizacao({ campanhaId: 5 }, usuario(MESTRE));
      const doJogador = await service.recuperarOrganizacao({ campanhaId: 5 }, usuario(JOGADOR));
      const doEspectador = await service.recuperarOrganizacao({ campanhaId: 5 }, usuario(ESPECTADOR));

      expect(doMestre).toMatchObject({ organizacao: TipoDocumentoOrganizacaoEnum.MESTRE, editavel: true });
      expect(doJogador).toMatchObject({ organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR, editavel: true });
      expect(doEspectador).toMatchObject({ organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR, editavel: false });
      expect(pastaRepositorio.listarPastas).toHaveBeenNthCalledWith(1, {
        campanhaId: 5,
        organizacao: TipoDocumentoOrganizacaoEnum.MESTRE,
      });
      expect(pastaRepositorio.listarPastas).toHaveBeenNthCalledWith(2, {
        campanhaId: 5,
        organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
      });
    });

    it('o recorte de revelados vale só na organização dos jogadores e vai ao SQL', async () => {
      await service.recuperarOrganizacao({ campanhaId: 5 }, usuario(MESTRE));
      await service.recuperarOrganizacao({ campanhaId: 5 }, usuario(ESPECTADOR));

      expect(pastaRepositorio.listarVinculos).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ apenasRevelados: false }),
      );
      expect(pastaRepositorio.listarVinculos).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ apenasRevelados: true }),
      );
    });

    it('quem não é membro não lê nem escreve', async () => {
      await expect(service.recuperarOrganizacao({ campanhaId: 5 }, usuario(FORA))).rejects.toBeInstanceOf(
        UnauthorizedAccessException,
      );
      await expect(
        service.criarPasta({ campanhaId: 5, nome: 'X', pastaMaeId: null }, usuario(FORA)),
      ).rejects.toBeInstanceOf(UnauthorizedAccessException);
    });

    it('o espectador só lê: toda escrita é recusada (403)', async () => {
      const escritas = [
        () => service.criarPasta({ campanhaId: 5, nome: 'X', pastaMaeId: null }, usuario(ESPECTADOR)),
        () => service.alterarPasta({ id: 10, nome: 'Y' }, usuario(ESPECTADOR)),
        () => service.moverPasta({ id: 10, pastaMaeId: null }, usuario(ESPECTADOR)),
        () => service.removerPasta({ id: 10 }, usuario(ESPECTADOR)),
        () => service.alterarVinculo({ id: 70, pastaId: 10 }, usuario(ESPECTADOR)),
      ];
      for (const escrita of escritas) {
        await expect(escrita()).rejects.toBeInstanceOf(UnauthorizedAccessException);
      }
      expect(campanhaGateway.emitirDocumentoOrganizacaoAlterada).not.toHaveBeenCalled();
    });

    it('o mestre não enxerga a pasta dos jogadores, nem o jogador a do mestre (404)', async () => {
      pastaRepositorio.recuperarPasta.mockResolvedValue(
        pasta({ organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR }),
      );
      await expect(service.alterarPasta({ id: 10, nome: 'Y' }, usuario(MESTRE))).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
      await expect(service.removerPasta({ id: 10 }, usuario(MESTRE))).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );

      pastaRepositorio.recuperarPasta.mockResolvedValue(
        pasta({ organizacao: TipoDocumentoOrganizacaoEnum.MESTRE }),
      );
      await expect(service.alterarPasta({ id: 10, nome: 'Y' }, usuario(JOGADOR))).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
      await expect(
        service.alterarVinculo({ id: 70, pastaId: 10 }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
      expect(pastaRepositorio.alterarPasta).not.toHaveBeenCalled();
    });

    it('pasta de outra campanha responde 404', async () => {
      pastaRepositorio.recuperarPasta.mockResolvedValue(pasta({ campanhaId: 6 }));
      await expect(
        service.criarPasta({ campanhaId: 5, nome: 'X', pastaMaeId: 10 }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
    });
  });

  describe('criar, renomear e excluir', () => {
    it('cria na organização do cargo e avisa só essa organização', async () => {
      const criada = await service.criarPasta(
        { campanhaId: 5, nome: '  Mapas  ', pastaMaeId: null },
        usuario(JOGADOR),
      );

      expect(pastaRepositorio.criarPasta).toHaveBeenCalledWith({
        campanhaId: 5,
        organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
        nome: 'Mapas',
        pastaMaeId: null,
      });
      expect(criada).toMatchObject({ id: 11, nome: 'Mapas', campanhaId: 5 });
      expect(campanhaGateway.emitirDocumentoOrganizacaoAlterada).toHaveBeenCalledWith({
        campanhaId: 5,
        organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
      });
    });

    it('o mestre cria na organização MESTRE e o evento carrega essa organização', async () => {
      await service.criarPasta({ campanhaId: 5, nome: 'Segredos', pastaMaeId: null }, usuario(MESTRE));

      expect(campanhaGateway.emitirDocumentoOrganizacaoAlterada).toHaveBeenCalledWith({
        campanhaId: 5,
        organizacao: TipoDocumentoOrganizacaoEnum.MESTRE,
      });
    });

    it('recusa nome vazio ou acima do limite', async () => {
      await expect(
        service.criarPasta({ campanhaId: 5, nome: '   ', pastaMaeId: null }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(BusinessException);
      await expect(
        service.criarPasta({ campanhaId: 5, nome: 'a'.repeat(61), pastaMaeId: null }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(BusinessException);
      expect(pastaRepositorio.criarPasta).not.toHaveBeenCalled();
    });

    it('recusa criar abaixo do teto de profundidade', async () => {
      pastaRepositorio.recuperarNivel.mockResolvedValue(DOCUMENTO_PASTA_PROFUNDIDADE_MAXIMA);
      await expect(
        service.criarPasta({ campanhaId: 5, nome: 'X', pastaMaeId: 10 }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(BusinessException);

      pastaRepositorio.recuperarNivel.mockResolvedValue(DOCUMENTO_PASTA_PROFUNDIDADE_MAXIMA - 1);
      await expect(
        service.criarPasta({ campanhaId: 5, nome: 'X', pastaMaeId: 10 }, usuario(JOGADOR)),
      ).resolves.toBeDefined();
    });

    it('renomeia', async () => {
      const alterada = await service.alterarPasta({ id: 10, nome: 'Novo nome' }, usuario(JOGADOR));

      expect(pastaRepositorio.alterarPasta).toHaveBeenCalledWith({ id: 10, nome: 'Novo nome' });
      expect(alterada.nome).toBe('Novo nome');
    });

    it('qualquer jogador exclui a pasta, sem bloqueio, e a subárvore sai de uma vez', async () => {
      await service.removerPasta({ id: 10 }, usuario(JOGADOR));

      expect(pastaRepositorio.removerSubarvore).toHaveBeenCalledWith({ id: 10 });
      expect(campanhaGateway.emitirDocumentoOrganizacaoAlterada).toHaveBeenCalledTimes(1);
    });
  });

  describe('mover pasta', () => {
    it('reposiciona entre as irmãs e renumera a partir de 1', async () => {
      await service.moverPasta({ id: 10, pastaMaeId: null, posicao: 1 }, usuario(JOGADOR));

      const ordens = pastaRepositorio.alterarPosicaoPasta.mock.calls.map(
        ([dto]) => [dto.id, dto.ordem],
      );
      expect(ordens).toEqual([
        [20, 1],
        [10, 2],
        [21, 3],
        [22, 4],
      ]);
    });

    it('sem posição vai para o fim; posição além do fim é grampeada', async () => {
      await service.moverPasta({ id: 10, pastaMaeId: null }, usuario(JOGADOR));
      await service.moverPasta({ id: 10, pastaMaeId: null, posicao: 99 }, usuario(JOGADOR));

      for (const chamadas of [
        pastaRepositorio.alterarPosicaoPasta.mock.calls.slice(0, 4),
        pastaRepositorio.alterarPosicaoPasta.mock.calls.slice(4),
      ]) {
        expect(chamadas.at(-1)?.[0]).toMatchObject({ id: 10, ordem: 4 });
      }
    });

    it('recusa mover para dentro de si mesma ou de uma descendente', async () => {
      pastaRepositorio.listarIdsSubarvore.mockResolvedValue([10, 12]);
      pastaRepositorio.recuperarPasta.mockImplementation((id: number) =>
        Promise.resolve(pasta({ id })),
      );

      await expect(
        service.moverPasta({ id: 10, pastaMaeId: 10 }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(BusinessException);
      await expect(
        service.moverPasta({ id: 10, pastaMaeId: 12 }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(BusinessException);
      expect(pastaRepositorio.alterarPosicaoPasta).not.toHaveBeenCalled();
    });

    it('respeita o teto: nível do destino + altura da subárvore', async () => {
      pastaRepositorio.recuperarPasta.mockImplementation((id: number) =>
        Promise.resolve(pasta({ id })),
      );
      pastaRepositorio.listarIdsSubarvore.mockResolvedValue([10]);
      pastaRepositorio.recuperarNivel.mockResolvedValue(4);
      pastaRepositorio.recuperarAlturaSubarvore.mockResolvedValue(2);

      await expect(
        service.moverPasta({ id: 10, pastaMaeId: 30 }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(BusinessException);

      pastaRepositorio.recuperarAlturaSubarvore.mockResolvedValue(1);
      await expect(
        service.moverPasta({ id: 10, pastaMaeId: 30 }, usuario(JOGADOR)),
      ).resolves.toBeDefined();
    });

    it('recusa posição inválida', async () => {
      await expect(
        service.moverPasta({ id: 10, pastaMaeId: null, posicao: -1 }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(BusinessException);
    });
  });

  describe('vincular documento', () => {
    it('coloca o documento na pasta, na posição pedida, renumerando a pasta', async () => {
      const resultado = await service.alterarVinculo(
        { id: 70, pastaId: 10, posicao: 1 },
        usuario(JOGADOR),
      );

      const gravados = pastaRepositorio.gravarVinculo.mock.calls.map(
        ([dto]) => [dto.documentoId, dto.ordem, dto.organizacao],
      );
      expect(gravados).toEqual([
        [80, 1, TipoDocumentoOrganizacaoEnum.JOGADOR],
        [70, 2, TipoDocumentoOrganizacaoEnum.JOGADOR],
        [81, 3, TipoDocumentoOrganizacaoEnum.JOGADOR],
      ]);
      expect(resultado).toEqual({ documentoId: 70, pastaId: 10, ordem: 2 });
    });

    it('pastaId nulo devolve o documento à raiz', async () => {
      const resultado = await service.alterarVinculo({ id: 70, pastaId: null }, usuario(JOGADOR));

      expect(pastaRepositorio.removerVinculo).toHaveBeenCalledWith({
        documentoId: 70,
        organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
      });
      expect(resultado).toEqual({ documentoId: 70, pastaId: null, ordem: null });
    });

    it('documento oculto não entra na organização dos jogadores (404), mas o mestre o organiza', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(documento({ revelado: false }));
      await expect(
        service.alterarVinculo({ id: 70, pastaId: 10 }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);

      pastaRepositorio.recuperarPasta.mockResolvedValue(
        pasta({ organizacao: TipoDocumentoOrganizacaoEnum.MESTRE }),
      );
      await expect(
        service.alterarVinculo({ id: 70, pastaId: 10 }, usuario(MESTRE)),
      ).resolves.toMatchObject({ pastaId: 10 });
    });

    it('documento inexistente responde 404', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(null);
      await expect(
        service.alterarVinculo({ id: 70, pastaId: 10 }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
    });
  });

  describe('ganchos da DocumentoService', () => {
    it('ocultar limpa só o vínculo dos jogadores e avisa só se algo mudou', async () => {
      await service.limparVinculoJogadores({ campanhaId: 5, documentoId: 70 });
      expect(campanhaGateway.emitirDocumentoOrganizacaoAlterada).toHaveBeenCalledWith({
        campanhaId: 5,
        organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
      });

      campanhaGateway.emitirDocumentoOrganizacaoAlterada.mockClear();
      pastaRepositorio.removerVinculoJogadores.mockResolvedValue(0);
      await service.limparVinculoJogadores({ campanhaId: 5, documentoId: 70 });
      expect(campanhaGateway.emitirDocumentoOrganizacaoAlterada).not.toHaveBeenCalled();
    });

    it('excluir o documento limpa os vínculos das duas organizações e avisa as duas', async () => {
      await service.limparVinculosDocumento({ campanhaId: 5, documentoId: 70 });

      expect(pastaRepositorio.removerVinculosDocumento).toHaveBeenCalledWith({ documentoId: 70 });
      const organizacoes = campanhaGateway.emitirDocumentoOrganizacaoAlterada.mock.calls.map(
        ([evento]) => evento.organizacao,
      );
      expect(organizacoes.sort()).toEqual(['JOGADOR', 'MESTRE']);
    });
  });
});
