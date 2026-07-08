// Regras de compras — m1-05. Funções puras (limite de modificações por patente,
// custo e peso de modificação, conflitos, stat computado de item, custo de
// amplificador e totais do carrinho) + os dados tipados do catálogo, das
// modificações e dos amplificadores. Conferidas contra docs/core/sistema-v4.1.0.md
// — "Equipamentos", "Prestígio e Patentes" e "Amplificadores". Reusa
// `obterPatente` (m1-03) e `elevarDado` (m1-04). DTOs em `compras.dtos`.
export * from './compras.dtos';
export * from './compras.dados';
export * from './catalogo.dados';
export * from './compras';
export * from './venda.dtos';
export * from './venda.dados';
export * from './venda';
