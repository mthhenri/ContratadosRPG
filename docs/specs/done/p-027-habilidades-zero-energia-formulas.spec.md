# P-027 — Habilidades de 0 E em fórmulas permanentes

## Objetivo

Automatizar os efeitos permanentes e incondicionais de `Tanque`, `Segundo Fôlego` e
`Metabolismo Acelerado`, fechando a cobertura desigual registrada em `PROBLEMS.md` P-027.

## Escopo

1. `calcularVida` recebe as habilidades da ficha e soma `+1 de Vida por progressão` de `Tanque`.
2. A criação, os fallbacks e a edição da ficha propagam as habilidades ao cálculo de Vida; ganhar
   ou perder `Tanque` atualiza a Vida máxima stored por delta, preservando ajustes manuais.
3. `montarResistencias` recebe as habilidades e soma `+3` à resistência de cada Proteção equipada
   quando há `Tanque`, inclusive nas notações que cobrem mais de um tipo de dano.
4. `calcularDescanso` recebe habilidades e os atributos Medicina/Vontade: `Segundo Fôlego` soma
   `Vigor ÷ 2`, arredondado para baixo, aos dados-base de Energia; `Metabolismo Acelerado` soma
   Medicina D4 de Vida e Vontade D4 de Energia apenas em descansos Médio/Longo.
5. A aba pública de Descanso expõe os dois efeitos como opções, inclui os atributos necessários,
   apresenta as fórmulas/faixas corretas e rola os dados adicionais pelo motor compartilhado.
6. Testes de regressão cobrem fórmula, criação/edição de ficha, resistência, descanso e UI.

## Fora de escopo

- Automatizar habilidades de custo maior que 0 E ou outras habilidades de 0 E condicionais.
- Alterar o custo, a descrição ou a disponibilidade das habilidades no catálogo.
- Recalcular retroativamente fichas persistidas sem que elas sejam editadas.

## Critérios de aceite

- Uma ficha Vanguarda nasce e progride com a Vida adicional de `Tanque`.
- Adicionar/remover `Tanque` numa ficha existente aplica apenas o delta mecânico da habilidade.
- Proteções equipadas recebem `+3` de resistência por `Tanque`; outros itens não recebem.
- Os dois efeitos de descanso aparecem na faixa, na fórmula e na rolagem quando selecionados.
- Build, testes e lint dos workspaces afetados ficam verdes.
- A calculadora de Descanso é verificada ao vivo em `1920×1080` e `360×800` contra o padrão visual
  existente da própria aba e dos controles de opção da calculadora de Compras.
