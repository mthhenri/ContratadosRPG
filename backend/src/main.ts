import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const { porta, frontendOrigem } = configService.obterConfiguracaoAplicacao();
  // Em produção o frontend (Cloudflare) e a API (Render) ficam em origens distintas, então a
  // origem permitida vem de APP_FRONTEND_ORIGEM (SYSTEM.SPEC §10.6). Em desenvolvimento a
  // chamada passa pelo proxy do dev-server, mas manter o CORS ligado não atrapalha.
  app.enableCors({ origin: frontendOrigem });
  await app.listen(porta);
}
void bootstrap();
