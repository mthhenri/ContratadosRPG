import { Inject, Injectable } from "@nestjs/common";
import type { Knex } from "knex";
import type { DispositivoVinculoInternoCriarDto, DispositivoVinculoCriadoDto, DispositivoVinculoRecuperadoDto,
    DispositivoResumoDto, DispositivoEstadoDto, TranscricaoIntencaoCriadaDto,
    TranscricaoIntencaoEstadoDto, DispositivoIdentificadorRecuperarDto, DispositivoVinculoInternoConfirmarDto,
    DispositivoCredencialInternoRecuperarDto, DispositivoUsuarioInternoListarDto, DispositivoInternoRevogarDto,
    TranscricaoIntencaoInternoCriarDto, TranscricaoIntencaoInternoConsumirDto, TranscricaoIntencaoInternoRecuperarDto, TranscricaoIntencaoConsumidaDto } from "@contratados-rpg/shared/dtos/transcricao";
import { BaseRepository } from "../../core/base/base.repository";
import { KNEX_CONNECTION } from "../../database/database.provider";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
export interface DispositivoAutenticado extends JwtPayload { readonly dispositivoId: number; readonly dispositivoIdentificador: string; }
const DATA = (coluna: string) => `to_char(${coluna} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const RESUMO = `identificador::text, nome, ${DATA("ultimo_uso")} AS "ultimoUso"`;
/** Persistência de vínculo; datas de validade e transições atômicas verificadas no banco. */
@Injectable()
export class DispositivoRepository extends BaseRepository {
    constructor(@Inject(KNEX_CONNECTION) conexao: Knex) { super(conexao, "transcricao_dispositivo"); }
    async iniciar(dto: DispositivoVinculoInternoCriarDto): Promise<DispositivoVinculoCriadoDto | null> {
        const [pedido] = await this.executarConsulta<DispositivoVinculoCriadoDto>(`
            INSERT INTO transcricao_vinculo (identificador, segredo_hash, nome, codigo, expira_em,
              confirmado, created_date, updated_date, is_deleted)
            SELECT :identificador, :segredoHash, :nome, :codigo, NOW() + INTERVAL '10 minutes', false, NOW(), NOW(), false
            ON CONFLICT (segredo_hash) DO NOTHING
            RETURNING identificador::text, codigo, ${DATA("expira_em")} AS "expiraEm"`, { ...dto });
        return pedido ?? null;
    }
    async consultarPedido(dto: DispositivoIdentificadorRecuperarDto): Promise<DispositivoVinculoRecuperadoDto | null> {
        const [pedido] = await this.executarConsulta<DispositivoVinculoRecuperadoDto>(`
            SELECT identificador::text, nome, codigo, ${DATA("expira_em")} AS "expiraEm"
            FROM transcricao_vinculo WHERE identificador = :identificador AND is_deleted = false
              AND confirmado = false AND expira_em > NOW()`, { ...dto });
        return pedido ?? null;
    }
    async confirmar(dto: DispositivoVinculoInternoConfirmarDto): Promise<DispositivoResumoDto | null> {
        const [dispositivo] = await this.executarConsulta<DispositivoResumoDto>(`
            WITH confirmado AS (
              UPDATE transcricao_vinculo SET confirmado = true
              WHERE identificador = :identificador AND codigo = :codigo AND is_deleted = false
                AND confirmado = false AND expira_em > NOW() RETURNING *)
            INSERT INTO transcricao_dispositivo (identificador, vinculo_id, usuario_id, token_versao,
              segredo_hash, nome, ultimo_uso, created_date, updated_date, is_deleted)
            SELECT identificador, id, :usuarioId, :tokenVersao, segredo_hash, nome, NOW(), NOW(), NOW(), false
            FROM confirmado RETURNING ${RESUMO}`, { ...dto });
        return dispositivo ?? null;
    }
    async autenticar(dto: DispositivoCredencialInternoRecuperarDto): Promise<DispositivoAutenticado | null> {
        const [usuario] = await this.executarConsulta<DispositivoAutenticado>(`
            UPDATE transcricao_dispositivo AS dispositivo SET ultimo_uso = NOW()
            FROM usuario JOIN tipo_usuario ON tipo_usuario.id = usuario.tipo_usuario_id AND tipo_usuario.is_deleted = false
            WHERE dispositivo.segredo_hash = :segredoHash AND dispositivo.is_deleted = false
              AND dispositivo.ultimo_uso > NOW() - INTERVAL '90 days'
              AND usuario.id = dispositivo.usuario_id AND usuario.is_deleted = false
              AND usuario.token_versao = dispositivo.token_versao
            RETURNING dispositivo.id AS "dispositivoId", dispositivo.identificador::text AS "dispositivoIdentificador", usuario.id AS sub, usuario.login,
              usuario.token_versao AS "tokenVersao", tipo_usuario.codigo AS tipo`, { ...dto });
        return usuario ?? null;
    }
    async consultarEstado(dto: DispositivoCredencialInternoRecuperarDto): Promise<DispositivoEstadoDto> {
        const usuario = await this.autenticar(dto);
        if (usuario) return { vinculado: true, expirado: false, usuarioId: usuario.sub, login: usuario.login };
        const [pendente] = await this.executarConsulta<{ valido: boolean }>(`
            SELECT true AS valido FROM transcricao_vinculo WHERE segredo_hash = :segredoHash
              AND confirmado = false AND expira_em > NOW() AND is_deleted = false`, { ...dto });
        return { vinculado: false, expirado: !pendente, usuarioId: null, login: null };
    }
    /** Chamar dentro da transação da service. O segundo statement usa snapshot novo
     * depois de esperar o pedido: inclui dispositivo cuja confirmação venceu a corrida. */
    async revogarCredencial(dto: DispositivoCredencialInternoRecuperarDto): Promise<void> {
        await this.executarComando(`UPDATE transcricao_vinculo SET is_deleted = true, deleted_date = NOW()
            WHERE segredo_hash = :segredoHash AND is_deleted = false`, { ...dto });
        await this.executarComando(`UPDATE transcricao_dispositivo SET is_deleted = true, deleted_date = NOW()
            WHERE segredo_hash = :segredoHash AND is_deleted = false`, { ...dto });
    }
    async listar(dto: DispositivoUsuarioInternoListarDto): Promise<DispositivoResumoDto[]> {
        return this.executarConsulta<DispositivoResumoDto>(`SELECT ${RESUMO} FROM transcricao_dispositivo
            WHERE usuario_id = :usuarioId AND is_deleted = false ORDER BY ultimo_uso DESC`, { ...dto });
    }
    async revogar(dto: DispositivoInternoRevogarDto): Promise<void> {
        await this.executarComando(`UPDATE transcricao_dispositivo SET is_deleted = true, deleted_date = NOW()
            WHERE identificador = :identificador AND usuario_id = :usuarioId AND is_deleted = false`, { ...dto });
    }
    async criarIntencao(dto: TranscricaoIntencaoInternoCriarDto): Promise<TranscricaoIntencaoCriadaDto> {
        const [intencao] = await this.executarConsulta<TranscricaoIntencaoCriadaDto>(`
            INSERT INTO transcricao_intencao (identificador, usuario_id, sessao_transcricao_id, expira_em,
              created_date, updated_date, is_deleted)
            SELECT :identificador, :usuarioId, :sessaoId, NOW() + INTERVAL '2 minutes', NOW(), NOW(), false
            RETURNING identificador::text, ${DATA("expira_em")} AS "expiraEm"`, { ...dto });
        return intencao;
    }
    async consumirIntencao(dto: TranscricaoIntencaoInternoConsumirDto): Promise<TranscricaoIntencaoConsumidaDto | null> {
        // Bloqueio do dispositivo serializa consumo com revogação. Autorização da sessão
        // será revalidada na mesma transação antes do commit (service).
        const [intencao] = await this.executarConsulta<TranscricaoIntencaoConsumidaDto>(`
            WITH dispositivo AS (
              SELECT dispositivo.id FROM transcricao_dispositivo AS dispositivo
              JOIN usuario ON usuario.id = dispositivo.usuario_id
              WHERE dispositivo.id = :dispositivoId AND dispositivo.usuario_id = :usuarioId
                AND dispositivo.token_versao = :tokenVersao AND dispositivo.is_deleted = false
                AND usuario.is_deleted = false AND usuario.token_versao = :tokenVersao
                AND dispositivo.ultimo_uso > NOW() - INTERVAL '90 days' FOR UPDATE)
            UPDATE transcricao_intencao SET consumida_em = NOW()
            WHERE identificador = :identificador AND usuario_id = :usuarioId AND is_deleted = false
              AND expira_em > NOW() AND consumida_em IS NULL AND EXISTS (SELECT id FROM dispositivo)
            RETURNING sessao_transcricao_id AS "sessaoId"`, { ...dto });
        return intencao ?? null;
    }
    async consultarIntencao(dto: TranscricaoIntencaoInternoRecuperarDto): Promise<TranscricaoIntencaoEstadoDto | null> {
        const [estado] = await this.executarConsulta<TranscricaoIntencaoEstadoDto>(`
            SELECT consumida_em IS NOT NULL AS confirmada, expira_em <= NOW() AS expirada
            FROM transcricao_intencao WHERE identificador = :identificador
              AND usuario_id = :usuarioId AND is_deleted = false`, { ...dto });
        return estado ?? null;
    }
}
