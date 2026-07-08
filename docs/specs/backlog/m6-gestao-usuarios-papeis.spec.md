# m6-gestao-usuarios-papeis.spec.md

> **Milestone M6 — Gestão de Usuários & Papéis Globais.** Este spec fixa o escopo acordado.
> Quebrar nas tasks numeradas `m6-01`…`m6-04`. Milestone novo (não existia no plano original
> M0–M5); registrado em `SYSTEM.SPEC.md §15`.

## Objetivo

Introduzir **tipo de usuário global** (papel de aplicação, distinto do papel *por campanha*
MESTRE/JOGADOR já existente) para diferenciar `NORMAL`, `ADMIN`, `TESTER` (e novos tipos no
futuro), com:

1. **Modelo de dados** do tipo de usuário (enum de coluna + tabela de referência) e
   **backfill**: `senhor.contratados` → `ADMIN`, todos os demais → `NORMAL`.
2. **Autorização global** reutilizável — guard + decorator que restringe rotas por tipo de
   usuário (a base tanto do "só admin" quanto da mecânica de tester).
3. **Gestão de usuários pelo admin** (backend + frontend): **todas** as ações sobre qualquer
   conta — criar, alterar (nome/login), **resetar a senha**, **trocar o tipo**, excluir
   (soft delete) e **reativar** (desfazer o soft delete), com **busca/filtro** na listagem.
4. **Invalidação de sessão imediata**: resetar senha, rebaixar/trocar tipo ou excluir uma conta
   passam a valer **na hora** (não só no próximo login), via versão de token conferida no guard.
5. **Mecânica de "acesso limitado para testers"**: infra pronta para, em cada módulo novo,
   liberar acesso apenas a `ADMIN`/`TESTER` durante a fase de testes e depois abrir para todos —
   **sem** travar nenhum módulo existente nesta entrega.

## Diferença essencial: papel global × papel de campanha

O projeto já tem `TipoCampanhaMembroPapelEnum` (`MESTRE|JOGADOR`) — esse é o papel **dentro de
uma campanha**, na tabela `campanha_membro`. O **tipo de usuário** deste milestone é ortogonal
e **global**: vale para a conta inteira, independe de campanha, e mora numa coluna da tabela
`usuario`. Um `ADMIN` pode ser `JOGADOR` numa campanha; um `NORMAL` pode ser `MESTRE` na sua.
As duas dimensões não se substituem nem se derivam.

## Escopo Acordado

- **Enum de coluna** `TipoUsuarioEnum` (`NORMAL | ADMIN | TESTER`) no `shared/`, com tabela de
  referência `tipo_usuario` (`codigo` + `descricao`) e coluna `usuario.tipo_usuario_id`
  INTEGER FK (§10.2.12). É **coluna** (identidade/permissão), nunca JSONB. O **nome da coluna**
  segue a convenção (`descricao`, Proibição #24), mas o **conteúdo é um rótulo/título curto**
  ("Administrador", "Normal", "Testador") — é ele que o frontend exibe como label do tipo, nunca
  o `codigo` cru.
- **Compatibilidade com o que já existe (M2)** — obrigatório para não quebrar o cadastro atual:
  - O **registro público** (m2-02) passa a gravar `tipo = NORMAL` explicitamente no `INSERT`
    (assim que a coluna vira `NOT NULL`, o insert que existe hoje quebraria sem isso).
  - A **exclusão da própria conta** (self-service, m2-11 — `DELETE /usuario`) passa a respeitar a
    **invariante de ≥1 `ADMIN` ativo**: o último admin não pode se autoexcluir pela tela de
    Perfil (a regra não pode viver só nas rotas de admin-sobre-terceiros).
- **Migration** que cria `tipo_usuario` (com seed dos 3 códigos), adiciona a FK
  `usuario.tipo_usuario_id` e a coluna `usuario.token_versao` (contador de invalidação de
  sessão), e faz o **backfill**: `senhor.contratados` = `ADMIN`, restante = `NORMAL`,
  `token_versao` = 1 em todas as contas.
- **Autorização global** (infra reutilizável): guard `autorizacao.guard.ts` + decorator
  `@TiposPermitidos(...tipos)` que barra quem não tiver um dos tipos exigidos →
  `UnauthorizedAccessException`. O guard faz uma **leitura leve de sessão** (PK em `usuario`)
  que garante tipo sempre fresco, respeita conta excluída e confere a **versão de token**
  (invalidação imediata). É a mesma peça usada por "só admin" e por "acesso limitado para testers".
- **Backend de gestão de usuários pelo admin**: **todas** as ações sobre qualquer conta — criar,
  alterar (nome/login), resetar senha, trocar tipo, excluir e **reativar** — mais **busca/filtro**
  na listagem, protegido por `@TiposPermitidos(ADMIN)`, com: **invariante de ≥1 `ADMIN` ativo**
  (espelha "exatamente um mestre" da m2-10), **proteções de auto-ação** (admin não se auto-exclui/
  rebaixa), **bump da versão de token** nas ações que devem derrubar a sessão (reset de senha,
  troca de tipo, exclusão) e **tratamento da exclusão de um usuário que é mestre de campanha**
  (evitar campanha órfã).
- **Frontend de gestão de usuários**: tela do admin (lista com busca/filtro, criar, alterar,
  resetar senha, trocar tipo, excluir, reativar), rota protegida por `adminGuard`, item de menu
  visível só para admin.
- **Mecânica de tester documentada e pronta para uso** (backend + frontend), **sem aplicar** em
  nenhum módulo atual:
  - *Backend:* o decorator `@TiposPermitidos(ADMIN, TESTER)` + guia de como aplicar/remover num
    módulo novo.
  - *Frontend:* um `tipoGuard` genérico (irmão do `adminGuard`) para as rotas dos módulos "em
    testes" e a ocultação do item de menu para quem não tem acesso — para um `NORMAL` nunca ver
    um link que responderia 403.
- **Tela de "acesso negado"** (rota padrão do frontend) para onde o `tipoGuard` redireciona quem
  não tem acesso a um módulo restrito. Estética **institucional SCP "Terminal de Contenção"**
  (identidade `docs/design/`): texto corporativo/frio da Fundação, blocos de censura (quadrados
  pretos) e `[DADOS EXPURGADOS]`/`REDACTED` sobre parte do conteúdo, chip de classificação no
  padrão `CLASSE-_ // CONFIDENCIAL`. Só tokens do tema (Proibição #29); reaproveitável por
  qualquer negação de acesso futura, não só a de tester.

## Extensão: adicionar um novo tipo de usuário (futuro)

O conjunto `NORMAL | ADMIN | TESTER` é o inicial; a modelagem é aberta a novos tipos. Para
adicionar um (ex.: `MODERADOR`), no futuro, bastam dois passos, sem refatorar o mecanismo:

1. **Migration**: `INSERT` de uma linha em `tipo_usuario` (`codigo` + `descricao`/rótulo), por
   literal SQL (§10.7) — a tabela de referência é a fonte da verdade da coluna.
2. **Shared**: novo membro no `TipoUsuarioEnum` (string enum, valor = nome).

A partir daí o tipo já pode ser atribuído pelo admin e usado em `@TiposPermitidos(...)` /
`tipoGuard`. Nenhuma mudança no guard, na tela de gestão nem no fluxo de sessão é necessária.

## Quebra em tasks (proposta — a redigir quando o milestone entrar)

> Ainda **não** redigidas como specs próprias. Seguindo o fluxo do projeto, o milestone é
> quebrado em tasks numeradas (`m6-01`…) só quando chega a vez. Esta tabela é o plano de
> intenção; cada linha vira uma `m6-NN-*.spec.md` na hora.

| Task | Conteúdo |
|---|---|
| `m6-01` | Migration `tipo_usuario` (com rótulos em `descricao`) + `usuario.tipo_usuario_id` (FK/backfill) + `usuario.token_versao` + `TipoUsuarioEnum` (shared). Ajusta o `INSERT` do registro (m2-02) para gravar `NORMAL`. Só banco + shared. |
| `m6-02` | Autorização global: `autorizacao.guard.ts` com leitura leve de sessão (tipo fresco + versão de token = invalidação imediata), `@TiposPermitidos(...)`, tipo no login/JWT, mecânica de acesso limitado a tester documentada. |
| `m6-03` | Backend de gestão pelo admin: criar/alterar/resetar senha/trocar tipo/excluir/reativar + busca/filtro + invariante de ≥1 admin (inclui o self-service `DELETE /usuario` da m2-11) + proteções de auto-ação + bump de versão de token + tratamento de exclusão de mestre. |
| `m6-04` | Frontend da tela de gestão de usuários (admin) + `adminGuard` + item de menu + `tipoGuard` genérico + tela de "acesso negado" SCP. |

## Decisões em aberto (padrões assumidos — reversíveis)

Estas escolhas foram feitas por padrão do projeto porque a confirmação interativa não pôde ser
coletada; ajustar aqui propaga para as tasks:

1. **Registro público continua aberto**, criando sempre `NORMAL` (menor ruptura sobre a m2-02).
   *Alternativa:* fechar o auto-registro e tornar o sistema só-por-admin (combina com "mesa
   privada do autor", SYSTEM.SPEC §15 "onboarding público não é objetivo"). Se optar por fechar,
   `m6-03` ganha a criação como única porta de entrada e a m2-02/m2-06 são ajustadas.
2. **Guard lê uma sessão leve do banco por request** (PK em `usuario`: tipo, `token_versao`,
   `is_deleted`). Isso torna troca de tipo, reset de senha, exclusão e reativação **imediatos**
   — foi a escolha explícita de "invalidação de sessão imediata". O `tipo` ainda viaja no JWT/
   login como conveniência (para `@ActiveUser()` e para a sessão do frontend), mas a **autoridade
   é a linha fresca**. *Trade-off:* uma leitura indexada por PK por request protegido — negligível
   nesta escala; se um dia pesar, cachear `{ id → token_versao, tipo }` em memória (Render free
   tier é instância única no v1, então cache em memória basta). *Alternativa descartada:* tipo só
   no JWT sem tocar o banco (mais barato, mas invalidação só valeria no próximo login).
3. **Mecânica de tester = só infra agora**, nenhum módulo existente travado.
4. **Reativar conta lê linhas com `is_deleted = true`** (a "lixeira" do admin). Toda a query é
   explícita nesse filtro — não *omite* `is_deleted` (proibição #4 veda omitir, não veda filtrar
   por `= true`); é a única superfície que enxerga deletados, restrita ao admin. Confirmar essa
   leitura contra a constituição ao implementar a m6-03.

## Critérios de Aceite (mínimos)

- Após a migration: `tipo_usuario` com `NORMAL`/`ADMIN`/`TESTER`; `senhor.contratados` é `ADMIN`;
  todas as demais contas são `NORMAL`.
- Rota anotada com `@TiposPermitidos(ADMIN)` responde 403 para não-admin e 200 para admin.
- Admin cria/altera/reseta senha/exclui/reativa usuários e troca o tipo de qualquer conta;
  **não** consegue deixar o sistema sem nenhum `ADMIN` ativo nem se auto-excluir/rebaixar — nem
  pela gestão nem pela **exclusão da própria conta** (self-service, m2-11).
- O registro público continua funcionando após a coluna virar `NOT NULL` (grava `NORMAL`).
- Após resetar senha, rebaixar ou excluir uma conta, a sessão dela cai **no request seguinte**
  (versão de token), sem esperar o login expirar.
- A listagem tem busca/filtro por login/nome/tipo.
- Tela de gestão só acessível/visível para admin; o tipo aparece pelo **rótulo** (`descricao`),
  não pelo `codigo`.
- Decorator de acesso limitado a tester existe, testado, e há guia de como aplicá-lo num módulo
  novo — sem travar módulo atual; no frontend, o `tipoGuard` redireciona quem não tem acesso para
  a **tela de "acesso negado"** (estética SCP), e o item de menu some para esse usuário.

## Dependências

- M2 concluído (auth JWT, guard global, módulo `usuario`, `UsuarioRepository`, seed
  `senhor.contratados`).
