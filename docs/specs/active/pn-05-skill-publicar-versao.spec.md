# pn-05-skill-publicar-versao.spec.md

> Task 5/5 do guarda-chuva `patchnotes-versao-sistema.spec.md` (entregáveis `pn-05`).

## Objetivo

Dar ao autor o fluxo repetível para fechar e publicar uma versão (skill + script) e publicar os dois
patchnotes retroativos reais: `v1.0.0` e `v1.1.0`.

## Entregáveis

1. `backend/tools/patchnotes/publicar.ts` + `npm run patchnotes:publicar -- <arquivo.md>`: valida o front matter, grava `patchnotes/<versao>.md` e atualiza `patchnotes/indice.json` (lê o índice atual do provedor, insere/substitui a versão e regrava ordenado); recusa rodar em `r2` sem as variáveis `ARMAZENAMENTO_R2_*`.
2. Skill `publicar-versao` nas duas cópias idênticas (`.claude/skills/` e `.agents/skills/`), no contrato comum de skills do `CLAUDE.md`: descoberta da última tag, proposta de bump com confirmação, redação em linguagem de jogador, `versao:sincronizar`, commit+tag, publicação e registro em `HISTORY.md`; push da tag e publicação no R2 sempre confirmados com o autor.
3. Patchnotes `v1.0.0` (início → `306a9714`) e `v1.1.0` (→ HEAD) redigidos em `docs/patchnotes/` (ignorada pelo git), revisados pelo autor e publicados.
4. Tags `v1.0.0` e `v1.1.0` criadas.

## Critérios de Aceite

1. Testes do script (front matter válido/ inválido, índice novo/existente, ordenação, substituição de versão).
2. `diff -r .claude/skills .agents/skills` vazio; `SKILL.md` ≤ ~150 linhas.
3. Validação por uso: as duas notas publicadas aparecem na página pública real (`verify`).

## Fora de Escopo

- Editor de notas na interface; geração automática de nota a partir de commits sem revisão do autor.

## Dependências

`pn-03` e `pn-04` concluídas; credencial de escrita do R2 nas variáveis do autor (publicação real).
