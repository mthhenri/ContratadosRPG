# m4-ficha-criatura-npc.spec.md

> **Milestone M4 — Ficha de Criatura/NPC.** Receberá design detalhado quando chegar a vez;
> este spec fixa o escopo acordado. Quebrar em tasks numeradas.

> **A decidir por causa do `m3-10`:** a ficha de jogador adotou "**snapshot na criação + máximos
> editáveis** (não recalcula depois), edição no próprio lugar, atual pode exceder o máximo". Avaliar
> se a criatura/NPC segue a mesma convenção (provável, por consistência — o `SCHEMA.md` já esboça
> stats **stored** para criatura). A **Maestria** é mecânica de atributo de **jogador** e **não** se
> aplica a criaturas.

## Objetivo

Ferramenta do mestre para criar e gerenciar ameaças (criaturas) e NPCs, seguindo o
roteiro de criação do `docs/core/guia_de_mestre-v4.0.0.md`.

## Escopo Acordado

- **Fechamento do contrato `FichaCriaturaDadosDto`** (e variação NPC, se divergir) a
  partir do guia de mestre — atualizar `SCHEMA.md`.
- **`shared/regras/criatura`**: regras do roteiro de criação (atributos, modificadores,
  saúde, defesa, resistências/fraquezas, regeneração, porte, deslocamento, ações),
  testadas contra o guia — incluindo o exemplo de ficha completa do documento como caso
  de teste.
- **Backend**: criação restrita ao mestre (tipos `CRIATURA` e `NPC`); mesmas permissões e
  mecanismos do M3 (dono = mestre; invisível a jogadores; revelável via
  `usuario_ficha_acesso`); eventos WS reusados.
- **Frontend**: assistente de criação de ameaça guiado pelo roteiro do guia; listagem no
  painel do mestre; revelação seletiva a jogadores.
- **Refinamento de UI/UX mobile** (task numerada dedicada no fim do milestone): o assistente
  de criação de ameaça (multi-etapas) e a listagem/revelação no painel do mestre otimizados
  para tela pequena (~360px, sem scroll horizontal, alvos de toque adequados, navegação de
  etapas confortável no polegar), reusando o padrão responsivo por tokens de `m1-15` e a
  identidade `docs/design/` (protótipo `docs/design/examples/ficha-de-criatura.html` é alvo
  desktop). Ver `m1-15-*`.

## Critérios de Aceite (mínimos)

- Mestre monta a ficha de exemplo do guia e o sistema reproduz os valores do documento
- Jogador não vê criatura/NPC sem concessão; passa a ver após revelação
- Nenhuma regra de criação duplicada fora de `shared/regras/criatura`
- Assistente de criação e listagem do mestre usáveis no mobile (~360px) sem scroll horizontal

## Dependências

- M3 (módulo ficha + tempo real)
