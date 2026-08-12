# m6-07-refinamento-mobile-gestao-usuarios.spec.md

> Task 7/8 do milestone `m6-gestao-usuarios-papeis.spec.md` — **obrigatória, não opcional**
> (mesmo padrão de `m1-15`/`m2-08`/`m3-09`: nenhum milestone com UI fecha sem este passe).

> **Antes de qualquer ajuste:** ler `docs/design/DESIGN.md`; reusar
> `src/styles/tema/_breakpoints.scss` (`$bp-mobile`, mixin `mobile`, `$alvo-toque`) e o override
> de tokens de densidade (`--pad-card`/`--gap-grid`) já estabelecidos na `m1-15`. Nada de
> largura mágica por arquivo nem hex/fonte/raio solto (Proibição #29).

## Objetivo

Validação/refinamento mobile (~360px) de **toda a UI nova do M6**: a tela de gestão de
usuários (`m6-05`) e a tela de "acesso negado" (`m6-06`). Sem tocar em regra de jogo ou de
negócio — só apresentação, seguindo o padrão responsivo por tokens já validado nos milestones
anteriores.

## Entregáveis

1. **Tela de gestão de usuários** (`m6-05`) auditada/ajustada em ~360px:
   - Listagem (linhas ou cards, conforme o corte visual da `m6-05`) sem scroll horizontal do
     `body`; login/nome longos truncam com ellipsis ou quebram, nunca empurram o body.
   - Filtros de busca (login/nome/tipo) e o toggle de lixeira utilizáveis e sem overflow no
     mobile — reflow para coluna única se o corte desktop for uma linha de controles.
   - Formulários (criar conta, alterar nome/login, resetar senha, trocar tipo) confortáveis no
     polegar: campos e botões em coluna, sem inputs cortados.
   - Confirmação de exclusão e ação de reativar acessíveis e legíveis em tela pequena.
2. **Tela de "acesso negado"** (`m6-06`) auditada/ajustada em ~360px: blocos de censura, texto
   institucional, `[DADOS EXPURGADOS]`/`REDACTED` e o chip de classificação não vazam da
   viewport nem geram scroll horizontal; botão de retorno com alvo de toque adequado.
3. **Item de menu "Gestão de Usuários"** (topbar) auditado no mobile — mesmo tratamento de
   colapso/densidade já usado pelos demais itens de nav (`m2-08`).
4. **Alvos de toque** ≥ 44px em todos os controles interativos novos (`$alvo-toque`, mesma
   régua da `m1-15`).
5. Identidade preservada (dark base + IBM Plex + tokens); ajuste idealmente só em SCSS, sem
   mudança de DOM/TS que altere comportamento, salvo o mínimo necessário para envolver algo
   num container rolável.

## Critérios de Aceite

- Tela de gestão de usuários e tela de "acesso negado" usáveis em ~360px, **sem scroll
  horizontal do body**.
- Alvos de toque ≥ 44px nos controles novos.
- Item de menu de gestão de usuários continua alcançável e dentro da viewport no mobile.
- Verificação responsiva registrada (360/390/430px, na linha da §6 de `docs/PARIDADE-M1.md`),
  usando obrigatoriamente a skill `verify` — screenshot só do estado inicial não valida uma
  tela interativa; percorrer listagem, filtro, formulários e confirmação.
- `lint`/`test`/`build` do frontend verdes.

## Fora de Escopo

- Qualquer nova feature, tela ou mudança de regra de negócio/permissão.
- Rework visual das telas — aqui só se ajusta o comportamento responsivo do que a `m6-05`/`m6-06`
  já entregaram.

## Dependências

- `m6-05` (tela de gestão de usuários) e `m6-06` (tela de "acesso negado") — as duas frentes de
  frontend precisam estar prontas antes deste fechamento (ordem do milestone).
- `m1-15` (padrão responsivo por tokens, `$alvo-toque`, breakpoints).
