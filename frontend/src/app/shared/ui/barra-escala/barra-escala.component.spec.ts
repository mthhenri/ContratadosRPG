import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BarraEscala } from './barra-escala.component';

@Component({
  imports: [BarraEscala],
  template: `<app-barra-escala
    rotulo="Cooperação"
    [valor]="valor()"
    [minimo]="0"
    [maximo]="10"
    [passo]="passo()"
    [editavel]="editavel()"
    [desabilitado]="desabilitado()"
    corInicio="var(--vida)"
    [corMeio]="corMeio()"
    corFim="var(--positive)"
    textoValor="Neutro"
    descricao="Confirma ou nega."
    [marcadores]="[0, 1, 2, 4, 7, 10]"
    (valorConfirmado)="confirmados.push($event)"
  />`,
})
class Hospedeiro {
  readonly valor = signal(5);
  readonly passo = signal(1);
  readonly editavel = signal(false);
  readonly desabilitado = signal(false);
  readonly corMeio = signal<string | null>('var(--warning)');
  readonly confirmados: number[] = [];
}

/** Consumidor com textos derivados do valor (faixas). */
@Component({
  imports: [BarraEscala],
  template: `<app-barra-escala
    rotulo="Escala"
    [valor]="2"
    [editavel]="true"
    corInicio="var(--vida)"
    corFim="var(--positive)"
    [textoValor]="faixa"
    [descricao]="frase"
  />`,
})
class HospedeiroComFuncao {
  readonly faixa = (valor: number) => (valor >= 5 ? 'alto' : 'baixo');
  readonly frase = (valor: number) => `posição ${valor}`;
}

describe('BarraEscala', () => {
  function montar(configurar?: (hospedeiro: Hospedeiro) => void) {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    configurar?.(fixture.componentInstance);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return { fixture, raiz, hospedeiro: fixture.componentInstance };
  }

  const cursor = (raiz: HTMLElement) =>
    raiz.querySelector<HTMLElement>('.barra-escala__cursor')!.style.left;
  const entrada = (raiz: HTMLElement) =>
    raiz.querySelector<HTMLInputElement>('input[type="range"]')!;

  function mover(raiz: HTMLElement, valor: number) {
    entrada(raiz).value = String(valor);
    entrada(raiz).dispatchEvent(new Event('input'));
  }

  it.each([
    [0, '0%'],
    [1, '10%'],
    [2, '20%'],
    [4, '40%'],
    [7, '70%'],
    [10, '100%'],
  ])('posiciona o marcador de %s em %s', (valor, esperado) => {
    const { raiz } = montar((hospedeiro) => hospedeiro.valor.set(valor));
    expect(cursor(raiz)).toBe(esperado);
    expect(raiz.querySelector('.barra-escala__numero')?.textContent?.trim()).toBe(String(valor));
  });

  it('valor fora dos limites prende o marcador na borda, mas mostra o número recebido', () => {
    const { raiz } = montar((hospedeiro) => hospedeiro.valor.set(15));
    expect(cursor(raiz)).toBe('100%');
    expect(raiz.querySelector('.barra-escala__numero')?.textContent?.trim()).toBe('15');
  });

  it('somente leitura é um meter com valor, limites e texto acessível; sem slider', () => {
    const { raiz } = montar();
    const medidor = raiz.querySelector('[role="meter"]')!;
    expect(medidor.getAttribute('aria-label')).toBe('Cooperação');
    expect(medidor.getAttribute('aria-valuemin')).toBe('0');
    expect(medidor.getAttribute('aria-valuemax')).toBe('10');
    expect(medidor.getAttribute('aria-valuenow')).toBe('5');
    expect(medidor.getAttribute('aria-valuetext')).toBe('5 de 10 — Neutro — Confirma ou nega.');
    expect(raiz.querySelector('input')).toBeNull();
  });

  it('desenha ticks só nos marcadores internos (os extremos já são a borda)', () => {
    const { raiz } = montar();
    const ticks = Array.from(raiz.querySelectorAll<HTMLElement>('.barra-escala__tick'));
    expect(ticks.map((tick) => tick.style.left)).toEqual(['10%', '20%', '40%', '70%']);
  });

  it('degradê usa as cores recebidas, com e sem a parada do meio', () => {
    const { raiz, fixture, hospedeiro } = montar();
    const caixa = raiz.querySelector<HTMLElement>('.barra-escala')!;
    expect(caixa.style.getPropertyValue('--barra-escala-degrade')).toBe(
      'linear-gradient(to right, var(--vida), var(--warning), var(--positive))',
    );
    hospedeiro.corMeio.set(null);
    fixture.detectChanges();
    expect(caixa.style.getPropertyValue('--barra-escala-degrade')).toBe(
      'linear-gradient(to right, var(--vida), var(--positive))',
    );
  });

  it('editável é um slider nativo com rótulo e texto acessível', () => {
    const { raiz } = montar((hospedeiro) => hospedeiro.editavel.set(true));
    const slider = entrada(raiz);
    expect(slider.getAttribute('aria-label')).toBe('Cooperação');
    expect(slider.getAttribute('aria-valuetext')).toBe('5 de 10 — Neutro — Confirma ou nega.');
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('10');
    expect(raiz.querySelector('[role="meter"]')).toBeNull();
  });

  it('arrastar só move o rascunho; confirma uma vez ao soltar, mesmo com o blur depois', () => {
    const { raiz, fixture, hospedeiro } = montar((hospedeiro) => hospedeiro.editavel.set(true));
    mover(raiz, 6);
    mover(raiz, 7);
    mover(raiz, 8);
    fixture.detectChanges();
    expect(hospedeiro.confirmados).toEqual([]);
    expect(cursor(raiz)).toBe('80%');
    entrada(raiz).dispatchEvent(new Event('pointerup'));
    entrada(raiz).dispatchEvent(new Event('blur'));
    expect(hospedeiro.confirmados).toEqual([8]);
  });

  it('teclado: passos repetidos não emitem; Enter confirma o valor final', () => {
    const { raiz, hospedeiro } = montar((hospedeiro) => hospedeiro.editavel.set(true));
    for (const valor of [6, 7, 8, 9]) mover(raiz, valor);
    expect(hospedeiro.confirmados).toEqual([]);
    entrada(raiz).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(hospedeiro.confirmados).toEqual([9]);
  });

  it('texto e descrição em função do valor acompanham o rascunho durante o arrasto', () => {
    TestBed.configureTestingModule({ imports: [HospedeiroComFuncao] });
    const fixture = TestBed.createComponent(HospedeiroComFuncao);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.barra-escala__texto')?.textContent?.trim()).toBe('baixo');
    mover(raiz, 8);
    fixture.detectChanges();
    expect(raiz.querySelector('.barra-escala__texto')?.textContent?.trim()).toBe('alto');
    expect(entrada(raiz).getAttribute('aria-valuetext')).toBe('8 de 10 — alto — posição 8');
  });

  it('Esc restaura o valor recebido sem emitir', () => {
    const { raiz, fixture, hospedeiro } = montar((hospedeiro) => hospedeiro.editavel.set(true));
    mover(raiz, 9);
    entrada(raiz).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    entrada(raiz).dispatchEvent(new Event('blur'));
    expect(hospedeiro.confirmados).toEqual([]);
    expect(entrada(raiz).value).toBe('5');
    expect(cursor(raiz)).toBe('50%');
  });

  it('confirmar sem mudança não emite', () => {
    const { raiz, hospedeiro } = montar((hospedeiro) => hospedeiro.editavel.set(true));
    entrada(raiz).dispatchEvent(new Event('pointerup'));
    expect(hospedeiro.confirmados).toEqual([]);
  });

  it('arredonda ao passo e aos limites', () => {
    const { raiz, fixture, hospedeiro } = montar((hospedeiro) => {
      hospedeiro.editavel.set(true);
      hospedeiro.passo.set(2);
    });
    const componente = fixture.debugElement.children[0].componentInstance as BarraEscala;
    expect(componente.arredondar(5)).toBe(6);
    expect(componente.arredondar(-3)).toBe(0);
    expect(componente.arredondar(14)).toBe(10);
    mover(raiz, 3);
    entrada(raiz).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(hospedeiro.confirmados).toEqual([4]);
  });

  it('descartar() devolve o trilho ao valor recebido e libera reemitir o mesmo valor', () => {
    const { raiz, fixture, hospedeiro } = montar((hospedeiro) => hospedeiro.editavel.set(true));
    const componente = fixture.debugElement.children[0].componentInstance as BarraEscala;
    mover(raiz, 9);
    entrada(raiz).dispatchEvent(new Event('pointerup'));
    componente.descartar();
    fixture.detectChanges();
    expect(cursor(raiz)).toBe('50%');
    expect(entrada(raiz).value).toBe('5');
    mover(raiz, 9);
    entrada(raiz).dispatchEvent(new Event('pointerup'));
    expect(hospedeiro.confirmados).toEqual([9, 9]);
  });

  it('desabilitado não confirma, e sair do estado ocupado ressincroniza o rascunho', () => {
    const { raiz, fixture, hospedeiro } = montar((hospedeiro) => hospedeiro.editavel.set(true));
    mover(raiz, 8);
    entrada(raiz).dispatchEvent(new Event('pointerup'));
    expect(hospedeiro.confirmados).toEqual([8]);
    // O consumidor salvou e falhou: ocupa e libera sem trocar o valor.
    hospedeiro.desabilitado.set(true);
    fixture.detectChanges();
    expect(entrada(raiz).disabled).toBe(true);
    entrada(raiz).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    hospedeiro.desabilitado.set(false);
    fixture.detectChanges();
    expect(hospedeiro.confirmados).toEqual([8]);
    expect(cursor(raiz)).toBe('50%');
    // Uma nova tentativa com o mesmo valor volta a emitir.
    mover(raiz, 8);
    entrada(raiz).dispatchEvent(new Event('pointerup'));
    expect(hospedeiro.confirmados).toEqual([8, 8]);
  });
});
