import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { normalizarDocumento } from './normalizar-regras.mjs';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const fonte = readFileSync(join(raiz, 'docs/core/sistema-v4.1.4.md'), 'utf8');
const documento = normalizarDocumento(fonte, 'sistema', '4.1.4').documento;
const percorrer = (conteudo) => conteudo.flatMap((item) => [item,
    ...('filhos' in item ? percorrer(item.filhos) : [])]);
const blocos = percorrer(documento.filhos);

test('Amplificadores viram um bloco tipado com os 16 itens do documento', () => {
    const bloco = blocos.find((item) => item.tipo === 'amplificadores');
    assert.ok(bloco);
    assert.equal(bloco.itens.length, 16);
    assert.deepEqual(bloco.itens.slice(0, 2).map((item) => [item.nome, item.empilhamento]),
        [['Atento', '■□□'], ['Conservador', '■■']]);
    assert.equal(bloco.itens.find((item) => item.nome === 'Veloz').empilhamento, '■■□□');
    assert.equal(bloco.linhas.length, 16);
});

test('nenhuma tabela de amplificadores sobra como tabela genérica', () => {
    const genericas = blocos.filter((item) => item.tipo === 'tabela'
        && item.cabecalho.length === 3
        && item.linhas.some((linha) => linha[0]?.[0]?.texto?.includes('◎')));
    assert.equal(genericas.length, 0);
});

test('cada tabela de modificações conhece a categoria de Equipamentos', () => {
    const categorias = blocos.filter((item) => item.tipo === 'modificacoes')
        .map((item) => item.categoria);
    assert.deepEqual(categorias, ['Corpo a Corpo', 'Explosivos', 'Armas de Fogo', 'Munições',
        'Proteções e Escudos', 'Exóticos', 'Armazenamento']);
});

// Catálogo do motor × documento: a leitura das Regras não pode divergir do que o jogo calcula.
const { AMPLIFICADORES, MODIFICACOES } = await import('@contratados-rpg/shared/regras/compras');
const { ItemCategoriaEnum } = await import('@contratados-rpg/shared/enums');
const categoriasMotor = {
    'Corpo a Corpo': ItemCategoriaEnum.CORPO_A_CORPO, Explosivos: ItemCategoriaEnum.EXPLOSIVOS,
    'Armas de Fogo': ItemCategoriaEnum.ARMAS_DE_FOGO, Munições: ItemCategoriaEnum.MUNICOES,
    'Proteções e Escudos': ItemCategoriaEnum.PROTECOES, Exóticos: ItemCategoriaEnum.EXOTICOS,
    Armazenamento: ItemCategoriaEnum.ARMAZENAMENTO,
};
const lerEmpilhamento = (texto) => ({ iniciais: (texto.match(/■/g) ?? []).length,
    maximo: (texto.match(/[■□]/g) ?? []).length });
const porNome = (a, b) => a.nome.localeCompare(b.nome);

for (const bloco of blocos.filter((item) => item.tipo === 'modificacoes')) {
    test(`modificações de ${bloco.categoria}: nomes, iniciais e máximo iguais ao motor`, () => {
        const doDocumento = bloco.itens.map((item) => ({ nome: item.nome, ...lerEmpilhamento(item.empilhamento) }));
        const doMotor = MODIFICACOES[categoriasMotor[bloco.categoria]].map((modificacao) => ({
            nome: modificacao.nome, iniciais: modificacao.empilhamentosIniciais,
            maximo: modificacao.empilhamentoMaximo }));
        assert.deepEqual(doDocumento.sort(porNome), doMotor.sort(porNome));
    });
}

test('amplificadores: nomes, iniciais e máximo iguais ao motor', () => {
    const bloco = blocos.find((item) => item.tipo === 'amplificadores');
    const doDocumento = bloco.itens.map((item) => ({ nome: item.nome, ...lerEmpilhamento(item.empilhamento) }));
    const doMotor = AMPLIFICADORES.map((amplificador) => ({ nome: amplificador.nome,
        iniciais: amplificador.empilhamentosIniciais, maximo: amplificador.empilhamentoMaximo }));
    assert.deepEqual(doDocumento.sort(porNome), doMotor.sort(porNome));
});
