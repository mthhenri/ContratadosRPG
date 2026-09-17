import { describe, expect, it } from 'vitest';

import {
  adicionarDado,
  adicionarTipoDano,
  apagarUltimoBloco,
  incrementarUltimoDado,
  reposicionarOperadorPool,
} from './montador-rolagem.util';

describe('composição do montador', () => {
  it('adiciona um dado novo como termo aditivo', () => {
    expect(adicionarDado('d20', 6)).toBe('d20+d6');
    expect(adicionarDado('d6+', 6)).toBe('d6+d6');
    expect(adicionarDado('d6-', 6)).toBe('d6-d6');
    expect(adicionarDado('(', 6)).toBe('(d6');
  });

  it('atributo/fonte extra "bare" no final vira fonte de dados (ATRdM) ao clicar num dado', () => {
    expect(adicionarDado('FOR', 20)).toBe('FORd20');
    expect(adicionarDado('PROF', 6)).toBe('PROFd6');
    expect(adicionarDado('2d6+LUT', 20)).toBe('2d6+LUTd20');
    // atributo já com dado (fonte já fechada): dado novo volta a ser aditivo com "+".
    expect(adicionarDado('FORd6', 20)).toBe('FORd6+d20');
  });

  it('reposiciona o operador de pool no primeiro dado elegível da esquerda pra direita', () => {
    // "d20kh" já tem "kh" exato — clicar "kl" nele é troca (kh↔kl), não redundância: aplica ali
    // mesmo, no primeiro dado, sem pular pro "d6" que vem depois.
    expect(reposicionarOperadorPool('d20kh+d6', 'kl')).toBe('d20kl+d6');
    // "cm1" não tem nada a ver com "kh" — o primeiro dado ("d20kh") é elegível pra cm mesmo já
    // tendo kh (família diferente), então fica nele, não no "d6kl" mais à direita.
    expect(reposicionarOperadorPool('d20kh+d6kl', 'cm1')).toBe('d20khcm1+d6kl');
    expect(reposicionarOperadorPool('XYZd6', 'kh')).toBe('XYZd6');
    expect(reposicionarOperadorPool('lutad20', 'kh')).toBe('lutad20kh');
    expect(reposicionarOperadorPool('(LUT+2)d20', 'kh')).toBe('(LUT+2)d20kh');
    expect(reposicionarOperadorPool('(LUT*2)d20', 'kl')).toBe('(LUT*2)d20kl');
  });

  it('clique redundante (o dado já tem exatamente esse operador) pula pro próximo dado', () => {
    // "d20kh" já tem "kh" exato — clicar "kh" de novo nele não muda nada, então vai pro "d6".
    expect(reposicionarOperadorPool('d20kh+d6', 'kh')).toBe('d20kh+d6kh');
    // "d20khcm1" já tem "cm1" exato — clicar "cm1" de novo pula pro "d6kh".
    expect(reposicionarOperadorPool('d20khcm1+d6kh', 'cm1')).toBe('d20khcm1+d6khcm1');
    // Todos os dados já têm o operador exato: nada a fazer, sem efeito.
    expect(reposicionarOperadorPool('d20kh+d6kh', 'kh')).toBe('d20kh+d6kh');
  });

  it('kh/kl formam uma família mutuamente exclusiva (trocam no mesmo dado); cm convive com qualquer um dos dois', () => {
    expect(reposicionarOperadorPool('d20kh', 'kl')).toBe('d20kl');
    expect(reposicionarOperadorPool('d20kh', 'cm1')).toBe('d20khcm1');
    expect(reposicionarOperadorPool('d20khcm1', 'cm2')).toBe('d20khcm2');
    expect(reposicionarOperadorPool('d20khcm1', 'kl')).toBe('d20cm1kl');
  });

  it('cursor no visor escolhe o dado alvo, mesmo quando não é o primeiro da esquerda', () => {
    const formula = 'd20+d6';
    const cursorNoD6 = formula.indexOf('d6') + 1; // dentro do span do segundo candidato ("+d6")
    expect(reposicionarOperadorPool(formula, 'kh', cursorNoD6)).toBe('d20+d6kh');
    // Cursor fora de qualquer dado (ex.: início da fórmula) cai no padrão esquerda pra direita.
    expect(reposicionarOperadorPool(formula, 'kh', 0)).toBe('d20kh+d6');
    // Cursor null é o mesmo que não informar — também padrão esquerda pra direita.
    expect(reposicionarOperadorPool(formula, 'kh', null)).toBe('d20kh+d6');
  });

  it('não altera uma fórmula sem dado ao reposicionar pool', () => {
    expect(reposicionarOperadorPool('', 'kh')).toBe('');
    expect(reposicionarOperadorPool('(2d12+2d6)', 'kh')).toBe('(2d12+2d6)');
  });

  it('adiciona tipo de dano a um grupo fechado de dados', () => {
    expect(adicionarTipoDano('(2d12+2d6)', 'F')).toBe('(2d12+2d6)[F]');
    expect(adicionarTipoDano('LUTd20', 'F')).toBe('LUTd20[F]');
    expect(adicionarTipoDano('(LUT+2)d20kh1', 'F')).toBe('(LUT+2)d20kh1[F]');
    expect(adicionarTipoDano('(LUT*2)d20cm1', 'F')).toBe('(LUT*2)d20cm1[F]');
    expect(adicionarTipoDano('(1+2)d6', 'F')).toBe('(1+2)d6');
    expect(adicionarTipoDano('XYZd6', 'F')).toBe('XYZd6');
    expect(adicionarTipoDano('forcad6', 'F')).toBe('forcad6[F]');
    expect(adicionarTipoDano('3d10[F]+FOR+3d6', 'Q')).toBe('3d10[F]+FOR+3d6[Q]');
  });

  it('não adiciona tipo de dano a atributo sem dado', () => {
    expect(adicionarTipoDano('FOR', 'F')).toBe('FOR');
    expect(adicionarTipoDano('2', 'F')).toBe('2[F]');
  });
});

describe('apagarUltimoBloco', () => {
  it('remove o último termo aditivo inteiro (com o sinal que o antecede), não só o último caractere', () => {
    expect(apagarUltimoBloco('FORd20kh1cm1-2+7+DES')).toBe('FORd20kh1cm1-2+7');
    expect(apagarUltimoBloco('2d6+3')).toBe('2d6');
    expect(apagarUltimoBloco('2d6+FOR-5')).toBe('2d6+FOR');
  });

  it('operador solto no final conta como bloco (some inteiro, não em partes)', () => {
    expect(apagarUltimoBloco('d6+')).toBe('d6');
    expect(apagarUltimoBloco('2d6-')).toBe('2d6');
  });

  it('nunca corta dentro de um grupo (...) ou de uma tag [...] — os dois contam como parte do bloco', () => {
    expect(apagarUltimoBloco('(2d12+2d6)')).toBe('');
    expect(apagarUltimoBloco('(LUT+2)d20kh1cm1+PROF+5')).toBe('(LUT+2)d20kh1cm1+PROF');
    expect(apagarUltimoBloco('3d10[F]+FOR+3d6[Q]')).toBe('3d10[F]+FOR');
  });

  it('sem nenhum "+"/"-" top-level, a fórmula inteira é um bloco só', () => {
    expect(apagarUltimoBloco('FORd20kh1cm1')).toBe('');
    expect(apagarUltimoBloco('d6')).toBe('');
    expect(apagarUltimoBloco('')).toBe('');
  });
});

describe('incrementarUltimoDado', () => {
  it('sem termo dessa face ainda, devolve null', () => {
    expect(incrementarUltimoDado('', 6)).toBeNull();
    expect(incrementarUltimoDado('2d10+FOR', 6)).toBeNull();
  });

  it('dado bare (sem número) vira 2, depois 3 — clique repetido soma quantidade', () => {
    let formula = incrementarUltimoDado('d6', 6);
    expect(formula).toBe('2d6');
    formula = incrementarUltimoDado(formula!, 6);
    expect(formula).toBe('3d6');
  });

  it('incrementa o termo já numérico, preservando o resto da fórmula ao redor', () => {
    expect(incrementarUltimoDado('2d6+FOR', 6)).toBe('3d6+FOR');
    expect(incrementarUltimoDado('LUTd20kh1+2d6[Físico]', 6)).toBe('LUTd20kh1+3d6[Físico]');
  });

  it('sempre o último termo daquela face, não o último token digitado', () => {
    // "d10" foi o último token clicado, mas incrementar d6 tem que achar o "2d6" mais à frente.
    expect(incrementarUltimoDado('2d6+3d10', 6)).toBe('3d6+3d10');
    // Dois termos da mesma face: sempre o último.
    expect(incrementarUltimoDado('2d6+3d6', 6)).toBe('2d6+4d6');
  });

  it('não incrementa ATRdM (atributo como fonte de dados) — insere um termo novo do lado de fora', () => {
    expect(incrementarUltimoDado('FORd6', 6)).toBeNull();
    expect(incrementarUltimoDado('2d10+FORd6', 6)).toBeNull();
  });

  it('não incrementa dentro de um bloco composto (ATR±n)dM', () => {
    expect(incrementarUltimoDado('(LUT+2)d20', 20)).toBeNull();
    expect(incrementarUltimoDado('(LUT+2)d20kh1', 20)).toBeNull();
  });

  it('não confunde d1 dentro de d10/d12 (limite de face exato)', () => {
    expect(incrementarUltimoDado('2d10', 1)).toBeNull();
    expect(incrementarUltimoDado('2d12', 1)).toBeNull();
  });

  it('preserva operadores por pool colados no termo (kh/kl/cm/!/?)', () => {
    expect(incrementarUltimoDado('3d6kh1cm1', 6)).toBe('4d6kh1cm1');
  });
});
