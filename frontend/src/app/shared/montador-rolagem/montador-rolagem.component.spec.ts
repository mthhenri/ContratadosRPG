import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { validarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { MontadorRolagem } from './montador-rolagem.component';

/**
 * Prova a caixa flutuante de tokens da Rolagem rápida (ui-35, revisão de usabilidade):
 * concatenação simples (sem parser client-side de "onde inserir", mesma mecânica de
 * `CalculadoraFlutuante.inserir`) — exceto o clique num dado, que soma quantidade no último
 * termo cru daquela face (`incrementarUltimoDado`, testado isolado em
 * `montador-rolagem.util.spec.ts`; aqui só prova que o clique de verdade chama esse caminho) — e
 * as duas ações compostas que evitam parêntese desbalanceado. Os três exemplos abaixo (`3D10+FOR
 * [Físico] + 3D6 [Químico]`, `(LUT+2)d20kh1cm1+PROF+5`, `(PON+1)d20kh1cm1+PROF+3+2+1)#2`) vieram
 * de uma conversa real com o autor e foram conferidos contra `interpretarFormula` — cada teste
 * reproduz um deles só clicando nos botões, e confirma que `validarFormula` aceita o resultado.
 *
 * A caixa flutuante nasce fechada — cada teste abre pelo gatilho antes de procurar os botões do
 * teclado (mesmo padrão de `app-painel-flutuante`: o corpo só existe no DOM com `[aberto]=true`).
 * `localStorage.clear()` evita que a posição/minimizado persistidos (chave fixa `[id]`) vazem de
 * um teste pro outro, mesmo cuidado de `calculadora-flutuante.component.spec.ts`.
 */
describe('MontadorRolagem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function montar(formulaInicial = '', atalhosDano?: { corpo?: string | null; furtivo?: string | null }) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [MontadorRolagem] });
    const fixture = TestBed.createComponent(MontadorRolagem);
    fixture.componentRef.setInput('formula', formulaInicial);
    if (atalhosDano) {
      fixture.componentRef.setInput('atalhosDano', atalhosDano);
    }
    fixture.detectChanges();
    fixture.componentInstance['alternar'](); // abre a caixa — o corpo só existe no DOM depois disso.
    fixture.detectChanges();
    return fixture;
  }

  function botao(
    fixture: ReturnType<typeof montar>,
    secao: string,
    texto: string,
  ): HTMLButtonElement {
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

  /** Botões do rodapé fixo (Apagar último/Limpar/Rolar) — fora de qualquer `__grupo`. */
  function botaoRodape(fixture: ReturnType<typeof montar>, texto: string): HTMLButtonElement {
    const raiz = fixture.nativeElement as HTMLElement;
    const rodape = raiz.querySelector('.montador-rolagem__rodape');
    if (!rodape) {
      throw new Error('Rodapé não encontrado.');
    }
    const encontrado = Array.from(rodape.querySelectorAll('button')).find(
      (candidato) => candidato.textContent?.trim() === texto,
    );
    if (!encontrado) {
      throw new Error(`Botão "${texto}" não encontrado no rodapé.`);
    }
    return encontrado as HTMLButtonElement;
  }

  it('nasce fechada — o corpo só aparece no DOM depois de clicar no gatilho', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [MontadorRolagem] });
    const fixture = TestBed.createComponent(MontadorRolagem);
    fixture.componentRef.setInput('formula', '');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.montador-rolagem__corpo')).toBeNull();

    (fixture.nativeElement.querySelector('.montador-rolagem__gatilho') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.montador-rolagem__corpo')).not.toBeNull();
  });

  it('clicar no gatilho de novo fecha a caixa', () => {
    const fixture = montar(); // já abriu uma vez
    (fixture.nativeElement.querySelector('.montador-rolagem__gatilho') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.montador-rolagem__corpo')).toBeNull();
  });

  it('o visor no topo do painel espelha a fórmula e é editável', () => {
    const fixture = montar('2d6');
    const visor = fixture.nativeElement.querySelector('.montador-rolagem__visor') as HTMLInputElement;
    expect(visor.value).toBe('2d6');

    visor.value = '2d6+3';
    visor.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.formula()).toBe('2d6+3');
  });

  it('clicar num dado insere "dN" cru (minúsculo na fórmula, mesmo o rótulo do botão sendo "DN")', () => {
    const fixture = montar();
    botao(fixture, 'Dado', 'D6').click();
    expect(fixture.componentInstance.formula()).toBe('d6');
  });

  it.each([
    ['Manter maior', 'd20kh+d6'],
    ['Manter menor', 'd20kl+d6'],
    ['Margem de crítico', 'd20cm1+d6'],
  ])('aplica %s ao primeiro dado elegível da esquerda pra direita (sem cursor no visor)', (acao, esperado) => {
    const fixture = montar();

    botao(fixture, 'Dado', 'D20').click();
    botao(fixture, 'Dado', 'D6').click();
    botao(fixture, acao === 'Margem de crítico' ? 'Avançado' : 'Manter maior / menor', acao).click();

    expect(fixture.componentInstance.formula()).toBe(esperado);
  });

  it('clique repetido no mesmo botão de pool distribui pelos dados da esquerda pra direita', () => {
    const fixture = montar();
    botao(fixture, 'Dado', 'D20').click();
    botao(fixture, 'Dado', 'D6').click();
    const manterMaior = botao(fixture, 'Manter maior / menor', 'Manter maior');
    manterMaior.click();
    expect(fixture.componentInstance.formula()).toBe('d20kh+d6');
    // "d20kh" já tem "kh" exato (clique redundante) — o segundo clique pula pro "d6".
    manterMaior.click();
    expect(fixture.componentInstance.formula()).toBe('d20kh+d6kh');
    // Os dois já têm "kh": um terceiro clique não tem mais alvo, sem efeito.
    manterMaior.click();
    expect(fixture.componentInstance.formula()).toBe('d20kh+d6kh');
  });

  it('posicionar o cursor no visor escolhe qual dado recebe o pool, mesmo não sendo o primeiro', () => {
    const fixture = montar('d20+d6');
    const visor = fixture.nativeElement.querySelector('.montador-rolagem__visor') as HTMLInputElement;
    const posicaoNoD6 = fixture.componentInstance.formula().indexOf('d6') + 1;
    visor.setSelectionRange(posicaoNoD6, posicaoNoD6);
    visor.dispatchEvent(new Event('click'));

    botao(fixture, 'Manter maior / menor', 'Manter maior').click();

    expect(fixture.componentInstance.formula()).toBe('d20+d6kh');
  });

  it('não altera a fórmula quando pool ou tipo de dano não têm alvo elegível', () => {
    const fixture = montar('FOR');

    botao(fixture, 'Manter maior / menor', 'Manter maior').click();
    botao(fixture, 'Manter maior / menor', 'Manter menor').click();
    botao(fixture, 'Avançado', 'Margem de crítico').click();
    botao(fixture, 'Tipo de dano', 'F').click();

    expect(fixture.componentInstance.formula()).toBe('FOR');
  });

  it('marca um grupo fechado de pools com o tipo de dano', () => {
    const fixture = montar('(2d12+2d6)');

    botao(fixture, 'Tipo de dano', 'F').click();

    expect(fixture.componentInstance.formula()).toBe('(2d12+2d6)[F]');
  });

  it('oferece multiplicador na ação de dado por propriedade', () => {
    const fixture = montar();
    fixture.componentInstance['atributoComposto'].set('LUT');
    Object.assign(fixture.componentInstance, {
      multiplicadorComposto: signal(2),
      usaMultiplicadorComposto: signal(true),
    });

    botao(fixture, 'Dado por Propriedade + Ajuste', 'D20').click();

    expect(fixture.componentInstance.formula()).toBe('(LUT*2)d20');
  });

  it('clicar no mesmo dado várias vezes soma quantidade em vez de duplicar token', () => {
    const fixture = montar();
    const d6 = botao(fixture, 'Dado', 'D6');
    d6.click();
    expect(fixture.componentInstance.formula()).toBe('d6');
    d6.click();
    expect(fixture.componentInstance.formula()).toBe('2d6');
    d6.click();
    expect(fixture.componentInstance.formula()).toBe('3d6');

    // Clicar noutro dado no meio não atrapalha — o próximo clique em D6 ainda acha o "3d6" (o
    // dado em si continua raw/sem "+" automático, mesma convenção de sempre — o "+" vem de
    // Editar, como no exemplo 1 abaixo).
    botao(fixture, 'Editar', '+').click();
    botao(fixture, 'Dado', 'D10').click();
    expect(fixture.componentInstance.formula()).toBe('3d6+d10');
    d6.click();
    expect(fixture.componentInstance.formula()).toBe('4d6+d10');
  });

  it('clicar num atributo depois de um dado antepõe "+" automaticamente', () => {
    const fixture = montar('d6');
    botao(fixture, 'Atributo', 'FOR').click();
    expect(fixture.componentInstance.formula()).toBe('d6+FOR');
  });

  it('clicar num dado logo após um atributo "bare" fecha ATRdM (atributo como fonte de dados)', () => {
    const fixture = montar();
    botao(fixture, 'Atributo', 'FOR').click();
    botao(fixture, 'Dado', 'D20').click();
    expect(fixture.componentInstance.formula()).toBe('FORd20');
  });

  it('"Manter maior"/"Manter menor" são sempre 1 (bare) e ficam lado a lado', () => {
    const fixture = montar('d20');
    const linha = botao(fixture, 'Manter maior / menor', 'Manter maior').closest('.montador-rolagem__linha');
    expect(linha?.querySelectorAll('button')).toHaveLength(2);
    botao(fixture, 'Manter maior / menor', 'Manter maior').click();
    expect(fixture.componentInstance.formula()).toBe('d20kh');
  });

  it('explosão/implosão não aparecem mais na UI (só visual — tirados por enquanto)', () => {
    const fixture = montar();
    const raiz = fixture.nativeElement as HTMLElement;
    const textos = Array.from(raiz.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(textos.some((t) => t?.includes('Explosão'))).toBe(false);
    expect(textos.some((t) => t?.includes('Implosão'))).toBe(false);
  });

  it('"+"/"-" substituem o operador anterior em vez de encadear', () => {
    const fixture = montar('2d6');
    botao(fixture, 'Editar', '+').click();
    botao(fixture, 'Editar', '−').click();
    expect(fixture.componentInstance.formula()).toBe('2d6-');
  });

  it('apagar último remove o bloco inteiro (não só o último caractere) e limpar zera tudo', () => {
    const fixture = montar('FORd20kh1cm1-2+7+DES');
    botaoRodape(fixture, '⌫').click();
    expect(fixture.componentInstance.formula()).toBe('FORd20kh1cm1-2+7');
    botaoRodape(fixture, 'Limpar').click();
    expect(fixture.componentInstance.formula()).toBe('');
  });

  it('"Rolar" do rodapé emite (rolar) e respeita formulaValida/fórmula vazia', () => {
    const fixture = montar('');
    const emitidos: void[] = [];
    fixture.componentInstance.rolar.subscribe(() => emitidos.push(undefined));

    expect(botaoRodape(fixture, 'Rolar').disabled).toBe(true); // vazia

    fixture.componentInstance.formula.set('2d6');
    fixture.componentRef.setInput('formulaValida', false);
    fixture.detectChanges();
    expect(botaoRodape(fixture, 'Rolar').disabled).toBe(true); // inválida

    fixture.componentRef.setInput('formulaValida', true);
    fixture.detectChanges();
    expect(botaoRodape(fixture, 'Rolar').disabled).toBe(false);
    botaoRodape(fixture, 'Rolar').click();
    expect(emitidos).toHaveLength(1);
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
    botao(fixture, 'Dado', 'D10').click();
    botao(fixture, 'Dado', 'D10').click();
    botao(fixture, 'Dado', 'D10').click();
    // Tipo só se aplica a um termo de dado/grupo fechado: atributo isolado não é alvo elegível.
    botao(fixture, 'Tipo de dano', 'F').click();
    botao(fixture, 'Editar', '+').click();
    botao(fixture, 'Atributo', 'FOR').click();
    botao(fixture, 'Editar', '+').click();
    botao(fixture, 'Dado', 'D6').click();
    botao(fixture, 'Dado', 'D6').click();
    botao(fixture, 'Dado', 'D6').click();
    botao(fixture, 'Tipo de dano', 'Q').click();

    const formula = fixture.componentInstance.formula();
    expect(formula).toBe('3d10[F]+FOR+3d6[Q]');
    expect(validarFormula(formula)).toBe(true);
  });

  it('exemplo 2: (ATR±n)dM pela ação composta, seguido de kh/cm/PROF/+5', () => {
    const fixture = montar();
    // Propriedade padrão da ação composta é a primeira da lista (DES) — troca pra LUT, ajuste 2.
    const raiz = fixture.nativeElement as HTMLElement;
    const botaoLut = Array.from(raiz.querySelectorAll('button[app-segmentado-item]')).find(
      (b) => b.textContent?.trim() === 'LUT',
    ) as HTMLButtonElement;
    botaoLut.click();
    fixture.componentInstance['ajusteComposto'].set(2);
    fixture.detectChanges();

    botao(fixture, 'Dado por Propriedade + Ajuste', 'D20').click();
    botao(fixture, 'Manter maior / menor', 'Manter maior').click();
    botao(fixture, 'Avançado', 'Margem de crítico').click();
    botao(fixture, 'Atributo', 'PROF').click();
    botao(fixture, 'Editar', '+').click();
    botao(fixture, 'Editar', '5').click();

    const formula = fixture.componentInstance.formula();
    // "kh" agora é sempre bare (=1, sem stepper) — encosta direto no "cm1" sem separador.
    expect(formula).toBe('(LUT+2)d20khcm1+PROF+5');
    expect(validarFormula(formula)).toBe(true);
  });

  it('a ação composta "Dado por Propriedade + Ajuste" não herda o incremento inteligente', () => {
    const fixture = montar();
    botao(fixture, 'Dado por Propriedade + Ajuste', 'D6').click();
    botao(fixture, 'Dado por Propriedade + Ajuste', 'D6').click();
    // Cada clique monta um bloco novo — não incrementa o anterior (comportamento explícito, não
    // um bug: mesclar num dos vários blocos já presentes seria ambíguo demais).
    expect(fixture.componentInstance.formula()).toBe('(DES+1)d6+(DES+1)d6');
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
