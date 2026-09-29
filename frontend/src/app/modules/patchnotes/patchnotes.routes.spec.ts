import { UrlSegment } from '@angular/router';

import { casarPatchnotes } from './patchnotes.routes';

describe('casarPatchnotes', () => {
  it('casa a raiz sem versão', () => {
    expect(casarPatchnotes([])).toEqual({ consumed: [] });
  });

  it('casa um segmento como a versão', () => {
    const segmentos = [new UrlSegment('1.1.0', {})];
    const resultado = casarPatchnotes(segmentos);

    expect(resultado?.consumed).toBe(segmentos);
    expect(resultado?.posParams?.['versao'].path).toBe('1.1.0');
  });

  it('não casa mais de um segmento', () => {
    expect(casarPatchnotes([new UrlSegment('1.1.0', {}), new UrlSegment('x', {})])).toBeNull();
  });
});
