import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import knex, { type Knex } from "knex";
import { TranscricaoRepository } from "./transcricao.repository";
import { contextoTransacao, TransacaoService } from "../../database/transacao.service";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** Banco descartável fixo criado para esta task; nunca usa .env ou conexão de produção. */
describe.runIf(process.env.TESTAR_POSTGRES_TRANSCRICAO === "1")("schema transcrição PostgreSQL", () => {
    let conexao: Knex;
    let campanhaId: number;
    const arquivo = resolve(__dirname, "../../database/migrations/0037 - Tabelas de transcricao.sql");
    beforeAll(async () => {
        conexao = knex({ client: "pg", connection: { host: "127.0.0.1", port: 55439,
            database: "transcricao_test", user: "postgres", password: "transcricao_local_test" } });
        const up = readFileSync(arquivo, "utf8").split(/^-- UP$/m)[1].split(/^-- DOWN$/m)[0];
        await conexao.transaction(async (transacao) => { await transacao.raw(up); });
        const resposta = await conexao.raw<{ rows: { id: number }[] }>(`INSERT INTO campanha
            (nome, descricao, codigo_convite, codigo_convite_espectador, na_base,
             created_date, updated_date, is_deleted)
            SELECT 'Teste transcrição', '', :convite, :espectador, true, NOW(), NOW(), false
            RETURNING id`, { convite: randomUUID(), espectador: randomUUID() });
        campanhaId = resposta.rows[0].id;
    });
    afterAll(async () => {
        if (conexao) {
            const down = readFileSync(arquivo, "utf8").split(/^-- DOWN$/m)[1];
            await conexao.transaction(async (transacao) => { await transacao.raw(down); });
            await conexao.destroy();
        }
    });
    const comDados = async (corpo: (transacao: Knex.Transaction, faixaId: number,
        execucaoId: number) => Promise<void>) => {
        const transacao = await conexao.transaction();
        try {
            const resposta = await transacao.raw<{ rows: { id: number }[] }>(`INSERT INTO sessao_transcricao
                (identificador, campanha_id, titulo, arquivada, created_date, updated_date, is_deleted)
                SELECT :identificador, :campanhaId, 'Sessão', false, NOW(), NOW(), false RETURNING id`,
            { identificador: randomUUID(), campanhaId });
            const sessaoId = resposta.rows[0].id;
            const faixa = await transacao.raw<{ rows: { id: number }[] }>(`INSERT INTO faixa_transcricao
                (identificador, sessao_transcricao_id, nome_arquivo, participante,
                 deslocamento_milissegundos, created_date, updated_date, is_deleted)
                SELECT :identificador, :sessaoId, 'a.wav', 'Ana', -2000, NOW(), NOW(), false RETURNING id`,
            { identificador: randomUUID(), sessaoId });
            const faixaId = faixa.rows[0].id;
            const execucao = await transacao.raw<{ rows: { id: number }[] }>(`INSERT INTO execucao_transcricao
                (identificador, faixa_transcricao_id, tipo_execucao_transcricao_estado_id,
                 motor, versao_motor, idioma, configuracao, created_date, updated_date, is_deleted)
                SELECT :identificador, :faixaId, tipo_execucao_transcricao_estado.id,
                 'faster-whisper', 'teste', 'pt', '{}'::jsonb, NOW(), NOW(), false
                FROM tipo_execucao_transcricao_estado
                WHERE codigo = 'CONCLUIDA' AND is_deleted = false RETURNING id`,
            { identificador: randomUUID(), faixaId });
            await corpo(transacao, faixaId, execucao.rows[0].id);
        } finally { await transacao.rollback(); }
    };
    const criarDadosConcorrentes = async () => {
        const repositorio = new TranscricaoRepository(conexao);
        const sessao = await repositorio.criarSessao({ campanhaId, titulo: "Concorrência", identificador: randomUUID() });
        const faixa = (await repositorio.criarFaixa({ sessaoId: sessao.id, identificador: randomUUID(),
            nomeArquivo: "a.wav", participante: "Ana", deslocamentoMilissegundos: 0 }))!;
        const execucao = await conexao.raw<{ rows: { id: number }[] }>(`INSERT INTO execucao_transcricao
            (identificador, faixa_transcricao_id, tipo_execucao_transcricao_estado_id,
             motor, versao_motor, idioma, configuracao, created_date, updated_date, is_deleted)
            SELECT :identificador, :faixaId, tipo_execucao_transcricao_estado.id,
             'teste', '1', 'pt', '{}'::jsonb, NOW(), NOW(), false
            FROM tipo_execucao_transcricao_estado WHERE codigo = 'CONCLUIDA' AND is_deleted = false RETURNING id`,
        { identificador: randomUUID(), faixaId: faixa.id });
        return { sessaoId: sessao.id, faixaId: faixa.id, execucaoId: execucao.rows[0].id };
    };
    it("serializa criação de faixa e exclusão da raiz com duas conexões", async () => {
        const dados = await criarDadosConcorrentes();
        const repositorio = new TranscricaoRepository(conexao);
        const criacao = await conexao.transaction();
        let excluiu = false;
        let exclusao: Promise<void> | undefined;
        try {
            await contextoTransacao.run(criacao, () => repositorio.criarFaixa({ sessaoId: dados.sessaoId,
                identificador: randomUUID(), nomeArquivo: "nova.wav", participante: "B", deslocamentoMilissegundos: 0 }));
            exclusao = new TransacaoService(conexao).executar(() => repositorio.excluirSessao({ id: dados.sessaoId }))
                .then(() => { excluiu = true; });
            await new Promise((resolve) => setTimeout(resolve, 40));
            expect(excluiu).toBe(false);
            await criacao.commit();
            await exclusao;
            const vivas = await conexao.raw<{ rows: { total: number }[] }>(`SELECT COUNT(*)::integer AS total
                FROM faixa_transcricao WHERE sessao_transcricao_id = :id AND is_deleted = false`, { id: dados.sessaoId });
            expect(vivas.rows[0].total).toBe(0);
        } finally { await criacao.rollback(); await exclusao; }
    });
    it("seleção concorrente não pode apontar para execução que falhou", async () => {
        const dados = await criarDadosConcorrentes();
        const mudanca = await conexao.transaction();
        let selecionou = false;
        let selecao: Promise<unknown> | undefined;
        try {
            await mudanca.raw(`UPDATE execucao_transcricao SET tipo_execucao_transcricao_estado_id =
                (SELECT id FROM tipo_execucao_transcricao_estado WHERE codigo = 'FALHA' AND is_deleted = false)
                WHERE id = :id`, { id: dados.execucaoId });
            selecao = conexao.raw(`UPDATE faixa_transcricao SET execucao_selecionada_id = :execucaoId
                WHERE id = :faixaId`, dados).then(() => { selecionou = true; }, (erro: unknown) => erro);
            await new Promise((resolve) => setTimeout(resolve, 40));
            expect(selecionou).toBe(false);
            await mudanca.commit();
            expect(await selecao).toBeInstanceOf(Error);
            const result = await conexao.raw<{ rows: { selecionada: number | null }[] }>(`SELECT execucao_selecionada_id AS selecionada
                FROM faixa_transcricao WHERE id = :faixaId AND is_deleted = false`, dados);
            expect(result.rows[0].selecionada).toBeNull();
        } finally { await mudanca.rollback(); await selecao; }
    });
    it("mantém seleção válida quando seleção vence a alteração concorrente", async () => {
        const dados = await criarDadosConcorrentes();
        const escolha = await conexao.transaction();
        let alterou = false;
        let mudanca: Promise<unknown> | undefined;
        try {
            await escolha.raw(`UPDATE faixa_transcricao SET execucao_selecionada_id = :execucaoId
                WHERE id = :faixaId`, dados);
            mudanca = conexao.raw(`UPDATE execucao_transcricao SET tipo_execucao_transcricao_estado_id =
                (SELECT id FROM tipo_execucao_transcricao_estado WHERE codigo = 'FALHA' AND is_deleted = false)
                WHERE id = :execucaoId`, dados).then(() => { alterou = true; }, (erro: unknown) => erro);
            await new Promise((resolve) => setTimeout(resolve, 40));
            expect(alterou).toBe(false);
            await escolha.commit();
            expect(await mudanca).toBeInstanceOf(Error);
        } finally { await escolha.rollback(); await mudanca; }
    });
    it("snapshot antigo não permite seleção inválida em REPEATABLE READ", async () => {
        const dados = await criarDadosConcorrentes();
        const mudanca = await conexao.transaction();
        const escolha = await conexao.transaction({ isolationLevel: "repeatable read" });
        let selecao: Promise<unknown> | undefined;
        try {
            await escolha.raw("SELECT id FROM faixa_transcricao WHERE id = :faixaId AND is_deleted = false", dados);
            await mudanca.raw(`UPDATE execucao_transcricao SET tipo_execucao_transcricao_estado_id =
                (SELECT id FROM tipo_execucao_transcricao_estado WHERE codigo = 'FALHA' AND is_deleted = false)
                WHERE id = :execucaoId`, dados);
            selecao = escolha.raw(`UPDATE faixa_transcricao SET execucao_selecionada_id = :execucaoId
                WHERE id = :faixaId`, dados).then(() => "selecionou", (erro: unknown) => erro);
            await mudanca.commit();
            expect(await selecao).toBeInstanceOf(Error);
        } finally { await mudanca.rollback(); await escolha.rollback(); await selecao; }
    });
    it("falha na exclusão de filho reverte também a exclusão da raiz", async () => {
        const dados = await criarDadosConcorrentes();
        const repositorio = new TranscricaoRepository(conexao);
        await conexao.raw(`CREATE FUNCTION fn_transcricao_test_falhar() RETURNS TRIGGER LANGUAGE plpgsql AS $$
            BEGIN IF NEW.is_deleted THEN RAISE EXCEPTION 'falha de teste'; END IF; RETURN NEW; END; $$;
            CREATE TRIGGER trg_transcricao_test_falhar BEFORE UPDATE OF is_deleted ON faixa_transcricao
            FOR EACH ROW EXECUTE FUNCTION fn_transcricao_test_falhar();`);
        try {
            await expect(new TransacaoService(conexao).executar(() => repositorio.excluirSessao({ id: dados.sessaoId })))
                .rejects.toThrow("falha de teste");
            expect(await repositorio.recuperarSessao({ id: dados.sessaoId })).not.toBeNull();
            expect(await repositorio.recuperarFaixa({ id: dados.faixaId })).not.toBeNull();
        } finally {
            await conexao.raw("DROP TRIGGER trg_transcricao_test_falhar ON faixa_transcricao; DROP FUNCTION fn_transcricao_test_falhar();");
        }
    });
    it("UP cria constraints e DOWN remove estrutura própria", async () => {
        const result = await conexao.raw<{ rows: { tabela: string | null }[] }>(
            "SELECT to_regclass('segmento_transcricao')::text AS tabela");
        expect(result.rows[0].tabela).toBe("segmento_transcricao");
        const defaults = await conexao.raw<{ rows: unknown[] }>(`SELECT column_name
            FROM information_schema.columns WHERE table_name = 'sessao_transcricao'
            AND column_default IS NOT NULL AND column_name <> 'id'`);
        expect(defaults.rows).toEqual([]);
    });
    it("seleção só aceita execução da própria faixa e concluída", () => comDados(async (transacao,
        faixaId, execucaoId) => {
        await transacao.raw("UPDATE faixa_transcricao SET execucao_selecionada_id = :execucaoId WHERE id = :faixaId",
            { execucaoId, faixaId });
        await expect(transacao.raw(`UPDATE execucao_transcricao SET tipo_execucao_transcricao_estado_id =
            (SELECT id FROM tipo_execucao_transcricao_estado WHERE codigo = 'PENDENTE'
             AND is_deleted = false) WHERE id = :execucaoId`, { execucaoId })).rejects.toThrow();
    }));
    it("recusa execução de outra faixa mesmo na mesma sessão", () => comDados(async (transacao,
        faixaId, execucaoId) => {
        const outra = await transacao.raw<{ rows: { id: number }[] }>(`INSERT INTO faixa_transcricao
            (identificador, sessao_transcricao_id, nome_arquivo, participante,
             deslocamento_milissegundos, created_date, updated_date, is_deleted)
            SELECT :identificador, sessao_transcricao_id, 'b.wav', 'Bruno', 0, NOW(), NOW(), false
            FROM faixa_transcricao WHERE id = :faixaId AND is_deleted = false RETURNING id`,
        { identificador: randomUUID(), faixaId });
        await expect(transacao.raw(`UPDATE faixa_transcricao SET execucao_selecionada_id = :execucaoId
            WHERE id = :outraId`, { execucaoId, outraId: outra.rows[0].id })).rejects.toThrow();
    }));
    it("repository arquiva sem perder faixa e exclui descendentes sem tocar outra sessão", () =>
        comDados(async (transacao, faixaId, execucaoId) => {
            await contextoTransacao.run(transacao, async () => {
                const repositorio = new TranscricaoRepository(conexao);
                const faixa = (await repositorio.recuperarFaixa({ id: faixaId }))!;
                expect(faixa.deslocamentoMilissegundos).toBe(-2000);
                await repositorio.alterarArquivamento({ id: faixa.sessaoId, arquivada: true });
                expect((await repositorio.listarSessoes({ campanhaId, arquivadas: false }))
                    .some((sessao) => sessao.id === faixa.sessaoId)).toBe(false);
                expect((await repositorio.listarSessoes({ campanhaId, arquivadas: true }))
                    .some((sessao) => sessao.id === faixa.sessaoId)).toBe(true);
                expect(await repositorio.listarFaixas({ sessaoId: faixa.sessaoId })).toHaveLength(1);
                const outra = await repositorio.criarSessao({ campanhaId, identificador: randomUUID(), titulo: "Outra" });
                await transacao.raw("UPDATE faixa_transcricao SET execucao_selecionada_id = :execucaoId WHERE id = :faixaId", { execucaoId, faixaId });
                await new TransacaoService(conexao).executar(() => repositorio.excluirSessao({ id: faixa.sessaoId }));
                expect(await repositorio.recuperarFaixa({ id: faixaId })).toBeNull();
                expect(await repositorio.recuperarSessao({ id: faixa.sessaoId })).toBeNull();
                expect(await repositorio.recuperarSessao({ id: outra.id })).not.toBeNull();
                expect(await repositorio.criarFaixa({ sessaoId: faixa.sessaoId, identificador: randomUUID(),
                    nomeArquivo: "c.wav", participante: "C", deslocamentoMilissegundos: 0 })).toBeNull();
                const resultado = await transacao.raw<{ rows: { ativa: number }[] }>(`SELECT COUNT(*)::integer AS ativa
                    FROM execucao_transcricao WHERE id = :execucaoId AND is_deleted = false`, { execucaoId });
                expect(resultado.rows[0].ativa).toBe(0);
            });
        }));
    it("preserva original, correção vazia e revisão editorial", () => comDados(async (transacao,
        _faixaId, execucaoId) => {
        const resposta = await transacao.raw<{ rows: { id: number }[] }>(`INSERT INTO segmento_transcricao
            (identificador, execucao_transcricao_id, inicio_milissegundos, fim_milissegundos,
             texto_original, texto_corrigido, revisao, created_date, updated_date, is_deleted)
            SELECT :identificador, :execucaoId, 5000, 7000, 'Olá', NULL, 1,
             NOW(), NOW(), false RETURNING id`, { identificador: randomUUID(), execucaoId });
        const id = resposta.rows[0].id;
        await transacao.raw("UPDATE segmento_transcricao SET texto_corrigido = '', revisao = 2 WHERE id = :id", { id });
        const segmento = await transacao.raw<{ rows: { texto_original: string; texto_corrigido: string; revisao: number }[] }>(
            "SELECT texto_original, texto_corrigido, revisao FROM segmento_transcricao WHERE id = :id AND is_deleted = false", { id });
        expect(segmento.rows[0]).toEqual({ texto_original: "Olá", texto_corrigido: "", revisao: 2 });
        await expect(transacao.raw("UPDATE segmento_transcricao SET texto_original = 'outro' WHERE id = :id", { id }))
            .rejects.toThrow();
    }));
    it("não permite intervalo invertido ou inteiro fora do contrato JSON", () => comDados(async (
        transacao, _faixaId, execucaoId) => {
        await expect(transacao.raw(`INSERT INTO segmento_transcricao
            (identificador, execucao_transcricao_id, inicio_milissegundos, fim_milissegundos,
             texto_original, texto_corrigido, revisao, created_date, updated_date, is_deleted)
            SELECT :identificador, :execucaoId, 7000, 5000, '', NULL, 1, NOW(), NOW(), false`,
        { identificador: randomUUID(), execucaoId })).rejects.toThrow();
    }));
});
