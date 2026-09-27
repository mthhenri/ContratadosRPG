import { segmentarTrecho } from './trecho-destacado';

/** Prova a segmentação do trecho da busca (m9-05): texto puro por segmento, sem HTML. */
describe('segmentarTrecho', () => {
  it('separa o texto dos destaques entre ⟦ ⟧', () => {
    expect(segmentarTrecho('o ⟦galpão⟧ do ⟦porto⟧ ao norte')).toEqual([
      { texto: 'o ', destaque: false },
      { texto: 'galpão', destaque: true },
      { texto: ' do ', destaque: false },
      { texto: 'porto', destaque: true },
      { texto: ' ao norte', destaque: false },
    ]);
  });

  it('sem marcadores, devolve o trecho inteiro sem destaque', () => {
    expect(segmentarTrecho('nada a destacar')).toEqual([
      { texto: 'nada a destacar', destaque: false },
    ]);
  });

  it('mantém HTML do conteúdo como texto literal', () => {
    expect(segmentarTrecho('<img src=x onerror=alert(1)> ⟦<b>⟧')).toEqual([
      { texto: '<img src=x onerror=alert(1)> ', destaque: false },
      { texto: '<b>', destaque: true },
    ]);
  });

  it('tolera marcadores desbalanceados e não gera segmentos vazios', () => {
    expect(segmentarTrecho('⟧início ⟦corte')).toEqual([
      { texto: 'início ', destaque: false },
      { texto: 'corte', destaque: true },
    ]);
    expect(segmentarTrecho('⟦⟧')).toEqual([]);
    expect(segmentarTrecho('')).toEqual([]);
  });
});
