import { Module } from "@nestjs/common";
import { CampanhaModule } from "../campanha/campanha.module";
import { TranscricaoController } from "./transcricao.controller";
import { TranscricaoRepository } from "./transcricao.repository";
import { TranscricaoService } from "./transcricao.service";

/** Fundação local: nenhuma dependência de inferência, storage ou credencial de dispositivo. */
@Module({
    imports: [CampanhaModule],
    controllers: [TranscricaoController],
    providers: [TranscricaoRepository, TranscricaoService],
})
export class TranscricaoModule {}
