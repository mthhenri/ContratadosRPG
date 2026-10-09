# Usabilidade 04 — Explicação das estatísticas calculadas

> Task 4/6 da revisão pública de 09/10/2026; recorte de estatísticas do achado U-04 no [relatório](../active/usabilidade-classes-condicoes-2026-10-09/RELATORIO.md). Quebra solicitada pelo autor. Prioridade média.

## Objetivo

Explicar os valores calculados em Simulação → Agente / Civil no ponto de leitura, mantendo
a hierarquia dos resultados e esclarecendo o que não se aplica ao registro Civil.

## Entregáveis

1. Explicação contextual dos resultados, com nomes completos dos atributos e decomposição
   legível dos valores quando prevista pelo cálculo existente; detalhe sob demanda para preservar densidade.
2. Explicação explícita para campos não aplicáveis a Civil, sem apresentar N/A como informação
   ausente nem conservar uma fórmula que induza a esperar um resultado utilizável.
3. Ajuda e rótulos consistentes com a apresentação; relatório em `usabilidade-04-compreensao-estatisticas/`,
   evidências locais em `.artifacts/usabilidade-04-compreensao-estatisticas/`.

## Critérios de Aceite

Com nível/atributos fixos, valores antes/depois são iguais para classes, Experimentos e Civil.
A pessoa consegue relacionar os nomes usados na explicação aos campos de entrada e identificar
por que um resultado não se aplica. Não criar uma segunda fórmula no frontend: decomposição
consome contratos existentes ou, se necessário, nasce no motor puro compartilhado.

Análogo: Status do Personagem e decomposição do Resultado em Novo Agente, inspecionados na UI
atual. Preservar destaque de Vida/Energia e usar componentes/tooltip existentes. Se faltar
variante/componente, a ampliação depende de decisão do autor.

Usar `verify` em 1920×1080, 1366×768, 960×1080 e 360×800: classes/Civil, limites de entradas,
resultados aplicáveis/não aplicáveis, detalhe aberto/fechado, teclado e toque. Confirmar texto
inteiro, foco e ausência de corte/overflow. Testes proporcionais de invariância dos resultados
e interpretação dos estados; build, lint e `repo:verificar` registrados.

## Fora de Escopo

Modificar valores/fórmulas de jogo, persistência de ficha ou progressão (task 05); aplicar
redesign às fichas autenticadas sem primeiro observar e especificar essas jornadas.

## Dependências

Constituição/convenções, design e tema; Sistema vigente, estatísticas e Civil;
calculadora Agente/Civil e motor em `shared/regras`. Se o contrato de decomposição mudar,
seguir convenções de DTOs e regras puras, sem duplicação de domínio.
