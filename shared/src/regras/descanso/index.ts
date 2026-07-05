// Regras de descanso — m1-04. Funções puras (faixa de recuperação, escada de
// dados, interpretação de dados extras, resultado a partir de valores rolados) +
// a utilidade de rolagem explícita `rolarDados` (única brecha a `Math.random` —
// SYSTEM.SPEC §6.6). Conferidas contra docs/core/sistema-v4.1.0.md — "Descanso".
// A escada de dados (`ESCADA_DADOS` + `elevarDado`) é primitiva compartilhada,
// também consumida pela aba compras (m1-05). DTOs em `descanso.dtos`.
export * from './descanso.dtos';
export * from './descanso.dados';
export * from './dado';
export * from './descanso';
