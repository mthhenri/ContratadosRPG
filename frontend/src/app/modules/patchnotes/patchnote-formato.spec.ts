import {
  estruturarPatchnote,
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
