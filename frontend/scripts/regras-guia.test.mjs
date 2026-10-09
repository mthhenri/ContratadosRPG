import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { normalizarDocumento } from './normalizar-regras.mjs';

const diretorio = new URL('./fixtures/regras-explicitos/guia/', import.meta.url);
const fixture = (nome) => readFileSync(new URL(`${nome}.md`, diretorio), 'utf8');
const fonteGuia = readFileSync(new URL('../../docs/core/guia_de_mestre-v4.2.0.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fonteSistema = readFileSync(new URL('../../docs/core/sistema-v4.1.4.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const prefixo = '# **⬢ Guia de Criação de Ameaças**\n\n';
const normalizar = (texto) => normalizarDocumento(prefixo + texto, 'guia', '4.2.0');
function percorrer(filhos) {
    return filhos.flatMap((filho) => [filho,
        ...('filhos' in filho && filho.filhos ? percorrer(filho.filhos) : [])]);
}
const texto = (trechos) => trechos.map((trecho) => 'filhos' in trecho ? texto(trecho.filhos)
    : trecho.tipo === 'tarja' ? '█'.repeat(trecho.comprimento) : trecho.texto).join('');
const blocos = (resultado, tipo) => percorrer(resultado.documento.filhos).filter((item) => item.tipo === tipo);

test('fixtures do Guia e níveis são recortes literais dos livros vigentes', () => {
    for (const arquivo of readdirSync(diretorio)) {
        const conteudo = readFileSync(new URL(arquivo, diretorio), 'utf8');
        assert.ok((arquivo === 'niveis.md' ? fonteSistema : fonteGuia).includes(conteudo), arquivo);
    }
});

test('roteiros numerados por ordem da fonte: 13 etapas de ameaça e 15 de NPC', () => {
    for (const [nome, capitulo, quantidade] of [
        ['roteiro-ameacas', 'Guia de Criação de Ameaças', 13],
        ['roteiro-npcs', 'Guia de Criação de NPCs', 15],
    ]) {
        const resultado = normalizarDocumento(`# **⬢ ${capitulo}**\n\n${fixture(nome)}`, 'guia', '4.2.0');
        const [roteiro] = blocos(resultado, 'roteiro');
        assert.equal(roteiro.etapas.length, quantidade);
        assert.deepEqual(roteiro.etapas.map((etapa) => etapa.ordem),
            Array.from({ length: quantidade }, (_, indice) => indice + 1));
        for (const etapa of roteiro.etapas) {
            assert.ok(fixture(nome).includes(texto(etapa.titulo)), texto(etapa.titulo));
            assert.ok(texto(etapa.descricao).length > 10);
        }
        assert.equal(roteiro.etapas[0].titulo[0].texto,
            capitulo.endsWith('NPCs') ? 'Identidade Narrativa' : 'Ficha de Identidade');
    }
});

test('roteiro fora do capítulo próprio ou com etapa faltante não é reconhecido', () => {
    const fora = normalizarDocumento(fixture('roteiro-ameacas'), 'guia', '4.2.0');
    assert.equal(blocos(fora, 'roteiro').length, 0);
    const incompleto = normalizar(fixture('roteiro-ameacas').replace('**Defesa**', '**Outra etapa**'));
    assert.equal(blocos(incompleto, 'roteiro').length, 0);
});

test('ficha completa preserva designação, dez atributos, modificadores e rótulos/valores', () => {
    const resultado = normalizar(fixture('ficha-completa'));
    const [ficha] = blocos(resultado, 'ficha-criatura');
    assert.equal(ficha.nome, 'A Estátua');
    assert.equal(ficha.identidade.campos.length, 10);
    assert.equal(ficha.identidade.campos.find((campo) => campo.rotulo === 'NA').nivel, 3);
    assert.equal(ficha.atributos.atributos.length, 10);
    assert.deepEqual(ficha.atributos.atributos[0],
        { nome: 'Força', valor: 3, modificador: 'Médio', bonus: '+9' });
    assert.deepEqual(ficha.atributos.atributos.at(-2),
        { nome: 'Social', valor: 0, modificador: 'Frágil', bonus: '+2' });
    assert.equal(ficha.vidaMaxima, '30 × 35 = 1.050');
    assert.equal(ficha.defesaBase, '15 + VD ÷ 2 = 30');
    assert.match(texto(ficha.resistencias), /Físico 36 e Balístico 16/);
    assert.match(texto(ficha.fraquezas), /Explosão: 26/);
    assert.match(texto(ficha.regeneracao), /^Nenhuma\./);
    assert.equal(texto(ficha.porte), 'Médio.');
    assert.match(texto(ficha.deslocamento), /^Terrestre 9m/);
    assert.equal(ficha.cadencia, 'Singular.');
    assert.equal(resultado.avisos.filter((aviso) => aviso.motivo.includes('layout')).length, 0);
});

test('ataques e efeitos são literais, incluindo divergência com exemplão', () => {
    const [ficha] = blocos(normalizar(fixture('ficha-completa')), 'ficha-criatura');
    assert.deepEqual(ficha.ataques.map(({ efeito, ...ataque }) => ataque), [
        { nome: 'Pancada', acao: 'Ação de Movimento', teste: 'Luta 5D20+12', dano: '3D12+4 [Físico]' },
        { nome: 'Esmagamento', acao: 'Ação Padrão', teste: 'Luta 5D20+12', dano: '3D12+4 [Físico]' },
    ]);
    assert.equal(ficha.ataques[0].efeito.length, 0);
    assert.match(texto(ficha.ataques[1].efeito), /Imobilizado por 1 turno/);
});

test('habilidades de criatura são PASSIVA/DE GATILHO e não recebem Energia', () => {
    const [ficha] = blocos(normalizar(fixture('ficha-completa')), 'ficha-criatura');
    assert.deepEqual(ficha.habilidades.map((habilidade) => [habilidade.nome, habilidade.categoria]), [
        ['Imobilidade Absoluta', 'PASSIVA'], ['Velocidade Impossível', 'PASSIVA'],
        ['Ruptura de Observação', 'DE GATILHO'],
    ]);
    for (const habilidade of ficha.habilidades) {
        assert.equal('custo' in habilidade, false);
        assert.ok(texto(habilidade.trechos).length > 50);
        assert.ok(habilidade.trechos.some((trecho) => trecho.tipo === 'italico'));
    }
});

for (const [nome, alterar] of [
    ['atributo faltante', (entrada) => entrada.replace('Força 3', 'Força indefinida')],
    ['modificador desconhecido', (entrada) => entrada.replace('Médio \\+9', 'Superior \\+9')],
    ['Vida Máxima ausente', (entrada) => entrada.replace('Vida Máxima:', 'Vida estimada:')],
    ['ataque inválido', (entrada) => entrada.replace('Pancada | Ação de Movimento', 'Pancada | Sem Ação')],
    ['regeneração ausente', (entrada) => entrada.replace('*Nenhuma. A natureza inorgânica da criatura não permite recuperação.*', '')],
    ['porte ausente', (entrada) => entrada.replace('*Médio.*', '')],
    ['deslocamento ausente', (entrada) => entrada.replace(/^\*Terrestre 9m\..+$/m, '')],
]) {
    test(`ficha com ${nome}: fallback integral e aviso na linha original`, () => {
        const entrada = alterar(fixture('ficha-completa'));
        assert.notEqual(entrada, fixture('ficha-completa'));
        const resultado = normalizar(entrada);
        assert.equal(blocos(resultado, 'ficha-criatura').length, 0);
        const generico = blocos(resultado, 'generico').find((bloco) => bloco.motivo.startsWith('Ficha completa'));
        assert.ok(generico);
        assert.ok(generico.origemMarkdown.includes('SCP Adaptado'));
        assert.ok(generico.filhos.length > 5);
        assert.equal(resultado.avisos.find((aviso) => aviso.motivo.startsWith('Ficha completa')).linha, 4);
    });
}

test('níveis 0…7 em bloco próprio mantêm imagens e textos, sem dedução de poder', () => {
    const entrada = '# **⬢ Fundação SCP**\n\n**⬥ Classificação**\n\n' + fixture('niveis');
    const resultado = normalizarDocumento(entrada, 'sistema', '4.1.3');
    const [niveis] = blocos(resultado, 'niveis-ameaca');
    assert.deepEqual(niveis.niveis.map((nivel) => nivel.nivel), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(niveis.niveis.map((nivel) => nivel.referenciaImagem),
        Array.from({ length: 8 }, (_, indice) => `image${indice + 1}`));
    assert.equal(niveis.cabecalho.length, 2);
    assert.equal(niveis.linhas.length, 7);
    assert.equal(resultado.avisos.length, 0);
    const desconhecido = normalizarDocumento(entrada.replace('\\[0\\]', '\\[7\\]'), 'sistema', '4.1.3');
    assert.equal(blocos(desconhecido, 'niveis-ameaca').length, 0);
    assert.equal(blocos(desconhecido, 'grade').length, 1);
});

test('NA vira dado somente em referência explícita ou coluna NA; palavra comum continua texto', () => {
    const entrada = 'Uma ameaça Média. Uma altura média. NA Baixo.\n\n'
        + '| NA | VD |\n| -- | -- |\n| Média | 25 |\n| Alto | 70 |';
    const resultado = normalizar(entrada);
    const paragrafo = blocos(resultado, 'paragrafo')[0];
    assert.deepEqual(paragrafo.trechos.filter((trecho) => trecho.tipo === 'nivel-ameaca')
        .map((trecho) => [trecho.texto, trecho.nivel]), [['ameaça Média', 3], ['NA Baixo', 2]]);
    const [tabela] = blocos(resultado, 'tabela');
    assert.deepEqual(tabela.linhas.map((linha) => linha[0][0].nivel), [3, 4]);
    assert.ok(paragrafo.trechos.some((trecho) => trecho.tipo === 'texto' && trecho.texto.includes('altura média')));
});

test('prefixo de palavra e referência contraditória, inclusive escapes/formatação, permanecem texto', () => {
    for (const entrada of ['Uma ameaça altamente perigosa.',
        'Calculado com base na média dos membros, ou Na média.', 'NA Médio [7].',
        'NA Médio \\[7\\].', '**NA Médio** \\[7\\].', 'NA **Médio \\[7\\]**.',
        'NA Médio \\[8\\].']) {
        const resultado = normalizar(entrada);
        const paragrafo = blocos(resultado, 'paragrafo')[0];
        const niveis = (trechos) => trechos.flatMap((trecho) => [trecho,
            ...('filhos' in trecho ? niveis(trecho.filhos) : [])])
            .filter((trecho) => trecho.tipo === 'nivel-ameaca');
        assert.equal(niveis(paragrafo.trechos).length, 0, entrada);
        assert.equal(texto(paragrafo.trechos), entrada.replace(/\*\*|\\/g, ''));
    }
    const valido = blocos(normalizar('NA Médio \\[3\\].'), 'paragrafo')[0];
    assert.deepEqual(valido.trechos[0], { tipo: 'nivel-ameaca', nivel: 3, texto: 'NA Médio [3]' });
});

test('livros inteiros: contagens de casos ricos conferidas contra as fontes', () => {
    const sistema = normalizarDocumento(fonteSistema, 'sistema', '4.1.3');
    const guia = normalizarDocumento(fonteGuia, 'guia', '4.2.0');
    assert.equal(blocos(sistema, 'classe').length, 3);
    assert.ok(blocos(sistema, 'classe').every((classe) => classe.filhos.length === 1));
    assert.equal(blocos(sistema, 'arquetipos').flatMap((bloco) => bloco.arquetipos).length, 9);
    assert.equal(blocos(sistema, 'origens').flatMap((bloco) => bloco.origens).length, 2);
    assert.equal(blocos(sistema, 'modulos').flatMap((bloco) => bloco.modulos).length, 5);
    assert.equal(blocos(sistema, 'equipamentos').flatMap((bloco) => bloco.itens).length, 100);
    assert.equal(blocos(sistema, 'modificacoes').flatMap((bloco) => bloco.itens).length, 67);
    assert.equal(blocos(sistema, 'niveis-ameaca').flatMap((bloco) => bloco.niveis).length, 8);
    assert.equal(blocos(guia, 'roteiro').length, 2);
    assert.equal(blocos(guia, 'identidade').length, 1);
    assert.equal(blocos(guia, 'atributos').length, 1);
    assert.equal(blocos(guia, 'habilidade-criatura').length, 3);
    assert.equal(blocos(guia, 'ficha-criatura').length, 1);
    assert.equal(blocos(sistema, 'subclasse').length, 3);
    assert.deepEqual(blocos(sistema, 'termos').map((bloco) => [bloco.variante, bloco.itens.length]),
        [['atributos', 10], ['maestrias', 10], ['penalidades', 12], ['verbetes', 8]]);
    assert.equal(blocos(sistema, 'abertura').length, 1);
    assert.equal(blocos(guia, 'abertura').length, 1);
    assert.equal(blocos(sistema, 'grade').length, 11);
    assert.equal(blocos(sistema, 'generico').length, 0);
    assert.equal(sistema.avisos.length, 18);
    assert.equal(guia.avisos.length, 9);
    assert.ok(guia.avisos.every((aviso) => aviso.motivo.startsWith('Âncora repetida')));
});
