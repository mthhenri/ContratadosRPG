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

  function ajustarAtributo(raiz: HTMLElement, indice: number, valorAtributo: number): void {
    const campo = raiz.querySelectorAll('.stepper__valor')[indice] as HTMLInputElement;
    campo.value = String(valorAtributo);
    campo.dispatchEvent(new Event('input'));
  }

  it('calcula Vida e Energia do preset padrão (Combatente Nível 0, atributos 1)', async () => {
    const { raiz } = await montar();
    // Vida = (30 + 1×4) + 0×(…) = 34; Energia = (15 + 1×2) + 0×(…) = 17.
    expect(valor(raiz, 'vida')).toBe('34');
    expect(valor(raiz, 'energia')).toBe('17');
  });

  it('mapeia stats indisponíveis do Civil para N/A', async () => {
    const { fixture, raiz } = await montar();
    selecionarClasse(raiz, 'CIVIL');
    fixture.detectChanges();
    // Civil não possui Defesa nem Proficiência (doc — "Jogando como um Civil").
    expect(valor(raiz, 'defesa')).toBe('N/A');
    expect(valor(raiz, 'proficiencia')).toBe('N/A');
  });

  it('Limpar volta a aba ao preset padrão (m1-19)', async () => {
    const { fixture, raiz } = await montar();
    ajustarAtributo(raiz, 0, 5); // Vigor 1 → 5
    fixture.detectChanges();
    expect(valor(raiz, 'vida')).not.toBe('34');

    // Limpar é em duas etapas: 1º clique arma "Tem certeza?", 2º confirma.
    const limpar = raiz.querySelector('.ajuda-limpar') as HTMLButtonElement;
    limpar.click();
    fixture.detectChanges();
    limpar.click();
    fixture.detectChanges();

    // De volta ao preset (Combatente Nível 0, atributos 1): Vida 34, Energia 17, Vigor 1.
    expect(valor(raiz, 'vida')).toBe('34');
    expect(valor(raiz, 'energia')).toBe('17');
    const vigor = raiz.querySelectorAll('.stepper__valor')[0] as HTMLInputElement;
    expect(vigor.value).toBe('1');
  });

  it('preserva o estado ao trocar de aba e voltar (singleton em memória — m1-17)', async () => {
    await TestBed.configureTestingModule({ imports: [AgentePage] }).compileComponents();

    // Primeira visita: preenche (Vigor é o 1º stepper de atributo — ver ordem de `campos`).
    const primeira = TestBed.createComponent(AgentePage);
    primeira.detectChanges();
    ajustarAtributo(primeira.nativeElement as HTMLElement, 0, 5);
    primeira.detectChanges();
    primeira.destroy(); // sai da aba: a rota lazy desmonta o componente.

    // Volta à aba: mesmo injector root → mesmo singleton → o valor digitado é restaurado.
    const segunda = TestBed.createComponent(AgentePage);
    segunda.detectChanges();
    const vigor = (segunda.nativeElement as HTMLElement).querySelectorAll(
      '.stepper__valor',
    )[0] as HTMLInputElement;
    expect(vigor.value).toBe('5');
  });
});
