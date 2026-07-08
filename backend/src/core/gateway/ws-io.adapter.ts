import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

/**
 * Adaptador Socket.IO com a **origem travada em `APP_FRONTEND_ORIGEM`** (SYSTEM.SPEC §9/§10.6).
 * O decorator `@WebSocketGateway` só aceita opções estáticas; como a origem permitida vem do
 * `ConfigService` (proibição #10 — nunca `process.env` direto), ela é injetada aqui, no adaptador
 * montado no `bootstrap`, e aplicada como `cors` do servidor Socket.IO.
 *
 * A regra de origem espelha a do CORS HTTP (`main.ts`): além da origem de produção, o Cloudflare
 * Pages publica uma URL por branch/PR (`https://<hash>.<projeto>.pages.dev`), então subdomínios do
 * mesmo projeto Pages também são liberados.
 */
export class WsIoAdapter extends IoAdapter {
  private readonly regexPreviewPages: RegExp;

  constructor(
    aplicacao: INestApplicationContext,
    private readonly frontendOrigem: string,
  ) {
    super(aplicacao);
    const dominioPages = frontendOrigem.replace(/^https:\/\//, '').replace(/\.$/, '');
    this.regexPreviewPages = new RegExp(
      `^https://[a-z0-9-]+\\.${dominioPages.replace(/\./g, '\\.')}$`,
    );
  }

  createIOServer(porta: number, opcoes?: ServerOptions): unknown {
    return super.createIOServer(porta, {
      ...opcoes,
      cors: {
        origin: (
          origem: string | undefined,
          callback: (erro: Error | null, permitida?: boolean) => void,
        ) => {
          const permitida =
            !origem || origem === this.frontendOrigem || this.regexPreviewPages.test(origem);
          callback(null, permitida);
        },
      },
    });
  }
}
