import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import type { UsuarioInternoRecuperadoDto } from '@contratados-rpg/shared/dtos/usuario';
import { BusinessException, ResourceNotFoundException } from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
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
  recuperarPorId: ReturnType<typeof vi.fn>;
  recuperarPorLogin: ReturnType<typeof vi.fn>;
  alterarSenha: ReturnType<typeof vi.fn>;
  alterarPerfil: ReturnType<typeof vi.fn>;
  excluirConta: ReturnType<typeof vi.fn>;
}

describe('UsuarioService', () => {
  let repositorio: RepositorioDublado;
  let service: UsuarioService;

  const usuarioPersistido: UsuarioInternoRecuperadoDto = {
    id: 7,
    login: 'agente.zero',
    senha: '$2b$10$hashbcryptdopersistido',
    nome: 'Agente Zero',
  };

  const usuarioAtivo: JwtPayload = { sub: 7, login: 'agente.zero' };

  beforeEach(() => {
    repositorio = {
      recuperarPorId: vi.fn(),
      recuperarPorLogin: vi.fn(),
      alterarSenha: vi.fn(),
      alterarPerfil: vi.fn(),
      excluirConta: vi.fn(),
    };
    service = new UsuarioService(repositorio as unknown as UsuarioRepository);
    hashDublado.mockReset();
    compareDublado.mockReset();
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
  });
});
