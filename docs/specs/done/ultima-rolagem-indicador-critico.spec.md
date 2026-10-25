# ultima-rolagem-indicador-critico.spec.md

> Task avulsa autorizada pelo autor: indicar crítico na última rolagem do card de personagem da campanha.

## Objetivo

Permitir reconhecer um crítico diretamente na faixa Última rolagem do card de personagem,
preservando o rótulo e o total registrados pelo servidor.

## Entregáveis

1. `EspectadorFichaCard` exibe o ícone canônico `critico` antes do texto quando
   `resultado.critico` é verdadeiro ou algum `resultado.dados[].criticos` é positivo,
   seguindo a apresentação de `ResultadoRolagem`, sem inferir pelo total ou fórmula.
2. Ícone e texto recebem brilho do padrão existente de `ResultadoRolagem`;
   sem Chip nem texto visível Crítico, com identificação acessível. Preservar
   ícone e total, elidindo somente o rótulo quando faltar espaço.
   A mudança alcança os usos desse mesmo card que recebem `ultimaRolagem` (campanha:
   mestre, espectador e NPC), sem estender a outro tipo de card.
3. Testes cobrem flags autoritativas, resultado comum com total alto, ausência e
   substituição de uma última rolagem crítica por uma comum.

Anexos: `ultima-rolagem-indicador-critico/`. Evidências locais:
`.artifacts/ultima-rolagem-indicador-critico/`, ignorada pelo Git.

## Critérios de Aceite

- Testes focados do card passam com crítico e sem crítico.
- Build e lint do frontend e `npm run repo:verificar` passam no gate integrado.
- Agente principal observa crítico, comum e ausência na aplicação real em
  1920×1080 e 360×800; compara com `ResultadoRolagem` e o card atual, verificando
  hierarquia, densidade, legibilidade, ícone canônico e ausência de overflow.

## Fora de Escopo

Regras, fórmulas, permissões, DTOs/eventos/backend, mudança da seleção da última
rolagem, card de criatura, primitivos, ícones ou estilos globais.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md` e tema.

## Estado

Concluída; inspeção pessoal e gates em
[`verificacao.md`](ultima-rolagem-indicador-critico/verificacao.md).
