import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Violação de regra de negócio (dado inválido, estado inconsistente, operação não
 * permitida pelo domínio). Mapeada para HTTP 400 pelo `global-exception.filter`.
 */
export class BusinessException extends HttpException {
  constructor(mensagem: string, erros: string[] = []) {
    super({ mensagem, erros }, HttpStatus.BAD_REQUEST);
  }
}
