import { TestBed } from '@angular/core/testing';

import { DtPage } from './dt.page';

/**
 * Prova que a aba DT exibe o valor vindo de `shared/regras/dt` (nenhuma fórmula duplicada no
 * front). Os valores esperados batem com `calcularDtAtributo` (m1-03) = 10 + Nível + Atributo×2.
 */
describe('DtPage', () => {
  async function montar() {
    await TestBed.configureTestingModule({ imports: [DtPage] }).compileComponents();
    const fixture = TestBed.createComponent(DtPage);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  it('calcula a DT do preset padrão (Nível 0, Atributo 1)', async () => {
    const { raiz } = await montar();
    // DT = 10 + 0 + 1×2 = 12.
    expect(raiz.querySelector('.calc-resultado')?.textContent?.trim()).toBe('12');
  });

  it('preenche a tabela de referência pelo motor (ATR 1 nos níveis 0/5/10/15/20)', async () => {
    const { raiz } = await montar();
    const primeiraLinha = raiz.querySelectorAll('.calc-tabela tbody tr')[0];
    const valores = Array.from(primeiraLinha.querySelectorAll('.calc-tabela__celula-valor')).map(
      (celula) => celula.textContent?.trim(),
    );
    // 10 + nível + 1×2 → 12, 17, 22, 27, 32.
    expect(valores).toEqual(['12', '17', '22', '27', '32']);
  });

  it('preserva o estado ao trocar de aba e voltar (singleton em memória — m1-17)', async () => {
    await TestBed.configureTestingModule({ imports: [DtPage] }).compileComponents();

    // Primeira visita: muda o Nível (1º stepper).
    const primeira = TestBed.createComponent(DtPage);
    primeira.detectChanges();
    const nivel = (primeira.nativeElement as HTMLElement).querySelectorAll(
      '.stepper__valor',
    )[0] as HTMLInputElement;
    nivel.value = '15';
    nivel.dispatchEvent(new Event('input'));
    primeira.detectChanges();
    primeira.destroy(); // sai da aba: a rota lazy desmonta o componente.

    // Volta à aba: mesmo injector root → mesmo singleton → o Nível digitado é restaurado.
    const segunda = TestBed.createComponent(DtPage);
    segunda.detectChanges();
    const nivelRestaurado = (segunda.nativeElement as HTMLElement).querySelectorAll(
      '.stepper__valor',
    )[0] as HTMLInputElement;
    expect(nivelRestaurado.value).toBe('15');
  });
});
