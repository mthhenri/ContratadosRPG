import { Inject, Injectable } from "@nestjs/common";
import type { Knex } from "knex";
import type {
    IdentidadeTranscricaoExcluirDto, IdentidadeTranscricaoInternoAlterarDto,
    IdentidadeTranscricaoInternoCriarDto, IdentidadeTranscricaoListarDto,
    IdentidadeTranscricaoRecuperarDto, IdentidadeTranscricaoResumoDto,
    ParticipanteTranscricaoListarDto,
} from "@contratados-rpg/shared/dtos/transcricao";
import { BaseRepository } from "../../core/base/base.repository";
import { KNEX_CONNECTION } from "../../database/database.provider";

const COLUNAS_IDENTIDADE = `identidade_transcricao.id,
    identidade_transcricao.campanha_id AS "campanhaId", identidade_transcricao.nome_origem AS "nomeOrigem",
    identidade_transcricao.participante,
    to_char(identidade_transcricao.created_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdDate",
    to_char(identidade_transcricao.updated_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedDate"`;

/** SQL das associações reutilizáveis nome de origem → participante, por campanha. */
@Injectable()
export class IdentidadeRepository extends BaseRepository {
    constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
        super(conexao, "identidade_transcricao");
    }

    /** A unicidade ativa por (campanha, chave de origem) é imposta pelo índice parcial. */
    async criarIdentidade(dto: IdentidadeTranscricaoInternoCriarDto): Promise<IdentidadeTranscricaoResumoDto | null> {
        const [identidade] = await this.executarConsulta<IdentidadeTranscricaoResumoDto>(
            `INSERT INTO identidade_transcricao
             (campanha_id, nome_origem, chave_origem, participante, created_date, updated_date, is_deleted)
             SELECT campanha.id, :nomeOrigem, :chaveOrigem, :participante, NOW(), NOW(), false FROM campanha
             WHERE campanha.id = :campanhaId AND campanha.is_deleted = false
             RETURNING ${COLUNAS_IDENTIDADE}`, { ...dto });
        return identidade ?? null;
    }

    async listarIdentidades(dto: IdentidadeTranscricaoListarDto): Promise<IdentidadeTranscricaoResumoDto[]> {
        return this.executarConsulta<IdentidadeTranscricaoResumoDto>(
            `SELECT ${COLUNAS_IDENTIDADE} FROM identidade_transcricao
             WHERE identidade_transcricao.campanha_id = :campanhaId AND identidade_transcricao.is_deleted = false
             ORDER BY identidade_transcricao.chave_origem COLLATE "C", identidade_transcricao.id`, { ...dto });
    }

    async recuperarIdentidade(dto: IdentidadeTranscricaoRecuperarDto): Promise<IdentidadeTranscricaoResumoDto | null> {
        const [identidade] = await this.executarConsulta<IdentidadeTranscricaoResumoDto>(
            `SELECT ${COLUNAS_IDENTIDADE} FROM identidade_transcricao
             WHERE identidade_transcricao.id = :id AND identidade_transcricao.is_deleted = false`, { ...dto });
        return identidade ?? null;
    }

    /** Só o participante muda: o nome de origem identifica a associação. */
    async alterarIdentidade(dto: IdentidadeTranscricaoInternoAlterarDto): Promise<IdentidadeTranscricaoResumoDto | null> {
        const [identidade] = await this.executarConsulta<IdentidadeTranscricaoResumoDto>(
            `UPDATE identidade_transcricao SET participante = :participante
             WHERE id = :id AND is_deleted = false RETURNING ${COLUNAS_IDENTIDADE}`, { ...dto });
        return identidade ?? null;
    }

    async excluirIdentidade(dto: IdentidadeTranscricaoExcluirDto): Promise<void> {
        await this.executarSoftDelete(dto.id);
    }

    /** Participantes conhecidos da campanha: os das associações e os das faixas de sessões ativas. */
    async listarParticipantes(dto: ParticipanteTranscricaoListarDto): Promise<string[]> {
        const linhas = await this.executarConsulta<{ participante: string }>(
            `SELECT participantes_conhecidos.participante FROM (
                 SELECT identidade_transcricao.participante FROM identidade_transcricao
                 WHERE identidade_transcricao.campanha_id = :campanhaId AND identidade_transcricao.is_deleted = false
                 UNION
                 SELECT faixa_transcricao.participante FROM faixa_transcricao
                 JOIN sessao_transcricao ON sessao_transcricao.id = faixa_transcricao.sessao_transcricao_id
                  AND sessao_transcricao.is_deleted = false
                 WHERE sessao_transcricao.campanha_id = :campanhaId AND faixa_transcricao.is_deleted = false
             ) AS participantes_conhecidos
             ORDER BY participantes_conhecidos.participante COLLATE "C"`, { ...dto });
        return linhas.map((linha) => linha.participante);
    }
}
