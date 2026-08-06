# Alinhamento dos filtros do inventário — design

## Objetivo

Separar visualmente as ações de criação e os filtros do inventário no desktop, sem alterar comportamento, estado ou o layout mobile já aprovado.

## Comportamento visual

- Fora de `bp.mobile`, `+ Adicionar itens` e `+ Item custom` permanecem alinhados à esquerda da barra de ações.
- O grupo de filtros Equipamentos, Amplificadores e Fragmentos ocupa a extremidade direita dessa mesma linha.
- Em `bp.mobile`, o grupo conserva o fluxo atual: segunda linha, rótulos abreviados e uma única linha interna.
- Esvaziar, Custos, busca, filtros ativos, ícones e rótulos acessíveis não mudam.

## Implementação

O SCSS do grupo `.ficha-inv__filtro` usará margem inicial automática apenas no desktop. Isso consome o espaço livre da linha flex e produz o mesmo resultado visual de dois grupos em `justify-content: space-between`, sem criar wrappers nem modificar a semântica do template. A regra é anulada no `bp.mobile`, onde a barra já recebe sua largura própria.

## Verificação

- O teste de componente preservará o gancho de alinhamento do filtro e os controles existentes.
- A aplicação real será observada em 1920×1080 para confirmar as duas extremidades da linha e em 360×800 para confirmar que o layout mobile não regrediu.

## Fora de escopo

Não haverá alteração de TypeScript, filtros disponíveis, ordem de Esvaziar/Custos/busca, modo compacto ou conteúdo textual.
