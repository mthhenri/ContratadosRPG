import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Lexer, marked } from 'marked';
import { normalizarDocumento } from './normalizar-regras.mjs';
import { reconhecerPersonagens } from './regras-personagens.mjs';

const diretorio = fileURLToPath(new URL('./fixtures/regras-explicitos/personagens/', import.meta.url));
const fixture = (nome) => readFileSync(`${diretorio}${nome}.md`, 'utf8');
const contexto = {
    secao: 'Classes e Arquétipos', caminho: ['Criação de Personagem', 'Classes e Arquétipos'], linha: 477,
    inline: (texto) => normalizarDocumento(`| ${texto} |\n| --- |`, 'sistema', '4.1.3')
        .documento.filhos[0]?.trechos ?? [],
    paragrafo: (texto) => normalizarDocumento(texto, 'sistema', '4.1.3').documento.filhos[0],
};
const token = (texto) => Lexer.lex(texto).find((item) => item.type === 'table');
const reconhecer = (nome) => reconhecerPersonagens(token(fixture(nome)), contexto);
const texto = (trechos) => trechos.map((trecho) => 'filhos' in trecho
    ? texto(trecho.filhos) : trecho.texto).join('');
const canonico = (valor) => valor.replace(/\s/g, '');
// O oráculo lê o Markdown da fixture diretamente, sem usar os campos derivados.
const entrada = (valor) => canonico(marked.parseInline(valor).replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));

test('as oito fixtures são recortes literais da fonte e conservam todas as células', () => {
    const livro = readFileSync(fileURLToPath(new URL('../../docs/core/sistema-v4.1.4.md', import.meta.url)), 'utf8');
    for (const arquivo of readdirSync(diretorio)) {
        const original = fixture(arquivo.replace('.md', ''));
        assert.ok(livro.includes(original), `${arquivo}: recorte literal`);
        const tabela = token(original);
        const bloco = reconhecerPersonagens(tabela, contexto);
        assert.ok(bloco, arquivo);
        assert.deepEqual([bloco.cabecalho, ...bloco.linhas].map((linha) => linha.map((celula) =>
            canonico(texto(celula)))), [tabela.header, ...tabela.rows].map((linha) =>
            linha.map((celula) => entrada(celula.text))), arquivo);
    }
});

test('três classes: fórmulas literais, iniciais, custos e descrição rica sem cálculo', () => {
    const casos = [
        ['combatente', 'Combatente', '30 + VIG × 4', '15 + DES × 2', 21, ['Força Bruta', 'Munição Eficiente', 'Tanque']],
        ['especialista', 'Especialista', '20 + VIG × 3', '22 + DES × 3', 17, ['Modificação Improvisada', 'Ceifador', 'Sabichão']],
        ['suporte', 'Suporte', '25 + VIG × 3', '18 + DES × 2', 18, ['Feito para Isso', 'Tom Certo', 'Extrair Potencial']],
    ];
    for (const [arquivo, nome, vida, energia, quantidade, iniciais] of casos) {
        const bloco = reconhecer(arquivo);
        assert.equal(bloco.tipo, 'classe');
        assert.equal(bloco.nome, nome);
        assert.equal(texto(bloco.saude.vida), vida);
        assert.equal(texto(bloco.saude.energia), energia);
        assert.equal(bloco.citacao[0].tipo, 'italico');
        assert.equal(bloco.habilidades.length, quantidade);
        assert.deepEqual(bloco.arquetipos.map((item) => item.habilidadeInicial.nome), iniciais);
        assert.ok(bloco.progressao.vida.some((trecho) => trecho.tipo === 'negrito'));
    }
    const suporte = reconhecer('suporte');
    assert.equal(suporte.habilidades.find((item) => item.nome === 'Incentivo').custo, 'X');
    assert.equal(reconhecer('combatente').habilidades.find((item) => item.nome === 'Aparar').reacao, true);
    assert.ok(reconhecer('combatente').arquetipos[0].habilidadeInicial.trechos
        .some((trecho) => trecho.tipo === 'negrito'));
});

test('nove arquétipos: classe pelo trio explícito, bônus, seis habilidades e duas melhoradas', () => {
    for (const [arquivo, classe, nomes] of [
        ['combatente-arquetipos', 'Combatente', ['Lutador', 'Mercenário', 'Vanguarda']],
        ['especialista-arquetipos', 'Especialista', ['Engenheiro', 'Assassino', 'Acadêmico']],
        ['suporte-arquetipos', 'Suporte', ['Paramédico', 'Diplomata', 'Comandante']],
    ]) {
        const bloco = reconhecer(arquivo);
        assert.equal(bloco.tipo, 'arquetipos');
        assert.equal(bloco.classe, classe);
        assert.deepEqual(bloco.arquetipos.map((item) => item.nome), nomes);
        for (const item of bloco.arquetipos) {
            assert.equal(item.citacao[0].tipo, 'italico');
            assert.ok(texto(item.atributosBonus).startsWith('+1 em '));
            assert.equal(item.habilidades.length, 6);
            assert.equal(item.habilidadesGeraisMelhoradas.length, 2);
        }
    }
    assert.equal(texto(reconhecer('especialista-arquetipos').arquetipos[0].atributosBonus),
        '+1 em Intelecto +1 em Força ou Destreza');
});

test('duas origens reais: três campos preservados e saber de campo em itálico', () => {
    const bloco = reconhecer('origens');
    assert.equal(bloco.tipo, 'origens');
    assert.deepEqual(bloco.origens.map((item) => item.nome), ['Bombeiro', 'Alpinista Profissional']);
    assert.equal(texto(bloco.origens[0].formacao), '+3 de resistência a dano Químico +1 dado em testes de Vigor');
    assert.ok(texto(bloco.origens[0].especialidade).includes('Inconsciente ou em Morrendo'));
    assert.equal(bloco.origens[0].saberCampo[0].tipo, 'italico');
});

test('cinco módulos consomem Energia Máxima; mantém a grade vazia e os valores escritos', () => {
    const bloco = reconhecer('modulos');
    assert.equal(bloco.tipo, 'modulos');
    assert.deepEqual(bloco.modulos, [{ nivel: 'V', energiaMaxima: 3 }, { nivel: 'IV', energiaMaxima: 7 },
        { nivel: 'III', energiaMaxima: 12 }, { nivel: 'II', energiaMaxima: 16 }, { nivel: 'I', energiaMaxima: 20 }]);
    assert.deepEqual(bloco.cabecalho[1], []);
    assert.deepEqual(bloco.linhas[0][0], []);
    const alterado = token(fixture('modulos').replace('gasta 3 de', 'gasta 99 de'));
    assert.equal(reconhecerPersonagens(alterado, contexto).modulos[0].energiaMaxima, 99);
});

test('assinaturas incompletas ou desconhecidas nunca geram estruturas parciais', () => {
    for (const [arquivo, antes, depois] of [
        ['origens', 'Saber de Campo:', 'Conhecimento:'],
        ['origens', '◻ Bombeiro', '◻ Cientista'],
        ['combatente', '⬦ Saúde', '⬦ Vitalidade'],
        ['combatente', '[Energia\\]', '[Reserva\\]'],
        ['combatente', '◻ Vanguarda', '◻ Estranho'],
        ['combatente', '◈ Abrir Cabeças \\[2 E\\]', '◈ Abrir Cabeças'],
        ['combatente-arquetipos', '⬦ Habilidades Gerais Melhoradas', '⬦ Outras Habilidades'],
        ['combatente-arquetipos', '◻ Mercenário', '◻ Diplomata'],
        ['modulos', 'Módulo III gasta 12 de Energia Máxima', ''],
        ['modulos', 'Energia Máxima', 'Energia'],
    ]) {
        const original = fixture(arquivo);
        assert.ok(original.includes(antes), antes);
        assert.equal(reconhecerPersonagens(token(original.replace(antes, depois)), contexto), null,
            `${arquivo}: ${antes}`);
    }
    for (const arquivo of ['combatente', 'combatente-arquetipos', 'modulos']) {
        const incompleta = token(fixture(arquivo));
        incompleta.rows.pop();
        assert.equal(reconhecerPersonagens(incompleta, contexto), null, arquivo);
    }
});
