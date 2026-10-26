import { TestBed } from '@angular/core/testing';

import { tokenizarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { MontadorEditorPecas } from './montador-editor-pecas.component';
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

function montar(formula: string, modo: MontadorModo | null = null) {
  const fixture = TestBed.createComponent(MontadorEditorPecas);
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

/** Editor do montador de rolagem (versão Completo): tudo à vista, o texto de saída é a fonte de verdade. */
describe('MontadorEditorPecas', () => {
  it('seleciona a linha inteira e edita o multiplicador sem alterar os destinos dos outros termos', () => {
    const { fixture, raiz, emitidos } = montar('2d6 + FOR*2 [F] + NIV [B]', 'DANO');
    const selecionar = raiz.querySelector<HTMLButtonElement>('[aria-label="Editar Força × 2"]');
    expect(selecionar).not.toBeNull();
    selecionar!.click();
    fixture.detectChanges();
    expect(raiz.querySelectorAll('.editor__termo--selecionado')).toHaveLength(1);
    const multiplicador = raiz.querySelector<HTMLInputElement>('[aria-label="Valor do termo selecionado"]')!;
    multiplicador.value = '3';
    multiplicador.dispatchEvent(new Event('input'));
    expect(emitidos.at(-1)).toBe('2d6 + FOR*3 [F] + NIV [B]');
  });

  it('mantém o segundo atributo no lugar e desabilitado quando o teste usa somente um', () => {
    const { raiz } = montar('FORd20kh1', 'TESTE');
    const segundo = raiz.querySelector<HTMLSelectElement>('[aria-label="Segundo atributo do teste"]');
    expect(segundo).not.toBeNull();
    expect(segundo!.disabled).toBe(true);
  });

  it('termos: uma ficha por peça, na ordem, cada uma com o seu tipo', () => {
    const { raiz } = montar('3D10+36 [Balístico] + 3D8 [Químico]');
    const fichas = Array.from(raiz.querySelectorAll('app-ficha-termo'));
    expect(fichas).toHaveLength(3);
    expect(fichas[0].querySelector('.ficha-termo')?.classList).toContain('ficha-termo--cor-balistico');
    expect(fichas[2].querySelector('.ficha-termo')?.classList).toContain('ficha-termo--cor-quimico');
  });

  it('sinal e opções ficam à vista, sem menu "⋯ Mais"', () => {
    const { raiz } = montar('2d6 [F-Q]');
    expect(raiz.querySelector('app-segmentado[aria-label="Sinal do termo"]')).not.toBeNull();
    expect(raiz.querySelector('.ficha-termo__mais-gatilho')).toBeNull();
  });

  it('as edições produzem o texto esperado', () => {
    const { raiz, emitidos, botao } = montar('2d6 + FOR [F]', 'DANO');
    botao('d6')!.click();
    expect(emitidos.at(-1)).toBe('3d6 + FOR [F]');

    botao('Subtrai')!.click();
    expect(emitidos.at(-1)).toBe('-2d6 + FOR [F]');

    botao('Químico')!.click();
    expect(emitidos.at(-1)).toBe('2d6 [Q] + FOR [F]');

    raiz.querySelector<HTMLButtonElement>('button[aria-label="Remover Força"]')!.click();
    expect(emitidos.at(-1)).toBe('2d6 [F]');
  });

  it('os grupos de "Adicionar" ficam todos à vista', () => {
    const completo = montar('2d6', 'LIVRE');
    expect(completo.raiz.querySelector('select[aria-label="Atributo para adicionar"] option[value="FOR"]')).not.toBeNull();
    expect(completo.botao('Corpo a corpo')).toBeDefined();
    expect(completo.botao('Furtivo')).toBeUndefined();
  });

  it('campo de expressão lê ao vivo e acrescenta a quantidade de dados ou o bônus fixo', () => {
    const { raiz, fixture, emitidos, botao } = montar('2d6', 'LIVRE');
    botao('Quantidade de dados')!.click();
    fixture.detectChanges();
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
    const { raiz, emitidos, botao } = montar('((Int+soc)/2)d20kh1cm1+prof');
    const ativo = raiz.querySelector<HTMLSelectElement>('[aria-label="Atributo principal do teste"]');
    expect(ativo?.value).toBe('INT');
    expect(botao('Média')?.getAttribute('aria-pressed')).toBe('true');

    botao('Só um')!.click();
    expect(emitidos.at(-1)).toBe('INTd20kh1cm1 + PROF');
    botao('Menor')!.click();
    expect(emitidos.at(-1)).toBe('((INT+SOC)/2)d20kl1cm1 + PROF');
  });
});
