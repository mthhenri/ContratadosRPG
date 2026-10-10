# regras-ir-para-secao.spec.md

> Task avulsa, pedido do autor em 10/10/2026. Atalho **Ctrl+K** nas Regras para pular a uma
> seção do sumário digitando o nome, com equivalente no celular. O primitivo nasce em
> `shared/ui/` para ser reaproveitado pela "Ir para peça" da Oficina (M11, `m11-06`).

## Objetivo

Ir a uma seção sem rolar o sumário lateral: Ctrl+K (⌘K no Mac) abre uma paleta, o leitor digita
"habilidades", a lista filtra os tópicos e Enter leva direto à seção. No celular, onde não há
Ctrl, um botão de busca abre a mesma paleta.

## Decisões do autor (10/10/2026)

1. **Novo primitivo `app-paleta`** em `frontend/src/app/shared/ui/paleta/`, genérico: recebe
   itens e emite a escolha; as Regras o alimentam com as seções do sumário.
2. **Mobile:** botão de lupa na barra do leitor, ao lado de "Sumário". No desktop o gatilho
   visível é um botão "Ir para… Ctrl K" no trilho do sumário.

## Entregáveis

1. `app-paleta`: sobre `app-modal` (folha inferior no mobile), campo de busca (`app-campo`),
   lista navegável por teclado (↑ ↓ Home End Enter; Esc fecha pelo modal), `role="combobox"` +
   `listbox`. Busca sem acento e sem caixa; ordem: começa com o termo, começa uma palavra,
   contém no título, contém no caminho. Item com título e caminho (ancestrais) em texto
   secundário. Teste unitário de filtro, ordem, teclado e eventos.
2. Leitor de Regras: itens a partir do sumário (todos os níveis do sumário, caminho pelos
   ancestrais), escolha leva à âncora como o clique no sumário (fecha a gaveta, destaca, atualiza
   URL). Atalho global Ctrl/⌘+K com `preventDefault`, sem conflito com a pesquisa do livro
   (Enter da paleta não aciona a navegação de ocorrências).
3. No painel flutuante de Regras o atalho vale só com o foco dentro do painel; na página, só
   quando o painel está fechado.

## Critérios de Aceite

- Ctrl+K abre a paleta nas Regras; "habilidades" lista o tópico e Enter leva até ele.
- Botão de lupa funciona no celular (360×800), paleta usável com teclado virtual.
- Testes do primitivo e do leitor; build e lint limpos; `repo:verificar`.
- Gate visual (`design-fidelity` + `verify`): 1920×1080 e 360×800; análogo: campo de pesquisa
  das Regras e `app-modal`.

## Fora de Escopo

- Pesquisa de texto dentro do livro (já existe) e a paleta da Oficina (M11).
- Atalho em outras telas.
