import { PatenteEnum } from '../../enums';

/**
 * Uma linha da tabela de patentes: faixa de Prestígio, salário por missão,
 * multiplicador do bônus monetário de novo agente (m1-03) e limite de
 * modificações por item. Fonte: docs/core/sistema-v4.1.0.md — "Prestígio e
 * Patentes" e "Bônus Monetário".
 */
export interface PatenteDados {
  readonly patente: PatenteEnum;
  readonly prestigioMinimo: number;
  /** `Number.POSITIVE_INFINITY` na última patente — `JSON.stringify` converte para `null`, então nunca serializar este campo cru (ex.: DTO/JSONB); serializar como ausência de limite. */
  readonly prestigioMaximo: number;
  readonly salario: number;
  readonly multiplicador: number;
  readonly limiteModificacoes: string;
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
  },
  {
    patente: PatenteEnum.OPERADOR,
    prestigioMinimo: 3,
    prestigioMaximo: 5,
    salario: 1500,
    multiplicador: 1.5,
    limiteModificacoes: '2 níveis de empilhamento até 4 modificações no item',
  },
  {
    patente: PatenteEnum.EXPERIENTE,
    prestigioMinimo: 6,
    prestigioMaximo: 11,
    salario: 2500,
    multiplicador: 2.0,
    limiteModificacoes: '2 níveis de empilhamento até 6 modificações no item',
  },
  {
    patente: PatenteEnum.VETERANO,
    prestigioMinimo: 12,
    prestigioMaximo: 20,
    salario: 3500,
    multiplicador: 2.5,
    limiteModificacoes: '3 níveis de empilhamento até 9 modificações no item',
  },
  {
    patente: PatenteEnum.FORCA_TAREFA,
    prestigioMinimo: 21,
    prestigioMaximo: 32,
    salario: 4500,
    multiplicador: 3.0,
    limiteModificacoes: '3 níveis de empilhamento até 12 modificações no item',
  },
  {
    patente: PatenteEnum.FORCA_TAREFA_ESPECIAL,
    prestigioMinimo: 33,
    prestigioMaximo: 47,
    salario: 5250,
    multiplicador: 3.5,
    limiteModificacoes: '4 níveis de empilhamento até 15 modificações no item',
  },
  {
    patente: PatenteEnum.OPERACOES_ESPECIAIS,
    prestigioMinimo: 48,
    prestigioMaximo: 65,
    salario: 6250,
    multiplicador: 4.0,
    limiteModificacoes: '4 níveis de empilhamento até 18 modificações no item',
  },
  {
    patente: PatenteEnum.LIDER_OPERACIONAL,
    prestigioMinimo: 66,
    prestigioMaximo: Number.POSITIVE_INFINITY,
    salario: 7500,
    multiplicador: 4.5,
    limiteModificacoes: '5 níveis de empilhamento até 20 modificações no item',
  },
];
