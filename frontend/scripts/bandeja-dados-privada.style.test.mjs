import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const template = readFileSync(
  new URL('../src/app/shared/bandeja-dados/bandeja-dados.component.html', import.meta.url),
  'utf8',
);
const estilosChip = readFileSync(
  new URL('../src/app/shared/ui/chip/chip.component.scss', import.meta.url),
  'utf8',
);

describe('badge privada da BandejaDados', () => {
  it('usa a severidade perigo do chip, ligada ao vermelho fixo do tema', () => {
    expect(template).toContain("? 'perigo'");
    expect(template).not.toContain('bandeja__visibilidade--privada');
    expect(estilosChip).not.toContain('var(--danger)');
    expect(estilosChip).toContain('"perigo": (');
    expect(estilosChip).toContain('cor: var(--erro)');
    expect(estilosChip).toContain(
      'fundo: color-mix(in srgb, var(--erro) 12%, transparent)',
    );
  });
});
