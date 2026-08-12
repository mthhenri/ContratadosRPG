import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import type { UsuarioInternoRecuperadoDto } from '@contratados-rpg/shared/dtos/usuario';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { BusinessException, ResourceNotFoundException } from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import type { CampanhaRepository } from '../campanha/campanha.repository';
import type { UsuarioRepository } from './usuario.repository';
import { UsuarioService } from './usuario.service';

// bcrypt é um addon nativo — dublado para manter o teste unitário (sem hashing real).
vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

const hashDublado = vi.mocked(bcrypt.hash);
const compareDublado = vi.mocked(bcrypt.compare);

interface RepositorioDublado {
  listar: ReturnType<typeof vi.fn>;
  criarUsuario: ReturnType<typeof vi.fn>;
  recuperarPorId: ReturnType<typeof vi.fn>;
  recuperarPorLogin: ReturnType<typeof vi.fn>;
  alterarSenha: ReturnType<typeof vi.fn>;
  alterarPerfil: ReturnType<typeof vi.fn>;
  excluirConta: ReturnType<typeof vi.fn>;
  reativar: ReturnType<typeof vi.fn>;
  alterarTipo: ReturnType<typeof vi.fn>;
  incrementarTokenVersao: ReturnType<typeof vi.fn>;
  contarAdminsAtivos: ReturnType<typeof vi.fn>;
}

interface CampanhaRepositorioDublado {
  contarCampanhasComoMestre: ReturnType<typeof vi.fn>;
}

describe('UsuarioService', () => {
  let repositorio: RepositorioDublado;
  let campanhaRepositorio: CampanhaRepositorioDublado;
  let service: UsuarioService;

  const usuarioPersistido: UsuarioInternoRecuperadoDto = {
    id: 7,
    login: 'agente.zero',
    senha: '$2b$10$hashbcryptdopersistido',
    nome: 'Agente Zero',
    tipo: TipoUsuarioEnum.NORMAL,
    tokenVersao: 1,
  };

  const usuarioAtivo: JwtPayload = {
    sub: 7,
    login: 'agente.zero',
    tipo: TipoUsuarioEnum.NORMAL,
    tokenVersao: 1,
  };

  beforeEach(() => {
    repositorio = {
      listar: vi.fn(),
      criarUsuario: vi.fn(),
      recuperarPorId: vi.fn(),
      recuperarPorLogin: vi.fn(),
      alterarSenha: vi.fn(),
      alterarPerfil: vi.fn(),
      excluirConta: vi.fn(),
      reativar: vi.fn(),
      alterarTipo: vi.fn(),
      incrementarTokenVersao: vi.fn(),
      contarAdminsAtivos: vi.fn(),
    };
    campanhaRepositorio = { contarCampanhasComoMestre: vi.fn() };
    service = new (UsuarioService as unknown as new (
      usuarioRepositorio: UsuarioRepository,
      campanhaRepositorio: CampanhaRepository,
    ) => UsuarioService)(
      repositorio as unknown as UsuarioRepository,
      campanhaRepositorio as unknown as CampanhaRepository,
    );
    hashDublado.mockReset();
    compareDublado.mockReset();
  });

  describe('gestao administrativa', () => {
    const adminAtivo: JwtPayload = {
      sub: 1,
      login: 'administrador',
      tipo: TipoUsuarioEnum.ADMIN,
      tokenVersao: 1,
    };

    it.each([
      ['login', { login: 'zero' }],
      ['nome', { nome: 'Agente' }],
      ['tipo', { tipo: TipoUsuarioEnum.ADMIN }],
      ['excluidos', { apenasExcluidos: true }],
      [
        'filtros combinados',
        {
          login: 'zero',
          nome: 'Agente',
          tipo: TipoUsuarioEnum.NORMAL,
          apenasExcluidos: true,
        },
      ],
    ])('repassa o filtro %s para a listagem', async (_cenario, filtros) => {
      const dto = {
        pagina: 2,
        itensPorPagina: 10,
        ordenarPor: 'nome',
        direcao: 'ASC' as const,
        ...filtros,
      };
      repositorio.listar.mockResolvedValue({
        itens: [],
        totalItens: 0,
        paginaAtual: 2,
        totalPaginas: 0,
      });

      await service.listar(dto);

      expect(repositorio.listar).toHaveBeenCalledWith(dto);
    });

    it('cria conta NORMAL com senha encriptada quando o login esta disponivel', async () => {
      repositorio.recuperarPorLogin.mockResolvedValue(null);
      hashDublado.mockResolvedValue('$2b$10$hashadministrativo' as never);
      repositorio.criarUsuario.mockResolvedValue({
        id: 12,
        login: 'agente.novo',
        nome: 'Agente Novo',
      });

      const resultado = await service.criar({
        login: 'agente.novo',
        senha: 'segredo123',
        nome: 'Agente Novo',
      });

      expect(repositorio.criarUsuario).toHaveBeenCalledWith({
        login: 'agente.novo',
        senha: '$2b$10$hashadministrativo',
        nome: 'Agente Novo',
        tipo: TipoUsuarioEnum.NORMAL,
      });
      expect(resultado).toEqual({ id: 12, login: 'agente.novo', nome: 'Agente Novo' });
    });

    it('rejeita criacao com login duplicado', async () => {
      repositorio.recuperarPorLogin.mockResolvedValue(usuarioPersistido);

      await expect(
        service.criar({ login: 'agente.zero', senha: 'segredo123', nome: 'Outro' }),
      ).rejects.toThrow(new BusinessException('Login já está em uso'));

      expect(repositorio.criarUsuario).not.toHaveBeenCalled();
    });

    it('altera nome e login de um alvo por id', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      repositorio.recuperarPorLogin.mockResolvedValue(null);
      repositorio.alterarPerfil.mockResolvedValue({
        id: 7,
        login: 'agente.um',
        nome: 'Agente Um',
      });

      await service.alterar({ id: 7, login: 'agente.um', nome: 'Agente Um' });

      expect(repositorio.alterarPerfil).toHaveBeenCalledWith({
        id: 7,
        login: 'agente.um',
        nome: 'Agente Um',
      });
    });

    it('rejeita alteracao com login usado por outra conta', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      repositorio.recuperarPorLogin.mockResolvedValue({ ...usuarioPersistido, id: 99 });

      await expect(
        service.alterar({ id: 7, login: 'agente.zero', nome: 'Agente Zero' }),
      ).rejects.toThrow(new BusinessException('Login já está em uso'));

      expect(repositorio.alterarPerfil).not.toHaveBeenCalled();
    });

    it('exclui um alvo ativo e rejeita alvo inexistente', async () => {
      repositorio.recuperarPorId.mockResolvedValueOnce(usuarioPersistido).mockResolvedValueOnce(null);

      campanhaRepositorio.contarCampanhasComoMestre.mockResolvedValue(0);
      await service.excluir({ id: 7 }, adminAtivo);
      await expect(service.excluir({ id: 99 }, adminAtivo)).rejects.toThrow(
        ResourceNotFoundException,
      );

      expect(repositorio.excluirConta).toHaveBeenCalledOnce();
    });

    it('bloqueia rebaixar o unico admin ativo', async () => {
      repositorio.recuperarPorId.mockResolvedValue({
        ...usuarioPersistido,
        id: 2,
        tipo: TipoUsuarioEnum.ADMIN,
      });
      repositorio.contarAdminsAtivos.mockResolvedValue(0);

      await expect(
        service.alterarTipo({ id: 2, tipo: TipoUsuarioEnum.NORMAL }, adminAtivo),
      ).rejects.toThrow(BusinessException);

      expect(repositorio.alterarTipo).not.toHaveBeenCalled();
    });

    it('bloqueia excluir o unico admin ativo', async () => {
      repositorio.recuperarPorId.mockResolvedValue({
        ...usuarioPersistido,
        id: 2,
        tipo: TipoUsuarioEnum.ADMIN,
      });
      repositorio.contarAdminsAtivos.mockResolvedValue(0);
      campanhaRepositorio.contarCampanhasComoMestre.mockResolvedValue(0);

      await expect(service.excluir({ id: 2 }, adminAtivo)).rejects.toThrow(
        BusinessException,
      );

      expect(repositorio.excluirConta).not.toHaveBeenCalled();
    });

    it('bloqueia auto-exclusao e auto-rebaixamento administrativos', async () => {
      repositorio.recuperarPorId.mockResolvedValue({
        ...usuarioPersistido,
        id: 1,
        tipo: TipoUsuarioEnum.ADMIN,
      });
      repositorio.contarAdminsAtivos.mockResolvedValue(2);

      await expect(service.excluir({ id: 1 }, adminAtivo)).rejects.toThrow(BusinessException);
      await expect(
        service.alterarTipo({ id: 1, tipo: TipoUsuarioEnum.NORMAL }, adminAtivo),
      ).rejects.toThrow(BusinessException);

      expect(repositorio.excluirConta).not.toHaveBeenCalled();
      expect(repositorio.alterarTipo).not.toHaveBeenCalled();
    });

    it('troca tipo e incrementa a versao do token', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      repositorio.alterarTipo.mockResolvedValue({
        id: 7,
        login: 'agente.zero',
        nome: 'Agente Zero',
        tipo: TipoUsuarioEnum.TESTER,
        tipoDescricao: 'Testador',
      });

      const resultado = await service.alterarTipo(
        { id: 7, tipo: TipoUsuarioEnum.TESTER },
        adminAtivo,
      );

      expect(repositorio.alterarTipo).toHaveBeenCalledWith({
        id: 7,
        tipo: TipoUsuarioEnum.TESTER,
      });
      expect(repositorio.incrementarTokenVersao).toHaveBeenCalledWith({ id: 7 });
      expect(resultado.tipo).toBe(TipoUsuarioEnum.TESTER);
    });

    it('reseta senha com bcrypt e incrementa a versao do token', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      hashDublado.mockResolvedValue('$2b$10$hashresetado' as never);

      const resultado = await service.resetarSenha({ id: 7, novaSenha: 'novaSenha123' });

      expect(hashDublado).toHaveBeenCalledWith('novaSenha123', 10);
      expect(repositorio.alterarSenha).toHaveBeenCalledWith({
        id: 7,
        senha: '$2b$10$hashresetado',
      });
      expect(repositorio.incrementarTokenVersao).toHaveBeenCalledWith({ id: 7 });
      expect(resultado).toEqual({ id: 7, login: 'agente.zero', nome: 'Agente Zero' });
      expect(resultado).not.toHaveProperty('senha');
    });

    it('bloqueia excluir mestre de campanha ativa com orientacao de transferencia', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      campanhaRepositorio.contarCampanhasComoMestre.mockResolvedValue(1);

      let erro: BusinessException | undefined;
      try {
        await service.excluir({ id: 7 }, adminAtivo);
      } catch (excecao: unknown) {
        if (excecao instanceof BusinessException) {
          erro = excecao;
        }
      }

      expect(erro).toBeInstanceOf(BusinessException);
      expect(erro?.getResponse()).toEqual({
        mensagem: 'Transfira o mestre ou exclua a campanha antes de excluir este usuário',
        erros: [],
      });

      expect(repositorio.excluirConta).not.toHaveBeenCalled();
    });

    it('reativa uma conta excluida e rejeita alvo inexistente ou ativo', async () => {
      repositorio.reativar
        .mockResolvedValueOnce({ id: 7, login: 'agente.zero', nome: 'Agente Zero' })
        .mockResolvedValueOnce(undefined);

      await expect(service.reativar({ id: 7 })).resolves.toEqual({
        id: 7,
        login: 'agente.zero',
        nome: 'Agente Zero',
      });
      await expect(service.reativar({ id: 99 })).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('recuperarPerfil', () => {
    it('retorna os dados públicos do usuário logado, sem a senha', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);

      const resultado = await service.recuperarPerfil({ id: 7 });

      expect(repositorio.recuperarPorId).toHaveBeenCalledWith({ id: 7 });
      expect(resultado).toEqual({ id: 7, login: 'agente.zero', nome: 'Agente Zero' });
      expect(resultado).not.toHaveProperty('senha');
    });

    it('lança ResourceNotFoundException quando o usuário do token não existe mais', async () => {
      repositorio.recuperarPorId.mockResolvedValue(null);

      await expect(service.recuperarPerfil({ id: 99 })).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('alterarSenha', () => {
    it('valida a senha atual, encripta a nova, persiste e retorna sem a senha', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      compareDublado.mockResolvedValue(true as never);
      hashDublado.mockResolvedValue('$2b$10$novohashgerado' as never);
      repositorio.alterarSenha.mockResolvedValue(undefined);

      const resultado = await service.alterarSenha(
        { senhaAtual: 'segredo123', novaSenha: 'novosegredo456' },
        usuarioAtivo,
      );

      expect(repositorio.recuperarPorId).toHaveBeenCalledWith({ id: 7 });
      expect(compareDublado).toHaveBeenCalledWith('segredo123', usuarioPersistido.senha);
      expect(hashDublado).toHaveBeenCalledWith('novosegredo456', 10);
      expect(repositorio.alterarSenha).toHaveBeenCalledWith({
        id: 7,
        senha: '$2b$10$novohashgerado',
      });
      expect(resultado).toEqual({ id: 7, login: 'agente.zero', nome: 'Agente Zero' });
      expect(resultado).not.toHaveProperty('senha');
    });

    it('rejeita a senha atual incorreta com BusinessException, sem persistir', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      compareDublado.mockResolvedValue(false as never);

      await expect(
        service.alterarSenha(
          { senhaAtual: 'errada', novaSenha: 'novosegredo456' },
          usuarioAtivo,
        ),
      ).rejects.toThrow(new BusinessException('Senha atual incorreta'));

      expect(hashDublado).not.toHaveBeenCalled();
      expect(repositorio.alterarSenha).not.toHaveBeenCalled();
    });
  });

  describe('alterarPerfil', () => {
    it('altera nome e login do usuário logado e retorna sem a senha', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      repositorio.recuperarPorLogin.mockResolvedValue(null);
      repositorio.alterarPerfil.mockResolvedValue({
        id: 7,
        login: 'agente.um',
        nome: 'Agente Um',
      });

      const resultado = await service.alterarPerfil(
        { nome: 'Agente Um', login: 'agente.um' },
        usuarioAtivo,
      );

      expect(repositorio.recuperarPorId).toHaveBeenCalledWith({ id: 7 });
      expect(repositorio.recuperarPorLogin).toHaveBeenCalledWith({ login: 'agente.um' });
      expect(repositorio.alterarPerfil).toHaveBeenCalledWith({
        id: 7,
        nome: 'Agente Um',
        login: 'agente.um',
      });
      expect(resultado).toEqual({ id: 7, login: 'agente.um', nome: 'Agente Um' });
      expect(resultado).not.toHaveProperty('senha');
    });

    it('permite reinformar o próprio login (mesma conta não é duplicidade)', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      repositorio.recuperarPorLogin.mockResolvedValue(usuarioPersistido);
      repositorio.alterarPerfil.mockResolvedValue({
        id: 7,
        login: 'agente.zero',
        nome: 'Agente Zero Renomeado',
      });

      const resultado = await service.alterarPerfil(
        { nome: 'Agente Zero Renomeado', login: 'agente.zero' },
        usuarioAtivo,
      );

      expect(repositorio.alterarPerfil).toHaveBeenCalledWith({
        id: 7,
        nome: 'Agente Zero Renomeado',
        login: 'agente.zero',
      });
      expect(resultado).toEqual({
        id: 7,
        login: 'agente.zero',
        nome: 'Agente Zero Renomeado',
      });
    });

    it('rejeita login já usado por outra conta com BusinessException, sem persistir', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      repositorio.recuperarPorLogin.mockResolvedValue({
        id: 99,
        login: 'agente.um',
        senha: '$2b$10$outrohash',
        nome: 'Outro Agente',
      });

      await expect(
        service.alterarPerfil({ nome: 'Agente Um', login: 'agente.um' }, usuarioAtivo),
      ).rejects.toThrow(new BusinessException('Login já está em uso'));

      expect(repositorio.alterarPerfil).not.toHaveBeenCalled();
    });
  });

  describe('excluirConta', () => {
    it('faz soft delete da própria conta do usuário logado', async () => {
      repositorio.recuperarPorId.mockResolvedValue(usuarioPersistido);
      repositorio.excluirConta.mockResolvedValue(undefined);

      await service.excluirConta({ id: 7 });

      expect(repositorio.recuperarPorId).toHaveBeenCalledWith({ id: 7 });
      expect(repositorio.excluirConta).toHaveBeenCalledWith({ id: 7 });
    });

    it('lança ResourceNotFoundException quando a conta do token não existe mais', async () => {
      repositorio.recuperarPorId.mockResolvedValue(null);

      await expect(service.excluirConta({ id: 99 })).rejects.toThrow(
        ResourceNotFoundException,
      );

      expect(repositorio.excluirConta).not.toHaveBeenCalled();
    });

    it('impede que o ultimo admin exclua a propria conta', async () => {
      repositorio.recuperarPorId.mockResolvedValue({
        ...usuarioPersistido,
        tipo: TipoUsuarioEnum.ADMIN,
      });
      repositorio.contarAdminsAtivos.mockResolvedValue(0);

      await expect(service.excluirConta({ id: 7 })).rejects.toThrow(BusinessException);

      expect(repositorio.excluirConta).not.toHaveBeenCalled();
    });
  });
});
