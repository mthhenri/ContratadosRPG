# criatura-npc-vd-habilidades-ataques.spec.md

> Task avulsa de refino do M4 (Ficha de Criatura/NPC). Origem: pedido do autor (2026-10-29), anotado
> como trabalho decidido. Não é ideia de `IDEAS.md`.

## Objetivo

Fazer a ficha de Criatura e a de NPC **recalcularem os modificadores de atributo a partir da VD**:
ao alterar a VD, os valores de Forte, Médio, Fraco e Frágil acompanham a tabela do guia, em vez de
o autor ajustá-los à mão até a validação aceitar. Na mesma leva, revisar a seção de **Habilidades e
Ataques** da criatura e do NPC (o escopo exato está em aberto, ver Decisões em aberto).

## Entregáveis

1. **Recálculo automático por VD no motor puro.** Usar `calcularValorModificador` de
   `shared/src/regras/criatura/modificadores.ts` como única fonte para os quatro modificadores.
   Confirmar, antes de codar, se a distribuição fixa (2 Forte, 3 Médio, 3 Fraco, 2 Frágil) de
   `validacao.ts` continua coerente com o recálculo; sem nova fórmula no frontend ou no backend.
2. **Criatura:** ao alterar a VD no formulário de edição, os atributos marcados com cada modificador
   são recalculados e exibidos na hora (DT, rolagem e derivados seguem o novo valor). Os steppers de
   atributo deixam de aceitar um modificador que contradiga a VD atual.
3. **NPC:** mesmo comportamento em `ficha-edicao-npc.service.ts` e `npc-edicao-formulario.service.ts`,
   respeitando a edição do mestre por bloco (snapshots e Salvar/Cancelar da `m4-16`).
4. **Persistência e validação:** o backend valida com `shared/regras` ao salvar, e a ficha gravada
   não pode ficar com modificadores que a VD atual não produz.
5. **Habilidades e Ataques:** levantar com o autor o que precisa melhorar nesses dois blocos e
   registrar a lista na spec antes de implementar esta parte (ver Decisões em aberto).

## Critérios de Aceite

- Testes em `shared/src/regras/criatura/`: VD 5, 10, 15 e 30 produzem os valores da tabela; a
  divergência documentada de Fraco no exemplo "A Estátua" continua registrada e não é "corrigida" pelo
  teste.
- Criatura e NPC: trocar a VD na tela muda os quatro modificadores sem recarregar; salvar grava o
  valor recalculado; a validação não acusa violação de modificador.
- Gate visual com a skill `verify` nos viewports `1920×1080` e `360×800`, para criatura e NPC,
  comparando com o análogo aprovado (`app-atributo-ficha` do Jogador, `m4-18`). Percorrer: alterar VD
  para cima e para baixo, salvar, cancelar e recarregar.
- `npm run test --workspace=shared` e `npm run test --workspace=backend` verdes, e `npm run repo:verificar`
  sem alerta.

## Fora de Escopo

- Exportação de ficha (PDF, modelo, Markdown, HTML): fica em `ficha-exportar-criatura-npc-agente.spec.md`.
- Mudança na fórmula dos modificadores. A fonte é `docs/core/guia_de_mestre-v4.2.0.md`; se a regra
  mudar, a alteração vai pela Oficina das Regras, nunca por código.
- Unificação de layout entre Criatura e NPC além do que já é compartilhado (`m4-18`).

## Dependências

- `m4-18` e `m4-19` concluídas (`docs/specs/done/`): atributos da Criatura e do NPC já usam
  `app-atributo-ficha`.
- Regra do jogo: consultar a skill `regras-do-jogo` antes de tocar no motor.

## Riscos e Mitigação

- **Atalho tentador:** recalcular o modificador no componente de tela. Viola a fonte de verdade; o
  cálculo fica em `shared/regras`.
- **Sobrescrita silenciosa:** se a VD mudar e o autor tiver digitado um modificador à mão, o novo valor
  substitui o digitado. Decidir a regra em aberto antes de codar.

## Decisões em aberto (para o autor)

1. **Habilidades e Ataques:** quais problemas o autor quer resolver nesses blocos (o pedido original
   não detalhou)? Enquanto não houver lista, o Entregável 5 fica aberto.
2. **Modificador manual:** o autor quer poder fixar um modificador diferente do recalculado (ex.: criatura
   de exceção), ou o recálculo sempre prevalece?
