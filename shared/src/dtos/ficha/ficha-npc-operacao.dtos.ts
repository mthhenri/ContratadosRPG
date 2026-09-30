import type { TipoFichaEnum } from "../../enums";
import type { FichaNpcDadosDto } from "./ficha-npc.dtos";
import type { FichaImagemFocoDto } from "./ficha-operacao.dtos";

/** Criação pelo mestre; dono inferido da sessão, campanha null permite NPC solto. */
export interface FichaNpcCriarDto {
    readonly campanhaId: number | null;
    readonly nome: string;
    readonly cor?: string | null;
    readonly dados: FichaNpcDadosDto;
}

/** Documento criado, com tipo explícito e snapshots preservados. */
export interface FichaNpcCriadaDto {
    readonly id: number;
    readonly campanhaId: number | null;
    readonly usuarioId: number;
    readonly tipo: TipoFichaEnum.NPC;
    readonly nome: string;
    readonly cor: string | null;
    readonly imagemUrl: string | null;
    readonly dados: FichaNpcDadosDto;
}

/** Consulta individual; id preenchido pela controller. */
export interface FichaNpcRecuperarDto {
    readonly id: number;
}

/** Consulta autorizada; anotações omitidas para leitores. */
export interface FichaNpcRecuperadaDto {
    readonly id: number;
    readonly campanhaId: number | null;
    readonly usuarioId: number;
    readonly tipo: TipoFichaEnum.NPC;
    readonly nome: string;
    readonly cor: string | null;
    readonly imagemUrl: string | null;
    readonly imagemFoco: FichaImagemFocoDto | null;
    readonly oculta: boolean;
    readonly dados: FichaNpcDadosDto;
}

/** Edição completa pelo dono/mestre; máximos não são recalculados. */
export interface FichaNpcAlterarDto {
    readonly nome: string;
    readonly cor?: string | null;
    readonly imagemFoco?: FichaImagemFocoDto | null;
    readonly oculta?: boolean;
    readonly dados: FichaNpcDadosDto;
}

/** Edição com id da rota, sem herança entre DTOs de negócio. */
export interface FichaNpcInternoAlterarDto {
    readonly id: number;
    readonly nome: string;
    readonly cor?: string | null;
    readonly imagemFoco?: FichaImagemFocoDto | null;
    readonly oculta?: boolean;
    readonly dados: FichaNpcDadosDto;
}

/** Documento alterado, preservando posse e tipo. */
export interface FichaNpcAlteradaDto {
    readonly id: number;
    readonly campanhaId: number | null;
    readonly usuarioId: number;
    readonly tipo: TipoFichaEnum.NPC;
    readonly nome: string;
    readonly cor: string | null;
    readonly imagemUrl: string | null;
    readonly imagemFoco: FichaImagemFocoDto | null;
    readonly oculta: boolean;
    readonly dados: FichaNpcDadosDto;
}

/** Ajuste pontual dos recursos e remoção explícita de Morrendo pelo mestre. */
export interface FichaNpcVitalidadeAlterarDto {
    readonly vidaAtual?: number;
    readonly energiaAtual?: number;
    readonly morrendo?: boolean;
}

/** Ajuste pontual com id, usado pela ficha e pela Iniciativa. */
export interface FichaNpcVitalidadeInternoAlterarDto {
    readonly id: number;
    readonly vidaAtual?: number;
    readonly energiaAtual?: number;
    readonly morrendo?: boolean;
}
