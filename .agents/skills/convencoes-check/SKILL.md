---
name: convencoes-check
description: >
  Revisar diff, conferir convenções, checar padrão e nomenclatura antes de commitar, fechar uma
  task ou declarar uma alteração pronta. Use ao revisar mudanças, fazer passe final, conferir SQL,
  DTO, enum, controller, formulário Angular ou SCSS — mesmo quando o pedido só disser "confira".
---

# Convenções Check — passe final do diff

> As regras vivem em `docs/CONVENTIONS.md` (sobretudo "Proibições — Resumo Rápido"),
> `docs/SYSTEM.SPEC.md` e `CLAUDE.md`/`AGENTS.md`; esta skill só transforma a revisão em um
> passe repetível. Passe mecânico limpo não substitui ler o diff, os testes nem o gate visual.

## Regra de escopo — leia antes de buscar

O escopo padrão é **somente o diff desta task**: arquivos de `git diff --name-only HEAD`. Não
corrija uma violação preexistente em arquivo que a task não tocou. Registre-a em
`docs/context/PROBLEMS.md`, com o caminho e o impacto, e mantenha o diff no escopo da spec.
Auditoria do repositório inteiro só acontece por pedido explícito; seus achados também viram
problema/spec própria, nunca correção oportunista.

## 1. Preparar o recorte

Na raiz, em um terminal PowerShell, confirme o recorte:

```powershell
git diff --name-only --diff-filter=ACMR HEAD
```

Se a lista está vazia, inclua também as mudanças já preparadas com `git diff --cached --name-only`
ou faça o passe antes de preparar o commit. As buscas da referência leem o patch com
`git diff --unified=0 HEAD`, portanto não estouram o limite de argumentos do Windows. Para auditar
um commit já mergeado, troque esse prefixo por `git diff <commit>^ <commit> --unified=0`. Cada busca
pronta, seu significado e seus falsos positivos ficam em
[`references/buscas.md`](references/buscas.md). Rode apenas as linhas aplicáveis ao recorte; zero
resultado é o esperado, mas resultado exige classificação, não correção automática.

## 2. Passe mecânico

1. Rode as buscas da referência sobre `$arquivos` e marque cada acerto como violação, exceção
   listada ou falso positivo explicado.
2. Se houver alteração visual, use também `design-fidelity` e o gate ao vivo `verify`; esta skill
   não observa a tela renderizada.
3. Se o diff criar UI, confira que ele consome o primitivo de `shared/ui/` aplicável; copiar seu
   bloco BEM é violação, e `_componentes.scss` não é fonte de cópia.
4. Se houver SQL, DTO ou fórmula, as skills `sql-migrations`, `dto-conventions` e
   `regras-do-jogo` continuam sendo as instruções especializadas — este é apenas o check final.

## 3. Leitura manual obrigatória

Leia o diff completo, procurando o que busca textual não prova:

- controller com regra, `if` ou `try/catch`;
- regra de domínio duplicada entre frontend/backend, permissão fora da service dona ou fórmula
  fora de `shared/src/regras/`;
- DTO de negócio herdando outro DTO de negócio; primitivo em assinatura de service/repository;
- query de um módulo no repositório de outro; escrita recebida por WebSocket.

Cheque ainda que a alteração atende a spec e que cada acerto mecânico não é só texto, comentário,
fixture ou caso explicitamente permitido. A ausência de acertos não demonstra essas propriedades.

## 4. Fecho

No relato da task, registre: recorte revisado; buscas relevantes e seu resultado resumido;
achados preexistentes encaminhados (sem misturá-los ao diff); e a leitura manual. Só então siga os
gates de `task-flow` (testes/lint/build proporcionais, spec para `done` e contexto). Nunca use
este passe para declarar pronto algo cuja verificação obrigatória ainda não ocorreu.
