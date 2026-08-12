import { describe, expect, it, vi } from 'vitest';
import type { JwtService } from '@nestjs/jwt';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { SessaoTokenService } from './sessao-token.service';

describe('SessaoTokenService', () => {
  it('assina tipo e versão atuais e não projeta material de credencial', () => {
    const jwt = { sign: vi.fn().mockReturnValue('token-alvo') };
    const service = new SessaoTokenService(jwt as unknown as JwtService);
    const usuario = {
      id: 8, login: 'tester', nome: 'Tester', tipo: TipoUsuarioEnum.TESTER, tokenVersao: 4,
    };

    const resultado = service.emitirSessao(usuario);
    expect(resultado).toEqual({
      token: 'token-alvo', id: 8, login: 'tester', nome: 'Tester', tipo: TipoUsuarioEnum.TESTER,
    });
    expect(resultado).not.toHaveProperty('tokenVersao');
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 8, login: 'tester', tipo: TipoUsuarioEnum.TESTER, tokenVersao: 4,
    });
  });
});
