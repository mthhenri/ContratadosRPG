import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import type { JwtService } from '@nestjs/jwt';
import type {
  UsuarioCriadoDto,
  UsuarioInternoRecuperadoDto,
} from '@contratados-rpg/shared/dtos/usuario';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { BusinessException } from '../../core/exceptions';
import type { UsuarioRepository } from '../usuario/usuario.repository';
import type { UsuarioService } from '../usuario/usuario.service';
import { AutenticacaoService } from './autenticacao.service';
import type { JwtPayload } from './jwt-payload.interface';

// bcrypt é um addon nativo — dublado para manter o teste unitário (sem hashing real).
vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

const hashDublado = vi.mocked(bcrypt.hash);
const compareDublado = vi.mocked(bcrypt.compare);

interface RepositorioDublado {
  criarUsuario: ReturnType<typeof vi.fn>;
  recuperarPorLogin: ReturnType<typeof vi.fn>;
}

interface JwtDublado {
  sign: ReturnType<typeof vi.fn>;
}

interface UsuarioServiceDublado {
  criar: ReturnType<typeof vi.fn>;
}

describe('AutenticacaoService', () => {
  let repositorio: RepositorioDublado;
  let jwt: JwtDublado;
  let usuarioService: UsuarioServiceDublado;
  let service: AutenticacaoService;

  const usuarioPersistido: UsuarioInternoRecuperadoDto = {
    id: 7,
    login: 'agente.zero',
    senha: '$2b$10$hashbcryptdopersistido',
    nome: 'Agente Zero',
    tipo: TipoUsuarioEnum.ADMIN,
    tokenVersao: 3,
  };

  beforeEach(() => {
    repositorio = { criarUsuario: vi.fn(), recuperarPorLogin: vi.fn() };
    jwt = { sign: vi.fn() };
    usuarioService = { criar: vi.fn() };
    service = new AutenticacaoService(
      repositorio as unknown as UsuarioRepository,
      usuarioService as unknown as UsuarioService,
      jwt as unknown as JwtService,
    );
    hashDublado.mockReset();
    compareDublado.mockReset();
  });

  describe('registrar', () => {
    it('delega a criação para a regra única do módulo de usuário', async () => {
      const criado: UsuarioCriadoDto = { id: 12, login: 'agente.novo', nome: 'Agente Novo' };
      usuarioService.criar.mockResolvedValue(criado);

      const resultado = await service.registrar({
        login: 'agente.novo',
        senha: 'segredo123',
        nome: 'Agente Novo',
      });

      expect(usuarioService.criar).toHaveBeenCalledWith({
        login: 'agente.novo',
        senha: 'segredo123',
        nome: 'Agente Novo',
      });
      expect(resultado).toEqual(criado);
      expect(resultado).not.toHaveProperty('senha');
    });
  });

  describe('autenticar', () => {
    it('rejeita senha inválida com BusinessException e não emite token', async () => {
      repositorio.recuperarPorLogin.mockResolvedValue(usuarioPersistido);
      compareDublado.mockResolvedValue(false as never);

      await expect(
        service.autenticar({ login: 'agente.zero', senha: 'errada' }),
      ).rejects.toThrow(new BusinessException('Login ou senha inválidos'));

      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('rejeita login inexistente com a mesma mensagem, sem chamar bcrypt.compare', async () => {
      repositorio.recuperarPorLogin.mockResolvedValue(null);

      await expect(
        service.autenticar({ login: 'fantasma', senha: 'qualquer' }),
      ).rejects.toThrow(new BusinessException('Login ou senha inválidos'));

      expect(compareDublado).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('gera um JWT (sub = id, login) e retorna os dados básicos sem a senha', async () => {
      repositorio.recuperarPorLogin.mockResolvedValue(usuarioPersistido);
      compareDublado.mockResolvedValue(true as never);
      jwt.sign.mockReturnValue('jwt.token.assinado');

      const resultado = await service.autenticar({ login: 'agente.zero', senha: 'segredo123' });

      expect(compareDublado).toHaveBeenCalledWith('segredo123', usuarioPersistido.senha);
      const payloadEsperado: JwtPayload = {
        sub: 7,
        login: 'agente.zero',
        tipo: TipoUsuarioEnum.ADMIN,
        tokenVersao: 3,
      };
      expect(jwt.sign).toHaveBeenCalledWith(payloadEsperado);
      expect(resultado).toEqual({
        token: 'jwt.token.assinado',
        id: 7,
        login: 'agente.zero',
        nome: 'Agente Zero',
      });
      expect(resultado).not.toHaveProperty('senha');
    });
  });
});
