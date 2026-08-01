# AGENTS.md

Este arquivo é a orientação canônica para agentes de código que trabalham no
repositório ContratadosRPG. As instruções valem para o Codex e para qualquer
outro agente compatível com `AGENTS.md`.

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
