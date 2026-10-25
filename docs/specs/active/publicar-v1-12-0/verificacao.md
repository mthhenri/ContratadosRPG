# Publicação v1.12.0 — verificação

## Autorização e escopo

Autor aprovou a proposta de v1.12.0, acrescentou a exportação dos livros e pediu envio a produção.
A nota descreve as seis entregas posteriores à tag v1.11.0. Reset e NPCs de seed são locais;
nenhum comando de reset ou seed será executado em produção. Não há migration ou alteração
no cloudbuild.yaml/Dockerfile neste intervalo.

## Pré-publicação

- Remote conferido por fetch: master local seis commits à frente, zero divergência.
- Nota validada por `npm run patchnotes:publicar -- --dry-run docs/patchnotes/1.12.0.md`.
- `npm run versao:sincronizar`: raiz, três workspaces, lock e constante em 1.12.0.
- Build shared e 1340 testes shared aprovados; builds backend e frontend aprovados.
- Frontend conserva aviso de bundle inicial 603,33 kB para orçamento de 450 kB.
- `npm run repo:verificar` e `git diff --check` aprovados.
- Simulação de `scripts/ci/publicar-versao.mjs --dry-run` prevê publicação e tag v1.12.0.
- Gates de código anteriores preservados no relatório de seed-dev-npcs-e-completude: backend/shared/lint
  aprovados; frontend teve um timeout na rodada ampla, com 18/18 no arquivo isolado.

## Destinos conferidos

- GitHub: mthhenri/ContratadosRPG, master.
- API: https://contratados-rpg-api-35du2tp43q-rj.a.run.app
- Frontend: https://contratados-rpg.pages.dev
- Cloud Build regional southamerica-east1, trigger Update-Repository para master.
- Revisão anterior: contratados-rpg-api-00097-fwl com 100% do tráfego.

## Operação

Publicação ainda pendente no momento do commit de preparação; o agente seguirá até conferir
workflow, tag, builds, versão da API e apresentação da nota no frontend. Evidências brutas em
`.artifacts/publicar-v1-12-0/`. Esta spec permanece ativa até o resultado real ser conhecido.
