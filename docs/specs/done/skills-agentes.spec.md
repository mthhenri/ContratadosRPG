# skills-agentes.spec.md

> Spec guarda-chuva, fora da fila de milestone. Define o conjunto de skills de agente do
> repositório, o contrato comum a todas elas e a ordem de execução. **Não é implementável
> diretamente** — como qualquer spec de milestone (`AGENTS.md`, "Fluxo orientado por
> especificação"), é quebrada nas tasks numeradas `skills-01` … `skills-09`, cada uma com sua
> própria spec neste mesmo diretório.

## Contexto

O repositório tem hoje **duas** skills (`dto-conventions` e `verify`), duplicadas em
`.claude/skills/` e `.agents/skills/`. Levantamento feito em 2026-08-27 sobre o estado real dos
arquivos encontrou dois problemas e uma lacuna:

1. **As duas cópias divergiram**, e em ambas as direções. `diff -r .claude/skills .agents/skills`
   não sai vazio:
   - `.claude/skills/dto-conventions/SKILL.md` é uma cópia **de outro projeto** — fala em
     "Project 2.0", ensina `import ... from '@project20/shared/dtos/usuario'` e usa entidades
     inexistentes aqui (`Demanda`, `Projeto`, `Ponto`, `Execucao`, `Atividade`, `Calendario`).
     Como o Claude Code carrega skills de `.claude/`, **a skill de DTO em vigor hoje ensina o
     nome de pacote errado**.
   - `.claude/skills/verify/SKILL.md` é o inverso: mais rica e mais correta que a cópia de
     `.agents/`, que perdeu detalhes operacionais reais (resolução global do Playwright,
     seletores da ficha, `pingInterval 25s`/`pingTimeout 20s`, `EADDRINUSE`, o 500 fantasma de
     CORS explicado).
2. **Nada obriga as duas pastas a permanecerem iguais.** A regra de sincronia do `CLAUDE.md`
   cobre apenas `AGENTS.md` ↔ `CLAUDE.md`; skills ficaram de fora, e foi por isso que
   divergiram sem ninguém perceber.
3. **As regras mais violadas do projeto não têm skill.** Fluxo de spec e fecho de tarefa
   (`P-002`: 11 commits sem registro em `HISTORY.md`; `I-003`), gate visual (`P-028`: spec
   commitada sem verificação ao vivo), migrations e SQL (`CONVENTIONS.md:209` ainda anuncia
   "Próxima migration: `0009`" com o diretório em `0025`; `P-017`: migration que nunca rodou em
   produção), regras do jogo (`P-018`, `P-029`, `P-030` — três problemas abertos, todos
   divergência entre motor e `docs/core/`) e propagação em tempo real (`P-030`).

## Objetivo

Deixar o repositório com um conjunto de skills **coerente, sincronizado e confiável**: cada regra
de alto risco do projeto com um ponto de entrada operacional que o agente carrega no momento
certo, sem duplicar a fonte da verdade e sem divergência entre as duas pastas.

Skills não substituem `SYSTEM.SPEC.md`, `CONVENTIONS.md` nem `docs/design/` — elas são o
**caminho curto de execução** dessas regras: checklist, ordem de leitura, ponteiros e as
armadilhas aprendidas em campo que não estão escritas em lugar nenhum.

## Contrato comum a toda skill do projeto

Vale para as tasks `skills-01` … `skills-09` e para qualquer skill futura. Cada spec numerada
repete apenas o que for específico dela; o que está aqui é obrigatório para todas.

1. **Duas cópias idênticas.** Toda skill existe em `.claude/skills/<nome>/SKILL.md` **e**
   `.agents/skills/<nome>/SKILL.md`, byte a byte iguais — inclusive arquivos auxiliares.
   `diff -r .claude/skills .agents/skills` deve sair **vazio** ao fim de qualquer task que toque
   skills. Não é permitido usar uma pasta como resumo, redirecionamento ou complemento da outra.
2. **Frontmatter com `description` escrita como gatilho.** `name` (kebab-case, igual ao nome da
   pasta) e `description` em português, dizendo **quando** usar a skill e com as palavras que a
   tarefa realmente usa — é a `description` que faz a skill disparar. Descrição curta e genérica
   ("convenções de X") não dispara; a forma correta é a do `.claude/skills/dto-conventions` atual
   ("Use esta skill sempre que … mesmo que o usuário não mencione … explicitamente").
3. **Ponteiro, não cópia.** A skill **não reescreve** a regra canônica: aponta para o arquivo e a
   seção. Vale o mesmo princípio de `MEMORY.md` — cópia e fonte divergem no primeiro dia em que
   uma muda, e a cópia errada é pior que nenhuma. Duplicação só é aceitável quando a regra é
   consultada a cada passo da execução (a fórmula de DTO é o caso legítimo); quando duplicar,
   duplicar o mínimo e citar a fonte na mesma linha.
4. **A skill carrega o que a documentação não carrega:** a ordem de execução, o checklist de
   conferência e as armadilhas de campo (o tipo de conteúdo que hoje só existe em `verify`, como
   o `shared/dist` desatualizado ou o 500 fantasma de CORS).
5. **Tamanho.** `SKILL.md` até ~150 linhas. Material maior vai para
   `<skill>/references/<assunto>.md`, referenciado pelo `SKILL.md` — nunca inflar o arquivo
   principal, que é carregado inteiro.
6. **Sem contradizer a fonte.** Em conflito entre skill e `SYSTEM.SPEC.md`/`CONVENTIONS.md`/
   `docs/core/`/`docs/design/`, o documento vence e a skill é corrigida na mesma task.
7. **Português**, mesmo tom do restante da documentação do projeto.
8. **Validação por uso, não por leitura.** Uma skill só fecha depois de ser exercitada em um
   recorte real (ver "Critérios de Aceite" de cada task) — escrever o arquivo não é evidência de
   que ela funciona.

## Inventário das tasks

| Task | Skill / entrega | Estado alvo |
|---|---|---|
| `skills-01` | Regra de sincronia + contrato de skill em `CLAUDE.md`/`AGENTS.md`/`MEMORY.md` | novo |
| `skills-02` | `dto-conventions` | corrigir (cópia de outro projeto) |
| `skills-03` | `verify` | alinhar (manter a versão rica) |
| `skills-04` | `task-flow` — abrir e fechar tarefa, template de spec | novo |
| `skills-05` | `sql-migrations` — migration, schema e repositório | novo |
| `skills-06` | `design-fidelity` — o gate visual | novo |
| `skills-07` | `regras-do-jogo` — tocar em fórmula | novo |
| `skills-08` | `convencoes-check` — passe mecânico sobre o diff | novo |
| `skills-09` | `tempo-real` — propagação de mudança de ficha | novo |

## Ordem de execução

`skills-01` primeiro: ele fixa o contrato e a regra de sincronia contra a qual todas as outras
tasks são conferidas. Depois `skills-02` e `skills-03`, que consertam o que já existe e está
errado em uso hoje. As demais (`04` … `09`) são independentes entre si e podem ser feitas em
qualquer ordem ou em paralelo; `skills-04` primeiro é recomendável, porque o template de spec que
ele cria é o formato que as tasks seguintes passam a usar.

## Critérios de Aceite (do conjunto)

- As nove tasks numeradas concluídas, cada uma pelos seus próprios critérios.
- `diff -r .claude/skills .agents/skills` sai vazio.
- Toda skill presente nas duas pastas passa no checklist do contrato acima (frontmatter,
  tamanho, ponteiro em vez de cópia, sem contradizer a fonte).
- `MEMORY.md` responde "onde ficam as skills e qual skill ler antes de quê" sem repetir o
  conteúdo delas.

## Fora de Escopo

- **Corrigir as violações de convenção que as skills novas passarem a detectar.** `skills-08`
  entrega o detector; os achados existentes (por exemplo `atualizadoEm` em
  `shared/src/dtos/campanha/campanha.dtos.ts:67` e `atualizarDados()` em
  `frontend/src/app/modules/ficha/ficha-edicao-criatura.service.ts:110`, ambos contra a regra
  "`Alterar`, nunca `Atualizar`") viram entrada em `PROBLEMS.md` ou spec própria, nunca diff da
  task de skill.
- Resolver os problemas abertos que motivaram cada skill (`P-002`, `P-005`, `P-017`, `P-018`,
  `P-020`, `P-028`, `P-029`, `P-030`). As skills existem para não repeti-los; corrigi-los é outra
  fila.
- Automação de CI que valide skills (por exemplo um job que rode `diff -r` das duas pastas).
  Pode virar ideia em `IDEAS.md`; não entra aqui.
- Skills para assuntos deliberadamente descartados no levantamento: formatação/legibilidade
  (`P-020` — é regra + `npm run format:html-scss`, cabe em `skills-08`), ordem de leitura de
  início de sessão (já é `CLAUDE.md`, lido sempre) e testes (pouco material próprio além de
  "vitest em `shared`/`backend`, `ng test` no frontend" — cabe em `skills-04`).
- Qualquer mudança de código de produto em `shared/`, `backend/` ou `frontend/`.

## Dependências

- Nenhuma. Não bloqueia nem é bloqueada por spec ativa. Recomendável antes de retomar a fila de
  milestone, já que várias dessas skills existem justamente para proteger o gate de conclusão das
  tasks seguintes.
