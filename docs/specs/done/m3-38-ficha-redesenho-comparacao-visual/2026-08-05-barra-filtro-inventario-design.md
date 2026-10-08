# Barra do filtro do inventário — design

## Objetivo

Organizar os controles do inventário sem alterar filtros, ações ou regras de domínio.

## Comportamento visual

- Em desktop, o controle segmentado de Equipamentos, Amplificadores e Fragmentos fica na mesma linha e imediatamente após os botões `+ Adicionar itens` e `+ Item custom`.
- Em mobile (até o breakpoint `bp.mobile` do projeto), a barra de filtro ocupa uma linha própria abaixo desses dois botões, sem quebra interna.
- No mobile, os textos visíveis são `Equip.`, `Amplif.` e `Frag.`; o nome acessível de cada botão permanece completo e os ícones continuam presentes.
- Esvaziar, Custos e busca não mudam de ordem nem de comportamento.

## Implementação

O template agrupará os botões de adição e o filtro na mesma barra de ações. Cada rótulo do filtro terá variantes para desktop e mobile; o SCSS troca a variante pelo breakpoint existente, usando somente tokens do tema. Um teste de template assegurará que os dois textos de apresentação e os rótulos acessíveis completos sejam preservados.

## Fora de escopo

Não haverá alteração do estado `filtroInventario`, das ações do inventário, do catálogo ou do modo compacto de equipe.
