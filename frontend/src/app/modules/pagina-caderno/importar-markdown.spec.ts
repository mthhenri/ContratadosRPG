import { describe, expect, it } from 'vitest';

import {
  derivarTituloDeArquivo,
} from './importar-markdown';

describe('derivarTituloDeArquivo', () => {
  it.each([
    ['registro.md', 'registro'],
    ['SESSAO.MARKDOWN', 'SESSAO'],
    ['C:\\vault\\ Sessão   04.md', 'Sessão 04'],
    ['/tmp/.md', 'Página importada'],
  ])('deriva o título de %s', (nome, esperado) => {
    expect(derivarTituloDeArquivo(nome)).toBe(esperado);
  });

  it('limita o título a 120 caracteres sem deixar espaço no fim', () => {
    expect(derivarTituloDeArquivo(`${'a'.repeat(119)} b.md`)).toBe('a'.repeat(119));
  });
});
