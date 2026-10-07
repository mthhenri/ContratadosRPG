#!/usr/bin/env bash
# Delegação não interativa para o Claude Code (`claude -p`) — direção inversa,
# para quando o Codex é o orquestrador. Dentro de uma sessão do Claude Code,
# prefira a ferramenta Agent (subagentes em .claude/agents/), não este script.
# Quando usar e como escrever a tarefa: skill `orquestracao`.
#
# Uso:
#   scripts/agentes/claude-delegar.sh --modo consulta|implementacao \
#     [--modelo haiku|sonnet|opus|<id>] [--esforco low|medium|high|xhigh|max] \
#     [--agente implementador|revisor|testador] [--orcamento-usd <valor>] \
#     [--dir <pasta>] [--tarefa <arquivo>] [--tempo-limite <minutos>] [--forcar]
#
# Modos e permissões (impostas por --allowedTools/--disallowedTools):
#   consulta       só leitura: Read, Grep, Glob e git diff/log/show/status.
#   implementacao  edita arquivos e roda build/test/lint do npm; commit, push,
#                  reset, checkout, rm e subagentes negados como comandos diretos.
# Limite honesto: ao contrário do Codex, não há sandbox de sistema — código que o
# próprio agente escreva e rode via `npm run test` não é isolado. Revise o diff.
# --setting-sources project,local ignora as regras `allow` do usuário (~/.claude).
#
# Variáveis: AGENTES_CLAUDE=off desliga · AGENTES_CLAUDE_MODELO fixa o modelo ·
# CLAUDE_BIN aponta o executável · AGENTES_MAX_PARALELO limita simultâneas.

source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"

modo="" esforco="" modelo="${AGENTES_CLAUDE_MODELO:-}" agente="" orcamento="2" diretorio="" arquivo_tarefa="" minutos=30 forcar=0
while (( $# )); do
  [[ "$1" == --* && "$1" != --forcar && "$1" != --help ]] && exigir_valor "$1" "$#"
  case "$1" in
    --modo) modo="$2"; shift 2 ;;
    --esforco) esforco="$2"; shift 2 ;;
    --modelo) modelo="$2"; shift 2 ;;
    --agente) agente="$2"; shift 2 ;;
    --orcamento-usd) orcamento="$2"; shift 2 ;;
    --dir) diretorio="$2"; shift 2 ;;
    --tarefa) arquivo_tarefa="$2"; shift 2 ;;
    --tempo-limite) minutos="$2"; shift 2 ;;
    --forcar) forcar=1; shift ;;
    -h|--help) sed -n '2,21p' "$0"; exit 0 ;;
    *) falhar 2 "argumento desconhecido: $1" ;;
  esac
done

leitura=(Read Grep Glob "Bash(git diff:*)" "Bash(git log:*)" "Bash(git show:*)" "Bash(git status:*)")
proibidas=(Agent Task "Bash(git push:*)" "Bash(git commit:*)" "Bash(git reset:*)" "Bash(git checkout:*)"
  "Bash(git clean:*)" "Bash(git rebase:*)" "Bash(rm:*)" "Bash(scripts/agentes/*)"
  "Bash(git * --output*)")
case "$modo" in
  consulta)
    modelo="${modelo:-opus}"; esforco="${esforco:-high}"
    permitidas=("${leitura[@]}"); proibidas+=(Edit Write NotebookEdit); permissao="default" ;;
  implementacao)
    modelo="${modelo:-sonnet}"; esforco="${esforco:-medium}"
    permitidas=("${leitura[@]}" Edit Write "Bash(npm run build:*)" "Bash(npm run test:*)" "Bash(npm run lint:*)" "Bash(npx tsc:*)")
    permissao="acceptEdits" ;;
  *) falhar 2 "--modo deve ser consulta ou implementacao" ;;
esac
case "$esforco" in low|medium|high|xhigh|max) ;; *) falhar 2 "--esforco inválido: $esforco" ;; esac

validar_minutos "$minutos"
verificar_ligado claude
verificar_profundidade
diretorio="$(resolver_diretorio "$diretorio")"

claude_bin="${CLAUDE_BIN:-$(command -v claude || true)}"
[[ -x "$claude_bin" ]] || falhar 127 "claude não encontrado no PATH (ou defina CLAUDE_BIN). Execute a tarefa sem o Claude."

if [[ -n "$arquivo_tarefa" ]]; then
  tarefa="$(cat "$arquivo_tarefa")"
else
  tarefa="$(cat)"
fi
[[ -n "${tarefa//[[:space:]]/}" ]] || falhar 2 "tarefa vazia (passe por stdin ou --tarefa)"

hash="$(printf 'claude\n%s\n%s\n%s' "$modo" "$agente" "$tarefa" | hash_tarefa)"
verificar_duplicada "$hash" "$forcar"
ocupar_vaga claude
pasta="$(preparar_execucao claude "$modo")"
{ cat "$AGENTES_CABECALHO"; printf '\nModo: %s\n\n%s\n' "$modo" "$tarefa"; } > "$pasta/tarefa.md"

argumentos=(-p
  --model "$modelo"
  --effort "$esforco"
  --permission-mode "$permissao"
  --no-session-persistence
  --setting-sources project,local
  --output-format text
  --max-budget-usd "$orcamento"
  --allowedTools "${permitidas[@]}"
  --disallowedTools "${proibidas[@]}"
)
[[ -n "$agente" ]] && argumentos+=(--agent "$agente")
printf '%q ' "$claude_bin" "${argumentos[@]}" > "$pasta/comando.txt"

estado_git > "$pasta/git-antes.txt"
inicio=$SECONDS
status=0
definir_tempo_limite "$minutos"
(cd "$diretorio" && AGENTES_PROFUNDIDADE=1 exec "${TEMPO_LIMITE[@]}" "$claude_bin" "${argumentos[@]}" \
  < "$pasta/tarefa.md" > "$pasta/resposta.md" 2> "$pasta/stderr.log") &
AGENTES_FILHO=$!
wait "$AGENTES_FILHO" || status=$?
AGENTES_FILHO=""
duracao=$(( SECONDS - inicio ))
(( status == 0 )) && [[ ! -s "$pasta/resposta.md" ]] && status=1
registrar claude "$modo" "$modelo${agente:+/$agente}" "$esforco" "$duracao" "$status" "$hash" "$pasta"

relativa="${pasta#"$AGENTES_RAIZ"/}"
estado_git > "$pasta/git-depois.txt"
if (( status == 0 )); then
  cat "$pasta/resposta.md"
  echo
  relatar_alteracoes "$pasta/git-antes.txt" "$pasta/git-depois.txt"
  echo "[delegacao] claude $modo · modelo=$modelo${agente:+ · agente=$agente} · esforço=$esforco · ${duracao}s · $relativa"
else
  echo "[delegacao] claude $modo falhou (status $status, ${duracao}s). Últimas linhas de $relativa/stderr.log:" >&2
  tail -n 15 "$pasta/stderr.log" >&2
  exit "$status"
fi
