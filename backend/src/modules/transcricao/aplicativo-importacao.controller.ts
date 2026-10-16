import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import type {
    FaixaTranscricaoAlteradaDto, FaixaTranscricaoAlterarDto, FaixaTranscricaoCriadaDto,
    FaixaTranscricaoCriarDto, FaixaTranscricaoResumoDto, IdentidadeTranscricaoCriadaDto,
    IdentidadeTranscricaoCriarDto, IdentidadeTranscricaoResumoDto, TermoGlossarioTranscricaoResumoDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import { ActiveUser } from "../../core/decorators";
import { Public } from "../../core/decorators/public.decorator";
import { DocumentarController } from "../../core/openapi";
import { DispositivoGuard } from "./dispositivo.guard";
import type { DispositivoAutenticado } from "./dispositivo.repository";
import { FaixaAjusteService } from "./faixa-ajuste.service";
import { GlossarioService } from "./glossario.service";
import { IdentidadeService } from "./identidade.service";
import { TranscricaoService } from "./transcricao.service";

/**
 * Rotas de importação do app (task 02). O segredo do dispositivo vale só aqui e em /transcricao/aplicativo;
 * cada chamada revalida o Mestre ATUAL da campanha do recurso, exatamente como a rota web, e nunca recebe WAV,
 * caminho local nem hash de áudio. O JWT web não autentica este controller.
 */
@Public()
@UseGuards(DispositivoGuard)
@ApiBearerAuth("dispositivo")
@Controller("transcricao/aplicativo")
@DocumentarController("Transcrições")
export class AplicativoImportacaoController {
    constructor(
        private readonly glossario: GlossarioService,
        private readonly identidades: IdentidadeService,
        private readonly faixas: TranscricaoService,
        private readonly ajuste: FaixaAjusteService,
    ) {}

    @Get("glossario")
    listarGlossario(@Query("campanhaId", ParseIntPipe) campanhaId: number,
        @ActiveUser() usuario: DispositivoAutenticado): Promise<TermoGlossarioTranscricaoResumoDto[]> {
        return this.glossario.listarTermos({ campanhaId }, usuario);
    }

    @Get("identidade")
    listarIdentidades(@Query("campanhaId", ParseIntPipe) campanhaId: number,
        @ActiveUser() usuario: DispositivoAutenticado): Promise<IdentidadeTranscricaoResumoDto[]> {
        return this.identidades.listarIdentidades({ campanhaId }, usuario);
    }

    @Post("identidade")
    criarIdentidade(@Body() dto: IdentidadeTranscricaoCriarDto,
        @ActiveUser() usuario: DispositivoAutenticado): Promise<IdentidadeTranscricaoCriadaDto> {
        return this.identidades.criarIdentidade(dto, usuario);
    }

    @Get("sessao/:sessaoId/faixa")
    listarFaixas(@Param("sessaoId", ParseIntPipe) sessaoId: number,
        @ActiveUser() usuario: DispositivoAutenticado): Promise<FaixaTranscricaoResumoDto[]> {
        return this.faixas.listarFaixas({ sessaoId }, usuario);
    }

    @Post("sessao/:sessaoId/faixa")
    criarFaixa(@Param("sessaoId", ParseIntPipe) sessaoId: number, @Body() dto: FaixaTranscricaoCriarDto,
        @ActiveUser() usuario: DispositivoAutenticado): Promise<FaixaTranscricaoCriadaDto> {
        return this.faixas.criarFaixa({ ...dto, sessaoId }, usuario);
    }

    @Put("faixa/:id")
    alterarFaixa(@Param("id", ParseIntPipe) id: number, @Body() dto: FaixaTranscricaoAlterarDto,
        @ActiveUser() usuario: DispositivoAutenticado): Promise<FaixaTranscricaoAlteradaDto> {
        return this.ajuste.alterarFaixa({ ...dto, id }, usuario);
    }
}
