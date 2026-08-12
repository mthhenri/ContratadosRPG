import { describe, expect, it, vi } from 'vitest';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { BusinessException, ResourceNotFoundException } from '../../core/exceptions';
import { UsuarioService } from './usuario.service';

describe('UsuarioService — impersonação', () => {
  const admin = { sub: 1, login: 'admin', tipo: TipoUsuarioEnum.ADMIN, tokenVersao: 1 };
  const alvo = {
    id: 8, login: 'tester', nome: 'Tester', senha: 'hash-que-nao-sai',
    tipo: TipoUsuarioEnum.TESTER, tokenVersao: 4,
  };

  function criar() {
    const usuario = { recuperarPorId: vi.fn() };
    const auditoria = { registrar: vi.fn() };
    const emissor = { emitirSessao: vi.fn().mockReturnValue({
      token: 'token-alvo', id: 8, login: 'tester', nome: 'Tester', tipo: TipoUsuarioEnum.TESTER,
    }) };
    const service = new UsuarioService(usuario as never, {} as never, auditoria as never, emissor as never);
    return { service, usuario, auditoria, emissor };
  }

  it('emite a identidade atual do alvo e audita somente os ids', async () => {
    const { service, usuario, auditoria, emissor } = criar();
    usuario.recuperarPorId.mockResolvedValue(alvo);

    const resultado = await service.impersonar({ id: 8 }, admin);

    expect(emissor.emitirSessao).toHaveBeenCalledWith(alvo);
    expect(auditoria.registrar).toHaveBeenCalledWith({ adminOrigemId: 1, usuarioAlvoId: 8 });
    expect(resultado).not.toHaveProperty('senha');
    expect(resultado).toEqual(expect.objectContaining({ token: 'token-alvo', id: 8, tipo: TipoUsuarioEnum.TESTER }));
  });

  it('recusa conta ausente ou excluída sem token e sem auditoria', async () => {
    const { service, usuario, auditoria, emissor } = criar();
    usuario.recuperarPorId.mockResolvedValue(null);

    await expect(service.impersonar({ id: 99 }, admin)).rejects.toThrow(ResourceNotFoundException);
    expect(emissor.emitirSessao).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('recusa a própria conta sem token e sem auditoria', async () => {
    const { service, usuario, auditoria, emissor } = criar();
    usuario.recuperarPorId.mockResolvedValue({ ...alvo, id: 1 });

    await expect(service.impersonar({ id: 1 }, admin)).rejects.toThrow(BusinessException);
    expect(emissor.emitirSessao).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });
});
