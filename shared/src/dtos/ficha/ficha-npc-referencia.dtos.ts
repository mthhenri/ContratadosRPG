import type { CategoriaNpcEnum } from "../../enums";
import type { FichaNpcHabilidadeDto } from "./ficha-npc.dtos";

/** Orientação narrativa da Categoria; faixa de Nível é sugestão, nunca trava. */
export interface NpcCategoriaReferenciaDto {
    readonly categoria: CategoriaNpcEnum;
    readonly rotulo: string;
    readonly perfil: string;
    readonly nivelSugerido: string;
}

/** Consulta do eixo social independente da Categoria. */
export interface NpcCooperacaoConsultarDto {
    readonly cooperacao: number;
}

/** Faixa social e conduta tática inicial conforme o guia de mestre. */
export interface NpcCooperacaoReferenciaDto {
    readonly rotulo: string;
    readonly social: string;
    readonly combate: string;
}

/** Modelo pronto da Biblioteca de Referência do guia de mestre, por Categoria de origem. */
export interface NpcHabilidadeReferenciaDto {
    readonly categoria: CategoriaNpcEnum;
    readonly habilidade: FichaNpcHabilidadeDto;
}
