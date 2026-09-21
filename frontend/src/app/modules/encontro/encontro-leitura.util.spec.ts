import type {
  EncontroCombatenteResumoDto,
  EncontroRecuperadoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import {
  ArquetipoEnum,
  CadenciaEnum,
  ClasseEnum,
  CombatenteOrigemEnum,
  EncontroStatusEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import {
  combatenteTemIdentidadeVisivel,
  defesasDoCombatente,
  linhaOrigemDoCombatente,
  resolverFichaParaAbrir,
  siglaDoCombatente,
  turnosAteAVez,
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

  describe('turnosAteAVez', () => {
    // 1(1º) → 2 → 1(2º) → 3 — a criatura de Cadência Dupla intercalada entre dois agentes.
    const ativo: EncontroRecuperadoDto = {
      id: 1,
      campanhaId: 9,
      nome: 'Contenção no Setor 12',
      status: EncontroStatusEnum.ATIVO,
      rodadaAtual: 2,
      turnoIndice: 1,
      combatentes: [],
      ordemRodada: [
        { combatenteId: 1, ocorrencia: 1 },
        { combatenteId: 2, ocorrencia: 1 },
        { combatenteId: 1, ocorrencia: 2 },
        { combatenteId: 3, ocorrencia: 1 },
      ],
      eventos: [],
    };

    it('é zero quando a vez é do próprio combatente', () => {
      expect(turnosAteAVez(ativo, 2)).toBe(0);
    });

    it('conta os slots até o próximo do combatente', () => {
      expect(turnosAteAVez(ativo, 1)).toBe(1); // o 2º turno da criatura é o slot seguinte
      expect(turnosAteAVez(ativo, 3)).toBe(2);
    });

    it('de quem tem vários slots vale o mais próximo', () => {
      expect(turnosAteAVez({ ...ativo, turnoIndice: 2 }, 1)).toBe(0);
      expect(turnosAteAVez({ ...ativo, turnoIndice: 3 }, 1)).toBe(1); // vira a rodada: 1º slot
    });

    it('vira a rodada quando o próprio slot já passou', () => {
      // turnoIndice 2: K. Amaral (slot 1) já agiu — falta a rodada seguinte: 3 slots à frente.
      expect(turnosAteAVez({ ...ativo, turnoIndice: 2 }, 2)).toBe(3);
    });

    it('é nulo fora do combate ou quando o combatente não está na ordem', () => {
      expect(turnosAteAVez({ ...ativo, status: EncontroStatusEnum.MONTAGEM }, 2)).toBeNull();
      expect(turnosAteAVez({ ...ativo, status: EncontroStatusEnum.ENCERRADO }, 2)).toBeNull();
      expect(turnosAteAVez(ativo, 99)).toBeNull();
      expect(turnosAteAVez(null, 2)).toBeNull();
    });
  });

  describe('resolverFichaParaAbrir', () => {
    const fichas = [
      { id: 100, usuarioId: 7 },
      { id: 200, usuarioId: 8 },
    ];

    it('devolve o alvo com o dono vindo do resumo já carregado', () => {
      expect(resolverFichaParaAbrir(100, TipoFichaEnum.JOGADOR, fichas)).toEqual({
        fichaId: 100,
        tipo: TipoFichaEnum.JOGADOR,
        usuarioIdDono: 7,
      });
      expect(resolverFichaParaAbrir(200, TipoFichaEnum.CRIATURA, fichas)?.usuarioIdDono).toBe(8);
    });

    it('não há o que abrir para avulso, NPC ou ficha que quem consulta não vê', () => {
      expect(resolverFichaParaAbrir(100, null, fichas)).toBeNull();
      expect(resolverFichaParaAbrir(100, TipoFichaEnum.NPC, fichas)).toBeNull();
      expect(resolverFichaParaAbrir(999, TipoFichaEnum.JOGADOR, fichas)).toBeNull();
    });
  });
});
