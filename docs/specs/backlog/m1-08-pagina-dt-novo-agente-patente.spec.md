# m1-08-pagina-dt-novo-agente-patente.spec.md

> Task 8/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Entregar as três páginas leves — `dt`, `novo-agente` e `patente` — agrupadas por serem
pequenas, cada uma consumindo seu domínio de `shared/regras`. Paridade com as abas antigas.

**Antes de qualquer UI, ler `docs/design/DESIGN.md`** e reusar os padrões BEM do tema.

## Entregáveis

1. **Página `dt`** — cálculo de DT de atributo via `shared/regras/dt`.
2. **Página `novo-agente`** — nível/prestígio iniciais, bônus monetário e motivos de entrada
   via `shared/regras/novo-agente`.
3. **Página `patente`** — lookup de patente por prestígio via `shared/regras/patente`.
4. Todas em Reactive Forms + Signals, com steppers da m1-06 e tokens do tema.

## Critérios de Aceite

- Mesmas saídas do site antigo para os mesmos inputs nas três abas.
- Zero regra de jogo duplicada no front; funcionam offline do backend.
- Sem NgModule/`.css`/`style=""`/hex solto (proibições #16–18, #29).

## Fora de Escopo

- Demais abas; conteúdo de ajuda (m1-12); troca de tema em runtime (m1-13).

## Dependências

- `m1-03-regras-dt-novo-agente-patente.spec.md` e
  `m1-06-frontend-calculadora-base.spec.md`.
