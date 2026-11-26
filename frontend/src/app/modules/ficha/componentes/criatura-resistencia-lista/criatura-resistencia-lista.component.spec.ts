import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaResistenciaDto } from '@contratados-rpg/shared/dtos/ficha';

import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { CriaturaResistenciaLista } from './criatura-resistencia-lista.component';

describe('CriaturaResistenciaLista', () => {
  const itens: FichaCriaturaResistenciaDto[] = [
    { tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 10 },
  ];

  interface Opcoes {
    readonly editavel?: boolean;
    readonly itens?: readonly FichaCriaturaResistenciaDto[];
    readonly variante?: 'resistencia' | 'fraqueza';
    readonly limite?: number | null;
    readonly minimo?: number | null;
  }

  function montar(opcoes: Opcoes = {}) {
    TestBed.configureTestingModule({ imports: [CriaturaResistenciaLista] });
    const fixture = TestBed.createComponent(CriaturaResistenciaLista);
    const variante = opcoes.variante ?? 'resistencia';
    fixture.componentRef.setInput('itens', opcoes.itens ?? itens);
    fixture.componentRef.setInput('titulo', variante === 'fraqueza' ? 'Fraquezas' : 'Resistências');
    fixture.componentRef.setInput('editavel', opcoes.editavel ?? true);
    fixture.componentRef.setInput('variante', variante);
    fixture.componentRef.setInput('limite', opcoes.limite ?? null);
    fixture.componentRef.setInput('minimo', opcoes.minimo ?? null);
    fixture.detectChanges();
    const emitidos: (readonly FichaCriaturaResistenciaDto[])[] = [];
    fixture.componentInstance.itensMudou.subscribe((e) => emitidos.push(e));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('mostra o tipo abreviado no selo, com o nome inteiro no rótulo acessível', () => {
    const { raiz } = montar({ editavel: false });
    const selo = raiz.querySelector('.resistencia-lista__grade-item')!;
    expect(selo.tagName).toBe('SPAN');
    expect(selo.querySelector('.resistencia-lista__grade-tipo')?.textContent?.trim()).toBe('Balíst.');
    expect(selo.getAttribute('aria-label')).toBe('Balístico, 10');
    expect(selo.querySelector('.resistencia-lista__grade-valor')?.textContent?.trim()).toBe('10');
  });

  it('na variante lista, o item sem subtipo mostra o próprio tipo como texto principal', () => {
    const { raiz } = montar({ editavel: false, variante: 'fraqueza' });
    expect(raiz.querySelector('.resistencia-lista__tipo')).toBeNull();
    expect(raiz.querySelector('.resistencia-lista__subtipo')?.textContent?.trim()).toBe('Balístico');
    expect(raiz.querySelector('.resistencia-lista__valor')?.textContent?.trim()).toBe('+10');
  });

  it('na variante lista, o item com subtipo mostra tipo em cima e subtipo como texto principal', () => {
    const { raiz } = montar({
      editavel: false,
      variante: 'fraqueza',
      itens: [{ tipo: TipoDanoEnum.EXPLOSAO, subtipo: 'Concussivo', valor: 20 }],
    });
    expect(raiz.querySelector('.resistencia-lista__tipo')?.textContent?.trim()).toBe('Explosão');
    expect(raiz.querySelector('.resistencia-lista__subtipo')?.textContent?.trim()).toBe('Concussivo');
  });

  it('sem modo de edição: o selo editável é um botão que abre a caixa dele, com Remover dentro', () => {
    const { fixture, raiz } = montar();
    expect(raiz.querySelector('[aria-label="Editar itens"]')).toBeNull();

    const selo = raiz.querySelector<HTMLButtonElement>('button.resistencia-lista__grade-item')!;
    expect(selo.getAttribute('aria-label')).toBe('Alterar Balístico, 10');
    selo.click();
    fixture.detectChanges();

    const caixa = raiz.querySelector('.resistencia-lista__caixa')!;
    expect(fixture.componentInstance['itemForm'].getRawValue()).toEqual({ tipo: TipoDanoEnum.BALISTICO, subtipo: '', valor: 10 });
    expect(Array.from(caixa.querySelectorAll('button')).map((b) => b.textContent?.trim()).slice(-3)).toEqual([
      'Remover',
      'Cancelar',
      'Salvar',
    ]);
    expect(caixa.querySelector('app-segmentado')?.getAttribute('aria-label')).toBe('Tipo de dano');
    expect(caixa.querySelector('select')).toBeNull();
  });

  it('caixa nova não tem Remover; o segmentado escolhe o tipo', () => {
    const { fixture, raiz } = montar();
    fixture.componentInstance['adicionar']();
    fixture.detectChanges();

    const caixa = raiz.querySelector('.resistencia-lista__caixa--nova')!;
    expect(Array.from(caixa.querySelectorAll('button')).map((b) => b.textContent?.trim())).not.toContain('Remover');
    Array.from(caixa.querySelectorAll<HTMLButtonElement>('.segmentado__item'))
      .find((b) => b.textContent?.trim() === 'Geral')!
      .click();
    expect(fixture.componentInstance['itemForm'].controls.tipo.value).toBe(TipoDanoEnum.GERAL);
  });

  it('mostra o orçamento usado / limite e avisa quando passa (Geral conta 2×)', () => {
    const { raiz } = montar({
      limite: 40,
      itens: [
        { tipo: TipoDanoEnum.FISICO, subtipo: null, valor: 30 },
        { tipo: TipoDanoEnum.GERAL, subtipo: null, valor: 10 },
      ],
    });
    const orcamento = raiz.querySelector('.resistencia-lista__orcamento')!;
    expect(orcamento.textContent?.trim()).toBe('50 / 40 pts');
    expect(orcamento.classList).toContain('resistencia-lista__orcamento--excedido');
    expect(raiz.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Passa 10 pts do limite — a ficha não salva até ajustar.',
    );
  });

  it('a caixa mostra o custo ao vivo e quanto sobra, descontando o próprio item ao alterar', () => {
    const { fixture, raiz } = montar({ limite: 90, itens: [{ tipo: TipoDanoEnum.FISICO, subtipo: null, valor: 30 }] });
    raiz.querySelector<HTMLButtonElement>('button.resistencia-lista__grade-item')!.click();
    fixture.detectChanges();
    const ajuda = () => raiz.querySelector('.resistencia-lista__ajuda')?.textContent?.trim();
    expect(ajuda()).toBe('Custa 30 pts · sobram 60 de 90');

    Array.from(raiz.querySelectorAll<HTMLButtonElement>('.segmentado__item'))
      .find((b) => b.textContent?.trim() === 'Geral')!
      .click();
    const valor = raiz.querySelector<HTMLInputElement>('input[formcontrolname="valor"]')!;
    valor.value = '50';
    valor.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(ajuda()).toBe('Custa 100 pts (Geral conta 2×) · passa 10 do limite de 90');
    expect(raiz.querySelector('.resistencia-lista__ajuda')?.classList).toContain('resistencia-lista__ajuda--alerta');
  });

  it('nas Fraquezas mostra o mínimo e marca a que está abaixo', () => {
    const { raiz } = montar({
      variante: 'fraqueza',
      minimo: 30,
      itens: [
        { tipo: TipoDanoEnum.GERAL, subtipo: 'Chumbo', valor: 30 },
        { tipo: TipoDanoEnum.QUIMICO, subtipo: null, valor: 10 },
      ],
    });
    expect(raiz.querySelector('.resistencia-lista__orcamento')?.textContent?.trim()).toBe('mín. 30');
    const selos = Array.from(raiz.querySelectorAll('.resistencia-lista__item'));
    expect(selos.map((s) => s.classList.contains('resistencia-lista__item--abaixo'))).toEqual([false, true]);
    expect(raiz.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Fraqueza abaixo do mínimo (30) — a ficha não salva até ajustar.',
    );
  });

  it('adiciona um item e emite a lista inteira', () => {
    const alvo = montar();
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['itemForm'].setValue({ tipo: TipoDanoEnum.QUIMICO, subtipo: '', valor: 5 });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0]).toEqual([...itens, { tipo: TipoDanoEnum.QUIMICO, subtipo: null, valor: 5 }]);
  });

  it('Remover pede confirmação via ConfirmacaoService (ui-15/P-069) e só remove se confirmar', async () => {
    const alvo = montar();
    const confirmar = vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(true);

    await alvo.fixture.componentInstance['remover'](0);

    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ severidade: 'perigo', entidade: TipoDanoEnum.BALISTICO }),
    );
    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0]).toEqual([]);
  });

  it('cancelar a confirmação não remove nem emite', async () => {
    const alvo = montar();
    vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(false);

    await alvo.fixture.componentInstance['remover'](0);

    expect(alvo.emitidos).toHaveLength(0);
  });
});
