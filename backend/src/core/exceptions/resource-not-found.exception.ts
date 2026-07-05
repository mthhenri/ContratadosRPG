import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Recurso inexistente (ou soft-deletado) buscado por identificador. Mapeada para
 * HTTP 404 pelo `global-exception.filter`.
 */
export class ResourceNotFoundException extends HttpException {
  constructor(nomeRecurso: string) {
    super({ mensagem: `${nomeRecurso} não encontrado(a)`, erros: [] }, HttpStatus.NOT_FOUND);
  }
}
