import {
  capitularPatchnote,
  estruturarPatchnote,
  gerarSlugPatchnote,
  formatarDataPatchnote,
  formatarDataPatchnoteCurta,
} from './patchnote-formato';

describe('estruturarPatchnote', () => {
  it('nota só com ## vira um grupo único sem título, com tom pelo título (acento e caixa ignorados)', () => {
    const estrutura = estruturarPatchnote(
      'Resumo da versão.\n\n## Novidades\n\n- A\n- B\n\n## MELHORIAS\n\n- C\n\n## Correções\n\n- D\n\n## Outros\n\n- E',
    );

    expect(estrutura.introducao).toBe('Resumo da versão.');
    expect(estrutura.grupos).toHaveLength(1);
    expect(estrutura.grupos[0].titulo).toBeNull();
    expect(estrutura.grupos[0].blocos.map((bloco) => [bloco.titulo, bloco.tom])).toEqual([
      ['Novidades', 'novidades'],
      ['MELHORIAS', 'melhorias'],
      ['Correções', 'correcoes'],
      ['Outros', 'neutro'],
    ]);
    expect(estrutura.grupos[0].blocos[0].markdown).toBe('- A\n- B');
  });

  it('separa grupos por # e blocos de funcionalidade por ##', () => {
    const estrutura = estruturarPatchnote(
      'Abertura.\n\n# PARA OS PLAYERS\n\nTexto do grupo.\n\n## 🎬 Cenas\n\nParágrafo.\n\n## 🔒 Fichas\n\n- item\n\n# PARA O MESTRE\n\n## 📚 Biblioteca\n\nTexto.\n\n# RESUMO\n\nSó um parágrafo.',
    );

    expect(estrutura.introducao).toBe('Abertura.');
    expect(estrutura.grupos.map((grupo) => grupo.titulo)).toEqual([
      'PARA OS PLAYERS',
      'PARA O MESTRE',
      'RESUMO',
    ]);
    expect(estrutura.grupos[0].introducao).toBe('Texto do grupo.');
    expect(estrutura.grupos[0].blocos.map((bloco) => [bloco.titulo, bloco.tom])).toEqual([
      ['🎬 Cenas', 'neutro'],
      ['🔒 Fichas', 'neutro'],
    ]);
    expect(estrutura.grupos[1].blocos[0].markdown).toBe('Texto.');
    expect(estrutura.grupos[2]).toEqual({ titulo: 'RESUMO', introducao: 'Só um parágrafo.', blocos: [] });
  });

  it('aceita blocos de balanço dentro de um grupo', () => {
    const estrutura = estruturarPatchnote('# PARA OS PLAYERS\n\n## Novidades\n\n- A');
    expect(estrutura.grupos[0].blocos[0].tom).toBe('novidades');
  });

  it('nota sem nenhum título vira só introdução', () => {
    expect(estruturarPatchnote('Só texto.\n\nOutro parágrafo.')).toEqual({
      introducao: 'Só texto.\n\nOutro parágrafo.',
      grupos: [],
    });
  });

  it('não abre grupo nem bloco com # ou ## dentro de código cercado, nem com ###', () => {
    const estrutura = estruturarPatchnote(
      '## Novidades\n\n```\n# isto não é grupo\n## nem bloco\n```\n\n### Sub\n\ntexto',
    );

    expect(estrutura.grupos).toHaveLength(1);
    expect(estrutura.grupos[0].blocos).toHaveLength(1);
    expect(estrutura.grupos[0].blocos[0].markdown).toContain('## nem bloco');
    expect(estrutura.grupos[0].blocos[0].markdown).toContain('### Sub');
  });

  it('tolera CRLF e # de fechamento', () => {
    const estrutura = estruturarPatchnote('## Novidades ##\r\n\r\n- A\r\n');
    expect(estrutura.grupos[0].blocos[0]).toEqual({ titulo: 'Novidades', tom: 'novidades', markdown: '- A' });
  });

  it('bloco vazio continua existindo, com markdown vazio', () => {
    expect(estruturarPatchnote('## Correções').grupos[0].blocos[0].markdown).toBe('');
  });
});

describe('formatarDataPatchnote', () => {
  it('escreve a data por extenso em português', () => {
    expect(formatarDataPatchnote('2026-09-29')).toBe('29 de setembro de 2026');
    expect(formatarDataPatchnote('2026-03-01')).toBe('1 de março de 2026');
  });

  it('abrevia para a lista', () => {
    expect(formatarDataPatchnoteCurta('2026-09-01')).toBe('01 set 2026');
  });

  it.each(['', 'ontem', '2026-13-01', '2026-00-10'])('devolve %j como veio', (texto) => {
    expect(formatarDataPatchnote(texto)).toBe(texto);
    expect(formatarDataPatchnoteCurta(texto)).toBe(texto);
  });
});

describe('gerarSlugPatchnote', () => {
  it.each([
    ['🎬 Cenas substituem a Iniciativa', 'cenas-substituem-a-iniciativa'],
    ['Biblioteca de documentos', 'biblioteca-de-documentos'],
    ['PARA O MESTRE', 'para-o-mestre'],
    ['Correções & ajustes: ficha (NPC)!', 'correcoes-ajustes-ficha-npc'],
    ['  📚   Espaços   múltiplos ', 'espacos-multiplos'],
    ['👨‍👩‍👧', 'capitulo'],
    ['!!!', 'capitulo'],
  ])('%j vira %j', (titulo, slug) => {
    expect(gerarSlugPatchnote(titulo)).toBe(slug);
  });
});

describe('capitularPatchnote', () => {
  it('grupos viram capítulos e os blocos, filhos, com id estável', () => {
    const capitulos = capitularPatchnote(
      estruturarPatchnote(
        'Abertura.\n\n# PARA OS PLAYERS\n\n## 🎬 Cenas\n\nTexto.\n\n## Novidades\n\n- a\n\n# PARA O MESTRE\n\n## 📚 Biblioteca\n\nTexto.',
      ),
    );

    expect(capitulos.map((capitulo) => [capitulo.id, capitulo.publico])).toEqual([
      ['para-os-players', 'players'],
      ['para-o-mestre', 'mestre'],
    ]);
    expect(capitulos[0].filhos.map((filho) => filho.id)).toEqual(['cenas', 'novidades']);
    expect(capitulos[1].filhos.map((filho) => filho.titulo)).toEqual(['📚 Biblioteca']);
  });

  it('títulos repetidos recebem -2, -3… na ordem do documento, entre grupos e blocos', () => {
    const capitulos = capitularPatchnote(
      estruturarPatchnote(
        '# A\n\n## Fichas\n\n## Fichas\n\n# B\n\n## Fichas\n\n## Fichas 2\n\n# A\n\n## fichas',
      ),
    );

    expect(capitulos.map((capitulo) => capitulo.id)).toEqual(['a', 'b', 'a-2']);
    expect(capitulos.flatMap((capitulo) => capitulo.filhos.map((filho) => filho.id))).toEqual([
      'fichas',
      'fichas-2',
      'fichas-3',
      'fichas-2-2',
      'fichas-4',
    ]);
  });

  it('nota só com ## (grupo implícito): os blocos sobem para o primeiro nível', () => {
    const capitulos = capitularPatchnote(
      estruturarPatchnote('Resumo.\n\n## Novidades\n\n- a\n\n## Correções\n\n- b'),
    );

    expect(capitulos.map((capitulo) => [capitulo.id, capitulo.publico, capitulo.filhos.length])).toEqual([
      ['novidades', 'geral', 0],
      ['correcoes', 'geral', 0],
    ]);
  });

  it('nota sem títulos não tem capítulos', () => {
    expect(capitularPatchnote(estruturarPatchnote('Só um texto.'))).toEqual([]);
  });

  it('grupo sem blocos (o # RESUMO) é um capítulo sem filhos', () => {
    const [resumo] = capitularPatchnote(estruturarPatchnote('# RESUMO\n\nSó um parágrafo.'));

    expect(resumo).toEqual({ titulo: 'RESUMO', id: 'resumo', publico: 'resumo', filhos: [] });
  });

  // Títulos de grupo (`# …`) de docs/patchnotes/*.md, as seis notas publicadas.
  it.each([
    ['PARA OS PLAYERS', 'players', 'para-os-players'],
    ['PARA O MESTRE', 'mestre', 'para-o-mestre'],
    ['RESUMO DO QUE JÁ EXISTIA', 'resumo', 'resumo-do-que-ja-existia'],
    ['RESUMO DO QUE MAIS MUDA NA MESA', 'resumo', 'resumo-do-que-mais-muda-na-mesa'],
  ])('público do grupo real %j é %s', (titulo, publico, id) => {
    const [capitulo] = capitularPatchnote(estruturarPatchnote(`# ${titulo}\n\n## Bloco\n\nTexto.`));

    expect(capitulo.publico).toBe(publico);
    expect(capitulo.id).toBe(id);
  });

  it('título fora dos três públicos é geral', () => {
    const [capitulo] = capitularPatchnote(estruturarPatchnote('# SOBRE A VERSÃO\n\nTexto.'));

    expect(capitulo.publico).toBe('geral');
  });
});
