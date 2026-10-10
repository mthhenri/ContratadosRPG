import { filtrarPaleta, normalizarPaleta, type PaletaItem } from './paleta';

const itens: PaletaItem[] = [
  { id: 'a', rotulo: 'Usando Habilidades', contexto: 'Criação de Personagem › Habilidades' },
  { id: 'b', rotulo: 'Habilidades', contexto: 'Criação de Personagem' },
  { id: 'c', rotulo: 'Habilidades Gerais', contexto: 'Criação de Personagem › Habilidades' },
  { id: 'd', rotulo: 'Saúde', contexto: 'Criação de Personagem' },
  { id: 'e', rotulo: 'Energia', contexto: 'Criação de Personagem › Saúde' },
];

describe('paleta', () => {
  it('normaliza acento e caixa', () => {
    expect(normalizarPaleta('  SAÚDE ')).toBe('saude');
  });

  it('termo vazio devolve todos na ordem original', () => {
    expect(filtrarPaleta(itens, '').map((i) => i.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('ordena: começa com o termo, início de palavra, trecho do título, caminho', () => {
    expect(filtrarPaleta(itens, 'habilidades').map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(filtrarPaleta(itens, 'saude').map((i) => i.id)).toEqual(['d', 'e']);
  });

  it('ignora acento no termo e no título', () => {
    expect(filtrarPaleta(itens, 'SAUDE').map((i) => i.id)).toEqual(['d', 'e']);
    expect(filtrarPaleta(itens, 'energía').map((i) => i.id)).toEqual(['e']);
  });

  it('sem correspondência devolve vazio', () => {
    expect(filtrarPaleta(itens, 'xyz')).toEqual([]);
  });
});
