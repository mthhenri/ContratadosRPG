import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import {
  HABILIDADES_ARQUETIPO,
  HABILIDADES_CLASSE,
  HABILIDADES_GERAIS,
  HABILIDADES_GERAIS_MELHORADAS,
  HABILIDADES_SUBCLASSE,
  type HabilidadeBaseDto,
} from './habilidades-catalogo.dados';

/**
 * Resolve os grupos de filtro do **seletor de habilidades do sistema** para uma ficha
 * (`sistema-v4.1.0.md` — "Habilidades"). Regra pura, sem dependências — a UI só renderiza o que
 * esta função devolve.
 *
 * Alcance de cada aba (definido pelos picks de nível 5/10/15/20 — "outra classe" ou "outro
 * arquétipo da sua classe"):
 * - **Gerais**: sempre (um subgrupo único).
 * - **Classe**: as três classes-base (a sua em `ehDaFicha`), para o pick de "outra classe".
 * - **Arquétipo**: **só os arquétipos da classe da ficha** (o pick de "outro arquétipo da sua
 *   classe"); nunca os de outra classe. As **Gerais Melhoradas** aparecem só no subgrupo do
 *   **próprio** arquétipo. Se a ficha é um **Experimento**, a aba inclui a **própria subclasse**
 *   (nível de arquétipo) + os arquétipos da classe-base, e **nunca** outras subclasses.
 */

/** Uma habilidade do catálogo já com categoria e origem resolvidas (pronta p/ virar `FichaHabilidadeDto`). */
export interface HabilidadeCatalogoItemDto extends HabilidadeBaseDto {
  readonly categoria: HabilidadeCategoriaEnum;
  /** Classe/arquétipo/subclasse-fonte; ausente nas Gerais (que não têm origem nomeada). */
  readonly origem?: ClasseEnum | ArquetipoEnum;
}

/** Subgrupo do seletor — um chip do sub-filtro inline (a Gerais tem chave `null`). */
export interface SubgrupoHabilidades {
  readonly chave: ClasseEnum | ArquetipoEnum | null;
  /** `true` quando é a classe/arquétipo/subclasse da própria ficha (destaque + ativo por padrão). */
  readonly ehDaFicha: boolean;
  readonly habilidades: readonly HabilidadeCatalogoItemDto[];
}

/** Grupo do seletor — uma aba (Gerais / Classe / Arquétipo). */
export interface GrupoHabilidades {
  readonly id: 'gerais' | 'classe' | 'arquetipo';
  readonly subgrupos: readonly SubgrupoHabilidades[];
}

/** As três classes-base, na ordem de exibição. */
const CLASSES_BASE: readonly ClasseEnum[] = [
  ClasseEnum.COMBATENTE,
  ClasseEnum.ESPECIALISTA,
  ClasseEnum.SUPORTE,
];

/** Arquétipos de cada classe-base. */
const ARQUETIPOS_POR_CLASSE_BASE: Readonly<Record<ClasseEnum, readonly ArquetipoEnum[]>> = {
  [ClasseEnum.COMBATENTE]: [ArquetipoEnum.LUTADOR, ArquetipoEnum.MERCENARIO, ArquetipoEnum.VANGUARDA],
  [ClasseEnum.ESPECIALISTA]: [ArquetipoEnum.ENGENHEIRO, ArquetipoEnum.ASSASSINO, ArquetipoEnum.ACADEMICO],
  [ClasseEnum.SUPORTE]: [ArquetipoEnum.PARAMEDICO, ArquetipoEnum.DIPLOMATA, ArquetipoEnum.COMANDANTE],
  [ClasseEnum.EXPERIMENTO_BESTIAL]: [],
  [ClasseEnum.EXPERIMENTO_ARTIFICIAL]: [],
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: [],
  [ClasseEnum.CIVIL]: [],
};

/** Classe-base de cada subclasse Experimento (herda as habilidades de classe e os arquétipos dela). */
const CLASSE_BASE_DA_SUBCLASSE: Partial<Record<ClasseEnum, ClasseEnum>> = {
  [ClasseEnum.EXPERIMENTO_BESTIAL]: ClasseEnum.COMBATENTE,
  [ClasseEnum.EXPERIMENTO_ARTIFICIAL]: ClasseEnum.ESPECIALISTA,
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: ClasseEnum.SUPORTE,
};

/** Marca cada habilidade base com uma categoria e (opcional) origem. */
function comCategoria(
  habilidades: readonly HabilidadeBaseDto[],
  categoria: HabilidadeCategoriaEnum,
  origem?: ClasseEnum | ArquetipoEnum,
): HabilidadeCatalogoItemDto[] {
  return habilidades.map((habilidade) => ({ ...habilidade, categoria, origem }));
}

/**
 * A classe-base efetiva da ficha para fins de habilidades: a própria (se base), a base da subclasse
 * (se Experimento) ou `null` (Civil). Exportada para a UI decidir se uma habilidade de classe é "da
 * sua classe" (chip "Classe") ou de outra (chip "Classe - NOME").
 */
export function classeBaseDeHabilidades(classe: ClasseEnum): ClasseEnum | null {
  if (CLASSES_BASE.includes(classe)) {
    return classe;
  }
  return CLASSE_BASE_DA_SUBCLASSE[classe] ?? null;
}

/** Grupo **Gerais** — subgrupo único (chave `null`), sempre disponível. */
function grupoGerais(): GrupoHabilidades {
  return {
    id: 'gerais',
    subgrupos: [
      {
        chave: null,
        ehDaFicha: true,
        habilidades: comCategoria(HABILIDADES_GERAIS, HabilidadeCategoriaEnum.GERAL),
      },
    ],
  };
}

/**
 * Grupo **Classe** — as três classes-base; a da ficha primeiro e marcada. Só para agentes: uma
 * ficha sem classe-base (Civil) não tem acesso a habilidades de classe, então o grupo é omitido.
 */
function grupoClasse(classe: ClasseEnum): GrupoHabilidades {
  const base = classeBaseDeHabilidades(classe);
  if (base === null) {
    return { id: 'classe', subgrupos: [] };
  }
  const subgrupos = CLASSES_BASE.map((classeBase) => ({
    chave: classeBase,
    ehDaFicha: classeBase === base,
    habilidades: comCategoria(
      HABILIDADES_CLASSE[classeBase],
      HabilidadeCategoriaEnum.CLASSE,
      classeBase,
    ),
  })).filter((subgrupo) => subgrupo.habilidades.length > 0);

  return { id: 'classe', subgrupos: ordenarDaFichaPrimeiro(subgrupos) };
}

/**
 * Grupo **Arquétipo** — só os arquétipos da classe da ficha; a subclasse Experimento entra como um
 * subgrupo próprio. As Gerais Melhoradas só entram no subgrupo do arquétipo da ficha.
 */
function grupoArquetipo(
  classe: ClasseEnum,
  arquetipo: ArquetipoEnum | null,
): GrupoHabilidades {
  const base = classeBaseDeHabilidades(classe);
  const subgrupos: SubgrupoHabilidades[] = [];

  // Ficha Experimento: a própria subclasse primeiro (nível de arquétipo). Outras subclasses nunca entram.
  const habilidadesSubclasse = HABILIDADES_SUBCLASSE[classe];
  if (habilidadesSubclasse && habilidadesSubclasse.length > 0) {
    subgrupos.push({
      chave: classe,
      ehDaFicha: true,
      habilidades: comCategoria(habilidadesSubclasse, HabilidadeCategoriaEnum.SUBCLASSE, classe),
    });
  }

  // Arquétipos regulares da classe-base.
  if (base) {
    for (const arq of ARQUETIPOS_POR_CLASSE_BASE[base]) {
      const ehDaFicha = arq === arquetipo;
      const melhoradas = ehDaFicha
        ? comCategoria(
            HABILIDADES_GERAIS_MELHORADAS[arq],
            HabilidadeCategoriaEnum.GERAL_MELHORADA,
            arq,
          )
        : [];
      subgrupos.push({
        chave: arq,
        ehDaFicha,
        habilidades: [
          ...comCategoria(HABILIDADES_ARQUETIPO[arq], HabilidadeCategoriaEnum.ARQUETIPO, arq),
          ...melhoradas,
        ],
      });
    }
  }

  return {
    id: 'arquetipo',
    subgrupos: ordenarDaFichaPrimeiro(subgrupos.filter((subgrupo) => subgrupo.habilidades.length > 0)),
  };
}

/** Ordena os subgrupos com o(s) da ficha na frente, preservando a ordem relativa do resto. */
function ordenarDaFichaPrimeiro(subgrupos: SubgrupoHabilidades[]): SubgrupoHabilidades[] {
  return [
    ...subgrupos.filter((subgrupo) => subgrupo.ehDaFicha),
    ...subgrupos.filter((subgrupo) => !subgrupo.ehDaFicha),
  ];
}

/**
 * Grupos de filtro do seletor de habilidades para a ficha (classe + arquétipo). Grupos sem
 * conteúdo são omitidos (ex.: Civil não tem Classe/Arquétipo).
 */
export function catalogoHabilidades(
  classe: ClasseEnum,
  arquetipo: ArquetipoEnum | null,
): GrupoHabilidades[] {
  return [grupoGerais(), grupoClasse(classe), grupoArquetipo(classe, arquetipo)].filter(
    (grupo) => grupo.subgrupos.length > 0,
  );
}
