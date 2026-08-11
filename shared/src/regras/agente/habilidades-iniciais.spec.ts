import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import { listarPacotesHabilidadesIniciais } from './habilidades-iniciais';

describe('listarPacotesHabilidadesIniciais', () => {
  it('oferece os três pacotes convencionais com suas vagas exatas', () => {
    const pacotes = listarPacotesHabilidadesIniciais(ClasseEnum.COMBATENTE);

    expect(pacotes).toEqual([
      { id: 'QUATRO_GERAIS', rotulo: '4 Gerais', vagas: [{ tipo: 'geral', quantidade: 4 }] },
      {
        id: 'DUAS_GERAIS_UMA_CLASSE_OU_ARQUETIPO',
        rotulo: '2 Gerais + 1 de Classe/Arquétipo',
        vagas: [
          { tipo: 'geral', quantidade: 2 },
          { tipo: 'classeOuArquetipo', quantidade: 1 },
        ],
      },
      {
        id: 'DUAS_CLASSE_OU_ARQUETIPO',
        rotulo: '2 de Classe/Arquétipo',
        vagas: [{ tipo: 'classeOuArquetipo', quantidade: 2 }],
      },
    ]);
  });

  it.each([
    ClasseEnum.ESPECIALISTA,
    ClasseEnum.SUPORTE,
    ClasseEnum.EXPERIMENTO_BESTIAL,
    ClasseEnum.EXPERIMENTO_ARTIFICIAL,
    ClasseEnum.EXPERIMENTO_HIBRIDO,
  ])('aplica os pacotes convencionais a %s', (classe) => {
    expect(listarPacotesHabilidadesIniciais(classe)).toHaveLength(3);
  });

  it.each([ClasseEnum.EXPERIMENTO_BESTIAL, ClasseEnum.EXPERIMENTO_ARTIFICIAL, ClasseEnum.EXPERIMENTO_HIBRIDO])(
    'pra %s, o rótulo do pacote vira "Classe/Subclasse" (não "Classe/Arquétipo")',
    (classe) => {
      const pacotes = listarPacotesHabilidadesIniciais(classe);
      expect(pacotes.find((p) => p.id === 'DUAS_GERAIS_UMA_CLASSE_OU_ARQUETIPO')?.rotulo).toBe(
        '2 Gerais + 1 de Classe/Subclasse',
      );
      expect(pacotes.find((p) => p.id === 'DUAS_CLASSE_OU_ARQUETIPO')?.rotulo).toBe('2 de Classe/Subclasse');
    },
  );

  it('oferece somente três habilidades civis ao Civil', () => {
    expect(listarPacotesHabilidadesIniciais(ClasseEnum.CIVIL)).toEqual([
      { id: 'TRES_CIVIS', rotulo: '3 Civis', vagas: [{ tipo: 'civil', quantidade: 3 }] },
    ]);
  });
});
