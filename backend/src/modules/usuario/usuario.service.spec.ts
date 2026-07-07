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
  alterarSenha: ReturnType<typeof vi.fn>;
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
    repositorio = { recuperarPorId: vi.fn(), alterarSenha: vi.fn() };
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
});
