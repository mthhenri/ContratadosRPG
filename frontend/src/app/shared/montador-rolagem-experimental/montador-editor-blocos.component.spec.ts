import { TestBed } from '@angular/core/testing';

import { tokenizarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { MontadorEditorBlocos } from './montador-editor-blocos.component';
import type { AmbienteMontador } from './montador-leitura';
import type { MontadorModo } from './montador-modelo';

const ambiente: AmbienteMontador = {
  atributos: {
    destreza: 2,
    forca: 3,
    luta: 4,
    pontaria: 1,
    vigor: 4,
    intelecto: 7,
    medicina: 0,
    sentidos: 0,
    social: 4,
    vontade: 0,
  },
  proficiencia: 2,
  nivel: 2,
};

function montar(formula: string, modo: MontadorModo | null) {
  const fixture = TestBed.createComponent(MontadorEditorBlocos);
  fixture.componentRef.setInput('tokenizada', tokenizarFormula(formula) ?? { pecas: [] });
  fixture.componentRef.setInput('modo', modo);
  fixture.componentRef.setInput('ambiente', ambiente);
  fixture.componentRef.setInput('atalhosDano', { corpo: '2D6 [Físico]', furtivo: '2D6+2' });
  const emitidos: string[] = [];
  fixture.componentInstance.editar.subscribe((texto) => emitidos.push(texto));
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  const botao = (texto: string) =>
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find(
      (item) => item.textContent?.replace(/\s+/g, ' ').trim() === texto,
    );
  return { fixture, raiz, emitidos, botao };
}

/** Blocos (montador-exp-04): formulário por blocos, sinal por termo, atalhos no início. */
describe('MontadorEditorBlocos', () => {
  it('dano de arma: um bloco com tipo, contagem por dado e atributo; +1 no d6 reescreve o texto', () => {
    const { fixture, raiz, emitidos } = montar('2d6 + FOR [F]', 'DANO');
    expect(raiz.querySelectorAll('.blocos__lista > app-ficha-termo')).toHaveLength(1);
    expect(raiz.querySelector<HTMLSelectElement>('select[aria-label="Tipo de dano do bloco 1"]')!.value).toBe('Físico');
    expect(raiz.querySelectorAll('.blocos__dado')).toHaveLength(7);
    // O stepper de contagem é de segurar-para-repetir (`appHoldRepeat`): aciona o mesmo handler do (valorAlterado).
    fixture.componentInstance['definirContagem'](0, 6, 3);
    expect(emitidos.at(-1)).toBe('3d6 + FOR [F]');
  });

  it('sinal por termo: o atributo alterna soma e subtração', () => {
    const { raiz, emitidos } = montar('2d6 + FOR [F]', 'DANO');
    raiz.querySelector<HTMLButtonElement>('button[aria-label="Alternar soma e subtração de Força"]')!.click();
    expect(emitidos.at(-1)).toBe('2d6 - FOR [F]');
  });

  it('bloco novo fica só na tela até ganhar conteúdo; o limite do dano é 2 blocos', () => {
    const { fixture, raiz, emitidos, botao } = montar('2d6 + FOR [F]', 'DANO');
    botao('+ Adicionar bloco de dano')!.click();
    fixture.detectChanges();
    expect(raiz.querySelectorAll('.blocos__lista > app-ficha-termo')).toHaveLength(2);
    expect(emitidos).toEqual([]);
    expect(botao('+ Adicionar bloco de dano')).toBeUndefined();

    const tipo = raiz.querySelector<HTMLSelectElement>('select[aria-label="Tipo de dano do bloco 2"]')!;
    tipo.value = 'Químico';
    tipo.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(emitidos).toEqual([]);

    raiz.querySelectorAll<HTMLButtonElement>('app-segmentado[aria-label="Atributos do bloco 2"] button')[1].click();
    expect(emitidos.at(-1)).toBe('2d6 + FOR [F] + FOR [Q]');
  });

  it('opções do bloco só nos dados livres', () => {
    expect(montar('2d6 + FOR [F]', 'DANO').botao('Opções do bloco')).toBeUndefined();
    const livres = montar('2d6', 'LIVRE');
    livres.botao('Opções do bloco')!.click();
    livres.fixture.detectChanges();
    livres.botao('Maior')!.click();
    expect(livres.emitidos.at(-1)).toBe('2d6kh1');
  });

  it('atalhos entram no início e repetir envolve tudo', () => {
    const { raiz, emitidos, botao } = montar('2d6 + FOR [F]', 'DANO');
    raiz.querySelector<HTMLButtonElement>('.blocos__atalho')!.click();
    expect(emitidos.at(-1)).toBe('CORPO + 2d6 + FOR [F]');
    expect(botao('Furtivo 2D6+2')).toBeDefined();
  });

  it('teste de atributo usa o editor de teste (tudo à vista)', () => {
    const { raiz, botao } = montar('((Int+soc)/2)d20kh1cm1+prof', null);
    expect(raiz.querySelector('app-montador-editor-pecas')).not.toBeNull();
    expect(botao('Média')?.getAttribute('aria-pressed')).toBe('true');
  });
});
