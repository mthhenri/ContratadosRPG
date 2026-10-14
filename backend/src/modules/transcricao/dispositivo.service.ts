import { Injectable, UnauthorizedException, HttpException, HttpStatus } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DispositivoVinculoCriarDto, DispositivoVinculoCriadoDto, DispositivoVinculoConfirmarDto,
    DispositivoVinculoRecuperadoDto, DispositivoResumoDto, DispositivoEstadoDto,
    TranscricaoIntencaoCriadaDto, TranscricaoIntencaoEstadoDto, DispositivoContextoDto } from "@contratados-rpg/shared/dtos/transcricao";
import { BusinessException, ResourceNotFoundException } from "../../core/exceptions";
import { TransacaoService } from "../../database/transacao.service";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { CampanhaRepository } from "../campanha/campanha.repository";
import { DispositivoRepository, type DispositivoAutenticado } from "./dispositivo.repository";
import { TranscricaoService } from "./transcricao.service";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function validarIdentificador(id: string): void { if (typeof id !== "string" || !UUID.test(id)) throw new BusinessException("Identificador inválido."); }
function validarCorpo(dto: unknown, campos: string[]): void {
    if (!dto || typeof dto !== "object" || Array.isArray(dto) || Object.keys(dto).some(k => !campos.includes(k))) throw new BusinessException("Pedido inválido.");
}
function hashSegredo(segredo: string): string {
    if (typeof segredo !== "string" || !/^[a-zA-Z0-9_-]{43}$/.test(segredo)) throw new UnauthorizedException();
    return createHash("sha256").update(segredo).digest("hex");
}
/** Vínculo não concede JWT web nem acesso a outros módulos. */
@Injectable()
export class DispositivoService {
    private readonly inicios: number[] = [];
    constructor(private readonly repo: DispositivoRepository, private readonly campanha: CampanhaRepository,
        private readonly transcricao: TranscricaoService, private readonly transacao: TransacaoService) {}
    async iniciar(dto: DispositivoVinculoCriarDto): Promise<DispositivoVinculoCriadoDto> {
        validarCorpo(dto, ["segredoHash", "nome"]);
        if (!/^[a-f0-9]{64}$/.test(dto.segredoHash) || typeof dto.nome !== "string" ||
            !dto.nome.trim() || dto.nome.trim().length > 120 || Array.from(dto.nome).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw new BusinessException("Pedido inválido.");
        // Limite técnico global por processo, memória limitada; não é quota comercial.
        const agora = Date.now();
        while (this.inicios.length && this.inicios[0] <= agora - 60_000) this.inicios.shift();
        if (this.inicios.length >= 60) throw new HttpException("Muitas solicitações; tente novamente mais tarde.", HttpStatus.TOO_MANY_REQUESTS);
        this.inicios.push(agora);
        const pedido = await this.repo.iniciar({ ...dto, nome: dto.nome.trim(), identificador: randomUUID(), codigo: randomBytes(4).toString("hex").toUpperCase() });
        if (!pedido) throw new BusinessException("Solicitação já utilizada; inicie um novo vínculo.");
        return pedido;
    }
    async consultarPedido(identificador: string, _usuario: JwtPayload): Promise<DispositivoVinculoRecuperadoDto> {
        void _usuario;
        validarIdentificador(identificador);
        const pedido = await this.repo.consultarPedido({ identificador });
        if (!pedido) throw new ResourceNotFoundException("Vínculo");
        return pedido;
    }
    async confirmar(dto: DispositivoVinculoConfirmarDto, usuario: JwtPayload): Promise<DispositivoResumoDto> {
        validarCorpo(dto, ["identificador", "codigo"]); validarIdentificador(dto.identificador);
        if (typeof dto.codigo !== "string" || !/^[A-F0-9]{8}$/.test(dto.codigo)) throw new BusinessException("Código inválido.");
        if (await this.campanha.contarCampanhasComoMestre({ id: usuario.sub }) < 1) throw new ResourceNotFoundException("Vínculo");
        const pedido = await this.consultarPedido(dto.identificador, usuario);
        if (pedido.codigo !== dto.codigo) throw new BusinessException("Confira o código no aplicativo.");
        const dispositivo = await this.repo.confirmar({ ...dto, usuarioId: usuario.sub, tokenVersao: usuario.tokenVersao });
        if (!dispositivo) throw new ResourceNotFoundException("Vínculo");
        return dispositivo;
    }
    async autenticar(segredo: string): Promise<DispositivoAutenticado> {
        const usuario = await this.repo.autenticar({ segredoHash: hashSegredo(segredo) });
        if (!usuario) throw new UnauthorizedException();
        return usuario;
    }
    async consultarEstado(segredo: string): Promise<DispositivoEstadoDto> { return this.repo.consultarEstado({ segredoHash: hashSegredo(segredo) }); }
    async desconectar(segredo: string): Promise<void> {
        const segredoHash = hashSegredo(segredo);
        await this.transacao.executar(() => this.repo.revogarCredencial({ segredoHash }));
    }
    async listar(usuario: JwtPayload): Promise<DispositivoResumoDto[]> { return this.repo.listar({ usuarioId: usuario.sub }); }
    async revogar(identificador: string, usuario: JwtPayload): Promise<void> { validarIdentificador(identificador); await this.repo.revogar({ identificador, usuarioId: usuario.sub }); }
    async criarIntencao(sessaoId: number, usuario: JwtPayload): Promise<TranscricaoIntencaoCriadaDto> {
        await this.transcricao.recuperarSessao({ id: sessaoId }, usuario);
        return this.repo.criarIntencao({ identificador: randomUUID(), sessaoId, usuarioId: usuario.sub });
    }
    async consultarIntencao(identificador: string, usuario: JwtPayload): Promise<TranscricaoIntencaoEstadoDto> {
        validarIdentificador(identificador);
        const estado = await this.repo.consultarIntencao({ identificador, usuarioId: usuario.sub });
        if (!estado) throw new ResourceNotFoundException("Abertura"); return estado;
    }
    async resolverIntencao(identificador: string, usuario: DispositivoAutenticado): Promise<DispositivoContextoDto> {
        validarIdentificador(identificador);
        return this.transacao.executar(async () => {
            const intencao = await this.repo.consumirIntencao({ identificador, usuarioId: usuario.sub, dispositivoId: usuario.dispositivoId, tokenVersao: usuario.tokenVersao });
            if (!intencao) throw new ResourceNotFoundException("Abertura");
            const sessao = await this.transcricao.recuperarSessao({ id: intencao.sessaoId }, usuario);
            return { sessaoId: sessao.id, campanhaId: sessao.campanhaId, titulo: sessao.titulo };
        });
    }
}
