// @ts-check
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Lexer } from 'marked';
import { reconhecerEquipamentos, integrarSecoesEquipamentos } from './regras-equipamentos.mjs';
import { reconhecerAmplificadores } from './regras-amplificadores.mjs';
import { reconhecerPersonagens } from './regras-personagens.mjs';
import { marcarNiveis, reconhecerTabelaGuia, reconhecerHabilidadeCriatura,
    reconhecerSecaoGuia, reconhecerNiveisAmeaca, marcarNivelNome } from './regras-guia.mjs';
import { reconhecerTermos, agruparVerbetes } from './regras-termos.mjs';
import { extrairDescricoesCondicoes } from './regras-condicoes.mjs';

/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasDocumento} RegrasDocumento */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasConteudo} RegrasConteudo */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasBloco} RegrasBloco */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasTrecho} RegrasTrecho */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasAviso} RegrasAviso */
/** @typedef {import('marked').Token} Token */

const diretorioFrontend = fileURLToPath(new URL('../', import.meta.url));
const niveis = /** @type {const} */ ({ '⬢': 1, '⬡': 2, '⬥': 3, '⬦': 4 });
/** Tabelas de dados cuja primeira linha a exportação do Docs promoveu a cabeçalho. */
const tabelasSemCabecalho = ['Irrelevante'];

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
    /** @type {string[]} */
    let caminho = [];
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
                // Quebra mole é espaço, como no Markdown; só `br` vira quebra visível.
                const textoToken = token.type === 'escape' || token.type === 'codespan'
                    ? token.text : token.type === 'text' ? token.text.replace(/\n/g, ' ') : token.raw;
                return textoToken.split(/(█+)/).filter(Boolean).map((trecho) =>
                    trecho.startsWith('█') ? { tipo: 'tarja', comprimento: trecho.length }
                        : { tipo: 'texto', texto: trecho });
            });
        }
        const trechos = converter(Lexer.lexInline(conteudo), linha);
        /** @param {RegrasTrecho[]} partes */
        const lerTexto = (partes) => partes.map((parte) => 'filhos' in parte
            ? lerTexto(/** @type {RegrasTrecho[]} */ (parte.filhos))
            : parte.tipo === 'tarja' ? '█'.repeat(parte.comprimento) : parte.texto).join('');
        const textoCompleto = lerTexto(trechos);
        /** Reúne escapes contíguos antes de classificar; negrito/itálico continuam intactos.
         * @param {RegrasTrecho[]} partes @returns {RegrasTrecho[]} */
        function marcar(partes) {
            /** @type {RegrasTrecho[]} */
            const reunidas = [];
            for (const parte of partes) {
                const anterior = reunidas.at(-1);
                if (parte.tipo === 'texto' && anterior?.tipo === 'texto') {
                    reunidas[reunidas.length - 1] = { tipo: 'texto', texto: anterior.texto + parte.texto };
                } else reunidas.push(parte);
            }
            return reunidas.flatMap((parte) => parte.tipo === 'texto'
                ? marcarNiveis(parte.texto, textoCompleto)
                : 'filhos' in parte ? [{ ...parte,
                    filhos: marcar(/** @type {RegrasTrecho[]} */ (parte.filhos)) }] : [parte]);
        }
        return marcar(trechos);
    }

    /** @param {string} conteudo @param {number} linha @returns {RegrasBloco} */
    function normalizarParagrafo(conteudo, linha) {
        const habilidadeCriatura = id === 'guia' ? reconhecerHabilidadeCriatura(conteudo,
            { secao: caminho.at(-1) ?? '', caminho, linha, inline: normalizarInline }) : null;
        if (habilidadeCriatura) return habilidadeCriatura;
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
                    /\n(?=\s*(?:\*?Exemplo:|\*{0,3}[⬦◈◻]\s+.+?\\?\[(?:\d+|X) E\\?\]|.+?\\?\[(?:Passiva|Ativa|De Gatilho)\\?\]\s*\n))/,
                );
                let linhaParte = linha;
                for (const parte of partes) {
                    blocos.push(normalizarParagrafo(parte.trim(), linhaParte));
                    linhaParte += parte.split('\n').length;
                }
            } else if (token.type === 'table') {
                const tabela = /** @type {import('marked').Tokens.Table} */ (token);
                const contexto = { secao: caminho.at(-1) ?? '', caminho, linha,
                    inline: normalizarInline, paragrafo: normalizarParagrafo };
                const explicito = id === 'sistema'
                    ? reconhecerEquipamentos(tabela, contexto) ?? reconhecerAmplificadores(tabela, contexto)
                        ?? reconhecerPersonagens(tabela, contexto)
                        ?? reconhecerNiveisAmeaca(tabela, contexto) ?? reconhecerTermos(tabela, contexto)
                    : reconhecerTabelaGuia(tabela, contexto);
                if (explicito) {
                    blocos.push(explicito);
                    linha += (token.raw.match(/\n/g) ?? []).length;
                    continue;
                }
                const celulas = [token.header, ...token.rows];
                if (token.header.length === 1 && token.rows.length === 0) {
                    blocos.push({ tipo: 'nota', trechos: normalizarInline(token.header[0].text, linha) });
                } else {
                    // Conservador: tabelas com títulos/glifos, células narrativas no cabeçalho
                    // ou módulos são layout. A m10-02 acrescentará reconhecedores explícitos.
                    const rotulos = token.header.map((celula) => limparTitulo(celula.text));
                    const dadosGuia = id === 'guia' && [
                        ['Object Class', 'NA equivalente aproximado'],
                        ['Perfil da criatura', 'Ataques recomendados'],
                        ['Papel da habilidade', 'Usos esperados', 'Custo relativo ao pool'],
                    ].some((esquema) => esquema.length === rotulos.length
                        && esquema.every((rotulo, indice) => rotulo === rotulos[indice]));
                    const layout = !dadosGuia && (token.header.some((celula) =>
                        /[⬢⬡⬥⬦◈◻▷]|\[Médio|\[Forte|\[Frágil|^Designação$|^Módulo [IV]+|^VIDA\b/.test(
                            limparEscapes(celula.text),
                        ) || celula.text.length > 100)
                        || token.header.every((celula) => !celula.text || /\s/.test(celula.text)));
                    if (layout) {
                        const motivo = 'Tabela de layout sem assinatura explícita completa; preservada como grade.';
                        avisar(linha, motivo);
                        const fonte = celulasNormalizadas(celulas, linha);
                        blocos.push({ tipo: 'grade', colunas: token.header.length,
                            cabecalho: fonte[0], linhas: fonte.slice(1) });
                    } else if (id === 'sistema' && tabelasSemCabecalho.includes(rotulos[0])) {
                        // A exportação do Docs promoveu a primeira linha de dados a cabeçalho.
                        blocos.push({ tipo: 'tabela', cabecalho: [],
                            linhas: celulasNormalizadas(celulas, linha).filter((celulasLinha) =>
                                celulasLinha.some((celula) => celula.length)) });
                    } else blocos.push({ tipo: 'tabela',
                        cabecalho: token.header.map((celula) => normalizarInline(celula.text, linha)),
                        linhas: token.rows.map((celulasLinha, indiceLinha) => celulasLinha.map(
                            (celula, indiceColuna) => {
                                const trechos = normalizarInline(celula.text, linha + indiceLinha + 2);
                                return ['NA', 'NA mínimo'].includes(rotulos[indiceColuna])
                                    ? marcarNivelNome(trechos) : trechos;
                            },
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
            } else if (token.type === 'def') {
                // Definição de referência (imagens embutidas do Docs): metadado, não conteúdo.
            } else if (token.type !== 'space') {
                const motivo = `Bloco Markdown "${token.type}" preservado como genérico.`;
                avisar(linha, motivo);
                blocos.push({ tipo: 'generico', motivo, origemMarkdown: token.raw,
                    trechos: normalizarInline(token.raw, linha) });
            }
            linha += (token.raw.match(/\n/g) ?? []).length;
        }
        return agruparVerbetes(blocos);
    }

    /** Células de uma tabela na ordem da fonte, com a linha original de cada uma.
     * @param {import('marked').Tokens.TableCell[][]} celulas @param {number} linha */
    function celulasNormalizadas(celulas, linha) {
        return celulas.map((celulasLinha, indiceLinha) => celulasLinha.map((celula) =>
            normalizarInline(celula.text, linha + indiceLinha + (indiceLinha > 0 ? 1 : 0))));
    }

    /** @type {RegrasConteudo[]} */
    const filhos = [];
    const pilha = [{ nivel: 0, filhos, titulo: '' }];
    let inicio = 0;
    for (const titulo of titulos) {
        const trecho = linhas.slice(inicio, titulo.linha - 1).map((linha) => linha.texto).join('\n');
        pilha.at(-1).filhos.push(...normalizarBlocos(Lexer.lex(trecho), inicio + 1));
        while (pilha.at(-1).nivel >= titulo.nivel) pilha.pop();
        /** @type {RegrasConteudo[]} */
        const filhosSecao = [];
        pilha.at(-1).filhos.push({ tipo: 'secao', nivel: titulo.nivel, glifo: titulo.glifo,
            titulo: titulo.titulo, ancora: titulo.ancora, filhos: filhosSecao });
        pilha.push({ nivel: titulo.nivel, filhos: filhosSecao, titulo: titulo.titulo });
        caminho = pilha.slice(1).map((secao) => secao.titulo);
        inicio = titulo.linha;
    }
    const restante = linhas.slice(inicio).map((linha) => linha.texto).join('\n');
    pilha.at(-1).filhos.push(...normalizarBlocos(Lexer.lex(restante), inicio + 1));
    /** @param {string} titulo */
    function criarAncora(titulo) {
        const base = derivarAncora(titulo);
        let ancora = base;
        let sufixo = 2;
        while (utilizadas.has(ancora) || reservadas.has(ancora)) ancora = `${base}-${sufixo++}`;
        utilizadas.add(ancora);
        return ancora;
    }
    if (id === 'sistema') integrarSecoesEquipamentos(filhos, criarAncora);
    /** Integra o dossiê e os casos que atravessam várias tabelas/seções do Guia.
     * @param {RegrasConteudo[]} conteudo @param {string[]} ancestrais */
    function agruparCasos(conteudo, ancestrais) {
        for (let indice = 0; indice < conteudo.length; indice++) {
            let item = conteudo[indice];
            if (item.tipo === 'classe' || item.tipo === 'subclasse') {
                item = { ...item, ancora: criarAncora(item.nome) };
                conteudo[indice] = item;
            }
            if (item.tipo === 'classe') {
                const seguinte = conteudo[indice + 1];
                if (seguinte?.tipo === 'arquetipos' && seguinte.classe === item.nome) {
                    conteudo[indice] = { ...item, filhos: [seguinte] };
                    conteudo.splice(indice + 1, 1);
                }
            }
            if (item.tipo !== 'secao') continue;
            const filhosSecao = /** @type {RegrasConteudo[]} */ (item.filhos);
            agruparCasos(filhosSecao, [...ancestrais, item.titulo]);
            if (id !== 'guia') continue;
            const titulo = titulos.find((titulo) => titulo.ancora === item.ancora);
            const fim = titulos.find((seguinte) => seguinte.linha > titulo.linha
                && seguinte.nivel <= titulo.nivel)?.linha ?? linhas.length + 1;
            const origemMarkdown = linhas.slice(titulo.linha, fim - 1)
                .map((linha) => linha.texto).join('\n');
            const resultado = reconhecerSecaoGuia(item, origemMarkdown,
                { secao: item.titulo, caminho: ancestrais, linha: titulo.linha + 1,
                    inline: normalizarInline });
            if (resultado) {
                conteudo[indice] = { ...item, filhos: [resultado.bloco] };
                if (resultado.motivo) avisar(titulo.linha + 1, resultado.motivo);
            }
        }
    }
    agruparCasos(filhos, []);
    extrairAbertura(filhos);
    extrairCapa(filhos);
    avisos.sort((primeiro, segundo) => primeiro.linha - segundo.linha);
    return { documento: { tipo: 'documento', id,
        titulo: id === 'sistema' ? 'Sistema' : 'Guia de Mestre', versao, filhos }, avisos };
}

/** @param {readonly RegrasTrecho[]} trechos @returns {string} */
function textoPlano(trechos) {
    return trechos.map((trecho) => 'filhos' in trecho ? textoPlano(trecho.filhos)
        : trecho.tipo === 'tarja' ? '█'.repeat(trecho.comprimento) : trecho.texto).join('');
}

/**
 * Reúne o registro oficial que abre cada livro num bloco `abertura`: o parágrafo que começa
 * em ">>>> Registro de documentação oficial" e os parágrafos seguintes inteiramente em
 * itálico. A primeira linha vira o título; o resto mantém as quebras e a formatação da fonte.
 * @param {RegrasConteudo[]} filhos
 */
function extrairAbertura(filhos) {
    const primeiro = filhos[0];
    if (primeiro?.tipo !== 'paragrafo'
        || !/^>>>> Registro de documentação oficial/.test(textoPlano(primeiro.trechos).trim())) return;
    const quebra = primeiro.trechos.findIndex((trecho) =>
        trecho.tipo === 'texto' && trecho.texto.includes('\n'));
    if (quebra < 0) return;
    const separador = /** @type {{ tipo: 'texto', texto: string }} */ (primeiro.trechos[quebra]);
    const posicao = separador.texto.indexOf('\n');
    const titulo = (textoPlano(primeiro.trechos.slice(0, quebra))
        + separador.texto.slice(0, posicao)).trim();
    /** @type {RegrasTrecho[]} */
    const trechos = [{ tipo: 'texto', texto: separador.texto.slice(posicao + 1) },
        ...primeiro.trechos.slice(quebra + 1)];
    let fim = 1;
    for (; fim < filhos.length; fim++) {
        const bloco = filhos[fim];
        if (bloco.tipo !== 'paragrafo' || !bloco.trechos.every((trecho) => trecho.tipo === 'italico'
            || (trecho.tipo === 'texto' && !trecho.texto.trim()))) break;
        trechos.push({ tipo: 'texto', texto: '\n\n' }, ...bloco.trechos);
    }
    filhos.splice(0, fim, { tipo: 'abertura', titulo, trechos });
}

/**
 * Reúne o que vem logo após a abertura num bloco `capa`: a nota "VERSÃO x.y.z" (quando há) e o
 * parágrafo "Contratados / - Nova Era -". O texto é o da fonte; só a apresentação muda.
 * @param {RegrasConteudo[]} filhos
 */
function extrairCapa(filhos) {
    if (filhos[0]?.tipo !== 'abertura') return;
    let indice = 1;
    let versao;
    const nota = filhos[indice];
    if (nota?.tipo === 'nota' && /^VERSÃO\s+[\d.]+$/i.test(textoPlano(nota.trechos).trim())) {
        versao = textoPlano(nota.trechos).trim();
        indice++;
    }
    const titulo = filhos[indice];
    if (titulo?.tipo !== 'paragrafo') return;
    const linhas = textoPlano(titulo.trechos).split('\n').map((linha) => linha.trim());
    if (linhas.length !== 2 || linhas[0] !== 'Contratados' || !linhas[1]) return;
    filhos.splice(1, indice, { tipo: 'capa', ...(versao ? { versao } : {}),
        titulo: linhas[0], subtitulo: linhas[1] });
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
    diretorioCodigoCondicoes = null,
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
        if (id === 'sistema' && diretorioCodigoCondicoes) {
            const condicoes = extrairDescricoesCondicoes(resultado.documento);
            await mkdir(diretorioCodigoCondicoes, { recursive: true });
            await writeFile(join(diretorioCodigoCondicoes, 'condicoes.dados.ts'),
                '// Gerado por frontend/scripts/normalizar-regras.mjs. Não editar manualmente.\n'
                + `// Fonte: docs/core/${fonte.arquivo} — Condições.\n`
                + `export const DESCRICOES_CONDICOES = ${JSON.stringify(condicoes, null, 4)} as const;\n`,
                'utf8');
        }
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
    await prepararRegras(undefined, undefined,
        join(diretorioFrontend, 'src', 'app', 'shared', 'condicoes'));
}
