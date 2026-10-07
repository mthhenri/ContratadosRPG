#!/usr/bin/env bash
# Funções comuns aos wrappers de delegação entre agentes (codex-delegar.sh,
# claude-delegar.sh). Política e quando delegar: skill `orquestracao`.
#
# Códigos de saída compartilhados:
#   0 ok · 2 uso inválido · 3 integração desligada · 4 profundidade excedida
#   5 consulta duplicada · 6 limite de concorrência · 124 tempo esgotado
#   7 CLI não autenticada · 8 sem rede até o provedor · 127 CLI ausente
#   outros: código devolvido pela própria CLI delegada

set -euo pipefail

AGENTES_RAIZ="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
AGENTES_ESTADO="$AGENTES_RAIZ/.agentes"
AGENTES_LOG="$AGENTES_ESTADO/delegacoes.log"
AGENTES_CABECALHO="$AGENTES_RAIZ/scripts/agentes/cabecalho-delegado.md"

falhar() {
  local codigo="$1"; shift
  echo "[delegacao] $*" >&2
  exit "$codigo"
}

# Um agente chamado por delegação não delega de novo (corta Claude→Codex→Claude…).
verificar_profundidade() {
  local profundidade="${AGENTES_PROFUNDIDADE:-0}"
  local maximo="${AGENTES_PROFUNDIDADE_MAX:-1}"
  if (( profundidade >= maximo )); then
    falhar 4 "recusado: este agente já foi chamado por delegação (profundidade $profundidade, máximo $maximo). Resolva localmente e devolva o resultado ao orquestrador."
  fi
}

# Desligamento temporário: AGENTES_<DESTINO>=off (ex.: AGENTES_CODEX=off).
verificar_ligado() {
  local destino="$1"
  local variavel
  variavel="AGENTES_$(printf '%s' "$destino" | tr '[:lower:]' '[:upper:]')"
  case "${!variavel:-on}" in
    off|0|false|desligado) falhar 3 "integração com $destino desligada ($variavel=${!variavel}). Execute a tarefa sem delegar." ;;
  esac
}

# Diretório de trabalho precisa estar dentro do repositório.
resolver_diretorio() {
  local diretorio
  diretorio="$(cd "${1:-$AGENTES_RAIZ}" 2>/dev/null && pwd -P)" || falhar 2 "diretório inexistente: $1"
  case "$diretorio/" in
    "$(cd "$AGENTES_RAIZ" && pwd -P)/"*) echo "$diretorio" ;;
    *) falhar 2 "diretório fora do projeto recusado: $diretorio" ;;
  esac
}

# Recusa repetir a mesma consulta (mesmo destino, modo e texto) que já terminou
# com sucesso nas últimas 24 h, a menos que --forcar seja usado.
verificar_duplicada() {
  local hash="$1" forcar="$2"
  [[ "$forcar" == "1" || ! -f "$AGENTES_LOG" ]] && return 0
  local limite anterior
  limite="$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-24H +%Y-%m-%dT%H:%M:%SZ)"
  anterior="$(awk -F'\t' -v h="$hash" -v l="$limite" '$1 >= l && $8 == h && $7 == "0" { print $9 }' "$AGENTES_LOG" | tail -1)"
  if [[ -n "$anterior" ]]; then
    falhar 5 "consulta idêntica já respondida: $anterior/resposta.md. Reaproveite-a ou acrescente informação nova (ou use --forcar)."
  fi
}

# Vagas simultâneas por destino (AGENTES_MAX_PARALELO, padrão 2).
AGENTES_VAGA=""
ocupar_vaga() {
  local destino="$1" maximo="${AGENTES_MAX_PARALELO:-2}" indice
  mkdir -p "$AGENTES_ESTADO/vagas"
  for (( indice = 1; indice <= maximo; indice++ )); do
    local vaga="$AGENTES_ESTADO/vagas/$destino.$indice"
    # vaga órfã (processo morto) é liberada
    if [[ -d "$vaga" ]] && ! kill -0 "$(cat "$vaga/pid" 2>/dev/null || echo 0)" 2>/dev/null; then
      rm -rf "$vaga"
    fi
    if mkdir "$vaga" 2>/dev/null; then
      echo "$$" > "$vaga/pid"
      AGENTES_VAGA="$vaga"
      trap 'rm -rf "$AGENTES_VAGA"' EXIT
      return 0
    fi
  done
  falhar 6 "limite de $maximo delegações simultâneas para $destino atingido. Aguarde uma terminar ou execute localmente."
}

preparar_execucao() {
  local destino="$1" modo="$2"
  local pasta="$AGENTES_ESTADO/execucoes/$(date -u +%Y%m%dT%H%M%SZ)-$destino-$modo-$$"
  mkdir -p "$pasta"
  echo "$pasta"
}

# Linha TSV: data destino modo modelo esforço duração(s) status hash pasta
registrar() {
  mkdir -p "$AGENTES_ESTADO"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$@" >> "$AGENTES_LOG"
}

hash_tarefa() {
  if command -v sha256sum >/dev/null; then sha256sum; else shasum -a 256; fi | cut -c1-16
}

# `timeout` do GNU coreutils (gtimeout no macOS com Homebrew); sem ele, roda sem limite.
com_tempo_limite() {
  local minutos="$1"; shift
  if command -v timeout >/dev/null; then timeout "${minutos}m" "$@"
  elif command -v gtimeout >/dev/null; then gtimeout "${minutos}m" "$@"
  else "$@"
  fi
}

# Retrato (hash do conteúdo + caminho) dos arquivos fora do HEAD — para relatar o
# que o agente delegado mudou, inclusive em arquivos que já estavam modificados.
estado_git() {
  local arquivo
  (cd "$AGENTES_RAIZ" && git ls-files -z --modified --deleted --others --exclude-standard |
    while IFS= read -r -d '' arquivo; do
      if [[ -f "$arquivo" ]]; then
        printf '%s %s\n' "$(git hash-object -- "$arquivo")" "$arquivo"
      else
        printf 'removido %s\n' "$arquivo"
      fi
    done | sort -u)
}

# Relata o que mudou entre dois estados e destaca configuração de agentes.
relatar_alteracoes() {
  local antes="$1" depois="$2" alterados
  alterados="$(comm -3 "$antes" "$depois" | sed 's/^[[:space:]]*//' | cut -d' ' -f2- | sort -u)"
  [[ -z "$alterados" ]] && { echo "[delegacao] nenhum arquivo alterado."; return 0; }
  echo "[delegacao] arquivos alterados pelo agente delegado:"
  sed 's/^/  /' <<< "$alterados"
  if grep -qE '^(CLAUDE\.md|AGENTS\.md|\.claude/|\.agents/|\.codex/|scripts/agentes/|\.github/)' <<< "$alterados"; then
    echo "[delegacao] ATENÇÃO: o agente delegado alterou configuração de agentes/CI — revise antes de aceitar."
  fi
}
