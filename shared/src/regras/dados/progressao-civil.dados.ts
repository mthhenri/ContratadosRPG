import type { BeneficiosPorNivel } from './progressao-agente.dados';

/**
 * Mapa de treinamento civil (0–5) para a lista de benefícios ganhos naquele
 * treinamento. Usado pelas fórmulas de progressão de `regras/agente` (m1-02)
 * quando a classe é Civil. Fonte: docs/core/sistema-v4.1.0.md — "Jogando como
 * um Civil" > "Treinamentos". Sem divergências encontradas em relação a
 * `contratados-calculadora/src/script.js`.
 */
export const dadosCivil: BeneficiosPorNivel = {
  0: [],
  1: ['Treinamento Iniciante', '+1 Habilidade Civil', '+1 Atributo'],
  2: ['Treinamento Treinado', '+1 Habilidade Civil'],
  3: ['Treinamento Profissional', '+1 Habilidade Civil', '+1 Atributo'],
  4: ['Treinamento Especialista', '+1 Habilidade Civil'],
  5: [
    'Treinamento Elite',
    '+1 Habilidade Civil',
    '+1 Atributo',
    '1 Habilidade de Classe (sem benefícios gerais da classe)',
  ],
};
