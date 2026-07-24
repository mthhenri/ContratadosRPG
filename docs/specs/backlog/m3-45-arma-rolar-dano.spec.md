# m3-45-arma-rolar-dano.spec.md

> Task 42 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Adicionar um **botão de rolar o dano direto na arma**, dentro do card do item de arma na aba
Inventário, sem precisar ir montar um preset de rolagem.

## Entregáveis

1. **Botão "Rolar dano"** nos cards de arma (`ItemCategoriaEnum` de armas: `CORPO_A_CORPO`,
   `ARMAS_DE_FOGO`, `EXPLOSIVOS`, `EXOTICOS`…) em
   `frontend/src/app/modules/ficha/componentes/ficha-inventario/ficha-inventario.component.ts/.html`.
2. **Montagem da fórmula** a partir do dano do item: reusar `calcularStatItem`
   (`shared/src/regras/compras/compras.ts`) para obter o dano tipado (`m3-18`) e o motor
   `shared/src/regras/rolagem` (`rolarFormula`/`rolarInterpretada`) via o helper
   `frontend/src/app/modules/ficha/executar-rolagem.ts`. Exibir o resultado na bandeja
   (`BandejaDadosService`, `shared/bandeja-dados/`).
3. **Persistência:** se a `m3-27` (histórico de rolagem) já estiver concluída, gravar a rolagem
   pelo mesmo padrão (`RolagemService`, com `rotulo` = nome da arma); caso contrário,
   fire-and-forget só na bandeja. A spec deve tratar os dois cenários sem acoplar rígido à `m3-27`.
4. Respeitar o gate de permissão de rolagem da `m3-51` (visualizador não rola) quando esta existir.

## Critérios de Aceite

- Clicar em "Rolar dano" numa arma rola o dano correto (tipado) e mostra na bandeja.
- A fórmula sai de `calcularStatItem` (inclui mods/fragmentos aplicados à arma).
- Se o histórico (`m3-27`) existir, a rolagem é gravada com o rótulo da arma.

## Fora de Escopo

- Rolar ataque/acerto (só dano aqui).
- Nova gramática de rolagem (é a `m3-46`).

## Dependências

- `m3-18` (dano tipado), `m3-14` (inventário), `m3-22` (bandeja/frontend de rolagem),
  `m3-27` (histórico — opcional), `m3-51` (gate de permissão de rolagem — opcional).
