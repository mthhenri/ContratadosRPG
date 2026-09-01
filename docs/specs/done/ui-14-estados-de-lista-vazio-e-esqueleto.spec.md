# UI-14 — Estados de lista: vazio e carregando

> Filha da auditoria visual. Lacuna mais repetida do sistema: toda lista pode estar vazia ou
> carregando e nenhuma tem tratamento comum.

## Objetivo

Criar os dois primitivos que faltam para o ciclo de vida de uma lista — `app-estado-vazio` e
`app-esqueleto` — e adotá-los nas listas que hoje caem em área em branco ou frase solta.

## Entregáveis

1. `app-estado-vazio`: três slots (ícone, título mono, linha de apoio) e ação opcional. Vazio de
   verdade e vazio por filtro são o mesmo componente com textos diferentes — a API não separa os
   dois casos, só recebe o conteúdo. Tokens: `--text-dim`, `--text-mute`, `--border-strong`
   tracejado, ícones do `app-icone`, botão contorno/link.
2. `app-esqueleto`: blocos em `--surface-2` que reservam a geometria do conteúdo real, com
   `prefers-reduced-motion` honrado como no resto do projeto. Nenhuma cor nova.
3. Adotar nos quatro consumidores identificados na auditoria: histórico de rolagens, acervo de
   fichas, lista de campanhas e inventário — apagando a marcação ad-hoc de cada um.
4. Documentar no `DESIGN.md` quando usar esqueleto (lista com geometria conhecida) e quando a
   linha de 2px da topbar basta (navegação global).

## Critérios de Aceite

- As quatro listas mostram o mesmo desenho de vazio e o mesmo de carregando; nenhuma delas
  declara mais tipografia ou cor própria para esses estados.
- Ao trocar de rota com rede lenta simulada, a lista não salta de layout quando a resposta chega.
- Com `prefers-reduced-motion: reduce` o esqueleto não anima.
- Gate visual dos quatro módulos nos dois viewports, nos estados vazio, carregando e preenchido.

## Fora de Escopo

Estado de erro de carregamento (fica na fila de notificações), paginação e mensagens de produto
novas — os textos vêm dos consumidores.

## Dependências

`ui-06`, `app-icone`, `app-botao`.
