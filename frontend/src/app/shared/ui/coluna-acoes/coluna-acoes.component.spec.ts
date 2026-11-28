import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ColunaAcoes, reiniciarColunaAcoesParaTeste } from './coluna-acoes.component';
import { ColunaAcoesItem } from './coluna-acoes-item.component';
import { Icone } from '../../icone/icone.component';

@Component({
  imports: [ColunaAcoes, ColunaAcoesItem],
  template: `
    <app-coluna-acoes id="teste-coluna" rotulo="Ações da campanha">
      <button app-coluna-acoes-item icone="olho" [ativo]="true" appTooltip="Membros">Membros</button>
      <button app-coluna-acoes-item icone="convite" [contagem]="3" appTooltip="Convites">Convites</button>
      <button app-coluna-acoes-item icone="editar" [pressionado]="true" appTooltip="Editar">Editar</button>
      <button app-coluna-acoes-item icone="mais" [pressionado]="false" appTooltip="Adicionar">Adicionar</button>
    </app-coluna-acoes>
  `,
})
class HospedeiroTeste {}

/** Uma segunda tela, com outro `[id]` — a barra precisa acompanhar a primeira (ui-43). */
@Component({
  imports: [ColunaAcoes, ColunaAcoesItem],
  template: `
    <app-coluna-acoes id="outra-tela" rotulo="Ações da cena">
      <button app-coluna-acoes-item icone="caderno">Caderno</button>
    </app-coluna-acoes>
  `,
})
class OutraTelaTeste {}

/**
 * Prova `app-coluna-acoes`/`app-coluna-acoes-item`
 * (`campanha-detalhe-mestre-coluna-acoes.spec.md`, entregável 2): retração padrão, persistência
 * do estado expandido em `localStorage`, e reflexo de `[ativo]`/`[contagem]` nos itens.
 */
describe('ColunaAcoes', () => {
  let fixture: ComponentFixture<HospedeiroTeste>;

  beforeEach(() => {
    localStorage.clear();
    reiniciarColunaAcoesParaTeste();
    TestBed.configureTestingModule({ imports: [HospedeiroTeste, OutraTelaTeste] });
    fixture = TestBed.createComponent(HospedeiroTeste);
    fixture.detectChanges();
  });

  const expandida = (alvo: ComponentFixture<unknown>): boolean =>
    alvo.debugElement
      .query(By.directive(ColunaAcoes))
      .nativeElement.classList.contains('coluna-acoes--expandida');

  it('nasce retraída por padrão (sem estado persistido)', () => {
    expect(expandida(fixture)).toBe(false);
  });

  it('expande ao clicar no botão de alternar e persiste em localStorage', () => {
    const botaoAlternar = fixture.debugElement.query(
      By.css('.coluna-acoes__alternar'),
    ).nativeElement as HTMLButtonElement;
    botaoAlternar.click();
    fixture.detectChanges();

    expect(expandida(fixture)).toBe(true);
    expect(localStorage.getItem('contratados-rpg:coluna-acoes')).toBe('true');
  });

  it('é a mesma barra em todas as telas: abrir numa abre na outra, já viva ou nova (ui-43)', () => {
    const outraTelaViva = TestBed.createComponent(OutraTelaTeste);
    outraTelaViva.detectChanges();

    (fixture.debugElement.query(By.css('.coluna-acoes__alternar')).nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();
    outraTelaViva.detectChanges();
    expect(expandida(outraTelaViva)).toBe(true);

    // Recarregar a página: o módulo esquece, o armazenamento lembra — para qualquer `[id]`.
    reiniciarColunaAcoesParaTeste();
    const outraTelaNova = TestBed.createComponent(OutraTelaTeste);
    outraTelaNova.detectChanges();
    expect(expandida(outraTelaNova)).toBe(true);
  });

  it('sem a preferência nova, migra a antiga da tela que abre primeiro (ui-43)', () => {
    localStorage.clear();
    localStorage.setItem('contratados-rpg:coluna-acoes:outra-tela', 'true');
    reiniciarColunaAcoesParaTeste();

    const outraTela = TestBed.createComponent(OutraTelaTeste);
    outraTela.detectChanges();
    expect(expandida(outraTela)).toBe(true);
  });

  it('o botão de alternar usa o ícone de barra lateral, nunca a seta de Voltar (ui-43)', () => {
    const iconeDoBotao = (): string =>
      (
        fixture.debugElement.query(By.css('.coluna-acoes__alternar app-icone'))
          .componentInstance as Icone
      ).nome();

    expect(iconeDoBotao()).toBe('barra-lateral-expandir');
    (fixture.debugElement.query(By.css('.coluna-acoes__alternar')).nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(iconeDoBotao()).toBe('barra-lateral-recolher');
  });

  it('restaura o estado expandido persistido ao recriar', () => {
    localStorage.setItem('contratados-rpg:coluna-acoes', 'true');
    reiniciarColunaAcoesParaTeste();
    const outraFixture = TestBed.createComponent(HospedeiroTeste);
    outraFixture.detectChanges();

    expect(expandida(outraFixture)).toBe(true);
  });

  it('reflete [ativo] e [contagem] nos itens', () => {
    const itens = fixture.debugElement.queryAll(By.directive(ColunaAcoesItem));
    expect(itens[0].nativeElement.getAttribute('aria-current')).toBe('page');
    expect(
      itens[1].nativeElement.querySelector('.coluna-acoes__item-contagem')?.textContent?.trim(),
    ).toBe('3');
  });

  it('`[pressionado]` vira `aria-pressed` e destaque, sem `aria-current` de rota', () => {
    const itens = fixture.debugElement.queryAll(By.directive(ColunaAcoesItem));
    const ligado = itens[2].nativeElement as HTMLElement;
    const desligado = itens[3].nativeElement as HTMLElement;
    expect(ligado.getAttribute('aria-pressed')).toBe('true');
    expect(ligado.classList.contains('coluna-acoes__item--ativo')).toBe(true);
    expect(ligado.hasAttribute('aria-current')).toBe(false);
    expect(desligado.getAttribute('aria-pressed')).toBe('false');
    expect(desligado.classList.contains('coluna-acoes__item--ativo')).toBe(false);
    // Item comum (sem `[pressionado]`) não vira botão de alternância.
    expect(itens[1].nativeElement.hasAttribute('aria-pressed')).toBe(false);
  });

  it('aria-label do nav reflete [rotulo]', () => {
    const host = fixture.debugElement.query(By.directive(ColunaAcoes));
    expect(host.nativeElement.getAttribute('aria-label')).toBe('Ações da campanha');
  });
});
