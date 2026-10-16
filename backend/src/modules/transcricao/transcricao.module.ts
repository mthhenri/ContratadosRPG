import { Module } from "@nestjs/common";
import { UsuarioModule } from "../usuario/usuario.module";
import { DispositivoController, VinculoController, AplicativoController } from "./dispositivo.controller";
import { DispositivoRepository } from "./dispositivo.repository";
import { DispositivoService } from "./dispositivo.service";
import { DispositivoGuard } from "./dispositivo.guard";
import { CampanhaModule } from "../campanha/campanha.module";
import { GlossarioController } from "./glossario.controller";
import { GlossarioRepository } from "./glossario.repository";
import { GlossarioService } from "./glossario.service";
import { TranscricaoController } from "./transcricao.controller";
import { TranscricaoRepository } from "./transcricao.repository";
import { TranscricaoService } from "./transcricao.service";

/** Metadados e vínculo local; nenhuma dependência de inferência ou storage de áudio. */
@Module({
    imports: [CampanhaModule, UsuarioModule],
    controllers: [TranscricaoController, GlossarioController, VinculoController, DispositivoController, AplicativoController],
    providers: [TranscricaoRepository, TranscricaoService, GlossarioRepository, GlossarioService, DispositivoRepository, DispositivoService, DispositivoGuard],
})
export class TranscricaoModule {}
