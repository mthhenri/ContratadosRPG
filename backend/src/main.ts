import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SHARED_PACKAGE_NAME } from '@contratados-rpg/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Import de teste da ligação de workspace — substituído por config real na task m0-03.
  new Logger('Bootstrap').log(`Pacote compartilhado ligado: ${SHARED_PACKAGE_NAME}`);
  await app.listen(process.env.PORT ?? 3100);
}
bootstrap();
