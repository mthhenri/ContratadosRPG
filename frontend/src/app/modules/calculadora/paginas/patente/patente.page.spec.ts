import { TestBed } from '@angular/core/testing';

import { PatentePage } from './patente.page';

/**
 * Prova que a aba Patentes exibe a patente e a tabela vindas de `shared/regras/patente` (nenhuma
 * regra duplicada no front). Prestígio 0 → Agente (0–2); a faixa da última patente usa `∞`.
 */
describe('PatentePage', () => {
  async function montar() {
    await TestBed.configureTestingModule({ imports: [PatentePage] }).compileComponents();
    const fixture = TestBed.createComponent(PatentePage);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  function ajustarPrestigio(raiz: HTMLElement, valor: number): void {
    const campo = raiz.querySelector('.stepper__valor') as HTMLInputElement;
    campo.value = String(valor);
    campo.dispatchEvent(new Event('input'));
  }

  it('resolve a patente do Prestígio padrão (0 → Agente)', async () => {
    const { raiz } = await montar();
    expect(raiz.querySelector('.patente-destaque__nome')?.textContent?.trim()).toBe('Agente');
    expect(raiz.querySelector('.patente-destaque__faixa')?.textContent?.trim()).toBe('0–2 Prestígio');
    // A linha correspondente fica marcada na tabela completa.
    const linhaAtual = raiz.querySelector('.calc-tabela__linha--atual .calc-tabela__celula-rotulo');
    expect(linhaAtual?.textContent?.trim()).toBe('Agente');
  });

  it('formata a faixa da última patente com ∞ (Prestígio alto → Líder Operacional)', async () => {
    const { fixture, raiz } = await montar();
    ajustarPrestigio(raiz, 70);
    fixture.detectChanges();
    expect(raiz.querySelector('.patente-destaque__nome')?.textContent?.trim()).toBe(
      'Líder Operacional',
    );
    expect(raiz.querySelector('.patente-destaque__faixa')?.textContent?.trim()).toBe('66–∞ Prestígio');
  });
});
