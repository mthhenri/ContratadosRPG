import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { describe, expect, it, vi } from 'vitest';
import { TIPOS_PERMITIDOS_KEY } from '../../core/decorators';
import { UsuarioController } from './usuario.controller';
import type { UsuarioService } from './usuario.service';

describe('UsuarioController', () => {
  it('restringe todas as rotas do controller ao tipo ADMIN', () => {
    expect(Reflect.getMetadata(TIPOS_PERMITIDOS_KEY, UsuarioController)).toEqual([
      TipoUsuarioEnum.ADMIN,
    ]);
  });

  it('repassa o admin autenticado na exclusao administrativa', async () => {
    const excluir = vi.fn().mockResolvedValue(undefined);
    const controller = new UsuarioController({ excluir } as unknown as UsuarioService);
    const adminAtivo = {
      sub: 1,
      login: 'administrador',
      tipo: TipoUsuarioEnum.ADMIN,
      tokenVersao: 1,
    };

    await controller.excluir(7, adminAtivo);

    expect(excluir).toHaveBeenCalledWith({ id: 7 }, adminAtivo);
  });

  it('repassa troca de tipo e reset de senha para a service', async () => {
    const alterarTipo = vi.fn().mockResolvedValue({});
    const resetarSenha = vi.fn().mockResolvedValue({});
    const controller = new UsuarioController({
      alterarTipo,
      resetarSenha,
    } as unknown as UsuarioService);
    const adminAtivo = {
      sub: 1,
      login: 'administrador',
      tipo: TipoUsuarioEnum.ADMIN,
      tokenVersao: 1,
    };

    await controller.alterarTipo(7, { id: 99, tipo: TipoUsuarioEnum.TESTER }, adminAtivo);
    await controller.resetarSenha(7, { id: 99, novaSenha: 'novaSenha123' });

    expect(alterarTipo).toHaveBeenCalledWith(
      { id: 7, tipo: TipoUsuarioEnum.TESTER },
      adminAtivo,
    );
    expect(resetarSenha).toHaveBeenCalledWith({ id: 7, novaSenha: 'novaSenha123' });
  });

  it('repassa alvo e origem no endpoint administrativo de impersonação', async () => {
    const impersonar = vi.fn().mockResolvedValue({ token: 'alvo' });
    const controller = new UsuarioController({ impersonar } as unknown as UsuarioService);
    const adminAtivo = {
      sub: 1, login: 'administrador', tipo: TipoUsuarioEnum.ADMIN, tokenVersao: 1,
    };

    await controller.impersonar({ id: 8 }, adminAtivo);

    expect(impersonar).toHaveBeenCalledWith({ id: 8 }, adminAtivo);
    // O decorator grava a metadata na função do método, não na instância do controller.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Reflect.getMetadata(TIPOS_PERMITIDOS_KEY, controller.impersonar)).toEqual([
      TipoUsuarioEnum.ADMIN,
    ]);
  });
});
