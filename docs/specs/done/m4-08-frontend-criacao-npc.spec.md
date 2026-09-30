# m4-08-frontend-criacao-npc.spec.md

> Task 8/10 do milestone `m4-ficha-criatura-npc.spec.md`.

> **Contrato visual:** `docs/design/FICHA-NPC.md`, junto de `docs/design/DESIGN.md` e
> `docs/design/tema/`. Análogos: os assistentes atuais `FichaCriar` e `CriaturaCriar`
> (`frontend/src/app/modules/ficha/paginas/criar/` e `paginas/criar-criatura/`). O mockup
> antigo da ficha de criatura não é referência de assistente nem de shell atual.

## Objetivo

Assistente de criação de NPC para o mestre — o guia descreve o NPC como uma "versão
otimizada" da estrutura de agente, então o assistente é **mais leve** que o de criatura:
menos etapas, mais objetivo. Todos os cálculos ao vivo via `shared/regras/npc` (`m4-06`).

## Entregáveis

1. **Rotas de criação**: `/campanhas/:campanhaId/npc/novo`, restrita ao mestre da campanha,
   e `/fichas/npc/novo` no acervo, antes de `:id`, com a autorização de criação solta já
   decidida na `m4-11` e atendida pela `m4-07`. Não reaproveitar o guia de jogador com
   branches de tipo; página dedicada, composição e primitivas existentes.
2. **Cinco etapas**, cobrindo o roteiro completo: Identidade (nome/função, Categoria/Nível,
   Cooperação) → Atributos e recursos (distribuição, Vida, Defesa, Energia e DT contextual)
   → Habilidades (inclui assinatura mecânica, custo e impacto tático) → Conduta e sanidade
   (três campos de conduta, Sequelas/Traumas e Anotações opcionais) → Revisão + `POST`.
   Conteúdo e agrupamento exatos no contrato visual; sem etapas separadas só para exibir
   cada derivado. Civil mantém Luta/Pontaria em 0 por padrão e exceção explícita do mestre
   conforme a representação fechada em `m4-05`/`m4-06`.
3. **Nenhuma fórmula duplicada** — todo cálculo vem de `shared/regras/npc`.
4. Standalone **lazy**; Signals; Reactive Forms; `.scss` + Tailwind + BEM com tokens.
5. Mestre consegue montar um NPC por Categoria usando a Biblioteca de Referência do guia e
   o resultado bate com os valores calculados (critério de aceite do milestone).
6. **Shell e resumo**: trilha/etapa/resumo do análogo, densidade e hierarquia iguais aos
   guias atuais; resumo progressivo, sem repetir entradas; revisão na organização da ficha
   planejada em `m4-08b`. Categoria e Cooperação são eixos independentes, com texto de apoio
   contextual e valores vindos do motor. Civil mostra “Sem Energia”; demais modelos usam
   os controles e metadados definidos em `docs/design/FICHA-NPC.md`.
7. **Estados e controles**: `shared/ui/` com API completa, confirmação de saída com
   alterações, manutenção dos valores ao voltar, erro de envio sem perda e envio ocupado
   sem duplicidade. Não prometer rascunho persistido sem implementá-lo. Volume é validado
   pelo motor entregue em `m4-06`, sem regra local duplicada. Faixa sugerida de Nível não
   restringe Categoria; a exceção Civil não exige marcador persistido no contrato.

## Critérios de Aceite

- Assistente completo, desktop, reproduz Vida/Defesa/Energia corretos para as 4 Categorias
  com exemplo mecânico (Operativo/Veterano/Elite/Lendário).
- Nenhuma fórmula de `shared/regras/npc` reimplementada no componente.
- Padrões de frontend respeitados; comparação visual contra o análogo escolhido no início
  desta task, registrada (gate obrigatório de UI).
- Gate pela skill `verify` em `1920×1080`, `1366×768`, `960×1080` e `360×800`, com os estados
  do contrato visual: todas as Categorias, Cooperação por faixa, exceção Civil, listas
  vazias/cheias, textos longos, voltar, revisão, erro e envio. Fluxo básico mobile já deve
  funcionar nesta task; `m4-10` amplia a matriz e refina, sem adiar o gate obrigatório.
- NPC criado preserva o tipo e não abre `FichaVisualizacao` de jogador. A ficha completa
  e a navegação de consulta são entregues em `m4-08b`; até ela fechar, não habilitar atalhos
  públicos no acervo/painel que terminem em tela inexistente.

## Fora de Escopo

- Polimento mobile integrado e viewports complementares (`m4-10`).
- Listagem/revelação no painel do mestre (`m4-09`).
- Criatura (`m4-04`, já concluída antes desta task na ordem do milestone).
- Ficha pronta de consulta/edição (`m4-08b`); automação de combate e retomada persistente.

## Dependências

- `m4-05` (contrato), `m4-06` (`shared/regras/npc`), `m4-07` (endpoint de criação).
- `m4-04` (assistente de criatura) como referência de padrão de assistente multi-etapas já
  validado neste milestone.
- `m4-11` (decisões de acervo/criação solta), `docs/design/FICHA-NPC.md` e os análogos atuais.
