import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from '../../core/decorators';
import { PatchnoteController } from './patchnote.controller';
import type { PatchnoteService } from './patchnote.service';

describe('PatchnoteController (pn-03)', () => {
  const servico = {
    listarPatchnotes: vi.fn().mockResolvedValue([{ versao: '1.1.0', data: '2026-09-29', titulo: 'Cenas' }]),
    recuperarPatchnote: vi.fn().mockResolvedValue({ versao: '1.1.0' }),
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
});
