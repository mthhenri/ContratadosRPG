# pn-01-versao-fonte-unica.spec.md

> Task 1/5 do guarda-chuva `patchnotes-versao-sistema.spec.md` (entregáveis `pn-01`).

## Objetivo

Fazer o `version` da raiz a fonte única da versão do sistema, expô-la no `/health` e mostrá-la na
topbar (proposta B aprovada no POC), com o item "Novidades" no menu do perfil no mobile.

## Entregáveis

1. `scripts/sincronizar-versao.mjs` + `npm run versao:sincronizar`: lê o `version` da raiz, grava o mesmo valor em `shared`, `backend` e `frontend` e gera `shared/src/versao.ts` (`VERSAO_SISTEMA`), exportada pelo barrel de `shared`. `package-lock.json` acompanha.
2. Teste em `shared` que falha se `VERSAO_SISTEMA` ou qualquer `package.json` divergir da raiz.
3. `GET /health` devolve `{ status, versao }`.
4. `VersaoService` (frontend, `core/services/`): versão atual, `versaoNova` (compara com a última vista em `localStorage`, tolerante a falha do storage) e `marcarVista()`.
5. Chip de versão na topbar ao lado da marca (com ponto de versão nova) e item "Novidades vX" no menu do perfil no mobile (≤560px); ambos linkam `/patchnotes`. Análogo aprovado: o item de tema já movido para o menu do perfil no mobile.
6. Versão da raiz em `1.1.0`; tags `v1.0.0` (`306a9714`) e `v1.1.0` (criadas no fecho de `pn-05`).

## Critérios de Aceite

1. `npm run versao:sincronizar` deixa `git diff` vazio quando nada mudou; alterar a versão da raiz e rodar de novo atualiza os quatro pontos.
2. Teste de `shared` verde e falhando ao divergir (provado alterando um `package.json`).
3. Teste do `HealthController` cobre `versao`.
4. Testes do `VersaoService` (novo/visto/storage indisponível) e do layout (chip, menu).
5. Gate visual (`design-fidelity` + `verify`): `1920×1080` e `360×800`, chip com e sem ponto, menu do perfil no mobile, contra o POC aprovado.

## Fora de Escopo

- A rota e a página `/patchnotes` (`pn-04`); o chip nasce linkando para uma rota que só passa a existir na `pn-04`.
- SHA de commit na versão exibida.

## Dependências

Nenhuma.
