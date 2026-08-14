# m4-08-frontend-criacao-npc.spec.md

> Task 8/10 do milestone `m4-ficha-criatura-npc.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição
> #29). Sem protótipo desktop dedicado para NPC ainda — avaliar nesta task se
> `docs/design/examples/ficha-de-criatura.html` serve de análogo aprovado (mesma
> densidade/hierarquia de assistente multi-etapas) ou se é preciso um protótipo próprio
> antes de implementar (gate obrigatório de UI, `AGENTS.md` — "componente análogo
> aprovado").

## Objetivo

Assistente de criação de NPC para o mestre — o guia descreve o NPC como uma "versão
otimizada" da estrutura de agente, então o assistente é **mais leve** que o de criatura:
menos etapas, mais objetivo. Todos os cálculos ao vivo via `shared/regras/npc` (`m4-06`).

## Entregáveis

1. **Rota do mestre** (guardada), ex. `/painel/:campanhaId/npc/novo`.
2. **Passos seguindo o roteiro do guia**: Identidade Narrativa (nome, função) → Categoria e
   Nível → Nível de Cooperação → Atributos (pontos por Categoria, cap por atributo,
   trava de Luta/Pontaria em 0 para Civil com exceção manual) → Saúde (Vida calculada) →
   Defesa (Base/Bloquear/Esquivar calculados) → Energia (modelo conforme a Categoria) →
   Habilidades (Passiva/Ativa, volume por Categoria como guia, não trava dura) → Conduta de
   Combate (gatilhos de fuga, prioridades de alvo, reação a ferimento severo) → Revisão +
   `POST` de criação.
3. **Nenhuma fórmula duplicada** — todo cálculo vem de `shared/regras/npc`.
4. Standalone **lazy**; Signals; Reactive Forms; `.scss` + Tailwind + BEM com tokens.
5. Mestre consegue montar um NPC por Categoria usando a Biblioteca de Referência do guia e
   o resultado bate com os valores calculados (critério de aceite do milestone).

## Critérios de Aceite

- Assistente completo, desktop, reproduz Vida/Defesa/Energia corretos para as 4 Categorias
  com exemplo mecânico (Operativo/Veterano/Elite/Lendário).
- Nenhuma fórmula de `shared/regras/npc` reimplementada no componente.
- Padrões de frontend respeitados; comparação visual contra o análogo escolhido no início
  desta task, registrada (gate obrigatório de UI).

## Fora de Escopo

- Refinamento mobile (`m4-10`).
- Listagem/revelação no painel do mestre (`m4-09`).
- Criatura (`m4-04`, já concluída antes desta task na ordem do milestone).

## Dependências

- `m4-05` (contrato), `m4-06` (`shared/regras/npc`), `m4-07` (endpoint de criação).
- `m4-04` (assistente de criatura) como referência de padrão de assistente multi-etapas já
  validado neste milestone.
