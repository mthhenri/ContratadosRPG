import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const estilos = readFileSync(
  new URL('../src/app/shared/bandeja-dados/bandeja-dados.component.scss', import.meta.url),
  'utf8',
);

describe('badge privada da BandejaDados', () => {
  it('usa o token vermelho fixo definido pelo tema', () => {
    const modificadorPrivada = estilos.match(/&--privada\s*\{(?<declaracoes>[\s\S]*?)\n        \}/)?.groups
      ?.declaracoes;

    expect(modificadorPrivada).toBeDefined();
    expect(modificadorPrivada).not.toContain('var(--danger)');
    expect(modificadorPrivada).toMatch(/color:\s*var\(--vida\)/);
    expect(modificadorPrivada).toMatch(/border-color:\s*color-mix\(in srgb, var\(--vida\) 45%, transparent\)/);
    expect(modificadorPrivada).toMatch(/background:\s*color-mix\(in srgb, var\(--vida\) 10%, transparent\)/);
  });
});
