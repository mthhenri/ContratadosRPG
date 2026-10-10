import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { normalizarDocumento } from './normalizar-regras.mjs';

const texto = (trechos) => trechos.map((trecho) =>
    'filhos' in trecho ? texto(trecho.filhos) : trecho.texto).join('');
const fonte = readFileSync(new URL('../../docs/core/sistema-v4.1.4.md', import.meta.url), 'utf8');
const { documento } = normalizarDocumento(fonte, 'sistema', '4.1.4');

function coletar(filhos, tipo, achados = []) {
    for (const bloco of filhos) {
        if (bloco.tipo === tipo) achados.push(bloco);
        if (Array.isArray(bloco.filhos)) coletar(bloco.filhos, tipo, achados);
    }
    return achados;
}

test('deslocamento: três faixas com condição e valor, texto da fonte íntegro', () => {
    const [faixas] = coletar(documento.filhos, 'faixas');
    assert.deepEqual(faixas.itens, [
        { rotulo: 'Destreza 0 ou menos', valor: '8 Metros' },
        { rotulo: 'Destreza entre 1 à 4', valor: '9 Metros' },
        { rotulo: 'Destreza 5 ou mais', valor: '10 Metros' },
    ]);
    assert.equal(texto(faixas.cabecalho[1]), 'Destreza entre 1 à 4 9 Metros');
});

test('fórmulas de uma linha viram bloco próprio, sem o itálico da fonte', () => {
    const formulas = coletar(documento.filhos, 'formula').map((bloco) => texto(bloco.trechos));
    assert.ok(formulas.includes('Inventário Máximo = Força × 5'));
    assert.ok(formulas.includes('Defesa Base = 10 + Nível'));
    assert.ok(formulas.every((formula) => /\s=\s/.test(formula) && !formula.includes('\n')));
});
