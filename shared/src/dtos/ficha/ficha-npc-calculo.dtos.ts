import type { CategoriaNpcEnum } from "../../enums";
import type { FichaAtributosDto } from "./ficha.dtos";
import type { FichaNpcDadosDto, FichaNpcHabilidadeDto } from "./ficha-npc.dtos";

/** Dados derivados da Categoria; nunca ajuste manual persistido. */
export interface NpcCompetenciasDto {
    readonly quantidade: number;
    readonly dados: number;
    readonly faces: number;
}

/** A ação explicita que todos os pools pertencem ao teste de atributo do NPC. */
export interface NpcTesteAtributoDto {
    readonly dados: FichaNpcDadosDto;
    readonly atributo: keyof FichaAtributosDto;
    readonly margemCritico?: number;
    readonly repeticoes?: number;
}

/** Categoria para consultar tabelas do guia de mestre — "Guia de Criação de NPCs". */
export interface NpcCategoriaConsultarDto {
    readonly categoria: CategoriaNpcEnum;
}

export interface NpcPontosLimiteDto {
    readonly pontosDistribuir: number;
    readonly limite: number;
}

/** Estado de criação; liberações narrativas de Civil não são persistidas no documento. */
export interface NpcAtributosCriacaoConsultarDto {
    readonly categoria: CategoriaNpcEnum;
    readonly atributos: FichaAtributosDto;
    readonly lutaCivilLiberada: boolean;
    readonly pontariaCivilLiberada: boolean;
}

/** Saldo de distribuição da criação; edição posterior usa apenas validação de cap. */
export interface NpcAtributosCriacaoDto {
    readonly distribuidos: number;
    readonly restantes: number;
    readonly violacoes: readonly string[];
}

export interface NpcAtributosValidarDto {
    readonly categoria: CategoriaNpcEnum;
    readonly atributos: FichaAtributosDto;
}

export interface NpcVidaMaximaCalcularDto {
    readonly categoria: CategoriaNpcEnum;
    readonly nivel: number;
    readonly vigor: number;
}

export interface NpcDefesaBaseCalcularDto {
    readonly nivel: number;
}

export interface NpcBloquearCalcularDto {
    readonly defesaBase: number;
    readonly vigor: number;
}

export interface NpcEsquivarCalcularDto {
    readonly defesaBase: number;
    readonly destreza: number;
}

export interface NpcEnergiaCalcularDto {
    readonly categoria: CategoriaNpcEnum;
    readonly destreza: number;
}

/** Energia inicial das Categorias que usam Pool + Recarga; demais retornam número. */
export interface NpcEnergiaDto {
    readonly pool: number;
    readonly recarga: number;
}

export interface NpcDtAtributoCalcularDto {
    readonly nivel: number;
    readonly valorAtributo: number;
}

export interface NpcVolumeHabilidadesDto {
    readonly totalMinimo: number;
    readonly totalMaximo: number;
    readonly passivasMinimas: number;
    readonly ativasMaximas: number;
    readonly limitePorTurno: number;
}

export interface NpcVolumeHabilidadesValidarDto {
    readonly categoria: CategoriaNpcEnum;
    readonly habilidades: readonly FichaNpcHabilidadeDto[];
}

/** Mesmo envelope de validação de coerência usado pela criatura. */
export interface FichaNpcValidadaDto {
    readonly violacoes: readonly string[];
}
