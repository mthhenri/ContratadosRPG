import { LivroTrechoDto } from "./livro-trecho.dtos";

/**
 * Contrato do `dados` (JSONB de `regra_peca`) de cada tipo de peça. Value-objects sem entidade nem
 * verbo. Regra de corte: tem identidade (linkável, comparável) → peça própria; só conteúdo → fica
 * aqui. Texto rico é sempre `LivroTrechoDto[]` e nunca é normalizado.
 * Mapeamento e decisões: `o anexo mapeamento.md da spec m11-01`.
 */

/** Células de uma tabela: uma lista de trechos por célula, na ordem da fonte (inclusive vazias). */
export type LivroCelulaDto = readonly LivroTrechoDto[];

export interface LivroSecaoDadosDto {
  readonly titulo: string;
  readonly nivel: 1 | 2 | 3 | 4;
  readonly glifo: "⬢" | "⬡" | "⬥" | "⬦" | null;
  /** Título extraído do cabeçalho de uma tabela. */
  readonly origemTabela?: boolean;
}

/** Dados de PARAGRAFO, EXEMPLO, FORMULA e NOTA: só o texto rico. */
export interface LivroTextoDadosDto {
  readonly trechos: readonly LivroTrechoDto[];
}

/** Bloco que pode existir dentro de um item de lista (sem identidade própria). */
export type LivroListaItemBlocoDto =
  | { readonly tipo: "paragrafo"; readonly trechos: readonly LivroTrechoDto[] }
  | {
      readonly tipo: "lista";
      readonly ordenada: boolean;
      readonly inicio: number;
      readonly itens: readonly (readonly LivroListaItemBlocoDto[])[];
    };

export interface LivroListaDadosDto {
  readonly ordenada: boolean;
  readonly inicio: number;
  readonly itens: readonly (readonly LivroListaItemBlocoDto[])[];
}

export interface LivroTabelaDadosDto {
  readonly cabecalho: readonly LivroCelulaDto[];
  readonly linhas: readonly (readonly LivroCelulaDto[])[];
  /** Apresentação: as colunas viram duas metades independentes, uma sobre a outra. */
  readonly emPares?: boolean;
}

export interface LivroHabilidadeDadosDto {
  readonly nome: string;
  readonly custo: number | "X";
  readonly reacao: boolean;
  readonly glifo: "⬦" | "◈" | "◻" | null;
  readonly trechos: readonly LivroTrechoDto[];
  /** Habilidade inicial do arquétipo ou da subclasse. */
  readonly inicial?: boolean;
  /** Habilidade geral melhorada por um arquétipo. */
  readonly melhorada?: boolean;
}

export interface LivroSaudeRecursosDto {
  readonly vida: readonly LivroTrechoDto[];
  readonly energia: readonly LivroTrechoDto[];
}

export interface LivroClasseDadosDto {
  readonly nome: string;
  readonly citacao: readonly LivroTrechoDto[];
  readonly saude: LivroSaudeRecursosDto;
  readonly progressao: LivroSaudeRecursosDto;
  /** Tabela de progressão da classe, na ordem da fonte. */
  readonly cabecalho: readonly LivroCelulaDto[];
  readonly linhas: readonly (readonly LivroCelulaDto[])[];
}

export interface LivroArquetipoDadosDto {
  readonly nome: string;
  readonly citacao: readonly LivroTrechoDto[];
  readonly atributosBonus: readonly LivroTrechoDto[];
}

export interface LivroSubclasseDadosDto {
  readonly nome: string;
  readonly classe: string;
  readonly citacao: readonly LivroTrechoDto[];
  readonly custos: readonly (readonly LivroTrechoDto[])[];
  readonly saude: LivroSaudeRecursosDto;
  readonly progressao: LivroSaudeRecursosDto;
  readonly atributosBonus: readonly LivroTrechoDto[];
}

/** Container de origens (a tabela de origens do livro). */
export interface LivroOrigensDadosDto {
  readonly cabecalho: readonly LivroCelulaDto[];
  readonly linhas: readonly (readonly LivroCelulaDto[])[];
}

export interface LivroOrigemDadosDto {
  readonly nome: string;
  readonly citacao: readonly LivroTrechoDto[];
  readonly formacao: readonly LivroTrechoDto[];
  readonly especialidade: readonly LivroTrechoDto[];
  readonly saberCampo: readonly LivroTrechoDto[];
}

export interface LivroTermosDadosDto {
  readonly variante: "atributos" | "maestrias" | "penalidades" | "verbetes";
}

export interface LivroTermoDadosDto {
  readonly nome: string;
  readonly numero?: number;
  readonly rotulo?: string;
  readonly descricao: readonly LivroTrechoDto[];
}

export interface LivroEquipamentosDadosDto {
  readonly categoria: string;
}

export interface LivroEquipamentoDadosDto {
  readonly nome: string;
  readonly custo: readonly LivroTrechoDto[];
  readonly descricao: readonly LivroTrechoDto[];
  readonly peso: readonly LivroTrechoDto[];
  readonly porte?: readonly LivroTrechoDto[];
  readonly danos: readonly {
    readonly rotulo: "DANO" | "UMA MÃO" | "DUAS MÃOS";
    readonly trechos: readonly LivroTrechoDto[];
  }[];
  readonly especificacoes?: readonly LivroTrechoDto[];
  readonly duracao?: readonly LivroTrechoDto[];
}

export interface LivroModificacoesDadosDto {
  /** Categoria de Equipamentos a que a tabela pertence (ex.: "Corpo a Corpo"). */
  readonly categoria: string;
  readonly nota?: readonly LivroTrechoDto[];
}

export interface LivroModificacaoDadosDto {
  readonly nome: string;
  readonly empilhamento: string;
  readonly efeito: readonly LivroTrechoDto[];
  readonly bloqueia: readonly LivroTrechoDto[];
}

/** Container de amplificadores: sem campos próprios além do que as peças filhas carregam. */
export type LivroAmplificadoresDadosDto = Record<string, never>;

export interface LivroAmplificadorDadosDto {
  readonly nome: string;
  readonly empilhamento: string;
  readonly efeito: readonly LivroTrechoDto[];
}

export interface LivroModulosDadosDto {
  readonly modulos: readonly { readonly nivel: string; readonly energiaMaxima: number }[];
}

export interface LivroNiveisAmeacaDadosDto {
  readonly niveis: readonly {
    readonly nivel: number;
    readonly referenciaImagem: string;
    readonly descricao: readonly LivroTrechoDto[];
  }[];
}

export interface LivroFichaCriaturaDadosDto {
  readonly nome: string;
  readonly identidade: readonly {
    readonly rotulo: string;
    readonly valor: readonly LivroTrechoDto[];
    readonly nivel?: number;
  }[];
  readonly atributos: readonly {
    readonly nome: string;
    readonly valor: number;
    readonly modificador: string;
    readonly bonus: string;
  }[];
  readonly vidaMaxima: string;
  readonly defesaBase: string;
  readonly resistencias: readonly LivroTrechoDto[];
  readonly fraquezas: readonly LivroTrechoDto[];
  readonly regeneracao: readonly LivroTrechoDto[];
  readonly porte: readonly LivroTrechoDto[];
  readonly deslocamento: readonly LivroTrechoDto[];
  readonly cadencia: string;
  readonly ataques: readonly {
    readonly nome: string;
    readonly acao: string;
    readonly teste: string;
    readonly dano: string;
    readonly efeito: readonly LivroTrechoDto[];
  }[];
}

export interface LivroHabilidadeCriaturaDadosDto {
  readonly nome: string;
  readonly categoria: "PASSIVA" | "ATIVA" | "DE GATILHO";
  readonly trechos: readonly LivroTrechoDto[];
  /** Cabeçalho original, para manter a escrita e a pontuação do livro. */
  readonly rotulo: string;
}

/**
 * Roteiro: lista numerada de etapas. As peças filhas, em ordem, são: as primeiras
 * `introducaoQuantidade` (antes das etapas), o corpo e as últimas `conclusaoQuantidade` (depois).
 */
export interface LivroRoteiroDadosDto {
  readonly etapas: readonly {
    readonly ordem: number;
    readonly titulo: readonly LivroTrechoDto[];
    readonly descricao: readonly LivroTrechoDto[];
  }[];
  readonly introducaoQuantidade: number;
  readonly conclusaoQuantidade: number;
}

/** Tabela de uma linha do Deslocamento: cada faixa traz a condição e o valor em destaque. */
export interface LivroFaixasDadosDto {
  readonly itens: readonly { readonly rotulo: string; readonly valor: string }[];
}

/** Item de uma grade de referência (cartões de Saúde, Alcances, Afinidade). */
export interface LivroGradeReferenciaItemDto {
  readonly rotulo: string;
  readonly conteudo: readonly LivroTrechoDto[];
  readonly nota?: string;
  readonly variante?: "vida" | "energia";
}

/**
 * Grade (tabela de layout). `generica` guarda as células na ordem da fonte; `saude` e `cartoes` são
 * as três grades de referência reconhecidas na importação: guardam a estrutura que o leitor
 * apresenta (a apresentação é dado da peça, não dedução em tempo de leitura).
 */
export type LivroGradeDadosDto =
  | {
      readonly apresentacao: "generica";
      readonly colunas: number;
      readonly cabecalho: readonly LivroCelulaDto[];
      readonly linhas: readonly (readonly LivroCelulaDto[])[];
    }
  | {
      readonly apresentacao: "saude" | "cartoes";
      readonly colunas: number;
      readonly titulo?: string;
      readonly itens: readonly LivroGradeReferenciaItemDto[];
    };

/** Registro oficial em itálico que abre cada livro. */
export interface LivroAberturaDadosDto {
  readonly titulo: string;
  readonly trechos: readonly LivroTrechoDto[];
  /** Selo de versão da capa (ex.: "VERSÃO 4.1.4"); só os livros que o exibem o têm. */
  readonly selo?: string;
}

/** Reserva do importador: conteúdo que não casou com nenhum tipo, sem perder o texto. */
export interface LivroGenericoDadosDto {
  readonly motivo: string;
  readonly trechos: readonly LivroTrechoDto[];
}
