# skills-02-dto-conventions-projeto.spec.md

> Task 2/9 do guarda-chuva `skills-agentes.spec.md`. Corrige uma skill que está **errada em uso
> hoje**, não uma pendência teórica.

## Objetivo

Deixar a skill `dto-conventions` própria deste projeto, com a versão rica (a de `.claude/`) como
base, e as duas cópias idênticas.

## Motivação

`.claude/skills/dto-conventions/SKILL.md` — a cópia que o Claude Code efetivamente carrega — é
um arquivo de **outro projeto**: intitula-se "Convenções de DTO — Project 2.0", ensina
`import { UsuarioCriarDto } from '@project20/shared/dtos/usuario'` e usa como exemplo entidades
que não existem aqui (`Demanda`, `Projeto`, `Ponto`, `Execucao`, `Atividade`, `Calendario`,
`Tag`, `Assistente`), inclusive na lista de módulos de `shared/src/dtos/`. Um agente que seguir a
skill à risca escreve o import errado.

A cópia de `.agents/` está correta quanto ao projeto (`@contratados-rpg/shared`), mas é um resumo
de 50 linhas que perdeu o que torna a skill útil: as regras de complemento composto, o caso do
qualificador `Interno`, a justificativa da proibição de herança entre DTOs de negócio e a lista
de anti-padrões. As duas precisam convergir para uma terceira coisa: o conteúdo rico, corrigido
para este projeto.

## Entregáveis

1. **`SKILL.md` reescrito** a partir da versão de `.claude/` (a rica), com:
   - título e texto sem nenhuma menção a "Project 2.0";
   - imports reais: `@contratados-rpg/shared/dtos/<modulo>`;
   - lista de módulos igual à realidade de `shared/src/dtos/`: `campanha/`, `encontro/`,
     `ficha/`, `pagina-caderno/`, `rolagem/`, `usuario/`;
   - **todos** os exemplos trocados por DTOs reais do projeto, conferidos contra
     `shared/src/dtos/` (o repositório tem ~214 DTOs — não faltam exemplos). Preferir os que
     exercitam a regra difícil, por exemplo `CampanhaConviteRegenerarDto`/
     `CampanhaConviteRegeneradoDto` (complemento + verbo), `CampanhaMembroInternoRecuperarDto`
     (complemento composto com `Interno` antes do verbo), `CampanhaInventarioItemQuantidadeAjustarDto`
     (complemento longo), `UsuarioListadosDto extends PaginatedResult<UsuarioResumoDto>`
     (única herança permitida) e `CampanhaResumoDto` (saída de listagem);
   - ponteiro explícito para `docs/CONVENTIONS.md` ("DTOs") e `docs/SYSTEM.SPEC.md` como fonte da
     verdade, deixando claro que a skill é o caminho de execução, não a regra;
   - ponteiro para `shared/src/dtos/` como lugar onde conferir precedente antes de inventar nome
     novo — hoje o melhor argumento contra um nome errado é um par já existente.
2. **`description` do frontmatter** no formato de gatilho, mantendo a força da atual de `.claude/`
   (dispara mesmo quando a tarefa não diz "DTO", e diz explicitamente que erro de nomenclatura de
   DTO é uma das falhas mais frequentes), com o nome correto do projeto.
3. **Checklist final de conferência** ao fim do arquivo — nome, verbo, direção, complemento,
   herança, localização — como o que a versão de `.agents/` tem hoje e a de `.claude/` não tem.
   É o único trecho que a cópia curta faz melhor; não perder na fusão.
4. **Cópia idêntica** em `.claude/skills/dto-conventions/SKILL.md` e
   `.agents/skills/dto-conventions/SKILL.md`.
5. **Corte de tamanho:** se o arquivo fundido passar de ~150 linhas, mover a tabela de
   anti-padrões e os casos especiais (relatório/consulta computada, value object) para
   `dto-conventions/references/casos-especiais.md` nas duas pastas, com ponteiro no `SKILL.md`.

## Critérios de Aceite

- `grep -ri "project20\|Project 2.0" .claude/skills .agents/skills` não retorna nada.
- Todo nome de DTO citado como exemplo **existe de fato** em `shared/src/dtos/` (conferir um a
  um com `grep`), exceto exemplos explicitamente marcados como incorretos na coluna de
  anti-padrão.
- Todo caminho de import citado resolve de verdade (conferir contra os barrels de
  `shared/src/dtos/*/index.ts`).
- `diff -r .claude/skills .agents/skills` sai vazio.
- **Validação por uso:** pegar dois DTOs reais já existentes e um nome hipotético novo (por
  exemplo, um sub-aspecto de `Encontro` ainda não modelado), aplicar a skill do zero e confirmar
  que ela leva ao nome que o projeto já usa nos dois primeiros casos e a um nome coerente no
  terceiro. Registrar os três casos no fecho.
- Fecho completo conforme `AGENTS.md` (`HISTORY.md`, `CONTEXT.md` se afetado, spec para `done/`).

## Fora de Escopo

- **Renomear qualquer DTO existente.** A skill descreve a regra; o código que a viola é problema
  separado. Se a conferência de exemplos revelar um DTO fora do padrão, registrar em
  `PROBLEMS.md` (ou anotar em `IDEAS.md` se for renomeação em massa) — nunca renomear no diff
  desta task.
- Mudar a regra de DTO em si. Se a skill e o `CONVENTIONS.md` divergirem em algum ponto, o
  documento vence e a skill é ajustada; alterar a convenção é decisão do autor, em spec própria.
- A skill `verify` (`skills-03`).

## Dependências

- `skills-01` (contrato e regra de sincronia) — recomendável antes, para que o formato do
  frontmatter e o limite de tamanho já estejam escritos. Não é bloqueio técnico.

## Riscos e Mitigação

- **Fusão perder conteúdo bom de um dos lados.** Mitigado pelos entregáveis 1 e 3, que nomeiam
  explicitamente o que vem de cada cópia; conferir o `diff` das duas versões originais antes de
  escrever a fundida, não depois.
- **Exemplo inventado.** Mitigado pelo critério de aceite que exige `grep` de cada nome citado
  contra `shared/src/dtos/` — exemplo plausível mas inexistente é exatamente o defeito que
  produziu a versão "Project 2.0".
