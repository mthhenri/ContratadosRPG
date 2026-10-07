#!/usr/bin/env bash
# Delegação não interativa para o OpenAI Codex CLI (`codex exec`).
# Quando usar e como escrever a tarefa: skill `orquestracao`.
#
# Uso:
#   scripts/agentes/codex-delegar.sh --modo consulta|implementacao \
#     [--esforco low|medium|high|xhigh|max] [--modelo <id>] [--dir <pasta>] \
#     [--tarefa <arquivo>] [--tempo-limite <minutos>] [--forcar]  < tarefa.md
#
# Modos e permissões (o sandbox do próprio Codex impõe):
#   consulta       sandbox read-only — investigação, segunda opinião, revisão.
#   implementacao  sandbox workspace-write — escreve só dentro do repositório
#                  (nem /tmp); .git protegido (sem commit/push) e sem rede.
# Nunca usa danger-full-access nem --dangerously-bypass-approvals-and-sandbox.
#
# Variáveis: AGENTES_CODEX=off desliga · AGENTES_CODEX_MODELO fixa o modelo ·
# CODEX_BIN aponta o executável · AGENTES_MAX_PARALELO limita simultâneas.

source "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"

modo="" esforco="" modelo="${AGENTES_CODEX_MODELO:-}" diretorio="" arquivo_tarefa="" minutos=30 forcar=0
while (( $# )); do
  [[ "$1" == --* && "$1" != --forcar && "$1" != --help ]] && exigir_valor "$1" "$#"
  case "$1" in
    --modo) modo="$2"; shift 2 ;;
    --esforco) esforco="$2"; shift 2 ;;
    --modelo) modelo="$2"; shift 2 ;;
    --dir) diretorio="$2"; shift 2 ;;
    --tarefa) arquivo_tarefa="$2"; shift 2 ;;
    --tempo-limite) minutos="$2"; shift 2 ;;
    --forcar) forcar=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) falhar 2 "argumento desconhecido: $1" ;;
  esac
done

case "$modo" in
  consulta) sandbox="read-only"; esforco="${esforco:-high}" ;;
  implementacao) sandbox="workspace-write"; esforco="${esforco:-medium}" ;;
  *) falhar 2 "--modo deve ser consulta ou implementacao" ;;
esac
case "$esforco" in low|medium|high|xhigh|max) ;; *) falhar 2 "--esforco inválido: $esforco" ;; esac

validar_minutos "$minutos"
verificar_ligado codex
verificar_profundidade
diretorio="$(resolver_diretorio "$diretorio")"

codex_bin="${CODEX_BIN:-$(command -v codex || true)}"
[[ -x "$codex_bin" ]] || falhar 127 "codex não encontrado no PATH (instale com 'npm i -g @openai/codex' ou defina CODEX_BIN). Execute a tarefa sem o Codex."
if [[ -z "${CODEX_API_KEY:-}${OPENAI_API_KEY:-}" ]] && ! "$codex_bin" login status >/dev/null 2>&1; then
  falhar 7 "codex não autenticado (rode 'codex login' ou defina CODEX_API_KEY). Execute a tarefa sem o Codex."
fi

if [[ -n "$arquivo_tarefa" ]]; then
  tarefa="$(cat "$arquivo_tarefa")"
else
  tarefa="$(cat)"
fi
[[ -n "${tarefa//[[:space:]]/}" ]] || falhar 2 "tarefa vazia (passe por stdin ou --tarefa)"

hash="$(printf 'codex\n%s\n%s' "$modo" "$tarefa" | hash_tarefa)"
verificar_duplicada "$hash" "$forcar"
ocupar_vaga codex
pasta="$(preparar_execucao codex "$modo")"
{ cat "$AGENTES_CABECALHO"; printf '\nModo: %s\n\n%s\n' "$modo" "$tarefa"; } > "$pasta/tarefa.md"

argumentos=(exec
  --sandbox "$sandbox"
  --cd "$diretorio"
  --ephemeral
  --color never
  --json
  --output-last-message "$pasta/resposta.md"
  -c "approval_policy=\"never\""
  -c "model_reasoning_effort=\"$esforco\""
  -c "sandbox_workspace_write.network_access=false"
  -c "sandbox_workspace_write.exclude_slash_tmp=true"
  -c "sandbox_workspace_write.exclude_tmpdir_env_var=true"
  -c "shell_environment_policy.inherit=\"core\""
  -c "shell_environment_policy.set={AGENTES_PROFUNDIDADE=\"1\"}"
)
[[ -n "$modelo" ]] && argumentos+=(--model "$modelo")
printf '%q ' "$codex_bin" "${argumentos[@]}" - > "$pasta/comando.txt"

estado_git > "$pasta/git-antes.txt"
inicio=$SECONDS
status=0
definir_tempo_limite "$minutos"
AGENTES_PROFUNDIDADE=1 "${TEMPO_LIMITE[@]}" "$codex_bin" "${argumentos[@]}" - \
  < "$pasta/tarefa.md" > "$pasta/eventos.jsonl" 2> "$pasta/stderr.log" &
processo=$!
AGENTES_FILHO=$processo
# Sem rede, o Codex reconecta indefinidamente; encerra na 3ª espera de rede (< 1 min).
sem_rede=0
while kill -0 "$processo" 2>/dev/null; do
  sleep 5
  if (( $(grep -c 'waiting for network' "$pasta/eventos.jsonl" 2>/dev/null || true) >= 3 )); then
    sem_rede=1; kill "$processo" 2>/dev/null || true
  fi
done
wait "$processo" || status=$?
AGENTES_FILHO=""
(( sem_rede )) && { status=8; echo "[delegacao] sem rede até a OpenAI; execução encerrada." >> "$pasta/stderr.log"; }
duracao=$(( SECONDS - inicio ))
(( status == 0 )) && [[ ! -s "$pasta/resposta.md" ]] && status=1
registrar codex "$modo" "${modelo:-padrao}" "$esforco" "$duracao" "$status" "$hash" "$pasta"

relativa="${pasta#"$AGENTES_RAIZ"/}"
estado_git > "$pasta/git-depois.txt"
if (( status == 0 )); then
  cat "$pasta/resposta.md"
  echo
  relatar_alteracoes "$pasta/git-antes.txt" "$pasta/git-depois.txt"
  echo "[delegacao] codex $modo · modelo=${modelo:-padrao} · esforço=$esforco · ${duracao}s · $relativa"
else
  echo "[delegacao] codex $modo falhou (status $status, ${duracao}s). Últimas linhas de $relativa/stderr.log:" >&2
  tail -n 15 "$pasta/stderr.log" >&2
  exit "$status"
fi
