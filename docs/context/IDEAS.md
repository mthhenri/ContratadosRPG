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

### I-004 — Venda de Fragmentos na ficha · ficha/fragmentos

- **Ideia:** dar ao inventário da ficha um botão "Vender" num fragmento portado, usando o cálculo de
  `shared/regras/compras/venda.ts` (`obterValorFragmento`/`calcularVendaFragmentos`) que já existe e
  já é testado — hoje só está acoplado à calculadora M1 de criação de personagem.
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — a regra e a tabela de preços existem, só
  não há caminho de UI na ficha viva.
- **Por quê:** um agente em campanha acumula fragmentos que não pretende usar; hoje a única forma de
  convertê-los em dinheiro é sair da ficha e recalcular na tela de criação.
- **Custo aparente:** só frontend — reusar `venda.ts` (`shared`) e o padrão de painel de ação já
  usado por "Aplicar em..."/"Consumir" (`ficha-inventario.component.ts`).

### I-005 — Identificação de Poder de fragmentos · ficha/fragmentos

- **Ideia:** modelar o estado "fragmento não identificado" e o teste de Intelecto (DT 15 + 5 por
  módulo acima de V) que o doc exige para revelar o que um fragmento faz.
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — hoje todo fragmento nasce "identificado":
  módulo, tipo e função ficam visíveis assim que o item existe na ficha.
- **Por quê:** é uma peça de suspense/risco do sistema original (o doc — "⬥ Identificação de Poder")
  que a implementação atual pula inteiramente, achatando a descoberta de fragmentos a uma decisão
  sem custo.
- **Custo aparente:** schema (flag `identificado` no item + módulo/tipo "ocultos" até então) e UI de
  teste — médio, mexe em como o item é exibido antes/depois de identificado.

### I-006 — Auto-desacoplamento e redução de módulo ao perder uso · ficha/fragmentos

- **Ideia:** quando o item hospedeiro de um fragmento Potencializador "perde seu uso" (destruído/
  quebrado/gasto — o doc não define o gatilho exato para itens não-consumíveis), o fragmento deveria
  se desacoplar sozinho e cair 1 módulo, mantendo o custo de Energia do módulo antigo.
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1934`.
- **Por quê:** hoje um fragmento acoplado fica preso ao item para sempre (só remoção manual), e a
  ficha não rastreia "uso"/durabilidade de item nenhum — implementar isso exigiria primeiro decidir
  o que "perder o uso" significa mecanicamente para itens não-consumíveis, o que o doc não deixa
  claro e não deveria ser decidido de forma isolada.
- **Custo aparente:** precisa de uma primitiva de "durabilidade/uso de item" que não existe hoje —
  provavelmente maior que qualquer outra peça isolada de fragmentos.

### I-007 — Colapso e transformação em criatura · ficha/fragmentos

- **Ideia:** a cadeia final da Afinidade — morrer em Anomalia Biológica leva a "Colapso", e o
  agente se transforma numa criatura conforme a faixa de Afinidade (Ameaça Baixa a Apocalíptica).
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1962-1968`. A
  `m3-67` cobre o Limite Mínimo de Energia e a Anomalia Biológica, mas para explicitamente antes
  desta parte.
- **Por quê:** é essencialmente "fim da ficha de jogador" — sai do modelo de ficha de agente para
  algo parecido com ficha de criatura/NPC (`m4-ficha-criatura-npc.spec.md`, ainda backlog). Faz mais
  sentido revisitar quando aquele milestone existir de verdade, em vez de modelar uma transformação
  para um sistema que ainda não tem forma.
- **Custo aparente:** alto — depende de `m4` existir primeiro.

### I-008 — Forja de Fragmentos e Fragmento Módulo ∅ · ficha/fragmentos

- **Ideia:** um local de base (Forja) onde combinar N fragmentos de um módulo em 1 de módulo
  superior, e a receita especial do Fragmento Módulo ∅ (propriedades negociadas com o Mestre).
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1990-2005`.
- **Por quê:** é um sistema de crafting inteiro (gate de patente, consumo de N itens, custo em
  dinheiro, uma tela/local novo) que não cabe dentro do componente de inventário atual — mais perto
  de merecer sua própria spec de UI (tela de "Base"/LDA) do que de ser espremido na ficha.
- **Custo aparente:** alto — motor (fácil, tabela de proporções) + UI nova (uma tela de base que
  ainda não existe no app).

### I-009 — Redução de Módulo de fragmentos · ficha/fragmentos

- **Ideia:** as duas formas do doc de reduzir o módulo de um fragmento: via uso em item consumível
  (ex.: granada — reduz 1 módulo, mas mantém o custo de Energia do módulo acima) e via redução
  sintética no LDA (patente Força Tarefa+, 50% do valor de venda + espera de uma missão, gera 2
  fragmentos do módulo inferior).
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1982-1988`. Chegou
  a ter uma spec dedicada (`m3-68`), removida do backlog por decisão do autor.
- **Por quê:** a via do item consumível é cálculo puro simples, mas a via do LDA depende de "esperar
  uma missão" — conceito que não existe em nenhum outro lugar do app hoje (sem sistema de missões).
  Modelar isso exigiria inventar uma simplificação (ex.: liberação manual pelo Mestre) sem um
  sistema de missão real para ancorar a decisão.
- **Custo aparente:** médio — motor fácil (duas funções puras + tabela de custo do LDA reusando
  `venda.ts`); a parte incerta é a UI/estado da espera do LDA sem um sistema de missão existente.

### I-010 — Histórico dedicado de fragmentos consumidos · ficha/fragmentos

- **Ideia:** uma tela/lista própria de "fragmentos consumidos" (módulo, bônus escolhido, quando),
  separada da lista de Sequelas.
- **Origem:** `m3-64` — "Fora de Escopo" da spec. A `descricao` da sequela "Rejeição Biológica"
  passou a carregar módulo + bônus escolhido (`"Fragmento Potencializador Módulo III consumido —
  +3 em Defesa"`), reaproveitando a sequela como o único registro que existe hoje.
- **Por quê:** reaproveitar a sequela funciona, mas não é pesquisável/filtrável como um histórico de
  verdade seria, e quando o jogador evita a sequela com o teste de Vontade (m3-42) **não sobra
  registro nenhum** do consumo — nem módulo, nem bônus escolhido.
- **Custo aparente:** schema novo (uma lista/tabela de eventos de consumo na ficha) + UI de exibição;
  sem motor novo (a formatação do texto já existe em `ficha-inventario.component.ts`).

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
