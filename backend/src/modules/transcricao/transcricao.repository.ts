import { Inject, Injectable } from "@nestjs/common";
import type { Knex } from "knex";
import type {
    SessaoTranscricaoInternoCriarDto, SessaoTranscricaoRecuperarDto,
    SessaoTranscricaoRecuperadaDto, SessaoTranscricaoResumoDto, SessaoTranscricaoListarDto,
    SessaoTranscricaoAlterarDto, SessaoTranscricaoArquivamentoAlterarDto,
    SessaoTranscricaoExcluirDto, FaixaTranscricaoInternoCriarDto,
    FaixaTranscricaoRecuperadaDto, FaixaTranscricaoRecuperarDto, FaixaTranscricaoListarDto,
    FaixaTranscricaoResumoDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import { BaseRepository } from "../../core/base/base.repository";
import { KNEX_CONNECTION } from "../../database/database.provider";

const COLUNAS_SESSAO = `sessao_transcricao.id, sessao_transcricao.identificador::text,
    sessao_transcricao.campanha_id AS "campanhaId", sessao_transcricao.titulo,
    sessao_transcricao.arquivada,
    to_char(sessao_transcricao.created_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdDate",
    to_char(sessao_transcricao.updated_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedDate"`;
const COLUNAS_FAIXA = `faixa_transcricao.id, faixa_transcricao.identificador::text,
    faixa_transcricao.sessao_transcricao_id AS "sessaoId", faixa_transcricao.nome_arquivo AS "nomeArquivo",
    faixa_transcricao.participante,
    faixa_transcricao.deslocamento_milissegundos::double precision AS "deslocamentoMilissegundos",
    faixa_transcricao.execucao_selecionada_id AS "execucaoSelecionadaId",
    to_char(faixa_transcricao.created_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdDate",
    to_char(faixa_transcricao.updated_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedDate"`;

/** SQL do domínio de transcrição; autorização fica na service, sem storage de WAV. */
@Injectable()
export class TranscricaoRepository extends BaseRepository {
    constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
        super(conexao, "sessao_transcricao");
    }

    /** Insere metadados em sessão com identificador permanente. */
    async criarSessao(dto: SessaoTranscricaoInternoCriarDto): Promise<SessaoTranscricaoRecuperadaDto> {
        const [sessao] = await this.executarConsulta<SessaoTranscricaoRecuperadaDto>(
            `INSERT INTO sessao_transcricao
             (identificador, campanha_id, titulo, arquivada, created_date, updated_date, is_deleted)
             SELECT :identificador, :campanhaId, :titulo, false, NOW(), NOW(), false
             RETURNING ${COLUNAS_SESSAO}`, { ...dto });
        return sessao;
    }

    /** Recupera sessão ativa; campanha excluída não torna seus dados acessíveis. */
    async recuperarSessao(dto: SessaoTranscricaoRecuperarDto): Promise<SessaoTranscricaoRecuperadaDto | null> {
        const [sessao] = await this.executarConsulta<SessaoTranscricaoRecuperadaDto>(
            `SELECT ${COLUNAS_SESSAO} FROM sessao_transcricao
             WHERE sessao_transcricao.id = :id AND sessao_transcricao.is_deleted = false`, { ...dto });
        return sessao ?? null;
    }

    /** Lista um recorte explícito (ativas ou arquivadas), sem conteúdo de áudio/segmentos. */
    async listarSessoes(dto: SessaoTranscricaoListarDto): Promise<SessaoTranscricaoResumoDto[]> {
        return this.executarConsulta<SessaoTranscricaoResumoDto>(
            `SELECT ${COLUNAS_SESSAO} FROM sessao_transcricao
             WHERE sessao_transcricao.campanha_id = :campanhaId AND sessao_transcricao.is_deleted = false
               AND sessao_transcricao.arquivada = :arquivadas
             ORDER BY sessao_transcricao.created_date DESC, sessao_transcricao.id DESC`,
            { campanhaId: dto.campanhaId, arquivadas: dto.arquivadas ?? false });
    }

    /** Altera somente o título de sessão ainda ativa. */
    async alterarSessao(dto: SessaoTranscricaoAlterarDto): Promise<SessaoTranscricaoRecuperadaDto | null> {
        const [sessao] = await this.executarConsulta<SessaoTranscricaoRecuperadaDto>(
            `UPDATE sessao_transcricao SET titulo = :titulo
             WHERE id = :id AND is_deleted = false RETURNING ${COLUNAS_SESSAO}`, { ...dto });
        return sessao ?? null;
    }

    /** Arquivar/desarquivar não exclui sessão ou resultados. */
    async alterarArquivamento(dto: SessaoTranscricaoArquivamentoAlterarDto): Promise<SessaoTranscricaoRecuperadaDto | null> {
        const [sessao] = await this.executarConsulta<SessaoTranscricaoRecuperadaDto>(
            `UPDATE sessao_transcricao SET arquivada = :arquivada
             WHERE id = :id AND is_deleted = false RETURNING ${COLUNAS_SESSAO}`, { ...dto });
        return sessao ?? null;
    }

    /** Soft delete da raiz e descendentes dentro da transação aberta pela service. */
    async excluirSessao(dto: SessaoTranscricaoExcluirDto): Promise<void> {
        await this.executarSoftDelete(dto.id);
        await this.executarComando(`UPDATE segmento_transcricao SET is_deleted = true, deleted_date = NOW()
            WHERE is_deleted = false AND execucao_transcricao_id IN (
                SELECT execucao_transcricao.id FROM execucao_transcricao
                JOIN faixa_transcricao ON faixa_transcricao.id = execucao_transcricao.faixa_transcricao_id
                WHERE faixa_transcricao.sessao_transcricao_id = :id AND faixa_transcricao.is_deleted = false
                  AND execucao_transcricao.is_deleted = false)`, { ...dto });
        await this.executarComando(`UPDATE faixa_transcricao SET execucao_selecionada_id = NULL
            WHERE sessao_transcricao_id = :id AND is_deleted = false`, { ...dto });
        await this.executarComando(`UPDATE execucao_transcricao SET is_deleted = true, deleted_date = NOW()
            WHERE is_deleted = false AND faixa_transcricao_id IN (
                SELECT faixa_transcricao.id FROM faixa_transcricao
                WHERE sessao_transcricao_id = :id AND faixa_transcricao.is_deleted = false)`, { ...dto });
        await this.executarComando(`UPDATE faixa_transcricao SET is_deleted = true, deleted_date = NOW()
            WHERE sessao_transcricao_id = :id AND is_deleted = false`, { ...dto });
    }

    /** Bloqueia a raiz para serializar criação e soft delete; revalida depois de esperar. */
    async criarFaixa(dto: FaixaTranscricaoInternoCriarDto): Promise<FaixaTranscricaoRecuperadaDto | null> {
        const [faixa] = await this.executarConsulta<FaixaTranscricaoRecuperadaDto>(
            `INSERT INTO faixa_transcricao (identificador, sessao_transcricao_id, nome_arquivo,
             participante, deslocamento_milissegundos, created_date, updated_date, is_deleted)
             SELECT :identificador, sessao_transcricao.id, :nomeArquivo, :participante,
              :deslocamentoMilissegundos, NOW(), NOW(), false FROM (
                 SELECT sessao_transcricao.id FROM sessao_transcricao
                 WHERE sessao_transcricao.id = :sessaoId AND sessao_transcricao.is_deleted = false
                 FOR UPDATE
             ) AS sessao_transcricao
             RETURNING ${COLUNAS_FAIXA}`, { ...dto });
        return faixa ?? null;
    }

    /** Lista faixas ativas de uma sessão ativa. */
    async listarFaixas(dto: FaixaTranscricaoListarDto): Promise<FaixaTranscricaoResumoDto[]> {
        return this.executarConsulta<FaixaTranscricaoResumoDto>(
            `SELECT ${COLUNAS_FAIXA} FROM faixa_transcricao
             JOIN sessao_transcricao ON sessao_transcricao.id = faixa_transcricao.sessao_transcricao_id
              AND sessao_transcricao.is_deleted = false
             WHERE faixa_transcricao.sessao_transcricao_id = :sessaoId AND faixa_transcricao.is_deleted = false
             ORDER BY faixa_transcricao.id ASC`, { ...dto });
    }

    /** Recuperação respeita exclusão de qualquer pai da faixa. */
    async recuperarFaixa(dto: FaixaTranscricaoRecuperarDto): Promise<FaixaTranscricaoRecuperadaDto | null> {
        const [faixa] = await this.executarConsulta<FaixaTranscricaoRecuperadaDto>(
            `SELECT ${COLUNAS_FAIXA} FROM faixa_transcricao
             JOIN sessao_transcricao ON sessao_transcricao.id = faixa_transcricao.sessao_transcricao_id
              AND sessao_transcricao.is_deleted = false
             WHERE faixa_transcricao.id = :id AND faixa_transcricao.is_deleted = false`, { ...dto });
        return faixa ?? null;
    }
}
