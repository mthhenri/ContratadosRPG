# Reset e Seed do Banco de Desenvolvimento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um comando seguro que reconstrói o PostgreSQL local e semeia um cenário estável de usuários, campanhas e fichas coloridas para desenvolvimento.

**Architecture:** Ferramental TypeScript isolado em `backend/tools/database/`: um guard puro valida o alvo antes de qualquer mutação, um orquestrador executa Docker/migrations/seed com argumentos fixos e um seed transacional materializa fixtures descritas por uma função pura. O seed consome DTOs, enums e regras de `shared`, nunca importa código do frontend e nunca altera migrations históricas.

**Tech Stack:** Node.js 24, TypeScript 5.7, ts-node, Vitest 4, Knex 3, PostgreSQL 16, bcrypt 6, Docker Compose.

## Global Constraints

- Mover `docs/specs/backlog/dev-01-reset-seed-desenvolvimento.spec.md` para `active/` antes do primeiro código e para `done/` somente depois de todos os gates.
- O reset sem backup está autorizado somente para o banco local de desenvolvimento.
- Recusar antes de chamar Docker quando `APP_AMBIENTE !== 'development'`, `DB_HOST` não for `localhost`/`127.0.0.1`, `DB_NOME !== 'contratados_rpg'`, `DB_USUARIO !== 'postgres'` ou `ARMAZENAMENTO_PROVEDOR !== 'local'`.
- Não aceitar host, banco, usuário, container, serviço, projeto Compose ou volume por argumento.
- Não reescrever migrations históricas.
- SQL de fixture usa parâmetros nomeados, `INSERT ... SELECT` e filtros `is_deleted = false`; sem interpolação, `VALUES` ou exclusão física.
- `senhor.contratados` mantém seu hash; `codex.dev` e os stubs usam a senha dev `contratados.dev`.
- Fichas são somente `TipoFichaEnum.JOGADOR`, com quatro cores `#RRGGBB` distintas; sem criaturas, NPCs ou imagens.
- Todo commit inclui `Co-authored-by: Codex <noreply@openai.com>` e é conferido com `git show -s --format=full`.

## File Structure

- `backend/tools/database/reset-dev.guard.ts`: validação pura do alvo destrutivo.
- `backend/tools/database/cenario-dev.ts`: descrição tipada e determinística das fixtures.
- `backend/tools/database/seed-dev.ts`: seed transacional e CLI.
- `backend/tools/database/reset-dev.ts`: orquestração Docker/migrations/seed e CLI.
- Um `*.spec.ts` ao lado de cada unidade acima.
- `backend/vitest.config.ts`, `backend/package.json`, `package.json`: descoberta e comandos.
- `.env.example`, `README.md`, `docs/DEVELOPMENT.md`: operação e credenciais.
- `docs/context/{CONTEXT,HISTORY,MEMORY}.md`: estado persistente.

---

### Task 1: Guard puro do reset

**Files:**
- Move: `docs/specs/backlog/dev-01-reset-seed-desenvolvimento.spec.md` → `docs/specs/active/dev-01-reset-seed-desenvolvimento.spec.md`
- Create: `backend/tools/database/reset-dev.guard.ts`
- Create: `backend/tools/database/reset-dev.guard.spec.ts`
- Modify: `backend/vitest.config.ts`

**Interfaces:**
- Consumes: `NodeJS.ProcessEnv`.
- Produces: `ConfiguracaoResetDev` e `validarConfiguracaoResetDev(ambiente: NodeJS.ProcessEnv): ConfiguracaoResetDev`.

- [ ] **Step 1: Ativar a spec**

Mover a spec com `Move-Item -LiteralPath` e confirmar que somente a localização mudou.

- [ ] **Step 2: Escrever a matriz de testes vermelha**

Alterar o include do Vitest para `['src/**/*.spec.ts', 'tools/**/*.spec.ts']`. Testar uma configuração aceita com `development/localhost/5432/contratados_rpg/postgres/local`, aceitação de `127.0.0.1`, e rejeição individual de variável ausente, `production`, host remoto/Supabase, banco diferente, usuário diferente, armazenamento `r2` e porta inválida. Toda rejeição deve conter `Reset recusado`.

- [ ] **Step 3: Confirmar RED**

Run: `npm test --workspace=backend -- --run tools/database/reset-dev.guard.spec.ts`  
Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 4: Implementar o guard mínimo**

Definir o retorno tipado com `ambiente: 'development'`, host union local, porta numérica, nome/usuário/provedor literais e senha string. Uma helper `obrigatoria()` rejeita ausências; validações explícitas rejeitam cada divergência antes de retornar. Não ler argumentos CLI.

- [ ] **Step 5: Confirmar GREEN e lint focado**

Run: `npm test --workspace=backend -- --run tools/database/reset-dev.guard.spec.ts`  
Expected: PASS.

Run no backend: `npx eslint "tools/database/reset-dev.guard*.ts"`  
Expected: exit 0.

- [ ] **Step 6: Commit atômico**

Adicionar somente os quatro arquivos da task, commitar `feat(dev): protege reset do banco local` com o trailer obrigatório e conferir a mensagem gravada.

---

### Task 2: Cenário tipado e fichas coloridas

**Files:**
- Create: `backend/tools/database/cenario-dev.ts`
- Create: `backend/tools/database/cenario-dev.spec.ts`

**Interfaces:**
- Consumes: enums/DTOs e `calcularVida`, `calcularEnergia`, `calcularDerivados`, `habilidadesIniciais` de `@contratados-rpg/shared`.
- Produces: `CENARIO_DEV`, `SENHA_CONTAS_DEV`, `montarDadosFichaDev(ficha: DefinicaoFichaDev): FichaJogadorDadosDto` e tipos das definições.

- [ ] **Step 1: Escrever testes vermelhos das invariantes**

Provar exatamente quatro logins (`senhor.contratados`, `codex.dev`, `jogador.stub.1`, `jogador.stub.2`), duas campanhas, dois membros `MESTRE`, seis `JOGADOR`, quatro fichas `JOGADOR`, quatro cores distintas que casam `^#[0-9A-F]{6}$`, Matheus/Codex com uma ficha em cada campanha, donos sempre membros e chaves/nomes únicos. Provar que a conta do autor tem `alterarSenha: false`.

- [ ] **Step 2: Confirmar RED**

Run: `npm test --workspace=backend -- --run tools/database/cenario-dev.spec.ts`  
Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implementar definições determinísticas**

Usar chaves internas `matheus/codex/stub1/stub2` e `campanha-matheus/campanha-codex`; convites `DEVMT001` e `DEVCD001`; senha `contratados.dev`; cores `#D97706`, `#2563EB`, `#16A34A`, `#9333EA`. Campanhas: “Campanha do Matheus” e “Campanha do Codex”. Membros: mestre respectivo mais o outro principal e os dois stubs como jogadores.

- [ ] **Step 4: Construir quatro JSONBs atuais sem aleatoriedade**

Usar quatro perfis válidos (Combatente, Especialista, Suporte e Civil), atributos completos, nível/prestígio/dinheiro fixos e `satisfies FichaJogadorDadosDto`. Calcular vida/energia/derivados por `shared`; mapear `habilidadesIniciais`; persistir listas vazias de sequelas, traumas, lesões, inventário, rolagens e combos, além de `anotacoes: ''` e `historia: ''`. Não importar `frontend/ficha-padrao.ts`.

- [ ] **Step 5: Confirmar GREEN e builds**

Run: teste focado, `npm run build --workspace=shared` e `npm run build --workspace=backend`.  
Expected: todos exit 0.

- [ ] **Step 6: Commit atômico**

Commitar os dois arquivos como `feat(dev): define cenario padrao de testes`, com trailer conferido.

---

### Task 3: Seed transacional e idempotente

**Files:**
- Create: `backend/tools/database/seed-dev.ts`
- Create: `backend/tools/database/seed-dev.spec.ts`
- Modify: `backend/package.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: guard e cenário das Tasks 1–2.
- Produces: `executarSeedDev(conexao: Knex, configuracao: ConfiguracaoResetDev): Promise<ResumoSeedDev>` e resumo `{ usuarios: 4, campanhas: 2, membros: 8, fichas: 4 }`.

- [ ] **Step 1: Escrever testes vermelhos**

Com persistência dublada/em memória, provar: autor nunca recebe `alterarSenha`; exatamente três contas recebem o mesmo hash; relações resolvem por chaves de negócio; duas execuções terminam em `4/2/8/4`; falha na terceira ficha provoca rejeição/rollback e não confirma a transação.

- [ ] **Step 2: Confirmar RED**

Run: `npm test --workspace=backend -- --run tools/database/seed-dev.spec.ts`  
Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implementar persistência em uma transação Knex**

Para usuário, localizar ativo por login; ausência de `senhor.contratados` é erro. Criar/reconciliar Codex e stubs, atualizando nome e bcrypt hash. Para campanha, localizar por convite; para membro, `(campanha_id, usuario_id)`; para ficha, `(campanha_id, usuario_id, nome)`. Resolver tabelas `tipo_*` por código ativo. Criar ausentes e atualizar fixtures existentes para o estado canônico. Ficha grava `oculta = false`, cor, tipo e JSONB.

Todo insert segue este formato, adaptado por tabela:

```sql
INSERT INTO usuario (login, senha, nome, created_date, updated_date, is_deleted)
SELECT :login, :senha, :nome, NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM usuario WHERE login = :login AND is_deleted = false
)
```

Updates usam bindings nomeados e `is_deleted = false`. Gerar `bcrypt.hash(SENHA_CONTAS_DEV, 10)` uma vez por execução.

- [ ] **Step 4: Implementar CLI e scripts**

Carregar `.env` da raiz, chamar o guard antes da conexão, criar Knex com a configuração validada, executar seed, imprimir `4 usuários, 2 campanhas, 8 membros, 4 fichas` e sempre destruir a conexão. Adicionar `backend db:seed:dev = ts-node tools/database/seed-dev.ts` e delegação raiz `npm run db:seed:dev --workspace=backend`.

- [ ] **Step 5: Confirmar GREEN e idempotência real**

Rodar os três specs de tools, subir/migrar o banco atual e executar `npm run db:seed:dev` duas vezes. Consultar com `docker compose exec -T postgres psql`, filtrando pelas chaves de negócio do cenário: 4 usuários fixture, 2 convites fixture, 8 vínculos fixture e 4 fichas fixture/4 cores, sem duplicatas. Dados antigos fora dessas chaves podem continuar existindo até a Task 4; o seed isolado não os apaga. Comparar o hash do autor antes/depois sem expô-lo.

- [ ] **Step 6: Commit atômico**

Commitar seed, spec e package files como `feat(dev): semeia contas campanhas e fichas`, com trailer conferido.

---

### Task 4: Orquestrador destrutivo de argumentos fixos

**Files:**
- Create: `backend/tools/database/reset-dev.ts`
- Create: `backend/tools/database/reset-dev.spec.ts`
- Modify: `backend/package.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `validarConfiguracaoResetDev(process.env)`.
- Produces: `montarEtapasResetDev(): readonly EtapaResetDev[]` e `executarResetDev(dependencias: DependenciasResetDev): void`.

- [ ] **Step 1: Escrever testes vermelhos**

Provar vetor exato de etapas: `docker compose down --volumes --remove-orphans`; `docker compose up -d --wait postgres`; `npm run db:migrate`; `npm run db:seed:dev`. Provar que guard inválido chama zero subprocessos e falha de migration impede seed.

- [ ] **Step 2: Confirmar RED**

Run: `npm test --workspace=backend -- --run tools/database/reset-dev.spec.ts`  
Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implementar orquestração fail-fast**

Carregar `.env`, validar primeiro e executar cada etapa com `execFileSync(executavel, argumentos, { cwd: raizRepositorio, env: process.env, stdio: 'inherit' })`. Não usar `exec`, shell, interpolação nem argumentos do usuário. Exibir aviso antes de remover volume e nomear a etapa em qualquer erro.

- [ ] **Step 4: Adicionar comando canônico**

Adicionar `backend db:reset:dev = ts-node tools/database/reset-dev.ts` e delegação raiz `npm run db:reset:dev --workspace=backend`.

- [ ] **Step 5: Confirmar GREEN e recusas**

Rodar specs focados. Executar o CLI com `APP_AMBIENTE=production` sobrescrito somente no processo; esperar exit não zero e confirmar que o container não foi recriado.

- [ ] **Step 6: Resolver alvo e executar reset autorizado**

Antes, rodar `docker compose config --services`, `docker compose config --volumes` e `docker compose ps`; esperar apenas serviço `postgres` e volume `postgres_data` deste Compose. Então executar `npm run db:reset:dev`; esperar volume removido, Postgres saudável, migrations completas e resumo `4/2/8/4`.

- [ ] **Step 7: Auditar reconstrução**

Repetir seed duas vezes e consultar migrations, usuários, campanhas, membros, fichas, tipos e cores. Confirmar nenhuma duplicata, todos os donos membros e todos os tipos `JOGADOR`.

- [ ] **Step 8: Commit atômico**

Commitar orquestrador, spec e package files como `feat(dev): automatiza reset seguro do banco`, com trailer conferido.

---

### Task 5: Documentação, aplicação real e conclusão

**Files:**
- Create: `docs/DEVELOPMENT.md`
- Modify: `.env.example`, `README.md`, `docs/context/CONTEXT.md`, `docs/context/HISTORY.md`, `docs/context/MEMORY.md`
- Move: spec de `active/` → `done/`

**Interfaces:**
- Consumes: comandos e credenciais das Tasks 1–4.
- Produces: procedimento auditável e evidência operacional.

- [ ] **Step 1: Documentar operação e credenciais**

Explicar em `docs/DEVELOPMENT.md`: reset destrutivo sem backup, proteções, recuperação por nova execução, seed isolado, duas campanhas/quatro fichas e tabela de contas. Mostrar senha `contratados.dev` somente para Codex/stubs; a senha do autor é “credencial pessoal existente”.

- [ ] **Step 2: Atualizar descoberta**

No `.env.example`, anotar que valores locais canônicos são pré-condição do reset. No README, listar `db:reset:dev`/`db:seed:dev` e apontar para `docs/DEVELOPMENT.md`, sem duplicar detalhes.

- [ ] **Step 3: Rodar gates automatizados**

Run: builds de shared/backend, suite backend completa, lint backend e `git diff --check`. Esperado: builds/testes/diff passam; eventual P-009 preexistente é relatado separadamente, e nenhum arquivo da task pode introduzir erro.

- [ ] **Step 4: Verificar logins reais**

Subir backend/frontend. Fazer login real de `codex.dev`/`contratados.dev` e `senhor.contratados`/credencial pessoal, sem registrar token ou senha pessoal. Esperado: HTTP 200.

- [ ] **Step 5: Usar obrigatoriamente a skill `verify`**

Em `1920×1080` e `360×800`, inspecionar pessoalmente ambos os usuários principais: campanha própria como mestre, oposta como jogador, equipe com quatro membros/papéis corretos, duas fichas por campanha abrindo sem erro e cores distintas. Conferir console/rede, overflow e requests 4xx/5xx inesperados. Não há redesign; a UI real valida a integridade das fixtures.

- [ ] **Step 6: Revisar diff completo**

Confirmar: migrations intactas; guard antes de Docker; subprocessos sem shell; nenhum alvo configurável; SQL parametrizado; transação; conta do autor preservada; contagens/cores corretas; nenhuma mudança fora da spec.

- [ ] **Step 7: Atualizar contexto e mover spec**

Acrescentar narrativa/evidências no topo de HISTORY; editar somente seções afetadas de CONTEXT; adicionar ponteiros de DEVELOPMENT/tools em MEMORY. Mover para `done/` somente com todos os gates; caso contrário manter `active/` e relatar pendências.

- [ ] **Step 8: Commit final**

Commitar documentação/contexto/spec como `docs(dev): registra ambiente reproduzivel`, com trailer conferido. Rodar `git status --short`; esperado sem mudanças da task pendentes.
