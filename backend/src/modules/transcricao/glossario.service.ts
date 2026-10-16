import { Injectable } from "@nestjs/common";
import type {
    TermoGlossarioTranscricaoAlteradoDto, TermoGlossarioTranscricaoAlterarDto,
    TermoGlossarioTranscricaoCriadoDto, TermoGlossarioTranscricaoCriarDto,
    TermoGlossarioTranscricaoExcluirDto, TermoGlossarioTranscricaoListarDto,
    TermoGlossarioTranscricaoResumoDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import {
    chaveTermoGlossario, localizarConflitoTermo, TRANSCRICAO_ID_MAXIMO, validarTermoGlossario,
} from "@contratados-rpg/shared/validators";
import { BusinessException, ResourceConflictException, ResourceNotFoundException } from "../../core/exceptions";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { CampanhaRepository } from "../campanha/campanha.repository";
import { CampanhaService } from "../campanha/campanha.service";
import { exigirMestreAtual } from "./acesso-mestre.util";
import { GlossarioRepository } from "./glossario.repository";

const MENSAGENS_TERMO = {
    TIPO: "Termo inválido",
    VAZIO: "Informe o termo",
    CONTROLE: "O termo não pode ter quebra de linha, tabulação nem caracteres invisíveis",
    LONGO: "O termo é longo demais",
} as const;

function validarCorpo(corpo: unknown, campos: readonly string[]): void {
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)
        || Object.keys(corpo).some((campo) => !campos.includes(campo))) {
        throw new BusinessException("Glossário inválido");
    }
}
function validarId(id: unknown): void {
    if (!Number.isSafeInteger(id) || (id as number) <= 0 || (id as number) > TRANSCRICAO_ID_MAXIMO) {
        throw new BusinessException("Identificador inválido");
    }
}
function validarTermo(termo: unknown): string {
    const resultado = validarTermoGlossario(termo);
    if (!resultado.valido) throw new BusinessException(MENSAGENS_TERMO[resultado.motivo]);
    return resultado.valor;
}

/** Glossário privado do Mestre atual da campanha; termos são dicas de reconhecimento, nunca substituições. */
@Injectable()
export class GlossarioService {
    constructor(
        private readonly repositorio: GlossarioRepository,
        private readonly campanhaService: CampanhaService,
        private readonly campanhaRepositorio: CampanhaRepository,
    ) {}

    async criarTermo(dto: TermoGlossarioTranscricaoCriarDto, usuario: JwtPayload): Promise<TermoGlossarioTranscricaoCriadoDto> {
        validarCorpo(dto, ["campanhaId", "termo"]);
        validarId(dto.campanhaId);
        const termo = validarTermo(dto.termo);
        await this.exigirMestre(dto.campanhaId, usuario);
        const parecidoCom = await this.verificarConflito(dto.campanhaId, termo, null);
        try {
            const criado = await this.repositorio.criarTermo({
                campanhaId: dto.campanhaId, termo, chaveTermo: chaveTermoGlossario(termo),
            });
            if (!criado) throw new ResourceNotFoundException("Transcrição");
            return { ...criado, parecidoCom };
        } catch (erro) {
            throw this.traduzirUnicidade(erro, termo);
        }
    }

    async listarTermos(dto: TermoGlossarioTranscricaoListarDto, usuario: JwtPayload): Promise<TermoGlossarioTranscricaoResumoDto[]> {
        validarCorpo(dto, ["campanhaId"]);
        validarId(dto.campanhaId);
        await this.exigirMestre(dto.campanhaId, usuario);
        return this.repositorio.listarTermos({ campanhaId: dto.campanhaId });
    }

    async alterarTermo(dto: TermoGlossarioTranscricaoAlterarDto, usuario: JwtPayload): Promise<TermoGlossarioTranscricaoAlteradoDto> {
        validarCorpo(dto, ["id", "termo"]);
        validarId(dto.id);
        const termo = validarTermo(dto.termo);
        const atual = await this.recuperarAutorizado(dto.id, usuario);
        const parecidoCom = await this.verificarConflito(atual.campanhaId, termo, atual.id);
        try {
            const alterado = await this.repositorio.alterarTermo({ id: dto.id, termo, chaveTermo: chaveTermoGlossario(termo) });
            if (!alterado) throw new ResourceNotFoundException("Transcrição");
            return { ...alterado, parecidoCom };
        } catch (erro) {
            throw this.traduzirUnicidade(erro, termo);
        }
    }

    async excluirTermo(dto: TermoGlossarioTranscricaoExcluirDto, usuario: JwtPayload): Promise<void> {
        validarCorpo(dto, ["id"]);
        validarId(dto.id);
        await this.recuperarAutorizado(dto.id, usuario);
        await this.repositorio.excluirTermo({ id: dto.id });
    }

    /** A campanha vem do TERMO guardado no servidor, nunca do corpo do cliente. */
    private async recuperarAutorizado(id: number, usuario: JwtPayload): Promise<TermoGlossarioTranscricaoResumoDto> {
        const termo = await this.repositorio.recuperarTermo({ id });
        if (!termo) throw new ResourceNotFoundException("Transcrição");
        await this.exigirMestre(termo.campanhaId, usuario);
        return termo;
    }

    private exigirMestre(campanhaId: number, usuario: JwtPayload): Promise<void> {
        return exigirMestreAtual(this.campanhaService, this.campanhaRepositorio, { campanhaId, usuarioId: usuario.sub });
    }

    /** Duplicata (mesma chave) = 409; acento diferente = dica `parecidoCom`, sem bloquear. */
    private async verificarConflito(campanhaId: number, termo: string, ignorarId: number | null): Promise<string | null> {
        const existentes = (await this.repositorio.listarTermos({ campanhaId }))
            .filter((existente) => existente.id !== ignorarId);
        const conflito = localizarConflitoTermo(termo, existentes.map((existente) => existente.termo));
        if (conflito?.tipo === "DUPLICADO") {
            throw new ResourceConflictException(`Já existe o termo "${conflito.existente}" neste glossário`);
        }
        return conflito?.existente ?? null;
    }

    private traduzirUnicidade(erro: unknown, termo: string): unknown {
        if ((erro as { code?: string }).code === "23505") {
            return new ResourceConflictException(`Já existe o termo "${termo}" neste glossário`);
        }
        return erro;
    }
}
