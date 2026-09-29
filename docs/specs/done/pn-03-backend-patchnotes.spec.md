# pn-03-backend-patchnotes.spec.md

> Task 3/5 do guarda-chuva `patchnotes-versao-sistema.spec.md` (entregáveis `pn-03`).

## Objetivo

Expor os patchnotes por API pública, lidos do R2 com cache de 24 h.

## Entregáveis

1. DTOs em `shared/src/dtos/patchnote/` (`PatchnoteResumoDto`, `PatchnoteRecuperarDto { versao }`, `PatchnoteRecuperadoDto`) e validador de versão SemVer em `shared/src/validators/`; subpath no `exports` do `shared`. A entrada de recuperação usa `versao` (chave natural, não há id — não existe tabela), única exceção declarada à regra `{ id: number }`.
2. Módulo `patchnote` (controller fino → service, **sem repository**): `GET /patchnote` (índice, mais recente primeiro) e `GET /patchnote/:versao` — API no singular, como o resto do projeto; ambos `@Public()`, `Cache-Control: public, max-age=300`. O `proxy.conf.json` do dev-server ganha `^/patchnote(?:$|[/?])` (regex de fronteira: a página é `/patchnotes` e um prefixo simples a capturaria).
3. Formato: `patchnotes/<versao>.md` com front matter (`versao`, `data`, `titulo`) e `patchnotes/indice.json`. O service consulta o índice (em cache) antes de ler a nota: versão fora do índice → `ResourceNotFoundException`; versão fora do padrão SemVer nunca vira chave.
4. Cache em memória de 24 h (índice e cada nota), relógio injetável nos testes; falta no R2 nunca é cacheada como nota.
5. Contratos OpenAPI regenerados (`npm run openapi:gerar-contratos --workspace=backend`) e tag `Patchnotes`.

## Critérios de Aceite

1. Testes do service: cache hit/miss, expiração após 24 h, versão inválida, versão fora do índice, índice ausente (lista vazia), ordenação; e do controller.
2. `openapi.document.spec.ts` verde com as rotas novas; suítes de `shared` e `backend` e lint verdes.
3. Ao vivo (`verify`): `curl` das duas rotas **sem token** contra a API local com `ARMAZENAMENTO_PROVEDOR=local`.

## Fora de Escopo

- Escrita/publicação (`pn-05`); frontend (`pn-04`).

## Dependências

`pn-02` concluída.
