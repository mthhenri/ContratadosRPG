import { ModificadorCriaturaEnum } from '../../enums';
import type { FichaCriaturaDadosDto } from '../../dtos/ficha';
import type { FichaCriaturaValidadaDto } from './criatura.dtos';
import { calcularCustoResistencia, calcularLimiteResistencias, validarFraqueza } from './resistencia';

/** Distribuição fixa de Modificadores exigida por toda criatura, independente do VD
 * (docs/core/guia_de_mestre-v4.0.0.md — "Guia de Criação de Ameaças" > "Modificadores" >
 * "Distribuição"). */
const QUANTIDADE_ESPERADA_POR_MODIFICADOR: Readonly<Record<ModificadorCriaturaEnum, number>> = {
  [ModificadorCriaturaEnum.FORTE]: 2,
  [ModificadorCriaturaEnum.MEDIO]: 3,
  [ModificadorCriaturaEnum.FRACO]: 3,
  [ModificadorCriaturaEnum.FRAGIL]: 2,
};

/**
 * Validação de coerência de domínio da ficha de criatura completa — chamada pelo service em
 * `m4-03` antes de persistir, mesmo padrão de retorno de `validarDistribuicaoAtributos`
 * (`shared/regras/agente/criacao.ts`): lista de violações, vazia quando a ficha é coerente.
 *
 * Verifica: soma (com custo) das resistências dentro do Limite; ao menos 1 Fraqueza
 * declarada, cada uma respeitando o mínimo (`validarFraqueza`); nenhum tipo/subtipo
 * simultâneo em resistência e fraqueza; distribuição fixa 2 Forte / 3 Médio / 3 Fraco / 2
 * Frágil de Modificadores; ao menos um modo de Deslocamento preenchido.
 */
export function validarFichaCriatura(dados: FichaCriaturaDadosDto): FichaCriaturaValidadaDto {
  const violacoes: string[] = [];

  const somaResistencias = dados.resistencias.reduce((total, resistencia) => total + resistencia.valor, 0);
  const custoResistencias = dados.resistencias.reduce(
    (total, resistencia) =>
      total + calcularCustoResistencia({ valor: resistencia.valor, tipo: resistencia.tipo, ehSubtipo: resistencia.subtipo !== null }),
    0,
  );
  const quantidadeFraquezasExtras = Math.max(0, dados.fraquezas.length - 1);
  const limiteResistencias = calcularLimiteResistencias({ vd: dados.vd, quantidadeFraquezasExtras });
  if (custoResistencias > limiteResistencias) {
    violacoes.push(`resistências: custo total ${custoResistencias} excede o limite ${limiteResistencias}`);
  }

  if (dados.fraquezas.length === 0) {
    violacoes.push('fraquezas: ao menos uma fraqueza é obrigatória');
  }
  for (const fraqueza of dados.fraquezas) {
    if (!validarFraqueza({ valor: fraqueza.valor, somaResistencias })) {
      const rotulo = fraqueza.subtipo ? `${fraqueza.tipo} (${fraqueza.subtipo})` : fraqueza.tipo;
      violacoes.push(`fraquezas: ${rotulo} abaixo do valor mínimo exigido`);
    }
  }

  for (const resistencia of dados.resistencias) {
    const conflita = dados.fraquezas.some(
      (fraqueza) => fraqueza.tipo === resistencia.tipo && fraqueza.subtipo === resistencia.subtipo,
    );
    if (conflita) {
      const rotulo = resistencia.subtipo ? `${resistencia.tipo} (${resistencia.subtipo})` : resistencia.tipo;
      violacoes.push(`resistências: ${rotulo} também é fraqueza`);
    }
  }

  for (const tipo of Object.values(ModificadorCriaturaEnum)) {
    const quantidade = Object.values(dados.modificadores).filter((modificador) => modificador === tipo).length;
    const esperado = QUANTIDADE_ESPERADA_POR_MODIFICADOR[tipo];
    if (quantidade !== esperado) {
      violacoes.push(`modificadores: ${tipo} tem ${quantidade}, esperado ${esperado}`);
    }
  }

  const temDeslocamento =
    dados.deslocamento.terrestre != null ||
    dados.deslocamento.voador != null ||
    dados.deslocamento.aquatico != null ||
    dados.deslocamento.sobrenatural != null;
  if (!temDeslocamento) {
    violacoes.push('deslocamento: ao menos um modo deve ser declarado');
  }

  return { violacoes };
}
