import { describe, expect, it } from 'vitest';
import { normalizarMarkdownImportado, possuiFrontMatterYaml, validarArquivoMarkdown, TAMANHO_MAXIMO_IMPORTACAO_BYTES } from './importar-markdown';

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


describe('validarArquivoMarkdown', () => {
  it.each(['texto.md', 'texto.MD', 'texto.markdown', 'texto.MARKDOWN'])('aceita %s', (name) => {
    expect(validarArquivoMarkdown({ name, size: 10 }, 100, 'Texto\n')).toBeNull();
  });
  it('recusa extensão diferente mesmo com mime Markdown', () => {
    expect(validarArquivoMarkdown({ name: 'texto.txt', size: 10 }, 100, 'Texto\n')).toBe('EXTENSAO');
  });
  it('recusa mais de 1 MB e aceita o tamanho exato antes da leitura', () => {
    expect(validarArquivoMarkdown({ name: 'texto.md', size: TAMANHO_MAXIMO_IMPORTACAO_BYTES + 1 }, 100)).toBe('TAMANHO');
    expect(validarArquivoMarkdown({ name: 'texto.md', size: TAMANHO_MAXIMO_IMPORTACAO_BYTES }, 100)).toBeNull();
  });
  it('recusa conteúdo vazio depois de normalizar', () => {
    expect(validarArquivoMarkdown({ name: 'texto.md', size: 20 }, 100, normalizarMarkdownImportado('---\ntitulo: X\n---\n'))).toBe('VAZIO');
  });
  it('aplica o limite recebido sem truncar e aceita exatamente o teto', () => {
    const conteudo = 'abc\n';
    expect(validarArquivoMarkdown({ name: 'texto.md', size: 4 }, 3, conteudo)).toBe('TAMANHO');
    expect(conteudo).toBe('abc\n');
    expect(validarArquivoMarkdown({ name: 'texto.md', size: 4 }, 4, conteudo)).toBeNull();
  });
});
