# m7-02-regras-encontro.spec.md

> Task 2/8 do milestone `m7-encontro-combate.spec.md`.

## Objetivo

Implementar o **motor puro** do encontro em `shared/src/regras/encontro/` — ordenação de
iniciativa, intercalação de Cadência e ciclo de vida das condições por rodada. Funções puras, zero
dependências, testadas contra `docs/core/guia_de_mestre-v4.0.0.md`. Sem banco, sem service, sem UI.

## Entregáveis

1. **`ordenarIniciativa`** — ordena combatentes por iniciativa **decrescente**. Desempate: maior
   **Destreza efetiva**; persistindo o empate, preserva a ordem de entrada (estável), deixando o
   ajuste fino para o mestre (o sistema não fixa desempate além disso).
2. **`intercalarCadencia`** — recebe os combatentes já ordenados e devolve `OrdemTurnoDto[]`, a
   sequência de turnos da rodada. Regra do guia ("Intercalação na Iniciativa"): o k-ésimo turno de
   um combatente (k ≥ 2) cai **um slot abaixo** de onde caiu o seu turno anterior; turnos extras
   cascateiam para baixo e **nunca** se acumulam em sequência.
3. **`calcularTurnosPorRodada`** — `CadenciaEnum` → número de turnos. **Reusar** o mapa que já
   existe em `shared/src/regras/criatura/cadencia.ts` se ele servir; não duplicar a tabela.
   Combatente sem cadência declarada (agente/NPC) é **Singular**.
4. **`expirarCondicoes`** — na virada de rodada, decrementa `rodadasRestantes` de cada condição e
   remove as que chegaram a zero; condições com `rodadasRestantes: null` são permanentes até
   remoção manual. Devolve as condições resultantes **e** as que expiraram (para o log).
5. **`combatentePerdeTurno`** — dado o conjunto de condições, informa se o próximo turno do
   combatente é consumido (marcador `perdeTurno`, ex.: `Inconsciente`, `Insolação`).
6. **Testes** (`*.spec.ts`, mesmo padrão de `shared/regras/criatura`), incluindo:
   - **Caso canônico do guia**: Criatura Cadência Dupla `[18]`, Agente A `[17]`, Agente B `[3]` →
     `Criatura → Agente A → Criatura (2ª ocorrência) → Agente B`.
   - Tríplice e Frenética (4 turnos), inclusive quando os slots abaixo acabam (o excedente vai para
     o fim da rodada, mantendo a proibição de sequência).
   - Duas criaturas de cadência múltipla na mesma rodada.
   - Desempate por Destreza e estabilidade da ordem.
   - Expiração de condição na virada, condição permanente e perda de turno.

## Critérios de Aceite

- O exemplo do guia é reproduzido **exatamente** por um teste dedicado
- `npm run test -w shared` verde; nenhuma regra de encontro fora de `shared/regras/encontro`
- Funções puras: sem I/O, sem data/hora, sem aleatoriedade (a rolagem de iniciativa é do módulo de
  rolagem, não daqui)
- `npm run lint -w shared` limpo

## Dependências

- `m7-01` (DTOs `OrdemTurnoDto`, `CondicaoCombatenteDto`, enums)
