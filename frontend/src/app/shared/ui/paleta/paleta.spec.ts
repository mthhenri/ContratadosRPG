import {
  ancestraisDe, filtrarPaleta, linhasVisiveisArvore, normalizarPaleta, type PaletaItem, type PaletaNo,
} from './paleta';

const itens: PaletaItem[] = [
  { id: 'a', rotulo: 'Usando Habilidades', contexto: 'Criação de Personagem › Habilidades' },
  { id: 'b', rotulo: 'Habilidades', contexto: 'Criação de Personagem' },
  { id: 'c', rotulo: 'Habilidades Gerais', contexto: 'Criação de Personagem › Habilidades' },
  { id: 'd', rotulo: 'Saúde', contexto: 'Criação de Personagem' },
  { id: 'e', rotulo: 'Energia', contexto: 'Criação de Personagem › Saúde' },
];

describe('paleta', () => {
  it('normaliza acento e caixa', () => {
    expect(normalizarPaleta('  SAÚDE ')).toBe('saude');
  });

  it('termo vazio devolve todos na ordem original', () => {
    expect(filtrarPaleta(itens, '').map((i) => i.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('ordena: começa com o termo, início de palavra, trecho do título, caminho', () => {
    expect(filtrarPaleta(itens, 'habilidades').map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(filtrarPaleta(itens, 'saude').map((i) => i.id)).toEqual(['d', 'e']);
  });

  it('ignora acento no termo e no título', () => {
    expect(filtrarPaleta(itens, 'SAUDE').map((i) => i.id)).toEqual(['d', 'e']);
    expect(filtrarPaleta(itens, 'energía').map((i) => i.id)).toEqual(['e']);
  });

  it('sem correspondência devolve vazio', () => {
    expect(filtrarPaleta(itens, 'xyz')).toEqual([]);
  });
});

describe('paleta em árvore', () => {
  const nos: PaletaNo[] = [
    { id: 'c1', rotulo: 'Criação', filhos: [
      { id: 'at', rotulo: 'Atributos', filhos: [{ id: 'ma', rotulo: 'Maestrias' }] },
      { id: 'sa', rotulo: 'Saúde' },
    ] },
    { id: 'c2', rotulo: 'Combate', filhos: [] },
  ];
  const ids = (abertos: string[]) =>
    linhasVisiveisArvore(nos, new Set(abertos)).map((l) => l.id);

  it('recolhido mostra só a raiz, com temFilhos e sem filho vazio', () => {
    const linhas = linhasVisiveisArvore(nos, new Set());
    expect(linhas.map((l) => [l.id, l.nivel, l.temFilhos, l.aberto, l.paiId])).toEqual([
      ['c1', 1, true, false, null],
      ['c2', 1, false, false, null],
    ]);
  });

  it('abre em ordem de leitura e informa nível e pai', () => {
    expect(ids(['c1'])).toEqual(['c1', 'at', 'sa', 'c2']);
    expect(ids(['c1', 'at'])).toEqual(['c1', 'at', 'ma', 'sa', 'c2']);
    const ma = linhasVisiveisArvore(nos, new Set(['c1', 'at'])).find((l) => l.id === 'ma')!;
    expect([ma.nivel, ma.paiId, ma.temFilhos]).toEqual([3, 'at', false]);
  });

  it('filho aberto sob pai recolhido não aparece; folha e nó sem filhos nunca ficam abertos', () => {
    expect(ids(['at'])).toEqual(['c1', 'c2']);
    expect(linhasVisiveisArvore(nos, new Set(['c2']))[1]!.aberto).toBe(false);
  });

  it('ancestrais: raiz primeiro, sem o próprio; ausente ou raiz dá vazio', () => {
    expect(ancestraisDe(nos, 'ma')).toEqual(['c1', 'at']);
    expect(ancestraisDe(nos, 'sa')).toEqual(['c1']);
    expect(ancestraisDe(nos, 'c1')).toEqual([]);
    expect(ancestraisDe(nos, 'nada')).toEqual([]);
  });

  it('id repetido em níveis diferentes abre junto e os ancestrais usam a primeira ocorrência', () => {
    const dup: PaletaNo[] = [
      { id: 'x', rotulo: 'X', filhos: [{ id: 'y', rotulo: 'Y', filhos: [{ id: 'x', rotulo: 'X2' }] }] },
    ];
    expect(ancestraisDe(dup, 'x')).toEqual([]);
    expect(linhasVisiveisArvore(dup, new Set(['x', 'y'])).map((l) => l.nivel)).toEqual([1, 2, 3]);
  });
});
