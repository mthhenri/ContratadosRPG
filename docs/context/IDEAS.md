# IDEAS.md — Insights e Ideias

> **O que este arquivo é:** o lugar onde ideias levantadas durante uma conversa **não se perdem**.
> Um insight que apareceu no meio de outra task, uma feature que alguém imaginou, uma direção que
> vale considerar um dia. Nada aqui é compromisso.
>
> **A porta de saída importa mais que a entrada.** Quando uma ideia amadurece, ela vira uma spec em
> `docs/specs/backlog/` e **sai da lista de abertas**, indo para "Promovidas" com o link da spec.
> Sem isso, este arquivo vira um segundo backlog concorrente e o `docs/specs/backlog/` deixa de ser
> a fila real.
>
> **O que NÃO entra aqui:** trabalho já decidido (isso é spec no backlog), bug ou dívida (isso é
> [`PROBLEMS.md`](PROBLEMS.md)), e decisão já tomada (isso é `CONTEXT.md` §5).
>
> **Formato de entrada** — copie o bloco abaixo:
>
> ```markdown
> ### I-0NN — <título curto> · <área>
>
> - **Ideia:** o que é, em uma ou duas frases.
> - **Origem:** de onde saiu (task, conversa, observação de uso).
> - **Por quê:** que problema real ela resolveria — se não houver, provavelmente não é uma ideia.
> - **Custo aparente:** o que ela exigiria (schema novo? motor novo? só UI?).
> ```

---

## Abertas

### I-001 — Campanha com status, briefing e log de atividade · campanha

- **Ideia:** dar à campanha os elementos que os protótipos aprovados já desenham mas o sistema não
  tem: **status** (ao vivo / agendada / pausada), um **briefing** textual, um **log de atividade** e
  um **indicador de membro online**.
- **Origem:** `m2-09` e `m2-15` — esse conteúdo aparece em `docs/design/examples/` e foi
  deliberadamente deixado de fora das duas tasks por não existir dado real que o alimentasse.
- **Por quê:** hoje a tela de campanha mostra pouco mais que nome, descrição e membros. Estes quatro
  elementos são exatamente o que transformaria a lista em um painel com informação de verdade — e o
  desenho deles já foi aprovado.
- **Custo aparente:** schema novo em `campanha` (status, briefing) e provavelmente uma tabela de
  eventos para o log. O indicador online sai de graça do gateway WebSocket que já existe. As specs
  `m2-18`/`m2-19`/`m2-20` do backlog atacam a mesma tela e podem absorver parte disto.

### I-002 — Passe de redução do bundle inicial · frontend

- **Ideia:** auditar o que está no chunk inicial do frontend e empurrar para lazy o que não é
  necessário no primeiro paint, em vez de continuar elevando o budget.
- **Origem:** observação recorrente ao longo de `m1-06`…`m3-27` — ver `PROBLEMS.md` `P-004`.
- **Por quê:** o budget já subiu quatro vezes. Ele deixou de ser um limite e virou um registro do
  que aconteceu, o que anula a razão de existir dele.
- **Custo aparente:** só frontend, sem schema nem regra. Provavelmente uma task de meio dia com
  `source-map-explorer` na frente.

### I-003 — Registrar trabalho que chega por PR sem passar pelo fluxo de spec · processo

- **Ideia:** decidir o que fazer com trabalho vindo de branches `claude/*` mergeadas por PR, que
  hoje não atualiza documentação nenhuma. Ou o merge passa a exigir o registro, ou fica explícito
  que essa via é não-documentada.
- **Origem:** `PROBLEMS.md` `P-002` — 11 commits reais entraram sem registro depois da `m3-27`.
- **Por quê:** o `HISTORY.md` só vale se for completo. Um histórico com buracos silenciosos é pior
  que um histórico assumidamente parcial, porque ninguém sabe onde estão os buracos.
- **Custo aparente:** zero de código. É uma decisão de processo — possivelmente uma linha no
  `CLAUDE.md` ou um item no template de PR.

---

## Promovidas

Ideias que viraram spec. Ficam aqui só para não serem reinventadas.

*(Nenhuma ainda — este arquivo nasceu em 2026-08-01.)*

| Ideia | Virou | Quando |
|---|---|---|
| — | — | — |

---

## Descartadas

Ideias consideradas e recusadas, com o motivo. Serve para não voltarem sozinhas.

*(Nenhuma ainda.)*
