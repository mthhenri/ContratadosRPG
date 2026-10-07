# m10-11-remocao-pdf-antigo.spec.md

> Task do milestone `m10-regras.spec.md`, depois de `m10-10`. Fecha o milestone. **Combinar com o
> autor o momento**: a partir daqui ele deixa de exportar o PDF do Docs.

## Objetivo

Remover o leitor de PDF e os PDFs de regras do site e do repositório, e apontar agentes e
documentação para o formato canônico.

## Entregáveis

1. Remover `frontend/src/app/shared/leitor-documentos/` (inclui `leitor-pdf-mobile`), o
   `pdfjs-dist` do `frontend/package.json`, `preparar-pdf-worker.mjs`, a cópia dos PDFs em
   `preparar-documentos.mjs` e as entradas de PDF no `angular.json`. Conferir com busca que não
   sobrou consumidor.
2. Remover `docs/core/*.pdf` (o histórico fica no git).
3. `CLAUDE.md` **e** `AGENTS.md` (idênticos), skill `regras-do-jogo` em `.claude/skills/` **e**
   `.agents/skills/` (idênticas), `MEMORY.md` e `CONTEXT.md` apontando para o `.md` canônico e o
   JSON gerado, sem menção a PDF.
4. Atualizar a menção da M9 ao leitor de PDF na Biblioteca (registrar em `IDEAS` se PDF na
   Biblioteca continuar desejado).

## Verificação

Build e testes do frontend; `diff` vazio entre `CLAUDE.md`/`AGENTS.md` e entre as pastas de skills;
`verify` rápido da topbar → Regras em 1920×1080 e 360×800.
