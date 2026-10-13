# Verificação — oficina-edicao-de-listas

> Relatório textual de [`oficina-edicao-de-listas.spec.md`](../oficina-edicao-de-listas.spec.md). Capturas
> locais em `.artifacts/oficina-edicao-de-listas/` (ignoradas pelo Git); este texto não depende delas.

## Testes e lint (2026-10-13)

- `shared`: 1270 testes (inclui projeção da lista com `peca` e sem `peca` na sublista, e as pendências "A lista
  está sem itens" / "Há um item da lista sem texto", sublista contando como texto). Lint: 0 erros.
- `frontend`: 268 arquivos, 3411 testes (inclui `regras-lista.component.spec.ts`: leitura sem Oficina, campos nos
  caminhos `itens.i.j.trechos` e `itens.1.1.itens.0.0.trechos`, `+ Item`, remover item, sublista na peça da raiz; e
  "Lista" no menu de inserção). Lint: 0 erros.
- `backend` filtrado em `livro`: 99 passaram, 11 ignorados (já ignorados antes).
- Warnings de lint (milhares) são preexistentes e não mudaram de natureza.

## Ao vivo (Oficina real, Sistema › Perseguição › Encerramento)

Análogo: `RegrasRoteiro` (etapas) e a própria lista no leitor. `1920×1080` e `360×800`.

- Clicar no item abre edição no lugar e seleciona a lista (barra da peça, "Remover item" por item, "+ Item").
- Digitar no item e sair: salvou ("SALVO"); Desfazer devolveu o texto original (igual ao anterior).
- `+ Item`: o item novo apareceu, o cursor foi para `itens.4.0.trechos`, o banco (API) passou de 4 a 5 itens e a
  pendência "Há um item da lista sem texto" apareceu; "Remover item 5": voltou a 4 no banco.
- Sem overflow horizontal em `360×800`; "Remover item" com alvo de 44×44; "+ Item" com 35 px de altura (botão
  pequeno canônico). Item de lista no celular não corre mais por baixo do botão de remover.
- Menu de inserção (correção de z-index): os cinco pontos do menu aberto recebem o clique no próprio menu.

## Achados da verificação

- A barra da peça cobria o botão de remover do primeiro item → margem no topo da lista selecionada.
- No celular o texto corria por baixo do botão → reserva de 48 px à direita do item.

## Limites (o que ficou aberto)

- Inserir uma **lista nova** pelo "+" não foi exercido ao vivo (só o catálogo do menu e o esqueleto, em teste).
- "Remover item" do primeiro item e de sublista, e `+ Item` de sublista, só em teste unitário.
- O item "Interrupção externa" do banco: no momento da verificação o rascunho já trazia o "I" em negrito
  (alterado fora desta verificação); o texto foi conferido pela API depois dos testes e estava íntegro.
- Gate de comparação visual no tema claro não foi feito (a base clara não faz parte do escopo).
