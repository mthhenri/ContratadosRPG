import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedAccessException } from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { AutorizacaoGuard } from './autorizacao.guard';
import type { UsuarioService } from './usuario.service';

describe('AutorizacaoGuard', () => {
  const usuario: JwtPayload = {
    sub: 7,
    login: 'agente.zero',
    tipo: TipoUsuarioEnum.ADMIN,
    tokenVersao: 2,
  };
  let recuperarSessao: ReturnType<typeof vi.fn>;
  let getAllAndOverride: ReturnType<typeof vi.fn>;
  let guard: AutorizacaoGuard;

  const contexto = (user?: JwtPayload): ExecutionContext =>
    ({
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    recuperarSessao = vi.fn();
    getAllAndOverride = vi.fn();
    guard = new AutorizacaoGuard(
      { getAllAndOverride } as unknown as Reflector,
      { recuperarSessao } as unknown as UsuarioService,
    );
  });

  it('libera rota pública sem exigir payload ou consultar sessão', async () => {
    getAllAndOverride.mockReturnValueOnce(true);
    await expect(guard.canActivate(contexto())).resolves.toBe(true);
    expect(recuperarSessao).not.toHaveBeenCalled();
  });

  it('rejeita versão de token desatualizada com 401', async () => {
    getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(undefined);
    recuperarSessao.mockResolvedValue({ tipo: TipoUsuarioEnum.ADMIN, tokenVersao: 3, isDeleted: false });
    await expect(guard.canActivate(contexto(usuario))).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita conta excluída com 401', async () => {
    getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(undefined);
    recuperarSessao.mockResolvedValue({ tipo: TipoUsuarioEnum.ADMIN, tokenVersao: 2, isDeleted: true });
    await expect(guard.canActivate(contexto(usuario))).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita sessão inexistente com 401', async () => {
    getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(undefined);
    recuperarSessao.mockResolvedValue(null);
    await expect(guard.canActivate(contexto(usuario))).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita NORMAL em rota exclusiva de ADMIN com 403', async () => {
    getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce([TipoUsuarioEnum.ADMIN]);
    recuperarSessao.mockResolvedValue({ tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 2, isDeleted: false });
    await expect(guard.canActivate(contexto(usuario))).rejects.toThrow(UnauthorizedAccessException);
  });

  it('libera ADMIN em rota exclusiva de ADMIN', async () => {
    getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce([TipoUsuarioEnum.ADMIN]);
    recuperarSessao.mockResolvedValue({ tipo: TipoUsuarioEnum.ADMIN, tokenVersao: 2, isDeleted: false });
    await expect(guard.canActivate(contexto(usuario))).resolves.toBe(true);
  });
});
