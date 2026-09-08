# generic_base — base de padrões de arquitetura reutilizável

> Esta pasta **não é lida pelos agentes deste repositório** durante o trabalho normal do
> ContratadosRPG. É material de exportação: uma versão genérica, sem nenhum conceito do domínio
> do jogo (ficha, campanha, agente, classe...) nem da identidade visual do projeto, dos padrões de
> **arquitetura de código, convenções, fluxo de trabalho e contexto persistente** que este
> repositório desenvolveu. Serve para começar um projeto novo (qualquer stack) já com esses
> padrões, sem reconstruir do zero.

## O que está aqui

| Arquivo/pasta | Origem no ContratadosRPG | O que captura |
|---|---|---|
| [`ARCHITECTURE.template.md`](ARCHITECTURE.template.md) | `docs/SYSTEM.SPEC.md` | Documento de constituição: camadas, pacote compartilhado, regra de linguagem, banco de dados, tempo real, permissões, proibições absolutas |
| [`CONVENTIONS.template.md`](CONVENTIONS.template.md) | `docs/CONVENTIONS.md` | Referência rápida de nomenclatura (DTO, métodos, SQL, enums) com exemplos copiáveis |
| [`specs/TEMPLATE.spec.md`](specs/TEMPLATE.spec.md) + [`specs/README.md`](specs/README.md) | `docs/specs/TEMPLATE.spec.md` + fluxo `backlog/active/done` | Especificação de task antes de implementar, e o ciclo de vida do arquivo |
| [`context/`](context/) | `docs/context/*.md` | Sistema de contexto persistente entre sessões de agente: o que é verdade agora, o que aconteceu, o que está quebrado, onde as coisas vivem, o que ainda não é sistema |
| [`skills/`](skills/) | `.claude/skills/*` | Seis skills generalizadas que operacionalizam os documentos acima |

**O que NÃO está aqui, de propósito:** identidade visual/tema (`docs/design/`), regras de domínio
do jogo (`docs/core/`), runbooks de deploy específicos de infraestrutura (`docs/DEPLOY.md`,
`docs/DEVELOPMENT.md`). Este recorte é só **código, arquitetura e processo** — a parte que se
repete em qualquer projeto, independente do produto.

## Como usar num projeto novo

1. Copie `ARCHITECTURE.template.md` para `docs/ARCHITECTURE.md` (ou `SYSTEM.SPEC.md`, se preferir
   manter o nome) e `CONVENTIONS.template.md` para `docs/CONVENTIONS.md` no projeto novo. Preencha
   todo trecho entre `<...>` — stack técnica, nome das entidades, módulos reais. Apague qualquer
   seção que não se aplique (ex.: §9 Tempo Real, se o projeto não tiver realtime) em vez de deixar
   `<N/A>` solto.
2. Copie `specs/TEMPLATE.spec.md` para `docs/specs/TEMPLATE.spec.md` e crie as três pastas
   (`backlog/`, `active/`, `done/`).
3. Copie os cinco arquivos de `context/` para `docs/context/`, removendo o sufixo `.template` e
   esvaziando os exemplos (mantenha só o cabeçalho explicativo de cada arquivo).
4. Copie as skills de `skills/` para `.claude/skills/<nome>/SKILL.md` do projeto novo (e
   `.agents/skills/` também, se o projeto seguir a mesma convenção de duas cópias idênticas deste
   repositório). Ajuste os caminhos de comando (`npm run test --workspace=...`) para os comandos
   reais do projeto novo.
5. No `CLAUDE.md`/`AGENTS.md` do projeto novo, escreva a seção "Início obrigatório da sessão"
   apontando para `docs/ARCHITECTURE.md` → `docs/CONVENTIONS.md` → `docs/context/CONTEXT.md`, e a
   seção "Fluxo orientado por especificação" apontando para `docs/specs/`. Veja o próprio
   `CLAUDE.md` deste repositório como referência de como essas seções ficam depois de preenchidas.
6. Só depois disso, se o projeto tiver UI, trate identidade visual e o gate de fidelidade visual
   como uma decisão **separada** — este pacote não prescreve nada sobre isso.

## Princípios que atravessam todos os documentos

Estes não são regras de um arquivo específico — são a razão de o conjunto funcionar junto:

- **Documento vence código.** Toda fonte de verdade (arquitetura, convenção, regra de domínio) tem
  precedência sobre o que o código faz hoje; discordância se resolve mudando o código, não o
  documento, salvo decisão explícita do autor.
- **Camada burra / camada inteligente / camada só-dado.** Onde houver camadas de entrada
  (controller/handler), regra (service/use case) e persistência (repository/DAO), a regra de
  negócio mora só na do meio — as outras duas são "burras" por definição, não por disciplina.
  Ver `ARCHITECTURE.template.md` §7.
- **Fonte única para o que os dois lados de uma borda precisam saber.** Um pacote/módulo
  compartilhado existe para eliminar duplicação entre camadas que, de outro jeito, reimplementariam
  a mesma regra (contratos de entrada/saída, e — como exceção sancionada e isolada — motores de
  regra pura). Ver `ARCHITECTURE.template.md` §6.
- **Nada de lógica escondida em lugar errado.** Cada proibição absoluta do documento de arquitetura
  existe porque alguém já pagou o custo de uma regra de negócio na controller, uma query de um
  módulo no repositório de outro, ou uma permissão duplicada entre REST e realtime.
- **Contexto persistente é responsabilidade separada por arquivo**, não um diário único: o que é
  verdade agora (`CONTEXT`), o que aconteceu e por quê (`HISTORY`, que só acumula), o que está
  quebrado (`PROBLEMS`, que esvazia ao corrigir), onde as coisas vivem (`MEMORY`, só ponteiros,
  nunca cópia) e o que ainda não é sistema (`IDEAS`). Ver `context/`.
- **Task começa por spec, termina por fecho auditável.** Implementar exatamente o que a
  especificação define, sem extrapolar; achado fora do escopo vira `PROBLEMS`/`IDEAS`, nunca diff
  desta task. "Compila" e "um teste passou" não são "pronto" — pronto é o fecho descrito na skill
  `task-flow`.
