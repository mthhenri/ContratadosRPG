# m2-12-frontend-edicao-exclusao-campanha.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-09) — task `m2-12`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

UI de **edição** (renomear + descrição) e **exclusão** da campanha na tela de detalhe — só
para o mestre. O backend **já existe** (`alterarCampanha`/`excluirCampanha` da m2-04); aqui é
só a camada de frontend.

## Entregáveis

1. Na tela de **detalhe** (`/painel/:id`), para o mestre (`ehMestre` já derivado —
   [detalhe.page.ts](frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.ts)):
   - **editar** nome/descrição (Reactive Forms — inline ou modal, seguindo o padrão das telas
     existentes) → `alterarCampanha`, refletindo o resultado na tela e no
     `CampanhaContextoService` (topbar);
   - **excluir** a campanha com **confirmação** → `excluirCampanha`, navegando de volta à
     lista (`/painel`).
2. **`CampanhaService`** (frontend) ganha `alterarCampanha` e `excluirCampanha` (cliente HTTP
   dos endpoints existentes; DTOs **do shared**).
3. A UI respeita a permissão (só o mestre vê as ações), mas a **autoridade é o backend** (§14)
   — o front não duplica regra.
4. Estado em **Signals**, standalone, **Reactive Forms**, `.scss`/BEM com os tokens do tema.

## Critérios de Aceite

- Mestre renomeia / edita a descrição e vê o resultado refletido (inclusive no seletor da
  topbar).
- Mestre exclui a campanha (com confirmação) e é levado de volta à lista.
- Jogador não vê as ações de edição/exclusão; a tentativa direta seria barrada pelo backend e
  tratada pelo `error-handler`.
- Padrões do front respeitados (proibições #16/#17/#18/#29).

## Fora de Escopo

- Gestão de membros — remover/transferir mestre (`m2-13`).
- Refino visual geral da tela de campanhas (`m2-15`).
- Backend (já entregue na m2-04).

## Dependências

- `m2-07` (tela de detalhe e `CampanhaService`).
- `m2-04` (endpoints `PUT`/`DELETE /campanha/:id`).
