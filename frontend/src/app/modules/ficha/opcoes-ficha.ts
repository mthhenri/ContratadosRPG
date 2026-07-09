import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';

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
