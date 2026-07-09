import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import type { OpcoesFichaInicial } from '../../ficha-padrao';

import { FichaCriarDialog } from './ficha-criar-dialog.component';

/**
 * Prova o assistente de criação (m3-16): coleta as escolhas cruciais, aplica limites da classe e o
 * bônus fixo de arquétipo (na Maestria) e emite as escolhas base ao confirmar.
 */
describe('FichaCriarDialog', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [FichaCriarDialog] });
    const fixture = TestBed.createComponent(FichaCriarDialog);
    const componente = fixture.componentInstance;
    const criado: OpcoesFichaInicial[] = [];
    const cancelado = vi.fn();
    fixture.componentRef.instance.criar.subscribe((op: OpcoesFichaInicial) => criado.push(op));
    fixture.componentRef.instance.cancelar.subscribe(() => cancelado());
    fixture.detectChanges();
    return { fixture, componente, raiz: fixture.nativeElement as HTMLElement, criado, cancelado };
  }

  /** Muda um `<select>` por seletor e dispara o evento de mudança. */
  function selecionar(raiz: HTMLElement, seletor: string, valor: string): void {
    const select = raiz.querySelector(seletor) as HTMLSelectElement;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  }

  it('confirma emitindo as escolhas base (padrão: Combatente, nível 0, atributos base)', () => {
    const { fixture, raiz, criado } = montar();
    (raiz.querySelector('.botao--primario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(criado).toHaveLength(1);
    expect(criado[0]).toMatchObject({
      classe: ClasseEnum.COMBATENTE,
      arquetipo: null,
      nivel: 0,
      prestigio: 0,
      maestria: null,
    });
    expect(criado[0].atributos.forca).toBe(1);
  });

  it('trocar para Civil reclampa atributos/nível e oculta o arquétipo', () => {
    const { fixture, componente, raiz } = montar();
    // Sobe Vigor além do teto do Civil.
    for (let i = 0; i < 6; i++) {
      componente['passoAtributo']('vigor', 1);
    }
    fixture.detectChanges();

    selecionar(raiz, '#criar-classe', ClasseEnum.CIVIL);
    fixture.detectChanges();

    // Sem segundo select de arquétipo, e o Vigor foi reclampado ao teto 3 do Civil.
    expect(raiz.querySelector('#criar-arquetipo')).toBeNull();
    expect(componente['atributos']()['vigor']).toBe(3);
  });

  it('mostra o bônus do arquétipo e habilita a Maestria pelo total (base + bônus)', () => {
    const { fixture, componente, raiz } = montar();
    selecionar(raiz, '#criar-classe', ClasseEnum.COMBATENTE);
    selecionar(raiz, '#criar-arquetipo', ArquetipoEnum.LUTADOR);
    // Base 5 de Força; Lutador soma +1 → total 6, habilita a Maestria.
    for (let i = 0; i < 4; i++) {
      componente['passoAtributo']('forca', 1);
    }
    fixture.detectChanges();

    expect(raiz.querySelector('.criar__bonus')?.textContent).toContain('FOR');
    expect(componente['maestriaHabilitada']('forca')).toBe(true);

    componente['alternarMaestria']('forca');
    fixture.detectChanges();
    (raiz.querySelector('.botao--primario') as HTMLButtonElement).click();
    // Emite Força base 5 (o bônus é reaplicado na montagem) e a Maestria em Força.
    // (a validação do total 6+ acontece em construirFichaInicial)
    expect(componente['maestria']()).toBe('forca');
  });

  it('reduzir o atributo com Maestria abaixo de 6 (total) a limpa', () => {
    const { fixture, componente } = montar();
    for (let i = 0; i < 5; i++) {
      componente['passoAtributo']('vigor', 1); // total 6
    }
    componente['alternarMaestria']('vigor');
    expect(componente['maestria']()).toBe('vigor');

    componente['passoAtributo']('vigor', -1); // total 5 → Maestria some
    fixture.detectChanges();
    expect(componente['maestria']()).toBeNull();
  });

  it('cancelar emite o fechamento', () => {
    const { raiz, cancelado } = montar();
    (raiz.querySelector('.botao--secundario') as HTMLButtonElement).click();
    expect(cancelado).toHaveBeenCalled();
  });
});
