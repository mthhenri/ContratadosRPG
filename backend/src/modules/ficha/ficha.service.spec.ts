import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  FichaInternoCriarDto,
  FichaJogadorDadosDto,
  FichaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  ClasseEnum,
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
import { FichaService } from './ficha.service';

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
  recuperarMembro: ReturnType<typeof vi.fn>;
}

interface CampanhaGatewayDublado {
  emitirFichaCriada: ReturnType<typeof vi.fn>;
  emitirFichaAlterada: ReturnType<typeof vi.fn>;
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

/** Snapshot que o backend grava na criação (m3-10): Vida/Energia máximas + bloco `derivados`. */
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
    derivados: calcularDerivados(dados.classe, dados.nivel, dados.atributos),
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
    campanhaGateway = { emitirFichaCriada: vi.fn(), emitirFichaAlterada: vi.fn() };
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

    it('lança UnauthorizedAccessException quando o autor não é membro da campanha', async () => {
      campanhaRepositorio.recuperarMembro.mockResolvedValue(null);

      await expect(
        service.criarFicha({ campanhaId: 3, nome: 'Agente Alfa', dados: criarDados() }, usuarioMembro),
      ).rejects.toThrow(UnauthorizedAccessException);

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
      expect(resultado).toBe(fichaPersistida);
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
