---
name: orquestracao
description: Decidir sozinho se executa direto, delega a um subagente Claude ou consulta o Codex (ou, sendo o Codex, o Claude) — e como fazer isso. Use ao planejar tarefa grande ou paralelizável, ao ficar travado num bug após tentativas sem progresso, antes de fechar alteração de risco (regra do jogo, SQL/migration, permissão, tempo real, refactor amplo), ao querer segunda opinião ou revisão independente, ou quando o pedido citar subagente, agente, Codex, Claude, delegar, paralelizar ou "outra opinião".
---

# Orquestração multiagente — quando e como delegar

> Regra-base em `CLAUDE.md`/`AGENTS.md` ("Orquestração multiagente"); o gate de
> qualidade de lá continua valendo para todo trabalho delegado. Esta skill traz a
> ordem de decisão, os limites e os comandos. Modelos, chaves e remoção:
> `references/configuracao.md`. Modelos de tarefa: `references/modelos-de-tarefa.md`.

## 1. Decidir — direto, subagente ou agente externo

Execute **direto** (padrão) quando a tarefa é trivial, cabe em poucos arquivos já
conhecidos, ou explicar o contexto custaria mais que fazer.

Delegue só se ao menos um ganho for concreto:

| Sinal | Destino | Por quê |
|---|---|---|
| Busca ampla/mecânica ("onde está X", mapear consumidores) | Claude `Explore` (embutido) | preserva o contexto principal |
| 2+ recortes independentes, critério de sucesso claro | Claude `implementador` em paralelo | paralelismo real |
| Suíte/lint/build com saída longa | Claude `testador` | só o resumo volta |
| Alteração de risco pronta para fechar | Claude `revisor` **ou** Codex `consulta` | revisão independente |
| Bug difícil após 2 tentativas sem progresso | Codex `consulta` (hipótese independente) | outra linha de raciocínio |
| Refactor/implementação grande e bem especificada | Codex `implementacao` ou `implementador` | trabalho autônomo longo |
| Decisão de arquitetura, conflito entre agentes, síntese | **orquestrador** | nunca delegado |

Escolha entre revisor Claude e Codex: prefira o **Codex** quando a independência
de família de modelo agrega (regra do jogo, SQL irreversível, segurança/permissão,
bug persistente) e ele estiver disponível; o `revisor` Claude nos demais casos.
Ambos só quando o risco justificar o custo dobrado.

**Não delegue** para confirmar o óbvio, para "ter mais gente olhando" algo
trivial, nem a mesma pergunta duas vezes sem informação nova.

## 2. Escrever a tarefa (context engineering)

Envie só: objetivo · requisitos e restrições · arquivos/intervalos relevantes ·
fonte da verdade a consultar · definição de sucesso · formato da resposta.
Nunca cole o histórico da conversa. Para tarefas grandes, aponte o ponto de partida
e deixe o agente explorar. Modelos prontos em `references/modelos-de-tarefa.md`.

## 3. Chamar

**Subagente Claude** (dentro do Claude Code): ferramenta `Agent` com
`subagent_type` = `Explore` | `implementador` | `revisor` | `testador`
(definições em `.claude/agents/`). Recortes independentes vão na mesma mensagem
para rodarem em paralelo; prefira `run_in_background` quando houver outro
trabalho a fazer enquanto isso.

**Codex** (a partir do Claude): via Bash, em segundo plano se for demorar:

```bash
scripts/agentes/codex-delegar.sh --modo consulta [--esforco high] < tarefa.md
scripts/agentes/codex-delegar.sh --modo implementacao [--esforco medium] --tarefa tarefa.md
```

Escreva a tarefa num arquivo do scratchpad, não no repositório. Saída: a resposta
final do Codex, a lista de arquivos que ele alterou (com alerta se tocou
configuração de agentes/CI) e uma linha `[delegacao] …`; registro completo em
`.agentes/execucoes/` (ignorado pelo git).

**Claude** (a partir do Codex, quando o Codex é o orquestrador):

```bash
scripts/agentes/claude-delegar.sh --modo consulta [--modelo opus] < tarefa.md
scripts/agentes/claude-delegar.sh --modo implementacao --agente implementador --tarefa tarefa.md
```

O sandbox do Codex corta rede; a chamada precisa de aprovação para rodar fora
dele — peça ao usuário, não contorne. No modo implementação o Claude chamado não
tem sandbox de sistema (só ferramentas restritas): revise o diff que ele deixar.

Códigos de saída dos dois wrappers: `3` integração desligada · `4` você já é um
agente delegado · `5` consulta duplicada · `6` limite de simultâneas · `7` CLI
não autenticada · `8` sem rede até o provedor · `127` CLI ausente. Em qualquer um deles, **execute a tarefa sem delegar** e siga.

## 4. Revisão independente (protocolo)

1. Implemente e rode os testes.
2. Monte a tarefa com **problema, requisitos, fonte da verdade e onde está o diff**
   (`git diff <base>` ou lista de arquivos). **Não** diga qual é a sua conclusão,
   o que você acha que está certo nem onde suspeita de erro.
3. Peça bugs, regressões, casos de borda e alternativas, com cenário concreto.
4. Avalie cada achado contra o código: reproduza ou trace o caminho. Classifique
   em procede / não procede (motivo) / incerto.
5. Corrija só o que procede; rode os testes de novo. Não mande o mesmo diff para
   nova revisão só para "confirmar" — uma segunda rodada só com mudança relevante.
6. Divergência que você não consegue decidir com evidência → leve ao autor.

## 5. Limites (anti-loop e custo)

- **Profundidade 1**: agente delegado não delega. Subagentes Claude não têm a
  ferramenta `Agent` e o hook `scripts/agentes/hook-profundidade.sh` bloqueia os
  wrappers quando chamados de dentro de subagente; os wrappers recusam quando
  `AGENTES_PROFUNDIDADE≥1` (processo externo delegado).
- **Por tarefa do usuário**: no máximo 2 consultas ao Codex e 1 rodada de revisão
  independente, salvo informação nova relevante. Até 4 subagentes Claude em paralelo.
- **Simultâneas**: os wrappers aceitam no máximo 2 execuções por destino
  (`AGENTES_MAX_PARALELO`).
- **Tempo**: 30 min por chamada externa (`--tempo-limite`).
- **Sem progresso**: se duas delegações sobre o mesmo ponto não avançarem, pare,
  sintetize o que se sabe e pergunte ao autor.

## 6. Responsabilidade e registro

- O orquestrador decide e responde pelo resultado. Resposta de agente é **evidência
  a verificar**, não verdade: confira `arquivo:linha` citados antes de agir.
- Trabalho delegado passa pelo mesmo gate de `CLAUDE.md` (diff revisado, testes,
  verificação visual feita pessoalmente pelo orquestrador).
- Codex/Claude delegados não fazem commit; o orquestrador commita. Se o Codex
  escreveu parte relevante do código, inclua também o trailer
  `Co-authored-by: Codex <noreply@openai.com>`.

## 7. Observabilidade — o que contar ao usuário

Só quando houve delegação **significativa**, uma linha por delegação no relato:

```
Delegação: Codex (modelo padrão, esforço high, consulta) — revisão independente do diff de X → 2 achados, 1 procedente (corrigido).
Delegação: 3× implementador (sonnet) em paralelo — módulos A, B, C → todos verdes.
```

Nada de log para buscas triviais com `Explore`. Histórico das chamadas externas:
`tail .agentes/delegacoes.log` (TSV: data, destino, modo, modelo, esforço, segundos, status, hash, pasta).
