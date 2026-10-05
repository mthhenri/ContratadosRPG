import { ordenarPorNome } from './ordenacao-nome';

describe('ordenarPorNome', () => {
  const ficha = (id: number, nome: string) => ({ id, nome });
  const nomes = (lista: readonly { nome: string }[]) => lista.map((item) => item.nome);

  it('ordena A–Z ignorando acento e caixa', () => {
    const lista = [ficha(1, 'bruno'), ficha(2, 'Álvaro'), ficha(3, 'Carla'), ficha(4, 'alice')];
    expect(nomes(ordenarPorNome(lista))).toEqual(['alice', 'Álvaro', 'bruno', 'Carla']);
  });

  it('desempata nomes equivalentes pelo id', () => {
    const lista = [ficha(7, 'Sombra'), ficha(3, 'sombra'), ficha(5, 'SOMBRA')];
    expect(ordenarPorNome(lista).map((item) => item.id)).toEqual([3, 5, 7]);
  });

  it('não altera a lista recebida', () => {
    const lista = [ficha(1, 'B'), ficha(2, 'A')];
    ordenarPorNome(lista);
    expect(nomes(lista)).toEqual(['B', 'A']);
  });
});
