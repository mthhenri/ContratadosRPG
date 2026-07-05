import { TestBed } from '@angular/core/testing';

import { AgentePage } from './agente.page';

/**
 * Prova que a aba do agente exibe stats vindas de `shared/regras/agente` (nenhuma
 * regra duplicada no front) e mapeia stats indisponíveis do Civil para "N/A".
 * Os valores esperados são conferidos contra as fórmulas do motor (m1-02), que por
 * sua vez batem com docs/core/sistema-v4.1.0.md.
 */
describe('AgentePage', () => {
  async function montar() {
    await TestBed.configureTestingModule({ imports: [AgentePage] }).compileComponents();
    const fixture = TestBed.createComponent(AgentePage);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  function valor(raiz: HTMLElement, modificador: string): string {
    const alvo = raiz.querySelector(`.agente-stat--${modificador} .agente-stat__valor`);
    return alvo?.textContent?.trim() ?? '';
  }

  function selecionarClasse(raiz: HTMLElement, valorClasse: string): void {
    const select = raiz.querySelector('.agente-select') as HTMLSelectElement;
    select.value = valorClasse;
    select.dispatchEvent(new Event('change'));
  }

  it('calcula Vida e Energia do preset padrão (Combatente Nível 3)', async () => {
    const { raiz } = await montar();
    // Vida = (30 + 2×4) + 3×(7 + 2×2) = 71; Energia = (15 + 2×2) + 3×(4 + 2×2) = 43.
    expect(valor(raiz, 'vida')).toBe('71');
    expect(valor(raiz, 'energia')).toBe('43');
  });

  it('mapeia stats indisponíveis do Civil para N/A', async () => {
    const { fixture, raiz } = await montar();
    selecionarClasse(raiz, 'CIVIL');
    fixture.detectChanges();
    // Civil não possui Defesa nem Proficiência (doc — "Jogando como um Civil").
    expect(valor(raiz, 'defesa')).toBe('N/A');
    expect(valor(raiz, 'proficiencia')).toBe('N/A');
  });
});
