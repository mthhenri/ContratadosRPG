# generic_base — base reutilizável de arquitetura, processo e agentes

> Esta pasta **não é lida pelos agentes deste repositório** no trabalho normal. É material de
> exportação: a versão **sem domínio de jogo e sem identidade visual** dos padrões que o
> ContratadosRPG desenvolveu — arquitetura, convenções, fluxo por spec, contexto persistente,
> skills, subagentes, delegação entre agentes e a checagem de organização. Serve para começar um
> projeto novo (qualquer stack) já com o processo calibrado.
>
> **Última sincronização com o repositório-fonte:** 2026-10-10 (a anterior foi 2026-09-08).
> Para atualizar o kit quando o processo mudar no ContratadosRPG, veja "Manter o kit atualizado".

## O que está aqui

| Arquivo/pasta | Origem no ContratadosRPG | O que captura |
|---|---|---|
| [`CLAUDE.template.md`](CLAUDE.template.md) | `CLAUDE.md` = `AGENTS.md` | Instruções do agente: início de sessão, gate de qualidade, rigor com eficiência, orquestração, contrato de skills, coautoria |
| [`ARCHITECTURE.template.md`](ARCHITECTURE.template.md) | `docs/SYSTEM.SPEC.md` | Constituição: camadas, pacote compartilhado, banco, tempo real, permissões, **§3.1 política de specs e artefatos**, proibições |
| [`CONVENTIONS.template.md`](CONVENTIONS.template.md) | `docs/CONVENTIONS.md` | Nomenclatura (DTO, métodos, SQL, enums) com exemplos copiáveis |
| [`specs/`](specs/) | `docs/specs/` | Template de spec e ciclo `backlog → active → done` |
| [`context/`](context/) | `docs/context/` | Contexto persistente entre sessões (CONTEXT, HISTORY, PROBLEMS, MEMORY, IDEAS) |
| [`skills/`](skills/) | `.claude/skills/` | Nove skills: `task-flow`, `conventions-check`, `orquestracao`, `verify`, `design-fidelity`, `dto-conventions`, `sql-migrations`, `domain-rules-engine`, `realtime-sync` |
| [`agents/`](agents/) | `.claude/agents/` | Subagentes `implementador`, `revisor`, `testador` |
| [`scripts/agentes/`](scripts/agentes/) | `scripts/agentes/` | Delegação Claude ↔ Codex (guardas de profundidade, concorrência, duplicidade, log) |
| [`scripts/verificar-organizacao.template.mjs`](scripts/) (+ teste) | `scripts/verificar-organizacao.mjs` | `npm run repo:verificar`: barra depósito paralelo de specs, evidência versionada, espelhos divergentes |
| [`config/`](config/) | `.claude/settings.json`, `ci.yml`, `.gitignore` | Hook de profundidade, workflow de CI, trechos de `.gitignore` |
| [`instalar-kit.sh`](instalar-kit.sh) | — | Copia tudo para o projeto novo, renomeando `.template`, sem sobrescrever nada |

**Fora de propósito:** identidade visual/tema, regras do jogo, runbooks de deploy específicos,
`publicar-versao` (acoplada ao nosso fluxo de R2/tag), `tempo-real`/`regras-do-jogo` originais (as
versões genéricas são `realtime-sync` e `domain-rules-engine`), o mod de painel opcional.

## TO-DO — iniciar um projeto novo (ex.: relatório de atividade)

Ordem pensada para você nunca ter um agente trabalhando sem as regras que o orientam.

### Etapa 1 — Decisões antes de qualquer arquivo (≈15 min, só você)

- [ ] **Nome e escopo do projeto em 3 frases**: o que é, para quem, o que *não* é.
- [ ] **Stack**: monorepo `shared/backend/frontend` como o RPG, ou algo menor? (Relatório de
  atividade costuma caber em app único: se não há consumidor separado, o `shared/` vira só uma
  pasta de contratos — não crie workspace por reflexo.)
- [ ] **Idioma**: nomes de domínio em português (como aqui) ou inglês? Vale um só, para sempre.
- [ ] **O que o kit leva** — marque o que *não* se aplica e use as flags do instalador:
  - tempo real (WebSocket)? Provavelmente **não** num relatório → apague `realtime-sync` e
    ARCHITECTURE §9.
  - UI com identidade própria? Se sim, **defina o tema primeiro** (etapa 6); senão `--sem-ui`.
  - Delegação para o Codex? Sem Codex instalado, `--sem-orquestracao` ou use só os subagentes.
- [ ] **Domínio**: onde vive a regra do negócio (como se contam horas, o que é "atividade",
  fechamento de período, arredondamento)? Esse documento é o equivalente a `docs/core/` — escreva-o
  **antes** das fórmulas virarem código.

### Etapa 2 — Criar o repositório e instalar o kit

- [ ] Crie a pasta do projeto, `git init`, primeiro commit vazio.
- [ ] Rode: `bash <caminho-do-RPG>/docs/generic_base/instalar-kit.sh <pasta-nova>`
  (acrescente `--sem-orquestracao` e/ou `--sem-ui` conforme a etapa 1). Idempotente: pode repetir.
- [ ] Confira que `CLAUDE.md` = `AGENTS.md` e `.claude/skills` = `.agents/skills`
  (`diff -r .claude/skills .agents/skills` vazio).
- [ ] No `package.json` da raiz, registre:
  `"repo:verificar": "node scripts/verificar-organizacao.mjs"` e
  `"repo:test": "node --test scripts/verificar-organizacao.test.mjs"`; rode os dois.

### Etapa 3 — Preencher os `<...>` (é aqui que o kit vira o *seu* projeto)

Em cada arquivo, preencha tudo entre `<...>` e **apague** o que não se aplica (não deixe `N/A`).

- [ ] `docs/ARCHITECTURE.md`: §1 visão e fontes da verdade do domínio · §2 stack · §3 árvore real ·
  §4 idioma · §13–§14 módulos, entidades, matriz de permissões · §16 proibições (corte as que não
  fazem sentido; mantenha curta).
- [ ] `docs/CONVENTIONS.md`: ajuste os exemplos ao seu domínio e à sua stack.
- [ ] `CLAUDE.md` (depois **copie idêntico** para `AGENTS.md`): seções "Fontes da verdade",
  "Estrutura e arquitetura", "Idioma", "Backend/SQL" e **"Comandos úteis"** com os comandos reais.
  Apague os blocos `[OPCIONAL ...]` que não valem.
- [ ] `skills/task-flow` §3: a tabela de gates com os comandos reais (teste focado, suíte, lint).
- [ ] `skills/verify`: como subir o stack, portas, login de teste.
- [ ] `skills/conventions-check`: monte as buscas mecânicas (`references/buscas.md`) conforme as
  proibições do §16 — comece com 3 ou 4 e cresça.
- [ ] `docs/context/CONTEXT.md` (§1 "Próxima Task") e `MEMORY.md` (aponte para os docs reais).
  Mantenha `HISTORY/PROBLEMS/IDEAS` só com o cabeçalho.
- [ ] `.claude/agents/*.md`: troque `<nome-do-projeto>`; confira `model`/`effort`.
- [ ] Apague skills que o projeto não terá (`realtime-sync`, `sql-migrations` se não houver banco...)
  **nas duas pastas** (`.claude/skills` e `.agents/skills`).

### Etapa 4 — Primeira spec e primeira sessão de agente

- [ ] Escreva `docs/specs/backlog/m0-01-esqueleto.spec.md` a partir do `TEMPLATE.spec.md`:
  repositório rodando, banco/ambiente, `npm run lint` e `test` verdes, CI verde.
- [ ] Abra o Claude Code na pasta nova e peça: *"Leia CLAUDE.md, docs/ARCHITECTURE.md,
  docs/CONVENTIONS.md e docs/context/CONTEXT.md e me diga o que entendeu e qual é a próxima task."*
  Isso valida o kit: se o agente se perder ou perguntar o que está nos docs, o doc está fraco.
- [ ] Faça a m0-01 **seguindo o fecho completo** (`task-flow` §4–5) — é o teste de uso exigido
  pelo contrato de skills: kit só "fecha" depois de exercitado numa tarefa real.
- [ ] Rode `npm run repo:verificar -- --staged` antes do primeiro commit com o trailer
  `Co-authored-by:` (ver `CLAUDE.md`, "Coautoria") e confira com `git log -1`.

### Etapa 5 — CI

- [ ] Ajuste `.github/workflows/ci.yml` (passos de instalar/lint/teste da stack real) e abra um PR
  de teste: o passo "Organização" deve ficar verde.
- [ ] Trechos de `.gitignore` já foram acrescentados pelo instalador; confira `.agentes/`,
  `.artifacts/` e `.claude/settings.local.json`.
- [ ] Orquestração: marque o workspace como confiável no Claude Code (o `settings.json` só vale
  depois disso) e teste `scripts/agentes/codex-delegar.sh --help`.

### Etapa 6 — Só se houver UI

- [ ] Decida a identidade visual **como projeto à parte**: tokens (`_tokens.scss` ou equivalente),
  tipografia, tema escuro/claro, e 3–5 telas de referência aprovadas. O kit propositalmente não
  prescreve isso.
- [ ] Escreva `docs/design/DESIGN.md` e só então ative `design-fidelity` e a seção
  "Biblioteca de componentes" do `CLAUDE.md`. Nunca desenvolva tela sobre tema vazio.
- [ ] Defina os viewports de verificação em `verify` e no `CLAUDE.md`.

### Etapa 7 — Memória do agente (opcional, mas vale)

- [ ] Depois de 2–3 sessões, observe o que você precisou repetir ao agente. Isso vai para a
  memória pessoal do Claude Code (não para o repositório) e, se for regra do projeto, para
  `CLAUDE.md`/skill. Não copie as memórias do RPG: elas são sobre *aquele* domínio.

## Manter o kit atualizado (este é o passo que faltava)

A extração anterior ficou parada um mês e perdeu tudo o que veio depois (política de artefatos,
orquestração, `repo:verificar`). Para não repetir:

1. **Toda vez que o processo mudar** no ContratadosRPG (`CLAUDE.md`, skills de processo,
   `docs/SYSTEM.SPEC.md` §3.1, agents, scripts de agentes), abra uma linha em
   `docs/context/IDEAS.md` ou faça a mudança espelho aqui na mesma tarefa, e atualize a data da
   "Última sincronização" no topo deste README.
2. Mudança de **domínio ou de visual** não entra aqui — só código, arquitetura e processo.
3. Os scripts em `scripts/` são cópias; ao alterar `scripts/agentes/*` ou
   `verificar-organizacao.mjs` no RPG, copie e re-generalize (as únicas diferenças legítimas
   são o bloco CONFIGURAÇÃO do verificador e os comentários `adoção:`).
4. Teste o kit: `instalar-kit.sh` numa pasta vazia, `git add -A`, depois `node --test
   scripts/verificar-organizacao.test.mjs` e `node scripts/verificar-organizacao.mjs --staged`
   (deve aprovar).

## Princípios que atravessam todos os documentos

- **Documento vence código.** Discordância se resolve mudando o código, salvo decisão explícita
  do autor.
- **Camada burra / inteligente / só-dado.** Entrada (controller), regra (service) e persistência
  (repository): a regra de negócio mora só na do meio.
- **Fonte única para o que os dois lados de uma borda precisam saber.** Contratos e, como exceção
  isolada, motores de regra pura moram num pacote compartilhado.
- **Nada de lógica em lugar errado.** Cada proibição do §16 existe porque alguém já pagou o custo.
- **Contexto persistente tem uma responsabilidade por arquivo**, não um diário único.
- **Task começa por spec e termina por fecho auditável.** "Compila" não é "pronto"; item sem
  verificação obrigatória fica aberto.
- **Qualidade acima de velocidade, com rigor eficiente**: o menor processo que produz evidência
  suficiente — mais etapas, agentes ou contexto não são mais qualidade.
- **Evidência bruta nunca é versionada**; vive em `.artifacts/<tarefa>/` e o relatório textual
  registra resultado e limites.
- **Agente que delega não delega de novo** (profundidade 1) e o resultado delegado é evidência a
  verificar, não verdade.
