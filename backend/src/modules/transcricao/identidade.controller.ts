import {
    Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query,
} from "@nestjs/common";
import type {
    FaixaTranscricaoAlteradaDto, FaixaTranscricaoAlterarDto, IdentidadeTranscricaoAlteradaDto,
    IdentidadeTranscricaoAlterarDto, IdentidadeTranscricaoCriadaDto, IdentidadeTranscricaoCriarDto,
    IdentidadeTranscricaoResumoDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import { ActiveUser } from "../../core/decorators";
import { DocumentarController } from "../../core/openapi";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { FaixaAjusteService } from "./faixa-ajuste.service";
import { IdentidadeService } from "./identidade.service";

/** REST web das associações de identidade da campanha; JWT do Mestre atual, controller fina. */
@Controller("transcricao/identidade")
@DocumentarController("Transcrições")
export class IdentidadeController {
    constructor(private readonly service: IdentidadeService) {}

    @Post()
    criarIdentidade(@Body() dto: IdentidadeTranscricaoCriarDto,
        @ActiveUser() usuario: JwtPayload): Promise<IdentidadeTranscricaoCriadaDto> {
        return this.service.criarIdentidade(dto, usuario);
    }

    @Get()
    listarIdentidades(@Query("campanhaId", ParseIntPipe) campanhaId: number,
        @ActiveUser() usuario: JwtPayload): Promise<IdentidadeTranscricaoResumoDto[]> {
        return this.service.listarIdentidades({ campanhaId }, usuario);
    }

    @Put(":id")
    alterarIdentidade(@Param("id", ParseIntPipe) id: number, @Body() dto: IdentidadeTranscricaoAlterarDto,
        @ActiveUser() usuario: JwtPayload): Promise<IdentidadeTranscricaoAlteradaDto> {
        return this.service.alterarIdentidade({ ...dto, id }, usuario);
    }

    @Delete(":id")
    excluirIdentidade(@Param("id", ParseIntPipe) id: number, @ActiveUser() usuario: JwtPayload): Promise<void> {
        return this.service.excluirIdentidade({ id }, usuario);
    }
}

/** Confirmação de identidade e offset manual da faixa (web). */
@Controller("transcricao/faixa")
@DocumentarController("Transcrições")
export class FaixaAjusteController {
    constructor(private readonly service: FaixaAjusteService) {}

    @Put(":id")
    alterarFaixa(@Param("id", ParseIntPipe) id: number, @Body() dto: FaixaTranscricaoAlterarDto,
        @ActiveUser() usuario: JwtPayload): Promise<FaixaTranscricaoAlteradaDto> {
        return this.service.alterarFaixa({ ...dto, id }, usuario);
    }
}
