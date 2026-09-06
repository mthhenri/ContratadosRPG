import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Segmentado } from './segmentado.component';
import { SegmentadoItem } from './segmentado-item.component';

/**
 * Prova o papel ARIA (`group`/`aria-pressed`, diferente de `app-abas`), a classe de estado ativo
 * e o suporte a item desabilitado — os três contratos reais (Caderno, Leitor de Documentos,
 * Inventário da ficha) auditados em `P-056`. A seleção continua do consumidor: `(click)` chama o
 * mesmo método que já existia antes da migração.
 */
@Component({
  imports: [Segmentado, SegmentadoItem],
  template: `
    <app-segmentado rotulo="Modo de teste">
      <button app-segmentado-item [ativo]="modo() === 'a'" (click)="selecionar('a')">A</button>
      <button app-segmentado-item [ativo]="modo() === 'b'" (click)="selecionar('b')">B</button>
      <button app-segmentado-item [ativo]="modo() === 'c'" [desabilitado]="true">C</button>
    </app-segmentado>
  `,
})
class Hospedeiro {
  readonly modo = signal('a');

  selecionar(valor: string): void {
    this.modo.set(valor);
  }
}

describe('Segmentado', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function raiz(fixture: ReturnType<typeof montar>) {
    return fixture.nativeElement as HTMLElement;
  }

  function botoes(fixture: ReturnType<typeof montar>) {
    return Array.from(
      raiz(fixture).querySelectorAll<HTMLButtonElement>('button[app-segmentado-item]'),
    );
  }

  it('marca o container como group com o rótulo informado (não tablist)', () => {
    const container = raiz(montar()).querySelector('app-segmentado') as HTMLElement;

    expect(container.getAttribute('role')).toBe('group');
    expect(container.getAttribute('aria-label')).toBe('Modo de teste');
  });

  it('marca só o item ativo com aria-pressed/classe de estado', () => {
    const [a, b] = botoes(montar());

    expect(a.getAttribute('aria-pressed')).toBe('true');
    expect(a.classList.contains('segmentado__item--ativo')).toBe(true);

    expect(b.getAttribute('aria-pressed')).toBe('false');
    expect(b.classList.contains('segmentado__item--ativo')).toBe(false);
  });

  it('troca a seleção pelo (click) do consumidor, não por lógica própria', () => {
    const fixture = montar();
    const [, b] = botoes(fixture);

    b.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.modo()).toBe('b');
    expect(botoes(fixture)[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('desabilita o item sem removê-lo do grupo', () => {
    const [, , c] = botoes(montar());

    expect(c.disabled).toBe(true);
  });
});
