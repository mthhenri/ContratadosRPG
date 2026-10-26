import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PainelFlutuante } from '../ui/painel-flutuante/painel-flutuante.component';

import { rolarFormula } from '@contratados-rpg/shared/regras/rolagem';

import {
  MontadorRolagem,
  type MontadorUltimaRolagem,
} from './montador-rolagem.component';

@Component({
  imports: [MontadorRolagem],
  template: `
    <app-montador-rolagem
      [(formula)]="formula"
      [atalhosDano]="atalhos()"
      [ultimaRolagem]="ultimaRolagem()"
      [atributos]="atributos"
      [proficiencia]="2"
      [nivel]="2"
      (rolar)="rolagens = rolagens + 1"
    />
  `,
})
class Hospedeiro {
  readonly formula = signal('');
  readonly atalhos = signal<{ corpo?: string | null; furtivo?: string | null }>({});
  readonly ultimaRolagem = signal<MontadorUltimaRolagem | null>(null);
  readonly atributos = { ...atributosZerados(), forca: 3, vigor: 4, luta: 4 };
  rolagens = 0;
}

function montar() {
  const fixture = TestBed.createComponent(Hospedeiro);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  raiz.querySelector<HTMLButtonElement>('.montador-rolagem__gatilho')!.click();
  fixture.detectChanges();
  const botaoPorTexto = (texto: string): HTMLButtonElement =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((botao) =>
      botao.textContent?.trim().startsWith(texto),
    )!;
  return { fixture, hospedeiro: fixture.componentInstance, raiz, botaoPorTexto };
}

/**
 * Casca das versões novas (montador-rolagem-02): o texto da barra é a única fonte de verdade, nos dois sentidos;
 * Desfazer real; estados vazia/avançada/inválida/resultado; o painel não fecha ao rolar.
 */
describe('MontadorRolagem', () => {
  it('Limpar no Teste conserva os seletores e permite montar outro teste sem digitar a fórmula', () => {
    const { fixture, hospedeiro, raiz, botaoPorTexto } = montar();
    botaoPorTexto('Teste de atributo').click();
    fixture.detectChanges();
    botaoPorTexto('Limpar').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('');
    const atributo = raiz.querySelector<HTMLSelectElement>('[aria-label="Atributo principal do teste"]')!;
    expect(atributo).not.toBeNull();
    atributo.value = 'FOR';
    atributo.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('FORd20kh1cm1 + PROF');
  });

  it('Desfazer restaura o modelo mesmo quando a troca preserva o texto', () => {
    const { fixture, hospedeiro, raiz, botaoPorTexto } = montar();
    botaoPorTexto('Dano de arma').click();
    fixture.detectChanges();
    hospedeiro.formula.set('1d6');
    fixture.detectChanges();
    botaoPorTexto('Dados livres').click();
    fixture.detectChanges();
    hospedeiro.formula.set('1d6');
    fixture.detectChanges();
    botaoPorTexto('Dano de arma').click();
    fixture.detectChanges();
    botaoPorTexto('Desfazer').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('1d6');
    expect(raiz.querySelector('[aria-label="Dados livres"]')?.getAttribute('aria-pressed')).toBe('true');
  });
  it('abrir por comando externo abre, preserva a janela aberta e restaura quando minimizada', () => {
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const montador = fixture.debugElement.query(By.directive(MontadorRolagem))
      .componentInstance as MontadorRolagem;
    const painel = fixture.debugElement.query(By.directive(PainelFlutuante))
      .componentInstance as PainelFlutuante;
    expect(painel.aberto()).toBe(false);
    montador.abrir();
    fixture.detectChanges();
    expect(painel.aberto()).toBe(true);
    montador.abrir();
    fixture.detectChanges();
    expect(painel.aberto()).toBe(true);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Minimizar Montador de rolagem"]')!.click();
    fixture.detectChanges();
    expect(painel.minimizado()).toBe(true);
    montador.abrir();
    fixture.detectChanges();
    expect(painel.aberto()).toBe(true);
    expect(painel.minimizado()).toBe(false);
  });
  it('vazia: mostra os três pontos de partida; escolher um escreve a fórmula na barra', () => {
    const { fixture, hospedeiro, raiz, botaoPorTexto } = montar();
    const receitas = Array.from(raiz.querySelectorAll('.montador-rolagem__modelo')).map((receita) => receita.textContent?.trim());
    expect(receitas).toEqual(['Teste de atributo', 'Dano de arma', 'Dados livres']);

    botaoPorTexto('Dano de arma').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('2d6 + FOR [F]');
    expect(raiz.querySelector('.montador-rolagem__receita')).toBeNull();
    expect(raiz.querySelectorAll('.montador-rolagem__modelo')).toHaveLength(3);
  });

  it('preserva as montagens ao alternar modelos e Desfazer recupera o modelo anterior', () => {
    const { fixture, hospedeiro, raiz, botaoPorTexto } = montar();
    botaoPorTexto('Dano de arma').click();
    fixture.detectChanges();
    hospedeiro.formula.set('3d8 [B]');
    fixture.detectChanges();
    botaoPorTexto('Teste de atributo').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('LUTd20kh1cm1 + PROF');
    botaoPorTexto('Dano de arma').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('3d8 [B]');
    botaoPorTexto('Desfazer').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('LUTd20kh1cm1 + PROF');
    expect(raiz.querySelector('[aria-label="Teste de atributo"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('Desfazer volta o texto anterior a cada edição do montador; Limpar também é desfeito', () => {
    const { fixture, hospedeiro, botaoPorTexto } = montar();
    const desfazer = botaoPorTexto('Desfazer');
    expect(desfazer.disabled).toBe(true);

    botaoPorTexto('Teste de atributo').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('LUTd20kh1cm1 + PROF');
    botaoPorTexto('Limpar').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('');

    botaoPorTexto('Desfazer').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('LUTd20kh1cm1 + PROF');
    botaoPorTexto('Desfazer').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('');
    expect(botaoPorTexto('Desfazer').disabled).toBe(true);
  });

  it('Maximizar ocupa a viewport e esconde a alça; Restaurar e fechar devolvem a janela ao normal', () => {
    const { fixture, raiz } = montar();
    const janela = () => document.querySelector<HTMLElement>('.painel-flutuante__janela')!;
    const botao = (rotulo: string) => document.querySelector<HTMLButtonElement>(`[aria-label="${rotulo}"]`)!;
    expect(raiz.querySelector('.montador-rolagem__redimensionar')).not.toBeNull();

    botao('Maximizar montador').click();
    fixture.detectChanges();
    expect(janela().classList).toContain('painel-flutuante__janela--maximizada');
    expect(janela().style.width).toBe(`${window.innerWidth}px`);
    expect(janela().style.height).toBe(`${window.innerHeight}px`);
    expect(raiz.querySelector('.montador-rolagem__redimensionar')).toBeNull();

    botao('Restaurar tamanho do montador').click();
    fixture.detectChanges();
    expect(janela().classList).not.toContain('painel-flutuante__janela--maximizada');
    expect(raiz.querySelector('.montador-rolagem__redimensionar')).not.toBeNull();

    botao('Maximizar montador').click();
    botao('Fechar Montador de rolagem').click();
    fixture.detectChanges();
    raiz.querySelector<HTMLButtonElement>('.montador-rolagem__gatilho')!.click();
    fixture.detectChanges();
    expect(janela().classList).not.toContain('painel-flutuante__janela--maximizada');
  });

  it('sincroniza nos dois sentidos: a barra muda o visor, o visor muda a barra', () => {
    const { fixture, hospedeiro, raiz } = montar();
    hospedeiro.formula.set('3d6 - 2');
    fixture.detectChanges();
    const visor = raiz.querySelector<HTMLInputElement>('.montador-rolagem__visor')!;
    expect(visor.value).toBe('3d6 - 2');

    visor.value = '3d6 + LUT';
    visor.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('3d6 + LUT');
  });

  it('fórmula avançada é mostrada como texto, sem ser reescrita', () => {
    const { fixture, hospedeiro, raiz } = montar();
    hospedeiro.atalhos.set({ furtivo: '2D6+2' });
    hospedeiro.formula.set('FOR+FURTIVO[Q]');
    fixture.detectChanges();
    expect(raiz.querySelector('.montador-rolagem__aviso-titulo')?.textContent).toContain('Fórmula avançada');
    expect(hospedeiro.formula()).toBe('FOR+FURTIVO[Q]');
  });

  it('fórmula inválida mostra o motivo do motor e bloqueia o Rolar', () => {
    const { fixture, hospedeiro, raiz, botaoPorTexto } = montar();
    fixture.componentRef.instance.formula.set('2d6+');
    fixture.detectChanges();
    expect(raiz.querySelector('.montador-rolagem__aviso--erro')).not.toBeNull();
    expect(hospedeiro.formula()).toBe('2d6+');
    expect(botaoPorTexto('Rolar').disabled).toBe(false); // a validade vem do consumidor (formulaValida)
  });

  it('Rolar pede ao consumidor e o painel continua aberto, com o último resultado até fechá-lo', () => {
    const { fixture, hospedeiro, raiz, botaoPorTexto } = montar();
    hospedeiro.formula.set('2d6');
    fixture.detectChanges();
    botaoPorTexto('Rolar').click();
    expect(hospedeiro.rolagens).toBe(1);

    const resultado = rolarFormula({ formula: '2d6', atributos: atributosZerados() })!;
    hospedeiro.ultimaRolagem.set({ formula: '2d6', resultado });
    fixture.detectChanges();
    expect(raiz.querySelector('.montador-rolagem__resultado app-resultado-rolagem')).not.toBeNull();
    expect(raiz.querySelector('.montador-rolagem__caixa')).not.toBeNull();

    raiz.querySelector<HTMLButtonElement>('.montador-rolagem__resultado button[aria-label="Fechar resultado"]')!.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.montador-rolagem__resultado')).toBeNull();
  });
});

function atributosZerados() {
  return {
    destreza: 0,
    forca: 0,
    luta: 0,
    pontaria: 0,
    vigor: 0,
    intelecto: 0,
    medicina: 0,
    sentidos: 0,
    social: 0,
    vontade: 0,
  };
}
