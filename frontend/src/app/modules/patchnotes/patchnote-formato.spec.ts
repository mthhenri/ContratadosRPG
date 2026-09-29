import {
  estruturarPatchnote,
  formatarDataPatchnote,
  formatarDataPatchnoteCurta,
} from './patchnote-formato';

describe('estruturarPatchnote', () => {
  it('separa a introdução dos blocos e dá tom pelo título, ignorando acento e caixa', () => {
    const estrutura = estruturarPatchnote(
      'Resumo da versão.\n\n## Novidades\n\n- A\n- B\n\n## MELHORIAS\n\n- C\n\n## Correções\n\n- D\n\n## Outros\n\n- E',
    );

    expect(estrutura.introducao).toBe('Resumo da versão.');
    expect(estrutura.blocos.map((bloco) => [bloco.titulo, bloco.tom])).toEqual([
      ['Novidades', 'novidades'],
      ['MELHORIAS', 'melhorias'],
      ['Correções', 'correcoes'],
      ['Outros', 'neutro'],
    ]);
    expect(estrutura.blocos[0].markdown).toBe('- A\n- B');
  });

  it('aceita nota que começa direto por um bloco, sem introdução', () => {
    const estrutura = estruturarPatchnote('## Novidades\n\n- A');
    expect(estrutura.introducao).toBe('');
    expect(estrutura.blocos).toHaveLength(1);
  });

  it('nota sem nenhum ## vira só introdução', () => {
    expect(estruturarPatchnote('Só texto.\n\nOutro parágrafo.')).toEqual({
      introducao: 'Só texto.\n\nOutro parágrafo.',
      blocos: [],
    });
  });

  it('não abre bloco com ## dentro de código cercado nem com ### ou #', () => {
    const estrutura = estruturarPatchnote(
      '## Novidades\n\n```\n## isto não é bloco\n```\n\n### Sub\n\n# Topo\n\ntexto',
    );

    expect(estrutura.blocos).toHaveLength(1);
    expect(estrutura.blocos[0].markdown).toContain('## isto não é bloco');
    expect(estrutura.blocos[0].markdown).toContain('### Sub');
  });

  it('tolera CRLF e ## de fechamento', () => {
    const estrutura = estruturarPatchnote('## Novidades ##\r\n\r\n- A\r\n');
    expect(estrutura.blocos[0]).toEqual({ titulo: 'Novidades', tom: 'novidades', markdown: '- A' });
  });

  it('bloco vazio continua existindo, com markdown vazio', () => {
    expect(estruturarPatchnote('## Correções').blocos[0].markdown).toBe('');
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
