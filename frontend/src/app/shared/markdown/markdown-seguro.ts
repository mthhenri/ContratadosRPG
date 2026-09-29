import { SecurityContext } from '@angular/core';
import type { DomSanitizer } from '@angular/platform-browser';
import { Renderer, marked } from 'marked';

function escaparAtributo(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function normalizarUrlSegura(href: string): string | null {
  try {
    const url = new URL(href.trim());
    return ['http:', 'https:', 'mailto:'].includes(url.protocol.toLowerCase()) ? url.href : null;
  } catch {
    return null;
  }
}

/** Compila Markdown sem HTML/imagens e sanitiza a saída sem marcar conteúdo como confiável. */
export function renderizarMarkdownSeguro(markdown: string, sanitizer: DomSanitizer): string {
  const renderer = new Renderer();
  renderer.html = () => '';
  renderer.image = () => '';
  renderer.link = function ({ href, title, tokens }): string {
    const texto = this.parser.parseInline(tokens);
    const urlSegura = normalizarUrlSegura(href);
    if (!urlSegura) {
      return texto;
    }
    const atributoTitulo = title ? ` title="${escaparAtributo(title)}"` : '';
    return `<a href="${escaparAtributo(urlSegura)}"${atributoTitulo} target="_blank" rel="noopener noreferrer">${texto}</a>`;
  };

  const html = marked.parse(markdown.replace(/^[\u200B-\u200F\uFEFF]/, ''), {
    async: false,
    renderer,
  });
  return sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
}
