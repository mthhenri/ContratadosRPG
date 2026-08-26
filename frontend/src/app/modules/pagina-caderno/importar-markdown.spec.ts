import { describe, expect, it } from 'vitest';

import {
  derivarTituloDeArquivo,
  normalizarMarkdownImportado,
  possuiFrontMatterYaml,
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

describe('normalizarMarkdownImportado', () => {
  it('normaliza BOM, zero-width e quebras CRLF', () => {
    expect(normalizarMarkdownImportado('\uFEFF\u200B# Título\r\n\rTexto\r')).toBe(
      '# Título\n\nTexto\n',
    );
  });

  it('remove front matter inicial e preserva divisor no meio', () => {
    const markdown = '---\ntags: [rpg]\n---\n\n# Registro\n\n---\n\nFim';
    expect(possuiFrontMatterYaml(markdown)).toBe(true);
    expect(normalizarMarkdownImportado(markdown)).toBe('# Registro\n\n---\n\nFim\n');
  });

  it('converte imagens remotas em links e imagens locais em texto alternativo', () => {
    expect(
      normalizarMarkdownImportado('![Mapa](https://exemplo.com/mapa.png) ![Selo](./selo.png)'),
    ).toBe('[Mapa](https://exemplo.com/mapa.png) Selo\n');
  });

  it('preserva imagens em código cercado e inline', () => {
    const markdown = '```md\n![X](https://x.test/a.png)\n```\n\n`![Y](./y.png)`';
    expect(normalizarMarkdownImportado(markdown)).toBe(`${markdown}\n`);
  });

  it('preserva tabela GFM sem alteração', () => {
    const tabela = '| Nome | Estado |\n| :--- | ---: |\n| Alfa | Ativo |';
    expect(normalizarMarkdownImportado(tabela)).toBe(`${tabela}\n`);
  });
});
