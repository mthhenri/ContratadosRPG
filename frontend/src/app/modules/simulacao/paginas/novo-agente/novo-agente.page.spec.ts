import { TestBed } from '@angular/core/testing';

import { NovoAgentePage } from './novo-agente.page';

/**
 * Prova que a aba Novo Agente exibe Nível/Prestígio iniciais, patente e bônus vindos de
 * `shared/regras/novo-agente` (nenhuma regra duplicada no front). Preset padrão (Morte ÷7,
 * média Nível 5, média Prestígio 10) conferido contra `calcularNovoAgente` (m1-03):
 * Nível 4, Prestígio 9, Patente Experiente, bônus 9 × (500 × 2) = 9000.
 */
describe('NovoAgentePage', () => {
  async function montar() {
    await TestBed.configureTestingModule({ imports: [NovoAgentePage] }).compileComponents();
    const fixture = TestBed.createComponent(NovoAgentePage);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  function valorStat(raiz: HTMLElement, modificador: string): string {
    return (
      raiz.querySelector(`.calc-stat--${modificador} .calc-stat__valor`)?.textContent?.trim() ?? ''
    );
  }

  it('exibe Nível, Prestígio e Patente iniciais do preset padrão', async () => {
    const { raiz } = await montar();
    expect(valorStat(raiz, 'destaque')).toBe('4');
    expect(valorStat(raiz, 'energia')).toBe('9');
    expect(valorStat(raiz, 'positivo')).toBe('Experiente');
  });

  it('auto-preenche o bônus monetário a partir do Prestígio inicial calculado', async () => {
    const { raiz } = await montar();
    // 9 × (500 × 2.0) = 9000, formatado em pt-BR.
    expect(raiz.querySelector('.calc-resultado--dinheiro')?.textContent?.trim()).toBe('$ 9.000');
  });

  it('resincroniza o bônus no mesmo passo em que a média de Prestígio muda', async () => {
    const { fixture, raiz } = await montar();
    // Média de Prestígio é o 3º stepper (motivo=select; média de Nível=1º; média de Prestígio=2º).
    const campos = raiz.querySelectorAll('.calc-config .stepper__valor');
    const mediaPrestigio = campos[1] as HTMLInputElement;
    mediaPrestigio.value = '40';
    mediaPrestigio.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // Morte ÷7: dedução ⌊40/7⌋=5, antes 35, piso Força Tarefa Especial (33) → Prestígio 35
    // (Força Tarefa Especial, 3.5×) → bônus 35 × (500 × 3.5) = 61.250. Prova que o campo do bônus
    // não fica um passo atrás da média de Prestígio.
    expect(raiz.querySelector('.calc-resultado--dinheiro')?.textContent?.trim()).toBe('$ 61.250');
  });

  it('Limpar volta a aba ao preset padrão e re-preenche o bônus (não zera — m1-19)', async () => {
    const { fixture, raiz } = await montar();
    const mediaPrestigio = raiz.querySelectorAll('.calc-config .stepper__valor')[1] as HTMLInputElement;
    mediaPrestigio.value = '40';
    mediaPrestigio.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(raiz.querySelector('.calc-resultado--dinheiro')?.textContent?.trim()).not.toBe('$ 9.000');

    // Limpar em duas etapas: 1º clique arma "Tem certeza?", 2º confirma.
    const limpar = raiz.querySelector('.ajuda-limpar') as HTMLButtonElement;
    limpar.click();
    fixture.detectChanges();
    limpar.click();
    fixture.detectChanges();

    // De volta ao preset (Morte, média Nível 5, média Prestígio 10): bônus re-preenchido em
    // $ 9.000 (o auto-sync roda de novo após o reset — não fica $ 0), e a média de Prestígio em 10.
    expect(raiz.querySelector('.calc-resultado--dinheiro')?.textContent?.trim()).toBe('$ 9.000');
    expect((raiz.querySelectorAll('.calc-config .stepper__valor')[1] as HTMLInputElement).value).toBe('10');
  });

  it('preserva o estado (inclusive o Prestígio do bônus editado) ao trocar de aba e voltar (m1-17)', async () => {
    await TestBed.configureTestingModule({ imports: [NovoAgentePage] }).compileComponents();

    // Primeira visita: sobrescreve manualmente o Prestígio do bônus (3º stepper) para um valor que
    // difere do auto-preenchido — o restore não pode reintroduzir o auto-sync que o zeraria.
    const primeira = TestBed.createComponent(NovoAgentePage);
    primeira.detectChanges();
    const prestigioBonus = (primeira.nativeElement as HTMLElement).querySelectorAll(
      '.calc-config .stepper__valor',
    )[2] as HTMLInputElement;
    prestigioBonus.value = '99';
    prestigioBonus.dispatchEvent(new Event('input'));
    primeira.detectChanges();
    primeira.destroy(); // sai da aba: a rota lazy desmonta o componente.

    // Volta à aba: mesmo injector root → mesmo singleton → o Prestígio manual é restaurado (o
    // auto-sync inicial não roda quando há estado salvo).
    const segunda = TestBed.createComponent(NovoAgentePage);
    segunda.detectChanges();
    const prestigioRestaurado = (segunda.nativeElement as HTMLElement).querySelectorAll(
      '.calc-config .stepper__valor',
    )[2] as HTMLInputElement;
    expect(prestigioRestaurado.value).toBe('99');
  });
});
