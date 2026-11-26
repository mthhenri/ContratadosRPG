# regras-sem-subtitulo.spec.md

> Task solta (pedido do autor em 25/11/2026, ao ver a capa nova do PDF): "Nova Era" era só um extra e não é
> o nome do jogo. Caminho escolhido pelo autor: **publicar sem subtítulo**.

## Objetivo

Os livros de Regras deixam de ter subtítulo a partir da próxima publicação, sem alterar versões já
publicadas.

## Entregáveis

1. A publicação (`LivroService.publicar`) grava `subtitulo` vazio, em vez de repetir o da versão anterior.
2. O leitor não desenha a linha de subtítulo quando ele é vazio.

## Critérios de Aceite

- Testes que falham antes e passam depois para os dois entregáveis; suítes do backend e do frontend, lint e
  build.
- Capa do leitor conferida na aplicação em `1920×1080` e `360×800`, com e sem subtítulo.

## Fora de Escopo

Migração ou edição de versões publicadas; publicar os livros (o autor faz pela Oficina); exportar
`docs/core/` (vai junto da publicação); campo de subtítulo na Oficina; mudar o contrato `subtitulo`.

## Efeito até a publicação

O site segue mostrando o subtítulo antigo até o autor publicar a próxima versão de cada livro.
