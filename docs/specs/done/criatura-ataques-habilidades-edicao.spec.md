# criatura-ataques-habilidades-edicao.spec.md

> Task avulsa de refino da ficha de Criatura. Origem: pedido do autor (2026-11-26), logo depois de
> `criatura-ataques-habilidades-leitura` (done). Decisões do autor registradas abaixo.

## Objetivo

Deixar **criar, alterar e excluir** ataques e habilidades da criatura direto no item, sem modo de edição
geral, com uma caixa de criar/alterar mais fácil de usar; e permitir **compactar** cada grupo para ver só
os nomes.

## Problemas (pedido do autor + inspeção da tela com O Ausente)

1. Para alterar ou excluir um item é preciso entrar num modo de edição geral (lápis do cabeçalho) e sair
   dele depois.
2. A caixa de criar/alterar é apertada: meia coluna, `select` e `checkbox` nativos, exemplos de fórmula que
   não batem com o sistema ("1D20"), botão desabilitado sem dizer o que falta.
3. Lista longa (O Ausente: 12 habilidades, 6 ataques) não tem como ser resumida.

## Decisões do autor (2026-11-26)

- Caixa de criar/alterar **no lugar do cartão** (não modal). Criar e alterar usam a mesma caixa.
- Compactação **não** é lembrada: a ficha sempre abre com tudo expandido.
- Excluir pede confirmação; alterar só troca o cartão pela caixa.
- Exceção consciente à preferência "ações por item só dentro de modo de edição": aqui o autor pediu os
  botões de alterar/excluir direto em cada item.

## Entregáveis

1. **Sem modo de edição geral** em Ataques e Habilidades: o cabeçalho da lista fica só com "+" (criar).
   Cada cartão, quando editável, traz no próprio cabeçalho "Alterar" (lápis) e "Excluir" (lixeira, com a
   confirmação que já existe).
2. **Caixa única de criar/alterar**, no lugar do cartão (criar: no topo da lista), ocupando a largura
   inteira da lista: título ("Novo ataque" / "Alterar ataque"), campos com `app-campo`, escolha de tipo /
   custo / área com `app-segmentado`, exemplos de fórmula no formato do sistema, aviso do que falta quando
   inválida, Esc cancela e Ctrl+Enter confirma, foco no Nome ao abrir.
3. **Grupos compactáveis**:
   - Habilidades: o título de cada grupo (Ativas · Gatilhos · Passivas) liga/desliga a compactação. Grupo
     compactado mostra só o nome de cada habilidade; clicar no nome abre aquela habilidade inteira (e
     fecha de novo).
   - Ataques: passam a ser agrupados por custo de ação (Livre › Movimento › Padrão › Completa › Turno, sem
     grupo vazio, por nome dentro do grupo), com o mesmo liga/desliga. Linha compactada: nome e, à
     direita, os três dadinhos Teste / Dano / Crítico, que rolam direto (fórmula no tooltip e no nome
     acessível). Clicar no nome abre o cartão inteiro.
4. Testes migrados/novos: sem modo de edição, ações por item, confirmação ao excluir, caixa única com
   título certo, segmentados, grupos de ataque por custo, compactar/abrir item, dadinhos rolando.

## Análogo

- Formulário no lugar do item com `app-campo` compacto + `campo__controle` e `app-segmentado`:
  `npc-habilidades-lista` (ficha de NPC).
- Cartões, grupos, selos e botões de rolagem: o estado atual das próprias listas
  (`criatura-ataques-habilidades-leitura`).
- Liga/desliga com chevron e `aria-expanded`: "Ver mais / Ver menos" de `app-habilidade-descricao`.

## Critérios de Aceite

- Nenhum botão "Editar habilidades/ataques" no cabeçalho; lápis e lixeira em cada cartão editável; nada
  disso na ficha só de leitura.
- Excluir pede confirmação e cancelar a confirmação não remove nada.
- Criar e alterar abrem a mesma caixa, que salva pela mesma saída (`itensMudou`) de antes.
- Compactar e expandir cada grupo; abrir e fechar um item dentro de grupo compactado; no ataque
  compactado, os três dadinhos rolam a fórmula certa.
- Gate visual (`verify` + `design-fidelity`) em `1920×1080` e `360×800` com O Ausente: listas, grupos
  compactados, item aberto, caixa de criar e de alterar, confirmação de exclusão; sem rolagem horizontal.
- Suíte do frontend, lint dos componentes e `npm run repo:verificar` verdes.

## Fora de Escopo

- Recálculo de Vida e Defesa pela VD (pedido no mesmo dia, spec própria).
- Campos estruturados por fase/estágio (fase 2 de `ficha-criatura-npc-revamp-visual`).
- Tratar quebra de linha simples como quebra na leitura do Markdown.
- Listas do NPC.
