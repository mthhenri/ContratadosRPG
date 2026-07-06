import { TestBed } from '@angular/core/testing';

import { DescansoPage } from './descanso.page';

/**
 * Prova que a aba Descanso exibe a faixa determinística e o resultado da rolagem vindos de
 * `shared/regras/descanso` (nenhuma regra duplicada no front). Os valores conferem com
 * `calcularDescanso`/`calcularResultadoDescanso` (m1-04). A rolagem é testada pelo caminho
 * não-animado (`rolar(false)`) com `Math.random` fixado, isolando o determinismo do scramble.
 */
describe('DescansoPage', () => {
  async function montar() {
    await TestBed.configureTestingModule({ imports: [DescansoPage] }).compileComponents();
    const fixture = TestBed.createComponent(DescansoPage);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  function selecionar(raiz: HTMLElement, id: string, valor: string): void {
    const campo = raiz.querySelector(`#${id}`) as HTMLSelectElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('change'));
  }

  function valorFaixa(raiz: HTMLElement, track: 'destaque' | 'energia'): string {
    return (
      raiz
        .querySelector(`.descanso-faixas .calc-stat--${track} .calc-stat__valor`)
        ?.textContent?.trim() ?? ''
    );
  }

  it('exibe a faixa determinística do preset padrão (Curto, Adequado, atributos 1, Nível 0)', async () => {
    const { raiz } = await montar();
    // Energia: 1D4 + (0×2) → mín 1, máx 4. Vida: Descanso Curto não recupera.
    expect(valorFaixa(raiz, 'energia')).toBe('1–4');
    expect(valorFaixa(raiz, 'destaque')).toBe('Não recupera Vida');
  });

  it('desloca os dados por ambiente e refeição e passa a recuperar Vida no Longo', async () => {
    const { fixture, raiz } = await montar();
    // Longo (Energia 1D8 / Vida 1D6) + Confortável (+1) + Refeição (+1) = +2 na escada de dados:
    // Energia 8→12, Vida 6→10. Atributos 1, Nível 0 → Energia 1–12, Vida 1–10.
    selecionar(raiz, 'desc-tipo', 'LONGO');
    selecionar(raiz, 'desc-qualidade', 'CONFORTAVEL');
    selecionar(raiz, 'desc-refeicao', 'sim');
    fixture.detectChanges();
    expect(valorFaixa(raiz, 'energia')).toBe('1–12');
    expect(valorFaixa(raiz, 'destaque')).toBe('1–10');
  });

  it('rola os dados (sem animação) somando recuperação + Nível pelo motor', async () => {
    const { fixture, raiz } = await montar();
    // Médio (Energia 1D6 / Vida 1D4), Nível 3 → bônus 6. Math.random fixado em 0 → cada dado = 1.
    selecionar(raiz, 'desc-tipo', 'MEDIO');
    const nivel = raiz.querySelectorAll('.calc-config .stepper__valor')[2] as HTMLInputElement;
    nivel.value = '3';
    nivel.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const aleatorio = vi.spyOn(Math, 'random').mockReturnValue(0);
    (fixture.componentInstance as unknown as { rolar(animar?: boolean): void }).rolar(false);
    fixture.detectChanges();
    aleatorio.mockRestore();

    // Energia: [1] + 6 = 7. Vida: [1] + 6 = 7.
    const energia = raiz.querySelector('.descanso-rolagem .calc-stat--energia .calc-stat__valor');
    const vida = raiz.querySelector('.descanso-rolagem .calc-stat--destaque .calc-stat__valor');
    expect(energia?.textContent?.trim()).toBe('7');
    expect(vida?.textContent?.trim()).toBe('7');
    expect(
      raiz.querySelector('.descanso-rolagem .calc-stat--energia .calc-stat__detalhe')?.textContent,
    ).toContain('[1] + 6 = 7');
  });

  it('preserva o estado ao trocar de aba e voltar (singleton em memória — m1-17)', async () => {
    await TestBed.configureTestingModule({ imports: [DescansoPage] }).compileComponents();

    // Primeira visita: muda o tipo de descanso.
    const primeira = TestBed.createComponent(DescansoPage);
    primeira.detectChanges();
    selecionar(primeira.nativeElement as HTMLElement, 'desc-tipo', 'LONGO');
    primeira.detectChanges();
    primeira.destroy(); // sai da aba: a rota lazy desmonta o componente.

    // Volta à aba: mesmo injector root → mesmo singleton → o tipo escolhido é restaurado.
    const segunda = TestBed.createComponent(DescansoPage);
    segunda.detectChanges();
    const tipo = (segunda.nativeElement as HTMLElement).querySelector(
      '#desc-tipo',
    ) as HTMLSelectElement;
    expect(tipo.value).toBe('LONGO');
  });
});
