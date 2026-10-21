import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { WsIoAdapter } from './core/gateway/ws-io.adapter';
import { configurarDocumentacaoOpenApi } from './core/openapi';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configurarDocumentacaoOpenApi(app);
  // Avatar da ficha em `ArmazenamentoLocalProvedor` (m3-62, dev sem credencial R2): serve
  // `backend/uploads/` estático sob `/uploads` — `NestExpressApplication`, já habilitado por
  // `@nestjs/platform-express`, sem dependência nova.
  app.useStaticAssets(resolve(__dirname, '..', 'uploads'), { prefix: '/uploads' });
  const configService = app.get(ConfigService);
  const { porta, frontendOrigem } = configService.obterConfiguracaoAplicacao();
  // Gateway de tempo real (SYSTEM.SPEC §9): a origem do Socket.IO é travada em
  // APP_FRONTEND_ORIGEM pelo adaptador, espelhando o CORS HTTP abaixo (§10.6).
  app.useWebSocketAdapter(new WsIoAdapter(app, frontendOrigem));
  // Em produção o frontend (Cloudflare Pages) e a API (Render) ficam em origens distintas, então a
  // origem permitida vem de APP_FRONTEND_ORIGEM (SYSTEM.SPEC §10.6). Em desenvolvimento a
  // chamada passa pelo proxy do dev-server, mas manter o CORS ligado não atrapalha.
  // Cloudflare Pages também publica uma URL por branch/PR (`https://<hash>.<projeto>.pages.dev`),
  // então além da origem de produção liberamos qualquer subdomínio do mesmo projeto Pages.
  const dominioPages = frontendOrigem.replace(/^https:\/\//, '').replace(/\.$/, '');
  const regexPreviewPages = new RegExp(`^https://[a-z0-9-]+\\.${dominioPages.replace(/\./g, '\\.')}$`);
  app.enableCors({
    origin: (origem: string | undefined, callback: (erro: Error | null, permitida?: boolean) => void) => {
      const permitida = !origem || origem === frontendOrigem || regexPreviewPages.test(origem);
      callback(permitida ? null : new Error('Origem não permitida pelo CORS'), permitida);
    },
  });
  await app.listen(porta);
}
void bootstrap();
