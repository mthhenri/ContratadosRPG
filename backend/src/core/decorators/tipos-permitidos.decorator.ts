import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

export const TIPOS_PERMITIDOS_KEY = 'tiposPermitidos';

/**
 * Restringe uma controller ou rota aos tipos informados.
 *
 * Guia de teste manual: anote temporariamente uma controller com
 * `@TiposPermitidos(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER)` para validar os dois
 * perfis. Remova a anotação para restaurar o acesso a qualquer usuário autenticado.
 */
export const TiposPermitidos = (...tipos: TipoUsuarioEnum[]): CustomDecorator =>
  SetMetadata(TIPOS_PERMITIDOS_KEY, tipos);
