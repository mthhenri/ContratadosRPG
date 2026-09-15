import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { validarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { MontadorRolagem } from './montador-rolagem.component';

/**
 * Prova o teclado de tokens da Rolagem rápida (ui-35): concatenação simples (sem parser
 * client-side de "onde inserir", mesma mecânica de `CalculadoraFlutuante.inserir`) mais as duas
 * ações compostas que evitam parêntese desbalanceado. Os três exemplos abaixo (`3D10+FOR
 * [Físico] + 3D6 [Químico]`, `(LUT+2)d20kh1cm1+PROF+5`, `(PON+1)d20kh1cm1+PROF+3+2+1)#2`) vieram
 * de uma conversa real com o autor e foram conferidos contra `interpretarFormula` antes desta
 * task — cada teste reproduz um deles só clicando nos botões, e confirma que `validarFormula`
 * aceita o resultado.
 */
describe('MontadorRolagem', () => {
  function montar(formulaInicial = '', atalhosDano?: { corpo?: string | null; furtivo?: string | null }) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [MontadorRolagem] });
    const fixture = TestBed.createComponent(MontadorRolagem);
    fixture.componentRef.setInput('formula', formulaInicial);
    if (atalhosDano) {
      fixture.componentRef.setInput('atalhosDano', atalhosDano);
    }
    fixture.detectChanges();
    return fixture;
  }

  function botao(fixture: ReturnType<typeof montar>, secao: string, texto: string): HTMLButtonElement {
    const raiz = fixture.nativeElement as HTMLElement;
    const grupo = Array.from(raiz.querySelectorAll('.montador-rolagem__grupo')).find((secaoEl) =>
      secaoEl.querySelector('h3')?.textContent?.trim() === secao,
    );
    if (!grupo) {
      throw new Error(`Seção "${secao}" não encontrada.`);
    }
    const encontrado = Array.from(grupo.querySelectorAll('button')).find(
      (candidato) => candidato.textContent?.trim() === texto,
    );
    if (!encontrado) {
      throw new Error(`Botão "${texto}" não encontrado na seção "${secao}".`);
    }
    return encontrado as HTMLButtonElement;
  }

  it('clicar num dado insere "dN" cru, sem "+" na frente', () => {
    const fixture = montar();
    botao(fixture, 'Dado', 'd6').click();
    expect(fixture.componentInstance.formula()).toBe('d6');
  });

  it('clicar num atributo depois de um dado antepõe "+" automaticamente', () => {
    const fixture = montar('d6');
    botao(fixture, 'Atributo', 'FOR').click();
    expect(fixture.componentInstance.formula()).toBe('d6+FOR');
  });

  it('"Manter maior"/"Manter menor" encostam kh/kl direto no dado, sem separador', () => {
    const fixture = montar('d20');
    botao(fixture, 'Manter maior / menor', 'Manter maior').click();
    expect(fixture.componentInstance.formula()).toBe('d20kh1');
  });

  it('"+"/"-" substituem o operador anterior em vez de encadear', () => {
    const fixture = montar('2d6');
    botao(fixture, 'Editar', '+').click();
    botao(fixture, 'Editar', '−').click();
    expect(fixture.componentInstance.formula()).toBe('2d6-');
  });

  it('apagar último e limpar', () => {
    const fixture = montar('2d6+3');
    botao(fixture, 'Editar', '⌫').click();
    expect(fixture.componentInstance.formula()).toBe('2d6+');
    botao(fixture, 'Editar', 'Limpar').click();
    expect(fixture.componentInstance.formula()).toBe('');
  });

  it('atalhos CORPO/FURTIVO só aparecem quando há valor correspondente', () => {
    const fixture = montar('', { corpo: '2D6 + FOR [Físico]', furtivo: null });
    const raiz = fixture.nativeElement as HTMLElement;
    const textos = Array.from(raiz.querySelectorAll('.montador-rolagem__grupo button')).map((b) =>
      b.textContent?.trim(),
    );
    expect(textos).toContain('CORPO');
    expect(textos).not.toContain('FURTIVO');
  });

  it('exemplo 1: dois termos de dado com tags de dano diferentes só de clique', () => {
    const fixture = montar();
    botao(fixture, 'Editar', '3').click();
    botao(fixture, 'Dado', 'd10').click();
    botao(fixture, 'Editar', '+').click();
    botao(fixture, 'Atributo', 'FOR').click();
    botao(fixture, 'Tipo de dano', 'Físico').click(); // insere a sigla [F] — resolverTipoDanoSimples aceita as duas formas.
    botao(fixture, 'Editar', '+').click();
    botao(fixture, 'Editar', '3').click();
    botao(fixture, 'Dado', 'd6').click();
    botao(fixture, 'Tipo de dano', 'Químico').click();

    const formula = fixture.componentInstance.formula();
    expect(formula).toBe('3d10+FOR[F]+3d6[Q]');
    expect(validarFormula(formula)).toBe(true);
  });

  it('exemplo 2: (ATR±n)dM pela ação composta, seguido de kh/cm/PROF/+5', () => {
    const fixture = montar();
    // Atributo padrão da ação composta é o primeiro da lista (DES) — troca para LUT, ajuste para 2.
    const raiz = fixture.nativeElement as HTMLElement;
    const botaoLut = Array.from(raiz.querySelectorAll('button[app-segmentado-item]')).find(
      (b) => b.textContent?.trim() === 'LUT',
    ) as HTMLButtonElement;
    botaoLut.click();
    fixture.componentInstance['ajusteComposto'].set(2);
    fixture.detectChanges();

    botao(fixture, 'Dado por atributo + ajuste', 'd20').click();
    botao(fixture, 'Manter maior / menor', 'Manter maior').click();
    botao(fixture, 'Avançado', 'Margem de crítico').click();
    botao(fixture, 'Atributo', 'PROF').click();
    botao(fixture, 'Editar', '+').click();
    botao(fixture, 'Editar', '5').click();

    const formula = fixture.componentInstance.formula();
    expect(formula).toBe('(LUT+2)d20kh1cm1+PROF+5');
    expect(validarFormula(formula)).toBe(true);
  });

  it('exemplo 3: "Repetir tudo" fecha (<fórmula>)#N sempre balanceado — o caso que, digitado à mão, tinha um ")" a mais', () => {
    const fixture = montar('(PON+1)d20kh1cm1+PROF+3+2+1');
    botao(fixture, 'Repetir tudo', 'Repetir (#2)').click();

    const formula = fixture.componentInstance.formula();
    expect(formula).toBe('((PON+1)d20kh1cm1+PROF+3+2+1)#2');
    expect(validarFormula(formula)).toBe(true);
  });

  it('"Repetir tudo" fica sem efeito com a fórmula vazia', () => {
    const fixture = montar('');
    botao(fixture, 'Repetir tudo', 'Repetir (#2)').click();
    expect(fixture.componentInstance.formula()).toBe('');
  });
});
