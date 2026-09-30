import type { CategoriaNpcEnum } from "../../enums";
import type { FichaAtributosDto } from "./ficha.dtos";
import type { FichaNpcHabilidadeDto } from "./ficha-npc.dtos";

/** Categoria para consultar tabelas do guia de mestre — "Guia de Criação de NPCs". */
export interface NpcCategoriaConsultarDto {
    readonly categoria: CategoriaNpcEnum;
}

export interface NpcPontosLimiteDto {
    readonly pontosDistribuir: number;
    readonly limite: number;
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
