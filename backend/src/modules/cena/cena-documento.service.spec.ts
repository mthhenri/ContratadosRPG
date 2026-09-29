import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type {
  CenaDocumentoAlteradoDto,
  CenaDocumentoLinhaDto,
  CenaLinhaDto,
} from '@contratados-rpg/shared/dtos/cena';
import type { DocumentoRecuperadoDto, DocumentoReveladoDto } from '@contratados-rpg/shared/dtos/documento';
import {
  CenaStatusEnum,
  CenaTipoEnum,
  TipoCampanhaMembroPapelEnum,
  TipoDocumentoEnum,
  TipoUsuarioEnum,
} from '@contratados-rpg/shared/enums';
import { BusinessException, ResourceNotFoundException, UnauthorizedAccessException } from '../../core/exceptions';
import type { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { TransacaoService } from '../../database/transacao.service';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { DocumentoService } from '../documento/documento.service';
import type { CenaDocumentoRepository } from './cena-documento.repository';
import { CenaDocumentoService } from './cena-documento.service';
import type { CenaRepository } from './cena.repository';

const mestre: JwtPayload = { sub: 1, login: 'mestre', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
const jogador: JwtPayload = { sub: 2, login: 'jogador', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };

function criarCenaLinha(overrides: Partial<CenaLinhaDto> = {}): CenaLinhaDto {
  return {
    id: 900,
    campanhaId: 5,
    nome: 'Investigação no Setor 7',
    tipo: CenaTipoEnum.INVESTIGACAO,
    status: CenaStatusEnum.ATIVA,
    ordem: 1,
    encontroId: null,
    ...overrides,
  };
}

function criarLinhaDocumento(overrides: Partial<CenaDocumentoLinhaDto> = {}): CenaDocumentoLinhaDto {
  return {
    id: 700,
    cenaId: 900,
    documentoId: 40,
    ordem: 1,
    emFoco: false,
    titulo: 'Relatório do informante',
    tipo: TipoDocumentoEnum.TEXTO,
    revelado: false,
    ...overrides,
  };
}

function criarDocumentoRecuperado(overrides: Partial<DocumentoRecuperadoDto> = {}): DocumentoRecuperadoDto {
  return {
    id: 40,
    campanhaId: 5,
    titulo: 'Relatório do informante',
    tipo: TipoDocumentoEnum.TEXTO,
    conteudoMarkdown: 'Segredos.',
    imagemUrl: null,
    revelado: false,
    ordem: 1,
    createdDate: '2026-01-01T00:00:00.000Z',
    updatedDate: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CenaDocumentoService', () => {
  let cenaDocumentoRepositorio: {
    anexar: Mock<CenaDocumentoRepository['anexar']>;
    recuperarPorId: Mock<CenaDocumentoRepository['recuperarPorId']>;
    recuperarPorCenaEDocumento: Mock<CenaDocumentoRepository['recuperarPorCenaEDocumento']>;
    listarPorCena: Mock<CenaDocumentoRepository['listarPorCena']>;
    recuperarMaiorOrdem: Mock<CenaDocumentoRepository['recuperarMaiorOrdem']>;
    alterarOrdem: Mock<CenaDocumentoRepository['alterarOrdem']>;
    definirFoco: Mock<CenaDocumentoRepository['definirFoco']>;
    remover: Mock<CenaDocumentoRepository['remover']>;
  };
  let cenaRepositorio: { recuperarPorId: Mock<CenaRepository['recuperarPorId']> };
  let campanhaRepositorio: { recuperarMembro: Mock<CampanhaRepository['recuperarMembro']> };
  let documentoService: {
    recuperarDocumento: Mock<DocumentoService['recuperarDocumento']>;
    revelarDocumento: Mock<DocumentoService['revelarDocumento']>;
  };
  let transacaoService: { executar: Mock<(operacao: () => Promise<unknown>) => Promise<unknown>> };
  let campanhaGateway: { emitirCenaDocumentoAlterado: Mock<(evento: CenaDocumentoAlteradoDto) => void> };
  let service: CenaDocumentoService;

  function membroComPapel(papel: TipoCampanhaMembroPapelEnum) {
    return { papel } as Awaited<ReturnType<CampanhaRepository['recuperarMembro']>>;
  }

  beforeEach(() => {
    cenaDocumentoRepositorio = {
      anexar: vi.fn<CenaDocumentoRepository['anexar']>((dto) =>
        Promise.resolve(criarLinhaDocumento({ cenaId: dto.cenaId, documentoId: dto.documentoId, ordem: dto.ordem })),
      ),
      recuperarPorId: vi.fn<CenaDocumentoRepository['recuperarPorId']>(),
      recuperarPorCenaEDocumento: vi
        .fn<CenaDocumentoRepository['recuperarPorCenaEDocumento']>()
        .mockResolvedValue(criarLinhaDocumento()),
      listarPorCena: vi.fn<CenaDocumentoRepository['listarPorCena']>().mockResolvedValue([criarLinhaDocumento()]),
      recuperarMaiorOrdem: vi.fn<CenaDocumentoRepository['recuperarMaiorOrdem']>().mockResolvedValue(0),
      alterarOrdem: vi.fn<CenaDocumentoRepository['alterarOrdem']>().mockResolvedValue(undefined),
      definirFoco: vi.fn<CenaDocumentoRepository['definirFoco']>().mockResolvedValue(undefined),
      remover: vi.fn<CenaDocumentoRepository['remover']>().mockResolvedValue(undefined),
    };
    cenaRepositorio = {
      recuperarPorId: vi.fn<CenaRepository['recuperarPorId']>().mockResolvedValue(criarCenaLinha()),
    };
    campanhaRepositorio = {
      recuperarMembro: vi
        .fn<CampanhaRepository['recuperarMembro']>()
        .mockResolvedValue(membroComPapel(TipoCampanhaMembroPapelEnum.MESTRE)),
    };
    documentoService = {
      recuperarDocumento: vi
        .fn<DocumentoService['recuperarDocumento']>()
        .mockResolvedValue(criarDocumentoRecuperado()),
      revelarDocumento: vi.fn<DocumentoService['revelarDocumento']>().mockResolvedValue({
        id: 40,
        revelado: true,
        updatedDate: '2026-01-01T00:00:00.000Z',
      } satisfies DocumentoReveladoDto),
    };
    transacaoService = { executar: vi.fn((operacao) => operacao()) };
    campanhaGateway = { emitirCenaDocumentoAlterado: vi.fn() };

    service = new CenaDocumentoService(
      cenaDocumentoRepositorio as unknown as CenaDocumentoRepository,
      cenaRepositorio as unknown as CenaRepository,
      campanhaRepositorio as unknown as CampanhaRepository,
      documentoService as unknown as DocumentoService,
      transacaoService as unknown as TransacaoService,
      campanhaGateway as unknown as CampanhaGateway,
    );
  });

  describe('listar', () => {
    it('mestre recebe documentos ocultos e revelados', async () => {
      await service.listar({ cenaId: 900 }, mestre);
      expect(cenaDocumentoRepositorio.listarPorCena).toHaveBeenCalledWith({
        cenaId: 900,
        apenasRevelados: false,
      });
    });

    it('jogador só recebe os revelados', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(
        membroComPapel(TipoCampanhaMembroPapelEnum.JOGADOR),
      );
      await service.listar({ cenaId: 900 }, jogador);
      expect(cenaDocumentoRepositorio.listarPorCena).toHaveBeenCalledWith({
        cenaId: 900,
        apenasRevelados: true,
      });
    });

    it('jogador não acessa a coluna de uma cena planejada (trava anti-vazamento)', async () => {
      cenaRepositorio.recuperarPorId.mockResolvedValue(criarCenaLinha({ status: CenaStatusEnum.PLANEJADA }));
      campanhaRepositorio.recuperarMembro.mockResolvedValue(
        membroComPapel(TipoCampanhaMembroPapelEnum.JOGADOR),
      );
      await expect(service.listar({ cenaId: 900 }, jogador)).rejects.toBeInstanceOf(
        UnauthorizedAccessException,
      );
    });

    it('jogador não lê os documentos de uma cena encerrada; o mestre continua lendo', async () => {
      cenaRepositorio.recuperarPorId.mockResolvedValue(criarCenaLinha({ status: CenaStatusEnum.ENCERRADA }));
      campanhaRepositorio.recuperarMembro.mockResolvedValue(
        membroComPapel(TipoCampanhaMembroPapelEnum.JOGADOR),
      );
      await expect(service.listar({ cenaId: 900 }, jogador)).rejects.toBeInstanceOf(
        UnauthorizedAccessException,
      );
      expect(cenaDocumentoRepositorio.listarPorCena).not.toHaveBeenCalled();

      campanhaRepositorio.recuperarMembro.mockResolvedValue(
        membroComPapel(TipoCampanhaMembroPapelEnum.MESTRE),
      );
      await expect(service.listar({ cenaId: 900 }, mestre)).resolves.toHaveLength(1);
    });

    it('não membro (outra campanha) é recusado', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(null);
      await expect(service.listar({ cenaId: 900 }, jogador)).rejects.toBeInstanceOf(
        UnauthorizedAccessException,
      );
    });
  });

  describe('anexar', () => {
    it('anexa um documento novo no fim da fila e emite o evento da cena', async () => {
      cenaDocumentoRepositorio.recuperarPorCenaEDocumento.mockResolvedValueOnce(null);
      cenaDocumentoRepositorio.recuperarMaiorOrdem.mockResolvedValueOnce(2);

      await service.anexar({ cenaId: 900, documentoId: 40 }, mestre);

      expect(cenaDocumentoRepositorio.anexar).toHaveBeenCalledWith({ cenaId: 900, documentoId: 40, ordem: 3 });
      expect(campanhaGateway.emitirCenaDocumentoAlterado).toHaveBeenCalledWith({
        campanhaId: 5,
        cenaId: 900,
      });
    });

    it('é idempotente — já anexado não duplica', async () => {
      await service.anexar({ cenaId: 900, documentoId: 40 }, mestre);
      expect(cenaDocumentoRepositorio.anexar).not.toHaveBeenCalled();
    });

    it('recusa um documento de outra campanha', async () => {
      documentoService.recuperarDocumento.mockResolvedValue(criarDocumentoRecuperado({ campanhaId: 999 }));
      await expect(service.anexar({ cenaId: 900, documentoId: 40 }, mestre)).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it('recusa quem não é mestre', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(
        membroComPapel(TipoCampanhaMembroPapelEnum.JOGADOR),
      );
      await expect(service.anexar({ cenaId: 900, documentoId: 40 }, jogador)).rejects.toBeInstanceOf(
        UnauthorizedAccessException,
      );
    });

    it('recusa mutação numa cena encerrada', async () => {
      cenaRepositorio.recuperarPorId.mockResolvedValue(criarCenaLinha({ status: CenaStatusEnum.ENCERRADA }));
      await expect(service.anexar({ cenaId: 900, documentoId: 40 }, mestre)).rejects.toBeInstanceOf(
        BusinessException,
      );
    });
  });

  describe('remover', () => {
    it('remove o vínculo sem tocar no documento', async () => {
      await service.remover({ cenaId: 900, documentoId: 40 }, mestre);
      expect(cenaDocumentoRepositorio.remover).toHaveBeenCalledWith({ id: 700 });
    });

    it('404 quando o vínculo não existe', async () => {
      cenaDocumentoRepositorio.recuperarPorCenaEDocumento.mockResolvedValue(null);
      await expect(service.remover({ cenaId: 900, documentoId: 40 }, mestre)).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });
  });

  describe('reordenar', () => {
    it('grava a nova ordem e devolve a lista atualizada', async () => {
      cenaDocumentoRepositorio.listarPorCena.mockResolvedValue([
        criarLinhaDocumento({ id: 700, documentoId: 40, ordem: 1 }),
        criarLinhaDocumento({ id: 701, documentoId: 41, ordem: 2 }),
      ]);
      await service.reordenar({ cenaId: 900, ordem: [41, 40] }, mestre);
      expect(cenaDocumentoRepositorio.alterarOrdem).toHaveBeenNthCalledWith(1, { id: 701, ordem: 1 });
      expect(cenaDocumentoRepositorio.alterarOrdem).toHaveBeenNthCalledWith(2, { id: 700, ordem: 2 });
    });

    it('recusa uma ordem que não lista exatamente os documentos da cena', async () => {
      cenaDocumentoRepositorio.listarPorCena.mockResolvedValue([
        criarLinhaDocumento({ id: 700, documentoId: 40 }),
        criarLinhaDocumento({ id: 701, documentoId: 41 }),
      ]);
      await expect(service.reordenar({ cenaId: 900, ordem: [40] }, mestre)).rejects.toBeInstanceOf(
        BusinessException,
      );
    });
  });

  describe('focar', () => {
    it('define o foco e não emite (não muda o que a mesa vê)', async () => {
      await service.focar({ cenaId: 900, documentoId: 40 }, mestre);
      expect(cenaDocumentoRepositorio.definirFoco).toHaveBeenCalledWith({ cenaId: 900, id: 700 });
      expect(campanhaGateway.emitirCenaDocumentoAlterado).not.toHaveBeenCalled();
    });
  });

  describe('apresentar', () => {
    it('revela o documento (M9) e o marca em foco, emitindo o evento da cena', async () => {
      await service.apresentar({ cenaId: 900, documentoId: 40 }, mestre);
      expect(documentoService.revelarDocumento).toHaveBeenCalledWith({ id: 40 }, mestre);
      expect(cenaDocumentoRepositorio.definirFoco).toHaveBeenCalledWith({ cenaId: 900, id: 700 });
      expect(campanhaGateway.emitirCenaDocumentoAlterado).toHaveBeenCalledWith({
        campanhaId: 5,
        cenaId: 900,
      });
    });
  });
});
