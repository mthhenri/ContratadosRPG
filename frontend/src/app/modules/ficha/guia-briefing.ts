import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';

/**
 * Texto-guia (descrição narrativa curta) de cada classe/registro e arquétipo, usado no passo
 * 02 // CLASSE do guia de criação (m3-57) para apresentar o perfil antes da escolha ser
 * confirmada. Citações literais de `docs/core/sistema-v4.1.0.md` — "Classes e Arquétipos" e
 * "Jogando como um Civil" — sem paráfrase de regra; puro texto de apresentação, não é regra de
 * jogo (o documento continua sendo a fonte de verdade das mecânicas).
 */

/** Descrição de flavor de cada classe/registro (inclui as três subclasses de Experimento). */
const DESCRICAO_CLASSE: Record<ClasseEnum, string> = {
  [ClasseEnum.COMBATENTE]:
    'O especialista em ofensiva. Aquele que parte para o ataque sem hesitar. É quem coloca a cara à tapa e lidera o avanço. Causando alto dano e encarando o combate de frente, mesmo que signifique tomar umas boas porradas.',
  [ClasseEnum.ESPECIALISTA]:
    'A versatilidade em pessoa. Sendo desde uma sombra na linha de frente até o mais intelectual dos agentes. Tendo um conhecimento técnico forte e a sagacidade no pensar.',
  [ClasseEnum.SUPORTE]:
    'Aquele que estende a mão para seus aliados, dando o "empurrãozinho" que todos precisam. Curando cicatrizes visíveis e invisíveis de seus companheiros e concedendo a força necessária para dar um passo à frente.',
  [ClasseEnum.EXPERIMENTO_BESTIAL]:
    'O resultado de experimentos corporais extremos. Carne reforçada, músculos reestruturados e reflexos que beiram o sobrenatural. Representando o ápice da brutalidade física, um Combatente que não apenas luta, ele devora o campo de batalha.',
  [ClasseEnum.EXPERIMENTO_ARTIFICIAL]:
    'Um especialista reconstruído pelo anômalo. Carne ajustada, lógica calibrada e ecos de criaturas integrados ao corpo. Não é máquina, é perfeição fabricada, projetada para superar limites humanos.',
  [ClasseEnum.EXPERIMENTO_HIBRIDO]:
    'Nem humano, nem monstro. Algo perfeitamente equilibrado, em constante mutação. Um Suporte que se funde com o que o cerca, adaptando-se, moldando-se e compartilhando sua própria vitalidade com aliados.',
  [ClasseEnum.CIVIL]:
    'Ser um civil é retornar ao ponto zero: um ser humano comum e frágil, sem classe, arquétipo ou habilidades de agente. Se prepare para correr pela sua vida.',
};

/** Foco de cada arquétipo (subtítulo curto do doc — "Foco em ..."). */
const FOCO_ARQUETIPO: Record<ArquetipoEnum, string> = {
  [ArquetipoEnum.LUTADOR]: 'Foco em armas corpo a corpo.',
  [ArquetipoEnum.MERCENARIO]: 'Foco em armas de fogo.',
  [ArquetipoEnum.VANGUARDA]: 'Foco em defesa e resistências.',
  [ArquetipoEnum.ENGENHEIRO]: 'Foco em equipamentos e explosivos.',
  [ArquetipoEnum.ASSASSINO]: 'Foco em furtividade.',
  [ArquetipoEnum.ACADEMICO]: 'Foco em investigação e análise.',
  [ArquetipoEnum.PARAMEDICO]: 'Foco em cura.',
  [ArquetipoEnum.DIPLOMATA]: 'Foco em interpessoal e mental.',
  [ArquetipoEnum.COMANDANTE]: 'Foco em buffs e auxílio.',
};

/** Texto-guia da classe/registro selecionado (sempre existe — as sete classes têm descrição). */
export function descricaoClasse(classe: ClasseEnum): string {
  return DESCRICAO_CLASSE[classe];
}

/** Foco do arquétipo selecionado, quando houver. */
export function focoArquetipo(arquetipo: ArquetipoEnum): string {
  return FOCO_ARQUETIPO[arquetipo];
}
