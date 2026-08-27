# skills-01-sincronia-e-contrato.spec.md

> Task 1/9 do guarda-chuva `skills-agentes.spec.md`. Primeira da fila: fixa a regra contra a qual
> todas as outras tasks de skill são conferidas.

## Objetivo

Tornar a sincronia entre `.claude/skills/` e `.agents/skills/` uma **regra escrita e verificável**
do repositório, no mesmo nível da sincronia já existente entre `AGENTS.md` e `CLAUDE.md`, e
registrar o contrato mínimo que toda skill do projeto deve cumprir.

Esta task **não escreve nem corrige nenhuma skill** — ela cria a regra. As correções são
`skills-02` e `skills-03`; as skills novas são `skills-04` … `skills-09`.

## Motivação

A regra de sincronia atual do `CLAUDE.md` ("Sincronização com CLAUDE.md") cobre apenas os dois
arquivos raiz. Skills ficaram de fora e divergiram sem ninguém perceber: hoje
`diff -r .claude/skills .agents/skills` acusa diferença nas duas skills existentes, uma delas com
conteúdo de outro projeto (ver `skills-agentes.spec.md`, "Contexto"). Sem regra escrita, a
próxima skill diverge igual.

## Entregáveis

1. **Regra de sincronia estendida** na seção "Sincronização com CLAUDE.md" de `CLAUDE.md` **e**
   `AGENTS.md` (mesma alteração, palavra por palavra, nos dois arquivos — a regra existente já
   exige isso): `.claude/skills/` e `.agents/skills/` são cópias integrais e devem permanecer
   idênticas, arquivo a arquivo, incluindo auxiliares em `references/`. Alterar uma skill obriga
   aplicar exatamente a mesma alteração na outra pasta **na mesma task**, e conferir que não há
   diferença antes de concluir. Nenhuma pasta é resumo, redirecionamento ou complemento da outra.
2. **Comando de conferência** citado na própria regra, para que o fecho seja verificável e não
   uma promessa: `diff -r .claude/skills .agents/skills` deve sair vazio.
3. **Contrato de skill** registrado em `CLAUDE.md`/`AGENTS.md` (subseção curta, ou parágrafo
   dentro da regra acima — o que ficar mais legível): os oito itens de "Contrato comum a toda
   skill do projeto" de `skills-agentes.spec.md`, condensados. O que não pode faltar:
   - `description` do frontmatter escrita como **gatilho** — em português, dizendo quando usar e
     com as palavras que a tarefa real usa; é o que faz a skill disparar;
   - skill aponta para a fonte da verdade, não a reescreve (mesmo princípio de `MEMORY.md`);
   - o que a skill carrega de próprio é ordem de execução, checklist e armadilha de campo;
   - `SKILL.md` até ~150 linhas, excedente em `references/`;
   - em conflito com `SYSTEM.SPEC.md`/`CONVENTIONS.md`/`docs/core/`/`docs/design/`, o documento
     vence e a skill é corrigida.
4. **Ponteiro em `MEMORY.md`**: linha na tabela §1 ("Onde estão as regras") apontando onde as
   skills vivem, que as duas pastas são idênticas e qual skill ler antes de qual tipo de
   trabalho. Só ponteiro — `MEMORY.md` nunca copia a regra.
5. **Verificação do estado atual, registrada:** rodar o `diff -r` antes de qualquer alteração e
   registrar no fecho da task quais skills estão divergentes hoje, para que `skills-02` e
   `skills-03` partam de um inventário conferido, e não da memória desta sessão.

## Critérios de Aceite

- `CLAUDE.md` e `AGENTS.md` continuam **integralmente idênticos** depois da alteração
  (`diff CLAUDE.md AGENTS.md` vazio) — a task não pode quebrar a regra que está estendendo.
- A regra nova nomeia as duas pastas, exige igualdade arquivo a arquivo e cita o comando de
  conferência.
- O contrato de skill está escrito de forma que um agente que nunca viu este repositório consiga
  criar uma skill conforme sem ler esta spec.
- `MEMORY.md` responde "onde ficam as skills" com ponteiro, sem duplicar o contrato.
- O inventário de divergência atual está registrado no fecho (`HISTORY.md`), com a saída do
  `diff -r` resumida — não é preciso colar o diff inteiro, mas é preciso nomear cada arquivo
  divergente e em que direção.
- Fecho completo conforme `AGENTS.md`: `HISTORY.md` no topo, seções afetadas de `CONTEXT.md`
  editadas, spec movida para `docs/specs/done/`.

## Fora de Escopo

- Editar qualquer `SKILL.md`. Mesmo sendo tentador igualar as duas pastas "já que estou aqui", a
  correção de conteúdo é `skills-02`/`skills-03` — misturar as duas coisas torna o diff desta
  task irrevisável.
- Criar skill nova.
- Job de CI que valide a sincronia. Registrar em `IDEAS.md` se o autor quiser; não entra aqui.
- Mexer na regra de sincronia `AGENTS.md` ↔ `CLAUDE.md` em si — ela está correta, só ganha
  companhia.

## Dependências

- Nenhuma. É a primeira task da fila e pré-requisito conceitual das outras oito (todas serão
  conferidas contra o contrato que esta task escreve).

## Riscos e Mitigação

- **Regra escrita e não cumprida na mesma task.** Mitigado pelo primeiro critério de aceite:
  `diff CLAUDE.md AGENTS.md` vazio ao fim.
- **Contrato inflado.** Se a subseção nova ficar longa a ponto de competir com o resto do
  `CLAUDE.md`, condensar: o detalhamento já vive em `skills-agentes.spec.md`, e o `CLAUDE.md`
  precisa apenas do suficiente para o agente não errar.
