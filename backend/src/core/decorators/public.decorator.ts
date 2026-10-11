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

/** Valor de `IS_PUBLIC_KEY` das rotas com login opcional (ver {@link AutenticacaoOpcional}). */
export const AUTENTICACAO_OPCIONAL = 'opcional';

/**
 * Rota pública que, quando a requisição traz um token válido, também recebe o usuário em
 * `@ActiveUser()` — com o `tipo` atual do banco, nunca o do token. Sem token, ou com token
 * revogado/expirado, a requisição segue como visitante (`request.user` ausente) em vez de falhar.
 * Serve a leituras abertas cujo conteúdo varia por papel (ex.: livros de regras).
 */
export const AutenticacaoOpcional = (): CustomDecorator =>
  SetMetadata(IS_PUBLIC_KEY, AUTENTICACAO_OPCIONAL);
