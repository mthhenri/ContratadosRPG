import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type {
  FichaIdentidadeDto,
  FichaInternoCriarDto,
  FichaJogadorDadosDto,
  FichaOrigemDto,
  FichaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  ClasseEnum,
  FormacaoBonusEnum,
  HabilidadeCategoriaEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import {
  calcularDerivados,
  calcularEnergia,
  calcularVida,
} from '@contratados-rpg/shared/regras/agente';
import {
  BusinessException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import type { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { FichaRepository } from './ficha.repository';
import { FichaService, PRESET_INICIATIVA_PADRAO } from './ficha.service';

interface FichaRepositorioDublado {
  criarFicha: ReturnType<typeof vi.fn>;
  recuperarPorId: ReturnType<typeof vi.fn>;
  listarPorCampanha: ReturnType<typeof vi.fn>;
  listarVisiveisParaUsuario: ReturnType<typeof vi.fn>;
  recuperarAcesso: ReturnType<typeof vi.fn>;
  concederAcesso: ReturnType<typeof vi.fn>;
  revogarAcesso: ReturnType<typeof vi.fn>;
  listarAcessos: ReturnType<typeof vi.fn>;
  alterarFicha: ReturnType<typeof vi.fn>;
  excluirFicha: ReturnType<typeof vi.fn>;
}

interface CampanhaRepositorioDublado {
  recuperarMembro: Mock<CampanhaRepository['recuperarMembro']>;
}

interface CampanhaGatewayDublado {
  emitirFichaCriada: ReturnType<typeof vi.fn>;
  emitirFichaAlterada: ReturnType<typeof vi.fn>;
  emitirAcessoRevogado: ReturnType<typeof vi.fn>;
}

/**
 * Documento de jogo base para a classe COMBATENTE nível 1, sem Maestria (`maestria: null`). Após
 * m3-10 o backend não trava mais faixas do estado — só a regra de Maestria; os máximos são snapshot
 * na criação. Ponto de partida dos testes; cada caso sobrescreve o necessário.
 */
function criarDados(overrides: Partial<FichaJogadorDadosDto> = {}): FichaJogadorDadosDto {
  return {
    classe: ClasseEnum.COMBATENTE,
    arquetipo: null,
    nivel: 1,
    prestigio: 0,
    atributos: {
      destreza: 2,
      forca: 1,
      luta: 1,
      pontaria: 1,
      vigor: 2,
      intelecto: 1,
      medicina: 1,
      sentidos: 1,
      social: 1,
      vontade: 1,
    },
    maestria: null,
    estado: {
      vidaAtual: 40,
      energiaAtual: 10,
      sequelas: [],
      traumas: [],
      lesoes: [],
    },
    habilidades: [],
    inventario: { itens: [], amplificadores: [] },
    anotacoes: '',
    ...overrides,
  };
}

/**
 * Snapshot que o backend grava na criação (m3-10): Vida/Energia máximas + bloco `derivados` +
 * o preset de Iniciativa (m3-47).
 */
function comSnapshot(dados: FichaJogadorDadosDto): FichaJogadorDadosDto {
  return {
    ...dados,
    estado: {
      ...dados.estado,
      vidaMaxima: calcularVida({ classe: dados.classe, nivel: dados.nivel, vigor: dados.atributos.vigor }),
      energiaMaxima: calcularEnergia({
        classe: dados.classe,
        nivel: dados.nivel,
        destreza: dados.atributos.destreza,
      }),
    },
    derivados: calcularDerivados(dados.classe, dados.nivel, dados.atributos, dados.habilidades),
    rolagens: [...(dados.rolagens ?? []), PRESET_INICIATIVA_PADRAO],
  };
}

/** Origem válida (m3-24) — 2 Formações, uma com parâmetro exigido e outra sem, Especialidade e Saber de Campo. */
function criarOrigem(overrides: Partial<FichaOrigemDto> = {}): FichaOrigemDto {
  return {
    nome: 'Ex-Militar',
    descricao: 'Serviu nas forças armadas antes de ser recrutado pela Fundação.',
    formacao: [
      { bonus: FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO, parametro: null, texto: '+1 de Deslocamento' },
      {
        bonus: FormacaoBonusEnum.COMBATE_DADO_CATEGORIA_ARMA,
        parametro: 'Armas de Fogo',
        texto: '+1 dado em testes com Armas de Fogo',
      },
    ],
    especialidade: { gatilho: 'Sob fogo direto', efeito: '+1 dado em um teste' },
    saberDeCampo: 'Táticas de combate urbano',
    ...overrides,
  };
}

function criarIdentidade(overrides: Partial<FichaIdentidadeDto> = {}): FichaIdentidadeDto {
  return {
    personalidade: 'Valente',
    origem: criarOrigem(),
    ...overrides,
  };
}

describe('FichaService', () => {
  let fichaRepositorio: FichaRepositorioDublado;
  let campanhaRepositorio: CampanhaRepositorioDublado;
  let campanhaGateway: CampanhaGatewayDublado;
  let service: FichaService;

  const usuarioDono: JwtPayload = { sub: 10, login: 'agente.dono' };
  const usuarioMestre: JwtPayload = { sub: 7, login: 'mestre.contratados' };
  const usuarioMembro: JwtPayload = { sub: 42, login: 'agente.novato' };

  const fichaPersistida: FichaRecuperadaDto = {
    id: 5,
    campanhaId: 3,
    usuarioId: usuarioDono.sub,
    nome: 'Agente Alfa',
    dados: criarDados(),
  };

  beforeEach(() => {
    fichaRepositorio = {
      criarFicha: vi.fn(),
      recuperarPorId: vi.fn(),
      listarPorCampanha: vi.fn(),
      listarVisiveisParaUsuario: vi.fn(),
      recuperarAcesso: vi.fn(),
      concederAcesso: vi.fn(),
      revogarAcesso: vi.fn(),
      listarAcessos: vi.fn(),
      alterarFicha: vi.fn(),
      excluirFicha: vi.fn(),
    };
    campanhaRepositorio = { recuperarMembro: vi.fn() };
    campanhaGateway = {
      emitirFichaCriada: vi.fn(),
      emitirFichaAlterada: vi.fn(),
      emitirAcessoRevogado: vi.fn(),
    };
    service = new FichaService(
      fichaRepositorio as unknown as FichaRepository,
      campanhaRepositorio as unknown as CampanhaRepository,
      campanhaGateway as unknown as CampanhaGateway,
    );
  });

  describe('criarFicha', () => {
    it('cria a ficha do tipo JOGADOR com dono = usuário autenticado quando ele é membro', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      const fichaCriada = { id: 5, campanhaId: 3, usuarioId: usuarioDono.sub, nome: 'Agente Alfa', dados: criarDados() };
      fichaRepositorio.criarFicha.mockResolvedValue(fichaCriada);

      const resultado = await service.criarFicha(
        { campanhaId: 3, nome: 'Agente Alfa', dados: criarDados() },
        usuarioDono,
      );

      expect(fichaRepositorio.criarFicha).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: usuarioDono.sub,
        tipo: TipoFichaEnum.JOGADOR,
        nome: 'Agente Alfa',
        // m3-10: o backend grava o snapshot de Vida/Energia máximas na criação.
        dados: comSnapshot(criarDados()),
      });
      expect(campanhaGateway.emitirFichaCriada).toHaveBeenCalledWith(fichaCriada);
      expect(resultado).toBe(fichaCriada);
    });

    it('grava o snapshot de Vida/Energia máximas no documento ao criar (m3-10)', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.criarFicha.mockResolvedValue({ id: 5 });

      await service.criarFicha(
        { campanhaId: 3, nome: 'Agente Alfa', dados: criarDados() },
        usuarioDono,
      );

      const [argumentoCriacao] = fichaRepositorio.criarFicha.mock.calls[0] as [FichaInternoCriarDto];
      const dadosPersistidos = argumentoCriacao.dados;
      expect(dadosPersistidos.estado.vidaMaxima).toBe(
        calcularVida({ classe: ClasseEnum.COMBATENTE, nivel: 1, vigor: 2 }),
      );
      expect(dadosPersistidos.estado.energiaMaxima).toBe(
        calcularEnergia({ classe: ClasseEnum.COMBATENTE, nivel: 1, destreza: 2 }),
      );
    });

    it('snapshot de derivados na criação já reflete o delta de Formação da Origem (m3-41)', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.criarFicha.mockResolvedValue({ id: 5 });

      // Origem com MOVIMENTO_DESLOCAMENTO (+1m) — cliente não manda `derivados`, o backend deriva do zero.
      await service.criarFicha(
        {
          campanhaId: 3,
          nome: 'Agente Alfa',
          dados: criarDados({ identidade: criarIdentidade() }),
        },
        usuarioDono,
      );

      const [argumentoCriacao] = fichaRepositorio.criarFicha.mock.calls[0] as [FichaInternoCriarDto];
      const derivadosSemOrigem = calcularDerivados(ClasseEnum.COMBATENTE, 1, criarDados().atributos, []);
      expect(argumentoCriacao.dados.derivados?.deslocamento).toBe((derivadosSemOrigem.deslocamento ?? 0) + 1);
    });

    it('snapshot de derivados na criação não muda sem Origem definida (m3-41)', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.criarFicha.mockResolvedValue({ id: 5 });

      await service.criarFicha({ campanhaId: 3, nome: 'Agente Alfa', dados: criarDados() }, usuarioDono);

      const [argumentoCriacao] = fichaRepositorio.criarFicha.mock.calls[0] as [FichaInternoCriarDto];
      expect(argumentoCriacao.dados.derivados).toEqual(
        calcularDerivados(ClasseEnum.COMBATENTE, 1, criarDados().atributos, []),
      );
    });

    it('gera o preset de Iniciativa (DESd6) automaticamente na criação (m3-47)', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.criarFicha.mockResolvedValue({ id: 5 });

      await service.criarFicha({ campanhaId: 3, nome: 'Agente Alfa', dados: criarDados() }, usuarioDono);

      const [argumentoCriacao] = fichaRepositorio.criarFicha.mock.calls[0] as [FichaInternoCriarDto];
      expect(argumentoCriacao.dados.rolagens).toEqual([PRESET_INICIATIVA_PADRAO]);
    });

    it('não duplica o preset de Iniciativa quando o cliente já manda um preset de mesmo nome (m3-47)', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.criarFicha.mockResolvedValue({ id: 5 });

      const presetPersonalizado = { ...PRESET_INICIATIVA_PADRAO, formula: '1d6' };
      await service.criarFicha(
        { campanhaId: 3, nome: 'Agente Alfa', dados: criarDados({ rolagens: [presetPersonalizado] }) },
        usuarioDono,
      );

      const [argumentoCriacao] = fichaRepositorio.criarFicha.mock.calls[0] as [FichaInternoCriarDto];
      expect(argumentoCriacao.dados.rolagens).toEqual([presetPersonalizado]);
    });

    it('lança UnauthorizedAccessException quando o autor não é membro da campanha', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(null);

      await expect(
        service.criarFicha({ campanhaId: 3, nome: 'Agente Alfa', dados: criarDados() }, usuarioMembro),
      ).rejects.toThrow(UnauthorizedAccessException);

      expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
    });

    it('mestre cria a ficha em nome de outro membro (usuarioId no dto)', async () => {
      campanhaRepositorio.recuperarMembro.mockImplementation((dto: { usuarioId: number }) =>
        Promise.resolve(
          dto.usuarioId === usuarioMestre.sub
            ? { papel: TipoCampanhaMembroPapelEnum.MESTRE }
            : { papel: TipoCampanhaMembroPapelEnum.JOGADOR },
        ),
      );
      const fichaCriada = {
        id: 6,
        campanhaId: 3,
        usuarioId: usuarioMembro.sub,
        nome: 'Ficha do Jogador',
        dados: criarDados(),
      };
      fichaRepositorio.criarFicha.mockResolvedValue(fichaCriada);

      const resultado = await service.criarFicha(
        { campanhaId: 3, usuarioId: usuarioMembro.sub, nome: 'Ficha do Jogador', dados: criarDados() },
        usuarioMestre,
      );

      expect(fichaRepositorio.criarFicha).toHaveBeenCalledWith(
        expect.objectContaining({ campanhaId: 3, usuarioId: usuarioMembro.sub }),
      );
      expect(resultado).toBe(fichaCriada);
    });

    it('lança UnauthorizedAccessException quando um membro comum tenta criar ficha para outro', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(
        service.criarFicha(
          { campanhaId: 3, usuarioId: usuarioMembro.sub, nome: 'Ficha Alheia', dados: criarDados() },
          usuarioDono,
        ),
      ).rejects.toThrow(UnauthorizedAccessException);
      expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando o mestre indica um usuarioId que não é membro', async () => {
      campanhaRepositorio.recuperarMembro.mockImplementation((dto: { usuarioId: number }) =>
        Promise.resolve(dto.usuarioId === usuarioMestre.sub ? { papel: TipoCampanhaMembroPapelEnum.MESTRE } : null),
      );

      await expect(
        service.criarFicha(
          { campanhaId: 3, usuarioId: 999, nome: 'Fantasma', dados: criarDados() },
          usuarioMestre,
        ),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
    });

    it('permite Vida atual acima da máxima e valores fora das faixas antigas (liberdade total, m3-10)', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.criarFicha.mockResolvedValue({ id: 5 });

      // Vida atual altíssima, atributo fora do teto antigo e nível "impossível": o backend não trava.
      await expect(
        service.criarFicha(
          {
            campanhaId: 3,
            nome: 'Agente Alfa',
            dados: criarDados({
              nivel: 99,
              atributos: {
                destreza: 99,
                forca: 1,
                luta: 1,
                pontaria: 1,
                vigor: 2,
                intelecto: 1,
                medicina: 1,
                sentidos: 1,
                social: 1,
                vontade: 1,
              },
              estado: { vidaAtual: 9999, energiaAtual: 10, sequelas: [], traumas: [], lesoes: [] },
            }),
          },
          usuarioDono,
        ),
      ).resolves.toBeDefined();

      expect(fichaRepositorio.criarFicha).toHaveBeenCalled();
    });

    it('lança BusinessException para Maestria inválida (atributo com menos de 6 pontos)', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(
        service.criarFicha(
          { campanhaId: 3, nome: 'Agente Alfa', dados: criarDados({ maestria: 'forca' }) },
          usuarioDono,
        ),
      ).rejects.toThrow(BusinessException);

      expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
    });

    describe('forma da Identidade (m3-24)', () => {
      beforeEach(() => {
        campanhaRepositorio.recuperarMembro.mockResolvedValue({
          papel: TipoCampanhaMembroPapelEnum.JOGADOR,
        });
        fichaRepositorio.criarFicha.mockResolvedValue({ id: 5 });
      });

      it('aceita uma ficha com Identidade válida', async () => {
        await expect(
          service.criarFicha(
            { campanhaId: 3, nome: 'Agente Alfa', dados: criarDados({ identidade: criarIdentidade() }) },
            usuarioDono,
          ),
        ).resolves.toBeDefined();
      });

      it('aceita uma ficha sem o bloco identidade (retrocompatível, anterior à m3-23)', async () => {
        await expect(
          service.criarFicha({ campanhaId: 3, nome: 'Agente Alfa', dados: criarDados() }, usuarioDono),
        ).resolves.toBeDefined();
      });

      it('lança BusinessException para Personalidade com mais de uma palavra', async () => {
        await expect(
          service.criarFicha(
            {
              campanhaId: 3,
              nome: 'Agente Alfa',
              dados: criarDados({ identidade: criarIdentidade({ personalidade: 'Muito Valente' }) }),
            },
            usuarioDono,
          ),
        ).rejects.toThrow(BusinessException);
        expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
      });

      it.each([1, 3])('lança BusinessException quando a Formação tem %i entradas', async (quantidade) => {
        const origem = criarOrigem({
          formacao: Array.from({ length: quantidade }, () => criarOrigem().formacao[0]),
        });

        await expect(
          service.criarFicha(
            {
              campanhaId: 3,
              nome: 'Agente Alfa',
              dados: criarDados({ identidade: criarIdentidade({ origem }) }),
            },
            usuarioDono,
          ),
        ).rejects.toThrow(BusinessException);
        expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
      });

      it('lança BusinessException quando o bônus de Formação não existe em FormacaoBonusEnum', async () => {
        const origem = criarOrigem({
          formacao: [
            { bonus: 'BONUS_INEXISTENTE' as FormacaoBonusEnum, parametro: null, texto: 'Bônus inventado' },
            criarOrigem().formacao[1],
          ],
        });

        await expect(
          service.criarFicha(
            {
              campanhaId: 3,
              nome: 'Agente Alfa',
              dados: criarDados({ identidade: criarIdentidade({ origem }) }),
            },
            usuarioDono,
          ),
        ).rejects.toThrow(BusinessException);
        expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
      });

      it('lança BusinessException quando falta o parâmetro exigido pela definição da Formação', async () => {
        const origem = criarOrigem({
          formacao: [
            { bonus: FormacaoBonusEnum.COMBATE_DADO_CATEGORIA_ARMA, parametro: null, texto: 'Sem parâmetro' },
            criarOrigem().formacao[0],
          ],
        });

        await expect(
          service.criarFicha(
            {
              campanhaId: 3,
              nome: 'Agente Alfa',
              dados: criarDados({ identidade: criarIdentidade({ origem }) }),
            },
            usuarioDono,
          ),
        ).rejects.toThrow(BusinessException);
        expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
      });

      it('lança BusinessException quando falta o texto de uma Formação (mesmo com bônus custom)', async () => {
        const origem = criarOrigem({
          formacao: [{ bonus: null, parametro: null, texto: '' }, criarOrigem().formacao[1]],
        });

        await expect(
          service.criarFicha(
            {
              campanhaId: 3,
              nome: 'Agente Alfa',
              dados: criarDados({ identidade: criarIdentidade({ origem }) }),
            },
            usuarioDono,
          ),
        ).rejects.toThrow(BusinessException);
        expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
      });

      it('lança BusinessException quando o gatilho da Especialidade está vazio (m3-41 — acoplada à Origem)', async () => {
        const origem = criarOrigem({
          especialidade: { gatilho: '   ', efeito: '+1 dado em um teste' },
        });

        await expect(
          service.criarFicha(
            {
              campanhaId: 3,
              nome: 'Agente Alfa',
              dados: criarDados({ identidade: criarIdentidade({ origem }) }),
            },
            usuarioDono,
          ),
        ).rejects.toThrow(BusinessException);
        expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
      });

      it('lança BusinessException quando o efeito da Especialidade está vazio', async () => {
        const origem = criarOrigem({
          especialidade: { gatilho: 'Sob fogo direto', efeito: '   ' },
        });

        await expect(
          service.criarFicha(
            {
              campanhaId: 3,
              nome: 'Agente Alfa',
              dados: criarDados({ identidade: criarIdentidade({ origem }) }),
            },
            usuarioDono,
          ),
        ).rejects.toThrow(BusinessException);
        expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
      });

      it.each(['nome', 'descricao', 'saberDeCampo'] as const)(
        'lança BusinessException quando a Origem não tem %s',
        async (campo) => {
          const origem = criarOrigem({ [campo]: '   ' });

          await expect(
            service.criarFicha(
              {
                campanhaId: 3,
                nome: 'Agente Alfa',
                dados: criarDados({ identidade: criarIdentidade({ origem }) }),
              },
              usuarioDono,
            ),
          ).rejects.toThrow(BusinessException);
          expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
        },
      );

      describe('Experimento com Peculiaridade zera a Origem (m3-41)', () => {
        const peculiaridade = {
          nome: 'Peculiaridade',
          categoria: HabilidadeCategoriaEnum.SUBCLASSE,
          custoEnergia: 0,
          descricao: '...',
        };

        it('lança BusinessException quando um Experimento com Peculiaridade tenta salvar Origem', async () => {
          await expect(
            service.criarFicha(
              {
                campanhaId: 3,
                nome: 'Agente Alfa',
                dados: criarDados({
                  classe: ClasseEnum.EXPERIMENTO_BESTIAL,
                  habilidades: [peculiaridade],
                  identidade: criarIdentidade(),
                }),
              },
              usuarioDono,
            ),
          ).rejects.toThrow(BusinessException);
          expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
        });

        it('aceita um Experimento com Peculiaridade sem Origem definida', async () => {
          await expect(
            service.criarFicha(
              {
                campanhaId: 3,
                nome: 'Agente Alfa',
                dados: criarDados({
                  classe: ClasseEnum.EXPERIMENTO_BESTIAL,
                  habilidades: [peculiaridade],
                  identidade: criarIdentidade({ origem: null }),
                }),
              },
              usuarioDono,
            ),
          ).resolves.toBeDefined();
        });

        it('aceita um Experimento com Origem quando ele não tem a Peculiaridade', async () => {
          await expect(
            service.criarFicha(
              {
                campanhaId: 3,
                nome: 'Agente Alfa',
                dados: criarDados({ classe: ClasseEnum.EXPERIMENTO_BESTIAL, identidade: criarIdentidade() }),
              },
              usuarioDono,
            ),
          ).resolves.toBeDefined();
        });

        it('aceita uma classe base com Origem, mesmo com uma habilidade chamada "Peculiaridade" (categoria errada)', async () => {
          await expect(
            service.criarFicha(
              {
                campanhaId: 3,
                nome: 'Agente Alfa',
                dados: criarDados({
                  habilidades: [{ ...peculiaridade, categoria: HabilidadeCategoriaEnum.GERAL }],
                  identidade: criarIdentidade(),
                }),
              },
              usuarioDono,
            ),
          ).resolves.toBeDefined();
        });
      });
    });
  });

  describe('listarFichas', () => {
    it('devolve todas as fichas da campanha quando o autor é o mestre', async () => {
      const fichas = [{ id: 5, usuarioId: usuarioDono.sub, nome: 'Agente Alfa', classe: ClasseEnum.COMBATENTE, nivel: 1 }];
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      fichaRepositorio.listarPorCampanha.mockResolvedValue(fichas);

      const resultado = await service.listarFichas({ campanhaId: 3 }, usuarioMestre);

      expect(fichaRepositorio.listarPorCampanha).toHaveBeenCalledWith({ campanhaId: 3 });
      expect(fichaRepositorio.listarVisiveisParaUsuario).not.toHaveBeenCalled();
      expect(resultado).toBe(fichas);
    });

    it('devolve só as fichas visíveis quando o autor é um membro comum', async () => {
      const fichas = [{ id: 5, usuarioId: usuarioMembro.sub, nome: 'Agente Beta', classe: ClasseEnum.SUPORTE, nivel: 2 }];
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.listarVisiveisParaUsuario.mockResolvedValue(fichas);

      const resultado = await service.listarFichas({ campanhaId: 3 }, usuarioMembro);

      expect(fichaRepositorio.listarVisiveisParaUsuario).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: usuarioMembro.sub,
      });
      expect(fichaRepositorio.listarPorCampanha).not.toHaveBeenCalled();
      expect(resultado).toBe(fichas);
    });

    it('lança UnauthorizedAccessException quando o autor não é membro da campanha', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(null);

      await expect(service.listarFichas({ campanhaId: 3 }, usuarioMembro)).rejects.toThrow(
        UnauthorizedAccessException,
      );

      expect(fichaRepositorio.listarPorCampanha).not.toHaveBeenCalled();
      expect(fichaRepositorio.listarVisiveisParaUsuario).not.toHaveBeenCalled();
    });
  });

  describe('recuperarFicha', () => {
    it('devolve a ficha para o dono sem consultar papel/concessão', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);

      const resultado = await service.recuperarFicha({ id: 5 }, usuarioDono);

      expect(resultado).toBe(fichaPersistida);
      expect(campanhaRepositorio.recuperarMembro).not.toHaveBeenCalled();
    });

    it('devolve a ficha para o mestre da campanha', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });

      const resultado = await service.recuperarFicha({ id: 5 }, usuarioMestre);

      expect(resultado).toBe(fichaPersistida);
      expect(fichaRepositorio.recuperarAcesso).not.toHaveBeenCalled();
    });

    it('devolve a ficha para um membro com concessão em usuario_ficha_acesso', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.recuperarAcesso.mockResolvedValue({ id: 1 });

      const resultado = await service.recuperarFicha({ id: 5 }, usuarioMembro);

      expect(fichaRepositorio.recuperarAcesso).toHaveBeenCalledWith({
        fichaId: 5,
        usuarioId: usuarioMembro.sub,
      });
      // Visualizador só-acesso nunca recebe os campos privados (m3-50/m3-51 — `anotacoes` aqui é
      // `''` na ficha base, então some do payload igual a `historia` ausente.
      const { anotacoes: _anotacoesOmitida, ...dadosSemAnotacoes } = fichaPersistida.dados;
      expect(resultado).toEqual({ ...fichaPersistida, dados: dadosSemAnotacoes });
    });

    it('omite historia do payload para um visualizador só-acesso (m3-50)', async () => {
      const fichaComHistoria = {
        ...fichaPersistida,
        dados: criarDados({ historia: 'Nasceu numa colônia orbital.' }),
      };
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComHistoria);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.recuperarAcesso.mockResolvedValue({ id: 1 });

      const resultado = await service.recuperarFicha({ id: 5 }, usuarioMembro);

      expect(resultado.dados.historia).toBeUndefined();
      expect('historia' in resultado.dados).toBe(false);
    });

    it('mantém historia no payload para o dono e para o mestre', async () => {
      const fichaComHistoria = {
        ...fichaPersistida,
        dados: criarDados({ historia: 'Nasceu numa colônia orbital.' }),
      };
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComHistoria);

      const resultadoDono = await service.recuperarFicha({ id: 5 }, usuarioDono);
      expect(resultadoDono.dados.historia).toBe('Nasceu numa colônia orbital.');

      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      const resultadoMestre = await service.recuperarFicha({ id: 5 }, usuarioMestre);
      expect(resultadoMestre.dados.historia).toBe('Nasceu numa colônia orbital.');
    });

    it('omite anotacoes do payload para um visualizador só-acesso (m3-51)', async () => {
      const fichaComAnotacoes = {
        ...fichaPersistida,
        dados: criarDados({ anotacoes: 'Só o mestre pode ver isso.' }),
      };
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComAnotacoes);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.recuperarAcesso.mockResolvedValue({ id: 1 });

      const resultado = await service.recuperarFicha({ id: 5 }, usuarioMembro);

      expect(resultado.dados.anotacoes).toBeUndefined();
      expect('anotacoes' in resultado.dados).toBe(false);
    });

    it('mantém anotacoes no payload para o dono e para o mestre', async () => {
      const fichaComAnotacoes = {
        ...fichaPersistida,
        dados: criarDados({ anotacoes: 'Notas da campanha.' }),
      };
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComAnotacoes);

      const resultadoDono = await service.recuperarFicha({ id: 5 }, usuarioDono);
      expect(resultadoDono.dados.anotacoes).toBe('Notas da campanha.');

      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      const resultadoMestre = await service.recuperarFicha({ id: 5 }, usuarioMestre);
      expect(resultadoMestre.dados.anotacoes).toBe('Notas da campanha.');
    });

    it('lança UnauthorizedAccessException para um membro sem concessão', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.recuperarAcesso.mockResolvedValue(null);

      await expect(service.recuperarFicha({ id: 5 }, usuarioMembro)).rejects.toThrow(
        UnauthorizedAccessException,
      );
    });

    it('lança ResourceNotFoundException quando a ficha não existe', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(null);

      await expect(service.recuperarFicha({ id: 99 }, usuarioDono)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('alterarFicha', () => {
    it('altera a ficha quando o autor é o dono', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      const fichaAlterada = { ...fichaPersistida, nome: 'Agente Alfa Prime' };
      fichaRepositorio.alterarFicha.mockResolvedValue(fichaAlterada);

      const resultado = await service.alterarFicha(
        { id: 5, nome: 'Agente Alfa Prime', dados: criarDados() },
        usuarioDono,
      );

      expect(fichaRepositorio.alterarFicha).toHaveBeenCalledWith({
        id: 5,
        nome: 'Agente Alfa Prime',
        dados: criarDados(),
      });
      expect(campanhaGateway.emitirFichaAlterada).toHaveBeenCalledWith(fichaAlterada);
      expect(resultado).toBe(fichaAlterada);
    });

    it('altera a ficha quando o autor é o mestre da campanha', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      fichaRepositorio.alterarFicha.mockResolvedValue(fichaPersistida);

      await service.alterarFicha({ id: 5, nome: 'Agente Alfa', dados: criarDados() }, usuarioMestre);

      expect(fichaRepositorio.alterarFicha).toHaveBeenCalled();
    });

    it('lança UnauthorizedAccessException para um membro com concessão de visualização (nunca edita)', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(
        service.alterarFicha({ id: 5, nome: 'Invasor', dados: criarDados() }, usuarioMembro),
      ).rejects.toThrow(UnauthorizedAccessException);

      expect(fichaRepositorio.recuperarAcesso).not.toHaveBeenCalled();
      expect(fichaRepositorio.alterarFicha).not.toHaveBeenCalled();
    });

    it('permite editar a Vida atual acima da máxima — sem recalcular nem travar (m3-10)', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      fichaRepositorio.alterarFicha.mockResolvedValue(fichaPersistida);

      const dadosEditados = criarDados({
        estado: {
          vidaAtual: 9999,
          energiaAtual: 10,
          vidaMaxima: 40,
          energiaMaxima: 12,
          sequelas: [],
          traumas: [],
          lesoes: [],
        },
      });
      await service.alterarFicha({ id: 5, nome: 'Agente Alfa', dados: dadosEditados }, usuarioDono);

      // Persiste como veio — a máxima editada é preservada (alterarFicha não faz snapshot).
      expect(fichaRepositorio.alterarFicha).toHaveBeenCalledWith({
        id: 5,
        nome: 'Agente Alfa',
        dados: dadosEditados,
      });
    });

    it('lança BusinessException para Maestria inválida ao alterar (atributo < 6)', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);

      await expect(
        service.alterarFicha(
          { id: 5, nome: 'Agente Alfa', dados: criarDados({ maestria: 'forca' }) },
          usuarioDono,
        ),
      ).rejects.toThrow(BusinessException);

      expect(fichaRepositorio.alterarFicha).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a ficha não existe', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(null);

      await expect(
        service.alterarFicha({ id: 99, nome: 'Agente Alfa', dados: criarDados() }, usuarioDono),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(fichaRepositorio.alterarFicha).not.toHaveBeenCalled();
    });

    describe('imutabilidade da Identidade (m3-24)', () => {
      const fichaComIdentidade: FichaRecuperadaDto = {
        ...fichaPersistida,
        dados: criarDados({ identidade: criarIdentidade() }),
      };

      it('lança BusinessException quando o dono altera a Personalidade já definida', async () => {
        fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComIdentidade);

        await expect(
          service.alterarFicha(
            {
              id: 5,
              nome: 'Agente Alfa',
              dados: criarDados({ identidade: criarIdentidade({ personalidade: 'Cruel' }) }),
            },
            usuarioDono,
          ),
        ).rejects.toThrow(BusinessException);
        expect(fichaRepositorio.alterarFicha).not.toHaveBeenCalled();
      });

      it('permite o mestre alterar a Personalidade já definida', async () => {
        fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComIdentidade);
        campanhaRepositorio.recuperarMembro.mockResolvedValue({
          papel: TipoCampanhaMembroPapelEnum.MESTRE,
        });
        fichaRepositorio.alterarFicha.mockResolvedValue(fichaComIdentidade);

        const dadosAlterados = criarDados({ identidade: criarIdentidade({ personalidade: 'Cruel' }) });
        await service.alterarFicha({ id: 5, nome: 'Agente Alfa', dados: dadosAlterados }, usuarioMestre);

        expect(fichaRepositorio.alterarFicha).toHaveBeenCalledWith({
          id: 5,
          nome: 'Agente Alfa',
          dados: dadosAlterados,
        });
      });

      it('permite o dono definir a Personalidade pela primeira vez (era null)', async () => {
        const fichaSemPersonalidade: FichaRecuperadaDto = {
          ...fichaPersistida,
          dados: criarDados({ identidade: criarIdentidade({ personalidade: null }) }),
        };
        fichaRepositorio.recuperarPorId.mockResolvedValue(fichaSemPersonalidade);
        fichaRepositorio.alterarFicha.mockResolvedValue(fichaSemPersonalidade);

        await expect(
          service.alterarFicha(
            { id: 5, nome: 'Agente Alfa', dados: criarDados({ identidade: criarIdentidade() }) },
            usuarioDono,
          ),
        ).resolves.toBeDefined();
        expect(fichaRepositorio.alterarFicha).toHaveBeenCalled();
      });

      it('lança BusinessException quando o dono altera a Origem já definida', async () => {
        fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComIdentidade);
        const origemAlterada = criarOrigem({ nome: 'Ex-Policial' });

        await expect(
          service.alterarFicha(
            {
              id: 5,
              nome: 'Agente Alfa',
              dados: criarDados({ identidade: criarIdentidade({ origem: origemAlterada }) }),
            },
            usuarioDono,
          ),
        ).rejects.toThrow(BusinessException);
        expect(fichaRepositorio.alterarFicha).not.toHaveBeenCalled();
      });

      it('permite o mestre alterar a Origem já definida', async () => {
        fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComIdentidade);
        campanhaRepositorio.recuperarMembro.mockResolvedValue({
          papel: TipoCampanhaMembroPapelEnum.MESTRE,
        });
        const dadosAlterados = criarDados({
          identidade: criarIdentidade({ origem: criarOrigem({ nome: 'Ex-Policial' }) }),
        });
        fichaRepositorio.alterarFicha.mockResolvedValue(fichaComIdentidade);

        await service.alterarFicha({ id: 5, nome: 'Agente Alfa', dados: dadosAlterados }, usuarioMestre);

        expect(fichaRepositorio.alterarFicha).toHaveBeenCalledWith({
          id: 5,
          nome: 'Agente Alfa',
          dados: dadosAlterados,
        });
      });

      it('permite o dono definir a Origem pela primeira vez (era null)', async () => {
        const fichaSemOrigem: FichaRecuperadaDto = {
          ...fichaPersistida,
          dados: criarDados({ identidade: criarIdentidade({ origem: null }) }),
        };
        fichaRepositorio.recuperarPorId.mockResolvedValue(fichaSemOrigem);
        fichaRepositorio.alterarFicha.mockResolvedValue(fichaSemOrigem);

        await expect(
          service.alterarFicha(
            { id: 5, nome: 'Agente Alfa', dados: criarDados({ identidade: criarIdentidade() }) },
            usuarioDono,
          ),
        ).resolves.toBeDefined();
        expect(fichaRepositorio.alterarFicha).toHaveBeenCalled();
      });

      it('permite reenviar a Origem já definida sem alterá-la (mesmo conteúdo)', async () => {
        fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComIdentidade);
        fichaRepositorio.alterarFicha.mockResolvedValue(fichaComIdentidade);

        await expect(
          service.alterarFicha(
            { id: 5, nome: 'Agente Alfa', dados: criarDados({ identidade: criarIdentidade() }) },
            usuarioDono,
          ),
        ).resolves.toBeDefined();
        expect(fichaRepositorio.alterarFicha).toHaveBeenCalled();
      });

      it('travar a Personalidade não trava a Origem — dono define Origem sem tocar na Personalidade travada', async () => {
        const fichaComPersonalidadeSoDefinida: FichaRecuperadaDto = {
          ...fichaPersistida,
          dados: criarDados({ identidade: criarIdentidade({ origem: null }) }),
        };
        fichaRepositorio.recuperarPorId.mockResolvedValue(fichaComPersonalidadeSoDefinida);
        fichaRepositorio.alterarFicha.mockResolvedValue(fichaComPersonalidadeSoDefinida);

        // Personalidade permanece igual (já travada); Origem é definida agora — não deve travar.
        await expect(
          service.alterarFicha(
            { id: 5, nome: 'Agente Alfa', dados: criarDados({ identidade: criarIdentidade() }) },
            usuarioDono,
          ),
        ).resolves.toBeDefined();
        expect(fichaRepositorio.alterarFicha).toHaveBeenCalled();
      });
    });
  });

  describe('excluirFicha', () => {
    it('exclui a ficha quando o autor é o dono', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      fichaRepositorio.excluirFicha.mockResolvedValue(undefined);

      await service.excluirFicha({ id: 5 }, usuarioDono);

      expect(fichaRepositorio.excluirFicha).toHaveBeenCalledWith({ id: 5 });
    });

    it('lança UnauthorizedAccessException quando o autor não é dono nem mestre', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(service.excluirFicha({ id: 5 }, usuarioMembro)).rejects.toThrow(
        UnauthorizedAccessException,
      );

      expect(fichaRepositorio.excluirFicha).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a ficha não existe', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(null);

      await expect(service.excluirFicha({ id: 99 }, usuarioDono)).rejects.toThrow(
        ResourceNotFoundException,
      );

      expect(fichaRepositorio.excluirFicha).not.toHaveBeenCalled();
    });
  });

  describe('duplicarFicha', () => {
    it('duplica a ficha quando o autor é o dono — clone com nome "(cópia)", dono = quem duplicou, mesma campanha', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      const fichaClonada = {
        id: 8,
        campanhaId: 3,
        usuarioId: usuarioDono.sub,
        nome: 'Agente Alfa (cópia)',
        dados: criarDados(),
      };
      fichaRepositorio.criarFicha.mockResolvedValue(fichaClonada);

      const resultado = await service.duplicarFicha({ id: 5 }, usuarioDono);

      expect(fichaRepositorio.criarFicha).toHaveBeenCalledWith({
        campanhaId: 3,
        usuarioId: usuarioDono.sub,
        tipo: TipoFichaEnum.JOGADOR,
        nome: 'Agente Alfa (cópia)',
        dados: comSnapshot(criarDados()),
      });
      expect(resultado).toBe(fichaClonada);
      // Não herda acessos de visualização — `criarFicha` nunca toca `usuario_ficha_acesso`.
      expect(fichaRepositorio.concederAcesso).not.toHaveBeenCalled();
    });

    it('mestre duplica a ficha de outro membro — o clone pertence a quem duplicou, não ao dono original', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      fichaRepositorio.criarFicha.mockResolvedValue({ id: 9 });

      await service.duplicarFicha({ id: 5 }, usuarioMestre);

      expect(fichaRepositorio.criarFicha).toHaveBeenCalledWith(
        expect.objectContaining({ campanhaId: 3, usuarioId: usuarioMestre.sub }),
      );
    });

    it('lança UnauthorizedAccessException quando o autor não é dono nem mestre da ficha original', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(service.duplicarFicha({ id: 5 }, usuarioMembro)).rejects.toThrow(
        UnauthorizedAccessException,
      );

      expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a ficha original não existe', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(null);

      await expect(service.duplicarFicha({ id: 99 }, usuarioDono)).rejects.toThrow(
        ResourceNotFoundException,
      );

      expect(fichaRepositorio.criarFicha).not.toHaveBeenCalled();
    });
  });

  describe('concederAcesso', () => {
    it('concede o acesso quando o autor é o dono e o alvo é membro da campanha', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.recuperarAcesso.mockResolvedValue(null);
      const acessoConcedido = { id: 1, fichaId: 5, usuarioId: usuarioMembro.sub };
      fichaRepositorio.concederAcesso.mockResolvedValue(acessoConcedido);

      const resultado = await service.concederAcesso(
        { fichaId: 5, usuarioId: usuarioMembro.sub },
        usuarioDono,
      );

      expect(fichaRepositorio.concederAcesso).toHaveBeenCalledWith({
        fichaId: 5,
        usuarioId: usuarioMembro.sub,
      });
      expect(resultado).toBe(acessoConcedido);
    });

    it('concede o acesso quando o autor é o mestre da campanha', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      fichaRepositorio.recuperarAcesso.mockResolvedValue(null);
      fichaRepositorio.concederAcesso.mockResolvedValue({ id: 1, fichaId: 5, usuarioId: usuarioMembro.sub });

      await service.concederAcesso({ fichaId: 5, usuarioId: usuarioMembro.sub }, usuarioMestre);

      expect(fichaRepositorio.concederAcesso).toHaveBeenCalled();
    });

    it('lança UnauthorizedAccessException quando o autor não é dono nem mestre', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(
        service.concederAcesso({ fichaId: 5, usuarioId: 99 }, usuarioMembro),
      ).rejects.toThrow(UnauthorizedAccessException);

      expect(fichaRepositorio.concederAcesso).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando o alvo não é membro da campanha', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue(null);

      await expect(
        service.concederAcesso({ fichaId: 5, usuarioId: 99 }, usuarioDono),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(fichaRepositorio.concederAcesso).not.toHaveBeenCalled();
    });

    it('é idempotente — devolve a concessão existente sem inserir de novo', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });
      fichaRepositorio.recuperarAcesso.mockResolvedValue({ id: 77 });

      const resultado = await service.concederAcesso(
        { fichaId: 5, usuarioId: usuarioMembro.sub },
        usuarioDono,
      );

      expect(resultado).toEqual({ id: 77, fichaId: 5, usuarioId: usuarioMembro.sub });
      expect(fichaRepositorio.concederAcesso).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a ficha não existe', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(null);

      await expect(
        service.concederAcesso({ fichaId: 99, usuarioId: usuarioMembro.sub }, usuarioDono),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(fichaRepositorio.concederAcesso).not.toHaveBeenCalled();
    });
  });

  describe('revogarAcesso', () => {
    it('revoga o acesso quando o autor é o dono', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      fichaRepositorio.revogarAcesso.mockResolvedValue(undefined);

      const resultado = await service.revogarAcesso(
        { fichaId: 5, usuarioId: usuarioMembro.sub },
        usuarioDono,
      );

      expect(fichaRepositorio.revogarAcesso).toHaveBeenCalledWith({
        fichaId: 5,
        usuarioId: usuarioMembro.sub,
      });
      expect(resultado).toEqual({ fichaId: 5, usuarioId: usuarioMembro.sub });
    });

    it('emite ficha:acesso-revogado após persistir (m3-51 — expulsão em tempo real)', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      fichaRepositorio.revogarAcesso.mockResolvedValue(undefined);

      await service.revogarAcesso({ fichaId: 5, usuarioId: usuarioMembro.sub }, usuarioDono);

      expect(campanhaGateway.emitirAcessoRevogado).toHaveBeenCalledWith({
        fichaId: 5,
        usuarioId: usuarioMembro.sub,
      });
    });

    it('lança UnauthorizedAccessException quando o autor não é dono nem mestre', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(
        service.revogarAcesso({ fichaId: 5, usuarioId: usuarioMembro.sub }, usuarioMembro),
      ).rejects.toThrow(UnauthorizedAccessException);

      expect(fichaRepositorio.revogarAcesso).not.toHaveBeenCalled();
    });

    it('lança ResourceNotFoundException quando a ficha não existe', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(null);

      await expect(
        service.revogarAcesso({ fichaId: 99, usuarioId: usuarioMembro.sub }, usuarioDono),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(fichaRepositorio.revogarAcesso).not.toHaveBeenCalled();
    });
  });

  describe('listarAcessos', () => {
    it('lista as concessões quando o autor é o dono', async () => {
      const acessos = [{ usuarioId: usuarioMembro.sub, nome: 'Agente Novato' }];
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      fichaRepositorio.listarAcessos.mockResolvedValue(acessos);

      const resultado = await service.listarAcessos({ fichaId: 5 }, usuarioDono);

      expect(fichaRepositorio.listarAcessos).toHaveBeenCalledWith({ fichaId: 5 });
      expect(resultado).toBe(acessos);
    });

    it('lista as concessões quando o autor é o mestre da campanha', async () => {
      const acessos = [{ usuarioId: usuarioMembro.sub, nome: 'Agente Novato' }];
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.MESTRE,
      });
      fichaRepositorio.listarAcessos.mockResolvedValue(acessos);

      const resultado = await service.listarAcessos({ fichaId: 5 }, usuarioMestre);

      expect(resultado).toBe(acessos);
    });

    it('lança UnauthorizedAccessException quando o autor não é dono nem mestre', async () => {
      fichaRepositorio.recuperarPorId.mockResolvedValue(fichaPersistida);
      campanhaRepositorio.recuperarMembro.mockResolvedValue({
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      });

      await expect(service.listarAcessos({ fichaId: 5 }, usuarioMembro)).rejects.toThrow(
        UnauthorizedAccessException,
      );

      expect(fichaRepositorio.listarAcessos).not.toHaveBeenCalled();
    });
  });
});
