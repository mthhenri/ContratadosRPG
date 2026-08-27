---
name: task-flow
description: >
  Conduz uma tarefa do início ao fecho auditável: abrir a spec, implementar exatamente o que ela
  define, rodar os gates certos e registrar o resultado em docs/context/ no formato de cada
  arquivo. Use ao começar a task, implementar a spec, concluir, fechar, atualizar o contexto ou
  registrar no histórico — não só quando a palavra "spec" aparece. É a skill mais violada na
  prática: trabalho commitado sem passar pelo fecho é o defeito mais comum do repositório.
---

# Fluxo de Task — Abrir, Implementar, Gates, Fechar

> A regra em si vive em `CLAUDE.md`/`AGENTS.md` ("Fluxo orientado por especificação" e "Gate
> obrigatório de qualidade e conclusão") — em conflito, o documento vence e esta skill é
> corrigida. O que esta skill acrescenta é a **ordem de execução** e os **formatos copiáveis**
> de `docs/context/`, que hoje não estão reunidos em lugar nenhum.

## 1. Abrir

- Mover `docs/specs/backlog/<tarefa>.spec.md` → `docs/specs/active/`.
- Spec de milestone (`m0-*`…`m7-*`) ou guarda-chuva: **quebrar em tasks numeradas antes de
  implementar** — não implementar o arquivo guarda-chuva direto.
- Spec em `docs/specs/done/` é registro histórico — nunca reescrever, só ler.
- Sem spec ainda para o pedido? Escrever uma nova com `docs/specs/TEMPLATE.spec.md` antes de
  tocar código (seções obrigatórias marcadas no próprio template).

## 2. Implementar

Exatamente o que a spec define — sem extrapolar, sem "já que estou aqui". Achado fora do escopo
vira entrada em `PROBLEMS.md` (defeito) ou `IDEAS.md` (melhoria), nunca diff desta task. Para
nomear um DTO, use a skill `dto-conventions`; para verificar UI ao vivo, use `verify`.

## 3. Gates — comandos reais

| Workspace | Teste focado | Suíte completa | Lint |
|---|---|---|---|
| `shared` | `npm run test --workspace=shared -- <arquivo>` | `npm run test --workspace=shared` | `npm run lint --workspace=shared` |
| `backend` | `npm run test --workspace=backend -- <arquivo>` | `npm run test --workspace=backend` | `npm run lint --workspace=backend` |
| `frontend` | `npm run test --workspace=frontend -- --include=<arquivo>` | `npm run test --workspace=frontend` | `npm run lint --workspace=frontend` |

- `npm run lint` (raiz) roda os três workspaces de uma vez; `npm run test --workspaces --if-present`
  idem, para a suíte completa no gate de integração/conclusão — não repita build/lint/teste sem
  mudança relevante desde a última rodada (`CLAUDE.md` "Rigor com eficiência").
- **DTO/enum novo em `shared/`**: rode `npm run build --workspace=shared` antes de testar contra
  o backend rodando — ele importa `shared/dist`, não `shared/src` (armadilha documentada em
  `verify`).
- Durante a implementação, teste focado no que mudou; suíte ampla e lint dos três workspaces no
  gate de integração e no fecho.
- Falha existente **antes** da task: relatar separada da falha causada pela task — nunca misturar
  as duas no mesmo relato nem "consertar de passagem" a preexistente sem registrar em
  `PROBLEMS.md`.
- UI/estilo: cumprir o processo visual obrigatório do `CLAUDE.md` (análogo aprovado, `verify` nos
  dois viewports, comparação visual) — build/lint/teste verdes não substituem essa etapa.

## 4. Fechar

1. Mover a spec para `docs/specs/done/`.
2. `HISTORY.md`: bloco novo **no topo** (nunca no fim) — ver formato abaixo.
3. `CONTEXT.md`: editar **só as seções afetadas** — nunca um bullet de diário acrescentado sem
   reorganizar a seção existente.
4. `PROBLEMS.md`: remover da lista de Ativos todo item que a task corrigiu (o relato da correção
   vai para `HISTORY.md`, não fica repetido aqui).
5. `IDEAS.md`: mover de "Abertas" para "Promovidas" a ideia que virou spec nesta task.
6. `MEMORY.md`: só se algo descoberto sobreviver à tarefa (onde uma regra/código/doc passou a
   viver) — é ponteiro, nunca cópia de conteúdo.

## 5. Fecho auditável

Antes de declarar pronto, listar o que foi verificado e o que ficou pendente. Item sem
verificação obrigatória (gate de teste que não rodou, gate visual não executado) fica **aberto**,
não "concluído" — mesmo que o resto da task esteja pronto.

## Formatos copiáveis de `docs/context/`

O cabeçalho de cada arquivo já traz o bloco oficial — abaixo, só o essencial para não abrir os
três arquivos toda vez. Numeração é sequencial por arquivo e **número removido nunca é
reaproveitado**.

```markdown
### P-0NN — <título curto> · `ABERTO|CONTORNADO|ACEITO` · <área>
- **Sintoma:** — **Causa:** — **Contorno:** — **Correção:** — **Desde:**
```

```markdown
### I-0NN — <título curto> · <área>
- **Ideia:** — **Origem:** — **Por quê:** — **Custo aparente:**
```

`HISTORY.md` não tem bloco de campos fixos — é narrativa livre, mas todo bloco bom do repositório
cobre: o que mudou e por quê, o que foi testado (números), o que foi verificado ao vivo (skill
`verify`, viewports) e — quando existir — o achado que só apareceu **na** verificação, não antes
dela. Título do bloco: `## AAAA-MM-DD — <task ou assunto>: <resumo de uma linha>`.

## Trabalho que chegou por PR, fora do fluxo de spec

Registrar em `HISTORY.md` mesmo assim — um histórico com buraco silencioso é pior que incompleto
sabido. Esta skill não decide a política de fundo (registrar todo PR sempre vs. aceitar que essa
via não é documentada); a decisão em aberto está em `IDEAS.md` `I-003` — aponte quem perguntar
para lá em vez de inventar uma regra nova aqui.

## Commit

Todo commit leva `Co-authored-by:` identificando o agente (`CLAUDE.md` "Coautoria de commits").
Depois de commitar, confira com `git log -1` ou `git show` que o trailer foi gravado de verdade —
não assuma que a mensagem passada ao comando chegou intacta.
