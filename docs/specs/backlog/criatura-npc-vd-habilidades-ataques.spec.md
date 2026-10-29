# criatura-npc-vd-habilidades-ataques.spec.md

> Task avulsa de refino do M4 (Ficha de Criatura/NPC). Origem: pedido do autor (2026-10-29), anotado
> como trabalho decidido. Não é ideia de `IDEAS.md`. Atualizada em 2026-10-29 com as respostas do autor
> e com o diagnóstico do código.

## Objetivo

Fazer os modificadores de atributo acompanharem a VD na ficha de Criatura e levar o mesmo comportamento
ao NPC; e deixar a UX de **Habilidades e Ataques** melhor, que o autor considera ruim hoje.

## Estado atual (diagnóstico do código, 2026-10-29)

- **Criatura — recálculo por VD já existe.** O modelo guarda só o *tipo* de cada atributo
  (`FichaCriaturaModificadoresDto`: Forte/Médio/Fraco/Frágil). O número do modificador é derivado em tempo
  de leitura por `calcularValorModificador({ tipo, vd })` (`criatura-visualizacao.component.ts`,
  `modificadorValor`), e a DT e a rolagem usam o mesmo cálculo (`criatura-rolagem.ts`). Trocar a VD já
  recalcula. Cobertura: `criatura-visualizacao.component.spec.ts` (VD 30 e VD 5) e `modificadores.spec.ts`.
- **Distribuição de tipos:** continua manual (2 Forte / 3 Médio / 3 Fraco / 2 Frágil, `validacao.ts`).
  Trocar a VD não muda o tipo de nenhum atributo.
- **NPC — não existe VD nem tipo de modificador.** `FichaNpcDadosDto` (`shared/src/dtos/ficha/ficha-npc.dtos.ts`)
  tem `categoria` e `nivel`; a DT do NPC é `10 + Nível + (Atributo × 2)` (`docs/SCHEMA.md`). Não há
  nada a "recalcular por VD" no NPC sem decidir primeiro o que o substitui (ver Decisões em aberto).
- **Habilidades e Ataques:** abas da coluna 2 da Criatura (`criatura-visualizacao.component.html`), com
  `app-criatura-ataque-lista` (224 linhas de template) e `app-criatura-habilidade-lista` (165 linhas).
  Não há levantamento de usabilidade desta tela; ver Decisões em aberto.

## Entregáveis

1. **Recálculo por VD na Criatura — já implementado; verificar, não reescrever.** Confirmar com a skill
   `verify` que a troca de VD atualiza na tela os quatro modificadores, a DT e a rolagem, sem recarregar.
   Se algum caminho ainda guardar o número, trocá-lo pelo cálculo derivado.
2. **NPC — aguardando decisão** (Decisões em aberto, item 1). Sem decisão, nenhum código de NPC é alterado.
3. **Habilidades e Ataques — UX a redesenhar.** Antes de qualquer código: rodar a aplicação (`verify`) e
   registrar, por tela (1920×1080 e 360×800), o que o autor achou ruim, com capturas em
   `.artifacts/criatura-npc-vd-habilidades-ataques/`. Só depois, escolher o análogo aprovado e propor a
   mudança (skill `design-fidelity`). Primitivos novos ou ampliados são decisão do autor (CLAUDE.md).

## Critérios de Aceite

- Criatura: VD 5, 10, 15 e 30 produzem os valores de `calcularValorModificador` na tela, na DT e na
  rolagem; os testes existentes continuam verdes.
- Gate visual com `verify` nos viewports `1920×1080` e `360×800` para a Criatura, percorrendo alterar VD
  para cima e para baixo, salvar, cancelar e recarregar.
- Habilidades e Ataques: a mudança de UX tem o análogo registrado, as capturas antes e depois, e a
  comparação visual descrita no gate de `design-fidelity`.
- `npm run test --workspace=shared`, `npm run test --workspace=frontend` e `npm run repo:verificar` verdes.

## Fora de Escopo

- Exportação de ficha (PDF, modelo, Markdown, HTML): `ficha-exportar-criatura-npc-agente.spec.md`.
- Mudança na fórmula dos modificadores. A fonte é `docs/core/guia_de_mestre-v4.2.0.md`; se a regra
  mudar, a alteração vai pela Oficina das Regras, nunca por código.
- Divergência já documentada do Fraco em "A Estátua" (`modificadores.ts`): não é corrigida aqui.

## Dependências

- `m4-18` e `m4-19` concluídas (`docs/specs/done/`): atributos da Criatura e do NPC usam `app-atributo-ficha`.
- Regra do jogo: consultar a skill `regras-do-jogo` antes de tocar no motor.

## Riscos e Mitigação

- **Atalho tentador:** recalcular o número no componente, copiando a fórmula. A fórmula fica só em
  `shared/regras/criatura/modificadores.ts`.
- **UX sem diagnóstico:** redesenhar Habilidades e Ataques sem ver a tela renderizada repete o problema.
  Por isso o Entregável 3 começa por captura e lista de dores.

## Decisões em aberto (para o autor)

1. **NPC:** o NPC não tem VD. Como ele deve ganhar modificadores "como a criatura"?
   - (a) NPC ganha uma VD própria e os mesmos quatro tipos de modificador, separada da Categoria/Nível;
   - (b) os modificadores do NPC são derivados de Categoria e Nível, sem VD;
   - (c) NPC continua como está, e "o mesmo" fica só para a Criatura.
   Escolha (a) muda o modelo do NPC e do guia; (b) e (c) não criam campo novo.
2. **Habilidades e Ataques:** quais problemas o autor sente hoje (informação escondida atrás das abas,
   excesso de campos por linha, leitura de dano/teste, criação/edição, mobile)? Com a lista, o
   Entregável 3 vira proposta de tela.

## Decidido pelo autor (2026-10-29)

- **Modificador manual:** o recálculo sempre prevalece. Não existe valor de modificador fixado à mão, e
  a ficha não guarda o número, só o tipo.
