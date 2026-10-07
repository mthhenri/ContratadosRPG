#!/usr/bin/env bash
# Hook PreToolUse (Bash) do Claude Code: subagente não chama agente externo.
# O Claude Code inclui "agent_id" na entrada do hook só quando a chamada vem de
# um subagente; nesse caso, bloqueia os wrappers de scripts/agentes/ (exit 2).
entrada="$(cat)"
if grep -qE '"agent_id"[[:space:]]*:[[:space:]]*"[^"]+"' <<< "$entrada" &&
   grep -qE '(codex|claude)-delegar' <<< "$entrada"; then
  echo "Bloqueado: subagente não delega (profundidade 1). Resolva com suas ferramentas e devolva o resultado ao orquestrador." >&2
  exit 2
fi
exit 0
