# ficha-criatura-formularios-compactos.spec.md

> Task avulsa: compactar os formulários inline de Ataques, Resistências e Fraquezas da Ficha de Criatura, conforme pedido direto do autor.

## Objetivo

Reorganizar os controles de edição da Ficha de Criatura para deixar a criação e alteração de ataques, resistências e fraquezas mais densas, sem alterar os contratos, valores ou regras de salvamento.

## Entregáveis

1. O formulário de Ataque apresenta Custo de ação, Nome e Atinge área antes das fórmulas; Teste, Dano e Dano crítico dividem uma linha em três colunas; Efeito adicional passa a ser um `textarea` de largura total.
2. Os formulários compartilhados de Resistências e Fraquezas apresentam Tipo, Subtipo e Valor na mesma linha.
3. Testes de componente cobrem a estrutura dos dois formulários e a edição continua emitindo os mesmos DTOs.

## Critérios de Aceite

1. Em tela larga, os três campos de fórmula de ataque têm a mesma largura e ocupam integralmente sua linha; Tipo, Subtipo e Valor também aparecem lado a lado tanto em Resistências quanto em Fraquezas.
2. O formulário de Ataque usa `textarea` para Efeito adicional e mantém os controles na ordem Custo de ação, Nome, Atinge área, fórmulas e efeito.
3. Os testes focados dos dois componentes, lint e build do frontend passam.
4. A Ficha de Criatura é observada na aplicação real em `1920×1080` e `360×800`, em criação/edição de ataque e de resistência/fraqueza, sem overflow e contra o análogo `docs/design/examples/ficha-de-criatura.html`.

## Fora de Escopo

- Alterar os valores, validações, DTOs ou persistência de ataques, resistências e fraquezas.
- Redesenhar os cards de leitura, as ações de rolagem ou os controles de edição já padronizados na tarefa anterior.
- Alterar a criação inicial de criatura fora desses componentes inline.

## Dependências

- `docs/design/DESIGN.md`, `docs/design/tema/_tokens.scss` e `docs/design/examples/ficha-de-criatura.html`.
- Componentes existentes `CriaturaAtaqueLista` e `CriaturaResistenciaLista`.

## Riscos e Mitigação

- Os três campos de fórmula podem ficar estreitos no mobile; a grade preserva as três colunas com `minmax(0, 1fr)` e a verificação ao vivo confirma que não há overflow.
