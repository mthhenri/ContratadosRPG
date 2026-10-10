# m11-07-oficina-inserir-e-estruturar.spec.md

> Task 7/10 do milestone [`m11-oficina-regras.spec.md`](m11-oficina-regras.spec.md). Segunda UI da
> Oficina; fonte visual no [`m11-oficina-exemplao.html`](m11-oficina-regras/m11-oficina-exemplao.html).

## Objetivo

Permitir criar peças novas (menu "+" e "/" com esqueletos) e reorganizar a estrutura pelo sumário
(arrastar seções e arquétipos entre irmãos), preservando links ao renomear.

## Entregáveis

1. **Inserção**: "+" entre peças e no fim das listas; "/" em linha vazia abre menu filtrável
   (`/hab`, `/nota`…). Opções dependem do contexto, a partir da tabela de aninhamento do validador
   (`m11-01`): dentro de classe só Arquétipo etc.
2. **Esqueletos** de peças compostas (arquétipo nasce com a habilidade inicial vazia; classe com
   Saúde/progressão/arquétipos vazios), definidos como funções puras no `shared/` e cobertos por
   teste; o esqueleto nasce válido para o validador, com as pendências esperadas (campos vazios).
3. **Arrastar no sumário**: reordenar e mover seções e arquétipos entre irmãos, com acessibilidade
   por teclado (alternativa ao arrastar) e feedback de destino; só movimentos permitidos pela tabela
   de aninhamento.
4. **Renomear peça**: gerar nova `ancora` a partir do título (colisão resolve com sufixo estável) e
   gravar a antiga em `regra_peca_ancora_antiga`; URLs e links antigos continuam resolvendo
   (resolução na leitura herdada da `m11-04`).
5. **API**: criar peça (com filhos do esqueleto, atomicamente via `transacaoService`), mover com
   `ordem`, e renomear com âncora antiga; permissões na service.
6. **Primitivos**: menu de inserção ("/" e "+") e o gesto de arrastar **não existem** em
   `shared/ui/`. **Parar e perguntar ao autor** antes de criar ou contornar.

## Critérios de Aceite

- Testes: esqueleto de cada tipo composto válido; criar com filhos é atômico (falha no meio não
  deixa metade); mover recusa destino inválido; renomear preserva a âncora antiga e a URL antiga
  abre a peça.
- **Gate visual** com `verify` em `1920×1080` e `360×800`: análogo registrado; estados percorridos
  (menu "+", "/" com filtro, esqueleto recém-criado com pendências, arrastar no sumário, alternativa
  por teclado, destino inválido, renomear e abrir a URL antiga); comparação com o exemplão; sem
  overflow; foco e alvos de toque.
- Leitor fora da Oficina inalterado. Lint e testes dos três workspaces verdes.

## Fora de Escopo

Edição de blocos ricos adicionais (`m11-08`); marcas de mudança e publicação (`m11-09`); criar
livro novo; adaptar arrastar/criar classe ao celular (a edição pesada é desktop).

## Dependências

`m11-06` em `done/`. Decisão do autor sobre os primitivos (item 6).

## Riscos e Mitigação

- **Mover quebrando a numeração/ordem de irmãos** em concorrência: reordenação com `revisao` do
  pai ou transação que reescreve a ordem dos irmãos; teste.
- **Âncora antiga colidindo com âncora nova de outra peça**: validar unicidade conjunta (atual +
  antigas) dentro do livro.
