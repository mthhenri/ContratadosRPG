import { Module } from "@nestjs/common";
import { UsuarioModule } from "../usuario/usuario.module";
import { DispositivoController, VinculoController, AplicativoController } from "./dispositivo.controller";
import { DispositivoRepository } from "./dispositivo.repository";
import { DispositivoService } from "./dispositivo.service";
import { DispositivoGuard } from "./dispositivo.guard";
import { CampanhaModule } from "../campanha/campanha.module";
import { AplicativoImportacaoController } from "./aplicativo-importacao.controller";
import { FaixaAjusteService } from "./faixa-ajuste.service";
import { GlossarioController } from "./glossario.controller";
import { GlossarioRepository } from "./glossario.repository";
import { GlossarioService } from "./glossario.service";
import { FaixaAjusteController, IdentidadeController } from "./identidade.controller";
import { IdentidadeRepository } from "./identidade.repository";
import { IdentidadeService } from "./identidade.service";
import { TranscricaoController } from "./transcricao.controller";
import { TranscricaoRepository } from "./transcricao.repository";
import { TranscricaoService } from "./transcricao.service";

/** Metadados e vínculo local; nenhuma dependência de inferência ou storage de áudio. */
@Module({
    imports: [CampanhaModule, UsuarioModule],
    controllers: [
        TranscricaoController, GlossarioController, IdentidadeController, FaixaAjusteController,
        VinculoController, DispositivoController, AplicativoController, AplicativoImportacaoController,
    ],
    providers: [
        TranscricaoRepository, TranscricaoService, GlossarioRepository, GlossarioService,
        IdentidadeRepository, IdentidadeService, FaixaAjusteService,
        DispositivoRepository, DispositivoService, DispositivoGuard,
    ],
})
export class TranscricaoModule {}
