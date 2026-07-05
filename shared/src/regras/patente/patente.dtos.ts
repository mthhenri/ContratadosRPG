import { PatenteDados } from '../dados';

/**
 * DTOs de entrada e value-objects de saída do domínio de patentes
 * (`regras/patente`, m1-03). "Dados tipados" do motor de regras (SYSTEM.SPEC
 * §6.6): funções puras recebem sempre um DTO tipado. Entradas seguem o verbo no
 * infinitivo; a saída é um recorte computado (value-object sem verbo).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Prestígio e Patentes". A tabela em si
 * (`PATENTES`) vive em `regras/dados` (m1-01).
 */

/** Entrada de `obterPatente`: patente correspondente ao Prestígio informado. */
export interface PatenteObterDto {
  readonly prestigio: number;
}

/** Entrada de `calcularPatente`: recorte da aba patente para o Prestígio informado. */
export interface PatenteConsultarDto {
  readonly prestigio: number;
}

/**
 * Recorte da aba patente: a patente atual (correspondente ao Prestígio) e a
 * tabela completa de patentes em ordem crescente de Prestígio, para exibição
 * comparativa. `tabela` é a mesma `PATENTES` de `regras/dados`.
 */
export interface PatenteConsultaDto {
  readonly patenteAtual: PatenteDados;
  readonly tabela: readonly PatenteDados[];
}
