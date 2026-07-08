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
3. **Gestão de usuários pelo admin** (backend + frontend): criar, alterar, excluir e **trocar
   o tipo** de qualquer usuário.
4. **Mecânica de "acesso limitado para testers"**: infra pronta para, em cada módulo novo,
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
  INTEGER FK (§10.2.12). É **coluna** (identidade/permissão), nunca JSONB.
- **Migration** que cria `tipo_usuario` (com seed dos 3 códigos), adiciona a FK em `usuario`, e
  faz o **backfill**: `senhor.contratados` = `ADMIN`, restante = `NORMAL`.
- **Autorização global** (infra reutilizável): tipo do usuário no payload do JWT; guard
  `autorizacao.guard.ts` + decorator `@TiposPermitidos(...tipos)` que barra quem não tiver um
  dos tipos exigidos → `UnauthorizedAccessException`. É a mesma peça usada por "só admin" e por
  "acesso limitado para testers".
- **Backend de gestão de usuários pelo admin**: CRUD completo de qualquer usuário + troca de
  tipo, protegido por `@TiposPermitidos(ADMIN)`, com a **invariante de ao menos um `ADMIN`
  ativo** (espelha "exatamente um mestre" da m2-10).
- **Frontend de gestão de usuários**: tela do admin (lista, criar, alterar, excluir, trocar
  tipo), rota protegida por `adminGuard`, item de menu visível só para admin.
- **Mecânica de tester documentada e pronta para uso** (o decorator acima + guia de como
  aplicar/remover num módulo novo), **sem aplicar** em nenhum módulo atual.

## Tasks

| Task | Conteúdo |
|---|---|
| `m6-01` | Migration `tipo_usuario` + FK/backfill em `usuario` + `TipoUsuarioEnum` (shared). Só banco + shared. |
| `m6-02` | Autorização global: tipo no payload do JWT, `autorizacao.guard.ts`, `@TiposPermitidos(...)`, mecânica de acesso limitado a tester documentada. |
| `m6-03` | Backend de gestão de usuários pelo admin (CRUD + troca de tipo + invariante de ≥1 admin). |
| `m6-04` | Frontend da tela de gestão de usuários (admin) + `adminGuard` + item de menu. |

## Decisões em aberto (padrões assumidos — reversíveis)

Estas escolhas foram feitas por padrão do projeto porque a confirmação interativa não pôde ser
coletada; ajustar aqui propaga para as tasks:

1. **Registro público continua aberto**, criando sempre `NORMAL` (menor ruptura sobre a m2-02).
   *Alternativa:* fechar o auto-registro e tornar o sistema só-por-admin (combina com "mesa
   privada do autor", SYSTEM.SPEC §15 "onboarding público não é objetivo"). Se optar por fechar,
   `m6-03` ganha a criação como única porta de entrada e a m2-02/m2-06 são ajustadas.
2. **Tipo do usuário viaja no payload do JWT** → guard checa sem ida ao banco; **troca de tipo
   só vale após novo login** (aceitável no v1). *Alternativa:* ler o tipo do banco a cada
   request (sempre fresco, custo de query).
3. **Mecânica de tester = só infra agora**, nenhum módulo existente travado.

## Critérios de Aceite (mínimos)

- Após a migration: `tipo_usuario` com `NORMAL`/`ADMIN`/`TESTER`; `senhor.contratados` é `ADMIN`;
  todas as demais contas são `NORMAL`.
- Rota anotada com `@TiposPermitidos(ADMIN)` responde 403 para não-admin e 200 para admin.
- Admin cria/altera/exclui usuários e troca o tipo de qualquer conta; **não** consegue deixar o
  sistema sem nenhum `ADMIN` ativo.
- Tela de gestão só acessível/visível para admin.
- Decorator de acesso limitado a tester existe, testado, e há guia de como aplicá-lo num módulo
  novo — sem travar módulo atual.

## Dependências

- M2 concluído (auth JWT, guard global, módulo `usuario`, `UsuarioRepository`, seed
  `senhor.contratados`).
