import {
    Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query,
} from "@nestjs/common";
import type {
    TermoGlossarioTranscricaoAlteradoDto, TermoGlossarioTranscricaoAlterarDto,
    TermoGlossarioTranscricaoCriadoDto, TermoGlossarioTranscricaoCriarDto,
    TermoGlossarioTranscricaoResumoDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import { ActiveUser } from "../../core/decorators";
import { DocumentarController } from "../../core/openapi";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { GlossarioService } from "./glossario.service";

/** REST do glossário da campanha; controller fina, autorização do Mestre atual na service. */
@Controller("transcricao/glossario")
@DocumentarController("Transcrições")
export class GlossarioController {
    constructor(private readonly service: GlossarioService) {}

    @Post()
    criarTermo(@Body() dto: TermoGlossarioTranscricaoCriarDto,
        @ActiveUser() usuario: JwtPayload): Promise<TermoGlossarioTranscricaoCriadoDto> {
        return this.service.criarTermo(dto, usuario);
    }

    @Get()
    listarTermos(@Query("campanhaId", ParseIntPipe) campanhaId: number,
        @ActiveUser() usuario: JwtPayload): Promise<TermoGlossarioTranscricaoResumoDto[]> {
        return this.service.listarTermos({ campanhaId }, usuario);
    }

    @Put(":id")
    alterarTermo(@Param("id", ParseIntPipe) id: number, @Body() dto: TermoGlossarioTranscricaoAlterarDto,
        @ActiveUser() usuario: JwtPayload): Promise<TermoGlossarioTranscricaoAlteradoDto> {
        return this.service.alterarTermo({ ...dto, id }, usuario);
    }

    @Delete(":id")
    excluirTermo(@Param("id", ParseIntPipe) id: number, @ActiveUser() usuario: JwtPayload): Promise<void> {
        return this.service.excluirTermo({ id }, usuario);
    }
}
