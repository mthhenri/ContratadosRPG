# Configuração da orquestração — modelos, liga/desliga, remoção

## Peças

| Peça | Onde |
|---|---|
| Regra sempre ativa | `CLAUDE.md` = `AGENTS.md`, seção "Orquestração multiagente" |
| Política detalhada | esta skill (`.claude/skills/orquestracao/` = `.agents/skills/orquestracao/`) |
| Subagentes Claude | `.claude/agents/implementador.md`, `revisor.md`, `testador.md` (+ `Explore` embutido) |
| Wrapper Claude → Codex | `scripts/agentes/codex-delegar.sh` |
| Wrapper Codex → Claude | `scripts/agentes/claude-delegar.sh` |
| Guardas comuns e cabeçalho | `scripts/agentes/_comum.sh`, `scripts/agentes/cabecalho-delegado.md` |
| Permissão automática do wrapper e hook de profundidade | `.claude/settings.json` (`permissions.allow`, `hooks.PreToolUse` → `scripts/agentes/hook-profundidade.sh`) |
| Registro das chamadas externas | `.agentes/delegacoes.log` e `.agentes/execucoes/` (ignorados pelo git) |
| Mod de painel (opcional) | `.claude/mods/painel-orquestracao/` — status de contexto/custo, delegações em andamento, `/painel` e aviso de cópias divergentes (`CLAUDE.md`≠`AGENTS.md`, `.claude/skills`≠`.agents/skills`) |

O mod não carrega sozinho: inicie o Claude Code com
`claude --plugin-dir .claude/mods/painel-orquestracao`. Exige Claude Code ≥ 2.1.289 (mods
são recurso novo; o `claude` do PATH pode ser mais antigo — na extensão do VS Code o binário
fica em `~/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/`). Validar:
`claude plugin validate .claude/mods/painel-orquestracao`.

## Modelos

Subagentes Claude usam **aliases** (`haiku`, `sonnet`, `opus`), que acompanham a
versão mais recente disponível na instalação, no campo `model:` do frontmatter de
`.claude/agents/*.md`; o esforço fica em `effort:` (`low`…`max`). Para trocar,
edite esses campos. `inherit` usa o modelo da sessão. Para forçar um modelo em
todos os subagentes, há a variável `CLAUDE_CODE_SUBAGENT_MODEL` do Claude Code.

| Papel | Claude | Codex |
|---|---|---|
| Rápido/barato (busca, rodar testes) | `Explore`, `testador` (`haiku`, low) | — |
| Equilibrado (implementação) | `implementador` (`sonnet`, medium) | `implementacao`, esforço `medium` |
| Forte (arquitetura, bug difícil) | orquestrador (modelo da sessão) | `consulta`, esforço `xhigh` |
| Forte independente (revisão) | `revisor` (`opus`, high) | `consulta`, esforço `high` |

Codex: o wrapper **não fixa modelo** — usa o padrão do Codex instalado e da conta
(`~/.codex/config.toml` → `model`). Para fixar só na delegação:
`AGENTES_CODEX_MODELO=<id>` (ou `--modelo <id>`). Para ver o catálogo da versão
instalada: `codex debug models`. Esforços aceitos pelo wrapper:
`low|medium|high|xhigh|max` (o modelo escolhido precisa suportar o nível).

Codex → Claude: `claude-delegar.sh` usa `opus` em consulta e `sonnet` em
implementação; troque com `--modelo` ou `AGENTES_CLAUDE_MODELO`.

## Pré-requisitos do Codex

- `codex` no PATH (`npm i -g @openai/codex`) ou `CODEX_BIN=/caminho/codex`.
- Autenticado (`codex login`, ou `CODEX_API_KEY`/`OPENAI_API_KEY` no ambiente).
- Rede até a OpenAI. No ambiente cloud do Claude Code, `api.openai.com` precisa
  estar em *Allowed domains* da política de rede do ambiente, e a chave entra como
  variável de ambiente do ambiente — nunca no chat nem no repositório.

## Permissões efetivas

| Destino/modo | Barreira | Pode | Não pode |
|---|---|---|---|
| Codex `consulta` | sandbox `read-only` do Codex | ler o repositório | escrever, rede |
| Codex `implementacao` | sandbox `workspace-write` | escrever no repositório | escrever em `.git`, `/tmp` ou fora do repo; rede |
| Claude `consulta` | `--allowedTools`/`--disallowedTools` | Read/Grep/Glob, git diff/log/show/status | Edit/Write, outros Bash, `git … --output` |
| Claude `implementacao` | idem (sem sandbox de sistema) | editar, `npm run build/test/lint`, `npx tsc` | commit/push/reset/checkout/clean/rebase/rm como comando direto |

Ambos: variáveis de ambiente reduzidas no Codex (`shell_environment_policy.inherit=core`),
regras `allow` do usuário ignoradas no Claude (`--setting-sources project,local`).
Risco residual conhecido: no modo consulta o agente consegue **ler** `.env` local;
o cabeçalho proíbe, mas não há barreira técnica.

O `.claude/settings.json` do projeto só vale depois que o workspace for marcado
como confiável no Claude Code (diálogo de confiança na primeira execução interativa).

## Desligar temporariamente

- Só nesta máquina: em `.claude/settings.local.json` (ignorado pelo git)
  `{ "env": { "AGENTES_CODEX": "off" } }`. Igualmente `AGENTES_CLAUDE=off`.
- Numa sessão de shell: `export AGENTES_CODEX=off`.
- Com o wrapper devolvendo `3`, o orquestrador segue sem delegar.

## Remover completamente

1. Apague `scripts/agentes/`, `.claude/agents/{implementador,revisor,testador}.md`,
   `.claude/skills/orquestracao/` e `.agents/skills/orquestracao/`.
2. Remova de `.claude/settings.json` as entradas `scripts/agentes/...` e o hook
   `PreToolUse` correspondente (ou o arquivo, se só tiver eles).
3. Remova a seção "Orquestração multiagente" de `CLAUDE.md` **e** `AGENTS.md`.
4. Remova `.agentes/` do `.gitignore` e a linha correspondente de
   `docs/context/MEMORY.md`.
5. Se usar o mod de painel, apague `.claude/mods/painel-orquestracao/` (ele funciona
   sozinho, sem os wrappers, mas sem eles só mostra contexto/custo e as cópias).
