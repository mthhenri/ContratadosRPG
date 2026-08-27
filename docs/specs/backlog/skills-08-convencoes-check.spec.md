# skills-08-convencoes-check.spec.md

> Task 8/9 do guarda-chuva `skills-agentes.spec.md`. Skill nova: `convencoes-check`.

## Objetivo

Criar a skill `convencoes-check`, um **passe mecânico sobre o diff** antes de declarar uma tarefa
pronta: rodar as verificações detectáveis por busca que correspondem à tabela "Proibições —
Resumo Rápido" do `CONVENTIONS.md`, e ler o que sobrar à mão.

## Motivação

A tabela de proibições tem ~30 linhas e boa parte é detectável por `grep`. Hoje nada roda esse
passe: o ESLint cobre outra coisa, e as regras de estilo `.ts` do projeto (aspas duplas, `;`,
`max-len` 100) estão deliberadamente em `warn`, não `error`, porque o código existente ainda não
as segue (`CONVENTIONS.md`, "Formatação").

Rodando os greps durante o levantamento desta spec, em segundos, apareceram violações reais da
regra "`Alterar`, nunca `Atualizar`":

- `shared/src/dtos/campanha/campanha.dtos.ts:67` — campo `atualizadoEm`.
- `frontend/src/app/modules/ficha/ficha-edicao-criatura.service.ts:110` — método
  `atualizarDados()`, com vários chamadores no mesmo arquivo.

O ponto não são esses dois achados (que são fora de escopo aqui), e sim que ninguém estava
olhando.

## Entregáveis

1. **`convencoes-check/SKILL.md`** nas duas pastas, com o passe em duas partes:
   - **Mecânica** — busca por padrão, cada uma com o comando pronto, o que significa um acerto e
     as exceções legítimas. Cobertura mínima:
     - `atualizar`/`Atualizado` em identificador (regra: `alterar`/`alterado`) — restringir a
       identificadores, não a texto de UI em português, onde "atualizar" é palavra normal;
     - `?` posicional e interpolação de string em SQL (regra: `:nomeParametro`);
     - `INSERT ... VALUES` e `DEFAULT` em coluna, fora de `migrations/` quando aplicável;
     - `SELECT` sem `is_deleted = false`;
     - DELETE físico;
     - `process.env` fora de `backend/src/config/` — hoje os únicos acertos são **comentários**
       citando a proibição, o que a skill deve prever como falso positivo esperado;
     - hex/cor/fonte/raio hardcoded em `.scss` (regra: tokens) — com allowlist para os casos
       legítimos já existentes, como `#000` dentro de `mask`/gradiente de fade
       (`acervo.page.scss`, `ficha-inventario.component.scss`);
     - atributo `title=` em template (regra: `[appTooltip]`);
     - `.css` em vez de `.scss`, `style=""` inline, seletor de ID;
     - DTO declarado fora de `shared/src/dtos/`;
     - enum fora de `shared/src/enums/`, valor diferente do nome ou fora de `SCREAMING_SNAKE_CASE`;
     - `NgModule` em feature nova, `ngModel`/template-driven form;
     - linha muito longa em `.html`/`.scss` (`P-020`), com ponteiro para
       `npm run format:html-scss -w frontend`.
   - **Manual** — o que grep não pega e precisa de leitura do diff: lógica na controller,
     `try/catch` ou `if` em controller, regra de negócio duplicada entre frontend e backend,
     permissão duplicada fora da service dona, fórmula fora de `shared/src/regras/`, DTO herdando
     DTO de negócio, primitivo em assinatura de service/repository, query de um módulo no
     repositório de outro, escrita via WebSocket.
2. **Escopo padrão = o diff da task**, não o repositório inteiro: a skill roda sobre
   `git diff`/arquivos tocados. Rodar no repositório inteiro é modo explícito, para auditoria —
   e o resultado disso é entrada em `PROBLEMS.md`, não correção oportunista.
3. **Regra de achado fora do diff**, escrita de forma inequívoca: violação preexistente em
   arquivo que a task nem tocou **não se corrige** no diff da task — registra-se. É a mesma
   regra de "não extrapolar escopo" do `CLAUDE.md`, e é o principal risco desta skill.
4. **Script opcional** `scripts/convencoes-check.mjs`, se durante a implementação ficar claro que
   a lista de comandos é longa demais para colar à mão. Decidir na implementação, com
   justificativa no fecho; a skill funciona com ou sem ele. Se existir, `SKILL.md` documenta como
   rodar e como interpretar a saída, incluindo a allowlist.
5. **`description` como gatilho**: revisar diff, conferir convenções, antes de commitar, antes de
   fechar a task, checar padrão/nomenclatura.
6. **Corte de tamanho**: a lista de buscas provavelmente estoura ~150 linhas — planejar
   `convencoes-check/references/buscas.md` desde o começo, com o `SKILL.md` guardando o
   procedimento, a parte manual e o ponteiro.

## Critérios de Aceite

- Cada comando de busca roda de verdade neste repositório e a skill declara, para cada um, qual é
  o falso positivo esperado (o caso `process.env`, que hoje só acerta comentários, é o exemplo de
  por que isso é obrigatório).
- Nenhuma busca cuja taxa de falso positivo torne o resultado inútil entra na lista — melhor
  cinco buscas confiáveis que quinze ruidosas.
- A regra de "achado fora do diff não se corrige aqui" está escrita no `SKILL.md`, não só nesta
  spec.
- **Validação por uso:** rodar o passe completo sobre um commit recente já mergeado e sobre o
  diff desta própria task. O resultado esperado inclui reencontrar os dois achados de
  `Atualizar` citados na motivação — se não reencontrar, a busca está mal construída. Registrar
  a saída resumida no fecho.
- `diff -r .claude/skills .agents/skills` vazio.
- Fecho completo conforme `AGENTS.md`.

## Fora de Escopo

- **Corrigir qualquer violação existente**, incluindo `atualizadoEm` em
  `shared/src/dtos/campanha/campanha.dtos.ts:67` e `atualizarDados()` em
  `frontend/src/app/modules/ficha/ficha-edicao-criatura.service.ts:110`. Renomear um campo de DTO
  ou um método público tem alcance real (chamadores, testes, possivelmente contrato de API) e é
  spec própria. Esta task **registra** os achados em `PROBLEMS.md` — nada mais.
- Converter as regras `warn` do ESLint em `error`, ou rodar `eslint --fix` em massa — decisão
  registrada e adiada em `CONVENTIONS.md` ("Formatação").
- Gate de CI que reprove PR com violação. Vira ideia em `IDEAS.md`.
- Regra nova de convenção. A skill só executa o que o `CONVENTIONS.md` já define; se uma busca
  revelar que a convenção é ambígua, registrar e perguntar ao autor.
- `P-020` (legibilidade) — a skill detecta linha longa; a refatoração é
  `formatacao-legibilidade-frontend.spec.md`.

## Dependências

- `skills-01` (contrato). Recomendável depois de `skills-04`, para que a skill possa ser citada
  como passo do fecho descrito lá.

## Riscos e Mitigação

- **Convite à correção oportunista.** É o maior risco: a skill entrega uma lista de violações
  bem no momento em que o agente está terminando. Mitigado pelo entregável 3 e pelo "Fora de
  Escopo" — e o próprio `SKILL.md` deve dizer isso na primeira tela, não em rodapé.
- **Ruído.** Busca com muito falso positivo é ignorada na segunda vez; mitigado pelo segundo
  critério de aceite e pela allowlist explícita.
- **Falsa sensação de cobertura.** A parte mecânica cobre pouco do que importa; a skill deve
  deixar claro que passe limpo não substitui a leitura do diff nem o gate visual.
