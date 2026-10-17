import { Injectable } from "@nestjs/common";
import type { FaixaTranscricaoAlteradaDto, FaixaTranscricaoAlterarDto } from "@contratados-rpg/shared/dtos/transcricao";
import {
    localizarParticipanteParecido, TRANSCRICAO_ID_MAXIMO, TRANSCRICAO_TEMPO_MAXIMO, validarRotuloParticipante,
} from "@contratados-rpg/shared/validators";
import { BusinessException, ResourceConflictException, ResourceNotFoundException } from "../../core/exceptions";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { CampanhaRepository } from "../campanha/campanha.repository";
import { CampanhaService } from "../campanha/campanha.service";
import { exigirMestreAtual } from "./acesso-mestre.util";
import { IdentidadeRepository } from "./identidade.repository";
import { TranscricaoRepository } from "./transcricao.repository";

const CAMPOS = ["id", "participante", "identidadeConfirmada", "deslocamentoMilissegundos",
    "silencioInicialMilissegundos", "confirmarParecido"] as const;

/**
 * Confirmação/correção de identidade e offset manual da faixa (task 02). O offset é sempre manual:
 * o silêncio inicial é só informativo e jamais desloca timestamps (D-05+).
 */
@Injectable()
export class FaixaAjusteService {
    constructor(
        private readonly transcricaoRepositorio: TranscricaoRepository,
        private readonly identidadeRepositorio: IdentidadeRepository,
        private readonly campanhaService: CampanhaService,
        private readonly campanhaRepositorio: CampanhaRepository,
    ) {}

    async alterarFaixa(dto: FaixaTranscricaoAlterarDto, usuario: JwtPayload): Promise<FaixaTranscricaoAlteradaDto> {
        this.validarCorpo(dto);
        const participante = this.validarParticipante(dto.participante);
        // Pais resolvidos no servidor: faixa → sessão → campanha. O cliente não escolhe a campanha.
        const faixa = await this.transcricaoRepositorio.recuperarFaixa({ id: dto.id });
        if (!faixa) throw new ResourceNotFoundException("Transcrição");
        const sessao = await this.transcricaoRepositorio.recuperarSessao({ id: faixa.sessaoId });
        if (!sessao) throw new ResourceNotFoundException("Transcrição");
        await exigirMestreAtual(this.campanhaService, this.campanhaRepositorio,
            { campanhaId: sessao.campanhaId, usuarioId: usuario.sub });
        const parecido = localizarParticipanteParecido(participante,
            await this.identidadeRepositorio.listarParticipantes({ campanhaId: sessao.campanhaId, excluirFaixaId: dto.id }));
        if (parecido !== null && dto.confirmarParecido !== true) {
            throw new ResourceConflictException(
                `Já existe o participante "${parecido}", parecido com "${participante}". Confirme se são pessoas diferentes`);
        }
        const alterada = await this.transcricaoRepositorio.alterarFaixa({
            id: dto.id, participante, identidadeConfirmada: dto.identidadeConfirmada,
            deslocamentoMilissegundos: dto.deslocamentoMilissegundos,
            silencioInicialMilissegundos: dto.silencioInicialMilissegundos,
        });
        if (!alterada) throw new ResourceNotFoundException("Transcrição");
        return { ...alterada, parecidoCom: parecido };
    }

    private validarCorpo(dto: FaixaTranscricaoAlterarDto): void {
        const corpo = dto as unknown;
        if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)
            || Object.keys(corpo).some((campo) => !(CAMPOS as readonly string[]).includes(campo))) {
            throw new BusinessException("Faixa inválida");
        }
        if (!Number.isSafeInteger(dto.id) || dto.id <= 0 || dto.id > TRANSCRICAO_ID_MAXIMO) {
            throw new BusinessException("Identificador inválido");
        }
        if (typeof dto.identidadeConfirmada !== "boolean") throw new BusinessException("Confirmação de identidade inválida");
        if (dto.confirmarParecido !== undefined && typeof dto.confirmarParecido !== "boolean") {
            throw new BusinessException("Confirmação inválida");
        }
        if (!Number.isSafeInteger(dto.deslocamentoMilissegundos)
            || Math.abs(dto.deslocamentoMilissegundos) > TRANSCRICAO_TEMPO_MAXIMO) {
            throw new BusinessException("Deslocamento inválido");
        }
        const silencio = dto.silencioInicialMilissegundos;
        if (silencio !== null && (!Number.isSafeInteger(silencio) || silencio < 0 || silencio > TRANSCRICAO_TEMPO_MAXIMO)) {
            throw new BusinessException("Silêncio inicial inválido");
        }
    }

    private validarParticipante(participante: unknown): string {
        const resultado = validarRotuloParticipante(participante);
        if (!resultado.valido) throw new BusinessException("Participante inválido");
        return resultado.valor;
    }
}
