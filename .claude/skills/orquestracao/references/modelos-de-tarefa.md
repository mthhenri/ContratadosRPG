# Modelos de tarefa para delegação

Copie, preencha e apague o que não se aplica. Não cole o histórico da conversa.
O cabeçalho comum (regras e formato da resposta) é acrescentado pelos wrappers a
partir de `scripts/agentes/cabecalho-delegado.md`; não o repita.

## Revisão independente (Codex `consulta` ou `revisor` Claude)

```markdown
## Problema
<o que o usuário pediu, em 2–4 linhas, sem a sua solução>

## Requisitos
- <regra/critério 1> (fonte: <docs/core/... ou spec>)
- <regra/critério 2>

## Onde está a mudança
`git diff <base>...HEAD -- <caminhos>` (ou: arquivos <a>, <b>)

## O que quero
Procure bugs, regressões, casos de borda e violações dos requisitos ou de
`CLAUDE.md`. Para cada achado, dê o cenário concreto de falha. Se houver uma
abordagem claramente melhor, descreva-a. Não altere arquivos.
```

Não inclua: sua conclusão, o que você já verificou, onde suspeita de erro.

## Segunda opinião sobre bug difícil (Codex `consulta`, esforço `xhigh`)

```markdown
## Sintoma
<comportamento observado vs. esperado; comando que reproduz>

## Evidência bruta
<mensagem de erro / trecho de log — mínimo necessário>

## Ponto de partida
<arquivos ou módulo onde o fluxo começa>

## O que quero
A causa raiz mais provável, com evidência `arquivo:linha`, e como confirmar.
```

Só depois de receber a resposta compare com a sua hipótese.

## Implementação delimitada (`implementador` ou Codex `implementacao`)

```markdown
## Objetivo
<uma frase>

## Escopo
Arquivos que podem mudar: <lista>. Fora do escopo: <lista>.

## Requisitos
- <comportamento esperado> (fonte: <spec/doc>)

## Sucesso
- <teste/comando> passa
- <critério observável>
```

## Exploração (`Explore`)

Pergunta objetiva + amplitude ("medium" ou "very thorough") + o formato da
resposta (lista de `arquivo:linha`, não o conteúdo dos arquivos).
