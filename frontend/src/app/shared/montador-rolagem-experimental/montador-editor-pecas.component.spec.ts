import { TestBed } from '@angular/core/testing';

import { tokenizarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { type MontadorDensidade, MontadorEditorPecas } from './montador-editor-pecas.component';
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

function montar(formula: string, densidade: MontadorDensidade, modo: MontadorModo | null = null) {
  const fixture = TestBed.createComponent(MontadorEditorPecas);
  fixture.componentRef.setInput('densidade', densidade);
  fixture.componentRef.setInput('tokenizada', tokenizarFormula(formula) ?? { pecas: [] });
  fixture.componentRef.setInput('modo', modo);
  fixture.componentRef.setInput('ambiente', ambiente);
  fixture.componentRef.setInput('atalhosDano', { corpo: '2D6 [Físico]', furtivo: null });
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

/** Completo e Essencial (montador-exp-03): um componente, duas densidades, o mesmo texto de saída. */
describe('MontadorEditorPecas', () => {
  it('termos: uma ficha por peça, na ordem, cada uma com o seu tipo', () => {
    const { raiz } = montar('3D10+36 [Balístico] + 3D8 [Químico]', 'COMPLETO');
    const fichas = Array.from(raiz.querySelectorAll('app-ficha-termo'));
    expect(fichas).toHaveLength(3);
    expect(fichas[0].querySelector('.ficha-termo')?.classList).toContain('ficha-termo--cor-balistico');
    expect(fichas[2].querySelector('.ficha-termo')?.classList).toContain('ficha-termo--cor-quimico');
  });

  it('Completo deixa sinal e opções à vista; Essencial os recolhe em "⋯ Mais"', () => {
    const completo = montar('2d6 [F-Q]', 'COMPLETO');
    expect(completo.raiz.querySelector('app-segmentado[aria-label="Sinal de 2d6"]')).not.toBeNull();
    expect(completo.raiz.querySelector('.ficha-termo__mais-gatilho')).toBeNull();

    const essencial = montar('2d6 [F-Q]', 'ESSENCIAL');
    expect(essencial.raiz.querySelector('app-segmentado[aria-label="Sinal de 2d6"]')).toBeNull();
    essencial.raiz.querySelector<HTMLButtonElement>('.ficha-termo__mais-gatilho')!.click();
    essencial.fixture.detectChanges();
    expect(essencial.raiz.querySelector('app-segmentado[aria-label="Sinal de 2d6"]')).not.toBeNull();
  });

  it.each<MontadorDensidade>(['COMPLETO', 'ESSENCIAL'])('%s: as edições produzem o mesmo texto', (densidade) => {
    const { raiz, fixture, emitidos, botao } = montar('2d6 + FOR [F]', densidade, 'DANO');
    botao('d6')!.click();
    expect(emitidos.at(-1)).toBe('3d6 + FOR [F]');

    if (densidade === 'ESSENCIAL') {
      raiz.querySelector<HTMLButtonElement>('.ficha-termo__mais-gatilho')!.click();
      fixture.detectChanges();
    }
    botao('Subtrai')!.click();
    expect(emitidos.at(-1)).toBe('-2d6 + FOR [F]');

    const tipo = raiz.querySelector<HTMLSelectElement>('select[aria-label="Tipo de dano de 2d6"]')!;
    tipo.value = 'Químico';
    tipo.dispatchEvent(new Event('change'));
    expect(emitidos.at(-1)).toBe('2d6 [Q] + FOR [F]');

    raiz.querySelector<HTMLButtonElement>('button[aria-label="Remover Força"]')!.click();
    expect(emitidos.at(-1)).toBe('2d6 [F]');
  });

  it('Essencial: um painel de "+ Adicionar" por vez; Completo mostra todos', () => {
    const essencial = montar('2d6', 'ESSENCIAL', 'LIVRE');
    expect(essencial.botao('FOR')).toBeUndefined();
    essencial.botao('+ Atributo')!.click();
    essencial.fixture.detectChanges();
    expect(essencial.botao('FOR')).toBeDefined();
    essencial.botao('+ Número')!.click();
    essencial.fixture.detectChanges();
    expect(essencial.botao('FOR')).toBeUndefined();

    const completo = montar('2d6', 'COMPLETO', 'LIVRE');
    expect(completo.botao('FOR')).toBeDefined();
    expect(completo.botao('Corpo a corpo')).toBeDefined();
    expect(completo.botao('Furtivo')).toBeUndefined();
  });

  it('campo de expressão lê ao vivo e acrescenta a quantidade de dados ou o bônus fixo', () => {
    const { raiz, fixture, emitidos, botao } = montar('2d6', 'COMPLETO', 'LIVRE');
    const campo = raiz.querySelector<HTMLInputElement>('input[placeholder="(FOR+VIG)*2"]')!;
    campo.value = '(for+vig)*2';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(raiz.querySelector('.editor__leitura-expressao')?.textContent).toContain('14 dados');

    raiz.querySelector<HTMLButtonElement>('.editor__expressao-adicionar')!.click();
    expect(emitidos.at(-1)).toBe('2d6 + ((FOR+VIG)*2)d6');

    botao('Bônus fixo')!.click();
    fixture.detectChanges();
    campo.value = '(FOR+VIG)*2';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(raiz.querySelector('.editor__leitura-expressao')?.textContent).toContain('+14');
    raiz.querySelector<HTMLButtonElement>('.editor__expressao-adicionar')!.click();
    expect(emitidos.at(-1)).toBe('2d6 + (FOR+VIG)*2');
  });

  it('teste de atributo: fórmula dos jogadores com média de dois atributos', () => {
    const { raiz, emitidos, botao } = montar('((Int+soc)/2)d20kh1cm1+prof', 'COMPLETO');
    const ativo = raiz.querySelector('.editor__atributo.segmentado__item--ativo');
    expect(ativo?.textContent).toContain('INT');
    expect(botao('Média')?.getAttribute('aria-pressed')).toBe('true');

    botao('Só um')!.click();
    expect(emitidos.at(-1)).toBe('INTd20kh1cm1 + PROF');
    botao('Menor')!.click();
    expect(emitidos.at(-1)).toBe('((INT+SOC)/2)d20kl1cm1 + PROF');
  });

  it('teste no Essencial: atributo à vista, o resto em painéis', () => {
    const { raiz, fixture, botao } = montar('LUTd20kh1 + PROF', 'ESSENCIAL', 'TESTE');
    expect(raiz.querySelector('.editor__grade-atributos')).not.toBeNull();
    expect(botao('Só um')).toBeUndefined();
    botao('+ Combinar atributo')!.click();
    fixture.detectChanges();
    expect(botao('Só um')).toBeDefined();
    expect(raiz.querySelector('app-ficha-termo')?.textContent).toContain('Proficiência');
  });
});
