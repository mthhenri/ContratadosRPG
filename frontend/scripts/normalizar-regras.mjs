// @ts-check
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Lexer } from 'marked';

/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasDocumento} RegrasDocumento */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasConteudo} RegrasConteudo */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasBloco} RegrasBloco */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasTrecho} RegrasTrecho */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasAviso} RegrasAviso */
/** @typedef {import('marked').Token} Token */

const diretorioFrontend = fileURLToPath(new URL('../', import.meta.url));
const niveis = /** @type {const} */ ({ '⬢': 1, '⬡': 2, '⬥': 3, '⬦': 4 });

/** Remove apenas escapes de pontuação do Markdown exportado. */
export function limparEscapes(texto) {
    return texto.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~\\])/g, '$1');
}

/** Texto de um título; a formatação do Docs não participa da âncora. */
function limparTitulo(texto) {
    return limparEscapes(texto).replace(/\*|_/g, '').trim();
}

/** @param {string} linha */
function lerTitulo(linha) {
    const identificador = linha.match(/\s*\{#(.+)\}\s*$/)?.[1];
    const texto = linha.replace(/\s*\{#.+\}\s*$/, '').trim().replace(/^#{1,6}\s+/, '');
    const titulo = limparTitulo(texto);
    const resultado = titulo.match(/^([⬢⬡⬥⬦])\s+(.+)$/);
    // Uma habilidade pode usar ⬦, mas seu custo a distingue de um título de seção.
    if (!resultado || /\[(?:\d+|X) E\]/.test(titulo)) return null;
    const glifo = /** @type {keyof typeof niveis} */ (resultado[1]);
    return { glifo, nivel: niveis[glifo], titulo: resultado[2], identificador };
}

/** Separa o sumário antes de qualquer tokenização; mantém as linhas originais. */
export function prepararLinhas(texto) {
    let noSumario = false;
    return texto.replace(/\r\n?/g, '\n').split('\n').map((conteudo, indice) => {
        const titulo = lerTitulo(conteudo);
        if (titulo?.nivel === 1) noSumario = titulo.titulo === 'Sumário';
        return { texto: noSumario ? '' : conteudo.replace(/^\t+/, ''), linha: indice + 1 };
    });
}

/** Âncora legível, independente do id da exportação do Docs. */
function derivarAncora(titulo) {
    return titulo.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'secao';
}

/**
 * Normaliza um livro sem I/O nem cálculo de valores do jogo.
 * @param {string} texto
 * @param {RegrasDocumento['id']} id
 * @param {string} versao
 * @returns {{ documento: RegrasDocumento, avisos: RegrasAviso[] }}
 */
export function normalizarDocumento(texto, id, versao) {
    const linhas = prepararLinhas(texto);
    /** @type {RegrasAviso[]} */
    const avisos = [];
    const avisar = (linha, motivo) => avisos.push({ documento: id, linha, motivo });
    const titulos = linhas.flatMap((linha) => {
        const titulo = lerTitulo(linha.texto);
        return titulo ? [{ ...titulo, linha: linha.linha, ancora: '' }] : [];
    });
    const reservadas = new Set(titulos.map((titulo) => derivarAncora(titulo.titulo)));
    const utilizadas = new Set();
    const destinos = new Map();
    for (const titulo of titulos) {
        const base = derivarAncora(titulo.titulo);
        let ancora = base;
        let sufixo = 2;
        while (utilizadas.has(ancora)) {
            ancora = `${base}-${sufixo++}`;
            while (reservadas.has(ancora)) ancora = `${base}-${sufixo++}`;
        }
        if (ancora !== base) avisar(titulo.linha, `Âncora repetida "${base}" → "${ancora}".`);
        titulo.ancora = ancora;
        utilizadas.add(ancora);
        destinos.set(ancora, titulo);
        if (titulo.identificador) {
            const identificador = limparEscapes(titulo.identificador);
            if (destinos.has(identificador)) {
                avisar(titulo.linha, `Id do Docs repetido "${identificador}"; primeiro destino mantido.`);
            } else destinos.set(identificador, titulo);
        }
    }

    /** @param {string} conteudo @param {number} linha @returns {RegrasTrecho[]} */
    function normalizarInline(conteudo, linha) {
        /** @param {Token[]} tokens @param {number} linhaInicial @returns {RegrasTrecho[]} */
        function converter(tokens, linhaInicial) {
            let linhaAtual = linhaInicial;
            return tokens.flatMap((token) => {
                const linhaToken = linhaAtual;
                linhaAtual += (token.raw.match(/\n/g) ?? []).length;
                if (token.type === 'strong' || token.type === 'em') {
                    return [{ tipo: token.type === 'strong' ? 'negrito' : 'italico',
                        filhos: converter(token.tokens, linhaToken) }];
                }
                if (token.type === 'link') {
                    if (token.href.startsWith('#')) {
                        let identificador = limparEscapes(token.href.slice(1));
                        try { identificador = decodeURIComponent(identificador); } catch { /* Literal. */ }
                        const destino = destinos.get(identificador);
                        if (destino) return [{ tipo: 'link-interno',
                            ancora: destino.ancora, texto: destino.titulo }];
                        avisar(linhaToken, `Link interno sem destino "${identificador}"; convertido em texto.`);
                        return converter(token.tokens, linhaToken);
                    }
                    return [{ tipo: 'link-externo', destino: token.href,
                        filhos: converter(token.tokens, linhaToken) }];
                }
                if (token.type === 'br') return [{ tipo: 'texto', texto: '\n' }];
                // Não executar HTML nem perder sintaxes que o núcleo ainda não modela.
                const textoToken = token.type === 'escape' || token.type === 'codespan'
                    ? token.text : token.type === 'text' ? token.text : token.raw;
                return textoToken.split(/(█+)/).filter(Boolean).map((trecho) =>
                    trecho.startsWith('█') ? { tipo: 'tarja', comprimento: trecho.length }
                        : { tipo: 'texto', texto: trecho });
            });
        }
        return converter(Lexer.lexInline(conteudo), linha);
    }

    /** @param {string} conteudo @param {number} linha @returns {RegrasBloco} */
    function normalizarParagrafo(conteudo, linha) {
        const primeiraLinha = conteudo.split('\n')[0];
        const habilidade = limparTitulo(primeiraLinha).match(
            /^(?:([⬦◈◻])\s*)?(.+?)\s*\[(\d+|X) E\]\s*(?:-\s*)?(\(Reação\)\s*)?/,
        );
        if (habilidade) {
            // O nome/custo podem estar em negrito; a descrição mantém a formatação original.
            const cabecalho = conteudo.match(
                /^(?:\*{1,3})?(?:[⬦◈◻]\s*)?.+?\\?\[(?:\d+|X) E\\?\](?:\*{1,3})?\s*(?:\\?-\s*)?(?:\(Reação\)\s*)?/,
            );
            return { tipo: 'habilidade', nome: habilidade[2].trim(),
                custo: habilidade[3] === 'X' ? 'X' : Number(habilidade[3]),
                reacao: Boolean(habilidade[4]),
                glifo: /** @type {'⬦' | '◈' | '◻' | null} */ (habilidade[1] ?? null),
                trechos: normalizarInline(conteudo.slice(cabecalho?.[0].length ?? 0), linha) };
        }
        return { tipo: limparTitulo(conteudo).startsWith('Exemplo:') ? 'exemplo' : 'paragrafo',
            trechos: normalizarInline(conteudo, linha) };
    }

    /** @param {Token[]} tokens @param {number} linhaInicial @returns {RegrasBloco[]} */
    function normalizarBlocos(tokens, linhaInicial) {
        /** @type {RegrasBloco[]} */
        const blocos = [];
        let linha = linhaInicial;
        for (const token of tokens) {
            if (token.type === 'paragraph' || token.type === 'text') {
                // O Docs também une exemplos e habilidades ao parágrafo anterior por quebra dura
                // (como as Fortificações de Determinado). Cada linha especial abre seu bloco.
                const partes = token.raw.trimEnd().split(
                    /\n(?=\s*(?:\*?Exemplo:|\*{0,3}[⬦◈◻]\s+.+?\\?\[(?:\d+|X) E\\?\]))/,
                );
                let linhaParte = linha;
                for (const parte of partes) {
                    blocos.push(normalizarParagrafo(parte.trim(), linhaParte));
                    linhaParte += parte.split('\n').length;
                }
            } else if (token.type === 'table') {
                const celulas = [token.header, ...token.rows];
                if (token.header.length === 1 && token.rows.length === 0) {
                    blocos.push({ tipo: 'nota', trechos: normalizarInline(token.header[0].text, linha) });
                } else {
                    // Conservador: tabelas com títulos/glifos, células narrativas no cabeçalho
                    // ou módulos são layout. A m10-02 acrescentará reconhecedores explícitos.
                    const layout = token.header.some((celula) =>
                        /[⬢⬡⬥⬦◈◻▷]|\[Médio|\[Forte|\[Frágil|^Designação$|^Módulo [IV]+|^VIDA\b/.test(
                            limparEscapes(celula.text),
                        ) || celula.text.length > 100)
                        || token.header.every((celula) => !celula.text || /\s/.test(celula.text));
                    if (layout) {
                        const motivo = 'Tabela de layout preservada; caso específico da m10-02.';
                        avisar(linha, motivo);
                        blocos.push({ tipo: 'generico', motivo, origemMarkdown: token.raw,
                            trechos: celulas.flatMap((celulasLinha, indiceLinha) =>
                                celulasLinha.flatMap((celula) => [
                                    ...normalizarInline(celula.text, linha + indiceLinha
                                        + (indiceLinha > 0 ? 1 : 0)),
                                    { tipo: 'texto', texto: '\n' },
                                ])) });
                    } else blocos.push({ tipo: 'tabela',
                        cabecalho: token.header.map((celula) => normalizarInline(celula.text, linha)),
                        linhas: token.rows.map((celulasLinha, indiceLinha) => celulasLinha.map(
                            (celula) => normalizarInline(celula.text, linha + indiceLinha + 2),
                        )) });
                }
            } else if (token.type === 'list') {
                let linhaItem = linha;
                const itens = token.items.map((item) => {
                    const blocosItem = normalizarBlocos(item.tokens, linhaItem);
                    linhaItem += (item.raw.match(/\n/g) ?? []).length;
                    return blocosItem;
                });
                blocos.push({ tipo: 'lista', ordenada: token.ordered,
                    inicio: token.ordered ? Number(token.start) : 1, itens });
            } else if (token.type !== 'space') {
                const motivo = `Bloco Markdown "${token.type}" preservado como genérico.`;
                avisar(linha, motivo);
                blocos.push({ tipo: 'generico', motivo, origemMarkdown: token.raw,
                    trechos: normalizarInline(token.raw, linha) });
            }
            linha += (token.raw.match(/\n/g) ?? []).length;
        }
        return blocos;
    }

    /** @type {RegrasConteudo[]} */
    const filhos = [];
    const pilha = [{ nivel: 0, filhos }];
    let inicio = 0;
    for (const titulo of titulos) {
        const trecho = linhas.slice(inicio, titulo.linha - 1).map((linha) => linha.texto).join('\n');
        pilha.at(-1).filhos.push(...normalizarBlocos(Lexer.lex(trecho), inicio + 1));
        while (pilha.at(-1).nivel >= titulo.nivel) pilha.pop();
        /** @type {RegrasConteudo[]} */
        const filhosSecao = [];
        pilha.at(-1).filhos.push({ tipo: 'secao', nivel: titulo.nivel, glifo: titulo.glifo,
            titulo: titulo.titulo, ancora: titulo.ancora, filhos: filhosSecao });
        pilha.push({ nivel: titulo.nivel, filhos: filhosSecao });
        inicio = titulo.linha;
    }
    const restante = linhas.slice(inicio).map((linha) => linha.texto).join('\n');
    pilha.at(-1).filhos.push(...normalizarBlocos(Lexer.lex(restante), inicio + 1));
    avisos.sort((primeiro, segundo) => primeiro.linha - segundo.linha);
    return { documento: { tipo: 'documento', id,
        titulo: id === 'sistema' ? 'Sistema' : 'Guia de Mestre', versao, filhos }, avisos };
}

/** Seleciona a maior versão semântica disponível, sem repetir os nomes dos livros no script. */
export function selecionarFonte(arquivos, prefixo) {
    const candidatas = arquivos.flatMap((arquivo) => {
        const resultado = arquivo.match(new RegExp(`^${prefixo}-v(\\d+\\.\\d+\\.\\d+)\\.md$`));
        return resultado ? [{ arquivo, versao: resultado[1] }] : [];
    });
    candidatas.sort((primeira, segunda) => {
        const numerosPrimeira = primeira.versao.split('.').map(Number);
        const numerosSegunda = segunda.versao.split('.').map(Number);
        for (let indice = 0; indice < 3; indice++) {
            const diferenca = numerosSegunda[indice] - numerosPrimeira[indice];
            if (diferenca) return diferenca;
        }
        return primeira.arquivo.localeCompare(segunda.arquivo);
    });
    if (!candidatas.length) throw new Error(`Documento ${prefixo}-vN.N.N.md ausente.`);
    return candidatas[0];
}

/** Publica JSONs determinísticos nos assets estáticos do Angular. */
export async function prepararRegras(
    diretorioOrigem = join(diretorioFrontend, '..', 'docs', 'core'),
    diretorioDestino = join(diretorioFrontend, 'public', 'regras'),
) {
    const arquivos = await readdir(diretorioOrigem);
    /** @type {RegrasAviso[]} */
    const avisos = [];
    await mkdir(diretorioDestino, { recursive: true });
    for (const id of /** @type {const} */ (['sistema', 'guia'])) {
        const fonte = selecionarFonte(arquivos, id === 'sistema' ? 'sistema' : 'guia_de_mestre');
        const texto = await readFile(join(diretorioOrigem, fonte.arquivo), 'utf8');
        const resultado = normalizarDocumento(texto, id, fonte.versao);
        await writeFile(join(diretorioDestino, `${id}.json`),
            `${JSON.stringify(resultado.documento, null, 2)}\n`, 'utf8');
        avisos.push(...resultado.avisos);
        console.log(`[regras] ${fonte.arquivo} → ${id}.json`);
        for (const aviso of resultado.avisos) {
            console.warn(`[regras] ${fonte.arquivo}:${aviso.linha} — ${aviso.motivo}`);
        }
    }
    console.log(`[regras] ${avisos.length} aviso(s); conteúdo preservado para revisão.`);
    return avisos;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
    await prepararRegras();
}
