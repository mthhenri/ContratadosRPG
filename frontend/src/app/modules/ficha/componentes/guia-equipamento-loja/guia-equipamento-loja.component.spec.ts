import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';
import type { CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';

import { GuiaEquipamentoLoja } from './guia-equipamento-loja.component';

describe('GuiaEquipamentoLoja', () => {
  function montar(itens: readonly CarrinhoItemDto[] = []) {
    TestBed.configureTestingModule({ imports: [GuiaEquipamentoLoja] });
    const fixture = TestBed.createComponent(GuiaEquipamentoLoja);
    fixture.componentRef.setInput('itens', itens);
    fixture.detectChanges();
    const emitidos: (readonly CarrinhoItemDto[])[] = [];
    fixture.componentInstance.itensMudaram.subscribe((e) => emitidos.push(e));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('a busca de item vem antes das categorias no DOM (m3-74 follow-up)', () => {
    const { raiz } = montar();
    const secao = raiz.querySelector('.loja__catalogo') as HTMLElement;
    const filhos = Array.from(secao.children).map((el) => el.className);
    expect(filhos.indexOf('loja__busca')).toBeLessThan(filhos.indexOf('loja__categorias'));
  });

  it('cada aba de categoria usa o app-icone correto (não o emoji cru)', () => {
    const { fixture, raiz } = montar();
    const abas = Array.from(raiz.querySelectorAll<HTMLElement>('.loja__categoria'));
    expect(abas.length).toBeGreaterThan(0);
    for (const aba of abas) {
      expect(aba.querySelector('app-icone')).not.toBeNull();
      expect(aba.querySelector('span[aria-hidden="true"]')).toBeNull();
    }
    const iconesCategoria = fixture.componentInstance['iconesCategoria'];
    expect(iconesCategoria[ItemCategoriaEnum.CORPO_A_CORPO]).toBe('corpo-a-corpo');
    expect(iconesCategoria[ItemCategoriaEnum.EXPLOSIVOS]).toBe('explosivos');
    expect(iconesCategoria[ItemCategoriaEnum.ARMAS_DE_FOGO]).toBe('armas-de-fogo');
  });

  it('busca cruza todas as categorias, não só a aba ativa, e desativa as abas', () => {
    const { fixture, raiz } = montar();
    // categoria ativa por padrão é Corpo a Corpo; "Pistola" é de Armas de Fogo.
    const campoBusca = raiz.querySelector<HTMLInputElement>('.loja__busca-campo')!;
    campoBusca.value = 'Pistola';
    campoBusca.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const nomes = Array.from(raiz.querySelectorAll('.loja__item-nome')).map((n) => n.textContent?.trim());
    expect(nomes).toContain('Pistola');

    const abas = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.loja__categoria'));
    expect(abas.every((aba) => aba.disabled)).toBe(true);
    expect(raiz.querySelector('.loja__categoria--ativa')).toBeNull();
  });

  it('adicionar um resultado de busca cruzada grava a categoria certa do item, não a aba ativa', () => {
    const { fixture, raiz, emitidos } = montar();
    const campoBusca = raiz.querySelector<HTMLInputElement>('.loja__busca-campo')!;
    campoBusca.value = 'Pistola';
    campoBusca.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const botaoAdicionar = raiz.querySelector<HTMLButtonElement>('[aria-label="Adicionar Pistola ao kit"]')!;
    botaoAdicionar.click();

    expect(emitidos[0]).toHaveLength(1);
    expect(emitidos[0][0].nome).toBe('Pistola');
    expect(emitidos[0][0].categoria).toBe(ItemCategoriaEnum.ARMAS_DE_FOGO);
  });
});
