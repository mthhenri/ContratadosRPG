#!/usr/bin/env bash
# Instala o generic_base num projeto novo (esqueleto: copia, renomeia, NÃO preenche).
#
# Uso:  docs/generic_base/instalar-kit.sh <pasta-do-projeto-novo> [--sem-orquestracao] [--sem-ui]
#
# - Não sobrescreve nada: arquivo que já existe no destino é pulado e listado no fim.
# - Deixa os `<...>` para você preencher (ver README.md, etapa 3 em diante).
# - Skills vão para .claude/skills E .agents/skills (cópias idênticas, exigência do CLAUDE.md).
set -euo pipefail

origem="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
destino="${1:-}"; shift || true
orquestracao=1 ui=1
for argumento in "$@"; do
  case "$argumento" in
    --sem-orquestracao) orquestracao=0 ;;
    --sem-ui) ui=0 ;;
    *) echo "argumento desconhecido: $argumento" >&2; exit 2 ;;
  esac
done
[[ -n "$destino" && -d "$destino" ]] || { echo "Uso: $0 <pasta-existente-do-projeto-novo> [--sem-orquestracao] [--sem-ui]" >&2; exit 2; }
destino="$(cd "$destino" && pwd -P)"
[[ "$destino" != "$origem" && "$destino" != "$origem"/* ]] || { echo "destino dentro do próprio kit" >&2; exit 2; }

pulados=()
copiar() { # copiar <arquivo-origem> <caminho-destino-relativo>
  local alvo="$destino/$2"
  if [[ -e "$alvo" ]]; then pulados+=("$2"); return 0; fi
  mkdir -p "$(dirname "$alvo")"
  cp "$origem/$1" "$alvo"
}

# 1. Documentos de raiz (CLAUDE.md e AGENTS.md idênticos) ---------------------------------
copiar CLAUDE.template.md CLAUDE.md
copiar CLAUDE.template.md AGENTS.md
copiar ARCHITECTURE.template.md docs/ARCHITECTURE.md
copiar CONVENTIONS.template.md docs/CONVENTIONS.md

# 2. Contexto persistente e specs ---------------------------------------------------------
for nome in CONTEXT HISTORY PROBLEMS MEMORY IDEAS; do
  copiar "context/$nome.template.md" "docs/context/$nome.md"
done
copiar specs/TEMPLATE.spec.md docs/specs/TEMPLATE.spec.md
copiar specs/README.md docs/specs/README.md
for estado in backlog active done; do
  mkdir -p "$destino/docs/specs/$estado"; [[ -e "$destino/docs/specs/$estado/.gitkeep" ]] || : > "$destino/docs/specs/$estado/.gitkeep"
done

# 3. Skills (duas cópias idênticas) --------------------------------------------------------
skills=(task-flow conventions-check dto-conventions sql-migrations domain-rules-engine realtime-sync verify)
(( orquestracao )) && skills+=(orquestracao)
(( ui )) && skills+=(design-fidelity)
for skill in "${skills[@]}"; do
  while IFS= read -r arquivo; do
    copiar "skills/$skill/$arquivo" ".claude/skills/$skill/$arquivo"
    copiar "skills/$skill/$arquivo" ".agents/skills/$skill/$arquivo"
  done < <(cd "$origem/skills/$skill" && find . -type f | sed 's#^\./##')
done

# 4. Verificação de organização + CI ------------------------------------------------------
copiar scripts/verificar-organizacao.template.mjs scripts/verificar-organizacao.mjs
copiar scripts/verificar-organizacao.test.template.mjs scripts/verificar-organizacao.test.mjs
copiar config/ci.template.yml .github/workflows/ci.yml

# 5. Orquestração multiagente -------------------------------------------------------------
if (( orquestracao )); then
  for arquivo in _comum.sh claude-delegar.sh codex-delegar.sh hook-profundidade.sh; do
    copiar "scripts/agentes/$arquivo" "scripts/agentes/$arquivo"
    chmod +x "$destino/scripts/agentes/$arquivo" 2>/dev/null || true
  done
  copiar scripts/agentes/cabecalho-delegado.template.md scripts/agentes/cabecalho-delegado.md
  for agente in implementador revisor testador; do
    copiar "agents/$agente.template.md" ".claude/agents/$agente.md"
  done
  copiar config/settings.template.json .claude/settings.json
fi

# 6. .gitignore: só acrescenta o que falta -------------------------------------------------
gitignore="$destino/.gitignore"; touch "$gitignore"
while IFS= read -r linha; do
  [[ -z "$linha" || "$linha" == \#* ]] && continue
  grep -qxF "$linha" "$gitignore" || printf '%s\n' "$linha" >> "$gitignore"
done < "$origem/config/gitignore.snippet"

echo "Kit instalado em: $destino"
if (( ${#pulados[@]} )); then
  echo "Já existiam (não sobrescritos):"; printf '  %s\n' "${pulados[@]}"
fi
echo "Próximo passo: README.md do kit, etapa 3 (preencher os <...>)."
