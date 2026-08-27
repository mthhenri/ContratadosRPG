# CLAUDE.md

Este arquivo é a orientação canônica para agentes de código que trabalham no
repositório ContratadosRPG. As instruções valem para o Codex e para qualquer
outro agente compatível com `AGENTS.md`.

## Sincronização com CLAUDE.md

`AGENTS.md` e `CLAUDE.md` são cópias integrais e devem permanecer idênticos.
Ao alterar qualquer um desses arquivos, aplique exatamente a mesma alteração
ao outro na mesma tarefa e confirme que não há diferença entre eles antes de
concluir. Não use um arquivo como redirecionamento, resumo ou complemento do
outro.

A mesma regra vale para `.claude/skills/` e `.agents/skills/`: as duas pastas
são cópias integrais e devem permanecer idênticas arquivo a arquivo, incluindo
auxiliares em `references/`. Alterar uma skill obriga aplicar exatamente a
mesma alteração na outra pasta na mesma tarefa; `diff -r .claude/skills
.agents/skills` deve sair vazio antes de concluir. Nenhuma pasta é resumo,
redirecionamento ou complemento da outra.

### Contrato comum a toda skill do projeto

Toda skill do repositório — existente ou nova — cumpre:

- **Duas cópias idênticas** em `.claude/skills/<nome>/SKILL.md` e
  `.agents/skills/<nome>/SKILL.md` (regra acima), inclusive auxiliares.
- **`description` do frontmatter escrita como gatilho**: em português,
  dizendo quando usar a skill com as palavras que a tarefa real usa — é o que
  faz a skill disparar, não uma descrição curta e genérica.
- **Ponteiro, não cópia**: a skill aponta para a fonte da verdade
  (`SYSTEM.SPEC.md`, `CONVENTIONS.md`, `docs/core/`, `docs/design/`) em vez de
  reescrevê-la — mesmo princípio de `MEMORY.md`.
- **O que a skill carrega de próprio** é ordem de execução, checklist de
  conferência e armadilha de campo — o que a documentação não carrega.
- **Tamanho**: `SKILL.md` até ~150 linhas; excedente vai para
  `<skill>/references/<assunto>.md`.
- **Em conflito** com `SYSTEM.SPEC.md`/`CONVENTIONS.md`/`docs/core/`/
  `docs/design/`, o documento vence e a skill é corrigida na mesma tarefa.
- **Português**, mesmo tom do restante da documentação do projeto.
- **Validação por uso**: uma skill só fecha depois de exercitada em um
  recorte real de trabalho, não só por ter sido escrita.

## Início obrigatório da sessão

Antes de implementar qualquer mudança, leia nesta ordem:

1. `docs/SYSTEM.SPEC.md` — constituição do projeto e autoridade máxima.
2. `docs/CONVENTIONS.md` — convenções de código.
3. `docs/context/CONTEXT.md` — estado atual e próxima tarefa.

Leia também os arquivos específicos de `docs/context/` conforme a pergunta:

- `PROBLEMS.md`: defeitos conhecidos; consulte antes de investigar falhas.
- `HISTORY.md`: decisões e histórico; procure por código da tarefa ou arquivo,
  sem ler o arquivo inteiro.
- `MEMORY.md`: mapa de onde regras, código e documentação vivem.
- `IDEAS.md`: ideias consideradas, mas ainda não incorporadas ao sistema.

Antes de qualquer trabalho de frontend, UI ou estilo, leia
`docs/design/DESIGN.md` e o handoff em `docs/design/tema/`. Nunca desenvolva uma
tela sobre um tema PrimeNG vazio ou padrão.

## Fontes da verdade

As regras do jogo estão em `docs/core/sistema-v4.1.0.md` e
`docs/core/guia_de_mestre-v4.0.0.md`. Antes de alterar fórmulas, progressão ou
regras de domínio, consulte esses documentos; em caso de conflito, o documento
vence o código.

As decisões visuais estão em `docs/design/`. Os tokens de
`docs/design/tema/_tokens.scss` são a fonte de verdade em runtime. Componentes
devem consumir tokens (`var(--surface)`, `var(--accent)`,
`var(--font-mono)` etc.), sem hex, fontes ou raios hardcoded. Reutilize os
padrões BEM de `_componentes.scss`; a identidade é dark-first com IBM Plex.

## Contexto persistente

`docs/context/` tem responsabilidades separadas:

| Arquivo | Responsabilidade | Operação |
|---|---|---|
| `CONTEXT.md` | o que é verdade agora | editar/reorganizar, cerca de 400 linhas |
| `HISTORY.md` | o que aconteceu e por quê | acrescentar no topo |
| `PROBLEMS.md` | o que está quebrado | registrar; remover ao corrigir |
| `MEMORY.md` | onde as coisas vivem | somente ponteiros |
| `IDEAS.md` | o que ainda não é sistema | retirar de abertas ao especificar |

Ao concluir uma tarefa, registre a narrativa completa em `HISTORY.md`, edite
somente as seções afetadas de `CONTEXT.md` e atualize os demais arquivos quando
algo descoberto sobreviver à tarefa. Não acrescente um diário em `CONTEXT.md`.
O conteúdo da documentação do projeto é em português.

## Fluxo orientado por especificação

1. Mova `docs/specs/backlog/<tarefa>.spec.md` para `docs/specs/active/`.
2. Implemente exatamente o que a especificação define; não extrapole.
3. Mova a especificação para `docs/specs/done/` ao terminar.
4. Atualize `docs/context/` conforme as regras acima.

Specs de milestone (`m0-*` a `m5-*`) devem ser divididas em tarefas numeradas
antes da implementação. Specs em `done/` são registro histórico e não devem ser
reescritas.

## Gate obrigatório de qualidade e conclusão

Uma tarefa de código **não está concluída** enquanto não houver evidência de que
ela respeita a especificação, a arquitetura e, quando aplicável, o contrato
visual. Não declare sucesso apenas porque compila ou porque um teste unitário
passou.

### Prioridade absoluta: qualidade acima de velocidade

Qualidade, fidelidade ao sistema e aderência às regras do projeto têm prioridade
sobre velocidade de entrega. Prazo, pressa, tamanho da spec, limite de contexto,
delegação ou custo de execução **nunca** justificam pular leitura, extração,
testes, revisão ou verificação visual. É preferível levar o dobro do tempo e
entregar uma implementação completa e coerente a entregar cedo e obrigar o
autor a pedir uma segunda implementação para corrigir atalhos previsíveis.

### Rigor com eficiência

Qualidade acima de velocidade não significa maximizar etapas, agentes, chamadas
ou consumo de contexto. O caminho preferido é o menor processo que produza
evidência suficiente e confiável de conformidade. Seja rigoroso com as regras e
eficiente na forma de cumpri-las.

- Use subagentes somente quando houver trabalho independente e paralelismo
  realmente útil. Envie a cada um apenas o contexto necessário para sua
  responsabilidade e evite que vários agentes investiguem ou validem o mesmo
  recorte sem uma justificativa concreta.
- Não replique documentos extensos, histórico completo ou saídas de ferramentas
  quando um resumo preciso, referências a arquivos e intervalos relevantes forem
  suficientes.
- Durante a implementação, prefira testes focados e proporcionais ao risco.
  Execute suítes amplas nos gates de integração e conclusão, sem repetir builds,
  lint ou testes idênticos quando nenhuma mudança relevante ocorreu.
- Consolide revisões e verificações. Uma UI deve receber a verificação visual
  completa exigida, normalmente ao final de um corte integrado; não multiplique
  inspeções visuais preventivas se uma única sessão puder cobrir todos os
  viewports e estados. Repita apenas para confirmar correções encontradas.
- Limite logs, snapshots, árvores de acessibilidade e outras saídas ao trecho
  necessário para decidir ou comprovar o resultado.
- Cada etapa adicional deve responder a um risco, requisito ou evidência real.
  Quantidade de atividade não é evidência de qualidade.

Quando não houver tempo ou ambiente suficiente para cumprir todos os gates, a
tarefa permanece **aberta**. Relate o avanço e a pendência; não reduza o padrão
de qualidade para produzir uma aparência de conclusão.

Antes de alterar código:

1. Identifique a fonte de verdade da mudança: spec ativa, documento de regra,
   convenção e, para UI, `docs/design/` e um componente análogo já aprovado.
2. Delimite a responsabilidade: regras puras e contratos compartilhados vivem
   em `shared/`; orquestração e permissão no service; UI só apresenta estado e
   encaminha interações. Não duplique uma regra de domínio no frontend ou
   backend.
3. Ao tocar um componente já extenso, não acrescente uma nova responsabilidade
   sem antes avaliar extraí-la para componente, composable/service ou função
   pura. Se a extração não for proporcional ao escopo, registre no fecho da
   tarefa por que o acréscimo local é seguro.

### Processo obrigatório para qualquer UI ou estilo

Toda mudança que crie ou altere UI, layout, componente visual ou estilo segue
este processo, sem exceção:

1. Antes de editar, escolha e registre o **componente análogo aprovado** que
   servirá de referência. “Usar os tokens” não basta: mapeie também shell,
   densidade, hierarquia, espaçamento, controles, estados, iconografia e
   comportamento responsivo.
2. Inspecione o análogo no código e, quando disponível, na aplicação real.
   Reutilize componentes e padrões existentes antes de criar uma variação.
3. Construa primeiro um corte visual representativo. Não cubra um formulário
   HTML genérico com tokens e trate isso como fidelidade ao design.
4. Rode a aplicação real e use obrigatoriamente a skill `verify`. Verifique no
   mínimo `1920×1080` e `360×800`, além de todos os viewports e estados exigidos
   pela spec. Percorra os estados relevantes; uma captura só do estado inicial
   não valida uma tela interativa.
5. Compare visualmente a implementação renderizada com o análogo escolhido.
   Confirme explicitamente: parece parte do mesmo produto; tem a mesma densidade
   e hierarquia; usa os controles, ícones e estados canônicos; não parece HTML
   genérico; não tem overflow; foco, contraste e alvos de toque estão corretos.
6. Corrija qualquer divergência **antes** de apresentar a implementação ao
   autor. Build, testes, lint, uso correto de tokens e ausência de overflow são
   necessários, mas não substituem essa comparação visual.

Se o trabalho foi delegado, o relato ou screenshot do subagente não encerra o
gate. O agente principal deve inspecionar pessoalmente a UI renderizada nos
viewports obrigatórios antes de entregá-la. Se a aplicação real não puder ser
executada ou observada, a tarefa visual permanece aberta; nunca declare que a
UI está pronta com base apenas no código.

Antes de declarar uma tarefa pronta:

1. Revise o diff completo contra a spec e as convenções; confirme que não há
   hardcodes ou atalhos que contornem a fonte de verdade.
2. Rode build, testes, lint e checagens proporcionais ao risco. Relate os
   comandos, os resultados e qualquer falha preexistente separadamente.
3. Para UI, cumpra integralmente o processo visual obrigatório acima. Registre
   o análogo usado, os viewports e estados observados, a comparação visual e as
   correções feitas durante a inspeção. Testes, lint e relato de subagente não
   substituem essa etapa.
4. No fecho, liste de forma auditável o que foi verificado e o que permaneceu
   pendente. Um item sem verificação obrigatória fica **aberto**, não "concluído".

Esta regra é deliberadamente mais forte que uma preferência de estilo: ela é a
definição de pronto do repositório. **Qualidade acima de velocidade** é uma
decisão do autor e prevalece sobre a pressa de entregar uma feature.

## Estrutura e arquitetura

Este é um monorepo com três workspaces:

- `shared/` (`@contratados-rpg/shared`): DTOs, enums, interfaces, validadores e
  `regras/`, o motor puro de regras consumido pelo frontend e backend.
- `backend/`: API NestJS e gateway Socket.IO. Fluxo:
  `controller (fino) → service (regra de negócio) → repository (SQL puro)`.
- `frontend/`: Angular 21 standalone com Signals e PrimeNG 21. Calculadoras são
  públicas e client-side e usam `shared/regras`.

DTOs e enums nunca são redefinidos em `backend/` ou `frontend/`.

## Regras de idioma e nomenclatura

Use inglês para conceitos genéricos de software (pastas, classes genéricas,
`BaseEntity`, exceções e decorators) e português para conceitos do domínio
(entidades, métodos, variáveis, DTOs, valores de enum, tabelas e colunas).

DTOs seguem `Entidade + Complemento? + Verbo + Dto`:

- entrada: infinitivo (`FichaCriarDto`, `FichaAlterarDto`);
- saída: particípio (`FichaCriadaDto`, `FichaAlteradaDto`);
- listagem: saída resumida (`FichaResumoDto`);
- operação interna: complemento `Interno` antes do verbo;
- consultas calculadas: `Entidade + Recorte + Dto`, sem verbo;
- value objects: somente o nome do conceito + `Dto`.

DTOs de negócio declaram seus campos e nunca herdam de outros DTOs de negócio.
A única herança permitida é de DTOs core genéricos/arquiteturais. Todo DTO vive
em `shared/src/dtos/`; consulte `.agents/skills/dto-conventions/SKILL.md` antes
de criar ou nomear um DTO.

Use `alterar`, nunca `atualizar`; métodos seguem `verbo + entidade`; não abrevie
variáveis; enums são string enums em `shared/src/enums/`, com valores
`SCREAMING_SNAKE_CASE` iguais aos nomes.

## Backend, SQL e dados

- Controllers são finos: sem regra, `if` ou `try/catch`; só podem mesclar ids de
  `@Param`/`@Query` no DTO (`service.alterar({ ...dto, id })`).
- Services concentram validações, permissões, orquestração e emissão de eventos
  após mutações bem-sucedidas.
- Repositories contêm somente SQL e estendem `BaseRepository`; use
  `executarConsulta<T>()`, `executarComando()` e `executarSoftDelete(id)`.
- Todo `SELECT` filtra `is_deleted = false`; nunca faça DELETE físico.
- Use parâmetros nomeados (`:nomeParametro`), nunca `?` ou interpolação.
- INSERTs usam `INSERT ... SELECT :campo ... RETURNING`, nunca `VALUES` nem
  `DEFAULT`.
- Use aliases descritivos; tabelas são singulares em português snake_case.
- Datas genéricas usam `_date`; datas de negócio usam `_data`.
- Enums de coluna são tabelas `tipo_*`; enums de conteúdo dentro de `ficha.dados`
  permanecem enums TypeScript em `shared/`.
- A configuração do backend passa por `ConfigService`; não use `process.env`
  diretamente.

Colunas relacionais de `ficha` tratam identidade, posse e permissão. Conteúdo do
jogo fica no JSONB `dados`, cujo contrato está em `shared/` e `docs/SCHEMA.md`.

Permissões: o dono edita sua ficha; o mestre edita qualquer ficha da campanha;
outros membros só visualizam quando há uma linha em `usuario_ficha_acesso`;
criaturas/NPCs pertencem ao mestre e ficam ocultos até serem compartilhados.
O backend valida fichas usando `shared/regras`, e exclusões são sempre soft
delete.

## Comandos úteis

```bash
npm install
npm run db:up
npm run db:migrate --workspace=backend
npm run backend:dev       # API em http://localhost:3100
npm run frontend:dev      # SPA em http://localhost:4300
npm run test --workspace=shared
npm run test --workspace=backend
```

Para verificação manual da aplicação real, consulte
`.agents/skills/verify/SKILL.md`. Testes e lint não substituem essa verificação
quando a tarefa exige observar a aplicação em execução.

## Segurança operacional

Preserve alterações existentes do usuário. Antes de qualquer comando destrutivo,
confirme o alvo e a necessidade. Não use reset destrutivo nem apague arquivos
fora do escopo. Após alterar código, rode a verificação proporcional ao risco e
relate claramente o que foi validado.

## Coautoria de commits

Todo commit criado por um agente neste repositório deve incluir um trailer
`Co-authored-by:` que identifique o agente responsável, usando a identidade
apropriada à ferramenta (por exemplo, `Codex <noreply@openai.com>` ou a
identidade configurada para Claude). A regra vale em qualquer chat, sessão ou
momento de trabalho; antes de concluir um commit, confira a mensagem efetivamente
gravada com `git log` ou `git show`.
