#!/usr/bin/env pwsh
# ---------------------------------------------------------------------------
# dev.ps1 — sobe o ambiente de desenvolvimento completo:
#   1. Base de dados (Docker Compose) — tentativa graciosa
#   2. Backend (NestJS, watch) + Frontend (Angular, ng serve) em paralelo
#
# A base ainda depende da task m0-02 (docker-compose.yml). Enquanto ela nao
# existir — ou o Docker estiver parado — este script apenas avisa e segue com
# backend + frontend.
#
# Uso (a partir de qualquer pasta):
#   pwsh ./scripts/dev.ps1
#   ./scripts/dev.ps1        (se o pwsh for o shell padrao)
# ---------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'

# Garante que os comandos npm rodem sempre a partir da raiz do repositorio.
$raizRepositorio = Split-Path -Parent $PSScriptRoot
Set-Location $raizRepositorio

Write-Host '==> Subindo a base de dados (docker compose)...' -ForegroundColor Cyan
try {
  npm run db:up
  if ($LASTEXITCODE -ne 0) { throw "db:up retornou codigo $LASTEXITCODE" }
  Write-Host '    Base de dados no ar.' -ForegroundColor Green
} catch {
  Write-Host '    Base indisponivel — docker-compose.yml chega na m0-02 (ou o Docker esta parado).' -ForegroundColor Yellow
  Write-Host '    Seguindo apenas com backend + frontend.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '==> Iniciando backend (3100) + frontend (4300)...' -ForegroundColor Cyan
npm run dev
