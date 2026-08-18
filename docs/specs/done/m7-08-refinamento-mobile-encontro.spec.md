# m7-08-refinamento-mobile-encontro.spec.md

> Task 8/8 do milestone `m7-encontro-combate.spec.md`.

## Objetivo

Fechar o milestone com o **recorte mobile** do encontro, fiel a
`docs/design/examples/iniciativa-mobile.html`, nos dois papéis.

## Entregáveis

1. **Cabeçalho condensado** `R3 · T3/6` e cartões enxutos: `Vida x/y · En x/y` e as defesas em uma
   linha (`Def · Esq · Blo · Con`), preservando a regra de que criatura mostra **só Defesa**.
2. **Ação primária no polegar**: `Avançar turno` como botão principal do mestre; demais controles
   acessíveis sem competir com ele.
3. **Alvos de toque** adequados e navegação confortável em ~360px, **sem scroll horizontal**,
   reusando o padrão responsivo por tokens da `m1-15`.
4. **Log** adaptado ao mobile (recolhido por padrão, alcançável por gatilho próprio), sem empurrar
   a lista de combatentes.

## Critérios de Aceite

- Verificação obrigatória pela skill `verify` em `360×800` **e** `1920×1080` (não regredir o
  desktop), percorrendo montagem, combate ativo e encerrado, nos papéis mestre e jogador
- Nenhum scroll horizontal; alvos de toque e contraste corretos
- `npm run test -w frontend` verde; `npm run lint -w frontend` limpo

## Dependências

- `m7-07` (tela completa com log)
