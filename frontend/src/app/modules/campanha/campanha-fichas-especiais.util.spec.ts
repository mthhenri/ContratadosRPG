import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  CategoriaNpcEnum,
  ClasseEnum,
  ComportamentoCriaturaEnum,
  NivelAmeacaEnum,
  PorteCriaturaEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { montarCriaturaEsquadrao, montarNpcEsquadrao, npcTemEnergia } from './campanha-fichas-especiais.util';

describe('campanha-fichas-especiais.util', () => {
  const base: FichaResumoDto = {
    id: 9,
    campanhaId: 2,
    campanhaNome: null,
    usuarioId: 1,
    nome: 'Aberração',
    imagemUrl: null,
    classe: ClasseEnum.COMBATENTE,
    arquetipo: null,
    nivel: 4,
    vidaAtual: 20,
    vidaMaxima: 30,
    energiaAtual: 6,
    energiaMaxima: 10,
    morrendo: false,
    machucado: false,
    inconsciente: false,
  };

  describe('montarCriaturaEsquadrao', () => {
    it('traduz registro, porte, comportamento e NA e leva só a Defesa', () => {
      const dados = montarCriaturaEsquadrao({
        ...base,
        tipo: TipoFichaEnum.CRIATURA,
        registro: ' SCP-049 ',
        porte: PorteCriaturaEnum.GRANDE,
        comportamento: ComportamentoCriaturaEnum.CACADORA,
        na: NivelAmeacaEnum.MEDIA,
        defesa: 12,
      });
      expect(dados.registroTexto).toBe('SCP-049');
      expect(dados.porteTexto).toBe('Grande');
      expect(dados.comportamentoTexto).toBe('Caçadora');
      expect(dados.naTexto).toBe('Média');
      expect(dados.defesa).toBe(12);
      expect(dados.critico).toBe(false);
    });

    it('usa o placeholder do acervo sem registro e traço sem classificação; crítico com Vida ≤ 0', () => {
      const dados = montarCriaturaEsquadrao({ ...base, tipo: TipoFichaEnum.CRIATURA, vidaAtual: 0 });
      expect(dados.registroTexto).toBe('SCP - ?????');
      expect(dados.porteTexto).toBe('—');
      expect(dados.naTexto).toBe('—');
      expect(dados.critico).toBe(true);
    });
  });

  describe('montarNpcEsquadrao', () => {
    const npc: FichaResumoDto = {
      ...base,
      id: 8,
      nome: 'Helena',
      tipo: TipoFichaEnum.NPC,
      categoria: CategoriaNpcEnum.VETERANO,
      defesa: 14,
      esquiva: 9,
      bloqueio: 11,
    };

    it('põe a categoria na linha superior e o nível na linha de classe, com Def/Esq/Blo e sem Contra-Ataque', () => {
      const dados = montarNpcEsquadrao(npc);
      expect(dados.donoNome).toBe('Veterano');
      expect(dados.classeTexto).toBe('Nível 4');
      expect([dados.defesa, dados.esquiva, dados.bloqueio]).toEqual([14, 9, 11]);
      expect(dados.contraAtaque).toBeUndefined();
      expect(dados.usuarioId).toBe(1);
    });

    it('só o Civil fica sem Energia', () => {
      expect(npcTemEnergia(npc)).toBe(true);
      expect(npcTemEnergia({ ...npc, categoria: CategoriaNpcEnum.CIVIL })).toBe(false);
    });
  });
});
