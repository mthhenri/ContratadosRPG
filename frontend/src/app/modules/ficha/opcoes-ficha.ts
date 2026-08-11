import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import { classeBaseDeHabilidades, subclasseExperimentoDaClasseBase } from '@contratados-rpg/shared/regras/agente';
import { rotuloClasse } from './rotulos-ficha';

/**
 * Opções de **classe** e **arquétipo** dos `<select>` da ficha (rótulos legíveis, mesma grafia da
 * calculadora). Fonte única compartilhada pela edição no próprio lugar (`FichaVisualizacao`) e pelo
 * formulário legado — nenhuma regra de jogo aqui, só o mapa de opções de UI.
 */

/** Opção de arquétipo (só para as três classes base). */
export interface OpcaoArquetipo {
  readonly valor: ArquetipoEnum;
  readonly rotulo: string;
}

/** Grupo de classes do `<select>` (agrupado por família, como na calculadora). */
export interface GrupoClasse {
  readonly rotulo: string;
  readonly opcoes: readonly { readonly valor: ClasseEnum; readonly rotulo: string }[];
}

/** Classes agrupadas por família para o `<select>` de classe/registro. */
export const GRUPOS_CLASSE: readonly GrupoClasse[] = [
  {
    rotulo: 'Classes Base',
    opcoes: [
      { valor: ClasseEnum.COMBATENTE, rotulo: 'Combatente' },
      { valor: ClasseEnum.ESPECIALISTA, rotulo: 'Especialista' },
      { valor: ClasseEnum.SUPORTE, rotulo: 'Suporte' },
    ],
  },
  {
    rotulo: 'Subclasses de Experimento',
    opcoes: [
      { valor: ClasseEnum.EXPERIMENTO_BESTIAL, rotulo: 'Experimento Bestial' },
      { valor: ClasseEnum.EXPERIMENTO_ARTIFICIAL, rotulo: 'Experimento Artificial' },
      { valor: ClasseEnum.EXPERIMENTO_HIBRIDO, rotulo: 'Experimento Híbrido' },
    ],
  },
  {
    rotulo: 'Não-Agentes',
    opcoes: [{ valor: ClasseEnum.CIVIL, rotulo: 'Civil' }],
  },
];

/** Arquétipos por classe base — vazio para Experimentos e Civil (sem arquétipo). */
export const ARQUETIPOS_POR_CLASSE: Partial<Record<ClasseEnum, readonly OpcaoArquetipo[]>> = {
  [ClasseEnum.COMBATENTE]: [
    { valor: ArquetipoEnum.LUTADOR, rotulo: 'Lutador' },
    { valor: ArquetipoEnum.MERCENARIO, rotulo: 'Mercenário' },
    { valor: ArquetipoEnum.VANGUARDA, rotulo: 'Vanguarda' },
  ],
  [ClasseEnum.ESPECIALISTA]: [
    { valor: ArquetipoEnum.ENGENHEIRO, rotulo: 'Engenheiro' },
    { valor: ArquetipoEnum.ASSASSINO, rotulo: 'Assassino' },
    { valor: ArquetipoEnum.ACADEMICO, rotulo: 'Acadêmico' },
  ],
  [ClasseEnum.SUPORTE]: [
    { valor: ArquetipoEnum.PARAMEDICO, rotulo: 'Paramédico' },
    { valor: ArquetipoEnum.DIPLOMATA, rotulo: 'Diplomata' },
    { valor: ArquetipoEnum.COMANDANTE, rotulo: 'Comandante' },
  ],
};

/** Arquétipos válidos de uma classe (vazio quando a classe não tem arquétipo). */
export function arquetiposDaClasse(classe: ClasseEnum): readonly OpcaoArquetipo[] {
  return ARQUETIPOS_POR_CLASSE[classe] ?? [];
}

/** `true` quando a classe é uma das três base (tem arquétipo). */
export function ehClasseBase(classe: ClasseEnum): boolean {
  return ARQUETIPOS_POR_CLASSE[classe] !== undefined;
}

/**
 * Opção da segunda etapa do seletor de Classe em dois passos (P-019): um arquétipo regular, ou a
 * subclasse de Experimento da base — as duas formas de completar o perfil, nunca as duas ao mesmo
 * tempo (`sistema-v4.1.0.md` — "⬡ Subclasse": "abdicar de ganhar o seu arquétipo tornando a sua
 * subclasse o seu arquétipo").
 */
export interface OpcaoPerfilClasse {
  readonly valor: ArquetipoEnum | ClasseEnum;
  readonly tipo: 'arquetipo' | 'subclasse';
  readonly rotulo: string;
}

/** Grupo (optgroup) da segunda etapa do seletor de Classe. */
export interface GrupoPerfilClasse {
  readonly rotulo: string;
  readonly opcoes: readonly OpcaoPerfilClasse[];
}

/**
 * Classes-base do **primeiro** select do seletor de Classe em dois passos (P-019): Combatente,
 * Especialista, Suporte ou Civil — a família da classe, sem misturar arquétipo/subclasse ainda (isso
 * é a segunda etapa, `gruposPerfilDaClasseBase`). Reflete o próprio fluxo descrito pelo doc
 * (`sistema-v4.1.0.md` — "⬡ Subclasse"): "Após escolher a sua classe você pode escolher tomar uma
 * subclasse e abdicar de ganhar o seu arquétipo".
 */
export const GRUPOS_CLASSE_BASE: readonly GrupoClasse[] = [
  {
    rotulo: 'Classes Base',
    opcoes: [
      { valor: ClasseEnum.COMBATENTE, rotulo: 'Combatente' },
      { valor: ClasseEnum.ESPECIALISTA, rotulo: 'Especialista' },
      { valor: ClasseEnum.SUPORTE, rotulo: 'Suporte' },
    ],
  },
  {
    rotulo: 'Não-Agentes',
    opcoes: [{ valor: ClasseEnum.CIVIL, rotulo: 'Civil' }],
  },
];

/**
 * Opções da **segunda** etapa do seletor de Classe em dois passos (P-019), para uma classe-base já
 * escolhida: os arquétipos regulares dela, e a subclasse de Experimento (quando existe) como um
 * segundo optgroup. `[]` para Civil (sem segunda etapa) ou para uma classe que já não é base.
 */
export function gruposPerfilDaClasseBase(classeBase: ClasseEnum): readonly GrupoPerfilClasse[] {
  const arquetipos = arquetiposDaClasse(classeBase);
  const subclasse = subclasseExperimentoDaClasseBase(classeBase);
  const grupos: GrupoPerfilClasse[] = [];
  if (arquetipos.length > 0) {
    grupos.push({
      rotulo: 'Arquétipos',
      opcoes: arquetipos.map((opcao) => ({ valor: opcao.valor, tipo: 'arquetipo' as const, rotulo: opcao.rotulo })),
    });
  }
  if (subclasse !== null) {
    grupos.push({
      rotulo: 'Subclasse',
      opcoes: [{ valor: subclasse, tipo: 'subclasse' as const, rotulo: rotuloClasse(subclasse) }],
    });
  }
  return grupos;
}

/**
 * Classe-base "efetiva" de uma classe já escolhida, para reabrir o primeiro select do seletor de
 * dois passos (P-019) no valor certo: a própria classe (base ou Civil), ou a base da subclasse de
 * Experimento (`classeBaseDeHabilidades`, mesma fonte do seletor de habilidades — nenhum mapa
 * duplicado aqui).
 */
export function classeBaseDoSeletor(classe: ClasseEnum): ClasseEnum {
  if (classe === ClasseEnum.CIVIL || ehClasseBase(classe)) {
    return classe;
  }
  return classeBaseDeHabilidades(classe) ?? classe;
}
