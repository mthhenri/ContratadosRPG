import type { EncontroCombatenteResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import {
  ArquetipoEnum,
  CadenciaEnum,
  ClasseEnum,
  CombatenteOrigemEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import {
  combatenteTemIdentidadeVisivel,
  defesasDoCombatente,
  linhaOrigemDoCombatente,
  siglaDoCombatente,
  turnosPorRodadaDoCombatente,
} from './encontro-leitura.util';

/**
 * Prova as leituras puras compartilhadas pelo cartão, pela trilha e pela ficha resumida do mestre
 * (`ui-37`) — extraídas do cartão sem mudar o que ele mostra.
 */
describe('encontro-leitura.util', () => {
  const base: EncontroCombatenteResumoDto = {
    id: 1,
    encontroId: 9,
    origem: CombatenteOrigemEnum.FICHA,
    fichaId: 40,
    tipoFicha: TipoFichaEnum.JOGADOR,
    nome: 'K. Amaral',
    iniciativa: 18,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: 1,
    vidaAtual: 31,
    vidaMaxima: 31,
    energiaAtual: 6,
    energiaMaxima: 16,
    defesa: 14,
    esquiva: 15,
    bloqueio: 6,
    contraAtaque: 9,
    condicoes: [],
    morrendo: false,
    machucado: false,
    inconsciente: false,
    destreza: 4,
    iniciativaBonus: 0,
    dadoExtraIniciativa: 0,
    iniciativaFormulaCustom: null,
    corFicha: null,
    imagemUrl: null,
    imagemFoco: null,
    donoNome: null,
    classe: null,
    arquetipo: null,
    resistencias: null,
    revelado: true,
  };

  describe('turnosPorRodadaDoCombatente', () => {
    it('deixa o motor decidir nas Cadências fixas', () => {
      expect(turnosPorRodadaDoCombatente({ ...base, cadencia: CadenciaEnum.SINGULAR })).toBe(1);
      expect(turnosPorRodadaDoCombatente({ ...base, cadencia: CadenciaEnum.DUPLA })).toBe(2);
    });

    it('lê o número próprio da Frenética, com o piso de 4 turnos', () => {
      const frenetica = { ...base, cadencia: CadenciaEnum.FRENETICA };
      expect(turnosPorRodadaDoCombatente({ ...frenetica, turnosPorRodada: 6 })).toBe(6);
      expect(turnosPorRodadaDoCombatente({ ...frenetica, turnosPorRodada: 2 })).toBe(4);
      expect(turnosPorRodadaDoCombatente(frenetica)).toBe(4);
    });
  });

  describe('linhaOrigemDoCombatente', () => {
    it('mostra dono e classe do agente em duas linhas', () => {
      const linha = linhaOrigemDoCombatente({
        ...base,
        donoNome: 'Ana',
        classe: ClasseEnum.COMBATENTE,
        arquetipo: ArquetipoEnum.MERCENARIO,
      });

      expect(linha.startsWith('Ana\n')).toBe(true);
      expect(linha.split('\n')).toHaveLength(2);
    });

    it('cai em "Agente" quando a classe não chegou', () => {
      expect(linhaOrigemDoCombatente({ ...base, donoNome: 'Ana' })).toBe('Ana\nAgente');
    });

    it('diz de onde vieram os demais, numa linha só', () => {
      expect(linhaOrigemDoCombatente({ ...base, tipoFicha: TipoFichaEnum.CRIATURA })).toBe(
        'Criatura da campanha',
      );
      expect(
        linhaOrigemDoCombatente({
          ...base,
          origem: CombatenteOrigemEnum.AVULSO,
          tipoFicha: null,
          fichaId: null,
        }),
      ).toBe('Digitado nesta sessão');
      expect(linhaOrigemDoCombatente({ ...base, tipoFicha: TipoFichaEnum.NPC })).toBe(
        'Adicionado pelo mestre',
      );
      expect(linhaOrigemDoCombatente(base)).toBe('Agente');
    });

    it('não revela nada de quem não está revelado e sem carteirinha', () => {
      expect(
        linhaOrigemDoCombatente({ ...base, tipoFicha: TipoFichaEnum.CRIATURA, revelado: false }),
      ).toBe('Em campo');
    });
  });

  it('a carteirinha só existe para agente com dono visível', () => {
    expect(combatenteTemIdentidadeVisivel({ ...base, donoNome: 'Ana' })).toBe(true);
    expect(combatenteTemIdentidadeVisivel(base)).toBe(false);
    expect(
      combatenteTemIdentidadeVisivel({ ...base, tipoFicha: TipoFichaEnum.CRIATURA, donoNome: 'Ana' }),
    ).toBe(false);
  });

  describe('defesasDoCombatente', () => {
    it('lista as quatro do agente, com nome curto e por extenso', () => {
      const defesas = defesasDoCombatente(base);

      expect(defesas.map((defesa) => defesa.rotulo)).toEqual([
        'Defesa',
        'Esquiva',
        'Bloqueio',
        'Contra',
      ]);
      expect(defesas.map((defesa) => defesa.rotuloCurto)).toEqual(['Def', 'Esq', 'Blo', 'Con']);
      expect(defesas[3].rotuloExtenso).toBe('Contra-ataque');
      expect(defesas.map((defesa) => defesa.valor)).toEqual([14, 15, 6, 9]);
    });

    it('a criatura só tem Defesa (a regra vence o mockup) e o avulso, nenhuma', () => {
      const criatura = { ...base, esquiva: null, bloqueio: null, contraAtaque: null };
      expect(defesasDoCombatente(criatura).map((defesa) => defesa.rotulo)).toEqual(['Defesa']);
      expect(defesasDoCombatente({ ...criatura, defesa: null })).toEqual([]);
    });
  });

  describe('siglaDoCombatente', () => {
    it('usa a inicial da primeira e da última palavra, ignorando aspas', () => {
      expect(siglaDoCombatente('Marco "Aço" Kessler')).toBe('MK');
      expect(siglaDoCombatente('Carter "Fumaça"')).toBe('CF');
      // A inicial acentuada é mantida: `Í`, não `I`.
      expect(siglaDoCombatente('Íris Marclair')).toBe('ÍM');
      expect(siglaDoCombatente('Vetor de Contenção')).toBe('VC');
    });

    it('usa as duas primeiras letras de um nome de uma palavra só', () => {
      expect(siglaDoCombatente('Sujeito')).toBe('SU');
      expect(siglaDoCombatente('SCP-1471-A')).toBe('SC');
    });

    it('não quebra com nome vazio', () => {
      expect(siglaDoCombatente('   ')).toBe('?');
    });
  });
});
