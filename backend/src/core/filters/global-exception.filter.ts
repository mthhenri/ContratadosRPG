import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { StandardResponse } from '@contratados-rpg/shared/interfaces';

interface CorpoExcecaoHttp {
  mensagem?: string;
  message?: string | string[];
  erros?: string[];
}

/**
 * Filtro global de exceções — padroniza toda resposta de erro no formato
 * `StandardResponse` (SYSTEM.SPEC §11): `{ sucesso: false, dados: null, mensagem, erros[] }`.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(excecao: unknown, host: ArgumentsHost): void {
    const resposta = host.switchToHttp().getResponse<Response>();
    const excecaoHttp = excecao instanceof HttpException ? excecao : null;
    const statusHttp = excecaoHttp?.getStatus() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const { mensagem, erros } = this.extrairDetalhes(excecaoHttp);

    if (!excecaoHttp) {
      this.logger.error(mensagem, excecao instanceof Error ? excecao.stack : undefined);
    }

    const corpoResposta: StandardResponse<null> = {
      sucesso: false,
      dados: null,
      mensagem,
      erros,
    };
    resposta.status(statusHttp).json(corpoResposta);
  }

  private extrairDetalhes(excecaoHttp: HttpException | null): { mensagem: string; erros: string[] } {
    if (!excecaoHttp) {
      return { mensagem: 'Erro interno do servidor', erros: [] };
    }

    const respostaExcecao = excecaoHttp.getResponse();
    if (typeof respostaExcecao !== 'object' || respostaExcecao === null) {
      return { mensagem: excecaoHttp.message, erros: [] };
    }

    const corpo = respostaExcecao as CorpoExcecaoHttp;
    const mensagensNestPadrao = Array.isArray(corpo.message) ? corpo.message : undefined;
    const mensagem = corpo.mensagem
      ?? (typeof corpo.message === 'string' ? corpo.message : undefined)
      ?? mensagensNestPadrao?.join(', ')
      ?? excecaoHttp.message;
    const erros = corpo.erros ?? mensagensNestPadrao ?? [];

    return { mensagem, erros };
  }
}
