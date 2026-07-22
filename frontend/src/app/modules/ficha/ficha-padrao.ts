import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaHabilidadeDto,
  FichaJogadorDadosDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  calcularDerivados,
  calcularEnergia,
  calcularVida,
  habilidadesIniciais,
  maestriaAtingivel,
  obterBonusAtributos,
  obterLimitesClasse,
} from '@contratados-rpg/shared/regras/agente';
import { rolarDinheiroInicial } from '@contratados-rpg/shared/regras/novo-agente';

import { ehClasseBase } from './opcoes-ficha';

/** Atributos base de fábrica (1 em cada) — ponto de partida do assistente de criação. */
export const ATRIBUTOS_BASE_PADRAO: FichaAtributosDto = {
  destreza: 1,
  forca: 1,
  luta: 1,
  pontaria: 1,
  vigor: 1,
  intelecto: 1,
  medicina: 1,
  sentidos: 1,
  social: 1,
  vontade: 1,
};

/** Escolhas cruciais coletadas no assistente de criação, antes de montar a ficha. */
export interface OpcoesFichaInicial {
  readonly nome: string;
  readonly classe: ClasseEnum;
  readonly arquetipo: ArquetipoEnum | null;
  readonly nivel: number;
  readonly prestigio: number;
  /** Atributos **base** (antes do bônus fixo de arquétipo/subclasse). */
  readonly atributos: FichaAtributosDto;
  readonly maestria: keyof FichaAtributosDto | null;
}

/**
 * Resultado emitido pelo assistente de criação — as escolhas de jogo (`opcoes`, para
 * `construirFichaInicial`) separadas do **dono** escolhido (`usuarioId`, identidade/posse — não é
 * documento de jogo). Ausente = a própria ficha do usuário autenticado; só o **mestre** pode
 * escolher outro membro (§14 — "criar ficha de jogador": mestre sem restrição, dono só a
 * própria); o backend recusa com 401 se um jogador comum tentar.
 */
export interface FichaAssistenteResultado {
  readonly opcoes: OpcoesFichaInicial;
  readonly usuarioId?: number;
}

/** Restringe `valor` ao intervalo [minimo, maximo]. */
function restringir(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * Monta a ficha inicial a partir das escolhas do assistente de criação (m3-16): normaliza Nível e
 * atributos aos limites da classe, aplica o **bônus fixo de Atributos** do arquétipo/subclasse (doc —
 * "Classes e Arquétipos", mesma tabela do editor no lugar), valida a Maestria (só em atributo 6+) e
 * grava o **snapshot** de Vida/Energia máximas + `derivados` de `shared/regras` (proibições #26/#27 —
 * nenhuma fórmula nova aqui; o backend também revalida forma e Maestria). Vida/Energia atuais nascem
 * cheias. Dinheiro inicial (m3-34) é rolado uma vez aqui (`rolarDinheiroInicial`, `1000 + 4D4 × 250`).
 * Só orquestra `shared/regras`.
 */
export function construirFichaInicial(
  opcoes: OpcoesFichaInicial,
): { readonly nome: string; readonly dados: FichaJogadorDadosDto } {
  const classe = opcoes.classe;
  const limites = obterLimitesClasse({ classe });
  const arquetipo = ehClasseBase(classe) ? opcoes.arquetipo : null;

  // Atributos = base + bônus fixo do arquétipo/subclasse, cada um clampado aos limites da classe.
  const bonus = obterBonusAtributos({ classe, arquetipo });
  const atributos = { ...opcoes.atributos };
  (Object.keys(atributos) as (keyof FichaAtributosDto)[]).forEach((chave) => {
    const bruto = opcoes.atributos[chave] + (bonus[chave] ?? 0);
    atributos[chave] = restringir(bruto, limites.atributoMinimo, limites.atributoMaximo);
  });

  const nivel = restringir(opcoes.nivel, limites.nivelMinimo, limites.nivelMaximo);
  const prestigio = Math.max(0, opcoes.prestigio);
  // Maestria só vale no atributo final que atinge o mínimo (após o bônus e o clamp).
  const maestria =
    opcoes.maestria && maestriaAtingivel(atributos[opcoes.maestria]) ? opcoes.maestria : null;

  const vidaMaxima = calcularVida({ classe, nivel, vigor: atributos.vigor });
  const energiaMaxima = calcularEnergia({ classe, nivel, destreza: atributos.destreza });

  // O agente já nasce com a Habilidade Inicial do seu arquétipo/subclasse (doc — vem de graça, não
  // é escolhida). `habilidadesIniciais` devolve os itens do catálogo já com categoria/origem.
  const habilidades: FichaHabilidadeDto[] = habilidadesIniciais(classe, arquetipo).map((item) => ({
    nome: item.nome,
    categoria: item.categoria,
    custoEnergia: item.custoEnergia,
    descricao: item.descricao,
    ...(item.origem === undefined ? {} : { origem: item.origem }),
  }));

  return {
    nome: opcoes.nome.trim() || 'Novo agente',
    dados: {
      classe,
      arquetipo,
      nivel,
      prestigio,
      atributos,
      maestria,
      estado: {
        vidaAtual: vidaMaxima,
        energiaAtual: energiaMaxima,
        vidaMaxima,
        energiaMaxima,
        sequelas: [],
        traumas: [],
        lesoes: [],
      },
      derivados: calcularDerivados(classe, nivel, atributos, habilidades),
      habilidades,
      inventario: { itens: [], amplificadores: [] },
      rolagens: [],
      anotacoes: '',
      dinheiro: rolarDinheiroInicial().dinheiro,
    },
  };
}

/**
 * Ficha **padrão de fábrica**: Combatente sem arquétipo, nível 0, atributos base (1 cada). Semente do
 * assistente de criação (m3-16) e fallback direto. Delega ao `construirFichaInicial` — fonte única.
 */
export function construirFichaPadrao(): { readonly nome: string; readonly dados: FichaJogadorDadosDto } {
  return construirFichaInicial({
    nome: 'Novo agente',
    classe: ClasseEnum.COMBATENTE,
    arquetipo: null,
    nivel: 0,
    prestigio: 0,
    atributos: ATRIBUTOS_BASE_PADRAO,
    maestria: null,
  });
}
