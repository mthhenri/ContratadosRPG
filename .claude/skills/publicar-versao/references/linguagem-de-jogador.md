# Formato da nota e linguagem de jogador

Modelos reais: `docs/patchnotes/1.4.0.md` (rascunho local) ou `GET /patchnote/1.4.0`. A regra de formato é
do código (`patchnote-formato.util.ts` valida; `frontend/.../patchnote-formato.ts` interpreta); aqui só o
que ajuda a escrever bem.

## Arquivo

```markdown
---
versao: 1.5.0
data: 2026-10-06
titulo: Título curto e descritivo da versão
---

**Período:** 30 de setembro a 6 de outubro de 2026.

Um parágrafo de abertura: o que foi a semana, em duas ou três frases.

# PARA OS PLAYERS

## 🎬 Nome da funcionalidade

Um ou dois parágrafos que explicam **o que muda para quem joga** e por quê. Listas quando ajudam:

- item curto;
- outro item.

## 🎲 Outra funcionalidade

Texto.

# PARA O MESTRE

## 📚 Funcionalidade do mestre

Texto.

# RESUMO DO QUE MAIS MUDA NA MESA

Um parágrafo com os maiores impactos, para quem não quiser ler tudo.
```

- `commit: <hash>` (opcional, no front matter) é o commit em que a versão foi fechada: só nas notas
  **retroativas**, para o workflow criar a tag no lugar certo. A versão vigente não leva `commit:`.
- `# Título` abre um **grupo** (público ou assunto). Os usuais são `PARA OS PLAYERS`, `PARA O MESTRE` e o
  `RESUMO…` final; um grupo só sai se não houver conteúdo para ele (ex.: versão só de correção).
- `## Título` abre um **bloco de funcionalidade**, com um emoji no começo (é o estilo da casa).
- Os títulos `## Novidades`, `## Melhorias` e `## Correções` continuam valendo como blocos de **balanço**,
  com cor própria — bons para versões pequenas, sem grupos, ou para fechar um grupo com as correções.
- Nota escrita só com `##` (sem `#`) também funciona: vira um grupo único sem título.
- `###` e níveis mais fundos continuam sendo texto do bloco. Não use HTML, imagens nem links `javascript:` — a
  página os descarta.

## Tom

Explica em vez de listar: para cada funcionalidade, o que era, o que passou a ser e o efeito na mesa. Vale
detalhar (uma versão de uma semana costuma ter de 6 a 12 blocos), mas sem entrar em como foi feito.

## Traduzir do histórico técnico

| Histórico / commit | Nota |
|---|---|
| `feat(cena): hub de cenas, "Nova cena" tipada` | **Cenas na campanha.** O mestre monta a sessão em cenas de Iniciativa, Resistência ou Investigação. |
| `fix(tempo-real): eventos de campanha sem identidade de ficha oculta` | **Ficha oculta** não aparece mais para outros jogadores nos avisos da mesa. |
| `perf: reutilizar consultas locais` | O sistema reaproveita consultas já feitas e carrega só o que precisa. |
| `fix(editor-markdown): Salvar logo após digitar não perde o fim do texto (P-081)` | Salvar logo depois de digitar não perde mais o fim do texto. |
| `refactor(ficha): extrai FichaReacoes` | *(não entra: o jogador não percebe)* |
| `test`, `chore`, `docs`, `style` | *(não entram)* |

Regras: sujeito é a pessoa, não o sistema; verbo no presente; sem "foi implementado/refatorado"; sem promessa
("em breve"); vários commits do mesmo recurso viram **um** bloco; sem nome de arquivo, rota, tabela, migration
nem código de task (`P-0NN`, `m9-13`).
