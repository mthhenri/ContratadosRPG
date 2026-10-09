import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizarDocumento } from './normalizar-regras.mjs';
import { extrairDescricoesCondicoes } from './regras-condicoes.mjs';

test('extrai todas as condições da fonte vigente sem perder efeitos e remoção', async () => {
    const fonte = await readFile(new URL('../../docs/core/sistema-v4.1.4.md', import.meta.url), 'utf8');
    const { documento } = normalizarDocumento(fonte, 'sistema', '4.1.4');
    const condicoes = extrairDescricoesCondicoes(documento);
    assert.equal(condicoes.length, 28);
    const morrendo = condicoes.find((condicao) => condicao.nome === 'Morrendo');
    assert.match(morrendo.descricao, /DT Base 5 \+ 5 por turno/);
    assert.match(morrendo.descricao, /Defesa é reduzida em 3/);
    assert.match(morrendo.descricao, /Medicina igual ou superior a DT atual/);
    assert.doesNotMatch(morrendo.descricao, /\*\*|\\/);
    assert.match(condicoes.find((condicao) => condicao.nome === 'Inconsciente').descricao,
        /Também recebe a condição Vulnerável/);
    assert.match(condicoes.find((condicao) => condicao.nome === 'Machucado').descricao,
        /recuperar 100% da sua Vida/);
    assert.equal(new Set(condicoes.map((condicao) => condicao.nome)).size, 28);
});

test('recusa fonte sem capítulo de condições, em vez de publicar catálogo vazio', () => {
    assert.throws(() => extrairDescricoesCondicoes({ filhos: [] }), /Condições/);
});
