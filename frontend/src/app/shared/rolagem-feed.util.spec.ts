import { describe, expect, it } from 'vitest';

import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { mesclarFeedRolagens } from './rolagem-feed.util';

function rolagem(id: number, createdDate: string): RolagemResumoDto {
  return {
    id,
    fichaId: null,
    encontroCombatenteId: null,
    campanhaId: 8,
    usuarioId: 1,
    nomeAutor: 'Mestre',
    nomeFicha: null,
    rotulo: '1d20',
    formula: '1d20',
    visibilidade: RolagemVisibilidadeEnum.PUBLICA,
    resultado: { dados: [], atributos: [], constante: 0, total: 10 },
    createdDate,
    corFicha: null,
  };
}

describe('mesclarFeedRolagens', () => {
  it('substitui pela resposta do servidor quando não há extras nem exclusões', () => {
    const servidor = [rolagem(2, '2026-01-02T00:00:00Z'), rolagem(1, '2026-01-01T00:00:00Z')];
    expect(mesclarFeedRolagens(servidor, [], new Set())).toEqual(servidor);
  });

  it('nunca ressuscita um id já excluído, mesmo que a resposta do servidor ainda o traga', () => {
    const servidor = [rolagem(2, '2026-01-02T00:00:00Z'), rolagem(1, '2026-01-01T00:00:00Z')];
    const resultado = mesclarFeedRolagens(servidor, [], new Set([1]));
    expect(resultado.map((item) => item.id)).toEqual([2]);
  });

  it('preserva um item local mais recente que a resposta do servidor ainda não reflete', () => {
    const servidor = [rolagem(1, '2026-01-01T00:00:00Z')];
    const atual = [rolagem(2, '2026-01-02T00:00:00Z'), rolagem(1, '2026-01-01T00:00:00Z')];
    const resultado = mesclarFeedRolagens(servidor, atual, new Set());
    expect(resultado.map((item) => item.id)).toEqual([2, 1]);
  });

  it('não duplica quando o item local já consta na resposta do servidor', () => {
    const servidor = [rolagem(2, '2026-01-02T00:00:00Z'), rolagem(1, '2026-01-01T00:00:00Z')];
    const atual = [rolagem(2, '2026-01-02T00:00:00Z')];
    const resultado = mesclarFeedRolagens(servidor, atual, new Set());
    expect(resultado.map((item) => item.id)).toEqual([2, 1]);
  });

  it('um item local excluído nunca é reintroduzido como "extra"', () => {
    const servidor = [rolagem(1, '2026-01-01T00:00:00Z')];
    const atual = [rolagem(2, '2026-01-02T00:00:00Z'), rolagem(1, '2026-01-01T00:00:00Z')];
    const resultado = mesclarFeedRolagens(servidor, atual, new Set([2]));
    expect(resultado.map((item) => item.id)).toEqual([1]);
  });
});
