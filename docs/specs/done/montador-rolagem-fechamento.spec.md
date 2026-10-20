# montador-rolagem-fechamento.spec.md

> Spec do autor que fecha o experimento `montador-rolagem-experimento` (I-041). Decisão de 2026-10-20: o
> montador final é o **Completo**, e ele é liberado para todos os usuários. É a "spec do vencedor" reservada
> pelo guarda-chuva (`docs/specs/done/montador-rolagem-experimento.spec.md`, "Fora de Escopo").

## Objetivo

Ficar com **um** montador de rolagem — o Completo — disponível a qualquer usuário que role, e apagar o que o
experimento deixou: as versões Atual, Essencial e Blocos, o seletor de versão e a preferência guardada.

## Decisões do autor — 2026-10-20

1. Montador final: **Completo** (E3.1 do canvas, controles de base à vista).
2. **Liberado para todos** (`NORMAL`, `TESTER`, `ADMIN`), em toda tela em que a "Rolagem rápida" existe.
3. Não há seletor: quem nunca escolheu nada passa a ter o Completo, sem preferência a guardar.

## Entregáveis

1. **Gate**: remover `podeUsarMontador` (`shared/montador-rolagem-experimental/montador-acesso.ts`) e todo
   consumidor dele (`RolagemRapida`, input `permitido` do `MontadorRolagem`). Nenhuma tela reintroduz restrição
   local.
2. **Apagar o resto**: `MontadorRolagem` (Atual, com `montador-rolagem.util`), `montador-editor-blocos`,
   a versão Essencial e o que só elas usavam, `montador-seletor-versao`, `montador-versao`,
   `MontadorVersaoPreferenciaService` e a chave `contratados-rpg.montador-rolagem.versao` do `localStorage`.
   Antes de apagar, rodar `npm run impacto` por símbolo e listar consumidores restantes (skill
   `gerenciamento-de-impacto`); o que sobrar sem consumidor sai junto.
3. **Renomear** a pasta e o componente para o nome definitivo (`montador-rolagem`), sem o sufixo
   "experimental"; ajustar imports, specs e `docs/design/DESIGN.md` se o montador estiver descrito lá.
4. `RolagemRapida` passa a renderizar só o Completo, sem `@if`/`@else` de versão.
5. **Motor e testes**: o corpus das dez fórmulas dos jogadores continua rodando em função pura com zero
   divergência; testes de componente do Completo preservados; testes das versões apagadas removidos com elas.
6. **Cobertura por tela** (`montador-rolagem-cobertura-telas.spec.md`): como o gate cai, a auditoria ao vivo
   dessa spec passa a ser feita como jogador comum e a decisão (c) dela fica respondida por esta spec.
7. **Patchnote**: o montador entra na nota da versão que o liberar (`publicar-versao`), em "Para os players" e
   "Para o mestre", em linguagem de jogador.
8. **Contexto**: fechar o guarda-chuva (mover para `done/` com anexos), `HISTORY.md` com a avaliação do autor,
   `CONTEXT.md` (seção do experimento do montador vira descrição do montador único), `IDEAS.md` (I-041 sai de
   abertas) e `MEMORY.md` (ponteiros).

## Critérios de Aceite

- Jogador `NORMAL` vê e usa o montador na ficha, no card da campanha, na criatura/NPC e na rolagem do mestre,
  sem seletor.
- Nenhuma referência a Atual/Essencial/Blocos, a `podeUsarMontador` ou à chave de preferência no código.
- Montar, rolar e registrar no histórico funcionam como antes; a fórmula digitada na barra continua sendo a
  única fonte de verdade.
- Gate visual (`design-fidelity` + `verify`) em `1920×1080` e `360×800`, como `NORMAL` e como `TESTER`, no
  análogo aprovado pelo experimento (Completo), com todos os estados: fechado, aberto, fórmula avançada,
  fórmula inválida, e a janela flutuante.
- Testes, lint, build e `npm run repo:verificar` verdes; backend sem alteração.

## Fora de Escopo

- Mudar o desenho ou o comportamento do Completo além do necessário para remover o seletor.
- Levar a preferência do montador ao perfil/banco (não há preferência a guardar).
- Colocar o montador no `rolagem-avulso` do encontro e na ficha de NPC (decisões (a) e (b) da spec de cobertura).

## Dependências

`montador-rolagem-experimento` (4 tasks concluídas), `rolagem-expressao-quantidade-dados` (concluída), skills
`gerenciamento-de-impacto`, `design-fidelity`, `verify`, `publicar-versao`.
