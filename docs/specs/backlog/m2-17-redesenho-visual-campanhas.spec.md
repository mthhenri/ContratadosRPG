# m2-17-redesenho-visual-campanhas.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-16) — task `m2-17`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

**Redesenho visual** das telas de campanha — a **lista** (`/painel`) e o **detalhe**
(`/painel/:id`) — para **reaproveitar melhor o espaço da tela** (desktop e mobile). Hoje ambas são
um **único card centrado de ~680px**, ocupando pouca área útil; a meta é uma composição mais
**densa e dinâmica** que mostre **mais do que já temos** (membros com as suas fichas, papel,
classe/nível, contagens, código de convite) sem espremer. **Só apresentação** — sem novas seções,
sem dados novos e sem tocar em regra de negócio (mesmo espírito da m2-15, agora indo além no
aproveitamento de espaço).

> **Escopo (decisão do autor): só refino/redesenho visual.** Conteúdo decorativo **sem dado real no
> schema** (status ao vivo/agendada/pausada, briefing, log de atividade, indicador online) fica
> **de fora** — como já registrado ao entregar a m2-09/m2-15. "Mostrar mais" = mostrar melhor o que
> **já existe**, não inventar campo novo.

## Entregáveis

1. **Layout que respira a largura no desktop:** sair da coluna única de ~680px para uma composição
   multi-coluna/grade que use a área disponível **sem esticar linha de texto solta** — aplicado à
   **lista** (`/painel`, grade de campanhas) e ao **detalhe** (`/painel/:id`).
2. **Detalhe:** acomodar com hierarquia clara a **lista de membros + fichas inline** entregue na
   **m2-16** (mais densa, papel/classe/nível legíveis), além do bloco de convite e das ações de
   mestre — cada coisa no seu lugar, densidade coerente (padding de card / gap de grade por tokens).
3. **Lista `/painel`:** aproveitar o espaço para exibir melhor o que já temos por campanha (nome,
   descrição, papel, e o que estiver disponível) de forma mais dinâmica de ler.
4. **Fade topo/base** (`appOverflowFade`, o mesmo recurso das listas da calculadora) nas listas que
   rolam (campanhas, membros, fichas por membro), com a máscara em gradiente no SCSS do consumidor.
5. **Mobile preservado** (m2-08): ~360px **sem scroll horizontal do body**, alvos de toque ≥ 44px;
   a densidade desktop não pode regredir o mobile.
6. Idealmente **SCSS-heavy** (como m2-15); se um ajuste exigir marcação, mantê-la mínima e **sem
   tocar em lógica/TS**; **só tokens do tema** (proibição #29), copiando os blocos BEM de
   `docs/design/tema/_componentes.scss` quando necessário.

## Critérios de Aceite

- Lista e detalhe **usam melhor o espaço** no desktop (não mais uma coluna estreita de 680px) e no
  mobile, mais densos/dinâmicos, com a identidade "Terminal de Contenção" preservada.
- **Nenhum** dado/campo/seção nova sem backing no schema; **nenhuma** feature funcional nova.
- **Fade topo/base** presente onde as listas rolam (`appOverflowFade`).
- Responsividade mobile (m2-08) preservada (~360px, sem scroll horizontal, alvos ≥ 44px).
- `lint`/`test`/`build` do frontend verdes.

## Fora de Escopo

- Qualquer **dado novo, campo novo ou mudança de schema/backend**.
- **Conteúdo decorativo** dos protótipos sem dado real no schema (status online/agendada/pausada,
  briefing, log de atividade).
- **Features funcionais** — a estrutura de fichas por membro e a criação são a **m2-16**.

## Dependências

- **`m2-16`** — idealmente **depois** dela, para estilizar a tela com as fichas por membro já no
  lugar (evita retrabalho; mesma relação de m2-13 → m2-15).
- `m2-15` (refino visual anterior a evoluir) e `m2-08` (base responsiva mobile a preservar).
- Protótipos `docs/design/examples/campanhas.html` e `docs/design/examples/lobby-de-campanha.html`.
- `appOverflowFade` (`src/app/shared/overflow-fade/overflow-fade.directive.ts`).
