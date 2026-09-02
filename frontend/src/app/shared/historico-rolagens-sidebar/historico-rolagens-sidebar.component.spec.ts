import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';

import { HistoricoRolagensSidebar } from './historico-rolagens-sidebar.component';

function criarItem(sobrescritas: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
  return {
    id: 1,
    fichaId: 3,
    encontroCombatenteId: null,
    campanhaId: 5,
    usuarioId: 1,
    nomeAutor: 'Agente',
    nomeFicha: 'Ficha',
    rotulo: 'Dano',
    formula: '2d6+3[Físico]',
    visibilidade: RolagemVisibilidadeEnum.PUBLICA,
    resultado: { dados: [], atributos: [], constante: 3, total: 9 },
    createdDate: new Date().toISOString(),
    corFicha: null,
    ...sobrescritas,
  };
}

describe('HistoricoRolagensSidebar', () => {
  let fixture: ComponentFixture<HistoricoRolagensSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricoRolagensSidebar],
    }).compileComponents();
    fixture = TestBed.createComponent(HistoricoRolagensSidebar);
    fixture.componentRef.setInput('itens', []);
    fixture.detectChanges();
  });

  it('expõe o gatilho no contrato compartilhado sem reservar a calculadora por padrão', () => {
    const gatilho = obterGatilho();

    expect(gatilho.classList).toContain('utilitario-flutuante');
    expect(gatilho.classList).toContain('utilitario-flutuante--historico');
    expect(gatilho.classList).toContain('utilitario-flutuante--inline-mobile');
    expect(gatilho.classList).not.toContain('utilitario-flutuante--acima');
  });

  it('traduz acimaDaCalculadora no modificador compartilhado e preserva o modificador legado', () => {
    fixture.componentRef.setInput('acimaDaCalculadora', true);
    fixture.detectChanges();

    const gatilho = obterGatilho();
    expect(gatilho.classList).toContain('utilitario-flutuante--acima');
    expect(gatilho.classList).toContain('historico-rolagens__gatilho--empilhado');
  });

  it('mostra o esqueleto de carregamento (ui-14) em vez de um texto solto', () => {
    fixture.componentRef.setInput('carregando', true);
    obterGatilho().click();
    fixture.detectChanges();

    const painel = fixture.nativeElement as HTMLElement;
    expect(painel.querySelector('.historico-rolagens__esqueleto')).not.toBeNull();
    expect(painel.querySelectorAll('.historico-rolagens__esqueleto-item').length).toBe(3);
    expect(painel.querySelector('app-estado-vazio')).toBeNull();
  });

  it('mostra o estado vazio (ui-14) quando não há rolagens e o carregamento terminou', () => {
    obterGatilho().click();
    fixture.detectChanges();

    const painel = fixture.nativeElement as HTMLElement;
    const estadoVazio = painel.querySelector('app-estado-vazio');
    expect(estadoVazio).not.toBeNull();
    expect(estadoVazio?.querySelector('.estado-vazio__titulo')?.textContent?.trim()).toBe(
      'Nenhuma rolagem ainda.',
    );
    expect(painel.querySelector('.historico-rolagens__esqueleto')).toBeNull();
  });

  it('mostra a expressão da rolagem como legenda discreta abaixo do rótulo', () => {
    fixture.componentRef.setInput('itens', [criarItem({ formula: '2d6+3[Físico]' })]);
    obterGatilho().click();
    fixture.detectChanges();

    const formula = (fixture.nativeElement as HTMLElement).querySelector(
      '.historico-rolagens__formula',
    );
    expect(formula?.textContent?.trim()).toBe('2d6+3[Físico]');
  });

  it('omite a legenda de expressão no teste de Atributo direto (formula nula)', () => {
    fixture.componentRef.setInput('itens', [criarItem({ rotulo: 'Luta', formula: null })]);
    obterGatilho().click();
    fixture.detectChanges();

    const painel = fixture.nativeElement as HTMLElement;
    expect(painel.querySelector('.historico-rolagens__formula')).toBeNull();
  });

  function obterGatilho(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '.historico-rolagens__gatilho',
    ) as HTMLButtonElement;
  }
});
