---
name: publicar-versao
description: >
  Fecha e publica uma versão do sistema: decidir o número (v1.5.0), escrever os patchnotes / notas
  de versão / changelog em linguagem de jogador, atualizar a versão nos pacotes e deixar o merge em
  master criar a tag e publicar a nota no R2. Use ao pedir "publicar versão", "lançar versão",
  "fechar release", "subir versão", "escrever patchnotes", "atualizar a nota da versão", "bumpar a
  versão", "corrigir uma nota já publicada" ou "a versão da topbar está errada" — mesmo sem a
  palavra "versão" se o pedido for contar aos usuários o que mudou. O que sai do repositório
  (tag, R2) é feito pelo workflow após o merge: o agente só prepara e confirma com o autor.
---

# Publicar versão — número, nota, merge

> A decisão de produto vive em `docs/specs/done/patchnotes-versao-sistema.spec.md` (ou em `active/` se
> ainda aberta) — em conflito, a spec vence e esta skill é corrigida. Aqui: **ordem de execução**,
> **checklist** e **armadilhas**.

## Onde cada coisa vive

- **Versão (fonte única):** `version` do `package.json` da raiz. `npm run versao:sincronizar` alinha
  `shared`/`backend`/`frontend`, o lock e gera `shared/src/versao.ts` (`VERSAO_SISTEMA`, na topbar e em
  `GET /health`). Um teste de `shared` falha se divergir.
- **Nota:** `docs/patchnotes/<versao>.md`, **versionada no git**; o R2 é a cópia servida ao público
  (`patchnotes/<versao>.md` + `indice.json`). Formato: `references/linguagem-de-jogador.md`.
- **Automação:** `.github/workflows/versao.yml` (+ `scripts/ci/publicar-versao.mjs`), a cada push em
  `master`: publica as notas no R2 se alguma nota ou a versão mudou e cria a tag `vX.Y.Z` que falta —
  a vigente no commit do push, as retroativas no `commit:` do front matter. Publica **antes** de taguear.
- **Manual (reserva):** `npm run patchnotes:publicar -- [--dry-run] <arquivo.md>` com `ARMAZENAMENTO_R2_*`.

## Ordem de execução

1. **Situar.** Árvore limpa, branch certa. Última versão: `git describe --tags --abbrev=0 --match 'v*'`
   (sem tag local: última nota em `docs/patchnotes/`).
2. **O que mudou.** `git log <última-tag>..HEAD --no-merges --format='%ad %s' --date=short` e, para o porquê,
   `docs/context/HISTORY.md` (por data ou código da task — não leia o arquivo inteiro).
3. **Não acumule um mês numa versão só.** Publique a cada bloco coerente de entregas (na prática, semanal
   ou por marco). Intervalo grande: proponha **várias** versões retroativas por fronteira de commits, cada
   nota com `commit:` do último commit da fronteira.
4. **Propor o número e pedir confirmação.** Funcionalidade nova visível → *minor*; só correção → *patch*;
   quebra de uso existente → *major*. **Nunca suba o major sem o autor pedir.**
5. **Redigir a nota** em `docs/patchnotes/<versao>.md` (grupos Para os players / Para o mestre / Resumo,
   blocos por funcionalidade). Data = hoje. Datar cada item pelo commit para cair na versão certa.
6. **Mostrar ao autor o texto e esperar aprovação.** Ele revisa a nota, não o commit.
7. **Versão nos pacotes.** Edite `version` na raiz → `npm run versao:sincronizar` → confira `git diff --stat`
   (4 `package.json`, lock, `shared/src/versao.ts`) → `npm run build --workspace=shared` e
   `npm run test --workspace=shared`.
8. **Validar a nota.** `npm run patchnotes:publicar -- --dry-run docs/patchnotes/<versao>.md` (front matter,
   data, limites) e `node scripts/ci/publicar-versao.mjs --dry-run` com `GITHUB_SHA=$(git rev-parse HEAD)`
   — mostra se publicaria e quais tags criaria.
9. **Commit** `chore(versao): vX.Y.Z` (nota + versão) com o trailer de coautoria (`CLAUDE.md`). **Sem tag
   local**: a tag nasce no workflow, no commit que chegar ao `master`.
10. **PR para `master`** (só quando o autor pedir). No merge, o workflow roda: conferir a execução em Actions,
    `GET <api>/patchnote/<versao>` e a página `/patchnotes/<versao>`.
11. **Registrar.** Bloco novo no topo de `docs/context/HISTORY.md` (versão, resumo, o que foi conferido).

## Checklist da nota (antes de mostrar ao autor)

- [ ] Nenhum nome de arquivo, rota, tabela, migration, sigla (`P-0NN`, `I-0NN`, `m9-13`) nem termo técnico.
- [ ] Cada item diz o que o jogador/mestre **passa a poder fazer** ou **deixa de sofrer**.
- [ ] Explica em vez de só listar; vários commits do mesmo recurso viram **um** bloco; grupo vazio não entra.
- [ ] Tem o parágrafo de abertura com o `**Período:**` e o `# RESUMO…` final.
- [ ] Título ≤ 120 caracteres, descritivo; `versao` = a da raiz; `data` real; `commit:` só em nota retroativa.

## Armadilhas de campo

- **Sem nota, sem versão.** Se o `package.json` sobe e falta `docs/patchnotes/<versao>.md`, o workflow falha
  (`::error::`) antes de publicar ou taguear.
- **Cache de 24 h no backend, por instância do Cloud Run.** Nota corrigida sem novo deploy só aparece quando o
  cache de cada instância vence; nota nova cai junto do deploy, mas **se a revisão do Cloud Run receber tráfego
  antes do workflow publicar**, o índice antigo fica em cache por 24 h — force uma revisão nova (rode o trigger
  do Cloud Build de novo). Localmente, reinicie a API.
- **Corrigir uma nota publicada:** edite o `.md`, PR, merge — o workflow republica (substitui a versão).
- **Segredos e permissão:** sem os cinco `ARMAZENAMENTO_R2_*` em Actions (valores no Secret Manager do GCP e nas
  substituições do trigger do Cloud Build) (ou com "Read and write" desligado)
  o workflow falha; credencial nunca em arquivo versionado, log ou commit.
- **Tag retroativa** exige `commit:` na nota e o commit precisa existir no repositório; a tag já criada não é
  movida pelo workflow (apagar/recriar é ação do autor).
- **Versão divergente:** rode `npm run versao:sincronizar`, nunca edite `versao.ts`.
- **Caminhos** de `patchnotes:publicar` valem a partir de onde você digitou (usa `INIT_CWD`).
