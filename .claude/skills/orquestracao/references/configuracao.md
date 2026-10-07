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
| Permissão automática do wrapper | `.claude/settings.json` (`permissions.allow`) |
| Registro das chamadas externas | `.agentes/delegacoes.log` e `.agentes/execucoes/` (ignorados pelo git) |

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

## Desligar temporariamente

- Só nesta máquina: em `.claude/settings.local.json` (ignorado pelo git)
  `{ "env": { "AGENTES_CODEX": "off" } }`. Igualmente `AGENTES_CLAUDE=off`.
- Numa sessão de shell: `export AGENTES_CODEX=off`.
- Com o wrapper devolvendo `3`, o orquestrador segue sem delegar.

## Remover completamente

1. Apague `scripts/agentes/`, `.claude/agents/{implementador,revisor,testador}.md`,
   `.claude/skills/orquestracao/` e `.agents/skills/orquestracao/`.
2. Remova de `.claude/settings.json` as entradas `scripts/agentes/...` (ou o arquivo,
   se só tiver elas).
3. Remova a seção "Orquestração multiagente" de `CLAUDE.md` **e** `AGENTS.md`.
4. Remova `.agentes/` do `.gitignore` e a linha correspondente de
   `docs/context/MEMORY.md`.
