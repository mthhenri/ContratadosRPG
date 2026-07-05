import { CustomDecorator, SetMetadata } from '@nestjs/common';

/**
 * Chave de metadado gravada por `@Public()` e lida pelo guard global de autenticação
 * (que nasce no M2) para liberar a rota sem exigir JWT.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca uma rota como pública — acessível sem autenticação. Por ora o decorator apenas
 * grava o metadado: o guard global que o interpreta só entra no M2, então nenhuma rota
 * está de fato protegida ainda. Ver SYSTEM.SPEC §12.
 */
export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC_KEY, true);
