# m10-05-primitivo-gaveta.spec.md

> Task do milestone `m10-regras.spec.md`. Independente. Primitivo novo autorizado pelo autor
> (decisão registrada no exemplão, aba *Decisões*, linha "Painel / celular").

> **Antes de qualquer UI:** `docs/design/DESIGN.md` e `docs/design/tema/`; skills
> `design-fidelity` e `verify`.

## Objetivo

Criar `app-gaveta` em `frontend/src/app/shared/ui/gaveta/`: painel que desliza da borda sobre o
conteúdo do seu contêiner, usado pelo leitor de Regras para o sumário/pesquisa no painel flutuante e
no celular, mantendo o texto sempre visível por trás.

## Entregáveis

1. Componente standalone com Signals: `[aberta]` (model), `[lado]` (`inicio` | `fim`), `[rotulo]`
   (nome acessível), conteúdo projetado. Fecha com Esc, clique no véu e ação explícita; devolve o
   foco ao gatilho; prende o foco enquanto aberta.
2. Funciona dentro de um contêiner (painel flutuante) e na viewport (celular) — confinada ao
   ancestral posicionado, sem `position: fixed` global.
3. Tokens e padrões de `_componentes.scss`; movimento respeita `prefers-reduced-motion`.
4. Entrada em `DESIGN.md` (biblioteca de componentes) e teste unitário (abrir/fechar, Esc, foco).

## Verificação

Análogo: `app-painel-flutuante` (borda, sombra, véu) e o menu mobile da topbar. `verify` em
1920×1080 e 360×800, aberta e fechada, teclado e toque.

## Fora de escopo

Uso no leitor (`m10-08`).
