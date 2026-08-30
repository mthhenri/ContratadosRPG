import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const estilos = readFileSync(
  new URL(
    '../src/app/modules/campanha/componentes/inventario-esquadrao/inventario-esquadrao.component.scss',
    import.meta.url,
  ),
  'utf8',
);

describe('acoes destrutivas do Inventário do Esquadrão', () => {
  it('não referencia o token --danger inexistente', () => {
    expect(estilos).not.toContain('var(--danger)');
  });

  it('usa o token vermelho fixo --vida nos estados de remoção', () => {
    const remover = estilos.match(/&__remover:hover\s*\{(?<declaracoes>[\s\S]*?)\n {8}\}/)?.groups?.declaracoes;
    const remocaoTexto = estilos.match(/&__remocao-texto\s*\{(?<declaracoes>[\s\S]*?)\n {8}\}/)?.groups
      ?.declaracoes;
    const removerConfirmar = estilos.match(/&__remover--confirmar\s*\{(?<declaracoes>[\s\S]*?)\n {8}\}/)?.groups
      ?.declaracoes;

    expect(remover).toBeDefined();
    expect(remocaoTexto).toBeDefined();
    expect(removerConfirmar).toBeDefined();

    expect(remover).toMatch(/color:\s*var\(--vida\)/);
    expect(remover).toMatch(/border-color:\s*var\(--vida\)/);
    expect(remocaoTexto).toMatch(/color:\s*var\(--vida\)/);
    expect(removerConfirmar).toMatch(/color:\s*var\(--vida\)/);
    expect(removerConfirmar).toMatch(/border-color:\s*var\(--vida\)/);
  });
});
