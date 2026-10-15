import { Body, Controller, Delete, Get, Headers, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import type { DispositivoVinculoCriarDto, DispositivoVinculoCriadoDto, DispositivoVinculoConfirmarDto,
    DispositivoVinculoRecuperadoDto, DispositivoResumoDto, DispositivoEstadoDto,
    DispositivoContextoDto, TranscricaoIntencaoCriadaDto, TranscricaoIntencaoEstadoDto } from "@contratados-rpg/shared/dtos/transcricao";
import { ActiveUser } from "../../core/decorators";
import { Public } from "../../core/decorators/public.decorator";
import { DocumentarController } from "../../core/openapi";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import type { DispositivoAutenticado } from "./dispositivo.repository";
import { DispositivoGuard } from "./dispositivo.guard";
import { DispositivoService } from "./dispositivo.service";
/** Inicialização anônima e prova do segredo pendente, sem acesso a sessões. */
@Controller("transcricao/vinculo")
@DocumentarController("Transcrições")
export class VinculoController {
    constructor(private readonly service: DispositivoService) {}
    @Public()
    @Post()
    iniciar(@Body() dto: DispositivoVinculoCriarDto): Promise<DispositivoVinculoCriadoDto> { return this.service.iniciar(dto); }
    @Public()
    @ApiBearerAuth("dispositivo")
    @Delete()
    desconectar(@Headers("authorization") header = ""): Promise<void> {
        return this.service.desconectar(header.startsWith("Bearer ") ? header.slice(7) : "");
    }
    @Public()
    @ApiBearerAuth("dispositivo")
    @Get("estado")
    estado(@Headers("authorization") header = ""): Promise<DispositivoEstadoDto> {
        return this.service.consultarEstado(header.startsWith("Bearer ") ? header.slice(7) : "");
    }
}
/** Rotas web continuam exigindo JWT e autorização atual de Mestre. */
@Controller("transcricao")
@DocumentarController("Transcrições")
export class DispositivoController {
    constructor(private readonly service: DispositivoService) {}
    @Get("vinculo/:identificador")
    pedido(@Param("identificador") identificador: string, @ActiveUser() usuario: JwtPayload): Promise<DispositivoVinculoRecuperadoDto> { return this.service.consultarPedido(identificador, usuario); }
    @Post("vinculo/:identificador/confirmar")
    confirmar(@Param("identificador") identificador: string, @Body() dto: DispositivoVinculoConfirmarDto,
        @ActiveUser() usuario: JwtPayload): Promise<DispositivoResumoDto> { return this.service.confirmar({ ...dto, identificador }, usuario); }
    @Get("dispositivo")
    listar(@ActiveUser() usuario: JwtPayload): Promise<DispositivoResumoDto[]> { return this.service.listar(usuario); }
    @Delete("dispositivo/:identificador")
    revogar(@Param("identificador") identificador: string, @ActiveUser() usuario: JwtPayload): Promise<void> { return this.service.revogar(identificador, usuario); }
    @Post("sessao/:sessaoId/abertura")
    criarIntencao(@Param("sessaoId", ParseIntPipe) sessaoId: number, @ActiveUser() usuario: JwtPayload): Promise<TranscricaoIntencaoCriadaDto> { return this.service.criarIntencao(sessaoId, usuario); }
    @Get("abertura/:identificador")
    consultarIntencao(@Param("identificador") identificador: string, @ActiveUser() usuario: JwtPayload): Promise<TranscricaoIntencaoEstadoDto> { return this.service.consultarIntencao(identificador, usuario); }
}
/** Segredo do app é aceito exclusivamente aqui (e na consulta de vínculo). */
@Public()
@UseGuards(DispositivoGuard)
@ApiBearerAuth("dispositivo")
@Controller("transcricao/aplicativo")
@DocumentarController("Transcrições")
export class AplicativoController {
    constructor(private readonly service: DispositivoService) {}
    @Post("abertura/:identificador")
    resolver(@Param("identificador") identificador: string, @ActiveUser() usuario: DispositivoAutenticado): Promise<DispositivoContextoDto> { return this.service.resolverIntencao(identificador, usuario); }
    @Delete("vinculo")
    desconectar(@ActiveUser() usuario: DispositivoAutenticado): Promise<void> { return this.service.revogar(usuario.dispositivoIdentificador, usuario); }
}
