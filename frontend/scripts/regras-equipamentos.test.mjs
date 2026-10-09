import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { Lexer } from 'marked';
import { reconhecerEquipamentos } from './regras-equipamentos.mjs';

const diretorio = new URL('./fixtures/regras-explicitos/equipamentos/', import.meta.url);
const lerFixture = (nome) => readFileSync(new URL(`${nome}.md`, diretorio), 'utf8');
const inline = (texto) => Lexer.lexInline(texto).map((token) => {
    if (token.type === 'strong' || token.type === 'em') return {
        tipo: token.type === 'strong' ? 'negrito' : 'italico', filhos: inline(token.text),
    };
    if (token.type === 'link') return { tipo: 'texto', texto: token.text };
    return { tipo: 'texto', texto: token.text ?? token.raw };
});
const contexto = { secao: 'Aplicação de Modificações', caminho: ['Equipamentos', 'Definições'],
    linha: 10, inline };
const tabelas = (texto) => Lexer.lex(texto).filter((token) => token.type === 'table');
const reconhecer = (token, alteracao = {}) => reconhecerEquipamentos(token, { ...contexto, ...alteracao });
const texto = (trechos) => trechos.map((trecho) =>
    'filhos' in trecho ? texto(trecho.filhos) : trecho.texto).join('');

const contagens = {
    'corpo-a-corpo': [6, 16], explosivos: [7, 9], 'armas-de-fogo': [6, 10],
    municoes: [12, 12], 'protecoes-escudos': [9, 10], exoticos: [7, 4],
    armazenamento: [8, 6], operacionais: [23, 0], medicinais: [22, 0],
};
for (const [nome, [equipamentos, modificacoes]] of Object.entries(contagens)) {
    test(`fixture literal ${nome}: todos os itens, valores e modificações preservados`, () => {
        const tokens = tabelas(lerFixture(nome));
        const blocos = tokens.map((token) => reconhecer(token));
        assert.equal(blocos[0].tipo, 'equipamentos');
        assert.equal(blocos[0].itens.length, equipamentos);
        assert.equal(blocos[1]?.itens.length ?? 0, modificacoes);
        assert.equal(blocos[1]?.tipo ?? 'modificacoes', 'modificacoes');
        for (const [indice, bloco] of blocos.entries()) {
            const token = tokens[indice];
            assert.deepEqual(bloco.cabecalho, token.header.map((celula) => inline(celula.text)));
            assert.deepEqual(bloco.linhas, token.rows.map((linha) => linha.map((celula) => inline(celula.text))));
            const indiceRotulos = token.rows.findIndex((linha) =>
                ['Item', 'Modificação'].includes(texto(inline(linha[0].text))));
            const rotulos = token.rows[indiceRotulos].map((celula) => texto(inline(celula.text)));
            for (const [indiceItem, item] of bloco.itens.entries()) {
                const linha = token.rows[indiceRotulos + indiceItem + 1];
                assert.equal(item.nome, texto(inline(linha[0].text)));
                if (bloco.tipo === 'modificacoes') {
                    assert.equal(item.empilhamento, texto(inline(linha[1].text)));
                    assert.deepEqual(item.efeito, inline(linha[2].text));
                    assert.deepEqual(item.bloqueia, inline(linha[3].text));
                } else {
                    for (const [campo, rotulo] of Object.entries({ custo: 'Custo', peso: 'Peso',
                        descricao: 'Descrição', porte: 'Porte', duracao: 'Duração', especificacoes: 'Especificações' })) {
                        const indiceCampo = rotulos.indexOf(rotulo);
                        if (indiceCampo === -1) assert.equal(item[campo], undefined);
                        else assert.deepEqual(item[campo], inline(linha[indiceCampo].text));
                    }
                    if (rotulos.includes('Dano')) {
                        assert.equal(item.danos.map((dano) => texto(dano.trechos)).join(' '),
                            texto(inline(linha[rotulos.indexOf('Dano')].text)));
                    } else assert.deepEqual(item.danos, []);
                }
            }
        }
    });
}

test('duas empunhaduras têm dois danos escritos e rótulos próprios, sem calcular', () => {
    const bloco = reconhecer(tabelas(lerFixture('corpo-a-corpo'))[0]);
    const item = bloco.itens.find((item) => item.nome === 'Acessório de Combate');
    assert.deepEqual(item.danos.map((dano) => [dano.rotulo, texto(dano.trechos)]), [
        ['UMA MÃO', '1D3 + Corpo [Físico]'], ['DUAS MÃOS', '1D6 + Corpo [Físico]'],
    ]);
    assert.equal(texto(bloco.itens.find((item) => item.nome === 'Grande').porte), 'Duas Mão');
    assert.equal(texto(bloco.itens.find((item) => item.nome === 'Corpo').custo), '-');
});

test('reconhecedor não inventa item parcial, coluna, dano, categoria ou empilhamento', () => {
    const original = lerFixture('corpo-a-corpo');
    for (const entrada of [
        original.replace('⬡ Corpo a Corpo', '⬡ Armas Diferentes'),
        original.replace('**Peso**', '**Carga**'),
        original.replace('1D6 \\+ **Corpo** \\[Físico\\]', ''),
        original.replace('| 0,5 | \\$ 250 |', '|  | \\$ 250 |'),
    ]) assert.equal(reconhecer(tabelas(entrada)[0]), null);
    const modificacao = tabelas(original.replace('**■**', '**??**'))[1];
    assert.equal(reconhecer(modificacao), null);
    assert.equal(reconhecer(tabelas(original)[0], { caminho: ['Regras'], secao: 'Compras' }), null);
    assert.equal(reconhecer(tabelas(original)[1], { caminho: ['Fundação SCP'], secao: 'Amplificadores' }), null);
});

test('notas excepcionais de custo/peso preservadas; notas desconhecidas rejeitadas', () => {
    const original = lerFixture('armazenamento');
    const bloco = reconhecer(tabelas(original)[1]);
    assert.match(texto(bloco.linhas[0][0]), /300 \$ ao invés do valor padrão/);
    assert.deepEqual(bloco.nota, bloco.linhas[0][0]);
    assert.match(texto(bloco.linhas[0][0]), /não agregam nenhum peso/);
    assert.equal(reconhecer(tabelas(original.replace('300 \\$', '350 \\$'))[1]), null);
});

test('fonte real confere todas as fixtures e as 100 ocorrências de equipamento/67 modificações', () => {
    const fonte = readFileSync(new URL('../../docs/core/sistema-v4.1.4.md', import.meta.url), 'utf8');
    const recorte = fonte.slice(fonte.indexOf('| ⬡ Corpo a Corpo |'), fonte.indexOf('# **⬢ Regras**'));
    for (const arquivo of readdirSync(diretorio)) {
        assert.ok(recorte.includes(readFileSync(new URL(arquivo, diretorio), 'utf8').trim()));
    }
    const blocos = tabelas(recorte).map((token) => reconhecer(token));
    assert.equal(blocos.length, 16);
    assert.ok(blocos.every(Boolean));
    assert.equal(blocos.filter((bloco) => bloco.tipo === 'equipamentos').length, 9);
    assert.equal(blocos.filter((bloco) => bloco.tipo === 'modificacoes').length, 7);
    assert.equal(blocos.filter((bloco) => bloco.tipo === 'equipamentos').reduce((soma, bloco) => soma + bloco.itens.length, 0), 100);
    assert.equal(blocos.filter((bloco) => bloco.tipo === 'modificacoes').reduce((soma, bloco) => soma + bloco.itens.length, 0), 67);
});
