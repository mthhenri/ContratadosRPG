import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizarDocumento } from './normalizar-regras.mjs';

const fonte = (arquivo) => readFileSync(fileURLToPath(
    new URL(`../../docs/core/${arquivo}`, import.meta.url)), 'utf8');
const sistema = normalizarDocumento(fonte('sistema-v4.1.4.md'), 'sistema', '4.1.4').documento;
const guia = normalizarDocumento(fonte('guia_de_mestre-v4.2.0.md'), 'guia', '4.2.0').documento;

function percorrer(conteudo) {
    return conteudo.flatMap((item) => [item, ...('filhos' in item ? percorrer(item.filhos) : [])]);
}
const blocos = (documento, tipo) => percorrer(documento.filhos).filter((item) => item.tipo === tipo);
const texto = (trechos) => trechos.map((trecho) => 'filhos' in trecho ? texto(trecho.filhos)
    : trecho.tipo === 'tarja' ? '█' : trecho.texto).join('');
const secao = (documento, titulo) => percorrer(documento.filhos)
    .find((item) => item.tipo === 'secao' && item.titulo === titulo);

test('atributos: dez termos com rótulo Físico/Mental na ordem da fonte', () => {
    const [atributos] = secao(sistema, 'Atributos').filhos.filter((item) => item.tipo === 'termos');
    assert.equal(atributos.variante, 'atributos');
    assert.deepEqual(atributos.itens.slice(0, 2).map((item) => [item.nome, item.rotulo]),
        [['Destreza', 'Atributo Físico'], ['Intelecto', 'Atributo Mental']]);
    assert.equal(texto(atributos.itens[0].descricao), 'Velocidade de movimento e tempo de reação.');
});

test('maestrias: Luta e Social, sem negrito na fonte, também viram nome', () => {
    const [maestrias] = secao(sistema, 'Maestrias').filhos.filter((item) => item.tipo === 'termos');
    assert.deepEqual(maestrias.itens.slice(0, 2).map((item) => item.nome), ['Luta', 'Social']);
    assert.match(texto(maestrias.itens[1].descricao), /^Uma vez por missão/);
});

test('penalidades de Energia: doze termos numerados em ordem crescente', () => {
    const [penalidades] = secao(sistema, 'Limites de Energia').filhos
        .filter((item) => item.tipo === 'termos');
    assert.deepEqual(penalidades.itens.map((item) => item.numero),
        Array.from({ length: 12 }, (_, indice) => indice + 1));
    assert.deepEqual([penalidades.itens[1].nome, texto(penalidades.itens[1].descricao)],
        ['Exausto', 'Todas as habilidades custam +1 E']);
});

test('sequelas: verbetes separados, inclusive os dois que a fonte junta num parágrafo', () => {
    const [verbetes] = secao(sistema, 'Sequelas').filhos.filter((item) => item.tipo === 'termos');
    assert.deepEqual(verbetes.itens.map((item) => item.nome), ['Rejeição Biológica', 'Pânico',
        'Névoa Cognitiva', 'Paranoia', 'Letargia', 'Desorientação', 'Apatia', 'Medo']);
    assert.equal(texto(verbetes.itens[3].descricao), '-1 dado em testes de Social e Vontade.');
    assert.equal(texto(verbetes.itens[4].descricao), '-1 dado em testes de Luta e Destreza.');
});

test('subclasses: identidade, três custos, saúde, inicial e habilidades', () => {
    const subclasses = blocos(sistema, 'subclasse');
    assert.deepEqual(subclasses.map((item) => [item.nome, item.classe]), [
        ['Experimento Bestial', 'Combatente'], ['Experimento Artificial', 'Especialista'],
        ['Experimento Híbrido', 'Suporte']]);
    const [bestial] = subclasses;
    assert.deepEqual(bestial.custos.map(texto), [
        'AGENTES DESTA CLASSE RECEBEM O DOBRO NOS EFEITOS DE TODAS AS SEQUELAS E TRAUMAS',
        'SEU LIMITE DE TRAUMAS É REDUZIDO PARA VONTADE - 1',
        'EM NÍVEL 0 VOCÊ INICIA COM -1 DE PRESTÍGIO']);
    assert.equal(texto(bestial.saude.vida), '30 + VIG × 5');
    assert.equal(texto(bestial.progressao.energia), '5 + DES × 2');
    assert.equal(texto(bestial.atributosBonus), '+1 em Força +1 em Vigor');
    assert.equal(bestial.habilidadeInicial.nome, 'Musculatura de Impacto');
    assert.ok(subclasses.every((item) => item.habilidades.length === 10
        && item.habilidades.every((habilidade) => habilidade.tipo === 'habilidade')));
});

test('abertura: título separado e quebras da fonte nos dois livros', () => {
    for (const documento of [sistema, guia]) {
        const [abertura] = documento.filhos;
        assert.equal(abertura.tipo, 'abertura');
        assert.equal(abertura.titulo, '>>>> Registro de documentação oficial');
        assert.ok(texto(abertura.trechos).includes('\n'));
    }
    assert.match(texto(sistema.filhos[0].trechos), /Você é nossa prioridade\.$/);
    assert.deepEqual(sistema.filhos[1], { tipo: 'capa', versao: 'VERSÃO 4.1.4',
        titulo: 'Contratados', subtitulo: '- Nova Era -' });
    assert.deepEqual(guia.filhos[1], { tipo: 'capa', titulo: 'Contratados', subtitulo: '- Nova Era -' });
});

test('sem definições de imagem, sem genérico; tabela da Morte sem cabeçalho falso', () => {
    assert.ok(!JSON.stringify(sistema).includes('data:image'));
    assert.equal(blocos(sistema, 'generico').length, 0);
    const [morte] = secao(sistema, 'Lidando com a Morte').filhos.filter((item) => item.tipo === 'tabela');
    assert.deepEqual(morte.cabecalho, []);
    assert.equal(texto(morte.linhas[0][0]), 'Irrelevante');
    assert.equal(morte.linhas.length, 5);
});

test('tabela de layout desconhecida vira grade com as células na ordem da fonte', () => {
    const [deslocamento] = secao(sistema, 'Deslocamento').filhos.filter((item) => item.tipo === 'grade');
    assert.equal(deslocamento.colunas, 3);
    assert.equal(texto(deslocamento.cabecalho[0]), 'Destreza 0 ou menos 8 Metros');
});

test('quebra mole vira espaço; quebra dura vira nova linha', () => {
    const { documento } = normalizarDocumento('Uma linha\ncontinua.  \nOutra linha.', 'sistema', '1.0.0');
    assert.equal(texto(documento.filhos[0].trechos), 'Uma linha continua.\nOutra linha.');
});

test('"na média" no texto corrido continua texto', () => {
    const contido = secao(sistema, 'Contido ou Exterminado');
    const niveis = JSON.stringify(contido).match(/"nivel-ameaca"/g) ?? [];
    assert.equal(niveis.length, 0);
});
