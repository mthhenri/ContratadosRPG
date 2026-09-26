import { NotFoundException, PayloadTooLargeException, type CallHandler, type ExecutionContext } from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { BusinessException } from '../../core/exceptions';
import { MENSAGEM_IMAGEM_DOCUMENTO_GRANDE } from './documento.service';
import { ImagemDocumentoGrandeInterceptor } from './imagem-documento-grande.interceptor';

/** Handler que falha com o erro informado — o que o `FileInterceptor` interno faria. */
function handlerQueFalha(erro: unknown): CallHandler {
  return { handle: () => throwError(() => erro) };
}

describe('ImagemDocumentoGrandeInterceptor (m9-02)', () => {
  const interceptor = new ImagemDocumentoGrandeInterceptor();
  const contexto = {} as ExecutionContext;

  it('troca o 413 do Multer pela BusinessException (400) com a mensagem da service', async () => {
    const resultado = firstValueFrom(
      interceptor.intercept(contexto, handlerQueFalha(new PayloadTooLargeException('File too large'))),
    );

    await expect(resultado).rejects.toBeInstanceOf(BusinessException);
    await expect(resultado).rejects.toMatchObject({
      response: { mensagem: MENSAGEM_IMAGEM_DOCUMENTO_GRANDE },
    });
  });

  it('deixa passar qualquer outro erro intacto', async () => {
    const outroErro = new NotFoundException();

    await expect(
      firstValueFrom(interceptor.intercept(contexto, handlerQueFalha(outroErro))),
    ).rejects.toBe(outroErro);
  });

  it('a mensagem diz o teto em MB', () => {
    expect(MENSAGEM_IMAGEM_DOCUMENTO_GRANDE).toBe('Imagem maior que o limite permitido (10 MB)');
  });
});
