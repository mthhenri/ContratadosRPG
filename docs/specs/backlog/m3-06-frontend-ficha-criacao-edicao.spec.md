# m3-06-frontend-ficha-criacao-edicao.spec.md

> Task 6/9 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> O protótipo `docs/design/examples/ficha-de-jogador.html` é o alvo de fidelidade desktop.

## Objetivo

Frontend da ficha de jogador — **criação e edição**, reusando os formulários e cálculos da
calculadora de agente (M1), com stats derivados **ao vivo** via `shared/regras`. Abre o
módulo `modules/ficha/` e o `FichaService` HTTP.

## Entregáveis

1. **`FichaService`** (`providedIn:'root'`) — cliente HTTP dos endpoints da `m3-03`/`m3-04`,
   DTOs **do shared** (`./dtos/ficha`), extrai o `dados` do `StandardResponse`, JWT via
   `auth-token.interceptor`.
2. **Tela de criação** (Reactive Forms + Signals) reusando os controles e cálculos da aba
   `agente` da calculadora — `StepInput` e `shared/regras/agente` — **sem duplicar fórmula**
   (consome `shared/regras`, proibição #26/#27). Persiste via `criarFicha`.
3. **Tela de edição** com **stats derivados ao vivo** (vida/energia máximas, defesa,
   deslocamento, dano de corpo/furtivo, limite de inventário, percepção…) computados por
   `shared/regras` a cada mudança (`computed`/`effect`), refletindo o `FichaJogadorDadosDto`
   (`m3-01`); salva via `alterarFicha`.
4. Standalone **lazy** sob rota privada (guard da m2-06); estado em **Signals**; **Reactive
   Forms** (sem `ngModel`); `.scss` + Tailwind + BEM com os tokens do tema.

## Critérios de Aceite

- Jogador cria e edita a **própria** ficha; a edição persiste e recarrega íntegra.
- Derivados exibidos batem com a calculadora (mesma fonte `shared/regras`, sem constante de
  regra no front).
- Padrões do front respeitados: standalone, Signals, Reactive Forms, `.scss`/BEM, tokens
  (proibições #16/#17/#18/#29).

## Fora de Escopo

- Lista de fichas da campanha e visualização por terceiros (`m3-07`).
- Tempo real / tela do mestre ao vivo (`m3-08`).
- Refinamento mobile dedicado (`m3-09`).

## Dependências

- `m3-03` / `m3-04` (endpoints de ficha), `m3-01` (contrato `dados`).
- M1 (calculadora de agente + `shared/regras`) e M2 (sessão/guard/interceptor).
