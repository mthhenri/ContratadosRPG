// Motor de rolagem de dados — m3-15. Funções puras: interpretar/validar uma fórmula
// (`NdM`, constantes, atributos `+LUT`) e rolá-la com os atributos da ficha (RNG injetável,
// única brecha a `Math.random` — §6.6). DTOs em `rolagem.dtos`, tabela de abreviações em
// `rolagem.dados`. Conferido contra docs/core/sistema-v4.1.0.md — "Atributos"/"Testes".
export * from './rolagem.dtos';
export * from './rolagem.dados';
export * from './rolagem';
