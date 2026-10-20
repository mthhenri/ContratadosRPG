import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import knex from "knex";
import { ConfigService } from "../../src/config/config.service";
import { ArmazenamentoPastaEnum, criarArmazenamentoProvedor,
    type ArmazenamentoProvedor } from "../../src/core/armazenamento";
import { recuperarChaveImagem } from "../../src/core/armazenamento/armazenamento-chave.util";

// Contratos técnicos de manutenção, sem exposição pela API de negócio.
interface ReferenciaImagem { id: number; caminho: string }
interface ItemMigracao { origem: string; fichas: ReferenciaImagem[] }
interface RegistroMigracao { origem: string; destino: string; hash: string; removida: boolean }
interface RegistroReemissao { origem: string; destino: string; hash: string }

/** Inventaria somente agentes legados; detecta origem compartilhada antes de qualquer escrita. */
export function planejarMigracao(dto: {
    fichas: readonly ReferenciaImagem[];
    avulsos: readonly string[];
    imagens: readonly { caminho: string }[];
    urlPublica?: string;
    avulsosReemitidos?: ReadonlySet<string>;
}): ItemMigracao[] {
    const normalizar = (caminho: string): string => {
        const chave = recuperarChaveImagem(caminho, dto.urlPublica);
        if (!chave.startsWith("agentes/") && !chave.startsWith("fichas/")) {
            throw new Error("Referência de avatar fora da origem de agentes/fichas");
        }
        return chave;
    };
    const avulsos = new Set(dto.avulsos.map(normalizar));
    const itens = new Map<string, ItemMigracao>();
    for (const ficha of dto.fichas) {
        let chave: string;
        try { chave = normalizar(ficha.caminho); }
        catch { throw new Error(`Ficha ${ficha.id}: origem de avatar desconhecida`); }
        if (chave.startsWith("fichas/")) continue;
        if (avulsos.has(chave)) throw new Error(`Origem compartilhada com avulso: ${chave}`);
        const item = itens.get(chave) ?? { origem: ficha.caminho, fichas: [] };
        item.fichas.push(ficha);
        itens.set(chave, item);
    }
    for (const imagem of dto.imagens) {
        const chave = normalizar(imagem.caminho);
        if (avulsos.has(chave) && !dto.avulsosReemitidos?.has(chave)) {
            throw new Error(`Avulso exige reemissão antes do corte: ${chave}`);
        }
        if (chave.startsWith("agentes/") && !avulsos.has(chave) && !itens.has(chave)) {
            itens.set(chave, { origem: imagem.caminho, fichas: [] });
        }
    }
    return [...itens.values()];
}

const calcularHash = (conteudo: Uint8Array): string =>
    createHash("sha256").update(conteudo).digest("hex");

/** Avulso permanece público em URL nova; nenhuma origem antiga é preservada por suposição. */
export async function reemitirAvulsos(dto: {
    referencias: readonly ReferenciaImagem[];
    armazenamento: Pick<ArmazenamentoProvedor, "lerImagem" | "salvarImagem">;
    registros: RegistroReemissao[];
    registrar: () => Promise<void>;
    alterarReferencia: (referencia: ReferenciaImagem, destino: string) => Promise<void>;
}): Promise<void> {
    for (const referencia of dto.referencias) {
        if (dto.registros.some((registro) => registro.destino === referencia.caminho)) continue;
        let registro = dto.registros.find((linha) => linha.origem === referencia.caminho);
        if (!registro) {
            const imagem = await dto.armazenamento.lerImagem({ caminho: referencia.caminho });
            if (!imagem) throw new Error(`Imagem de avulso ausente: ${referencia.caminho}`);
            const copia = await dto.armazenamento.salvarImagem({
                pasta: ArmazenamentoPastaEnum.AGENTES, conteudo: imagem.conteudo,
                mimetype: imagem.mimetype, extensao: referencia.caminho.split(".").at(-1)!,
            });
            registro = { origem: referencia.caminho, destino: copia.caminho,
                hash: calcularHash(imagem.conteudo) };
            dto.registros.push(registro);
            // Diário antes do UPDATE permite retomar interrupção sem perder o destino.
            await dto.registrar();
        }
        const imagemNova = await dto.armazenamento.lerImagem({ caminho: registro.destino });
        if (!imagemNova || calcularHash(imagemNova.conteudo) !== registro.hash) {
            throw new Error(`Reemissão de avulso divergente: ${referencia.caminho}`);
        }
        await dto.alterarReferencia(referencia, registro.destino);
    }
}

/** Copia/verifica antes de trocar referências; origem só sai depois de desvinculada. */
export async function executarMigracao(dto: {
    plano: readonly ItemMigracao[];
    armazenamento: Pick<ArmazenamentoProvedor, "lerImagem" | "salvarImagem" | "excluirImagem">;
    registros: RegistroMigracao[];
    registrar: (registros: readonly RegistroMigracao[]) => Promise<void>;
    alterarReferencias: (item: ItemMigracao, destino: string) => Promise<void>;
    validarOrigemDesvinculada: (origem: string) => Promise<void>;
}): Promise<void> {
    for (const item of dto.plano) {
        let registro = dto.registros.find((linha) => linha.origem === item.origem);
        const imagem = await dto.armazenamento.lerImagem({ caminho: item.origem });
        if (!registro) {
            if (!imagem) throw new Error(`Imagem de origem ausente: ${item.origem}`);
            const copia = await dto.armazenamento.salvarImagem({
                pasta: ArmazenamentoPastaEnum.FICHAS, conteudo: imagem.conteudo,
                mimetype: imagem.mimetype, extensao: item.origem.split(".").at(-1)!,
            });
            registro = { origem: item.origem, destino: copia.caminho,
                hash: calcularHash(imagem.conteudo), removida: false };
            const privada = await dto.armazenamento.lerImagem({ caminho: registro.destino });
            if (!privada || calcularHash(privada.conteudo) !== registro.hash) {
                throw new Error(`Cópia privada divergente: ${item.origem}`);
            }
            dto.registros.push(registro);
            await dto.registrar(dto.registros);
        } else {
            const privada = await dto.armazenamento.lerImagem({ caminho: registro.destino });
            if (!privada || calcularHash(privada.conteudo) !== registro.hash ||
                (imagem && calcularHash(imagem.conteudo) !== registro.hash)) {
                throw new Error(`Retomada divergente: ${item.origem}`);
            }
        }
        await dto.alterarReferencias(item, registro.destino);
        await dto.validarOrigemDesvinculada(item.origem);
        await dto.armazenamento.excluirImagem({ caminho: item.origem });
        registro.removida = true;
        await dto.registrar(dto.registros);
    }
}

/** Simula por padrão; aplicação exige janela sem escritas e diário vinculado ao destino. */
export async function main(argumentos: readonly string[]): Promise<void> {
    const aplicar = argumentos.includes("--aplicar");
    if (aplicar && !argumentos.includes("--janela-sem-escritas-confirmada")) {
        throw new Error("Aplicação exige --janela-sem-escritas-confirmada e corte operacional aprovado");
    }
    const diarioArgumento = argumentos.find((item) => item.startsWith("--diario="));
    if (aplicar && !diarioArgumento) throw new Error("Informe --diario=<arquivo.json>");
    const configuracaoService = new ConfigService();
    const banco = configuracaoService.obterConfiguracaoBanco();
    const configuracao = configuracaoService.obterConfiguracaoArmazenamento();
    const armazenamento = criarArmazenamentoProvedor(configuracao);
    const urlPublica = configuracao.provedor === "r2" ? configuracao.r2UrlPublica : undefined;
    const destino = { banco: `${banco.host}:${banco.porta}/${banco.nome}`,
        armazenamento: configuracao.provedor === "local"
            ? resolve(configuracao.localDiretorio ?? resolve(__dirname, "../../uploads"))
            : `${configuracao.r2AccountId}/${configuracao.r2Bucket}/${configuracao.r2BucketFichas}` };
    const diario = diarioArgumento ? resolve(diarioArgumento.slice("--diario=".length)) : null;
    if (aplicar) await access(dirname(diario!), constants.W_OK);
    const registros: RegistroMigracao[] = [];
    const reemitidos: RegistroReemissao[] = [];
    if (diario) {
        try {
            const salvo = JSON.parse(await readFile(diario, "utf8")) as {
                destino: typeof destino; registros: RegistroMigracao[];
                reemitidos?: RegistroReemissao[] };
            if (JSON.stringify(salvo.destino) !== JSON.stringify(destino)) {
                throw new Error("Diário pertence a outro banco/armazenamento");
            }
            registros.push(...salvo.registros);
            reemitidos.push(...salvo.reemitidos ?? []);
        } catch (erro) {
            if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
        }
    }
    const conexao = knex({ client: "pg", connection: { host: banco.host, port: banco.porta,
        database: banco.nome, user: banco.usuario, password: banco.senha } });
    try {
        const listarReferencias = async (): Promise<{
            fichas: ReferenciaImagem[]; avulsos: ReferenciaImagem[];
        }> => {
            const fichas = await conexao.raw<{ rows: ReferenciaImagem[] }>(
                `SELECT id, imagem_url AS caminho FROM ficha
                 WHERE is_deleted = false AND imagem_url IS NOT NULL`);
            const avulsos = await conexao.raw<{ rows: ReferenciaImagem[] }>(
                `SELECT id, imagem_url_avulso AS caminho FROM encontro_combatente
                 WHERE is_deleted = false AND ficha_id IS NULL AND imagem_url_avulso IS NOT NULL`);
            return { fichas: fichas.rows, avulsos: avulsos.rows };
        };
        let referencias = await listarReferencias();
        const registrarDiario = async (): Promise<void> => {
            await writeFile(`${diario!}.tmp`, JSON.stringify({ destino, registros, reemitidos }, null, 2),
                { encoding: "utf8", mode: 0o600 });
            await rename(`${diario!}.tmp`, diario!);
        };
        const chavesAvulsos = new Set(referencias.avulsos.map((linha) =>
            recuperarChaveImagem(linha.caminho, urlPublica)));
        for (const ficha of referencias.fichas) {
            if (chavesAvulsos.has(recuperarChaveImagem(ficha.caminho, urlPublica))) {
                throw new Error("Origem compartilhada por ficha ativa e avulso: separe antes do corte");
            }
        }
        if (!aplicar && referencias.avulsos.length) {
            console.log(JSON.stringify({ modo: "simular", destino,
                reemitirAvulsos: referencias.avulsos,
                aviso: "Reemitir todos os avulsos em URL nova antes de quarentenar origens antigas" }, null, 2));
        }
        if (aplicar) {
            await reemitirAvulsos({ referencias: referencias.avulsos, armazenamento,
                registros: reemitidos, registrar: registrarDiario,
                alterarReferencia: async (referencia, caminho) => {
                    const resultado = await conexao.raw<{ rows: { id: number }[] }>(
                        `UPDATE encontro_combatente SET imagem_url_avulso = :caminho, updated_date = NOW()
                         WHERE id = :id AND is_deleted = false AND ficha_id IS NULL
                           AND (imagem_url_avulso = :anterior OR imagem_url_avulso = :caminho)
                         RETURNING id`, { id: referencia.id, anterior: referencia.caminho, caminho });
                    if (resultado.rows.length !== 1) throw new Error(`Conflito no avulso ${referencia.id}`);
                },
            });
            referencias = await listarReferencias();
        }
        const imagens = await armazenamento.listarImagens({ pasta: ArmazenamentoPastaEnum.AGENTES });
        const avulsos = referencias.avulsos.map((linha) => linha.caminho);
        const plano = planejarMigracao({ fichas: referencias.fichas,
            // Simulação inclui toda origem antiga; aplicação poupa só os novos destinos do diário.
            avulsos: aplicar ? avulsos : [], imagens, urlPublica,
            avulsosReemitidos: new Set(reemitidos.map((linha) =>
                recuperarChaveImagem(linha.destino, urlPublica))),
        });
        // Após interrupção entre UPDATE e remoção, origem ainda precisa ser concluída.
        for (const registro of registros) {
            if (!registro.removida && !plano.some((item) => item.origem === registro.origem)) {
                plano.push({ origem: registro.origem, fichas: [] });
            }
        }
        console.log(JSON.stringify({ modo: aplicar ? "aplicar" : "simular", destino,
            quantidade: plano.length, plano }, null, 2));
        if (!aplicar) return;
        await executarMigracao({ plano, armazenamento, registros,
            registrar: registrarDiario,
            alterarReferencias: async (item, caminho) => {
                await conexao.transaction(async (transacao) => {
                    for (const ficha of item.fichas) {
                        const resultado = await transacao.raw<{ rows: { id: number }[] }>(
                            `UPDATE ficha SET imagem_url = :caminho, updated_date = NOW()
                             WHERE id = :id AND is_deleted = false
                               AND (imagem_url = :anterior OR imagem_url = :caminho) RETURNING id`,
                            { id: ficha.id, caminho, anterior: ficha.caminho });
                        if (resultado.rows.length !== 1) throw new Error(`Conflito na ficha ${ficha.id}`);
                    }
                });
            },
            validarOrigemDesvinculada: async (origem) => {
                const atual = await listarReferencias();
                const chave = recuperarChaveImagem(origem, urlPublica);
                if ([...atual.fichas.map((linha) => linha.caminho),
                    ...atual.avulsos.map((linha) => linha.caminho)]
                    .some((caminho) => recuperarChaveImagem(caminho, urlPublica) === chave)) {
                    throw new Error(`Origem ainda vinculada: ${origem}`);
                }
            },
        });
        console.log("Origem removida. R2/CDN: purge dos aliases e teste externo continuam obrigatórios.");
    } finally { await conexao.destroy(); }
}

if (typeof require !== "undefined" && require.main === module) {
    void main(process.argv.slice(2)).catch((erro: unknown) => {
        console.error(erro instanceof Error ? erro.message : erro);
        process.exitCode = 1;
    });
}
