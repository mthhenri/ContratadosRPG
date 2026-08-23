import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';

import { montarInformacoesExtras, normalizarEntrada } from './status-derivado';

/**
 * Bug relatado: bônus de Defesa (amplificador "Defesa", equipamento) não cascateava para
 * Esquiva/Bloqueio/Contra-Ataque — conferido contra docs/core/sistema-v4.1.0.md — "Defesa": "A
 * defesa base é complementada com as Habilidades e Fragmentos, e com isso, você tem a sua 'Defesa
 * Final', que aí sim, nesta defesa, você poderá somar os bônus de reação, sendo ele Esquiva,
 * Bloqueio ou Contra-Ataque."
 */
describe('montarInformacoesExtras — cascata de bônus de Defesa nas reações', () => {
  const atributos: FichaAtributosDto = {
    destreza: 2,
    forca: 3,
    luta: 2,
    pontaria: 1,
    vigor: 4,
    intelecto: 1,
    medicina: 1,
    sentidos: 2,
    social: 1,
    vontade: 2,
  };
  const entrada = normalizarEntrada(ClasseEnum.COMBATENTE, 3, atributos);

  function valor(linhas: ReturnType<typeof montarInformacoesExtras>, chave: string): string {
    return linhas.find((linha) => linha.chave === chave)!.display;
  }

  it('sem bônus: Defesa 13, Esquiva 15 (13+destreza 2), Bloqueio 17 (13+vigor 4)', () => {
    const linhas = montarInformacoesExtras(entrada, [], undefined, [], []);
    expect(valor(linhas, 'defesa')).toBe('13');
    expect(valor(linhas, 'esquiva')).toBe('15');
    expect(valor(linhas, 'bloqueio')).toBe('17');
  });

  it('amplificador "Defesa" (+1) soma na Defesa e cascateia para Esquiva e Bloqueio', () => {
    const linhas = montarInformacoesExtras(entrada, [], undefined, [{ nome: 'Defesa', empilhamentos: 1 }], []);
    expect(valor(linhas, 'defesa')).toBe('14');
    expect(valor(linhas, 'esquiva')).toBe('16');
    expect(valor(linhas, 'bloqueio')).toBe('18');
  });

  it('cascata soma junto com o bônus específico de cada reação (Reflexos/Resiliência)', () => {
    const linhas = montarInformacoesExtras(entrada, [], undefined, [
      { nome: 'Defesa', empilhamentos: 1 },
      { nome: 'Reflexos', empilhamentos: 1 },
      { nome: 'Resiliência', empilhamentos: 1 },
    ], []);
    // Esquiva: base 15 + 1 (Defesa) + 1 (Reflexos) = 17. Bloqueio: base 17 + 1 (Defesa) + 1 (Resiliência) = 19.
    expect(valor(linhas, 'esquiva')).toBe('17');
    expect(valor(linhas, 'bloqueio')).toBe('19');
  });

  it('Resistente (penalidade de Defesa a partir do 2º empilhamento) também cascateia, podendo negativar', () => {
    const linhas = montarInformacoesExtras(entrada, [], undefined, [{ nome: 'Resistente', empilhamentos: 3 }], []);
    // Defesa: 13 - 1*(3-1) = 11. Esquiva: 15-2=13. Bloqueio: 17-2=15.
    expect(valor(linhas, 'defesa')).toBe('11');
    expect(valor(linhas, 'esquiva')).toBe('13');
    expect(valor(linhas, 'bloqueio')).toBe('15');
  });
});
