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

## Operação e resultado em produção

Commit de versão: `97776c07fe29dd5123cb54d08884aa592823d853`, enviado a master.
Workflow [40211763891](https://github.com/mthhenri/ContratadosRPG/actions/runs/40211763891)
aprovado: notas publicadas e tag anotada v1.12.0 apontando exatamente para esse commit.
Cloudflare Pages: implantação `14d9e67d-426b-4ccb-8745-bd46687561a8` aprovada.
Cloud Build: `098991f1-28fc-46cd-bb20-f1bae53917b9` em southamerica-east1 aprovado,
incluindo imagens, etapas de banco, envio da imagem e deploy. Revisão Cloud Run
`contratados-rpg-api-00098-7mf` pronta, com 100% do tráfego.

Verificação pública real após deploy:

- `/health`: sucesso, status ok, versão 1.12.0.
- `/patchnote/1.12.0`: nota disponível com o bloco de exportação dos livros.
- `/livros/pacotes/publicados` sem sessão: HTTP 401, preservando a exigência de autenticação.
- [Página publicada](https://contratados-rpg.pages.dev/patchnotes/1.12.0) carregou a nota e
  a versão em 1920×1080 e 360×800. Capturas inspecionadas pessoalmente: texto legível,
  hierarquia e controles existentes preservados, sumário e lista de versões adaptados ao mobile,
  sem overflow horizontal. O análogo é a página existente das notas 1.11.0; nenhum estilo foi alterado.

Antes de o deploy terminar, a API ainda respondia 1.11.0; isso foi tratado como implantação em
andamento. A verificação só foi considerada aprovada após os três pipelines concluírem e a
API responder 1.12.0. Não houve reset ou seed de produção, edição de livros ou exportação de
conteúdo administrativo durante o smoke test. O teste de exportação em produção confirma a
rota e sua proteção anônima; o download autenticado e o importador já possuem verificação
integrada própria, e não foram repetidos contra conteúdo protegido de produção.

Evidências locais: `.artifacts/publicar-v1-12-0/`, incluindo builds, testes e capturas dos
viewports públicos, com `producao.json` para os resultados HTTP. Critérios de aceite atendidos.
