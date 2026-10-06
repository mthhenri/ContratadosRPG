// Motor de rolagem de dados — m3-15. Funções puras: interpretar/validar uma fórmula
// (`NdM`, constantes, atributos `+LUT`) e rolá-la com os atributos da ficha (RNG injetável,
// única brecha a `Math.random` — §6.6). DTOs em `rolagem.dtos`, tabela de abreviações em
// `rolagem.dados`, conta aritmética (`+ − × ÷`, I-041) em `rolagem.conta`, fórmula em peças
// (montador-exp-01) em `rolagem.pecas`; `rolagem.leitura` é interno (não reexportado). Conferido contra docs/core/sistema-v4.1.3.md — "Atributos"/"Testes".
export * from './rolagem.dtos';
export * from './rolagem.dados';
export * from './rolagem.conta';
export * from './rolagem';
export * from './rolagem.pecas';
