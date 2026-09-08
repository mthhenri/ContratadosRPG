import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ColunaAcoes } from './coluna-acoes.component';
import { ColunaAcoesItem } from './coluna-acoes-item.component';

@Component({
  imports: [ColunaAcoes, ColunaAcoesItem],
  template: `
    <app-coluna-acoes id="teste-coluna" rotulo="Ações da campanha">
      <button app-coluna-acoes-item icone="olho" [ativo]="true" appTooltip="Membros">Membros</button>
      <button app-coluna-acoes-item icone="convite" [contagem]="3" appTooltip="Convites">Convites</button>
    </app-coluna-acoes>
  `,
})
class HospedeiroTeste {}

/**
 * Prova `app-coluna-acoes`/`app-coluna-acoes-item`
 * (`campanha-detalhe-mestre-coluna-acoes.spec.md`, entregável 2): retração padrão, persistência
 * do estado expandido em `localStorage`, e reflexo de `[ativo]`/`[contagem]` nos itens.
 */
describe('ColunaAcoes', () => {
  let fixture: ComponentFixture<HospedeiroTeste>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HospedeiroTeste] });
    fixture = TestBed.createComponent(HospedeiroTeste);
    fixture.detectChanges();
  });

  it('nasce retraída por padrão (sem estado persistido)', () => {
    const host = fixture.debugElement.query(By.directive(ColunaAcoes));
    expect(host.nativeElement.classList.contains('coluna-acoes--expandida')).toBe(false);
  });

  it('expande ao clicar no botão de alternar e persiste em localStorage', () => {
    const botaoAlternar = fixture.debugElement.query(
      By.css('.coluna-acoes__alternar'),
    ).nativeElement as HTMLButtonElement;
    botaoAlternar.click();
    fixture.detectChanges();

    const host = fixture.debugElement.query(By.directive(ColunaAcoes));
    expect(host.nativeElement.classList.contains('coluna-acoes--expandida')).toBe(true);
    expect(localStorage.getItem('contratados-rpg:coluna-acoes:teste-coluna')).toBe('true');
  });

  it('restaura o estado expandido persistido ao recriar', () => {
    localStorage.setItem('contratados-rpg:coluna-acoes:teste-coluna', 'true');
    const outraFixture = TestBed.createComponent(HospedeiroTeste);
    outraFixture.detectChanges();

    const host = outraFixture.debugElement.query(By.directive(ColunaAcoes));
    expect(host.nativeElement.classList.contains('coluna-acoes--expandida')).toBe(true);
  });

  it('reflete [ativo] e [contagem] nos itens', () => {
    const itens = fixture.debugElement.queryAll(By.directive(ColunaAcoesItem));
    expect(itens[0].nativeElement.getAttribute('aria-current')).toBe('page');
    expect(
      itens[1].nativeElement.querySelector('.coluna-acoes__item-contagem')?.textContent?.trim(),
    ).toBe('3');
  });

  it('aria-label do nav reflete [rotulo]', () => {
    const host = fixture.debugElement.query(By.directive(ColunaAcoes));
    expect(host.nativeElement.getAttribute('aria-label')).toBe('Ações da campanha');
  });
});
