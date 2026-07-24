# m3-48-habilidades-filtro-contador.spec.md

> Task 45 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Na aba **Habilidades**, tornar os **contadores por tipo clicáveis**: clicar no contador de um tipo
**filtra** a lista para exibir só as habilidades daquele tipo (ex.: clicar em "Arquétipo" mostra
só as de Arquétipo). Um estado "limpar" desfaz o filtro; selecionar **todos** limpa sozinho.

## Entregáveis

1. **Filtro por tipo.** Em
   `frontend/src/app/modules/ficha/componentes/ficha-habilidades/ficha-habilidades.component.ts`,
   tornar os contadores por `HabilidadeCategoriaEnum` (Arquétipo, Classe, Personalidade…)
   clicáveis; um Signal local guarda o tipo ativo e filtra a lista renderizada.
2. **Limpar filtro.** Quando há um tipo ativo, exibir affordance "limpar" (ou clicar de novo no
   mesmo contador limpa). **Selecionar todos os tipos limpa automaticamente** (equivale a sem
   filtro). Estado do tipo ativo em UPPERCASE/mono + estado ativo com accent (tokens do tema).
3. Sem persistência — é estado de UI volátil; nenhum novo campo em `dados`.
4. Acessibilidade: contador clicável com `role`/`aria-pressed` coerente; navegável por teclado.

## Critérios de Aceite

- Clicar no contador de um tipo filtra a lista para aquele tipo.
- Existe forma clara de limpar; selecionar todos limpa automaticamente.
- O estado ativo é visualmente distinto (accent) e não persiste após sair da ficha.

## Fora de Escopo

- Busca textual/ordenação de habilidades (só o filtro por tipo pelo contador).
- Qualquer mudança no editor/seletor de habilidades (`ficha-habilidade-seletor`).

## Dependências

- `m3-13` (editor de Habilidades).
