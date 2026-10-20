import { resolve } from "node:path";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";

/** Apenas estes domínios mantêm entrega estática; fichas e legado agentes passam pelo árbitro. */
export function registrarArquivosPublicos(app: NestExpressApplication, diretorio?: string): void {
  // Cabeçalhos técnicos anteriores a guards/filtros: inclusive 401/403/404 nunca são cacheáveis.
  app.use(['/uploads/fichas', '/uploads/agentes'], (_pedido: Request, resposta: Response, proximo: NextFunction) => {
    resposta.setHeader('Cache-Control', 'private, no-store');
    resposta.vary('Authorization');
    resposta.setHeader('X-Content-Type-Options', 'nosniff');
    resposta.removeHeader('ETag');
    const definirCabecalho = resposta.setHeader.bind(resposta) as Response['setHeader'];
    resposta.setHeader = (nome, valor) => nome.toLowerCase() === 'etag'
      ? resposta : definirCabecalho(nome, valor);
    proximo();
  });
  const raiz = diretorio ?? resolve(__dirname, '..', '..', '..', 'uploads');
  for (const pasta of ['documentos', 'patchnotes']) {
    app.useStaticAssets(resolve(raiz, pasta), { prefix: `/uploads/${pasta}` });
  }
}
