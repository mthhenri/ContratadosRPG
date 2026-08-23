import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  EncontroCombatenteLinhaDto,
  EncontroLinhaDto,
} from '@contratados-rpg/shared/dtos/encontro';
import {
  CadenciaEnum,
  EncontroEventoTipoEnum,
  EncontroStatusEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
  TipoUsuarioEnum,
} from '@contratados-rpg/shared/enums';
import { BusinessException } from '../../core/exceptions';
import type { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { FichaService } from '../ficha/ficha.service';
import type { EncontroRepository } from './encontro.repository';
import { EncontroService } from './encontro.service';

const mestre: JwtPayload = {
  sub: 1,
  login: 'mestre',
  tipo: TipoUsuarioEnum.NORMAL,
  tokenVersao: 1,
};

const jogador: JwtPayload = {
  sub: 7,
  login: 'jogador',
  tipo: TipoUsuarioEnum.NORMAL,
  tokenVersao: 1,
};

function criarEncontroLinha(overrides: Partial<EncontroLinhaDto> = {}): EncontroLinhaDto {
  return {
    id: 50,
    campanhaId: 5,
    nome: 'Operação Cinza-Pálido',
    status: EncontroStatusEnum.ATIVO,
    rodadaAtual: 1,
    turnoIndice: 0,
    ...overrides,
  };
}

function criarCombatenteLinha(
  overrides: Partial<EncontroCombatenteLinhaDto> = {},
): EncontroCombatenteLinhaDto {
  return {
    id: 100,
    encontroId: 50,
    fichaId: null,
    nomeAvulso: 'Sujeito Contido',
    iniciativa: 10,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: 1,
    vidaMaximaAvulso: 16,
    vidaAtualAvulso: 9,
    condicoes: [],
    iniciativaFormulaCustom: null,
    fichaNome: null,
    fichaCor: null,
    fichaImagemUrl: null,
    fichaImagemFoco: null,
    tipoFicha: null,
    fichaDados: null,
    fichaOculta: null,
    fichaDonoNome: null,
    ...overrides,
  };
}

/** Combatente com ficha de agente — vida e Energia moram em `dados.estado`. */
function criarAgenteLinha(
  overrides: Partial<EncontroCombatenteLinhaDto> = {},
): EncontroCombatenteLinhaDto {
  return criarCombatenteLinha({
    id: 200,
    fichaId: 20,
    nomeAvulso: null,
    vidaMaximaAvulso: null,
    vidaAtualAvulso: null,
    fichaNome: 'K. Amaral',
    tipoFicha: TipoFichaEnum.JOGADOR,
    fichaDados: {
      classe: 'COMBATENTE',
      nivel: 3,
      atributos: { destreza: 4, vigor: 3 },
      estado: { vidaAtual: 31, energiaAtual: 6, vidaMaxima: 31, energiaMaxima: 16 },
      derivados: { defesa: 14, esquiva: 15, bloqueio: 6, contraAtaque: 9 },
    } as unknown as EncontroCombatenteLinhaDto['fichaDados'],
    ...overrides,
  });
}

describe('EncontroService — condução (m7-04)', () => {
  let encontroRepositorio: Record<string, ReturnType<typeof vi.fn>>;
  let campanhaRepositorio: { recuperarMembro: ReturnType<typeof vi.fn> };
  let fichaService: {
    recuperarFicha: ReturnType<typeof vi.fn>;
    listarFichas: ReturnType<typeof vi.fn>;
    alterarVitalidade: ReturnType<typeof vi.fn>;
    alterarVitalidadeCriatura: ReturnType<typeof vi.fn>;
  };
  let campanhaGateway: {
    emitirEncontroAlterado: ReturnType<typeof vi.fn>;
    emitirEncontroIniciativaPedido: ReturnType<typeof vi.fn>;
  };
  let service: EncontroService;

  beforeEach(() => {
    encontroRepositorio = {
      criarEncontro: vi.fn(),
      recuperarPorId: vi.fn().mockResolvedValue(criarEncontroLinha()),
      recuperarAbertoPorCampanha: vi.fn().mockResolvedValue(null),
      listarPorCampanha: vi.fn(),
      listarCombatentes: vi.fn().mockResolvedValue([]),
      recuperarCombatentePorId: vi.fn(),
      recuperarMaiorOrdem: vi.fn().mockResolvedValue(0),
      adicionarCombatente: vi.fn(),
      removerCombatente: vi.fn(),
      alterarIniciativa: vi.fn(),
      alterarStatus: vi.fn(),
      alterarTurno: vi.fn(),
      alterarCondicoes: vi.fn(),
      alterarVidaAvulso: vi.fn(),
      registrarEvento: vi.fn(),
      listarEventos: vi.fn().mockResolvedValue([]),
      combatentePertenceAoUsuario: vi.fn(),
    };
    campanhaRepositorio = {
      recuperarMembro: vi.fn().mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE }),
    };
    fichaService = {
      recuperarFicha: vi.fn(),
      listarFichas: vi.fn().mockResolvedValue([{ id: 20 }]),
      alterarVitalidade: vi.fn(),
      alterarVitalidadeCriatura: vi.fn(),
    };
    campanhaGateway = {
      emitirEncontroAlterado: vi.fn(),
      emitirEncontroIniciativaPedido: vi.fn(),
    };
    service = new EncontroService(
      encontroRepositorio as unknown as EncontroRepository,
      campanhaRepositorio as unknown as CampanhaRepository,
      fichaService as unknown as FichaService,
      campanhaGateway as unknown as CampanhaGateway,
    );
  });

  describe('iniciarEncontro', () => {
    it('recusa começar com alguém sem iniciativa', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(
        criarEncontroLinha({ status: EncontroStatusEnum.MONTAGEM }),
      );
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({ id: 1, iniciativa: 18 }),
        criarCombatenteLinha({ id: 2, iniciativa: null }),
      ]);

      await expect(service.iniciarEncontro({ id: 50 }, mestre)).rejects.toThrow(BusinessException);
      expect(encontroRepositorio.alterarStatus).not.toHaveBeenCalled();
    });

    it('recusa começar sem combatente', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(
        criarEncontroLinha({ status: EncontroStatusEnum.MONTAGEM }),
      );

      await expect(service.iniciarEncontro({ id: 50 }, mestre)).rejects.toThrow(BusinessException);
    });

    it('vai para ATIVO na rodada 1 e abre o log', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(
        criarEncontroLinha({ status: EncontroStatusEnum.MONTAGEM }),
      );
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({ id: 1, iniciativa: 18 }),
      ]);
      encontroRepositorio.alterarStatus.mockResolvedValue(criarEncontroLinha());

      await service.iniciarEncontro({ id: 50 }, mestre);

      expect(encontroRepositorio.alterarStatus).toHaveBeenCalledWith({
        id: 50,
        status: EncontroStatusEnum.ATIVO,
        rodadaAtual: 1,
        turnoIndice: 0,
      });
      expect(encontroRepositorio.registrarEvento).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: EncontroEventoTipoEnum.RODADA_INICIADA,
          texto: 'Rodada 1 iniciada',
        }),
      );
    });

    it('encontro já ativo não é iniciado de novo', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());

      await expect(service.iniciarEncontro({ id: 50 }, mestre)).rejects.toThrow(BusinessException);
    });
  });

  describe('avancarTurno', () => {
    it('permite ao jogador encerrar o turno do combatente da própria ficha', async () => {
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarAgenteLinha({ id: 1, iniciativa: 18 }),
        criarCombatenteLinha({ id: 2, iniciativa: 10 }),
      ]);
      encontroRepositorio.combatentePertenceAoUsuario.mockResolvedValue(true);
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha({ turnoIndice: 0 }));
      encontroRepositorio.alterarTurno.mockResolvedValue(criarEncontroLinha({ turnoIndice: 1 }));
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await service.avancarTurno({ id: 50 }, jogador);

      expect(encontroRepositorio.alterarTurno).toHaveBeenCalledWith({
        id: 50,
        rodadaAtual: 1,
        turnoIndice: 1,
      });
    });

    it('recusa avanço do jogador quando o turno atual pertence a outra ficha', async () => {
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarAgenteLinha({ id: 1, iniciativa: 18 }),
        criarAgenteLinha({ id: 2, iniciativa: 10 }),
      ]);
      encontroRepositorio.combatentePertenceAoUsuario.mockResolvedValue(false);
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha({ turnoIndice: 0 }));
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(service.avancarTurno({ id: 50 }, jogador)).rejects.toThrow();
      expect(encontroRepositorio.alterarTurno).not.toHaveBeenCalled();
    });

    it('percorre a sequência intercalada da Cadência antes de virar a rodada', async () => {
      // Criatura Dupla [18] + Agente A [17] + Agente B [3] → 4 slots na rodada.
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({ id: 1, iniciativa: 18, cadencia: CadenciaEnum.DUPLA }),
        criarCombatenteLinha({ id: 2, iniciativa: 17 }),
        criarCombatenteLinha({ id: 3, iniciativa: 3 }),
      ]);
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha({ turnoIndice: 1 }));
      encontroRepositorio.alterarTurno.mockResolvedValue(criarEncontroLinha({ turnoIndice: 2 }));

      await service.avancarTurno({ id: 50 }, mestre);

      expect(encontroRepositorio.alterarTurno).toHaveBeenCalledWith({
        id: 50,
        rodadaAtual: 1,
        turnoIndice: 2,
      });
    });

    it('no fim da rodada incrementa a rodada, expira condições e registra tudo', async () => {
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({
          id: 1,
          iniciativa: 18,
          condicoes: [
            { nome: 'Suprimido', rodadasRestantes: 1, perdeTurno: false },
            { nome: 'Sangramento', rodadasRestantes: 3, perdeTurno: false },
          ],
        }),
      ]);
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha({ turnoIndice: 0 }));
      encontroRepositorio.alterarTurno.mockResolvedValue(
        criarEncontroLinha({ rodadaAtual: 2, turnoIndice: 0 }),
      );

      await service.avancarTurno({ id: 50 }, mestre);

      // Suprimido acabou; Sangramento sobrevive decrementado.
      expect(encontroRepositorio.alterarCondicoes).toHaveBeenCalledWith({
        id: 1,
        condicoes: [{ nome: 'Sangramento', rodadasRestantes: 2, perdeTurno: false }],
      });
      expect(encontroRepositorio.registrarEvento).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: EncontroEventoTipoEnum.CONDICAO_EXPIRADA,
          rodada: 2,
        }),
      );
      expect(encontroRepositorio.registrarEvento).toHaveBeenCalledWith(
        expect.objectContaining({ texto: 'Rodada 2 iniciada' }),
      );
      expect(encontroRepositorio.alterarTurno).toHaveBeenCalledWith({
        id: 50,
        rodadaAtual: 2,
        turnoIndice: 0,
      });
    });

    it('quem está sob perdeTurno tem o turno consumido, com registro no log', async () => {
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({ id: 1, iniciativa: 18 }),
        criarCombatenteLinha({
          id: 2,
          iniciativa: 10,
          nomeAvulso: 'Sujeito Contido',
          condicoes: [{ nome: 'Inconsciente', rodadasRestantes: null, perdeTurno: true }],
        }),
        criarCombatenteLinha({ id: 3, iniciativa: 5 }),
      ]);
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha({ turnoIndice: 0 }));
      encontroRepositorio.alterarTurno
        .mockResolvedValueOnce(criarEncontroLinha({ turnoIndice: 1 }))
        .mockResolvedValueOnce(criarEncontroLinha({ turnoIndice: 2 }));

      await service.avancarTurno({ id: 50 }, mestre);

      expect(encontroRepositorio.registrarEvento).toHaveBeenCalledWith(
        expect.objectContaining({ texto: 'Sujeito Contido perdeu o turno' }),
      );
      // Parou no slot seguinte (índice 2), não no do combatente impedido.
      expect(encontroRepositorio.alterarTurno).toHaveBeenLastCalledWith({
        id: 50,
        rodadaAtual: 1,
        turnoIndice: 2,
      });
    });
  });

  describe('voltarTurno', () => {
    it('não retrocede além do primeiro turno da rodada 1', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(
        criarEncontroLinha({ rodadaAtual: 1, turnoIndice: 0 }),
      );

      await expect(service.voltarTurno({ id: 50 }, mestre)).rejects.toThrow(BusinessException);
    });

    it('volta para o último slot da rodada anterior', async () => {
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({ id: 1, iniciativa: 18 }),
        criarCombatenteLinha({ id: 2, iniciativa: 10 }),
      ]);
      encontroRepositorio.recuperarPorId.mockResolvedValue(
        criarEncontroLinha({ rodadaAtual: 3, turnoIndice: 0 }),
      );
      encontroRepositorio.alterarTurno.mockResolvedValue(
        criarEncontroLinha({ rodadaAtual: 2, turnoIndice: 1 }),
      );

      await service.voltarTurno({ id: 50 }, mestre);

      expect(encontroRepositorio.alterarTurno).toHaveBeenCalledWith({
        id: 50,
        rodadaAtual: 2,
        turnoIndice: 1,
      });
    });
  });

  describe('ajustarVida — fonte única', () => {
    it('dano em agente muda a FICHA, nunca uma cópia no encontro', async () => {
      const agente = criarAgenteLinha();
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(agente);

      await service.ajustarVida({ id: 200, delta: -11, origemTexto: 'V. Corvalho' }, mestre);

      expect(fichaService.alterarVitalidade).toHaveBeenCalledWith(
        { id: 20, estado: { vidaAtual: 20 } },
        mestre,
      );
      expect(encontroRepositorio.alterarVidaAvulso).not.toHaveBeenCalled();
      expect(encontroRepositorio.registrarEvento).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: EncontroEventoTipoEnum.DANO,
          texto: 'K. Amaral sofreu 11 de dano de V. Corvalho',
        }),
      );
    });

    it('dano em criatura usa o caminho de criatura da FichaService', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(
        criarCombatenteLinha({
          id: 300,
          fichaId: 30,
          nomeAvulso: null,
          vidaMaximaAvulso: null,
          vidaAtualAvulso: null,
          fichaNome: 'SCP-1471-A',
          tipoFicha: TipoFichaEnum.CRIATURA,
          fichaDados: {
            vidaAtual: 40,
            vidaMaxima: 52,
            defesa: 17,
            atributos: { destreza: 4 },
          } as unknown as EncontroCombatenteLinhaDto['fichaDados'],
        }),
      );

      await service.ajustarVida({ id: 300, delta: -11, origemTexto: null }, mestre);

      expect(fichaService.alterarVitalidadeCriatura).toHaveBeenCalledWith(
        { id: 30, vidaAtual: 29 },
        mestre,
      );
      expect(fichaService.alterarVitalidade).not.toHaveBeenCalled();
    });

    it('dano em avulso muda só o estado local do encontro', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(criarCombatenteLinha());

      await service.ajustarVida({ id: 100, delta: -4, origemTexto: null }, mestre);

      expect(encontroRepositorio.alterarVidaAvulso).toHaveBeenCalledWith({
        id: 100,
        vidaAtualAvulso: 5,
      });
      expect(fichaService.alterarVitalidade).not.toHaveBeenCalled();
      expect(fichaService.alterarVitalidadeCriatura).not.toHaveBeenCalled();
    });

    it('cura registra o evento de cura', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(criarCombatenteLinha());

      await service.ajustarVida({ id: 100, delta: 3, origemTexto: null }, mestre);

      expect(encontroRepositorio.registrarEvento).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: EncontroEventoTipoEnum.CURA }),
      );
    });

    it('encontro encerrado não aceita dano', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(criarCombatenteLinha());
      encontroRepositorio.recuperarPorId.mockResolvedValue(
        criarEncontroLinha({ status: EncontroStatusEnum.ENCERRADO }),
      );

      await expect(
        service.ajustarVida({ id: 100, delta: -5, origemTexto: null }, mestre),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('ajustarEnergia', () => {
    it('gasto de Energia do agente vai para a ficha', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(criarAgenteLinha());

      await service.ajustarEnergia(
        { id: 200, delta: -4, origemTexto: 'Sobrecarga Sináptica' },
        mestre,
      );

      expect(fichaService.alterarVitalidade).toHaveBeenCalledWith(
        { id: 20, estado: { energiaAtual: 2 } },
        mestre,
      );
      expect(encontroRepositorio.registrarEvento).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: EncontroEventoTipoEnum.ENERGIA,
          texto: 'K. Amaral gastou 4 de Energia de Sobrecarga Sináptica',
        }),
      );
    });

    it('criatura e avulso não têm Energia — o ajuste é recusado', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(criarCombatenteLinha());

      await expect(
        service.ajustarEnergia({ id: 100, delta: -2, origemTexto: null }, mestre),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('condições', () => {
    it('aplicar a mesma condição substitui a duração em vez de duplicar', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(
        criarCombatenteLinha({
          condicoes: [{ nome: 'Sangramento', rodadasRestantes: 1, perdeTurno: false }],
        }),
      );

      await service.aplicarCondicao(
        { id: 100, nome: 'Sangramento', rodadasRestantes: 3, perdeTurno: false },
        mestre,
      );

      expect(encontroRepositorio.alterarCondicoes).toHaveBeenCalledWith({
        id: 100,
        condicoes: [{ nome: 'Sangramento', rodadasRestantes: 3, perdeTurno: false }],
      });
    });

    it('remover tira o marcador e registra no log', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(
        criarCombatenteLinha({
          condicoes: [
            { nome: 'Sangramento', rodadasRestantes: 2, perdeTurno: false },
            { nome: 'Suprimido', rodadasRestantes: 1, perdeTurno: false },
          ],
        }),
      );

      await service.removerCondicao({ id: 100, nome: 'Sangramento' }, mestre);

      expect(encontroRepositorio.alterarCondicoes).toHaveBeenCalledWith({
        id: 100,
        condicoes: [{ nome: 'Suprimido', rodadasRestantes: 1, perdeTurno: false }],
      });
    });
  });

  describe('pedirIniciativa', () => {
    it('transmite o chamado aos jogadores sem tocar em iniciativa', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(
        criarEncontroLinha({ status: EncontroStatusEnum.MONTAGEM }),
      );

      await service.pedirIniciativa({ id: 50 }, mestre);

      expect(campanhaGateway.emitirEncontroIniciativaPedido).toHaveBeenCalledWith({
        id: 50,
        campanhaId: 5,
      });
      expect(encontroRepositorio.alterarIniciativa).not.toHaveBeenCalled();
    });
  });

  describe('encerrarEncontro', () => {
    it('vai para ENCERRADO preservando rodada/turno em que parou', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(
        criarEncontroLinha({ rodadaAtual: 3, turnoIndice: 2 }),
      );
      encontroRepositorio.alterarStatus.mockResolvedValue(
        criarEncontroLinha({ status: EncontroStatusEnum.ENCERRADO, rodadaAtual: 3, turnoIndice: 2 }),
      );

      await service.encerrarEncontro({ id: 50 }, mestre);

      expect(encontroRepositorio.alterarStatus).toHaveBeenCalledWith({
        id: 50,
        status: EncontroStatusEnum.ENCERRADO,
        rodadaAtual: 3,
        turnoIndice: 2,
      });
    });
  });
});
