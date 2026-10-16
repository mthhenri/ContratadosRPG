import { Inject, Injectable } from "@nestjs/common";
import type { Knex } from "knex";
import type {
    TermoGlossarioTranscricaoExcluirDto, TermoGlossarioTranscricaoInternoAlterarDto,
    TermoGlossarioTranscricaoInternoCriarDto, TermoGlossarioTranscricaoListarDto,
    TermoGlossarioTranscricaoRecuperarDto, TermoGlossarioTranscricaoResumoDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import { BaseRepository } from "../../core/base/base.repository";
import { KNEX_CONNECTION } from "../../database/database.provider";

const COLUNAS_TERMO = `termo_glossario_transcricao.id,
    termo_glossario_transcricao.campanha_id AS "campanhaId", termo_glossario_transcricao.termo,
    to_char(termo_glossario_transcricao.created_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdDate",
    to_char(termo_glossario_transcricao.updated_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedDate"`;

/** SQL do glossário por campanha; autorização e normalização ficam na service. */
@Injectable()
export class GlossarioRepository extends BaseRepository {
    constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
        super(conexao, "termo_glossario_transcricao");
    }

    /** A unicidade ativa por (campanha, chave) é imposta pelo índice parcial; a service traduz a violação. */
    async criarTermo(dto: TermoGlossarioTranscricaoInternoCriarDto): Promise<TermoGlossarioTranscricaoResumoDto | null> {
        const [termo] = await this.executarConsulta<TermoGlossarioTranscricaoResumoDto>(
            `INSERT INTO termo_glossario_transcricao
             (campanha_id, termo, chave_termo, created_date, updated_date, is_deleted)
             SELECT campanha.id, :termo, :chaveTermo, NOW(), NOW(), false FROM campanha
             WHERE campanha.id = :campanhaId AND campanha.is_deleted = false
             RETURNING ${COLUNAS_TERMO}`, { ...dto });
        return termo ?? null;
    }

    /** Lista determinística; a ordenação "C" não depende do idioma do banco. */
    async listarTermos(dto: TermoGlossarioTranscricaoListarDto): Promise<TermoGlossarioTranscricaoResumoDto[]> {
        return this.executarConsulta<TermoGlossarioTranscricaoResumoDto>(
            `SELECT ${COLUNAS_TERMO} FROM termo_glossario_transcricao
             WHERE termo_glossario_transcricao.campanha_id = :campanhaId
               AND termo_glossario_transcricao.is_deleted = false
             ORDER BY termo_glossario_transcricao.chave_termo COLLATE "C", termo_glossario_transcricao.id`,
            { ...dto });
    }

    async recuperarTermo(dto: TermoGlossarioTranscricaoRecuperarDto): Promise<TermoGlossarioTranscricaoResumoDto | null> {
        const [termo] = await this.executarConsulta<TermoGlossarioTranscricaoResumoDto>(
            `SELECT ${COLUNAS_TERMO} FROM termo_glossario_transcricao
             WHERE termo_glossario_transcricao.id = :id AND termo_glossario_transcricao.is_deleted = false`, { ...dto });
        return termo ?? null;
    }

    async alterarTermo(dto: TermoGlossarioTranscricaoInternoAlterarDto): Promise<TermoGlossarioTranscricaoResumoDto | null> {
        const [termo] = await this.executarConsulta<TermoGlossarioTranscricaoResumoDto>(
            `UPDATE termo_glossario_transcricao SET termo = :termo, chave_termo = :chaveTermo
             WHERE id = :id AND is_deleted = false RETURNING ${COLUNAS_TERMO}`, { ...dto });
        return termo ?? null;
    }

    /** Soft delete: o termo some da lista e a chave volta a ficar livre (índice parcial). */
    async excluirTermo(dto: TermoGlossarioTranscricaoExcluirDto): Promise<void> {
        await this.executarSoftDelete(dto.id);
    }
}
