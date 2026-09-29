import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { CenaAlteradaDto, CenaLinhaDto } from '@contratados-rpg/shared/dtos/cena';
import {
  CenaStatusEnum,
  CenaTipoEnum,
  EncontroStatusEnum,
  TipoCampanhaMembroPapelEnum,
  TipoUsuarioEnum,
} from '@contratados-rpg/shared/enums';
import { BusinessException, UnauthorizedAccessException } from '../../core/exceptions';
import type { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { TransacaoService } from '../../database/transacao.service';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { EncontroRepository } from '../encontro/encontro.repository';
import type { EncontroService } from '../encontro/encontro.service';
import type { CenaRepository } from './cena.repository';
import { CenaService } from './cena.service';

const mestre: JwtPayload = { sub: 1, login: 'mestre', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
const jogador: JwtPayload = { sub: 2, login: 'jogador', tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };

function criarCenaLinha(overrides: Partial<CenaLinhaDto> = {}): CenaLinhaDto {
  return {
    id: 900,
    campanhaId: 5,
    nome: 'Emboscada no Setor 7',
    tipo: CenaTipoEnum.COMBATE,
    status: CenaStatusEnum.PLANEJADA,
    ordem: 1,
    encontroId: 50,
    ...overrides,
  };
}

interface CenaRepositorioDublado {
  criarCena: Mock<CenaRepository['criarCena']>;
  recuperarPorId: Mock<CenaRepository['recuperarPorId']>;
  recuperarAtivaPorCampanha: Mock<CenaRepository['recuperarAtivaPorCampanha']>;
  listarPorCampanha: Mock<CenaRepository['listarPorCampanha']>;
  recuperarMaiorOrdem: Mock<CenaRepository['recuperarMaiorOrdem']>;
  alterarStatus: Mock<CenaRepository['alterarStatus']>;
  alterarOrdem: Mock<CenaRepository['alterarOrdem']>;
}

interface EncontroServiceDublado {
  encerrarEncontroDaCena: Mock<EncontroService['encerrarEncontroDaCena']>;
  emitirEncontroAlterado: Mock<EncontroService['emitirEncontroAlterado']>;
  recuperarEncontro: Mock<EncontroService['recuperarEncontro']>;
}

describe('CenaService', () => {
  let cenaRepositorio: CenaRepositorioDublado;
  let encontroRepositorio: {
    criarEncontro: Mock<EncontroRepository['criarEncontro']>;
    recuperarPorId: Mock<EncontroRepository['recuperarPorId']>;
  };
  let encontroService: EncontroServiceDublado;
  let campanhaRepositorio: { recuperarMembro: Mock<CampanhaRepository['recuperarMembro']> };
  let transacaoService: { executar: Mock<(operacao: () => Promise<unknown>) => Promise<unknown>> };
  let campanhaGateway: { emitirCenaAlterada: Mock<(evento: CenaAlteradaDto) => void> };
  let dentroDaTransacao: boolean;
  let service: CenaService;

  /** Papel devolvido pelo dublê de `recuperarMembro` (os demais campos do membro não importam aqui). */
  function membroComPapel(papel: TipoCampanhaMembroPapelEnum) {
    return { papel } as Awaited<ReturnType<CampanhaRepository['recuperarMembro']>>;
  }

  /** Registra, a cada chamada do dublê, se ela aconteceu dentro da transação. */
  function registrarTransacao(nome: string, chamadas: Record<string, boolean[]>): void {
    (chamadas[nome] ??= []).push(dentroDaTransacao);
  }

  /** Linha devolvida pelo dublê de `alterarStatus`: a cena padrão com id/status alterados. */
  function linhaAlterada(dto: { id: number; status: CenaStatusEnum }): Promise<CenaLinhaDto> {
    return Promise.resolve(criarCenaLinha({ id: dto.id, status: dto.status }));
  }

  /** Eventos `cena:alterada` emitidos, na ordem. */
  function eventosEmitidos(): CenaAlteradaDto[] {
    return campanhaGateway.emitirCenaAlterada.mock.calls.map(([evento]) => evento);
  }

  beforeEach(() => {
    dentroDaTransacao = false;
    cenaRepositorio = {
      criarCena: vi.fn<CenaRepository['criarCena']>((dto) =>
        Promise.resolve(criarCenaLinha({ ...dto, id: 901, encontroId: null })),
      ),
      recuperarPorId: vi.fn<CenaRepository['recuperarPorId']>().mockResolvedValue(criarCenaLinha()),
      recuperarAtivaPorCampanha: vi.fn<CenaRepository['recuperarAtivaPorCampanha']>().mockResolvedValue(null),
      listarPorCampanha: vi.fn<CenaRepository['listarPorCampanha']>().mockResolvedValue([]),
      recuperarMaiorOrdem: vi.fn<CenaRepository['recuperarMaiorOrdem']>().mockResolvedValue(3),
      alterarStatus: vi.fn<CenaRepository['alterarStatus']>(linhaAlterada),
      alterarOrdem: vi.fn<CenaRepository['alterarOrdem']>().mockResolvedValue(undefined),
    };
    encontroRepositorio = {
      criarEncontro: vi.fn<EncontroRepository['criarEncontro']>(),
      recuperarPorId: vi.fn<EncontroRepository['recuperarPorId']>().mockResolvedValue({
        id: 50,
        campanhaId: 5,
        cenaId: 900,
        cenaStatus: CenaStatusEnum.ATIVA,
        nome: 'Emboscada no Setor 7',
        status: EncontroStatusEnum.MONTAGEM,
        rodadaAtual: 0,
        turnoIndice: 0,
      }),
    };
    encontroService = {
      encerrarEncontroDaCena: vi.fn<EncontroService['encerrarEncontroDaCena']>().mockResolvedValue(undefined),
      emitirEncontroAlterado: vi.fn<EncontroService['emitirEncontroAlterado']>().mockResolvedValue(undefined),
      recuperarEncontro: vi
        .fn<EncontroService['recuperarEncontro']>()
        .mockResolvedValue({ id: 50 } as Awaited<ReturnType<EncontroService['recuperarEncontro']>>),
    };
    campanhaRepositorio = {
      recuperarMembro: vi
        .fn<CampanhaRepository['recuperarMembro']>()
        .mockResolvedValue(membroComPapel(TipoCampanhaMembroPapelEnum.MESTRE)),
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
    campanhaGateway = { emitirCenaAlterada: vi.fn<(evento: CenaAlteradaDto) => void>() };
    service = new CenaService(
      cenaRepositorio as unknown as CenaRepository,
      encontroRepositorio as unknown as EncontroRepository,
      encontroService as unknown as EncontroService,
      campanhaRepositorio as unknown as CampanhaRepository,
      transacaoService as unknown as TransacaoService,
      campanhaGateway as unknown as CampanhaGateway,
    );
  });

  describe('criarCena', () => {
    it('nasce PLANEJADA no fim da fila; tipo com iniciativa cria o encontro na mesma transação', async () => {
      const chamadas: Record<string, boolean[]> = {};
      cenaRepositorio.criarCena.mockImplementation((dto) => {
        registrarTransacao('criarCena', chamadas);
        return Promise.resolve(criarCenaLinha({ ...dto, id: 901, encontroId: null }));
      });
      encontroRepositorio.criarEncontro.mockImplementation(() => {
        registrarTransacao('criarEncontro', chamadas);
        return Promise.resolve(null as never);
      });
      cenaRepositorio.recuperarPorId.mockResolvedValue(criarCenaLinha({ id: 901, encontroId: 51 }));

      const resultado = await service.criarCena(
        { campanhaId: 5, nome: '  Emboscada no Setor 7 ', tipo: CenaTipoEnum.COMBATE, ativarImediatamente: false },
        mestre,
      );

      expect(cenaRepositorio.criarCena).toHaveBeenCalledWith({
        campanhaId: 5,
        nome: 'Emboscada no Setor 7',
        tipo: CenaTipoEnum.COMBATE,
        status: CenaStatusEnum.PLANEJADA,
        ordem: 4,
      });
      expect(encontroRepositorio.criarEncontro).toHaveBeenCalledWith({
        campanhaId: 5,
        cenaId: 901,
        nome: 'Emboscada no Setor 7',
        status: EncontroStatusEnum.MONTAGEM,
      });
      expect(chamadas).toEqual({ criarCena: [true], criarEncontro: [true] });
      // Planejada não mexe na ativa da campanha.
      expect(cenaRepositorio.recuperarAtivaPorCampanha).not.toHaveBeenCalled();
      expect(resultado).toEqual({
        id: 901,
        campanhaId: 5,
        nome: 'Emboscada no Setor 7',
        tipo: CenaTipoEnum.COMBATE,
        status: CenaStatusEnum.PLANEJADA,
      });
      expect(campanhaGateway.emitirCenaAlterada).toHaveBeenCalledWith({
        campanhaId: 5,
        cena: {
          id: 901,
          nome: 'Emboscada no Setor 7',
          tipo: CenaTipoEnum.COMBATE,
          status: CenaStatusEnum.PLANEJADA,
          temEncontro: true,
        },
      });
      expect(encontroService.emitirEncontroAlterado).toHaveBeenCalledWith({ id: 51 });
    });

    it('tipo sem iniciativa (Investigação) não cria encontro', async () => {
      cenaRepositorio.recuperarPorId.mockResolvedValue(
        criarCenaLinha({ id: 901, tipo: CenaTipoEnum.INVESTIGACAO, encontroId: null }),
      );

      await service.criarCena(
        { campanhaId: 5, nome: 'O arquivo morto', tipo: CenaTipoEnum.INVESTIGACAO, ativarImediatamente: false },
        mestre,
      );

      expect(encontroRepositorio.criarEncontro).not.toHaveBeenCalled();
      expect(encontroService.emitirEncontroAlterado).not.toHaveBeenCalled();
    });

    it('ativarImediatamente encerra a ativa (e o encontro dela) antes de criar a nova, tudo numa transação', async () => {
      const ativaAtual = criarCenaLinha({ id: 800, status: CenaStatusEnum.ATIVA, encontroId: 40 });
      cenaRepositorio.recuperarAtivaPorCampanha.mockResolvedValue(ativaAtual);
      cenaRepositorio.alterarStatus.mockResolvedValue(
        criarCenaLinha({ id: 800, status: CenaStatusEnum.ENCERRADA, encontroId: 40 }),
      );
      cenaRepositorio.recuperarPorId.mockResolvedValue(
        criarCenaLinha({ id: 901, status: CenaStatusEnum.ATIVA, encontroId: 51 }),
      );
      const chamadas: Record<string, boolean[]> = {};
      encontroService.encerrarEncontroDaCena.mockImplementation(() => {
        registrarTransacao('encerrarEncontro', chamadas);
        return Promise.resolve();
      });

      await service.criarCena(
        { campanhaId: 5, nome: 'Perseguição no metrô', tipo: CenaTipoEnum.PERSEGUICAO, ativarImediatamente: true },
        mestre,
      );

      expect(transacaoService.executar).toHaveBeenCalledTimes(1);
      expect(encontroService.encerrarEncontroDaCena).toHaveBeenCalledWith({ id: 40 });
      expect(chamadas).toEqual({ encerrarEncontro: [true] });
      expect(cenaRepositorio.alterarStatus).toHaveBeenCalledWith({ id: 800, status: CenaStatusEnum.ENCERRADA });
      // Nunca duas ativas: a antiga fecha antes de a nova nascer ATIVA.
      expect(cenaRepositorio.alterarStatus.mock.invocationCallOrder[0]).toBeLessThan(
        cenaRepositorio.criarCena.mock.invocationCallOrder[0],
      );
      expect(cenaRepositorio.criarCena).toHaveBeenCalledWith(
        expect.objectContaining({ status: CenaStatusEnum.ATIVA }),
      );
      expect(eventosEmitidos().map((evento) => [evento.cena.id, evento.cena.status])).toEqual([
        [800, CenaStatusEnum.ENCERRADA],
        [901, CenaStatusEnum.ATIVA],
      ]);
    });

    it('falha no meio da transação não emite nada', async () => {
      encontroRepositorio.criarEncontro.mockRejectedValue(new Error('falha de banco'));

      await expect(
        service.criarCena(
          { campanhaId: 5, nome: 'Emboscada', tipo: CenaTipoEnum.COMBATE, ativarImediatamente: false },
          mestre,
        ),
      ).rejects.toThrow('falha de banco');
      expect(campanhaGateway.emitirCenaAlterada).not.toHaveBeenCalled();
      expect(encontroService.emitirEncontroAlterado).not.toHaveBeenCalled();
    });

    it('recusa nome vazio e tipo desconhecido', async () => {
      await expect(
        service.criarCena({ campanhaId: 5, nome: '   ', tipo: CenaTipoEnum.COMBATE, ativarImediatamente: false }, mestre),
      ).rejects.toThrow(BusinessException);
      await expect(
        service.criarCena(
          { campanhaId: 5, nome: 'Cena', tipo: 'DUELO' as CenaTipoEnum, ativarImediatamente: false },
          mestre,
        ),
      ).rejects.toThrow(BusinessException);
      expect(cenaRepositorio.criarCena).not.toHaveBeenCalled();
    });
  });

  describe('permissão: toda mutação exige o mestre (403)', () => {
    beforeEach(() => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(membroComPapel(TipoCampanhaMembroPapelEnum.JOGADOR));
    });

    it.each([
      ['criarCena', (servico: CenaService) =>
        servico.criarCena({ campanhaId: 5, nome: 'X', tipo: CenaTipoEnum.COMBATE, ativarImediatamente: true }, jogador)],
      ['abrirCena', (servico: CenaService) => servico.abrirCena({ id: 900 }, jogador)],
      ['encerrarCena', (servico: CenaService) => servico.encerrarCena({ id: 900 }, jogador)],
      ['reordenarCenas', (servico: CenaService) => servico.reordenarCenas({ campanhaId: 5, ordem: [900] }, jogador)],
      ['criarEncontro', (servico: CenaService) => servico.criarEncontro({ campanhaId: 5, nome: 'X' }, jogador)],
      ['encerrarCenaDoEncontro', (servico: CenaService) => servico.encerrarCenaDoEncontro({ id: 50 }, jogador)],
    ])('%s recusa o jogador sem persistir', async (_nome, chamar) => {
      await expect(chamar(service)).rejects.toThrow(UnauthorizedAccessException);
      expect(transacaoService.executar).not.toHaveBeenCalled();
      expect(campanhaGateway.emitirCenaAlterada).not.toHaveBeenCalled();
    });

    it('quem não é membro também é recusado', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(null);

      await expect(service.abrirCena({ id: 900 }, jogador)).rejects.toThrow(UnauthorizedAccessException);
    });
  });

  describe('abrirCena', () => {
    it('PLANEJADA → ATIVA encerrando a ativa atual na mesma transação; o encontro passa a ser transmitido', async () => {
      cenaRepositorio.recuperarAtivaPorCampanha.mockResolvedValue(
        criarCenaLinha({ id: 800, status: CenaStatusEnum.ATIVA, tipo: CenaTipoEnum.INVESTIGACAO, encontroId: null }),
      );
      cenaRepositorio.alterarStatus.mockImplementation((dto) =>
        dto.id === 800
          ? Promise.resolve(
              criarCenaLinha({ id: 800, status: dto.status, tipo: CenaTipoEnum.INVESTIGACAO, encontroId: null }),
            )
          : linhaAlterada(dto),
      );

      await service.abrirCena({ id: 900 }, mestre);

      expect(transacaoService.executar).toHaveBeenCalledTimes(1);
      expect(cenaRepositorio.alterarStatus.mock.calls.map(([dto]) => dto)).toEqual([
        { id: 800, status: CenaStatusEnum.ENCERRADA },
        { id: 900, status: CenaStatusEnum.ATIVA },
      ]);
      expect(encontroService.encerrarEncontroDaCena).not.toHaveBeenCalled();
      expect(encontroService.emitirEncontroAlterado).toHaveBeenCalledWith({ id: 50 });
    });

    it('só uma cena planejada pode ser aberta', async () => {
      cenaRepositorio.recuperarPorId.mockResolvedValue(criarCenaLinha({ status: CenaStatusEnum.ATIVA }));

      await expect(service.abrirCena({ id: 900 }, mestre)).rejects.toThrow(BusinessException);
      expect(transacaoService.executar).not.toHaveBeenCalled();
    });
  });

  describe('encerrarCena', () => {
    it('encerra a cena e o encontro dela juntos, na mesma transação', async () => {
      cenaRepositorio.recuperarPorId.mockResolvedValue(criarCenaLinha({ status: CenaStatusEnum.ATIVA }));
      const chamadas: Record<string, boolean[]> = {};
      encontroService.encerrarEncontroDaCena.mockImplementation(() => {
        registrarTransacao('encontro', chamadas);
        return Promise.resolve();
      });
      cenaRepositorio.alterarStatus.mockImplementation((dto) => {
        registrarTransacao('cena', chamadas);
        return linhaAlterada(dto);
      });

      await service.encerrarCena({ id: 900 }, mestre);

      expect(encontroService.encerrarEncontroDaCena).toHaveBeenCalledWith({ id: 50 });
      expect(cenaRepositorio.alterarStatus).toHaveBeenCalledWith({ id: 900, status: CenaStatusEnum.ENCERRADA });
      expect(chamadas).toEqual({ encontro: [true], cena: [true] });
      expect(encontroService.emitirEncontroAlterado).toHaveBeenCalledWith({ id: 50 });
    });

    it('cena planejada não é encerrada — ela nunca chegou à mesa', async () => {
      await expect(service.encerrarCena({ id: 900 }, mestre)).rejects.toThrow(BusinessException);
      expect(encontroService.encerrarEncontroDaCena).not.toHaveBeenCalled();
    });

    it('o "Encerrar" do painel de Iniciativa (POST encontro/:id/encerrar) encerra a cena-mãe', async () => {
      cenaRepositorio.recuperarPorId.mockResolvedValue(criarCenaLinha({ status: CenaStatusEnum.ATIVA }));

      await service.encerrarCenaDoEncontro({ id: 50 }, mestre);

      expect(cenaRepositorio.recuperarPorId).toHaveBeenCalledWith({ id: 900 });
      expect(encontroService.encerrarEncontroDaCena).toHaveBeenCalledWith({ id: 50 });
      expect(cenaRepositorio.alterarStatus).toHaveBeenCalledWith({ id: 900, status: CenaStatusEnum.ENCERRADA });
      expect(encontroService.recuperarEncontro).toHaveBeenCalledWith({ id: 50 }, mestre);
    });
  });

  describe('criarEncontro (POST campanha/:id/encontro, até a m7-23)', () => {
    it('cria uma cena COMBATE já ativa com o encontro e devolve o encontro', async () => {
      cenaRepositorio.recuperarPorId.mockResolvedValue(
        criarCenaLinha({ id: 901, status: CenaStatusEnum.ATIVA, encontroId: 50 }),
      );

      const resultado = await service.criarEncontro({ campanhaId: 5, nome: 'Emboscada no Setor 7' }, mestre);

      expect(cenaRepositorio.criarCena).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: CenaTipoEnum.COMBATE, status: CenaStatusEnum.ATIVA }),
      );
      expect(resultado).toEqual({
        id: 50,
        campanhaId: 5,
        nome: 'Emboscada no Setor 7',
        status: EncontroStatusEnum.MONTAGEM,
      });
    });

    it('com uma cena em andamento, recusa em vez de encerrá-la por baixo', async () => {
      cenaRepositorio.recuperarAtivaPorCampanha.mockResolvedValue(criarCenaLinha({ status: CenaStatusEnum.ATIVA }));

      await expect(service.criarEncontro({ campanhaId: 5, nome: 'Outro' }, mestre)).rejects.toThrow(
        BusinessException,
      );
      expect(cenaRepositorio.criarCena).not.toHaveBeenCalled();
    });
  });

  describe('reordenarCenas', () => {
    beforeEach(() => {
      cenaRepositorio.listarPorCampanha.mockResolvedValue([
        { id: 800, nome: 'Ativa', tipo: CenaTipoEnum.COMBATE, status: CenaStatusEnum.ATIVA, temEncontro: true },
        { id: 901, nome: 'A', tipo: CenaTipoEnum.COMBATE, status: CenaStatusEnum.PLANEJADA, temEncontro: true },
        { id: 902, nome: 'B', tipo: CenaTipoEnum.INVESTIGACAO, status: CenaStatusEnum.PLANEJADA, temEncontro: false },
      ]);
    });

    it('persiste a nova ordem das planejadas e devolve a listagem', async () => {
      const resultado = await service.reordenarCenas({ campanhaId: 5, ordem: [902, 901] }, mestre);

      expect(cenaRepositorio.alterarOrdem.mock.calls.map(([dto]) => dto)).toEqual([
        { id: 902, ordem: 1 },
        { id: 901, ordem: 2 },
      ]);
      expect(transacaoService.executar).toHaveBeenCalledTimes(1);
      expect(resultado).toHaveLength(3);
      // Só as planejadas mudaram — e elas só vão à sala do mestre (o gateway decide pelo status).
      expect(eventosEmitidos().map((evento) => evento.cena.id)).toEqual([901, 902]);
    });

    it.each([
      ['lista parcial', [901]],
      ['id repetido', [901, 901]],
      ['cena que não é planejada', [800, 901]],
    ])('recusa %s sem persistir', async (_caso, ordem) => {
      await expect(service.reordenarCenas({ campanhaId: 5, ordem }, mestre)).rejects.toThrow(BusinessException);
      expect(cenaRepositorio.alterarOrdem).not.toHaveBeenCalled();
    });
  });

  describe('recuperarCena / listarPorCampanha — trava anti-vazamento', () => {
    it('jogador recebe 403 (não um payload) numa cena PLANEJADA; o mestre recebe a cena', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(membroComPapel(TipoCampanhaMembroPapelEnum.JOGADOR));

      await expect(service.recuperarCena({ id: 900 }, jogador)).rejects.toThrow(UnauthorizedAccessException);
      expect(encontroService.recuperarEncontro).not.toHaveBeenCalled();

      campanhaRepositorio.recuperarMembro.mockResolvedValue(membroComPapel(TipoCampanhaMembroPapelEnum.MESTRE));
      await expect(service.recuperarCena({ id: 900 }, mestre)).resolves.toMatchObject({ id: 900 });
    });

    it('cena aberta: o jogador recebe a cena com o encontro no recorte dele', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(membroComPapel(TipoCampanhaMembroPapelEnum.JOGADOR));
      cenaRepositorio.recuperarPorId.mockResolvedValue(criarCenaLinha({ status: CenaStatusEnum.ATIVA }));

      const cena = await service.recuperarCena({ id: 900 }, jogador);

      expect(encontroService.recuperarEncontro).toHaveBeenCalledWith({ id: 50 }, jogador);
      expect(cena).toMatchObject({ id: 900, status: CenaStatusEnum.ATIVA, encontro: { id: 50 } });
    });

    it('cena sem iniciativa tem encontro null', async () => {
      cenaRepositorio.recuperarPorId.mockResolvedValue(
        criarCenaLinha({ tipo: CenaTipoEnum.RESISTENCIA, encontroId: null }),
      );

      const cena = await service.recuperarCena({ id: 900 }, mestre);

      expect(cena.encontro).toBeNull();
    });

    it('listagem: o mestre recebe tudo; o jogador só a ativa; o espectador mantém o histórico (m7-22)', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(membroComPapel(TipoCampanhaMembroPapelEnum.JOGADOR));
      await service.listarPorCampanha({ campanhaId: 5 }, jogador);
      campanhaRepositorio.recuperarMembro.mockResolvedValue(membroComPapel(TipoCampanhaMembroPapelEnum.MESTRE));
      await service.listarPorCampanha({ campanhaId: 5 }, mestre);
      campanhaRepositorio.recuperarMembro.mockResolvedValue(membroComPapel(TipoCampanhaMembroPapelEnum.ESPECTADOR));
      await service.listarPorCampanha({ campanhaId: 5 }, jogador);

      expect(cenaRepositorio.listarPorCampanha.mock.calls.map(([dto]) => dto)).toEqual([
        { campanhaId: 5, incluirPlanejadas: false, incluirEncerradas: false },
        { campanhaId: 5, incluirPlanejadas: true, incluirEncerradas: true },
        { campanhaId: 5, incluirPlanejadas: false, incluirEncerradas: true },
      ]);
    });
  });

  describe('jogador acessa somente a cena atual', () => {
    it.each([
      [TipoCampanhaMembroPapelEnum.MESTRE, CenaStatusEnum.PLANEJADA, true],
      [TipoCampanhaMembroPapelEnum.MESTRE, CenaStatusEnum.ATIVA, true],
      [TipoCampanhaMembroPapelEnum.MESTRE, CenaStatusEnum.ENCERRADA, true],
      [TipoCampanhaMembroPapelEnum.JOGADOR, CenaStatusEnum.PLANEJADA, false],
      [TipoCampanhaMembroPapelEnum.JOGADOR, CenaStatusEnum.ATIVA, true],
      [TipoCampanhaMembroPapelEnum.JOGADOR, CenaStatusEnum.ENCERRADA, false],
      [TipoCampanhaMembroPapelEnum.ESPECTADOR, CenaStatusEnum.PLANEJADA, false],
      [TipoCampanhaMembroPapelEnum.ESPECTADOR, CenaStatusEnum.ATIVA, true],
      [TipoCampanhaMembroPapelEnum.ESPECTADOR, CenaStatusEnum.ENCERRADA, true],
    ])('%s lendo cena %s → permitido: %s', async (papel, status, permitido) => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(membroComPapel(papel));
      cenaRepositorio.recuperarPorId.mockResolvedValue(criarCenaLinha({ status }));

      const leitura = service.recuperarCena({ id: 900 }, jogador);

      if (permitido) {
        await expect(leitura).resolves.toMatchObject({ id: 900, status });
      } else {
        await expect(leitura).rejects.toThrow(UnauthorizedAccessException);
        expect(encontroService.recuperarEncontro).not.toHaveBeenCalled();
      }
    });

    it('URL direta de cena encerrada: 403 ao jogador, sem tocar no encontro legado', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(membroComPapel(TipoCampanhaMembroPapelEnum.JOGADOR));
      cenaRepositorio.recuperarPorId.mockResolvedValue(criarCenaLinha({ status: CenaStatusEnum.ENCERRADA }));

      await expect(service.recuperarCena({ id: 900 }, jogador)).rejects.toThrow(UnauthorizedAccessException);
      expect(encontroService.recuperarEncontro).not.toHaveBeenCalled();
    });

    it('cena de outra campanha: 403 (não é membro dela), mesmo ativa', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(null);
      cenaRepositorio.recuperarPorId.mockResolvedValue(
        criarCenaLinha({ campanhaId: 77, status: CenaStatusEnum.ATIVA }),
      );

      await expect(service.recuperarCena({ id: 900 }, jogador)).rejects.toThrow(UnauthorizedAccessException);
      await expect(service.listarPorCampanha({ campanhaId: 77 }, jogador)).rejects.toThrow(
        UnauthorizedAccessException,
      );
      expect(campanhaRepositorio.recuperarMembro).toHaveBeenCalledWith({ campanhaId: 77, usuarioId: 2 });
    });
  });
});
