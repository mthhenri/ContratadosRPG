import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import { perfilClasseRotulos } from './rotulos-ficha';

describe('perfilClasseRotulos', () => {
  it('separa Especialista e Experimento Artificial', () => {
    expect(perfilClasseRotulos(ClasseEnum.EXPERIMENTO_ARTIFICIAL, null)).toEqual({
      classeBase: 'Especialista',
      subclasse: 'Experimento Artificial',
    });
  });

  it('separa classe-base e arquétipo', () => {
    expect(perfilClasseRotulos(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR)).toEqual({
      classeBase: 'Combatente',
      subclasse: 'Lutador',
    });
  });

  it('mantém uma classe sem subclasse em um único rótulo', () => {
    expect(perfilClasseRotulos(ClasseEnum.CIVIL, null)).toEqual({ classeBase: 'Civil', subclasse: null });
  });
});
