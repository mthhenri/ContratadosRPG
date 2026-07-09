# m3-13-ficha-editor-habilidades.spec.md

> Task 13 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> Regras de Habilidades em `docs/core/sistema-v4.1.0.md` — o documento vence (proibição #27).

## Objetivo

Editor **no próprio lugar** da aba **Habilidades** (`m3-11`): a lista `habilidades` do `dados`
(`FichaHabilidadeDto` — `{ nome, categoria (HabilidadeCategoriaEnum), custoEnergia (número|0|null),
descricao }`). Permite **adicionar, editar e remover** habilidades, persistindo no `dados`. Sem
catálogo tipado (a ficha guarda a habilidade desnormalizada, como no contrato `m3-01`).

## Entregáveis

1. **Lista de habilidades** com card por entrada: nome, chip de **categoria**, custo de Energia
   (`[N E]` / `[0 E]` / `[X E]` para `null`), descrição.
2. **Adicionar/editar** in loco: campos `nome`, `<select>` de `categoria`, custo de Energia (stepper
   com opção "variável" → `null`), `descricao` (textarea). **Remover** com confirmação.
3. Cada mutação persiste via `alterarFicha` (otimista), padrão granular de `m3-10` (lápis/＋ por item).
4. Standalone, Signals, Reactive Forms (sem `ngModel`), `.scss`/BEM com tokens.

## Critérios de Aceite

- Dono/mestre adiciona, edita e remove habilidades; recarregar mantém a lista íntegra.
- Custo variável persiste como `null` e é exibido como `[X E]`.
- Categoria vinda de `HabilidadeCategoriaEnum` (shared) — sem enum duplicado no front.

## Fora de Escopo

- Catálogo/tipagem de habilidades por classe/arquétipo e validação de pré-requisitos.
- Efeito mecânico do custo de Energia no gasto em play (só registro na ficha).

## Dependências

- `m3-10` (edição granular), `m3-11` (aba Habilidades), `m3-01` (contrato `FichaHabilidadeDto`).
