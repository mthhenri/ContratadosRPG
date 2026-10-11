import { describe, expect, it } from 'vitest';

import { filtrarMenuInsercao, type MenuInsercaoOpcao } from './menu-insercao';

const opcoes: MenuInsercaoOpcao[] = [
  { id: 'SECAO', rotulo: 'Seção', termos: ['secao', 'titulo'] },
  { id: 'PARAGRAFO', rotulo: 'Parágrafo', termos: ['texto'] },
  { id: 'HABILIDADE', rotulo: 'Habilidade', descricao: 'Custo e efeito', termos: ['hab'] },
  { id: 'NOTA', rotulo: 'Nota', descricao: 'Destaque para o leitor' },
];

describe('filtrarMenuInsercao', () => {
  it('termo vazio devolve tudo, na ordem recebida', () => {
    expect(filtrarMenuInsercao(opcoes, '').map((o) => o.id)).toEqual(['SECAO', 'PARAGRAFO', 'HABILIDADE', 'NOTA']);
  });

  it('ignora a barra e o acento, e casa com o apelido', () => {
    expect(filtrarMenuInsercao(opcoes, '/hab').map((o) => o.id)).toEqual(['HABILIDADE']);
    expect(filtrarMenuInsercao(opcoes, 'PARAGRAFO').map((o) => o.id)).toEqual(['PARAGRAFO']);
    expect(filtrarMenuInsercao(opcoes, 'texto').map((o) => o.id)).toEqual(['PARAGRAFO']);
  });

  it('começo do rótulo vem antes de trecho, e a descrição é o último critério', () => {
    expect(filtrarMenuInsercao(opcoes, 'e').map((o) => o.id)).toEqual(['SECAO', 'PARAGRAFO', 'HABILIDADE', 'NOTA']);
    expect(filtrarMenuInsercao(opcoes, 'leitor').map((o) => o.id)).toEqual(['NOTA']);
  });

  it('sem correspondência devolve vazio', () => {
    expect(filtrarMenuInsercao(opcoes, 'zzz')).toEqual([]);
  });
});
