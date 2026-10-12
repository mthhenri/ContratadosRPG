import type { LivroTrechoDto } from "../dtos/livro/livro-trecho.dtos";

/**
 * Forma do JSON que o normalizador de Regras produz (`frontend/scripts/normalizar-regras.mjs`) e que
 * o leitor consome. A definição canônica do formato é
 * `frontend/src/app/modules/regras/regras.model.ts`; aqui vive o recorte estrutural de que o
 * conversor (backend) e a projeção (backend e frontend) precisam, sem importar código do frontend.
 */

export type Trechos = readonly LivroTrechoDto[];
export type Celula = Trechos;
export type Cabecalho = readonly Celula[];
export type Linhas = readonly (readonly Celula[])[];

export interface FonteTabela {
  readonly cabecalho: Cabecalho;
  readonly linhas: Linhas;
}

export interface NormalizadoHabilidade {
  readonly tipo: "habilidade";
  readonly nome: string;
  readonly custo: number | "X";
  readonly reacao: boolean;
  readonly glifo: "⬦" | "◈" | "◻" | null;
  readonly trechos: Trechos;
}

export interface NormalizadoSaudeRecursos {
  readonly vida: Trechos;
  readonly energia: Trechos;
}

export interface NormalizadoSecao {
  readonly tipo: "secao";
  readonly nivel: 1 | 2 | 3 | 4;
  readonly glifo: "⬢" | "⬡" | "⬥" | "⬦" | null;
  readonly titulo: string;
  readonly ancora: string;
  readonly origemTabela?: boolean;
  readonly filhos: readonly NormalizadoConteudo[];
}

export interface NormalizadoClasse extends FonteTabela {
  readonly tipo: "classe";
  readonly nome: string;
  readonly ancora?: string;
  readonly citacao: Trechos;
  readonly saude: NormalizadoSaudeRecursos;
  readonly progressao: NormalizadoSaudeRecursos;
  readonly habilidades: readonly NormalizadoHabilidade[];
  readonly arquetipos: readonly { readonly nome: string; readonly habilidadeInicial: NormalizadoHabilidade }[];
  readonly filhos?: readonly NormalizadoArquetipos[];
}

export interface NormalizadoArquetipos extends FonteTabela {
  readonly tipo: "arquetipos";
  readonly classe: string;
  readonly arquetipos: readonly {
    /** Identificador da peça do arquétipo (só na projeção da Oficina). */
    readonly peca?: string;
    readonly nome: string;
    readonly citacao: Trechos;
    readonly atributosBonus: Trechos;
    readonly habilidades: readonly NormalizadoHabilidade[];
    readonly habilidadesGeraisMelhoradas: readonly NormalizadoHabilidade[];
  }[];
}

export interface NormalizadoSubclasse extends FonteTabela {
  readonly tipo: "subclasse";
  readonly nome: string;
  readonly ancora?: string;
  readonly classe: string;
  readonly citacao: Trechos;
  readonly custos: readonly Trechos[];
  readonly saude: NormalizadoSaudeRecursos;
  readonly progressao: NormalizadoSaudeRecursos;
  readonly atributosBonus: Trechos;
  readonly habilidadeInicial: NormalizadoHabilidade;
  readonly habilidades: readonly NormalizadoHabilidade[];
}

export interface NormalizadoOrigens extends FonteTabela {
  readonly tipo: "origens";
  readonly origens: readonly {
    /** Identificador da peça do item (só na projeção da Oficina). */
    readonly peca?: string;
    readonly nome: string;
    readonly citacao: Trechos;
    readonly formacao: Trechos;
    readonly especialidade: Trechos;
    readonly saberCampo: Trechos;
  }[];
}

export interface NormalizadoTermos extends FonteTabela {
  readonly tipo: "termos";
  readonly variante: "atributos" | "maestrias" | "penalidades" | "verbetes";
  readonly itens: readonly {
    /** Identificador da peça do item (só na projeção da Oficina). */
    readonly peca?: string;
    readonly nome: string;
    readonly numero?: number;
    readonly rotulo?: string;
    readonly descricao: Trechos;
  }[];
}

export interface NormalizadoEquipamentos extends FonteTabela {
  readonly tipo: "equipamentos";
  readonly categoria: string;
  readonly itens: readonly {
    /** Identificador da peça do item (só na projeção da Oficina). */
    readonly peca?: string;
    readonly nome: string;
    readonly custo: Trechos;
    readonly descricao: Trechos;
    readonly peso: Trechos;
    readonly porte?: Trechos;
    readonly danos: readonly { readonly rotulo: "DANO" | "UMA MÃO" | "DUAS MÃOS"; readonly trechos: Trechos }[];
    readonly especificacoes?: Trechos;
    readonly duracao?: Trechos;
  }[];
}

export interface NormalizadoModificacoes extends FonteTabela {
  readonly tipo: "modificacoes";
  readonly categoria: string;
  readonly nota?: Trechos;
  readonly itens: readonly {
    /** Identificador da peça do item (só na projeção da Oficina). */
    readonly peca?: string;
    readonly nome: string;
    readonly empilhamento: string;
    readonly efeito: Trechos;
    readonly bloqueia: Trechos;
  }[];
}

export interface NormalizadoAmplificadores extends FonteTabela {
  readonly tipo: "amplificadores";
  readonly itens: readonly {
    /** Identificador da peça do item (só na projeção da Oficina). */
    readonly peca?: string;
    readonly nome: string;
    readonly empilhamento: string;
    readonly efeito: Trechos;
  }[];
}

export interface NormalizadoModulos extends FonteTabela {
  readonly tipo: "modulos";
  readonly modulos: readonly { readonly nivel: string; readonly energiaMaxima: number }[];
}

export interface NormalizadoNiveisAmeaca extends FonteTabela {
  readonly tipo: "niveis-ameaca";
  readonly niveis: readonly {
    readonly nivel: number;
    readonly referenciaImagem: string;
    readonly descricao: Trechos;
  }[];
}

export interface NormalizadoIdentidade extends FonteTabela {
  readonly tipo: "identidade";
  readonly campos: readonly { readonly rotulo: string; readonly valor: Trechos; readonly nivel?: number }[];
}

export interface NormalizadoAtributos extends FonteTabela {
  readonly tipo: "atributos";
  readonly atributos: readonly {
    readonly nome: string;
    readonly valor: number;
    readonly modificador: string;
    readonly bonus: string;
  }[];
}

export interface NormalizadoHabilidadeCriatura {
  readonly tipo: "habilidade-criatura";
  /** Identificador da peça (só na projeção da Oficina). */
  readonly peca?: string;
  readonly nome: string;
  readonly categoria: "PASSIVA" | "ATIVA" | "DE GATILHO";
  readonly trechos: Trechos;
  readonly rotulo: string;
}

export interface NormalizadoFichaCriatura {
  readonly tipo: "ficha-criatura";
  readonly nome: string;
  readonly identidade: NormalizadoIdentidade;
  readonly atributos: NormalizadoAtributos;
  readonly vidaMaxima: string;
  readonly defesaBase: string;
  readonly resistencias: Trechos;
  readonly fraquezas: Trechos;
  readonly regeneracao: Trechos;
  readonly porte: Trechos;
  readonly deslocamento: Trechos;
  readonly cadencia: string;
  readonly ataques: readonly {
    readonly nome: string;
    readonly acao: string;
    readonly teste: string;
    readonly dano: string;
    readonly efeito: Trechos;
  }[];
  readonly habilidades: readonly NormalizadoHabilidadeCriatura[];
  readonly filhos: readonly NormalizadoConteudo[];
}

export interface NormalizadoRoteiro {
  readonly tipo: "roteiro";
  readonly etapas: readonly { readonly ordem: number; readonly titulo: Trechos; readonly descricao: Trechos }[];
  readonly filhos: readonly NormalizadoConteudo[];
  readonly introducao?: readonly NormalizadoConteudo[];
  readonly conclusao?: readonly NormalizadoConteudo[];
}

export interface NormalizadoGrade extends FonteTabela {
  readonly tipo: "grade";
  readonly colunas: number;
  readonly referencia?: {
    readonly tipo: "saude" | "cartoes";
    readonly titulo?: string;
    readonly itens: readonly {
      readonly rotulo: string;
      readonly conteudo: Trechos;
      readonly nota?: string;
      readonly variante?: "vida" | "energia";
    }[];
  };
}

export interface NormalizadoFaixas extends FonteTabela {
  readonly tipo: "faixas";
  readonly itens: readonly { readonly rotulo: string; readonly valor: string }[];
}

export interface NormalizadoAbertura {
  readonly tipo: "abertura";
  readonly titulo: string;
  readonly trechos: Trechos;
}

export interface NormalizadoCapa {
  readonly tipo: "capa";
  readonly versao?: string;
  readonly titulo: string;
  readonly subtitulo: string;
}

export interface NormalizadoLista {
  readonly tipo: "lista";
  readonly ordenada: boolean;
  readonly inicio: number;
  readonly itens: readonly (readonly NormalizadoConteudo[])[];
}

export interface NormalizadoTabela {
  readonly tipo: "tabela";
  readonly cabecalho: Cabecalho;
  readonly linhas: Linhas;
  readonly pares?: FonteTabela;
}

export interface NormalizadoTexto {
  readonly tipo: "paragrafo" | "exemplo" | "formula" | "nota";
  readonly trechos: Trechos;
}

export interface NormalizadoGenerico {
  readonly tipo: "generico";
  readonly motivo: string;
  readonly trechos: Trechos;
  readonly origemMarkdown: string;
  readonly filhos?: readonly NormalizadoConteudo[];
}

export type NormalizadoConteudo =
  | NormalizadoSecao
  | NormalizadoTexto
  | NormalizadoLista
  | NormalizadoTabela
  | NormalizadoHabilidade
  | NormalizadoClasse
  | NormalizadoArquetipos
  | NormalizadoSubclasse
  | NormalizadoOrigens
  | NormalizadoTermos
  | NormalizadoEquipamentos
  | NormalizadoModificacoes
  | NormalizadoAmplificadores
  | NormalizadoModulos
  | NormalizadoNiveisAmeaca
  | NormalizadoIdentidade
  | NormalizadoAtributos
  | NormalizadoHabilidadeCriatura
  | NormalizadoFichaCriatura
  | NormalizadoRoteiro
  | NormalizadoGrade
  | NormalizadoFaixas
  | NormalizadoAbertura
  | NormalizadoCapa
  | NormalizadoGenerico;

export interface NormalizadoDocumento {
  readonly tipo: "documento";
  readonly id: "sistema" | "guia";
  readonly titulo: string;
  readonly versao: string;
  readonly filhos: readonly NormalizadoConteudo[];
}
