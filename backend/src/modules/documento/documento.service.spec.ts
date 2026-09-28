import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoLeitoresDto,
  DocumentoRecuperadoDto,
} from '@contratados-rpg/shared/dtos/documento';
import {
  DocumentoAlteracaoEnum,
  TipoCampanhaMembroPapelEnum,
  TipoDocumentoEnum,
  TipoUsuarioEnum,
} from '@contratados-rpg/shared/enums';
import { PaginatedResult } from '@contratados-rpg/shared/interfaces';
import {
  BUSCA_CAMPANHA_LIMITE_MAXIMO,
  BUSCA_CAMPANHA_TERMO_MAXIMO,
  DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES,
} from '@contratados-rpg/shared/validators';
import { ArmazenamentoPastaEnum } from '../../core/armazenamento';
import {
  BusinessException,
  ResourceConflictException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import type { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { TransacaoService } from '../../database/transacao.service';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import { CampanhaService } from '../campanha/campanha.service';
import { DocumentoLeituraService } from './documento-leitura.service';
import type { DocumentoRepository } from './documento.repository';
import { DocumentoService } from './documento.service';

const MESTRE = 1;
const JOGADOR = 2;
const ESPECTADOR = 3;
const FORASTEIRO = 4;

function usuario(sub: number): JwtPayload {
  return { sub, login: `usuario-${sub}`, tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
}

const PAPEL_POR_USUARIO: Readonly<Record<number, TipoCampanhaMembroPapelEnum>> = {
  [MESTRE]: TipoCampanhaMembroPapelEnum.MESTRE,
  [JOGADOR]: TipoCampanhaMembroPapelEnum.JOGADOR,
  [ESPECTADOR]: TipoCampanhaMembroPapelEnum.ESPECTADOR,
};

function criarDocumento(overrides: Partial<DocumentoRecuperadoDto> = {}): DocumentoRecuperadoDto {
  return {
    id: 70,
    campanhaId: 5,
    titulo: 'Carta cifrada',
    tipo: TipoDocumentoEnum.TEXTO,
    conteudoMarkdown: 'O porão guarda o arquivo.',
    imagemUrl: null,
    revelado: false,
    ordem: 1,
    createdDate: '2026-09-26T12:00:00.000000Z',
    updatedDate: '2026-09-26T12:00:00.000000Z',
    ...overrides,
  };
}

interface DocumentoRepositorioDublado {
  criarDocumento: Mock<DocumentoRepository['criarDocumento']>;
  recuperarPorId: Mock<DocumentoRepository['recuperarPorId']>;
  listarPorCampanha: Mock<DocumentoRepository['listarPorCampanha']>;
  buscarDocumentos: Mock<DocumentoRepository['buscarDocumentos']>;
  listarIdsPorCampanha: Mock<DocumentoRepository['listarIdsPorCampanha']>;
  alterarDocumento: Mock<DocumentoRepository['alterarDocumento']>;
  alterarRevelado: Mock<DocumentoRepository['alterarRevelado']>;
  alterarImagem: Mock<DocumentoRepository['alterarImagem']>;
  alterarOrdem: Mock<DocumentoRepository['alterarOrdem']>;
  removerDocumento: Mock<DocumentoRepository['removerDocumento']>;
}

describe('DocumentoService', () => {
  let documentoRepositorio: DocumentoRepositorioDublado;
  let campanhaRepositorio: { recuperarMembro: Mock<CampanhaRepository['recuperarMembro']> };
  let transacaoService: { executar: Mock<(operacao: () => Promise<unknown>) => Promise<unknown>> };
  let armazenamentoProvedor: { salvarImagem: Mock; excluirImagem: Mock };
  let campanhaGateway: {
    emitirDocumentoAlterado: Mock<(evento: DocumentoBibliotecaAlteradaDto, visivelParaMesa: boolean) => void>;
    emitirDocumentoLeitores: Mock<(retrato: DocumentoLeitoresDto) => void>;
    emitirDocumentoLeitoresParaConexao: Mock<(conexaoId: string, retrato: DocumentoLeitoresDto) => void>;
  };
  let campanhaService: CampanhaService;
  let validarAcessoSalaCampanha: Mock<CampanhaService['validarAcessoSalaCampanha']>;
  let documentoLeituraService: DocumentoLeituraService;
  let dentroDaTransacao: boolean;
  let ordemGravadaNaTransacao: boolean[];
  let service: DocumentoService;

  /** Emissões `[evento, visivelParaMesa]`, na ordem. */
  function emissoes(): [DocumentoBibliotecaAlteradaDto, boolean][] {
    return campanhaGateway.emitirDocumentoAlterado.mock.calls;
  }

  /** Nenhuma escrita chegou ao repositório. */
  function expectSemEscrita(): void {
    expect(documentoRepositorio.criarDocumento).not.toHaveBeenCalled();
    expect(documentoRepositorio.alterarDocumento).not.toHaveBeenCalled();
    expect(documentoRepositorio.alterarRevelado).not.toHaveBeenCalled();
    expect(documentoRepositorio.alterarImagem).not.toHaveBeenCalled();
    expect(documentoRepositorio.alterarOrdem).not.toHaveBeenCalled();
    expect(documentoRepositorio.removerDocumento).not.toHaveBeenCalled();
    expect(armazenamentoProvedor.salvarImagem).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    dentroDaTransacao = false;
    ordemGravadaNaTransacao = [];
    documentoRepositorio = {
      criarDocumento: vi.fn<DocumentoRepository['criarDocumento']>((dto) =>
        Promise.resolve(criarDocumento({ ...dto, id: 71, revelado: false })),
      ),
      recuperarPorId: vi.fn<DocumentoRepository['recuperarPorId']>().mockResolvedValue(criarDocumento()),
      listarPorCampanha: vi.fn<DocumentoRepository['listarPorCampanha']>().mockResolvedValue([]),
      buscarDocumentos: vi.fn<DocumentoRepository['buscarDocumentos']>((dto) =>
        Promise.resolve(
          new PaginatedResult({ itens: [], totalItens: 0, paginaAtual: dto.pagina, totalPaginas: 0 }),
        ),
      ),
      listarIdsPorCampanha: vi.fn<DocumentoRepository['listarIdsPorCampanha']>().mockResolvedValue([70, 71, 72]),
      alterarDocumento: vi.fn<DocumentoRepository['alterarDocumento']>((dto) =>
        Promise.resolve(criarDocumento({ ...dto, updatedDate: '2026-09-26T12:05:00.000000Z' })),
      ),
      alterarRevelado: vi.fn<DocumentoRepository['alterarRevelado']>((dto) =>
        Promise.resolve(criarDocumento({ ...dto, updatedDate: '2026-09-26T12:06:00.000000Z' })),
      ),
      alterarImagem: vi.fn<DocumentoRepository['alterarImagem']>((dto) =>
        Promise.resolve(criarDocumento({ ...dto, tipo: TipoDocumentoEnum.IMAGEM, conteudoMarkdown: null })),
      ),
      alterarOrdem: vi.fn<DocumentoRepository['alterarOrdem']>(() => {
        ordemGravadaNaTransacao.push(dentroDaTransacao);
        return Promise.resolve();
      }),
      removerDocumento: vi.fn<DocumentoRepository['removerDocumento']>().mockResolvedValue(undefined),
    };
    campanhaRepositorio = {
      recuperarMembro: vi.fn<CampanhaRepository['recuperarMembro']>((dto) =>
        Promise.resolve(
          PAPEL_POR_USUARIO[dto.usuarioId] ? { papel: PAPEL_POR_USUARIO[dto.usuarioId] } : null,
        ),
      ),
    };
    transacaoService = {
      executar: vi.fn(async (operacao: () => Promise<unknown>) => {
        dentroDaTransacao = true;
        try {
          return await operacao();
        } finally {
          dentroDaTransacao = false;
        }
      }),
    };
    armazenamentoProvedor = {
      salvarImagem: vi.fn().mockResolvedValue({ caminho: '/uploads/documentos/nova.png' }),
      excluirImagem: vi.fn().mockResolvedValue(undefined),
    };
    campanhaGateway = {
      emitirDocumentoAlterado: vi.fn(),
      emitirDocumentoLeitores: vi.fn(),
      emitirDocumentoLeitoresParaConexao: vi.fn(),
    };
    // Os predicados de papel são os reais (proibição #28: nenhum módulo compara papel na mão).
    campanhaService = Object.create(CampanhaService.prototype) as CampanhaService;
    // A entrada na sala (`validarAcessoSalaCampanha`) é dublada pelo mesmo mapa de papéis.
    validarAcessoSalaCampanha = vi.spyOn(campanhaService, 'validarAcessoSalaCampanha').mockImplementation((_dto, usuarioAtivo) => {
      const papel = PAPEL_POR_USUARIO[usuarioAtivo.sub];
      return papel
        ? Promise.resolve({ papel } as never)
        : Promise.reject(new UnauthorizedAccessException());
    });
    // Presença real (em memória), com o gateway dublado — o retrato é observado pelas emissões.
    documentoLeituraService = new DocumentoLeituraService(campanhaGateway as unknown as CampanhaGateway);
    service = new DocumentoService(
      documentoRepositorio as unknown as DocumentoRepository,
      campanhaRepositorio as unknown as CampanhaRepository,
      campanhaService,
      transacaoService as unknown as TransacaoService,
      documentoLeituraService,
      armazenamentoProvedor,
      campanhaGateway as unknown as CampanhaGateway,
    );
  });

  describe('matriz de permissões', () => {
    /** Cada mutação, chamada contra o documento 70 (ou a campanha 5) pelo usuário informado. */
    const mutacoes: [string, (sub: number) => Promise<unknown>][] = [
      ['criar', (sub) => service.criarDocumento({ campanhaId: 5, titulo: 'Novo', tipo: TipoDocumentoEnum.TEXTO }, usuario(sub))],
      [
        'alterar',
        (sub) =>
          service.alterarDocumento(
            { id: 70, titulo: 'Outro', conteudoMarkdown: 'x', updatedDate: '2026-09-26T12:00:00.000000Z' },
            usuario(sub),
          ),
      ],
      ['revelar', (sub) => service.revelarDocumento({ id: 70 }, usuario(sub))],
      ['ocultar', (sub) => service.ocultarDocumento({ id: 70 }, usuario(sub))],
      ['remover', (sub) => service.removerDocumento({ id: 70 }, usuario(sub))],
      ['reordenar', (sub) => service.reordenarDocumentos({ campanhaId: 5, ordem: [72, 71, 70] }, usuario(sub))],
      [
        'alterar imagem',
        (sub) =>
          service.alterarImagemDocumento(
            { id: 70, arquivo: { conteudo: new Uint8Array([1]), mimetype: 'image/png', tamanho: 1 } },
            usuario(sub),
          ),
      ],
    ];

    describe.each(mutacoes)('%s', (_nome, executar) => {
      it.each([JOGADOR, ESPECTADOR])('de documento revelado pelo usuário %s → 403, sem escrita nem evento', async (sub) => {
        documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: true }));

        await expect(executar(sub)).rejects.toBeInstanceOf(UnauthorizedAccessException);

        expectSemEscrita();
        expect(campanhaGateway.emitirDocumentoAlterado).not.toHaveBeenCalled();
      });

      it('por quem não é membro → 403, sem escrita nem evento', async () => {
        documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: true }));

        await expect(executar(FORASTEIRO)).rejects.toBeInstanceOf(UnauthorizedAccessException);

        expectSemEscrita();
        expect(campanhaGateway.emitirDocumentoAlterado).not.toHaveBeenCalled();
      });
    });

    it.each(['alterar', 'revelar', 'ocultar', 'remover', 'alterar imagem'])(
      '%s de um documento OCULTO por jogador/espectador → 404, a mesma resposta de um id inexistente',
      async (nomeMutacao) => {
        const [, executar] = mutacoes.find(([nome]) => nome === nomeMutacao)!;
        documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: false }));

        await expect(executar(JOGADOR)).rejects.toBeInstanceOf(ResourceNotFoundException);
        await expect(executar(ESPECTADOR)).rejects.toBeInstanceOf(ResourceNotFoundException);
        expectSemEscrita();
        expect(campanhaGateway.emitirDocumentoAlterado).not.toHaveBeenCalled();
      },
    );

    it('listagem: o mestre recebe tudo; jogador e espectador, só os revelados — recorte no SQL', async () => {
      await service.listarDocumentos({ campanhaId: 5 }, usuario(MESTRE));
      await service.listarDocumentos({ campanhaId: 5 }, usuario(JOGADOR));
      await service.listarDocumentos({ campanhaId: 5 }, usuario(ESPECTADOR));

      expect(documentoRepositorio.listarPorCampanha.mock.calls.map(([dto]) => dto)).toEqual([
        { campanhaId: 5, apenasRevelados: false },
        { campanhaId: 5, apenasRevelados: true },
        { campanhaId: 5, apenasRevelados: true },
      ]);
    });

    it('listagem por quem não é membro → 403', async () => {
      await expect(service.listarDocumentos({ campanhaId: 5 }, usuario(FORASTEIRO))).rejects.toBeInstanceOf(
        UnauthorizedAccessException,
      );
      expect(documentoRepositorio.listarPorCampanha).not.toHaveBeenCalled();
    });

    it('GET de um oculto por jogador/espectador → 404; o mestre o lê inteiro', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: false }));

      await expect(service.recuperarDocumento({ id: 70 }, usuario(JOGADOR))).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
      await expect(service.recuperarDocumento({ id: 70 }, usuario(ESPECTADOR))).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
      await expect(service.recuperarDocumento({ id: 70 }, usuario(MESTRE))).resolves.toEqual(criarDocumento());
    });

    it('GET de um id inexistente → 404 para qualquer papel', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(null);

      await expect(service.recuperarDocumento({ id: 999 }, usuario(MESTRE))).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
      await expect(service.recuperarDocumento({ id: 999 }, usuario(JOGADOR))).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });

    it('GET de um revelado: jogador e espectador leem o documento completo', async () => {
      const revelado = criarDocumento({ revelado: true });
      documentoRepositorio.recuperarPorId.mockResolvedValue(revelado);

      await expect(service.recuperarDocumento({ id: 70 }, usuario(JOGADOR))).resolves.toEqual(revelado);
      await expect(service.recuperarDocumento({ id: 70 }, usuario(ESPECTADOR))).resolves.toEqual(revelado);
    });

    it('GET por quem não é membro → 403, mesmo de um revelado', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: true }));

      await expect(service.recuperarDocumento({ id: 70 }, usuario(FORASTEIRO))).rejects.toBeInstanceOf(
        UnauthorizedAccessException,
      );
    });
  });

  describe('buscarDocumentos', () => {
    it('o mestre busca sem recorte; jogador e espectador, só nos revelados', async () => {
      await service.buscarDocumentos({ campanhaId: 5, termo: ' carta ' }, usuario(MESTRE));
      await service.buscarDocumentos(
        { campanhaId: 5, termo: 'carta', pagina: 2, limite: 10 },
        usuario(JOGADOR),
      );
      await service.buscarDocumentos({ campanhaId: 5, termo: 'carta' }, usuario(ESPECTADOR));

      expect(documentoRepositorio.buscarDocumentos.mock.calls.map(([dto]) => dto)).toEqual([
        { campanhaId: 5, termo: 'carta', apenasRevelados: false, pagina: 1, limite: 20 },
        { campanhaId: 5, termo: 'carta', apenasRevelados: true, pagina: 2, limite: 10 },
        { campanhaId: 5, termo: 'carta', apenasRevelados: true, pagina: 1, limite: 20 },
      ]);
    });

    it('nunca consulta sem recorte para quem não é mestre', async () => {
      for (const sub of [JOGADOR, ESPECTADOR]) {
        await service.buscarDocumentos({ campanhaId: 5, termo: 'carta' }, usuario(sub));
      }

      const recortes = documentoRepositorio.buscarDocumentos.mock.calls.map(
        ([dto]) => dto.apenasRevelados,
      );
      expect(recortes).toEqual([true, true]);
    });

    it('quem não é membro → 403, sem consultar', async () => {
      await expect(
        service.buscarDocumentos({ campanhaId: 5, termo: 'carta' }, usuario(FORASTEIRO)),
      ).rejects.toBeInstanceOf(UnauthorizedAccessException);
      expect(documentoRepositorio.buscarDocumentos).not.toHaveBeenCalled();
    });

    it('termo vazio (ou só espaços) devolve página vazia sem consultar', async () => {
      const resultado = await service.buscarDocumentos(
        { campanhaId: 5, termo: '   ' },
        usuario(MESTRE),
      );

      expect(resultado).toEqual(
        new PaginatedResult({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 }),
      );
      expect(documentoRepositorio.buscarDocumentos).not.toHaveBeenCalled();
    });

    it('termo acima do limite, página e limite inválidos → 400, sem consultar', async () => {
      const casos = [
        { termo: 'a'.repeat(BUSCA_CAMPANHA_TERMO_MAXIMO + 1) },
        { termo: 'carta', pagina: 0 },
        { termo: 'carta', pagina: 1.5 },
        { termo: 'carta', limite: 0 },
        { termo: 'carta', limite: BUSCA_CAMPANHA_LIMITE_MAXIMO + 1 },
      ];
      for (const caso of casos) {
        await expect(
          service.buscarDocumentos({ campanhaId: 5, ...caso }, usuario(MESTRE)),
        ).rejects.toBeInstanceOf(BusinessException);
      }
      expect(documentoRepositorio.buscarDocumentos).not.toHaveBeenCalled();
    });

    it('aceita o termo no limite exato', async () => {
      const termo = 'a'.repeat(BUSCA_CAMPANHA_TERMO_MAXIMO);

      await service.buscarDocumentos({ campanhaId: 5, termo }, usuario(MESTRE));

      expect(documentoRepositorio.buscarDocumentos).toHaveBeenCalledWith(
        expect.objectContaining({ termo }),
      );
    });
  });

  describe('criarDocumento', () => {
    it('TEXTO nasce oculto, com o título aparado, e o evento CRIADO vai só ao mestre', async () => {
      const criado = await service.criarDocumento(
        { campanhaId: 5, titulo: '  Carta cifrada  ', tipo: TipoDocumentoEnum.TEXTO, conteudoMarkdown: '# Carta' },
        usuario(MESTRE),
      );

      expect(documentoRepositorio.criarDocumento).toHaveBeenCalledWith({
        campanhaId: 5,
        titulo: 'Carta cifrada',
        tipo: TipoDocumentoEnum.TEXTO,
        conteudoMarkdown: '# Carta',
      });
      expect(criado.revelado).toBe(false);
      expect(emissoes()).toEqual([
        [{ campanhaId: 5, documentoId: 71, alteracao: DocumentoAlteracaoEnum.CRIADO }, false],
      ]);
    });

    it('TEXTO sem conteúdo nasce com markdown vazio', async () => {
      await service.criarDocumento({ campanhaId: 5, titulo: 'Nota', tipo: TipoDocumentoEnum.TEXTO }, usuario(MESTRE));

      expect(documentoRepositorio.criarDocumento).toHaveBeenCalledWith(
        expect.objectContaining({ conteudoMarkdown: '' }),
      );
    });

    it('IMAGEM nasce sem markdown e recusa um informado', async () => {
      await service.criarDocumento({ campanhaId: 5, titulo: 'Mapa', tipo: TipoDocumentoEnum.IMAGEM }, usuario(MESTRE));
      expect(documentoRepositorio.criarDocumento).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: TipoDocumentoEnum.IMAGEM, conteudoMarkdown: null }),
      );

      await expect(
        service.criarDocumento(
          { campanhaId: 5, titulo: 'Mapa', tipo: TipoDocumentoEnum.IMAGEM, conteudoMarkdown: '' },
          usuario(MESTRE),
        ),
      ).rejects.toBeInstanceOf(BusinessException);
    });

    it.each([
      ['título vazio', { titulo: '   ' }],
      ['título acima de 120', { titulo: 'a'.repeat(121) }],
      ['conteúdo acima de 100 000', { conteudoMarkdown: 'a'.repeat(100_001) }],
      ['tipo desconhecido', { tipo: 'PDF' as TipoDocumentoEnum }],
    ])('%s → 400, sem gravar', async (_caso, overrides) => {
      await expect(
        service.criarDocumento(
          { campanhaId: 5, titulo: 'Válido', tipo: TipoDocumentoEnum.TEXTO, ...overrides },
          usuario(MESTRE),
        ),
      ).rejects.toBeInstanceOf(BusinessException);
      expect(documentoRepositorio.criarDocumento).not.toHaveBeenCalled();
    });
  });

  describe('alterarDocumento', () => {
    const alteracao = { id: 70, titulo: 'Carta decifrada', conteudoMarkdown: 'Texto novo', updatedDate: '2026-09-26T12:00:00.000000Z' };

    it('de um oculto emite ALTERADO só ao mestre', async () => {
      await service.alterarDocumento(alteracao, usuario(MESTRE));

      expect(documentoRepositorio.alterarDocumento).toHaveBeenCalledWith(alteracao);
      expect(emissoes()).toEqual([
        [{ campanhaId: 5, documentoId: 70, alteracao: DocumentoAlteracaoEnum.ALTERADO }, false],
      ]);
    });

    it('de um revelado emite ALTERADO à mesa', async () => {
      documentoRepositorio.alterarDocumento.mockImplementation((dto) =>
        Promise.resolve(criarDocumento({ ...dto, revelado: true })),
      );

      await service.alterarDocumento(alteracao, usuario(MESTRE));

      expect(emissoes()).toEqual([
        [{ campanhaId: 5, documentoId: 70, alteracao: DocumentoAlteracaoEnum.ALTERADO }, true],
      ]);
    });

    it('versão defasada → 409, sem evento', async () => {
      documentoRepositorio.alterarDocumento.mockResolvedValue(null);

      await expect(service.alterarDocumento(alteracao, usuario(MESTRE))).rejects.toBeInstanceOf(
        ResourceConflictException,
      );
      expect(campanhaGateway.emitirDocumentoAlterado).not.toHaveBeenCalled();
    });

    it('versão ausente ou inválida → 400', async () => {
      await expect(
        service.alterarDocumento({ ...alteracao, updatedDate: 'ontem' }, usuario(MESTRE)),
      ).rejects.toBeInstanceOf(BusinessException);
      expect(documentoRepositorio.alterarDocumento).not.toHaveBeenCalled();
    });

    it('TEXTO exige o markdown; IMAGEM recusa markdown e aceita só o título', async () => {
      await expect(
        service.alterarDocumento({ ...alteracao, conteudoMarkdown: null }, usuario(MESTRE)),
      ).rejects.toBeInstanceOf(BusinessException);

      documentoRepositorio.recuperarPorId.mockResolvedValue(
        criarDocumento({ tipo: TipoDocumentoEnum.IMAGEM, conteudoMarkdown: null }),
      );
      await expect(service.alterarDocumento(alteracao, usuario(MESTRE))).rejects.toBeInstanceOf(BusinessException);

      await service.alterarDocumento({ ...alteracao, conteudoMarkdown: null }, usuario(MESTRE));
      expect(documentoRepositorio.alterarDocumento).toHaveBeenCalledWith({ ...alteracao, conteudoMarkdown: null });
    });
  });

  describe('revelar e ocultar', () => {
    it('revelar grava, devolve a nova versão e emite REVELADO à mesa', async () => {
      const resultado = await service.revelarDocumento({ id: 70 }, usuario(MESTRE));

      expect(documentoRepositorio.alterarRevelado).toHaveBeenCalledWith({ id: 70, revelado: true });
      expect(resultado).toEqual({ id: 70, revelado: true, updatedDate: '2026-09-26T12:06:00.000000Z' });
      expect(emissoes()).toEqual([
        [{ campanhaId: 5, documentoId: 70, alteracao: DocumentoAlteracaoEnum.REVELADO }, true],
      ]);
    });

    it('revelar um já revelado não grava nem emite', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: true }));

      await expect(service.revelarDocumento({ id: 70 }, usuario(MESTRE))).resolves.toEqual({
        id: 70,
        revelado: true,
        updatedDate: '2026-09-26T12:00:00.000000Z',
      });
      expect(documentoRepositorio.alterarRevelado).not.toHaveBeenCalled();
      expect(campanhaGateway.emitirDocumentoAlterado).not.toHaveBeenCalled();
    });

    it('IMAGEM sem imagem não pode ser revelado', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(
        criarDocumento({ tipo: TipoDocumentoEnum.IMAGEM, conteudoMarkdown: null, imagemUrl: null }),
      );

      await expect(service.revelarDocumento({ id: 70 }, usuario(MESTRE))).rejects.toBeInstanceOf(BusinessException);
      expect(documentoRepositorio.alterarRevelado).not.toHaveBeenCalled();
    });

    it('ocultar um revelado grava e emite OCULTADO à mesa, que precisa retirá-lo', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: true }));

      const resultado = await service.ocultarDocumento({ id: 70 }, usuario(MESTRE));

      expect(documentoRepositorio.alterarRevelado).toHaveBeenCalledWith({ id: 70, revelado: false });
      expect(resultado.revelado).toBe(false);
      expect(emissoes()).toEqual([
        [{ campanhaId: 5, documentoId: 70, alteracao: DocumentoAlteracaoEnum.OCULTADO }, true],
      ]);
    });

    it('ocultar um já oculto não grava nem emite', async () => {
      await service.ocultarDocumento({ id: 70 }, usuario(MESTRE));

      expect(documentoRepositorio.alterarRevelado).not.toHaveBeenCalled();
      expect(campanhaGateway.emitirDocumentoAlterado).not.toHaveBeenCalled();
    });
  });

  describe('removerDocumento', () => {
    it.each([
      [false, false],
      [true, true],
    ])('revelado=%s → REMOVIDO com visivelParaMesa=%s', async (revelado, visivel) => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado }));

      await service.removerDocumento({ id: 70 }, usuario(MESTRE));

      expect(documentoRepositorio.removerDocumento).toHaveBeenCalledWith({ id: 70 });
      expect(emissoes()).toEqual([
        [{ campanhaId: 5, documentoId: 70, alteracao: DocumentoAlteracaoEnum.REMOVIDO }, visivel],
      ]);
    });
  });

  describe('reordenarDocumentos', () => {
    it('grava a nova ordem na transação, devolve a biblioteca do mestre e emite REORDENADO à mesa', async () => {
      await service.reordenarDocumentos({ campanhaId: 5, ordem: [72, 70, 71] }, usuario(MESTRE));

      expect(documentoRepositorio.alterarOrdem.mock.calls.map(([dto]) => dto)).toEqual([
        { id: 72, ordem: 1 },
        { id: 70, ordem: 2 },
        { id: 71, ordem: 3 },
      ]);
      expect(ordemGravadaNaTransacao).toEqual([true, true, true]);
      expect(documentoRepositorio.listarPorCampanha).toHaveBeenLastCalledWith({ campanhaId: 5, apenasRevelados: false });
      expect(emissoes()).toEqual([
        [{ campanhaId: 5, documentoId: null, alteracao: DocumentoAlteracaoEnum.REORDENADO }, true],
      ]);
    });

    it.each([
      ['faltando', [72, 70]],
      ['sobrando', [72, 70, 71, 99]],
      ['repetido', [72, 70, 70]],
      ['ausente', undefined],
    ])('id %s → 400, sem gravar nem emitir', async (_caso, ordem) => {
      await expect(
        service.reordenarDocumentos({ campanhaId: 5, ordem: ordem as number[] }, usuario(MESTRE)),
      ).rejects.toBeInstanceOf(BusinessException);
      expect(documentoRepositorio.alterarOrdem).not.toHaveBeenCalled();
      expect(campanhaGateway.emitirDocumentoAlterado).not.toHaveBeenCalled();
    });
  });

  describe('alterarImagemDocumento', () => {
    const documentoImagem = criarDocumento({
      tipo: TipoDocumentoEnum.IMAGEM,
      conteudoMarkdown: null,
      imagemUrl: '/uploads/documentos/anterior.jpg',
    });
    const arquivoPng = { conteudo: new Uint8Array([1, 2]), mimetype: 'image/png', tamanho: 2 };

    it('grava em documentos/, apaga a anterior e só então persiste', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(documentoImagem);

      const resultado = await service.alterarImagemDocumento({ id: 70, arquivo: arquivoPng }, usuario(MESTRE));

      expect(armazenamentoProvedor.salvarImagem).toHaveBeenCalledWith({
        pasta: ArmazenamentoPastaEnum.DOCUMENTOS,
        conteudo: arquivoPng.conteudo,
        mimetype: 'image/png',
        extensao: 'png',
      });
      expect(armazenamentoProvedor.excluirImagem).toHaveBeenCalledWith({ caminho: '/uploads/documentos/anterior.jpg' });
      expect(documentoRepositorio.alterarImagem).toHaveBeenCalledWith({
        id: 70,
        imagemUrl: '/uploads/documentos/nova.png',
      });
      expect(resultado.imagemUrl).toBe('/uploads/documentos/nova.png');
      expect(emissoes()).toEqual([
        [{ campanhaId: 5, documentoId: 70, alteracao: DocumentoAlteracaoEnum.ALTERADO }, false],
      ]);
    });

    it.each([
      ['tipo inválido', { ...arquivoPng, mimetype: 'image/gif' }],
      ['acima do limite', { ...arquivoPng, tamanho: DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES + 1 }],
      ['arquivo ausente (vazio)', { conteudo: new Uint8Array(), mimetype: '', tamanho: 0 }],
    ])('%s → 400, sem gravar nada', async (_caso, arquivo) => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(documentoImagem);

      await expect(service.alterarImagemDocumento({ id: 70, arquivo }, usuario(MESTRE))).rejects.toBeInstanceOf(
        BusinessException,
      );
      expectSemEscrita();
      expect(armazenamentoProvedor.excluirImagem).not.toHaveBeenCalled();
    });

    it('aceita o arquivo exatamente no limite', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(documentoImagem);

      await service.alterarImagemDocumento(
        { id: 70, arquivo: { ...arquivoPng, tamanho: DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES } },
        usuario(MESTRE),
      );

      expect(armazenamentoProvedor.salvarImagem).toHaveBeenCalled();
    });

    it('num documento TEXTO → 400', async () => {
      await expect(
        service.alterarImagemDocumento({ id: 70, arquivo: arquivoPng }, usuario(MESTRE)),
      ).rejects.toBeInstanceOf(BusinessException);
      expectSemEscrita();
    });
  });
  describe('informarLeitura (m9-09, presença)', () => {
    /** Último retrato emitido à sala do mestre. */
    function ultimoRetrato(): DocumentoLeitoresDto | undefined {
      return campanhaGateway.emitirDocumentoLeitores.mock.calls.at(-1)?.[0];
    }

    it('jogador lendo um revelado entra no retrato do mestre', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: true }));

      await service.informarLeitura({ conexaoId: 's-j', campanhaId: 5, documentoId: 70 }, usuario(JOGADOR));

      expect(ultimoRetrato()).toEqual({
        campanhaId: 5,
        leitores: [{ documentoId: 70, usuarioId: JOGADOR, papel: TipoCampanhaMembroPapelEnum.JOGADOR }],
      });
    });

    it('jogador informando um oculto vira null — não "lê" o que o GET lhe negaria', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: false }));

      await service.informarLeitura({ conexaoId: 's-j', campanhaId: 5, documentoId: 70 }, usuario(JOGADOR));

      expect(campanhaGateway.emitirDocumentoLeitores).not.toHaveBeenCalled();
      expect(documentoLeituraService.montarRetrato(5).leitores).toEqual([]);
    });

    it('espectador informando um id inexistente vira null', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(null);

      await service.informarLeitura({ conexaoId: 's-e', campanhaId: 5, documentoId: 999 }, usuario(ESPECTADOR));

      expect(documentoLeituraService.montarRetrato(5).leitores).toEqual([]);
    });

    it('um documento revelado de outra campanha vira null', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: true, campanhaId: 8 }));

      await service.informarLeitura({ conexaoId: 's-j', campanhaId: 5, documentoId: 70 }, usuario(JOGADOR));

      expect(documentoLeituraService.montarRetrato(5).leitores).toEqual([]);
      expect(documentoLeituraService.montarRetrato(8).leitores).toEqual([]);
    });

    it('quem não é membro é recusado e nada é registrado', async () => {
      await expect(
        service.informarLeitura({ conexaoId: 's-f', campanhaId: 5, documentoId: null }, usuario(FORASTEIRO)),
      ).rejects.toBeInstanceOf(UnauthorizedAccessException);

      expect(campanhaGateway.emitirDocumentoLeitores).not.toHaveBeenCalled();
      expect(campanhaGateway.emitirDocumentoLeitoresParaConexao).not.toHaveBeenCalled();
    });

    it.each([
      [{ campanhaId: 0, documentoId: null }],
      [{ campanhaId: 5, documentoId: 1.5 }],
      [{ campanhaId: 5, documentoId: 'x' as unknown as number }],
    ])('payload inválido %o → BusinessException, sem consultar', async (payload) => {
      await expect(
        service.informarLeitura({ conexaoId: 's-j', ...payload }, usuario(JOGADOR)),
      ).rejects.toBeInstanceOf(BusinessException);

      expect(validarAcessoSalaCampanha).not.toHaveBeenCalled();
    });

    it('o mestre recebe o retrato atual na própria conexão, sem aparecer nele', async () => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: true }));
      await service.informarLeitura({ conexaoId: 's-j', campanhaId: 5, documentoId: 70 }, usuario(JOGADOR));
      campanhaGateway.emitirDocumentoLeitores.mockClear();

      await service.informarLeitura({ conexaoId: 's-m', campanhaId: 5, documentoId: 70 }, usuario(MESTRE));

      expect(campanhaGateway.emitirDocumentoLeitores).not.toHaveBeenCalled();
      expect(campanhaGateway.emitirDocumentoLeitoresParaConexao).toHaveBeenCalledWith('s-m', {
        campanhaId: 5,
        leitores: [{ documentoId: 70, usuarioId: JOGADOR, papel: TipoCampanhaMembroPapelEnum.JOGADOR }],
      });
    });

    it.each([
      ['ocultar', () => service.ocultarDocumento({ id: 70 }, usuario(MESTRE))],
      ['remover', () => service.removerDocumento({ id: 70 }, usuario(MESTRE))],
    ])('%s tira do documento os leitores não-mestre, sem esperar o cliente', async (_nome, executar) => {
      documentoRepositorio.recuperarPorId.mockResolvedValue(criarDocumento({ revelado: true }));
      await service.informarLeitura({ conexaoId: 's-j', campanhaId: 5, documentoId: 70 }, usuario(JOGADOR));
      await service.informarLeitura({ conexaoId: 's-e', campanhaId: 5, documentoId: 70 }, usuario(ESPECTADOR));
      campanhaGateway.emitirDocumentoLeitores.mockClear();

      await executar();

      expect(campanhaGateway.emitirDocumentoLeitores).toHaveBeenCalledTimes(1);
      expect(ultimoRetrato()).toEqual({ campanhaId: 5, leitores: [] });
    });
  });
});
