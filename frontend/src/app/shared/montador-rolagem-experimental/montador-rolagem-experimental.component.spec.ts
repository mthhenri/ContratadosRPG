import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { rolarFormula } from '@contratados-rpg/shared/regras/rolagem';

import {
  MontadorRolagemExperimental,
  type MontadorUltimaRolagem,
} from './montador-rolagem-experimental.component';

@Component({
  imports: [MontadorRolagemExperimental],
  template: `
    <app-montador-rolagem-experimental
      [(formula)]="formula"
      [versao]="versao()"
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
  readonly versao = signal<'ESSENCIAL' | 'COMPLETO' | 'BLOCOS'>('ESSENCIAL');
  readonly atalhos = signal<{ corpo?: string | null; furtivo?: string | null }>({});
  readonly ultimaRolagem = signal<MontadorUltimaRolagem | null>(null);
  readonly atributos = { ...atributosZerados(), forca: 3, vigor: 4, luta: 4 };
  rolagens = 0;
}

function montar() {
  const fixture = TestBed.createComponent(Hospedeiro);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  raiz.querySelector<HTMLButtonElement>('.montador-exp__gatilho')!.click();
  fixture.detectChanges();
  const botaoPorTexto = (texto: string): HTMLButtonElement =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((botao) =>
      botao.textContent?.trim().startsWith(texto),
    )!;
  return { fixture, hospedeiro: fixture.componentInstance, raiz, botaoPorTexto };
}

/**
 * Casca das versões novas (montador-exp-02): o texto da barra é a única fonte de verdade, nos dois sentidos;
 * Desfazer real; estados vazia/avançada/inválida/resultado; o painel não fecha ao rolar.
 */
describe('MontadorRolagemExperimental', () => {
  it('vazia: mostra os três pontos de partida; escolher um escreve a fórmula na barra', () => {
    const { fixture, hospedeiro, raiz, botaoPorTexto } = montar();
    const receitas = Array.from(raiz.querySelectorAll('.montador-exp__receita')).map((receita) =>
      receita.querySelector('.cartao-receita__titulo')?.textContent?.trim(),
    );
    expect(receitas).toEqual(['Teste de atributo', 'Dano de arma', 'Dados livres']);

    botaoPorTexto('Dano de arma').click();
    fixture.detectChanges();
    expect(hospedeiro.formula()).toBe('2d6 + FOR [F]');
    expect(raiz.querySelector('.montador-exp__receita')).toBeNull();
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
    expect(raiz.querySelector('.montador-exp__redimensionar')).not.toBeNull();

    botao('Maximizar montador').click();
    fixture.detectChanges();
    expect(janela().classList).toContain('painel-flutuante__janela--maximizada');
    expect(janela().style.width).toBe(`${window.innerWidth}px`);
    expect(janela().style.height).toBe(`${window.innerHeight}px`);
    expect(raiz.querySelector('.montador-exp__redimensionar')).toBeNull();

    botao('Restaurar tamanho do montador').click();
    fixture.detectChanges();
    expect(janela().classList).not.toContain('painel-flutuante__janela--maximizada');
    expect(raiz.querySelector('.montador-exp__redimensionar')).not.toBeNull();

    botao('Maximizar montador').click();
    botao('Fechar Montador de rolagem').click();
    fixture.detectChanges();
    raiz.querySelector<HTMLButtonElement>('.montador-exp__gatilho')!.click();
    fixture.detectChanges();
    expect(janela().classList).not.toContain('painel-flutuante__janela--maximizada');
  });

  it('sincroniza nos dois sentidos: a barra muda o visor, o visor muda a barra', () => {
    const { fixture, hospedeiro, raiz } = montar();
    hospedeiro.formula.set('3d6 - 2');
    fixture.detectChanges();
    const visor = raiz.querySelector<HTMLInputElement>('.montador-exp__visor')!;
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
    expect(raiz.querySelector('.montador-exp__aviso-titulo')?.textContent).toContain('Fórmula avançada');
    expect(hospedeiro.formula()).toBe('FOR+FURTIVO[Q]');
  });

  it('fórmula inválida mostra o motivo do motor e bloqueia o Rolar', () => {
    const { fixture, hospedeiro, raiz, botaoPorTexto } = montar();
    fixture.componentRef.instance.formula.set('2d6+');
    fixture.detectChanges();
    expect(raiz.querySelector('.montador-exp__aviso--erro')).not.toBeNull();
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
    expect(raiz.querySelector('.montador-exp__resultado app-resultado-rolagem')).not.toBeNull();
    expect(raiz.querySelector('.montador-exp__caixa')).not.toBeNull();

    raiz.querySelector<HTMLButtonElement>('.montador-exp__resultado button[aria-label="Fechar resultado"]')!.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.montador-exp__resultado')).toBeNull();
  });

  it('trocar de versão nova mantém a janela aberta e a fórmula', () => {
    const { fixture, hospedeiro, raiz, botaoPorTexto } = montar();
    botaoPorTexto('Dano de arma').click();
    fixture.detectChanges();
    hospedeiro.versao.set('COMPLETO');
    fixture.detectChanges();
    expect(raiz.querySelector('.montador-exp__caixa')).not.toBeNull();
    expect(hospedeiro.formula()).toBe('2d6 + FOR [F]');
    expect(raiz.querySelector('.painel-flutuante__kicker')?.textContent).toContain('Completo');
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
