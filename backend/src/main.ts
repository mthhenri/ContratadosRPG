import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const { porta } = configService.obterConfiguracaoAplicacao();
  await app.listen(porta);
}
void bootstrap();
