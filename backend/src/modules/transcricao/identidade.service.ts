import { Injectable } from "@nestjs/common";
import type {
    IdentidadeTranscricaoAlteradaDto, IdentidadeTranscricaoAlterarDto, IdentidadeTranscricaoCriadaDto,
    IdentidadeTranscricaoCriarDto, IdentidadeTranscricaoExcluirDto, IdentidadeTranscricaoListarDto,
    IdentidadeTranscricaoResumoDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import {
    chaveTermoGlossario, localizarParticipanteParecido, TRANSCRICAO_ID_MAXIMO, validarRotuloParticipante,
} from "@contratados-rpg/shared/validators";
import { BusinessException, ResourceConflictException, ResourceNotFoundException } from "../../core/exceptions";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { CampanhaRepository } from "../campanha/campanha.repository";
import { CampanhaService } from "../campanha/campanha.service";
import { exigirMestreAtual } from "./acesso-mestre.util";
import { IdentidadeRepository } from "./identidade.repository";

const MENSAGENS_TEXTO = {
    TIPO: "Texto inválido",
    VAZIO: "Preencha o campo",
    CONTROLE: "O texto não pode ter quebra de linha, tabulação nem caracteres invisíveis",
    LONGO: "O texto é longo demais",
} as const;

function validarCorpo(corpo: unknown, campos: readonly string[]): void {
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)
        || Object.keys(corpo).some((campo) => !campos.includes(campo))) {
        throw new BusinessException("Identidade inválida");
    }
}
function validarId(id: unknown): void {
    if (!Number.isSafeInteger(id) || (id as number) <= 0 || (id as number) > TRANSCRICAO_ID_MAXIMO) {
        throw new BusinessException("Identificador inválido");
    }
}
function validarRotulo(texto: unknown): string {
    const resultado = validarRotuloParticipante(texto);
    if (!resultado.valido) throw new BusinessException(MENSAGENS_TEXTO[resultado.motivo]);
    return resultado.valor;
}
function validarConfirmacao(confirmarParecido: unknown): boolean {
    if (confirmarParecido === undefined) return false;
    if (typeof confirmarParecido !== "boolean") throw new BusinessException("Confirmação inválida");
    return confirmarParecido;
}

/** Associações reutilizáveis (nome de origem → participante), do Mestre atual da campanha. Sugestão nunca é confirmação. */
@Injectable()
export class IdentidadeService {
    constructor(
        private readonly repositorio: IdentidadeRepository,
        private readonly campanhaService: CampanhaService,
        private readonly campanhaRepositorio: CampanhaRepository,
    ) {}

    async criarIdentidade(dto: IdentidadeTranscricaoCriarDto, usuario: JwtPayload): Promise<IdentidadeTranscricaoCriadaDto> {
        validarCorpo(dto, ["campanhaId", "nomeOrigem", "participante", "confirmarParecido"]);
        validarId(dto.campanhaId);
        const nomeOrigem = validarRotulo(dto.nomeOrigem);
        const participante = validarRotulo(dto.participante);
        const confirmado = validarConfirmacao(dto.confirmarParecido);
        await this.exigirMestre(dto.campanhaId, usuario);
        const chaveOrigem = chaveTermoGlossario(nomeOrigem);
        const existentes = await this.repositorio.listarIdentidades({ campanhaId: dto.campanhaId });
        const igual = existentes.find((existente) => chaveTermoGlossario(existente.nomeOrigem) === chaveOrigem);
        if (igual) throw new ResourceConflictException(`O nome de origem "${igual.nomeOrigem}" já está associado`);
        const parecidoCom = await this.verificarParticipante(dto.campanhaId, participante, confirmado);
        try {
            const criada = await this.repositorio.criarIdentidade({ campanhaId: dto.campanhaId, nomeOrigem, chaveOrigem, participante });
            if (!criada) throw new ResourceNotFoundException("Transcrição");
            return { ...criada, parecidoCom };
        } catch (erro) {
            throw this.traduzirUnicidade(erro, nomeOrigem);
        }
    }

    async listarIdentidades(dto: IdentidadeTranscricaoListarDto, usuario: JwtPayload): Promise<IdentidadeTranscricaoResumoDto[]> {
        validarCorpo(dto, ["campanhaId"]);
        validarId(dto.campanhaId);
        await this.exigirMestre(dto.campanhaId, usuario);
        return this.repositorio.listarIdentidades({ campanhaId: dto.campanhaId });
    }

    async alterarIdentidade(dto: IdentidadeTranscricaoAlterarDto, usuario: JwtPayload): Promise<IdentidadeTranscricaoAlteradaDto> {
        validarCorpo(dto, ["id", "participante", "confirmarParecido"]);
        validarId(dto.id);
        const participante = validarRotulo(dto.participante);
        const confirmado = validarConfirmacao(dto.confirmarParecido);
        const atual = await this.recuperarAutorizada(dto.id, usuario);
        const parecidoCom = await this.verificarParticipante(atual.campanhaId, participante, confirmado);
        const alterada = await this.repositorio.alterarIdentidade({ id: dto.id, participante });
        if (!alterada) throw new ResourceNotFoundException("Transcrição");
        return { ...alterada, parecidoCom };
    }

    async excluirIdentidade(dto: IdentidadeTranscricaoExcluirDto, usuario: JwtPayload): Promise<void> {
        validarCorpo(dto, ["id"]);
        validarId(dto.id);
        await this.recuperarAutorizada(dto.id, usuario);
        await this.repositorio.excluirIdentidade({ id: dto.id });
    }

    /** A campanha vem da identidade guardada no servidor, nunca do corpo do cliente. */
    private async recuperarAutorizada(id: number, usuario: JwtPayload): Promise<IdentidadeTranscricaoResumoDto> {
        const identidade = await this.repositorio.recuperarIdentidade({ id });
        if (!identidade) throw new ResourceNotFoundException("Transcrição");
        await this.exigirMestre(identidade.campanhaId, usuario);
        return identidade;
    }

    private exigirMestre(campanhaId: number, usuario: JwtPayload): Promise<void> {
        return exigirMestreAtual(this.campanhaService, this.campanhaRepositorio, { campanhaId, usuarioId: usuario.sub });
    }

    /** D-06b: "Joao" ao lado de "João" só entra com confirmação explícita; nunca é fundido sozinho. */
    private async verificarParticipante(campanhaId: number, participante: string, confirmado: boolean): Promise<string | null> {
        const parecido = localizarParticipanteParecido(participante, await this.repositorio.listarParticipantes({ campanhaId, excluirFaixaId: null }));
        if (parecido !== null && !confirmado) {
            throw new ResourceConflictException(
                `Já existe o participante "${parecido}", parecido com "${participante}". Confirme se são pessoas diferentes`);
        }
        return parecido;
    }

    private traduzirUnicidade(erro: unknown, nomeOrigem: string): unknown {
        if ((erro as { code?: string }).code === "23505") {
            return new ResourceConflictException(`O nome de origem "${nomeOrigem}" já está associado`);
        }
        return erro;
    }
}
