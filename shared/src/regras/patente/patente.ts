import { PATENTES, PatenteDados } from '../dados';
import { PatenteConsultaDto, PatenteConsultarDto, PatenteObterDto } from './patente.dtos';

/**
 * Patente correspondente a um valor de Prestígio: a faixa `[prestigioMinimo,
 * prestigioMaximo]` que contém o Prestígio informado. A última patente (Líder
 * Operacional) tem `prestigioMaximo` infinito, cobrindo 66+.
 *
 * Prestígio é sempre ≥ 0 no domínio do jogo (a patente Agente cobre 0–2), então
 * todo Prestígio válido cai em uma faixa. Para entradas fora do domínio (Prestígio
 * negativo) devolve a última patente — comportamento herdado de `getPatente` do
 * site antigo (`PATENTES.find(...) || PATENTES[length-1]`), preservado para
 * paridade; não é um caminho esperado.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Prestígio e Patentes".
 */
export function obterPatente(dto: PatenteObterDto): PatenteDados {
  const patenteEncontrada = PATENTES.find(
    (patente) => dto.prestigio >= patente.prestigioMinimo && dto.prestigio <= patente.prestigioMaximo,
  );
  return patenteEncontrada ?? PATENTES[PATENTES.length - 1];
}

/**
 * Recorte da aba patente: a patente atual do Prestígio informado somada à tabela
 * completa de patentes (para comparação de faixas, salários, multiplicadores e
 * limites de modificação). Espelha `calcPatente` do site antigo.
 */
export function calcularPatente(dto: PatenteConsultarDto): PatenteConsultaDto {
  return {
    patenteAtual: obterPatente({ prestigio: dto.prestigio }),
    tabela: PATENTES,
  };
}
