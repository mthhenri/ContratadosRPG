# m4-04-frontend-criacao-criatura.spec.md

> Task 4/10 do milestone `m4-ficha-criatura-npc.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição
> #29). O protótipo `docs/design/examples/ficha-de-criatura.html` é o alvo de fidelidade
> desktop.

## Objetivo

Assistente de criação de criatura (Ameaça) para o mestre — multi-etapas, guiado pelo
roteiro do "Guia de Criação de Ameaças", com todos os cálculos ao vivo via
`shared/regras/criatura` (`m4-02`), na linha do guia de criação de ficha de jogador
(`frontend/src/app/modules/ficha/paginas/criar/`, `m3-57`/`m3-58`/`m3-59`) — mesma
filosofia de trilha vertical + resumo operacional progressivo, adaptada ao roteiro de
Ameaças em vez do roteiro de agente.

## Entregáveis

1. **Rota do mestre** (guardada, só mestre da campanha) para criar uma criatura —
   convenção de rota espelhando `/painel/:campanhaId/ficha/nova`, ex.
   `/painel/:campanhaId/criatura/nova`.
2. **Passos seguindo o roteiro do guia**: Identidade (designação, origem, conceito,
   natureza física, comportamento, motivação, gancho único, tema de horror) → NA/VD →
   Atributos (base/limite/pontos de ajuste por VD, realocação até 3 pontos) →
   Modificadores (2 Forte/3 Médio/3 Fraco/2 Frágil, um por atributo) → Saúde (Tenacidade →
   Vida Máxima calculada) → Defesa (calculada + indicador de Contra-Ataque) →
   Resistências/Fraquezas (orçamento por limite, ao menos 1 fraqueza) → Regeneração
   (opcional) → Porte/Deslocamento → Ataques (nome/atributo/dano/custo de ação/tipo de
   dano/efeito, com a tabela de dano de referência como apoio, não trava) → Habilidades
   Especiais (Passiva/Ativa/De Gatilho, texto livre) → Revisão + `POST` de criação.
3. **Nenhuma fórmula duplicada** — todo cálculo (base/limite por VD, valor de modificador,
   Vida Máxima, Defesa, limite de resistências, valor de regeneração…) vem de
   `shared/regras/criatura`, via `computed`/Signals, mesmo padrão do guia de jogador.
4. Standalone **lazy**; estado em **Signals**; **Reactive Forms** (sem `ngModel`); `.scss`
   + Tailwind + BEM com os tokens do tema.
5. Mestre consegue reproduzir "A Estátua" ponta a ponta pelo assistente e o resultado bate
   com o documento (critério de aceite do milestone).

## Critérios de Aceite

- Assistente completo, desktop, reproduz "A Estátua" com os mesmos valores do guia.
- Nenhuma fórmula de `shared/regras/criatura` reimplementada no componente.
- Padrões de frontend respeitados (standalone, Signals, Reactive Forms, `.scss`/BEM,
  tokens — proibições #16/#17/#18/#29); comparação visual contra
  `docs/design/examples/ficha-de-criatura.html` registrada (gate obrigatório de UI,
  `AGENTS.md`).

## Fora de Escopo

- Refinamento mobile do assistente — task dedicada (`m4-10`).
- Tela de visualização/edição da ficha de criatura já criada (a criatura segue a mesma
  convenção "snapshot editável no próprio lugar" da ficha de jogador — se precisar de tela
  dedicada além da reutilização de `FichaVisualizacao`/`modo`, registrar como pendência ao
  fechar esta task).
- Listagem/revelação no painel do mestre (`m4-09`).
- NPC (`m4-08`).

## Dependências

- `m4-01` (contrato), `m4-02` (`shared/regras/criatura`), `m4-03` (endpoint de criação).
- Guia de criação de ficha de jogador (`m3-57`/`m3-58`/`m3-59`) como referência de padrão
  de trilha + resumo operacional progressivo.
- `docs/design/examples/ficha-de-criatura.html` (alvo desktop).
