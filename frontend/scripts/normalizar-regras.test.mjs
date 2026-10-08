import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Lexer, marked } from 'marked';
import { normalizarDocumento, prepararLinhas, prepararRegras, selecionarFonte }
    from './normalizar-regras.mjs';

const diretorioRaiz = fileURLToPath(new URL('../../', import.meta.url));
const diretorioFixtures = fileURLToPath(new URL('./fixtures/regras/', import.meta.url));
const fixture = (nome) => readFileSync(join(diretorioFixtures, `${nome}.md`), 'utf8');
const normalizar = (texto) => normalizarDocumento(texto, 'sistema', '4.1.3');

function percorrer(conteudo) {
    return conteudo.flatMap((item) => [item,
        ...('filhos' in item ? percorrer(item.filhos) : []),
        ...('itens' in item ? item.itens.flatMap(percorrer) : []),
    ]);
}

function textoTrechos(trechos) {
    return trechos.map((trecho) => {
        if (trecho.tipo === 'tarja') return '█'.repeat(trecho.comprimento);
        if ('filhos' in trecho) return textoTrechos(trecho.filhos);
        return trecho.texto;
    }).join(' ');
}

function textoDocumento(conteudo) {
    return conteudo.map((item) => {
        if (item.tipo === 'secao') return item.titulo + ' ' + textoDocumento(item.filhos);
        if (item.tipo === 'lista') return item.itens.map(textoDocumento).join(' ');
        if (item.tipo === 'tabela') return [item.cabecalho, ...item.linhas]
            .flatMap((linha) => linha.map(textoTrechos)).join(' ');
        if (item.tipo === 'habilidade') return `${item.nome} [${item.custo} E] `
            + (item.reacao ? '(Reação) ' : '') + textoTrechos(item.trechos);
        return textoTrechos(item.trechos);
    }).join(' ');
}

// Oráculo independente: leitura Markdown da entrada, sem usar os conversores do normalizador.
// Confere letras/números/tarjas e, depois, texto plano com pontuação; só normaliza sintaxe,
// espaços, glifos de seção/habilidade (que viram dados) e o separador do custo de habilidade.
const conteudoComparavel = (texto) => texto.match(/[\p{L}\p{N}█]/gu)?.join('') ?? '';
const textoPlanoComparavel = (texto) => texto
    .replace(/[\s⬢⬡⬥⬦◈◻]/gu, '')
    .replace(/(\[(?:\d+|X)E\])-/g, '$1');

function textoEntrada(texto, secoes) {
    const destinos = new Map();
    let sumario = false;
    const linhas = texto.split(/\r?\n/).filter((linha) => {
        const capitulo = linha.match(/^#?\s*\*?\*?⬢\s+(.+?)(?:\*\*)?(?:\s+\{#.+\})?$/);
        if (capitulo) sumario = capitulo[1].replace(/\*/g, '').trim() === 'Sumário';
        return !sumario;
    });
    let indiceSecao = 0;
    const entrada = linhas.map((linha) => {
        const titulo = linha.match(/^\s*(?:#{1,6}\s*)?(?:\*\*)?[⬢⬡⬥⬦]\s+/);
        if (titulo && !/\\?\[(?:\d+|X) E\\?\]/.test(linha)) {
            const secao = secoes[indiceSecao++];
            const identificador = linha.match(/\{#(.+)\}/)?.[1];
            if (identificador) destinos.set(identificador.replace(/\\(.)/g, '$1'), secao.titulo);
        }
        return linha.replace(/^\t+/, '').replace(/\s*\{#.+\}\s*$/, '');
    }).join('\n');
    assert.equal(indiceSecao, secoes.length);
    function textoInline(textoInlineOriginal) {
        return Lexer.lexInline(textoInlineOriginal).map((token) => {
            if (token.type === 'link') {
                let identificador = token.href.slice(1);
                try { identificador = decodeURIComponent(identificador); } catch { /* Literal. */ }
                return token.href.startsWith('#') && destinos.has(identificador)
                    ? destinos.get(identificador) : textoInline(token.text);
            }
            if (token.type === 'strong' || token.type === 'em') return textoInline(token.text);
            if (token.type === 'br') return ' ';
            return ['text', 'escape', 'codespan'].includes(token.type) ? token.text : token.raw;
        }).join(' ');
    }
    function textoBlocos(tokens) {
        return tokens.map((token) => {
            if (token.type === 'space') return '';
            if (token.type === 'table') return token.raw.trim().split('\n')
                .filter((linha, indice) => indice !== 1)
                .flatMap((linha) => linha.trim().replace(/^\||\|$/g, '')
                    .split(/(?<!\\)\|/).map((celula) => textoInline(celula.trim())))
                .join(' ');
            if (token.type === 'list') return token.items
                .map((item) => textoBlocos(item.tokens)).join(' ');
            return textoInline(token.type === 'heading' ? token.text : token.raw.trim());
        }).join(' ');
    }
    return textoBlocos(Lexer.lex(entrada));
}

test('hierarquia e tradução de links do Docs', () => {
    const entrada = '# **⬢ Introdução** {#⬢-introdução}\n\n'
        + '## **⬡ Saúde** {#⬡-saúde}\n\n### **⬥ Vida** {#⬥-vida}\n\n'
        + '[Página 8](#⬥-vida)';
    const { documento, avisos } = normalizarDocumento(entrada, 'sistema', '4.1.3');
    const vida = documento.filhos[0].filhos[0].filhos[0];
    assert.equal(vida.ancora, 'vida');
    assert.equal(vida.nivel, 3);
    assert.deepEqual(vida.filhos[0].trechos, [
        { tipo: 'link-interno', ancora: 'vida', texto: 'Vida' },
    ]);
    assert.equal(avisos.length, 0);
});

test('fixtures são recortes literais do Sistema vigente', () => {
    const sistema = readFileSync(join(diretorioRaiz, 'docs/core/sistema-v4.1.3.md'), 'utf8')
        .replace(/\r\n/g, '\n');
    for (const arquivo of readdirSync(diretorioFixtures)) {
        assert.ok(sistema.includes(readFileSync(join(diretorioFixtures, arquivo), 'utf8')), arquivo);
    }
});

test('glifos reais definem níveis com ou sem heading e negrito', () => {
    const { documento } = normalizar(fixture('hierarquia') + fixture('vida') + fixture('verbete'));
    const secoes = percorrer(documento.filhos).filter((item) => item.tipo === 'secao');
    assert.deepEqual(secoes.map((secao) => [secao.titulo, secao.nivel, secao.ancora]), [
        ['Saúde', 2, 'saude'], ['Vida', 3, 'vida'], ['Formação', 4, 'formacao'],
    ]);
    assert.equal(secoes[2].filhos[0].tipo, 'paragrafo');
});

test('sumário com tabulações some, conteúdo anterior e posterior permanece', () => {
    const { documento } = normalizar('Prefácio.\n\n' + fixture('sumario')
        + '\n# **⬢ Introdução** {#⬢-introdução}\n\nDepois.');
    assert.equal(textoDocumento(documento.filhos), 'Prefácio. Introdução Depois.');
    assert.equal(JSON.stringify(documento).includes('Sumário'), false);
});

test('link real recebe o título de destino; ausente avisa na linha correta', () => {
    const entrada = fixture('link') + '\n## **⬡ Gerais** {#⬡-gerais}\n\n'
        + 'Primeira linha.  \n[**Página 99**](#ausente)';
    const { documento, avisos } = normalizar(entrada);
    const links = percorrer(documento.filhos.flatMap((item) => item.trechos ?? []))
        .filter((item) => item.tipo === 'link-interno');
    assert.deepEqual(links, [{ tipo: 'link-interno', ancora: 'gerais', texto: 'Gerais' }]);
    assert.equal(avisos.length, 1);
    assert.equal(avisos[0].linha, 6);
    assert.match(avisos[0].motivo, /ausente/);
    assert.match(textoDocumento(documento.filhos), /Página 99/);
});

test('colisões são estáveis e respeitam títulos que já contêm sufixo', () => {
    const entrada = fixture('vida') + fixture('vida') + '⬥ Vida 2\n';
    const primeiro = normalizar(entrada);
    assert.deepEqual(primeiro, normalizar(entrada));
    assert.deepEqual(percorrer(primeiro.documento.filhos).map((item) => item.ancora),
        ['vida', 'vida-3', 'vida-2']);
    assert.equal(primeiro.avisos.length, 2); // colisão da âncora e id do Docs repetido
});

test('habilidade real tem custo, reação e descrição formatada', () => {
    const { documento } = normalizar(fixture('habilidade'));
    const habilidade = documento.filhos[0];
    assert.equal(habilidade.tipo, 'habilidade');
    assert.equal(habilidade.nome, 'Contra-Ataque');
    assert.equal(habilidade.custo, 2);
    assert.equal(habilidade.reacao, true);
    assert.equal(habilidade.glifo, '⬦');
    assert.match(textoTrechos(habilidade.trechos), /^Soma sua/);
    assert.ok(habilidade.trechos.some((trecho) => trecho.tipo === 'negrito'));
});

test('habilidade multilinha e glifos ◈/◻ preservados como dados', () => {
    for (const glifo of ['⬦', '◈', '◻']) {
        const { documento } = normalizar(fixture('habilidade-multilinha').replace('⬦', glifo));
        const habilidade = documento.filhos[0];
        assert.equal(habilidade.glifo, glifo);
        assert.equal(habilidade.nome, 'Determinado');
        assert.equal(habilidade.custo, 3);
        assert.match(textoTrechos(habilidade.trechos), /Uma vez por cena/);
        assert.ok(habilidade.trechos.some((trecho) => trecho.tipo === 'italico'));
    }
});

test('habilidade real em linha posterior vira bloco sem perder o rótulo anterior', () => {
    const { documento } = normalizar(fixture('fortificacao'));
    assert.equal(documento.filhos[0].tipo, 'paragrafo');
    assert.equal(textoTrechos(documento.filhos[0].trechos), '1º Fortificação');
    assert.equal(documento.filhos[1].tipo, 'habilidade');
    assert.equal(documento.filhos[1].custo, 4);
    assert.equal(documento.filhos[1].nome, 'Determinado');
    assert.match(textoTrechos(documento.filhos[1].trechos), /Uma vez por cena/);
});

test('nota de uma célula e tabela de dados reais', () => {
    const nota = normalizar(fixture('nota')).documento.filhos[0];
    assert.equal(nota.tipo, 'nota');
    assert.match(textoTrechos(nota.trechos), /lista apresentada não é definitiva/);
    const tabela = normalizar(fixture('tabela')).documento.filhos[0];
    assert.equal(tabela.tipo, 'tabela');
    assert.deepEqual(tabela.cabecalho.map(textoTrechos), ['Tempo', 'Energia', 'Vida', 'Definição']);
    assert.equal(tabela.linhas.length, 3);
});

test('layout real fica genérico e avisa; nenhuma célula some', () => {
    const resultado = normalizar(fixture('generico'));
    assert.ok(resultado.avisos.length > 0);
    assert.ok(resultado.documento.filhos.every((item) => item.tipo === 'generico'));
    assert.equal(conteudoComparavel(textoDocumento(resultado.documento.filhos)),
        conteudoComparavel(textoEntrada(fixture('generico'), [])));
});

test('exemplo real é bloco; exemplo no meio de frase permanece inline', () => {
    assert.equal(normalizar(fixture('exemplo')).documento.filhos[0].tipo, 'exemplo');
    const { documento } = normalizar('Uma frase (Exemplo: algo).');
    assert.equal(documento.filhos[0].tipo, 'paragrafo');
    assert.equal(normalizar('Uma frase.  \n*Exemplo: algo.*').documento.filhos[1].tipo, 'exemplo');
});

test('tarjas reais mantêm comprimentos e formatação aninhada', () => {
    const { documento } = normalizar(fixture('tarja'));
    const tarjas = percorrer(documento.filhos[0].trechos).filter((item) => item.tipo === 'tarja');
    assert.deepEqual(tarjas.map((tarja) => tarja.comprimento), [5, 6, 8, 2, 8]);
});

test('listas reais mantêm itens e listas aninhadas mantêm a ordem', () => {
    const lista = normalizar(fixture('lista')).documento.filhos[0];
    assert.equal(lista.tipo, 'lista');
    assert.equal(lista.ordenada, false);
    assert.equal(lista.itens.length, 4);
    const aninhada = normalizar('3. Texto\n   1. Interno\n   2. Segundo\n4. Final').documento.filhos[0];
    assert.equal(aninhada.inicio, 3);
    assert.equal(aninhada.itens[0][1].itens.length, 2);
});

test('escapes, itálico, negrito e link externo', () => {
    const texto = '*Um* **teste** \\- \\[texto\\] 1\\. [SCP](https://scp-wiki.wikidot.com/)';
    const { documento } = normalizar(texto);
    assert.equal(conteudoComparavel(textoTrechos(documento.filhos[0].trechos)), 'Umtestetexto1SCP');
    assert.equal(documento.filhos[0].trechos.at(-1).tipo, 'link-externo');
});

test('versão vem do nome; seleção numérica ignora PDFs e fontes antigas', () => {
    assert.deepEqual(selecionarFonte(['sistema-v4.9.0.md', 'sistema-v4.10.0.md',
        'sistema-v5.0.0.pdf', 'guia_de_mestre-v9.0.0.md'], 'sistema'),
    { arquivo: 'sistema-v4.10.0.md', versao: '4.10.0' });
    assert.throws(() => selecionarFonte([], 'sistema'), /ausente/);
});

for (const [id, arquivo, versao] of [
    ['sistema', 'sistema-v4.1.3.md', '4.1.3'], ['guia', 'guia_de_mestre-v4.2.0.md', '4.2.0'],
]) {
    test(`livro inteiro ${id}: cobertura de texto, âncoras únicas e todos os links rastreados`, () => {
        const entrada = readFileSync(join(diretorioRaiz, 'docs/core', arquivo), 'utf8');
        const { documento, avisos } = normalizarDocumento(entrada, id, versao);
        const secoes = percorrer(documento.filhos).filter((item) => item.tipo === 'secao');
        assert.ok(secoes.length > 50);
        const ancoras = new Set(secoes.map((secao) => secao.ancora));
        assert.equal(ancoras.size, secoes.length);
        assert.equal(documento.versao, versao);
        const trechos = percorrer(documento.filhos).flatMap((item) =>
            [...(item.trechos ?? []), ...(item.cabecalho ?? []).flat(),
                ...(item.linhas ?? []).flat(2)]);
        const linksSaida = percorrer(trechos).filter((item) => item.tipo === 'link-interno');
        for (const link of linksSaida) {
            assert.ok(ancoras.has(link.ancora));
            assert.ok(!/^Página\s*\d+/.test(link.texto));
        }
        let quantidadeLinksEntrada = 0;
        marked.walkTokens(Lexer.lex(prepararLinhas(entrada).map((linha) => linha.texto).join('\n')),
            (token) => {
                if (token.type === 'link' && token.href.startsWith('#')) quantidadeLinksEntrada++;
            });
        assert.equal(linksSaida.length + avisos.filter((aviso) =>
            aviso.motivo.startsWith('Link interno sem destino')).length, quantidadeLinksEntrada);
        const textoEsperado = conteudoComparavel(textoEntrada(entrada, secoes));
        const textoObtido = conteudoComparavel(textoDocumento(documento.filhos));
        const letrasObtidas = [...textoObtido];
        const primeiraDiferenca = [...textoEsperado].findIndex((letra, indice) =>
            letra !== letrasObtidas[indice]);
        assert.equal(textoObtido.length, textoEsperado.length,
            `Cobertura: esperado ${textoEsperado.length}, obtido ${textoObtido.length}; `
            + `primeira diferença ${primeiraDiferenca}: `
            + textoEsperado.slice(primeiraDiferenca - 40, primeiraDiferenca + 100) + ' / '
            + textoObtido.slice(primeiraDiferenca - 40, primeiraDiferenca + 100));
        assert.equal(primeiraDiferenca, -1);
        const planoEsperado = textoPlanoComparavel(textoEntrada(entrada, secoes));
        const planoObtido = textoPlanoComparavel(textoDocumento(documento.filhos));
        const diferencaPlano = [...planoEsperado].findIndex((letra, indice) =>
            letra !== planoObtido[indice]);
        assert.equal(diferencaPlano, -1, `Pontuação: primeira diferença ${diferencaPlano}: `
            + planoEsperado.slice(diferencaPlano - 40, diferencaPlano + 100) + ' / '
            + planoObtido.slice(diferencaPlano - 40, diferencaPlano + 100));
        assert.equal(planoObtido.length, planoEsperado.length);
        assert.ok(avisos.every((aviso) => aviso.linha >= 1 && aviso.linha <= entrada.split('\n').length));
    });
}

test('script respeita o contrato TypeScript (checkJs)', () => {
    const resultado = spawnSync(process.execPath, [join(diretorioRaiz,
        'node_modules/typescript/bin/tsc'), '--allowJs', '--checkJs', '--noEmit',
        '--module', 'nodenext', '--target', 'es2022', '--skipLibCheck',
        'frontend/scripts/normalizar-regras.mjs'], { cwd: diretorioRaiz, encoding: 'utf8' });
    assert.equal(resultado.status, 0, resultado.stdout + resultado.stderr);
});

test('publicação escreve dois JSONs determinísticos e avisos legíveis', async (contexto) => {
    const mensagens = [];
    contexto.mock.method(console, 'log', (mensagem) => mensagens.push(mensagem));
    contexto.mock.method(console, 'warn', (mensagem) => mensagens.push(mensagem));
    const destino = mkdtempSync(join(tmpdir(), 'contratados-regras-'));
    try {
        await prepararRegras(join(diretorioRaiz, 'docs/core'), destino);
        const primeira = readdirSync(destino).map((arquivo) => readFileSync(join(destino, arquivo), 'utf8'));
        await prepararRegras(join(diretorioRaiz, 'docs/core'), destino);
        assert.deepEqual(readdirSync(destino), ['guia.json', 'sistema.json']);
        assert.deepEqual(readdirSync(destino).map((arquivo) => readFileSync(join(destino, arquivo), 'utf8')),
            primeira);
        assert.ok(mensagens.includes('[regras] 71 aviso(s); conteúdo preservado para revisão.'));
        assert.ok(mensagens.some((mensagem) => mensagem.startsWith('[regras] sistema-v4.1.3.md:262')));
    } finally { rmSync(destino, { recursive: true, force: true }); }
});
