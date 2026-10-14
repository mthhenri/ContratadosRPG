import {
    Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseBoolPipe,
    ParseIntPipe, Post, Put, Query,
} from "@nestjs/common";
import type {
    SessaoTranscricaoCriarDto, SessaoTranscricaoCriadaDto, SessaoTranscricaoRecuperadaDto,
    SessaoTranscricaoResumoDto, SessaoTranscricaoAlterarDto, SessaoTranscricaoAlteradaDto,
    SessaoTranscricaoArquivamentoAlterarDto, SessaoTranscricaoArquivamentoAlteradaDto,
    FaixaTranscricaoCriarDto, FaixaTranscricaoCriadaDto, FaixaTranscricaoResumoDto,
    FaixaTranscricaoRecuperadaDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import { ActiveUser } from "../../core/decorators";
import { DocumentarController } from "../../core/openapi";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { TranscricaoService } from "./transcricao.service";

/** REST de metadados privado; guards globais e autorização na service. */
@Controller("transcricao")
@DocumentarController("Transcrições")
export class TranscricaoController {
    constructor(private readonly service: TranscricaoService) {}

    @Post("sessao")
    criarSessao(@Body() dto: SessaoTranscricaoCriarDto,
        @ActiveUser() usuario: JwtPayload): Promise<SessaoTranscricaoCriadaDto> {
        return this.service.criarSessao(dto, usuario);
    }

    @Get("sessao")
    listarSessoes(@Query("campanhaId", ParseIntPipe) campanhaId: number,
        @Query("arquivadas", new DefaultValuePipe(false), ParseBoolPipe) arquivadas: boolean,
        @ActiveUser() usuario: JwtPayload): Promise<SessaoTranscricaoResumoDto[]> {
        return this.service.listarSessoes({ campanhaId, arquivadas }, usuario);
    }

    @Get("sessao/:id")
    recuperarSessao(@Param("id", ParseIntPipe) id: number,
        @ActiveUser() usuario: JwtPayload): Promise<SessaoTranscricaoRecuperadaDto> {
        return this.service.recuperarSessao({ id }, usuario);
    }

    @Put("sessao/:id")
    alterarSessao(@Param("id", ParseIntPipe) id: number, @Body() dto: SessaoTranscricaoAlterarDto,
        @ActiveUser() usuario: JwtPayload): Promise<SessaoTranscricaoAlteradaDto> {
        return this.service.alterarSessao({ ...dto, id }, usuario);
    }

    @Put("sessao/:id/arquivamento")
    alterarArquivamento(@Param("id", ParseIntPipe) id: number,
        @Body() dto: SessaoTranscricaoArquivamentoAlterarDto,
        @ActiveUser() usuario: JwtPayload): Promise<SessaoTranscricaoArquivamentoAlteradaDto> {
        return this.service.alterarArquivamento({ ...dto, id }, usuario);
    }

    @Delete("sessao/:id")
    excluirSessao(@Param("id", ParseIntPipe) id: number,
        @ActiveUser() usuario: JwtPayload): Promise<void> {
        return this.service.excluirSessao({ id }, usuario);
    }

    @Post("sessao/:sessaoId/faixa")
    criarFaixa(@Param("sessaoId", ParseIntPipe) sessaoId: number, @Body() dto: FaixaTranscricaoCriarDto,
        @ActiveUser() usuario: JwtPayload): Promise<FaixaTranscricaoCriadaDto> {
        return this.service.criarFaixa({ ...dto, sessaoId }, usuario);
    }

    @Get("sessao/:sessaoId/faixa")
    listarFaixas(@Param("sessaoId", ParseIntPipe) sessaoId: number,
        @ActiveUser() usuario: JwtPayload): Promise<FaixaTranscricaoResumoDto[]> {
        return this.service.listarFaixas({ sessaoId }, usuario);
    }

    @Get("faixa/:id")
    recuperarFaixa(@Param("id", ParseIntPipe) id: number,
        @ActiveUser() usuario: JwtPayload): Promise<FaixaTranscricaoRecuperadaDto> {
        return this.service.recuperarFaixa({ id }, usuario);
    }
}
