import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Usuário autenticado sem permissão para a ação solicitada (dono/mestre exigido).
 * Mapeada para HTTP 403 pelo `global-exception.filter` — 401 é reservado para ausência
 * de autenticação (JwtAuthGuard, a partir do M2).
 */
export class UnauthorizedAccessException extends HttpException {
  constructor(mensagem = 'Acesso não autorizado') {
    super({ mensagem, erros: [] }, HttpStatus.FORBIDDEN);
  }
}
