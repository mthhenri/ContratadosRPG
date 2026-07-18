/** Campo de vitalidade atual (recebe passos − / + de Vida/Energia). */
export type CampoVitalidadeAtual = 'vidaAtual' | 'energiaAtual';

/**
 * Aplica um passo (delta) à Vida ou Energia atual, clampando ao piso de cada campo — Vida nunca
 * fica negativa, Energia pode (regra do documento, m3-10: "a atual PODE exceder a máxima"). Sem
 * teto aqui: o limite máximo é responsabilidade do backend/`shared/regras`, não deste ajuste.
 *
 * Compartilhado entre a leitura da ficha (`FichaVisualizacao.ajustar`) e as ações rápidas do
 * mini-card no detalhe da campanha (m2-16g) — mesma regra, um só lugar.
 */
export function clamparVitalidade(campo: CampoVitalidadeAtual, atual: number, delta: number): number {
  const bruto = atual + delta;
  return campo === 'vidaAtual' ? Math.max(0, bruto) : bruto;
}
