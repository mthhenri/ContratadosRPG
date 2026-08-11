import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import {
  HABILIDADES_ARQUETIPO,
  HABILIDADES_CIVIL,
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
 * - **Gerais**: sempre (um subgrupo único). Para o arquétipo da ficha, cada Geral com uma
 *   **versão melhorada** daquele arquétipo aparece **substituída** pela melhorada (mesma posição
 *   na lista) — ela conta como a mesma habilidade geral, só que com descrição/custo diferentes;
 *   para qualquer outro arquétipo (ou nenhum), a versão normal continua. Não existe "as duas" para
 *   o dono da melhorada: a comum simplesmente não é uma opção separada para ele.
 * - **Classe**: as três classes-base (a sua em `ehDaFicha`), para o pick de "outra classe".
 * - **Subclasse**: só existe pra fichas **Experimento** — a **própria subclasse** (nível de
 *   arquétipo), nunca outra (subclasses nunca cruzam). Aba própria, separada de Arquétipo (P-014
 *   follow-up: antes vivia junto dele como um sub-chip a mais; a UI já tinha essa distinção pronta
 *   em `HabilidadeCategoriaEnum.SUBCLASSE` vs. `ARQUETIPO`, só não estava refletida na aba).
 * - **Arquétipo**: **só os arquétipos da classe-base da ficha** (o pick de "outro arquétipo da sua
 *   classe"); nunca os de outra classe. A **Habilidade Inicial** (1º item de cada arquétipo) só
 *   aparece no subgrupo do **próprio** arquétipo — em qualquer outro ela **some da lista**, pois
 *   "não é possível obtê-la fora a seleção do próprio arquétipo" (doc). Pra um **Experimento**,
 *   nenhum subgrupo aqui é "da ficha" (a dela é a Subclasse) — a lista segue disponível porque a
 *   subclasse abdica do **próprio** arquétipo, não do acesso aos da classe-base.
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

/** Grupo do seletor — uma aba (Gerais / Classe / Subclasse / Arquétipo / Civil). */
export interface GrupoHabilidades {
  readonly id: 'gerais' | 'classe' | 'subclasse' | 'arquetipo' | 'civil';
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

/**
 * Grupo **Gerais** — subgrupo único (chave `null`), sempre disponível. Quando a ficha tem
 * arquétipo, cada Geral com uma melhorada daquele arquétipo é **substituída** pela melhorada na
 * mesma posição: ela conta como a habilidade geral, só que com outra descrição/custo — o dono da
 * melhorada nunca vê a versão comum ao lado da sua.
 */
function grupoGerais(arquetipo: ArquetipoEnum | null): GrupoHabilidades {
  const melhoradasPorNome = new Map(
    (arquetipo ? HABILIDADES_GERAIS_MELHORADAS[arquetipo] : []).map((melhorada) => [
      melhorada.nome,
      melhorada,
    ]),
  );
  const habilidades: HabilidadeCatalogoItemDto[] = HABILIDADES_GERAIS.map((geral) => {
    const melhorada = melhoradasPorNome.get(geral.nome);
    return melhorada
      ? { ...melhorada, categoria: HabilidadeCategoriaEnum.GERAL_MELHORADA, origem: arquetipo! }
      : { ...geral, categoria: HabilidadeCategoriaEnum.GERAL };
  });

  return {
    id: 'gerais',
    subgrupos: [{ chave: null, ehDaFicha: true, habilidades }],
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
 * Grupo **Subclasse** — só existe pra fichas Experimento: a própria subclasse (nível de arquétipo),
 * único subgrupo, sempre `ehDaFicha`. `[]` (aba omitida) pra qualquer classe sem subclasse — outras
 * subclasses nunca entram, mesmo sendo "outro Experimento" (elas nunca cruzam, doc).
 */
function grupoSubclasse(classe: ClasseEnum): GrupoHabilidades {
  const habilidadesSubclasse = HABILIDADES_SUBCLASSE[classe];
  if (!habilidadesSubclasse || habilidadesSubclasse.length === 0) {
    return { id: 'subclasse', subgrupos: [] };
  }
  return {
    id: 'subclasse',
    subgrupos: [
      {
        chave: classe,
        ehDaFicha: true,
        habilidades: comCategoria(habilidadesSubclasse, HabilidadeCategoriaEnum.SUBCLASSE, classe),
      },
    ],
  };
}

/**
 * Grupo **Arquétipo** — só os arquétipos da classe-base da ficha (a subclasse Experimento vive à
 * parte, em `grupoSubclasse`). A **Habilidade Inicial** (1º item) só entra no subgrupo do arquétipo
 * da ficha — nos demais, ela é removida (obtível só pelo próprio arquétipo). As Gerais Melhoradas
 * **não** entram aqui — elas vivem na aba Gerais, substituindo a versão comum (`grupoGerais`). Pra
 * um Experimento, nenhum subgrupo é `ehDaFicha` (o dela é a subclasse), mas a lista continua — a
 * subclasse abdica do próprio arquétipo, não do acesso aos da classe-base.
 */
function grupoArquetipo(
  classe: ClasseEnum,
  arquetipo: ArquetipoEnum | null,
): GrupoHabilidades {
  const base = classeBaseDeHabilidades(classe);
  if (!base) {
    return { id: 'arquetipo', subgrupos: [] };
  }

  const subgrupos = ARQUETIPOS_POR_CLASSE_BASE[base]
    .map((arq): SubgrupoHabilidades => {
      const ehDaFicha = arq === arquetipo;
      // A Habilidade Inicial (1º item) só existe para o próprio arquétipo: "não é possível obtê-la
      // fora a seleção do próprio arquétipo" (doc). Em outro arquétipo, ela sequer entra na lista.
      const habilidadesArquetipo = ehDaFicha
        ? HABILIDADES_ARQUETIPO[arq]
        : HABILIDADES_ARQUETIPO[arq].slice(1);
      return {
        chave: arq,
        ehDaFicha,
        habilidades: comCategoria(habilidadesArquetipo, HabilidadeCategoriaEnum.ARQUETIPO, arq),
      };
    })
    .filter((subgrupo) => subgrupo.habilidades.length > 0);

  return { id: 'arquetipo', subgrupos: ordenarDaFichaPrimeiro(subgrupos) };
}

/**
 * Grupo **Civil** — subgrupo único (chave `null`), lista fechada exclusiva de fichas Civis (doc:
 * "Civis não possuem classes, arquétipos ou habilidades gerais. Possuem acesso exclusivo à lista
 * de habilidades civis."). Nunca aparece para agentes.
 */
function grupoCivil(): GrupoHabilidades {
  return {
    id: 'civil',
    subgrupos: [
      {
        chave: null,
        ehDaFicha: true,
        habilidades: comCategoria(HABILIDADES_CIVIL, HabilidadeCategoriaEnum.CIVIL),
      },
    ],
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
 * Grupos de filtro do seletor de habilidades para a ficha (classe + arquétipo). Civil é **exclusivo**
 * (doc: "não possuem classes, arquétipos ou habilidades gerais") — recebe só o grupo Civil, nunca
 * Gerais/Classe/Subclasse/Arquétipo. Para os demais, grupos sem conteúdo são omitidos — Subclasse só
 * aparece pra Experimento; Arquétipo aparece pra qualquer agente (inclusive Experimento, que vê os da
 * classe-base sem nenhum marcado como seu).
 */
export function catalogoHabilidades(
  classe: ClasseEnum,
  arquetipo: ArquetipoEnum | null,
): GrupoHabilidades[] {
  if (classe === ClasseEnum.CIVIL) {
    return [grupoCivil()];
  }
  return [
    grupoGerais(arquetipo),
    grupoClasse(classe),
    grupoSubclasse(classe),
    grupoArquetipo(classe, arquetipo),
  ].filter((grupo) => grupo.subgrupos.length > 0);
}

/**
 * A **Habilidade Inicial** do arquétipo/subclasse da ficha (`sistema-v4.1.0.md` — "Habilidade
 * Inicial de Arquétipo"; cada Experimento também tem a sua). O agente já nasce com ela — não é
 * escolhida, vem de graça com o arquétipo/subclasse. Nos dados do catálogo a inicial é sempre o
 * **primeiro item** da lista do arquétipo/subclasse.
 *
 * Uma ficha Experimento identifica a subclasse pela **própria classe** (a subclasse ocupa o lugar
 * do arquétipo, então `arquetipo` é `null`); uma ficha de classe-base, pelo `arquetipo`. Civil ou
 * base sem arquétipo não têm inicial → `[]`.
 */
export function habilidadesIniciais(
  classe: ClasseEnum,
  arquetipo: ArquetipoEnum | null,
): HabilidadeCatalogoItemDto[] {
  const subclasse = HABILIDADES_SUBCLASSE[classe];
  if (subclasse && subclasse.length > 0) {
    return [{ ...subclasse[0], categoria: HabilidadeCategoriaEnum.SUBCLASSE, origem: classe }];
  }
  const doArquetipo = arquetipo ? HABILIDADES_ARQUETIPO[arquetipo] : undefined;
  if (doArquetipo && doArquetipo.length > 0 && arquetipo) {
    return [{ ...doArquetipo[0], categoria: HabilidadeCategoriaEnum.ARQUETIPO, origem: arquetipo }];
  }
  return [];
}

/**
 * `true` se a habilidade (identificada por `origem` + `nome`) é a **Habilidade Inicial** do seu
 * arquétipo/subclasse — o **1º item** da lista no catálogo, o mesmo que `habilidadesIniciais` concede
 * de graça (doc — "Habilidade Inicial de Arquétipo"). Serve só para **rotular/realçar** a inicial na
 * UI ("Arquétipo - Inicial"); não é regra de jogo. `origem` ausente (Geral/Personalidade) → nunca.
 */
export function ehHabilidadeInicial(
  origem: ClasseEnum | ArquetipoEnum | undefined,
  nome: string,
): boolean {
  if (origem === undefined) {
    return false;
  }
  const lista =
    HABILIDADES_SUBCLASSE[origem as ClasseEnum] ?? HABILIDADES_ARQUETIPO[origem as ArquetipoEnum];
  return lista !== undefined && lista.length > 0 && lista[0].nome === nome;
}
