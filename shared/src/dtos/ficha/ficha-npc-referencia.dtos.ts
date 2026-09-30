import type { CategoriaNpcEnum } from "../../enums";

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
