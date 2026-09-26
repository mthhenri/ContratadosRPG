import {
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, throwError, type Observable } from 'rxjs';
import { BusinessException } from '../../core/exceptions';
import { MENSAGEM_IMAGEM_DOCUMENTO_GRANDE } from './documento.service';

/**
 * Traduz o teto do Multer do upload de imagem de documento (m9-02). O `FileInterceptor` recebe
 * `limits.fileSize` para cortar o arquivo grande **durante** o upload, sem carregá-lo inteiro em
 * memória — mas o Nest converte o `LIMIT_FILE_SIZE` numa `PayloadTooLargeException` com a mensagem
 * do Multer, em inglês. Declarado **antes** do `FileInterceptor` em `@UseInterceptors`, este
 * interceptor o envolve e troca o erro pela mesma `BusinessException` (400) que a service levanta
 * para um arquivo acima do limite.
 */
@Injectable()
export class ImagemDocumentoGrandeInterceptor implements NestInterceptor {
  intercept(_contexto: ExecutionContext, proximo: CallHandler): Observable<unknown> {
    return proximo.handle().pipe(
      catchError((erro: unknown) =>
        throwError(() =>
          erro instanceof PayloadTooLargeException
            ? new BusinessException(MENSAGEM_IMAGEM_DOCUMENTO_GRANDE)
            : erro,
        ),
      ),
    );
  }
}
