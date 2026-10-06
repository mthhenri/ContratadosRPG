import type { FichaAtributosDto } from "./ficha.dtos";
import type { ModificadorCriaturaEnum } from "../../enums";

/** Distribuição inicial; não restringe os snapshots editáveis de uma ficha pronta. */
export interface CriaturaAtributosDistribuicaoCalcularDto {
    readonly vd: number;
    readonly atributosFinal: FichaAtributosDto;
}

export interface CriaturaAtributosRealocacaoValidarDto {
    readonly vd: number;
    readonly atributosFinal: FichaAtributosDto;
}

export interface CriaturaAtributosDistribuicaoDto {
    readonly base: number;
    readonly limite: number;
    readonly minimo: number;
    readonly pontosAjuste: number;
    readonly pontosRealocados: number;
    readonly limiteRealocacao: number;
    readonly gastos: number;
    readonly saldo: number;
    readonly violacoes: readonly string[];
}

/** Guia v4.2.0 > DTs de Atributos; modificador é resolvido pela tabela compartilhada. */
export interface CriaturaAtributoDtCalcularDto {
    readonly atributo: number;
    readonly modificador: ModificadorCriaturaEnum;
    readonly vd: number;
}
