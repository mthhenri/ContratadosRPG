import { describe, expect, it } from 'vitest';
import {
  interpretarIndicePatchnotes,
  interpretarPatchnote,
  ordenarPatchnotes,
} from './patchnote-formato.util';

const NOTA = `---
versao: 1.1.0
data: 2026-09-29
titulo: "Cenas e Biblioteca"
---

## Novidades

- Cenas na campanha.
`;

describe('interpretarPatchnote', () => {
  it('lê front matter e corpo, tirando aspas do título', () => {
    expect(interpretarPatchnote(NOTA)).toEqual({
      patchnote: {
        versao: '1.1.0',
        data: '2026-09-29',
        titulo: 'Cenas e Biblioteca',
        conteudoMarkdown: '## Novidades\n\n- Cenas na campanha.',
      },
    });
  });

  it('aceita CRLF e BOM', () => {
    const resultado = interpretarPatchnote(String.fromCharCode(0xfeff) + NOTA.replace(/\n/g, '\r\n'));
    expect('patchnote' in resultado && resultado.patchnote.versao).toBe('1.1.0');
  });

  it('recusa arquivo sem front matter', () => {
    expect(interpretarPatchnote('## só corpo')).toEqual({
      erros: [expect.stringContaining('front matter')],
    });
  });

  it('acumula todos os erros de campo', () => {
    const resultado = interpretarPatchnote('---\nversao: v1\ndata: 2026-02-30\ntitulo:\n---\n');
    expect('erros' in resultado && resultado.erros).toHaveLength(4);
  });

  it.each(['2026-13-01', '2026-02-30', '26-01-01', 'ontem'])('recusa a data %s', (data) => {
    const resultado = interpretarPatchnote(NOTA.replace('2026-09-29', data));
    expect('erros' in resultado && resultado.erros.join(' ')).toContain('"data"');
  });

  it('recusa título e corpo acima do limite', () => {
    const titulo = 'x'.repeat(121);
    expect('erros' in interpretarPatchnote(NOTA.replace('"Cenas e Biblioteca"', titulo))).toBe(true);
    expect('erros' in interpretarPatchnote(`${NOTA}${'a'.repeat(50_001)}`)).toBe(true);
  });
});

describe('interpretarPatchnote — commit opcional (versão automática)', () => {
  it('aceita e ignora o commit no conteúdo devolvido', () => {
    const resultado = interpretarPatchnote(NOTA.replace('titulo: "Cenas e Biblioteca"', 'titulo: Cenas\ncommit: 641a8529cf9020f4beb7307d131bc8ada2fbca8a'));
    expect('patchnote' in resultado && Object.keys(resultado.patchnote)).toEqual(['versao', 'data', 'titulo', 'conteudoMarkdown']);
  });

  it.each(['zzzzzzz', '641a85', 'HEAD'])('recusa o commit %j', (commit) => {
    const resultado = interpretarPatchnote(NOTA.replace('titulo: "Cenas e Biblioteca"', `titulo: Cenas\ncommit: ${commit}`));
    expect('erros' in resultado && resultado.erros.join(' ')).toContain('"commit"');
  });
});

describe('interpretarIndicePatchnotes', () => {
  it('trata arquivo ausente como índice vazio', () => {
    expect(interpretarIndicePatchnotes(null)).toEqual([]);
  });

  it('lê as entradas', () => {
    const itens = [{ versao: '1.0.0', data: '2026-09-01', titulo: 'Base' }];
    expect(interpretarIndicePatchnotes(JSON.stringify(itens))).toEqual(itens);
  });

  it('lança para JSON inválido, não-array ou entrada fora do formato', () => {
    expect(() => interpretarIndicePatchnotes('{')).toThrow();
    expect(() => interpretarIndicePatchnotes('{}')).toThrow('array');
    expect(() =>
      interpretarIndicePatchnotes(JSON.stringify([{ versao: '../x', data: '2026-09-01', titulo: 'A' }])),
    ).toThrow('inválida');
    expect(() => interpretarIndicePatchnotes('[null]')).toThrow('inválida');
  });
});

describe('ordenarPatchnotes', () => {
  it('ordena por versão decrescente sem mutar a entrada', () => {
    const entrada = [
      { versao: '1.2.0', data: '2026-01-02', titulo: 'B' },
      { versao: '1.10.0', data: '2026-01-03', titulo: 'C' },
      { versao: '1.0.0', data: '2026-01-01', titulo: 'A' },
    ];
    const copia = [...entrada];

    expect(ordenarPatchnotes(entrada).map((item) => item.versao)).toEqual(['1.10.0', '1.2.0', '1.0.0']);
    expect(entrada).toEqual(copia);
  });
});
