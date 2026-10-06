import type { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "../../enums";
import type { FichaAtributosDto, FichaSequelaDto, FichaTraumaDto } from "./ficha.dtos";

/**
 * Documento JSONB do NPC, conforme SCHEMA.md e o "Guia de Criação de NPCs" do guia de mestre.
 * Vida, Defesa e Energia são snapshots calculados na criação e editáveis depois (m3-10).
 * DT varia com o atributo do contexto e não é persistida. Sem Maestria ou regras de jogador.
 * Validação de domínio pertence a shared/regras/npc; este contrato não depende de framework.
 */
export interface FichaNpcDadosDto {
    readonly identidadeNarrativa: FichaNpcIdentidadeNarrativaDto;
    readonly categoria: CategoriaNpcEnum;
    /** 0–20; a faixa sugerida da Categoria não restringe o Nível. */
    readonly nivel: number;
    /** 0–10; estado atual, independente da Categoria e mutável em jogo. */
    readonly cooperacao: number;
    /** Reusa os dez atributos; Civil inicia com Luta/Pontaria 0, salvo exceção do mestre. */
    readonly atributos: FichaAtributosDto;
    /** Ausência identifica legado não configurado; seleção explícita segue a Categoria. */
    readonly competencias?: readonly (keyof FichaAtributosDto)[];
    /** Ajustes manuais de resultado, separados do valor base do atributo. */
    readonly modificadoresTeste?: Partial<Record<keyof FichaAtributosDto, number>>;
    /** Ajustes manuais exclusivos do pool D20; não alteram dados de Competência. */
    readonly dadosTeste?: Partial<Record<keyof FichaAtributosDto, number>>;
    readonly vidaMaxima: number;
    /** Pode exceder a máxima editável, como nas demais fichas. */
    readonly vidaAtual: number;
    /** Morrendo persiste após cura; ausência em documentos antigos equivale a false. */
    readonly condicoes?: FichaNpcCondicoesDto;
    readonly defesaBase: number;
    readonly bloquear: number;
    readonly esquivar: number;
    readonly energia: FichaNpcEnergiaDto;
    readonly sanidade: FichaNpcSanidadeDto;
    readonly habilidades: readonly FichaNpcHabilidadeDto[];
    readonly condutaCombate: FichaNpcCondutaCombateDto;
    /** Texto privado do dono/mestre; o recorte de leitura é responsabilidade do backend. */
    readonly anotacoes?: string;
}

/** Condição de saúde persistida; testes por turno e socorro permanecem narrativos. */
export interface FichaNpcCondicoesDto {
    readonly morrendo: boolean;
}

/** Identidade biográfica e propósito operacional do NPC. */
export interface FichaNpcIdentidadeNarrativaDto {
    readonly nome: string;
    readonly funcao: string;
}

/**
 * Civil: máxima/atual 0, recarga null. Operativo/Veterano: Reserva Fixa, recarga null.
 * Elite/Lendário: Pool + Recarga por turno; o uso em jogo não recarrega além da Pool máxima.
 */
export interface FichaNpcEnergiaDto {
    readonly maxima: number;
    readonly atual: number;
    readonly recargaPorTurno: number | null;
}

/** Mesmos registros do jogador; os efeitos no NPC são interpretados pelo mestre. */
export interface FichaNpcSanidadeDto {
    readonly sequelas: readonly FichaSequelaDto[];
    readonly traumas: readonly FichaTraumaDto[];
}

/** Habilidade própria do NPC, extensão de sua biografia; não é um item de catálogo. */
export interface FichaNpcHabilidadeDto {
    readonly nomeNeutro: string;
    readonly nomeNarrativo?: string;
    readonly tipo: HabilidadeTipoNpcEnum;
    /** Obrigatório nas Ativas; ausente/null nas Passivas, inclusive condicionais. */
    readonly custoEnergia?: number | null;
    readonly descricao: string;
    readonly restricao?: string | null;
}

/** Roteiro narrativo de comportamento em combate, sem automação de ações. */
export interface FichaNpcCondutaCombateDto {
    readonly gatilhosFuga: string;
    readonly prioridadesAlvo: string;
    readonly reacaoFerimentoSevero: string;
}
