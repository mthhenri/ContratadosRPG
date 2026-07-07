import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const { porta, frontendOrigem } = configService.obterConfiguracaoAplicacao();
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
