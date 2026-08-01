# CONTEXT.md — Painel do Projeto

> **Última revisão:** 2026-08-01 · **Última task registrada:** `m2-18` (2026-08-01)
>
> Este arquivo diz **o que é verdade agora**. Ele é **reescrito**, nunca acrescido — teto de
> ~400 linhas. O relato de *como se chegou aqui* está em [`HISTORY.md`](HISTORY.md).
>
> Vizinhos: [`PROBLEMS.md`](PROBLEMS.md) (o que está quebrado) ·
> [`MEMORY.md`](MEMORY.md) (onde fica o quê) · [`IDEAS.md`](IDEAS.md) (o que ainda não é sistema) ·
> [`HISTORY.md`](HISTORY.md) (o que aconteceu e por quê).

---

## 1. Próxima Task

**Declarada no último registro do `HISTORY.md` (fecho da `m2-18`): `m2-19` — painel de
campanhas: detalhe `/painel/:id` na visão do mestre** (esquadrão) —
`docs/specs/backlog/m2-19-painel-campanha-detalhe-mestre.spec.md`. Segue a mesma frente de
redesenho do painel de campanhas iniciada pela `m2-18` (lista → painel de controle); `m2-20`
(mesma tela na visão do jogador) é a irmã dela, logo depois.

### Fila do backlog (`docs/specs/backlog/`)

| Spec | Frente | O que é |
|---|---|---|
| `m2-19` | painel de campanhas | detalhe `/painel/:id` na visão do **mestre** (esquadrão) |
| `m2-20` | painel de campanhas | detalhe `/painel/:id` na visão do **jogador** |
| `m3-53` | ficha | exportar ficha em PDF fiel ao tema |
| `m3-57` | guia de criação | assistente de criação de ficha |
| `m3-58` | guia de criação | melhorias de nível |
| `m3-59` | guia de criação | equipamento inicial |
| `m3-61` | ficha | cor de tema por ficha |
| `m3-62` | ficha | imagem/avatar da ficha (blob storage: **Cloudflare R2**, fixado na spec) |

Milestones ainda não abertos: `m4-ficha-criatura-npc`, `m5-guia-missao`, `m6-gestao-usuarios-papeis`.

---

## 2. Estado Geral

Monorepo npm workspaces (`shared/`, `backend/`, `frontend/`) rodando de ponta a ponta: Angular 21
SPA → NestJS 11 REST + Socket.IO → PostgreSQL 16. **M0, M1 e M2 concluídos; M3 (ficha de jogador)
em fase de refino avançado** — a ficha lê, edita, rola dados, persiste e sincroniza em tempo real.

Deploy em produção por **integração nativa das plataformas**, sem GitHub Actions no deploy: push em
`master` → Render (backend) e Cloudflare Pages (frontend) puxam do Git sozinhos; banco no Supabase.
O GitHub Actions só roda **CI** (lint + testes nos 3 workspaces em todo PR).

**Suítes:** shared 454+ · backend 167/167 · frontend 621/**622** — a 1 falha é conhecida e
pré-existente, ver [`PROBLEMS.md`](PROBLEMS.md) `P-001`. `npm run lint` **não fecha limpo** hoje
em nenhum dos dois workspaces (frontend/backend) — falhas pré-existentes não relacionadas a
nenhuma task recente, ver `PROBLEMS.md` `P-009`.

---

## 3. Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, `core/`, CI, deploy) | **concluído** |
| M1 | Calculadora com paridade | **concluído no código** (`m1-01`…`m1-20`). Restam 2 passos **operacionais** de plataforma — ver `PROBLEMS.md` `P-006` |
| M2 | Auth + Campanhas | **concluído** (`m2-01`…`m2-09` + extensões `m2-10`…`m2-17`). Redesenho do painel: `m2-18` (lista) feito; `m2-19`/`m2-20` (detalhe mestre/jogador) no backlog |
| M3 | Ficha de Jogador | **em andamento** — CRUD, editores, tempo real e rolagens prontos; falta `m3-53` do lote de refino + o lote de guia de criação (`m3-57`…`m3-59`) e `m3-61`/`m3-62` |
| M4 | Ficha de Criatura/NPC | não iniciado |
| M5 | Guia de Missão | não iniciado |
| M6 | Gestão de Usuários e Papéis | não iniciado |

---

## 4. O Que o Sistema Faz Hoje

> Catálogo por capacidade. O detalhe task a task (o **porquê** de cada decisão) está no
> `HISTORY.md` — busque pelo código da task.

### Motor de regras — `shared/regras/` (funções puras, zero dependências)

Nove domínios implementados e testados contra `docs/core/sistema-v4.1.0.md`: `agente/` (15 fórmulas
— vida, energia, defesa/esquiva/bloqueio, proficiência, deslocamento, dano de corpo/furtivo,
inventário), `compras/` (catálogo, limites por patente, modificações, amplificadores, fragmentos,
venda), `dados/`, `descanso/`, `dt/`, `identidade/`, `novo-agente/`, `patente/`, `rolagem/`.

**Fonte única:** frontend e backend consomem o mesmo motor. Nenhuma regra de jogo é reimplementada
em nenhum dos dois lados.

### Autenticação e conta — `backend/autenticacao`, `backend/usuario`, `frontend/autenticacao`, `frontend/usuario`

Registro e login com JWT (bcrypt, guard global, `@Public()` para abrir rota, `@ActiveUser()` para o
payload). Telas `/login` e `/registro` (split-panel). Perfil self-service em `/perfil`: alterar
nome/login, trocar senha e excluir a própria conta.

### Campanhas — `backend/campanha`, `frontend/campanha`

CRUD de campanha com papéis (mestre/jogador), entrada por `codigo_convite` com regeneração pelo
mestre, listagem de membros, remoção de jogador e transferência de mestre. UI sob `/painel`
(guardada): lista de campanhas (`/painel`) é um **painel de controle** (m2-18) — linhas densas por
campanha com tira de 4 estatísticas agregadas no topo (Campanhas/Você mestra/Fichas em
campo/Alertas), alerta visual + nome da ficha crítica por linha, resumo da própria ficha
(Vida atual/máxima, jogador) e convite copiável direto na linha (mestre), sem abrir o detalhe. O
detalhe (`/painel/:id`) é o **lar das fichas** — cada membro exibe suas fichas em mini-cards com
Vida/Energia/condições, ajuste rápido de ± vitalidade sem abrir a ficha, destaque de ficha crítica,
e a seção "Rolagens Recentes" com feed ao vivo. Usável em ~360px.

### Ficha de jogador — `backend/ficha`, `frontend/ficha`

CRUD completo com a matriz de permissões §14 arbitrada **só no service**, validação do documento
contra `shared/regras` antes de persistir, e concessão/revogação de acesso de visualização
(`usuario_ficha_acesso`).

A tela de visualização é um **layout de três colunas** (Identidade · Atributos · Status com abas
internas), com **toda edição no próprio lugar** — nada de página de formulário separada. Editores
prontos: atributos e maestria, vitais, sanidade e lesões, habilidades (com filtro e contador),
inventário completo (itens, modificações, amplificadores, sub-inventários, custom), identidade
(origem, personalidade, afinidade de fragmentos), história privada, anotações e dinheiro.
Persistência **otimista + em lote**, com merge de edição concorrente. No mobile a tela vira **HUD
fixo no topo + barra de navegação no rodapé** (não empilhamento de colunas).

Rolagem de dados: gramática v4, presets, teste de atributo, dano de item, iniciativa automática,
calculadora flutuante e **histórico persistido** com visibilidade `PUBLICA`/`PRIVADA`.

### Tempo real — `backend/core/gateway`

Gateway Socket.IO **broadcast-only**: toda mutação passa por REST, o gateway nunca recebe escrita.
Handshake autenticado pelo mesmo `JwtService` do Passport. Salas `ficha:<id>` e `campanha:<id>`,
reusando a permissão §14 das services. Eventos: `ficha:criada`, `ficha:alterada`, `membro:entrou`,
`rolagem:registrada`.

### Calculadoras públicas — `frontend/calculadora`

Seis abas públicas e 100% client-side (consomem `shared/regras` direto, sem backend): `agente`,
`dt`, `novo-agente`, `patente`, `descanso`, `compras` (com modo Vender). Paridade com a calculadora
antiga confirmada.

### Tema — `frontend/tema`

"Terminal de Contenção" dark-first com **troca em runtime** (`TemaService`: presets + color picker
com trava de contraste). Tokens CSS + preset PrimeNG + Tailwind apontando para os tokens.

### Infraestrutura

11 migrations (`0001`…`0011`), Knex + Docker Compose local, CI de lint+testes em PR, deploy nativo.

---

## 5. Decisões Vigentes

Decisões que **continuam governando código novo**. Não as re-litigue sem falar com o autor.

- **DTOs são `interface readonly`, não classes** — o projeto não instala `class-validator` e o
  backend **não liga o `ValidationPipe`**. A validação estrutural fica documentada campo a campo na
  spec; a validação real é de regra de negócio, no service. Não converter DTOs em classes nem
  instalar `class-validator` sem pedir.
- **Deploy nativo, não Actions** — o autor prefere Render/Cloudflare puxando do Git a pipelines de
  deploy no GitHub Actions. O Actions fica só com o CI.
- **Edição no próprio lugar** — toggle inline na mesma tela, nunca uma página de formulário
  separada. Vale para ficha, campanha e perfil.
- **Enum de coluna relacional é tabela `tipo_*`** (SYSTEM.SPEC §10.2.12, proibição #24). A exceção
  "enum só em `shared/`" vale **apenas** para conteúdo dentro do JSONB `ficha.dados` (classes,
  patentes, categorias de item). Enum que vira coluna ganha tabela de referência — foi assim com
  `tipo_rolagem_visibilidade` na `m3-27`.
- **Rolagem `PRIVADA` nunca trafega por WebSocket** — o gateway só emite `rolagem:registrada` para
  rolagens públicas. A privada só chega por REST, a quem tem permissão.
- **PrimeNG 21 sem `@angular/animations`** — o pacote não está instalado e o PrimeNG 21 usa
  animações CSS próprias. Não wirar `provideAnimationsAsync()`; o build quebra.
- **A ficha aposentou o sistema de abas de página inteira da `m3-11`** (substituído pelas 3 colunas
  da `m3-38`). `AbaFicha`/`ABAS_FICHA`/`ehAbaFicha` ainda existem no código mas estão **fora do
  template** — não estenda esse sistema, mesmo que uma spec antiga peça.
- **`docs/specs/active/m3-38-*.spec.md` é uma spec deliberadamente permanente** — ela documenta
  retroativamente o redesenho da tela de ficha e novos ajustes dessa mesma frente entram nela em vez
  de virar spec solta. É a **exceção** consciente ao "active/ = task da sessão atual".
- **A ficha permite estado incoerente de propósito** — a validação do backend só checa **teto**
  (Vida ≤ máximo, Nível no intervalo da classe). Condições (Morrendo/Machucado/Inconsciente) são
  alternadas à mão e nunca validadas; exceder o Inventário máximo é **aviso**, não trava.

---

## 6. Sempre Lembrar

Armadilhas que já custaram retrabalho neste repositório. Cada uma tem um episódio no `HISTORY.md`.

**CSS / layout**

- **`overflow-x: clip` + `overflow-y: visible`** é a combinação usada em `html` (`styles.scss`) e
  `.conteudo` (`layout.component.scss`). Trocar qualquer um desses `clip` por `hidden`/`auto`
  **mata todo `position: sticky` da tela em silêncio** — é a tentação natural de quem está caçando
  overflow horizontal. Está comentado no SCSS; leia antes de mexer.
- **`@extend` + media query:** o seletor é injetado no media query, mas uma declaração **posterior**
  no arquivo com a **mesma especificidade** vence lá dentro. Foi assim que um `width: 18px` anulou
  um alvo de toque de 44px que "parecia" corrigido.
- **Especificidade anula media query:** `.bloco--modificador` (0,2,0) vence uma regra de media query
  em `.bloco` (0,1,0), e a regra simplesmente nunca roda. A correção é repetir o media query
  **dentro** do bloco do modificador, empatando a especificidade.
- **Nunca hardcodar hex/fonte/raio** (proibição #29) — sempre `var(--token)`. O tema troca em
  runtime; um hex solto não acompanha.

**Angular**

- **Ler `input.required()` no corpo do construtor causa `NG0950` em runtime** e os testes **não
  pegam** (o TestBed injeta o input antes do primeiro change detection). Envolva em `effect()`.

**Backend / SQL**

- Todo SELECT precisa de `WHERE [tabela].is_deleted = false`; parâmetros nomeados (`:nome`), nunca
  posicionais nem interpolação; INSERT via `INSERT ... SELECT ... RETURNING`, nunca `VALUES`;
  nenhuma coluna com `DEFAULT`; soft delete sempre, `DELETE` físico nunca.
- **`COUNT(*)` do Postgres é `bigint`, e o driver `pg` devolve `bigint` como `string`** (evita
  perda de precisão) — um `COUNT(*)` sem `::int` explícito quebra silenciosamente qualquer DTO
  tipado `number` (TypeScript não pega; só aparece numa soma/comparação estranha em runtime).
  Sempre `COUNT(*)::int` quando o resultado alimenta um campo `number`. Achado na `m2-18`.
- **Controller é burro** — sem lógica, sem `try/catch`, sem `if`. A única micro-inteligência aceita
  é fundir id de `@Param`/`@Query` no DTO.

**Regras de jogo**

- **Amplificadores e Modificações escalam por COMPRA, não por stack bruto** — a 1ª compra em ■■
  (Flexível/Resistente/Potente/Conservador/Veloz) **não** dobra o bônus; a penalidade continua no
  bruto.
- Se código e `docs/core/sistema-v4.1.0.md` divergirem, **o documento vence** (proibição #27).

**Processo**

- **Antes de qualquer UI**, ler `docs/design/DESIGN.md` e consumir `docs/design/tema/`. Isso já foi
  esquecido uma vez (`m0-05`) e a tela nasceu com preset Aura base + hex hardcoded.
- **Sessões concorrentes na mesma branch acontecem** — reconferir `git status`/`HEAD` antes de
  commitar ou revisar um diff.

---

## 7. Decisões Pendentes

Nenhuma decisão de rumo em aberto no momento.

A única que existia — **identidade visual do site** — está **resolvida**: tema "Terminal de
Contenção", handoff completo em `docs/design/`, com troca em runtime entregue na `m1-13`.

Questões que precisam de resposta do autor mas não são decisões de rumo estão marcadas com **⚠** na
seção 1 e em [`PROBLEMS.md`](PROBLEMS.md).
