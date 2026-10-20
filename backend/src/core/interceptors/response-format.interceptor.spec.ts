import { describe, expect, it } from "vitest";
import { StreamableFile } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";
import { ResponseFormatInterceptor } from "./response-format.interceptor";

describe('ResponseFormatInterceptor', () => {
  it('mantém o envelope JSON e preserva StreamableFile como resposta técnica', async () => {
    const interceptor = new ResponseFormatInterceptor();
    const dados = { id: 1 };
    expect(await firstValueFrom(interceptor.intercept({} as never, { handle: () => of(dados) })))
      .toEqual({ sucesso: true, dados, mensagem: 'Operação realizada com sucesso.' });
    const arquivo = new StreamableFile(new Uint8Array([1]));
    expect(await firstValueFrom(interceptor.intercept({} as never, { handle: () => of(arquivo) })))
      .toBe(arquivo);
  });
});
