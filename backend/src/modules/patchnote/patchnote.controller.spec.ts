import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { IS_PUBLIC_KEY, TIPOS_PERMITIDOS_KEY } from '../../core/decorators';
import { PatchnoteController } from './patchnote.controller';
import type { PatchnoteService } from './patchnote.service';

describe('PatchnoteController (pn-03)', () => {
  const servico = {
    listarPatchnotes: vi.fn().mockResolvedValue([{ versao: '1.1.0', data: '2026-09-29', titulo: 'Cenas' }]),
    recuperarPatchnote: vi.fn().mockResolvedValue({ versao: '1.1.0' }),
    reiniciarCache: vi.fn().mockReturnValue({ entradasRemovidas: 3 }),
  };
  const controller = new PatchnoteController(servico as unknown as PatchnoteService);

  it('lista repassando ao service', async () => {
    expect(await controller.listar()).toHaveLength(1);
  });

  it('recupera mesclando a versão da rota no DTO', async () => {
    await controller.recuperar('1.1.0');
    expect(servico.recuperarPatchnote).toHaveBeenCalledWith({ versao: '1.1.0' });
  });

  it.each(['listar', 'recuperar'] as const)('%s é público e com cache curto no navegador', (metodo) => {
    const manipulador = PatchnoteController.prototype[metodo];
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, manipulador)).toBe(true);
    expect(Reflect.getMetadata('__headers__', manipulador)).toEqual([
      { name: 'Cache-Control', value: 'public, max-age=300' },
    ]);
  });

  it('reinicia o cache repassando ao service (pn-06)', () => {
    expect(controller.reiniciarCache()).toEqual({ entradasRemovidas: 3 });
  });

  it.each(['reiniciarCache'] as const)('%s não é público e é só do ADMIN', (metodo) => {
    const manipulador = PatchnoteController.prototype[metodo];
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, manipulador)).toBeUndefined();
    expect(Reflect.getMetadata(TIPOS_PERMITIDOS_KEY, manipulador)).toEqual([TipoUsuarioEnum.ADMIN]);
    expect(Reflect.getMetadata('__headers__', manipulador)).toBeUndefined();
  });
});
