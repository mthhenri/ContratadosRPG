import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { StandardResponse } from '@contratados-rpg/shared/interfaces';

/**
 * Interceptor global de sucesso — monta o envelope `StandardResponse<T>` em toda
 * resposta HTTP bem-sucedida (SYSTEM.SPEC §7.2).
 */
@Injectable()
export class ResponseFormatInterceptor<TData = unknown>
  implements NestInterceptor<TData, StandardResponse<TData>>
{
  intercept(
    contexto: ExecutionContext,
    proximoManipulador: CallHandler<TData>,
  ): Observable<StandardResponse<TData>> {
    return proximoManipulador.handle().pipe(
      map((dados) => ({
        sucesso: true,
        dados,
        mensagem: 'Operação realizada com sucesso.',
      })),
    );
  }
}
