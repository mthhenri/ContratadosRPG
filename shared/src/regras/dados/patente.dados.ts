import { PatenteEnum } from '../../enums';

/**
 * Uma linha da tabela de patentes: faixa de Prestígio, salário por missão,
 * multiplicador do bônus monetário de novo agente (m1-03), limite de
 * modificações por item e limite de crédito (padrão de vida fora da
 * Fundação). Fonte: docs/core/sistema-v4.1.0.md — "Prestígio e Patentes" e
 * "Bônus Monetário".
 */
export interface PatenteDados {
  readonly patente: PatenteEnum;
  readonly prestigioMinimo: number;
  /** `Number.POSITIVE_INFINITY` na última patente — `JSON.stringify` converte para `null`, então nunca serializar este campo cru (ex.: DTO/JSONB); serializar como ausência de limite. */
  readonly prestigioMaximo: number;
  readonly salario: number;
  readonly multiplicador: number;
  readonly limiteModificacoes: string;
  /** Rótulo do padrão de vida coberto pela Fundação fora de missão (doc — "Limite de Crédito"), de Baixo a Ilimitado. */
  readonly limiteCredito: string;
  /** Descrição do padrão de vida de `limiteCredito` — doc, tabela "Limite | Descrição" da seção "Limite de Crédito". */
  readonly descricaoLimiteCredito: string;
}

/**
 * Patentes em ordem crescente de Prestígio. `prestigioMaximo` da última
 * patente é `Number.POSITIVE_INFINITY` (66+, sem limite superior). Sem
 * divergências numéricas em relação a `contratados-calculadora/src/script.js`
 * (`PATENTES`) — apenas os nomes completos do documento substituem as
 * abreviações do site antigo ("FT Especial" → "Força Tarefa Especial",
 * "Op. Especiais" → "Operações Especiais"), ver `PatenteEnum`.
 */
export const PATENTES: readonly PatenteDados[] = [
  {
    patente: PatenteEnum.AGENTE,
    prestigioMinimo: 0,
    prestigioMaximo: 2,
    salario: 1000,
    multiplicador: 1.0,
    limiteModificacoes: '1 nível de empilhamento até 2 modificações no item',
    limiteCredito: 'Baixo',
    descricaoLimiteCredito:
      'Subsistência mínima. Moradia em áreas de baixo custo, transporte público e foco absoluto na sobrevivência básica entre missões.',
  },
  {
    patente: PatenteEnum.OPERADOR,
    prestigioMinimo: 3,
    prestigioMaximo: 5,
    salario: 1500,
    multiplicador: 1.5,
    limiteModificacoes: '2 níveis de empilhamento até 4 modificações no item',
    limiteCredito: 'Médio',
    descricaoLimiteCredito:
      'Padrão classe média. Residência funcional, transporte próprio decente e capacidade de manter uma rotina civil sem preocupações imediatas.',
  },
  {
    patente: PatenteEnum.EXPERIENTE,
    prestigioMinimo: 6,
    prestigioMaximo: 11,
    salario: 2500,
    multiplicador: 2.0,
    limiteModificacoes: '2 níveis de empilhamento até 6 modificações no item',
    limiteCredito: 'Confortável',
    descricaoLimiteCredito:
      'Estabilidade sólida. Acesso a bens de qualidade, serviços de saúde privados e capacidade de financiar itens duráveis ou lazer.',
  },
  {
    patente: PatenteEnum.VETERANO,
    prestigioMinimo: 12,
    prestigioMaximo: 20,
    salario: 3500,
    multiplicador: 2.5,
    limiteModificacoes: '3 níveis de empilhamento até 9 modificações no item',
    limiteCredito: 'Alto',
    descricaoLimiteCredito:
      'Status de "cliente vip". Residências bem localizadas, veículos de alto padrão e facilidade de acesso a bens de consumo de luxo.',
  },
  {
    patente: PatenteEnum.FORCA_TAREFA,
    prestigioMinimo: 21,
    prestigioMaximo: 32,
    salario: 4500,
    multiplicador: 3.0,
    limiteModificacoes: '3 níveis de empilhamento até 12 modificações no item',
    limiteCredito: 'Elevado',
    descricaoLimiteCredito:
      'Elite logística. Acesso a clubes exclusivos, propriedades de luxo e liquidez imediata para qualquer capricho ou necessidade não planejada.',
  },
  {
    patente: PatenteEnum.FORCA_TAREFA_ESPECIAL,
    prestigioMinimo: 33,
    prestigioMaximo: 47,
    salario: 5250,
    multiplicador: 3.5,
    limiteModificacoes: '4 níveis de empilhamento até 15 modificações no item',
    limiteCredito: 'Prestigiado',
    descricaoLimiteCredito:
      'Estilo de vida aristocrático. Propriedades privadas com segurança, viagens internacionais e conexões sociais de alta influência no mundo civil.',
  },
  {
    patente: PatenteEnum.OPERACOES_ESPECIAIS,
    prestigioMinimo: 48,
    prestigioMaximo: 65,
    salario: 6250,
    multiplicador: 4.0,
    limiteModificacoes: '4 níveis de empilhamento até 18 modificações no item',
    limiteCredito: 'Exclusivo',
    descricaoLimiteCredito:
      'Status de celebridade/magnata. Qualquer luxo comum está ao alcance. Conexões mundanas profundas e poder de decisão financeira pessoal ilimitado.',
  },
  {
    patente: PatenteEnum.LIDER_OPERACIONAL,
    prestigioMinimo: 66,
    prestigioMaximo: Number.POSITIVE_INFINITY,
    salario: 7500,
    multiplicador: 4.5,
    limiteModificacoes: '5 níveis de empilhamento até 20 modificações no item',
    limiteCredito: 'Ilimitado',
    descricaoLimiteCredito:
      'Influência global. Dinheiro é irrelevante; acesso total a recursos, infraestrutura e serviços em qualquer lugar do mundo.',
  },
];
