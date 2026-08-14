import { HttpException, HttpStatus } from '@nestjs/common';

/** Conflito entre a versão enviada pelo cliente e o recurso persistido. */
export class ResourceConflictException extends HttpException {
  constructor(mensagem: string) {
    super({ mensagem, erros: [] }, HttpStatus.CONFLICT);
  }
}
