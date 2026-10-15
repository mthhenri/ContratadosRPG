import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
    SessaoTranscricaoCriarDto, SessaoTranscricaoCriadaDto, SessaoTranscricaoRecuperarDto,
    SessaoTranscricaoRecuperadaDto, SessaoTranscricaoListarDto, SessaoTranscricaoResumoDto,
    SessaoTranscricaoAlterarDto, SessaoTranscricaoAlteradaDto,
    SessaoTranscricaoArquivamentoAlterarDto, SessaoTranscricaoArquivamentoAlteradaDto,
    SessaoTranscricaoExcluirDto, FaixaTranscricaoCriarDto, FaixaTranscricaoCriadaDto,
    FaixaTranscricaoListarDto, FaixaTranscricaoResumoDto, FaixaTranscricaoRecuperarDto,
    FaixaTranscricaoRecuperadaDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import type { CampanhaMembroInternoRecuperarDto } from "@contratados-rpg/shared/dtos/campanha";
import { TRANSCRICAO_ID_MAXIMO, TRANSCRICAO_NOME_MAXIMO, TRANSCRICAO_TITULO_MAXIMO } from "@contratados-rpg/shared/validators";
import { BusinessException, ResourceNotFoundException, UnauthorizedAccessException } from "../../core/exceptions";
import { TransacaoService } from "../../database/transacao.service";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { CampanhaRepository } from "../campanha/campanha.repository";
import { CampanhaService } from "../campanha/campanha.service";
import { TranscricaoRepository } from "./transcricao.repository";

function validarCorpo(corpo: unknown, campos: readonly string[]): void {
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)
        || Object.keys(corpo).some((campo) => !campos.includes(campo))) {
        throw new BusinessException("Metadados de transcrição inválidos");
    }
}
function validarId(id: unknown): void {
    if (!Number.isSafeInteger(id) || (id as number) <= 0 || (id as number) > TRANSCRICAO_ID_MAXIMO) {
        throw new BusinessException("Identificador inválido");
    }
}
function validarTexto(texto: unknown, limite: number): string {
    if (typeof texto !== "string" || !texto.trim() || texto.trim().length > limite) {
        throw new BusinessException("Texto de metadados inválido");
    }
    return texto.trim();
}

/** Domínio privado de gravação: autorização atual por campanha, nunca por tipo global. */
@Injectable()
export class TranscricaoService {
    constructor(
        private readonly repositorio: TranscricaoRepository,
        private readonly campanhaService: CampanhaService,
        private readonly campanhaRepositorio: CampanhaRepository,
        private readonly transacaoService: TransacaoService,
    ) {}

    /** Cria apenas metadados; identidade é emitida pelo servidor. */
    async criarSessao(dto: SessaoTranscricaoCriarDto, usuario: JwtPayload): Promise<SessaoTranscricaoCriadaDto> {
        validarCorpo(dto, ["campanhaId", "titulo"]);
        validarId(dto.campanhaId);
        const titulo = validarTexto(dto.titulo, TRANSCRICAO_TITULO_MAXIMO);
        await this.validarAcessoCampanha({ campanhaId: dto.campanhaId, usuarioId: usuario.sub });
        return this.repositorio.criarSessao({ campanhaId: dto.campanhaId, titulo, identificador: randomUUID() });
    }

    /** O filtro booleano é validado, sem coerção de strings falsy/truthy. */
    async listarSessoes(dto: SessaoTranscricaoListarDto, usuario: JwtPayload): Promise<SessaoTranscricaoResumoDto[]> {
        validarCorpo(dto, ["campanhaId", "arquivadas"]);
        validarId(dto.campanhaId);
        if (dto.arquivadas !== undefined && typeof dto.arquivadas !== "boolean") {
            throw new BusinessException("Filtro de arquivamento inválido");
        }
        await this.validarAcessoCampanha({ campanhaId: dto.campanhaId, usuarioId: usuario.sub });
        return this.repositorio.listarSessoes({ campanhaId: dto.campanhaId, arquivadas: dto.arquivadas ?? false });
    }

    /** Revalida Mestre atual em cada leitura, inclusive após transferência. */
    async recuperarSessao(dto: SessaoTranscricaoRecuperarDto, usuario: JwtPayload): Promise<SessaoTranscricaoRecuperadaDto> {
        validarCorpo(dto, ["id"]);
        validarId(dto.id);
        const sessao = await this.repositorio.recuperarSessao(dto);
        if (!sessao) throw new ResourceNotFoundException("Transcrição");
        await this.validarAcessoCampanha({ campanhaId: sessao.campanhaId, usuarioId: usuario.sub });
        return sessao;
    }

    /** Altera título sem aceitar conteúdo ou dados de campanha pelo corpo. */
    async alterarSessao(dto: SessaoTranscricaoAlterarDto, usuario: JwtPayload): Promise<SessaoTranscricaoAlteradaDto> {
        validarCorpo(dto, ["id", "titulo"]);
        const titulo = validarTexto(dto.titulo, TRANSCRICAO_TITULO_MAXIMO);
        await this.recuperarSessao({ id: dto.id }, usuario);
        const sessao = await this.repositorio.alterarSessao({ id: dto.id, titulo });
        if (!sessao) throw new ResourceNotFoundException("Transcrição");
        return sessao;
    }

    /** Arquivamento é reversível e não interfere nos resultados. */
    async alterarArquivamento(dto: SessaoTranscricaoArquivamentoAlterarDto, usuario: JwtPayload): Promise<SessaoTranscricaoArquivamentoAlteradaDto> {
        validarCorpo(dto, ["id", "arquivada"]);
        if (typeof dto.arquivada !== "boolean") throw new BusinessException("Arquivamento inválido");
        await this.recuperarSessao({ id: dto.id }, usuario);
        const sessao = await this.repositorio.alterarArquivamento(dto);
        if (!sessao) throw new ResourceNotFoundException("Transcrição");
        return sessao;
    }

    /** Exclui raiz/descendentes atomicamente, preservando sessões alheias. */
    async excluirSessao(dto: SessaoTranscricaoExcluirDto, usuario: JwtPayload): Promise<void> {
        validarCorpo(dto, ["id"]);
        await this.recuperarSessao(dto, usuario);
        await this.transacaoService.executar(() => this.repositorio.excluirSessao(dto));
    }

    /** Registra arquivo por nome, sem conteúdo, path local ou identificação automática. */
    async criarFaixa(dto: FaixaTranscricaoCriarDto, usuario: JwtPayload): Promise<FaixaTranscricaoCriadaDto> {
        validarCorpo(dto, ["sessaoId", "nomeArquivo", "participante", "deslocamentoMilissegundos"]);
        const nomeArquivo = validarTexto(dto.nomeArquivo, TRANSCRICAO_NOME_MAXIMO);
        const participante = validarTexto(dto.participante, TRANSCRICAO_NOME_MAXIMO);
        if (/[\\/:]/.test(nomeArquivo) || [...nomeArquivo].some((letra) => letra.charCodeAt(0) < 32)
            || nomeArquivo === ".." || nomeArquivo === "."
            || !Number.isSafeInteger(dto.deslocamentoMilissegundos)) {
            throw new BusinessException("Nome de arquivo ou deslocamento inválido");
        }
        await this.recuperarSessao({ id: dto.sessaoId }, usuario);
        const faixa = await this.repositorio.criarFaixa({ sessaoId: dto.sessaoId, nomeArquivo,
            participante, deslocamentoMilissegundos: dto.deslocamentoMilissegundos,
            identificador: randomUUID() });
        if (!faixa) throw new ResourceNotFoundException("Transcrição");
        return faixa;
    }

    /** Lista apenas metadados após autorização da sessão mãe. */
    async listarFaixas(dto: FaixaTranscricaoListarDto, usuario: JwtPayload): Promise<FaixaTranscricaoResumoDto[]> {
        validarCorpo(dto, ["sessaoId"]);
        await this.recuperarSessao({ id: dto.sessaoId }, usuario);
        return this.repositorio.listarFaixas(dto);
    }

    /** Id de faixa resolve sua sessão no servidor, sem confiar em pai do cliente. */
    async recuperarFaixa(dto: FaixaTranscricaoRecuperarDto, usuario: JwtPayload): Promise<FaixaTranscricaoRecuperadaDto> {
        validarCorpo(dto, ["id"]);
        validarId(dto.id);
        const faixa = await this.repositorio.recuperarFaixa(dto);
        if (!faixa) throw new ResourceNotFoundException("Transcrição");
        await this.recuperarSessao({ id: faixa.sessaoId }, usuario);
        return faixa;
    }

    private async validarAcessoCampanha(dto: CampanhaMembroInternoRecuperarDto): Promise<void> {
        try {
            const membro = await this.campanhaService.validarMembro(dto);
            if (!this.campanhaService.ehMestre(membro.papel)) throw new ResourceNotFoundException("Transcrição");
        } catch (erro) {
            if (erro instanceof UnauthorizedAccessException) throw new ResourceNotFoundException("Transcrição");
            throw erro;
        }
        if (!await this.campanhaRepositorio.recuperarPorId({ id: dto.campanhaId })) {
            throw new ResourceNotFoundException("Transcrição");
        }
    }
}
