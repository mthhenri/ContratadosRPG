import { Module } from '@nestjs/common';

import { CampanhaModule } from '../campanha/campanha.module';
import { PaginaCadernoController } from './pagina-caderno.controller';
import { PaginaCadernoRepository } from './pagina-caderno.repository';
import { PaginaCadernoService } from './pagina-caderno.service';

@Module({
  imports: [CampanhaModule],
  controllers: [PaginaCadernoController],
  providers: [PaginaCadernoRepository, PaginaCadernoService],
  exports: [PaginaCadernoService],
})
export class PaginaCadernoModule {}
