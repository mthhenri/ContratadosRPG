# skills-04-task-flow.spec.md

> Task 4/9 do guarda-chuva `skills-agentes.spec.md`. Skill nova: `task-flow`.

## Objetivo

Criar a skill `task-flow`, que conduz o agente do **início ao fecho auditável** de uma tarefa:
mover a spec, implementar exatamente o que ela define, rodar os gates proporcionais ao risco e
registrar o resultado em `docs/context/` no formato certo de cada arquivo.

É a skill de maior retorno do conjunto: o fluxo de spec e o fecho de tarefa são a regra mais
longa do `CLAUDE.md` e a mais violada na prática.

## Motivação

- `P-002` · `ABERTO` · processo: o último bloco de `HISTORY.md` referenciado no problema é a
  `m3-27` e **11 commits de trabalho real** entraram depois sem registro — porque vieram por
  branch/PR, fora do fluxo que atualiza a documentação no fecho.
- `I-003` é a ideia aberta de resolver exatamente isso.
- `P-028` · `CONTORNADO` · processo/frontend: implementação commitada antes do gate visual, com a
  spec `maestrias-efeitos.spec.md` parada em `active/`.
- Não existe **template de spec** no repositório. `docs/specs/` tem `backlog/`, `active/` e
  `done/`, e cada spec nova é escrita imitando outra à mão — o que explica a variação de
  estrutura entre elas.

## Entregáveis

1. **`task-flow/SKILL.md`** nas duas pastas, cobrindo em ordem de execução:
   - **Abrir:** mover `docs/specs/backlog/<tarefa>.spec.md` para `active/`; se for spec de
     milestone (`m0-*` … `m7-*`) ou guarda-chuva, quebrar em tasks numeradas **antes** de
     implementar; specs em `done/` são registro histórico e não se reescreve.
   - **Implementar:** exatamente o que a spec define, sem extrapolar; achado fora do escopo vira
     entrada em `PROBLEMS.md`/`IDEAS.md`, não diff.
   - **Gates:** os comandos reais, por workspace — `npm run test --workspace=shared` e
     `--workspace=backend` (Vitest), `npm run test -w frontend` (`ng test`), `npm run lint`,
     `npm run build --workspace=shared` quando um DTO/enum novo precisa chegar ao backend, e a
     regra de relatar falha preexistente **separada** da falha causada pela task.
   - **Fechar:** mover a spec para `done/`; escrever a narrativa completa no topo de
     `HISTORY.md`; editar **somente as seções afetadas** de `CONTEXT.md` (teto ~400 linhas, sem
     diário); retirar de `PROBLEMS.md` o que foi corrigido; atualizar `MEMORY.md`/`IDEAS.md
     quando algo descoberto sobreviver à tarefa.
   - **Fecho auditável:** lista do que foi verificado e do que ficou pendente; item sem
     verificação obrigatória fica **aberto**, não "concluído".
2. **Formatos de entrada**, copiáveis, com a regra de numeração de cada arquivo:
   - `PROBLEMS.md`: bloco `### P-0NN — <título> · ESTADO · <área>` com Sintoma/Causa/Contorno/
     Correção/Desde; numeração sequencial e **número removido nunca reaproveitado**; item
     resolvido **sai** dos Ativos.
   - `IDEAS.md`: `### I-0NN`, e a movimentação de "Abertas" para "Promovidas" quando vira spec.
   - `HISTORY.md`: bloco no topo, com data e título; o que a narrativa precisa conter (o que
     mudou, por quê, o que foi testado, o que foi verificado ao vivo, e o achado que só
     apareceu na verificação — o padrão dos blocos recentes).
3. **Template de spec** em `docs/specs/TEMPLATE.spec.md`, com as seções que as specs boas do
   repositório já usam: cabeçalho `>` de contexto, `## Objetivo`, `## Entregáveis` (numerados),
   `## Critérios de Aceite`, `## Fora de Escopo`, `## Dependências` e `## Riscos e Mitigação`
   (opcional). O `SKILL.md` **aponta** para o template; não o copia. Usar
   `docs/specs/backlog/formatacao-legibilidade-frontend.spec.md` e
   `docs/specs/backlog/m4-06-regras-npc.spec.md` como referência de estrutura, e citá-las no
   template como exemplos de spec bem-feita (uma avulsa, uma de milestone).
4. **Regra de commit** citada: trailer `Co-authored-by:` identificando o agente, com a conferência
   pós-commit (`git log`/`git show`) — hoje está só no `CLAUDE.md` e é fácil de esquecer.
5. **Nota sobre trabalho que chega por PR** (`P-002`/`I-003`): a skill deve dizer o que fazer
   quando o trabalho não passou pelo fluxo de spec — registrar em `HISTORY.md` mesmo assim. A
   skill **não decide** a política; se o autor ainda não escolheu entre "registrar sempre" e
   "aceitar que PR não é registrado", a skill descreve a alternativa registrada em `I-003` e
   aponta para ela.
6. **`description` como gatilho**, disparando em "começar a task", "implementar a spec",
   "concluir", "fechar", "atualizar o contexto", "registrar no histórico" — e não só na palavra
   "spec".

## Critérios de Aceite

- Um agente que carregue só o `SKILL.md` consegue abrir, executar os gates e fechar uma tarefa
  sem reler o `CLAUDE.md` inteiro — e sem inventar formato de entrada de `PROBLEMS.md`.
- Todo comando citado roda de verdade no repositório (conferir contra os `scripts` de
  `package.json` da raiz e dos três workspaces).
- O template existe, é referenciado pelo `SKILL.md` e reproduz a estrutura das duas specs de
  referência citadas.
- Nenhum trecho contradiz o `CLAUDE.md`; onde o `CLAUDE.md` for mais forte (por exemplo
  "qualidade acima de velocidade"), a skill aponta para ele em vez de reescrever.
- `diff -r .claude/skills .agents/skills` vazio.
- **Validação por uso:** escrever o bloco de fecho desta própria task seguindo a skill, do
  zero — se algum passo do fecho não estiver claro no arquivo, o arquivo está incompleto.
- Fecho completo conforme `AGENTS.md`.

## Fora de Escopo

- **Escrever o bloco retroativo dos 11 commits do `P-002`.** É trabalho de conteúdo, não de
  processo; continua aberto no `PROBLEMS.md` depois desta task.
- Decidir a política de trabalho que chega por PR (`I-003`) — é decisão do autor.
- Reescrever `CLAUDE.md`/`AGENTS.md`. A skill executa a regra que já existe; se algo estiver
  ambíguo lá, registrar o achado no fecho e propor, não alterar.
- Automação (hook de pre-commit que exija entrada em `HISTORY.md`, gate de CI).
- Skill de testes separada — o pouco que há de próprio (qual runner por workspace, teste focado
  durante a implementação e suíte ampla no fecho) entra aqui.

## Dependências

- `skills-01` (contrato). Recomendável antes de `skills-05` … `skills-09`, porque o template que
  esta task cria passa a ser o formato das specs seguintes.

## Riscos e Mitigação

- **Virar cópia do `CLAUDE.md`.** Mitigado pelo contrato do guarda-chuva: ponteiro, não cópia. O
  que a skill acrescenta é a **ordem de execução** e os **formatos copiáveis** — isso hoje não
  está reunido em lugar nenhum.
- **Template engessar spec pequena.** O template deve marcar quais seções são obrigatórias
  (Objetivo, Entregáveis, Critérios de Aceite, Fora de Escopo) e quais são opcionais.
