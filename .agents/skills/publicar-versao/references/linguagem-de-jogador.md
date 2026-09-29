# Formato da nota e linguagem de jogador

Pontos de partida reais: `docs/patchnotes/1.0.0.md` e `docs/patchnotes/1.1.0.md` (rascunhos locais) ou
`GET /patchnote/1.1.0`. A regra de formato é do código (`patchnote-formato.util.ts`); aqui só o que
ajuda a escrever bem.

## Arquivo

```markdown
---
versao: 1.2.0
data: 2026-10-15
titulo: Título curto e descritivo da versão
---

Uma ou duas frases sobre a versão (aparece sob o título).

## Novidades

- **Nome do recurso.** O que dá para fazer agora, em uma ou duas frases.

## Melhorias

- **O que ficou melhor,** e como isso aparece para quem joga.

## Correções

- **O que estava errado** não acontece mais.
```

Só existem estes três títulos com cor própria (Novidades, Melhorias, Correções); outro `##` vira bloco
neutro. `###` e `#` dentro de um bloco continuam sendo texto dele. Não use HTML, imagens nem links
`javascript:` — a página os descarta.

## Traduzir do histórico técnico

| Histórico / commit | Nota |
|---|---|
| `feat(cena): hub de cenas, "Nova cena" tipada` | **Cenas na campanha.** O mestre monta a sessão em cenas de Iniciativa, Resistência ou Investigação. |
| `fix(tempo-real): eventos de campanha sem identidade de ficha oculta` | **Ficha oculta** não aparece mais para outros jogadores nos avisos da mesa. |
| `perf: reutilizar consultas locais` | **Telas mais rápidas.** Carregam só o que precisam. |
| `fix(editor-markdown): Salvar logo após digitar não perde o fim do texto (P-081)` | **Salvar o Caderno logo após digitar** não perde mais o fim do texto. |
| `refactor(ficha): extrai FichaReacoes` | *(não entra: o jogador não percebe)* |
| `test`, `chore`, `docs`, `style` | *(não entram)* |

Regras: sujeito é a pessoa, não o sistema; verbo no presente; sem "foi implementado/refatorado";
sem promessa ("em breve"); vários commits do mesmo recurso viram **um** item.
