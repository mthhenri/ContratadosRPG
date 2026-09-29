import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';

import { renderizarMarkdownSeguro } from './markdown-seguro';

describe('renderizarMarkdownSeguro', () => {
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BrowserModule] });
    sanitizer = TestBed.inject(DomSanitizer);
  });

  it('renderiza a sintaxe textual esperada', () => {
    const html = renderizarMarkdownSeguro('# Título\n\n- **Item**', sanitizer);
    const elemento = document.createElement('div');
    elemento.innerHTML = html;

    expect(elemento.querySelector('h1')?.textContent).toBe('Título');
    expect(elemento.querySelector('li strong')?.textContent).toBe('Item');
  });

  it('remove HTML livre e imagens', () => {
    const html = renderizarMarkdownSeguro(
      '<script>alert(1)</script>\n\n<img src=x onerror=alert(2)>\n\n![arquivo](https://example.com/a.png)',
      sanitizer,
    );

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror');
  });

  it.each(['javascript:alert(1)', 'data:text/html;base64,eA=='])(
    'rejeita link com protocolo perigoso %s',
    (url) => {
      const html = renderizarMarkdownSeguro(`[texto](${url})`, sanitizer);

      expect(html).not.toContain('href=');
      expect(html).toContain('texto');
    },
  );

  it('protege links externos contra window.opener', () => {
    const html = renderizarMarkdownSeguro('[fonte](https://example.com)', sanitizer);
    const elemento = document.createElement('div');
    elemento.innerHTML = html;
    const link = elemento.querySelector('a');

    expect(link?.getAttribute('href')).toBe('https://example.com/');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(sanitizer.sanitize(SecurityContext.HTML, html)).toBe(html);
  });
});
