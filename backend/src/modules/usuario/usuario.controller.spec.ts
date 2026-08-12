import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { describe, expect, it } from 'vitest';
import { TIPOS_PERMITIDOS_KEY } from '../../core/decorators';
import { UsuarioController } from './usuario.controller';

describe('UsuarioController', () => {
  it('restringe todas as rotas do controller ao tipo ADMIN', () => {
    expect(Reflect.getMetadata(TIPOS_PERMITIDOS_KEY, UsuarioController)).toEqual([
      TipoUsuarioEnum.ADMIN,
    ]);
  });
});
