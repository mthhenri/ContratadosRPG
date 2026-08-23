import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  EncontroCombatenteLinhaDto,
  EncontroLinhaDto,
} from '@contratados-rpg/shared/dtos/encontro';
import {
  CadenciaEnum,
  EncontroStatusEnum,
  FormacaoBonusEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
  TipoUsuarioEnum,
} from '@contratados-rpg/shared/enums';
import { BusinessException, UnauthorizedAccessException } from '../../core/exceptions';
import type { ArmazenamentoProvedor } from '../../core/armazenamento';
import type { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { FichaService } from '../ficha/ficha.service';
import type { EncontroRepository } from './encontro.repository';
import { EncontroService } from './encontro.service';

interface EncontroRepositorioDublado {
  criarEncontro: ReturnType<typeof vi.fn>;
  recuperarPorId: ReturnType<typeof vi.fn>;
  recuperarAbertoPorCampanha: ReturnType<typeof vi.fn>;
  listarPorCampanha: ReturnType<typeof vi.fn>;
  listarCombatentes: ReturnType<typeof vi.fn>;
  recuperarCombatentePorId: ReturnType<typeof vi.fn>;
  recuperarMaiorOrdem: ReturnType<typeof vi.fn>;
  adicionarCombatente: ReturnType<typeof vi.fn>;
  removerCombatente: ReturnType<typeof vi.fn>;
  alterarIniciativa: ReturnType<typeof vi.fn>;
  alterarIdentidadeAvulso: ReturnType<typeof vi.fn>;
  listarEventos: ReturnType<typeof vi.fn>;
}

const mestre: JwtPayload = {
  sub: 1,
  login: 'mestre',
  tipo: TipoUsuarioEnum.NORMAL,
  tokenVersao: 1,
};
const jogador: JwtPayload = {
  sub: 2,
  login: 'jogador',
  tipo: TipoUsuarioEnum.NORMAL,
  tokenVersao: 1,
};

function criarEncontroLinha(overrides: Partial<EncontroLinhaDto> = {}): EncontroLinhaDto {
  return {
    id: 50,
    campanhaId: 5,
    nome: 'Operação Cinza-Pálido',
    status: EncontroStatusEnum.MONTAGEM,
    rodadaAtual: 0,
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
    iniciativa: null,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: 1,
    vidaMaximaAvulso: 16,
    vidaAtualAvulso: 9,
    condicoes: [],
    fichaNome: null,
    fichaCor: null,
    fichaImagemUrl: null,
    fichaImagemFoco: null,
    tipoFicha: null,
    fichaDados: null,
    fichaOculta: null,
    fichaDonoNome: null,
    corAvulso: '#4a9d6b',
    imagemUrlAvulso: null,
    ...overrides,
  };
}

describe('EncontroService', () => {
  let encontroRepositorio: EncontroRepositorioDublado;
  let campanhaRepositorio: { recuperarMembro: ReturnType<typeof vi.fn> };
  let fichaService: {
    recuperarFicha: ReturnType<typeof vi.fn>;
    listarFichas: ReturnType<typeof vi.fn>;
  };
  let campanhaGateway: { emitirEncontroAlterado: ReturnType<typeof vi.fn> };
  let armazenamentoProvedor: {
    salvarImagem: ReturnType<typeof vi.fn>;
    excluirImagem: ReturnType<typeof vi.fn>;
  };
  let service: EncontroService;

  beforeEach(() => {
    encontroRepositorio = {
      criarEncontro: vi.fn(),
      recuperarPorId: vi.fn(),
      recuperarAbertoPorCampanha: vi.fn().mockResolvedValue(null),
      listarPorCampanha: vi.fn(),
      listarCombatentes: vi.fn().mockResolvedValue([]),
      recuperarCombatentePorId: vi.fn(),
      recuperarMaiorOrdem: vi.fn().mockResolvedValue(0),
      adicionarCombatente: vi.fn(),
      removerCombatente: vi.fn(),
      alterarIniciativa: vi.fn(),
      alterarIdentidadeAvulso: vi.fn(),
      listarEventos: vi.fn().mockResolvedValue([]),
    };
    campanhaRepositorio = {
      recuperarMembro: vi.fn().mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE }),
    };
    fichaService = { recuperarFicha: vi.fn(), listarFichas: vi.fn().mockResolvedValue([]) };
    campanhaGateway = { emitirEncontroAlterado: vi.fn() };
    armazenamentoProvedor = { salvarImagem: vi.fn(), excluirImagem: vi.fn() };
    service = new EncontroService(
      encontroRepositorio as unknown as EncontroRepository,
      campanhaRepositorio as unknown as CampanhaRepository,
      fichaService as unknown as FichaService,
      campanhaGateway as unknown as CampanhaGateway,
      armazenamentoProvedor as unknown as ArmazenamentoProvedor,
    );
  });

  describe('criarEncontro', () => {
    it('cria em MONTAGEM e transmite o estado depois de persistir', async () => {
      const encontroCriado = criarEncontroLinha();
      encontroRepositorio.criarEncontro.mockResolvedValue(encontroCriado);

      const resultado = await service.criarEncontro(
        { campanhaId: 5, nome: 'Operação Cinza-Pálido' },
        mestre,
      );

      expect(encontroRepositorio.criarEncontro).toHaveBeenCalledWith({
        campanhaId: 5,
        nome: 'Operação Cinza-Pálido',
        status: EncontroStatusEnum.MONTAGEM,
      });
      expect(resultado.status).toBe(EncontroStatusEnum.MONTAGEM);
      expect(campanhaGateway.emitirEncontroAlterado).toHaveBeenCalled();
    });

    it('recusa um segundo encontro enquanto houver um não-encerrado na campanha', async () => {
      encontroRepositorio.recuperarAbertoPorCampanha.mockResolvedValue(criarEncontroLinha());

      await expect(service.criarEncontro({ campanhaId: 5, nome: 'Outro' }, mestre)).rejects.toThrow(
        BusinessException,
      );
      expect(encontroRepositorio.criarEncontro).not.toHaveBeenCalled();
    });

    it('jogador não cria encontro', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(
        service.criarEncontro({ campanhaId: 5, nome: 'Emboscada' }, jogador),
      ).rejects.toThrow(UnauthorizedAccessException);
    });

    it('quem não é membro da campanha não cria encontro', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(null);

      await expect(
        service.criarEncontro({ campanhaId: 5, nome: 'Emboscada' }, jogador),
      ).rejects.toThrow(UnauthorizedAccessException);
    });
  });

  describe('adicionarCombatente', () => {
    beforeEach(() => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
    });

    it('criatura entra com a Cadência do próprio documento', async () => {
      fichaService.recuperarFicha.mockResolvedValue({
        id: 10,
        campanhaId: 5,
        dados: { cadencia: CadenciaEnum.DUPLA },
      });

      await service.adicionarCombatente(
        { encontroId: 50, fichaId: 10, nomeAvulso: null, vidaMaximaAvulso: null, cadencia: null },
        mestre,
      );

      expect(encontroRepositorio.adicionarCombatente).toHaveBeenCalledWith(
        expect.objectContaining({ fichaId: 10, cadencia: CadenciaEnum.DUPLA, ordem: 1 }),
      );
    });

    it('agente entra como SINGULAR — Cadência é conceito de criatura', async () => {
      fichaService.recuperarFicha.mockResolvedValue({
        id: 11,
        campanhaId: 5,
        dados: { classe: 'COMBATENTE' },
      });

      await service.adicionarCombatente(
        { encontroId: 50, fichaId: 11, nomeAvulso: null, vidaMaximaAvulso: null, cadencia: null },
        mestre,
      );

      expect(encontroRepositorio.adicionarCombatente).toHaveBeenCalledWith(
        expect.objectContaining({ fichaId: 11, cadencia: CadenciaEnum.SINGULAR }),
      );
    });

    it('recusa ficha de outra campanha', async () => {
      fichaService.recuperarFicha.mockResolvedValue({ id: 12, campanhaId: 99, dados: {} });

      await expect(
        service.adicionarCombatente(
          { encontroId: 50, fichaId: 12, nomeAvulso: null, vidaMaximaAvulso: null, cadencia: null },
          mestre,
        ),
      ).rejects.toThrow(BusinessException);
      expect(encontroRepositorio.adicionarCombatente).not.toHaveBeenCalled();
    });

    it('avulso nasce com a vida cheia e a cor obrigatória escolhida', async () => {
      await service.adicionarCombatente(
        {
          encontroId: 50,
          fichaId: null,
          nomeAvulso: 'Sujeito Contido',
          vidaMaximaAvulso: 16,
          cadencia: CadenciaEnum.SINGULAR,
          corAvulso: '#d9a441',
        },
        mestre,
      );

      expect(encontroRepositorio.adicionarCombatente).toHaveBeenCalledWith(
        expect.objectContaining({
          fichaId: null,
          nomeAvulso: 'Sujeito Contido',
          vidaMaximaAvulso: 16,
          vidaAtualAvulso: 16,
          corAvulso: '#d9a441',
        }),
      );
    });

    it('recusa avulso sem cor', async () => {
      await expect(
        service.adicionarCombatente(
          {
            encontroId: 50,
            fichaId: null,
            nomeAvulso: 'Sem identidade',
            vidaMaximaAvulso: 10,
            cadencia: CadenciaEnum.SINGULAR,
            corAvulso: null,
          },
          mestre,
        ),
      ).rejects.toThrow(BusinessException);
      expect(encontroRepositorio.adicionarCombatente).not.toHaveBeenCalled();
    });

    it('preserva a quantidade declarada de turnos do avulso Frenético', async () => {
      await service.adicionarCombatente(
        {
          encontroId: 50,
          fichaId: null,
          nomeAvulso: 'Sujeito Frenético',
          vidaMaximaAvulso: 20,
          cadencia: CadenciaEnum.FRENETICA,
          turnosPorRodada: 6,
          corAvulso: '#d53030',
        },
        mestre,
      );

      expect(encontroRepositorio.adicionarCombatente).toHaveBeenCalledWith(
        expect.objectContaining({ cadencia: CadenciaEnum.FRENETICA, turnosPorRodada: 6 }),
      );
    });

    it('avulso sem nome ou sem vida é recusado', async () => {
      await expect(
        service.adicionarCombatente(
          { encontroId: 50, fichaId: null, nomeAvulso: '', vidaMaximaAvulso: 10, cadencia: null },
          mestre,
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('encontro encerrado não aceita combatente novo', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(
        criarEncontroLinha({ status: EncontroStatusEnum.ENCERRADO }),
      );

      await expect(
        service.adicionarCombatente(
          { encontroId: 50, fichaId: null, nomeAvulso: 'X', vidaMaximaAvulso: 5, cadencia: null },
          mestre,
        ),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('identidade do avulso', () => {
    beforeEach(() => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(criarCombatenteLinha());
    });

    it('altera a cor somente para combatente avulso', async () => {
      await service.alterarIdentidadeAvulso({ id: 100, cor: '#4c8dd0' }, mestre);

      expect(encontroRepositorio.alterarIdentidadeAvulso).toHaveBeenCalledWith({
        id: 100,
        corAvulso: '#4c8dd0',
        imagemUrlAvulso: null,
      });
    });

    it('substitui a imagem e exclui o arquivo anterior', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(
        criarCombatenteLinha({ imagemUrlAvulso: '/uploads/anterior.webp' }),
      );
      armazenamentoProvedor.salvarImagem.mockResolvedValue({ caminho: '/uploads/nova.png' });

      await service.alterarImagemAvulso(
        {
          id: 100,
          arquivo: { conteudo: new Uint8Array([1]), mimetype: 'image/png', tamanho: 1 },
        },
        mestre,
      );

      expect(armazenamentoProvedor.excluirImagem).toHaveBeenCalledWith({
        caminho: '/uploads/anterior.webp',
      });
      expect(encontroRepositorio.alterarIdentidadeAvulso).toHaveBeenCalledWith({
        id: 100,
        corAvulso: '#4a9d6b',
        imagemUrlAvulso: '/uploads/nova.png',
      });
    });

    it('remove a imagem do avulso e limpa o armazenamento', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(
        criarCombatenteLinha({ imagemUrlAvulso: '/uploads/anterior.webp' }),
      );

      await service.excluirImagemAvulso({ id: 100 }, mestre);

      expect(armazenamentoProvedor.excluirImagem).toHaveBeenCalledWith({
        caminho: '/uploads/anterior.webp',
      });
      expect(encontroRepositorio.alterarIdentidadeAvulso).toHaveBeenCalledWith({
        id: 100,
        corAvulso: '#4a9d6b',
        imagemUrlAvulso: null,
      });
    });
  });

  describe('atribuirIniciativa', () => {
    beforeEach(() => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
    });

    it('mestre atribui a iniciativa de qualquer combatente', async () => {
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(criarCombatenteLinha());

      await service.atribuirIniciativa({ id: 100, iniciativa: 18 }, mestre);

      expect(encontroRepositorio.alterarIniciativa).toHaveBeenCalledWith({
        id: 100,
        iniciativa: 18,
      });
    });

    it('jogador atribui a do próprio combatente, validando pela permissão da ficha', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(
        criarCombatenteLinha({ fichaId: 20, nomeAvulso: null, vidaMaximaAvulso: null, vidaAtualAvulso: null }),
      );
      fichaService.recuperarFicha.mockResolvedValue({ id: 20, campanhaId: 5, dados: {} });

      await service.atribuirIniciativa({ id: 100, iniciativa: 15 }, jogador);

      expect(fichaService.recuperarFicha).toHaveBeenCalledWith({ id: 20 }, jogador);
      expect(encontroRepositorio.alterarIniciativa).toHaveBeenCalled();
    });

    it('jogador não atribui iniciativa de combatente avulso', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      encontroRepositorio.recuperarCombatentePorId.mockResolvedValue(criarCombatenteLinha());

      await expect(service.atribuirIniciativa({ id: 100, iniciativa: 12 }, jogador)).rejects.toThrow(
        UnauthorizedAccessException,
      );
      expect(encontroRepositorio.alterarIniciativa).not.toHaveBeenCalled();
    });
  });

  describe('rolarIniciativasFaltantes', () => {
    it('preenche só quem está sem iniciativa, sem sobrescrever o que o jogador já rolou', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({ id: 100, iniciativa: null }),
        criarCombatenteLinha({ id: 101, iniciativa: 24 }),
      ]);

      await service.rolarIniciativasFaltantes(
        { encontroId: 50, iniciativaPorCombatente: { 100: 18, 101: 3 } },
        mestre,
      );

      expect(encontroRepositorio.alterarIniciativa).toHaveBeenCalledTimes(1);
      expect(encontroRepositorio.alterarIniciativa).toHaveBeenCalledWith({
        id: 100,
        iniciativa: 18,
      });
    });
  });

  describe('montagem do estado', () => {
    it('ordena e intercala a Cadência pelo motor puro, ignorando quem ainda não rolou', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({ id: 1, iniciativa: 18, cadencia: CadenciaEnum.DUPLA }),
        criarCombatenteLinha({ id: 2, iniciativa: 17 }),
        criarCombatenteLinha({ id: 3, iniciativa: 3 }),
        criarCombatenteLinha({ id: 4, iniciativa: null }),
      ]);

      const estado = await service.recuperarEncontro({ id: 50 }, mestre);

      // Exemplo canônico do guia: Criatura [18] → Agente A [17] → Criatura (2º) → Agente B [3].
      expect(estado.ordemRodada).toEqual([
        { combatenteId: 1, ocorrencia: 1 },
        { combatenteId: 2, ocorrencia: 1 },
        { combatenteId: 1, ocorrencia: 2 },
        { combatenteId: 3, ocorrencia: 1 },
      ]);
      expect(estado.combatentes).toHaveLength(4);
    });

    it('combatente avulso usa a vida do próprio encontro e não expõe defesas', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
      encontroRepositorio.listarCombatentes.mockResolvedValue([criarCombatenteLinha()]);

      const estado = await service.recuperarEncontro({ id: 50 }, mestre);

      expect(estado.combatentes[0]).toMatchObject({
        nome: 'Sujeito Contido',
        vidaAtual: 9,
        vidaMaxima: 16,
        energiaAtual: null,
        defesa: null,
        esquiva: null,
        resistencias: null,
      });
    });

    it('resistência a dano por tipo (m7-17): soma as linhas da criatura, repetidas incluídas', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({
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
            resistencias: [
              { tipo: 'FISICO', subtipo: null, valor: 10 },
              { tipo: 'FISICO', subtipo: 'Cortante', valor: 5 },
              { tipo: 'GERAL', subtipo: null, valor: 3 },
            ],
          } as unknown as EncontroCombatenteLinhaDto['fichaDados'],
        }),
      ]);

      const estado = await service.recuperarEncontro({ id: 50 }, mestre);

      expect(estado.combatentes[0].resistencias).toEqual({ FISICO: 15, GERAL: 3 });
    });

    it('m7-18: dado extra de Iniciativa por Formação da Origem soma pro agente, 0 pra quem não tem', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({
          id: 1,
          fichaId: 40,
          nomeAvulso: null,
          vidaMaximaAvulso: null,
          vidaAtualAvulso: null,
          fichaNome: 'K. Amaral',
          tipoFicha: TipoFichaEnum.JOGADOR,
          fichaDados: {
            estado: { vidaAtual: 20, vidaMaxima: 20, energiaAtual: 10, energiaMaxima: 10 },
            atributos: { destreza: 4 },
            inventario: { itens: [], amplificadores: [] },
            identidade: {
              origem: {
                formacao: [
                  {
                    bonus: FormacaoBonusEnum.PERICIA_DADO_INICIATIVA,
                    parametro: null,
                    texto: 'Reflexos treinados',
                  },
                ],
              },
            },
          } as unknown as EncontroCombatenteLinhaDto['fichaDados'],
        }),
        criarCombatenteLinha({ id: 2 }),
      ]);

      const estado = await service.recuperarEncontro({ id: 50 }, mestre);

      expect(estado.combatentes.find((combatente) => combatente.id === 1)?.dadoExtraIniciativa).toBe(1);
      expect(estado.combatentes.find((combatente) => combatente.id === 2)?.dadoExtraIniciativa).toBe(0);
    });

    it('criatura expõe só Defesa — sem Esquiva, Bloqueio ou Contra-Ataque', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({
          id: 200,
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
      ]);

      const estado = await service.recuperarEncontro({ id: 50 }, mestre);

      expect(estado.combatentes[0]).toMatchObject({
        nome: 'SCP-1471-A',
        vidaAtual: 40,
        vidaMaxima: 52,
        defesa: 17,
        esquiva: null,
        bloqueio: null,
        contraAtaque: null,
        energiaAtual: null,
      });
    });

    it('jogador só lê por inteiro a ficha que ele já podia abrir fora do encontro', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      // O jogador enxerga a própria ficha (40); a criatura (30) o mestre ainda não revelou.
      fichaService.listarFichas.mockResolvedValue([{ id: 40 }]);
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({
          id: 200,
          iniciativa: 21,
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
        criarCombatenteLinha({
          id: 201,
          iniciativa: 14,
          fichaId: 40,
          nomeAvulso: null,
          vidaMaximaAvulso: null,
          vidaAtualAvulso: null,
          fichaNome: 'K. Amaral',
          tipoFicha: TipoFichaEnum.CRIATURA,
          fichaDados: {
            vidaAtual: 31,
            vidaMaxima: 31,
            defesa: 14,
            atributos: { destreza: 4 },
          } as unknown as EncontroCombatenteLinhaDto['fichaDados'],
        }),
      ]);

      const estado = await service.recuperarEncontro({ id: 50 }, jogador);

      const [criatura, propria] = estado.combatentes;
      expect(criatura).toMatchObject({
        nome: 'SCP-1471-A',
        iniciativa: 21,
        revelado: false,
        vidaAtual: 0,
        vidaMaxima: 0,
        defesa: null,
      });
      expect(propria).toMatchObject({ revelado: true, vidaAtual: 31, defesa: 14 });
      // A ordem da rodada é calculada **antes** do recorte: esconder a Vida não pode mudar de
      // quem é a vez.
      expect(estado.ordemRodada.map((slot) => slot.combatenteId)).toEqual([200, 201]);
    });

    it('jogador não-membro não lê o encontro', async () => {
      encontroRepositorio.recuperarPorId.mockResolvedValue(criarEncontroLinha());
      campanhaRepositorio.recuperarMembro.mockResolvedValue(null);

      await expect(service.recuperarEncontro({ id: 50 }, jogador)).rejects.toThrow(
        UnauthorizedAccessException,
      );
    });
  });

  describe('sincronizarFichaAlterada', () => {
    it('não faz nada quando a ficha não pertence a nenhuma campanha', async () => {
      await service.sincronizarFichaAlterada(30, null);

      expect(encontroRepositorio.recuperarAbertoPorCampanha).not.toHaveBeenCalled();
      expect(campanhaGateway.emitirEncontroAlterado).not.toHaveBeenCalled();
    });

    it('não faz nada quando a campanha não tem encontro aberto', async () => {
      encontroRepositorio.recuperarAbertoPorCampanha.mockResolvedValue(null);

      await service.sincronizarFichaAlterada(30, 5);

      expect(encontroRepositorio.recuperarAbertoPorCampanha).toHaveBeenCalledWith({ campanhaId: 5 });
      expect(encontroRepositorio.listarCombatentes).not.toHaveBeenCalled();
      expect(campanhaGateway.emitirEncontroAlterado).not.toHaveBeenCalled();
    });

    it('não faz nada quando a ficha não é combatente do encontro aberto', async () => {
      encontroRepositorio.recuperarAbertoPorCampanha.mockResolvedValue(criarEncontroLinha());
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({ fichaId: 99 }),
      ]);

      await service.sincronizarFichaAlterada(30, 5);

      expect(campanhaGateway.emitirEncontroAlterado).not.toHaveBeenCalled();
    });

    it('remonta e transmite o estado quando a ficha alterada é combatente do encontro aberto', async () => {
      encontroRepositorio.recuperarAbertoPorCampanha.mockResolvedValue(criarEncontroLinha());
      // `listarCombatentes` é consultado duas vezes: a checagem de pertencimento e a montagem do
      // estado (`montarEstado`) — mesma linha respondendo às duas chamadas.
      encontroRepositorio.listarCombatentes.mockResolvedValue([
        criarCombatenteLinha({ fichaId: 30 }),
      ]);

      await service.sincronizarFichaAlterada(30, 5);

      expect(campanhaGateway.emitirEncontroAlterado).toHaveBeenCalledWith(5, expect.any(Function));
    });
  });
});
