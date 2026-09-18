# editor-markdown-campos-texto-livre.spec.md

> Task solta, sem milestone. Pedido direto do autor em conversa: aplicar edição em Markdown na
> história e nas anotações da ficha de jogador e de criatura, e, de forma mais ambiciosa, também
> no efeito adicional de Ataques e na descrição/restrição de Habilidades. Revisita
> conscientemente a decisão de `docs/specs/done/m3-32-ficha-anotacoes.spec.md` ("Fora de Escopo:
> Rich text/markdown"), por pedido explícito do autor nesta conversa.

## Objetivo

Os campos de texto livre "história" e "anotações" (ficha de jogador e de criatura), "efeito
adicional" (Ataque de criatura) e "descrição"/"restrição" (Habilidade de jogador e de criatura)
passam a ser editados e exibidos como Markdown, usando o mesmo componente de edição já usado no
Caderno de Campanha.

## Entregáveis

1. Promover `EditorMarkdown` (hoje `frontend/src/app/modules/pagina-caderno/
   editor-markdown.component.ts`, usado só pelo Caderno) para primitivo de
   `frontend/src/app/shared/ui/editor-markdown/`. A API pública atual (`valor`/`valorChange`/
   `somenteLeitura`/`documentoColaborativo`/`awareness`) não muda; `pagina-caderno` passa a
   importar do novo caminho, sem mudança de comportamento. O primitivo ganha suporte a
   `ControlValueAccessor` (`NG_VALUE_ACCESSOR`) para poder ser usado com `formControlName` — os
   consumidores de Ataque/Habilidade abaixo usam Reactive Forms, diferente do Caderno.
2. Aplicar `app-editor-markdown` nos seguintes campos, cada um alternando somente-leitura
   (Markdown renderizado) ↔ editável (com a barra de formatação), seguindo o padrão de edição que
   cada tela já usa hoje — sem redesenhar o fluxo de edição em si:
   - `historia` e `anotacoes` da ficha de jogador (`ficha-visualizacao.component.html`) — edição
     inline com Salvar/Cancelar (padrão herdado do lote descrito em `CONTEXT.md`, "descrição/
     efeito/restrição... Anotações da criatura ganhou... botões explícitos Salvar/Cancelar").
   - `anotacoes` da ficha de criatura (`criatura-visualizacao.component.html`), mesmo padrão.
   - `efeito` (rótulo "Efeito adicional") do Ataque de criatura (`criatura-ataque-lista`),
     `formControlName="efeito"` num `FormGroup` reativo.
   - `descricao` da Habilidade de jogador (`ficha-habilidades`), `formControlName="descricao"`.
   - `descricao` e `restricao` da Habilidade de criatura (`criatura-habilidade-lista`),
     `formControlName="descricao"` e `formControlName="restricao"` — `restricao` era um `<input>`
     de uma linha; passa a ser `app-editor-markdown` como os demais (decisão do autor).
3. Dados existentes: nenhuma migração de schema — todos os campos continuam `string` simples no
   mesmo JSONB. Texto plano já digitado é Markdown válido; a primeira renderização mostra o texto
   exatamente como está hoje, sem conversão nem perda.
4. Revisar a decisão de `docs/specs/done/m3-32-ficha-anotacoes.spec.md` (rich text/markdown como
   Fora de Escopo) — não reescrever a spec em `done/` (é registro histórico), só registrar em
   `HISTORY.md` que a decisão foi revisitada por pedido do autor nesta task.

## Critérios de Aceite

- `npm run build --workspace=frontend` e `npm run lint --workspace=frontend` sem erros novos.
- Suíte focada dos componentes tocados (`editor-markdown`, `pagina-caderno`, `ficha-visualizacao`,
  `criatura-visualizacao`, `criatura-ataque-lista`, `ficha-habilidades`,
  `criatura-habilidade-lista`) verde; suíte completa `npm run test --workspace=frontend` sem
  regressão nova (falha pré-existente relatada separadamente, não misturada).
- Gate visual (`verify`): aplicação real, análogo aprovado = o próprio `EditorMarkdown` já em
  produção no Caderno. Viewports `1920×1080` e `360×800`, para cada um dos 6 campos: estado
  somente-leitura (Markdown renderizado) e estado de edição (toolbar, digitação, salvar/cancelar
  ou blur conforme o padrão da tela), incluindo um caso com anotação/descrição já existente (texto
  plano antigo) para confirmar que aparece sem alteração.

## Fora de Escopo

- Colaboração em tempo real (Yjs) nesses 6 campos — só o Caderno usa `documentoColaborativo`/
  `awareness`; os campos desta task ficam no modo privado (mesmo padrão hoje: um editor local por
  usuário, sem presença remota).
- Qualquer outro campo de texto livre da ficha não listado nos Entregáveis (ex.: Personalidade,
  Origem, Gancho/Motivação da criatura) — acharado nesses campos vira `IDEAS.md`, não diff desta
  task.
- Histórico/versionamento de conteúdo Markdown.
- Importação de arquivo `.md` nesses 6 campos (o Caderno já tem `importar-markdown.ts`; não é
  requisito aqui).

## Dependências

Nenhuma spec pendente. Consulta `docs/design/DESIGN.md`/tokens antes de qualquer ajuste visual do
primitivo promovido (mudança de forma/cor não é esperada — só o `styleUrl` muda de pasta).

## Riscos e Mitigação

- `EditorMarkdown` hoje só é usado no modo `[valor]`/`(valorChange)` explícito (Caderno). Ganhar
  `ControlValueAccessor` sem quebrar esse uso existente é o ponto de atenção — cobrir com teste
  focado os dois modos (input/output direto e `formControlName`) antes de tocar os 5 consumidores
  novos.
- `restricao` de Habilidade de criatura era um campo de uma linha; trocar para o editor com
  toolbar multi-linha pode ficar desproporcional visualmente — comparar com o análogo (`descricao`
  ao lado) no gate visual antes de declarar pronto; se destoar, é achado a resolver nesta mesma
  task (o autor já decidiu o campo entra, não é escopo em aberto).
