# m1-16-preset-cor-salvo-tema.spec.md

> Task 16/14+ do milestone `m1-calculadora-paridade.spec.md` — **refinamento** do sistema de
> tema em runtime (m1-13), adicionada após o fechamento da paridade (m1-14). Estende o
> `TemaService`/`ConfiguracoesTema` já existentes; não redefine a identidade visual.

## Objetivo

Permitir **salvar a cor custom** escolhida no color picker como um **preset reutilizável e
persistente**, para não ter que reescolher a cor a cada vez. Só existe **um** slot de preset
custom por vez (o novo salvamento sobrescreve o anterior). Além disso, quando a cor salva
ficar **visualmente incompatível** com a base ativa (ex.: accent branco salvo na base escura →
ao trocar para a base clara ele fica ilegível), a UI **inverte a cor apenas visualmente** para
mantê-la legível, mas **mantém salva a cor original** que você escolheu — ao voltar para a base
compatível, a cor original volta a ser aplicada tal como salva.

**Antes de qualquer UI, ler `docs/design/DESIGN.md` e consumir o handoff de tema em
`docs/design/tema/`.** O dark base + IBM Plex são a **identidade fixa**; só o `--accent` (e a
base clara/escura) é trocável. Toda cor continua vivendo no `TemaService` (contraparte em
runtime de `_tokens.scss`) — **nenhum hex/fonte/raio solto** no SCSS/template (proibição #29).

## Contexto (estado atual)

- `TemaService` (`frontend/src/app/core/services/tema.service.ts`) já persiste `accentCustom`
  em `localStorage` (`contratados-rpg:tema`), mas **não há um slot re-selecionável**: ao
  reabrir o painel a cor precisa ser reescolhida no `<input type="color">`; não existe um
  swatch "minha cor salva" ao lado dos 4 presets fixos (`PRESETS_ACCENT`).
- Hoje, ao trocar de base, `definirBase` **descarta** o accent custom quando ele fica travado
  na nova base (`this._accentCustom.set(null)` + fallback para `accentAlternativoParaBase`) —
  ou seja, a cortesia atual é **perder** a cor, não preservá-la. Esta task troca esse
  comportamento por **inverter visualmente preservando a cor salva**.
- `definirAccentCustom` rejeita (retorna `false`) uma cor com contraste insuficiente **na base
  atual** — a trava de contraste (`estaTravado`/`travadoParaBase`/`CONTRASTE_MINIMO`) continua
  válida. O caso desta task é a incompatibilidade que só surge **ao trocar de base** (a cor era
  legível na base em que foi salva e deixa de ser na outra).
- Painel `ConfiguracoesTema` (`frontend/src/app/shared/configuracoes-tema/`) é onde o swatch
  salvo e o botão de salvar devem aparecer.

## Entregáveis

1. **Slot de preset custom persistente (um por vez).** Salvar a cor atual do color picker como
   um preset custom que:
   - aparece como um **swatch selecionável** no painel `ConfiguracoesTema`, junto dos 4 presets
     fixos, e pode ser **re-selecionado** sem reabrir/rediscar o picker;
   - **sobrevive a reload/reabertura** (persistido em `localStorage`, junto do estado de tema
     existente — sugestão: um campo dedicado tipo `accentCustomSalvo` em `TemaPersistido`,
     distinto do `accentCustom` "ativo");
   - é **único**: salvar de novo **sobrescreve** o slot anterior (não acumula lista de presets).
2. **Inversão visual por incompatibilidade de base, preservando a cor salva.** Ao trocar de
   base (ou ao restaurar no boot), se a cor custom salva/ativa ficar ilegível na base ativa,
   aplicar uma **variante visual adaptada e legível** ao `--accent`, **sem alterar o valor
   salvo**. Quando a base voltar a ser compatível, a cor **original** volta a ser aplicada.
   Substitui o descarte atual em `definirBase`.
3. **UI no painel `ConfiguracoesTema`.** Botão/ação de **salvar a cor** do picker, o **swatch
   do preset salvo** (com estado selecionado quando ativo) e, quando a cor salva estiver sendo
   exibida invertida por incompatibilidade, uma **indicação discreta** de que a cor original
   permanece guardada (paridade de linguagem com o aviso de contraste já existente). Consumir
   **só tokens** do tema.

## Critérios de Aceite

- Salvar uma cor no picker cria **um** swatch custom re-selecionável; ela **persiste** após
  reload e pode ser reaplicada com um clique, sem reabrir o picker.
- Salvar uma nova cor **substitui** o slot anterior (nunca mais de um preset custom salvo).
- Com a cor salva ilegível na base ativa (ex.: branco salvo no escuro → base clara), o
  `--accent` exibido é uma variante **legível** (respeita `CONTRASTE_MINIMO` contra a superfície
  da base ativa), **e** o valor salvo permanece a cor original; ao retornar à base compatível, a
  cor original é reaplicada exatamente como salva.
- A trava de contraste existente continua bloqueando a **definição** de cores ilegíveis na base
  atual (comportamento de `definirAccentCustom` preservado); a inversão é só para a
  incompatibilidade **surgida ao trocar de base**.
- Identidade preservada (dark base + IBM Plex); **tudo via tokens** — sem hex/fonte/raio solto,
  sem `style=""`, sem `.css` avulso. As cores continuam centralizadas no `TemaService`.
- **Zero alteração de regra de jogo** — `shared/regras` intocado; suítes `shared` e `frontend`
  verdes (novos testes para o slot salvo e para a inversão preservando o valor); build dentro do
  budget.

## Notas de implementação (não normativas)

- A "inversão visual" precisa garantir **legibilidade**, não apenas complemento de RGB: o
  complemento (`255 − canal`) resolve o exemplo branco↔preto, mas cores de meio-tom podem
  continuar ilegíveis. Requisito real: a variante exibida **passa `CONTRASTE_MINIMO`** na base
  ativa (ajustar luminância/inverter até atingir o piso). Manter as funções puras
  (`razaoContraste`/`luminanciaRelativa`) já existentes como base.
- Reusar `accentAlternativoParaBase` só como último recurso caso nenhuma variante da cor salva
  atinja o piso — mas o caminho principal é **adaptar a própria cor**, não trocá-la por um preset.

## Fora de Escopo

- Múltiplos slots custom / galeria de presets salvos (é **um** slot por vez, por decisão desta
  task).
- Redefinição da identidade visual ou novos tokens de base (já fixados em `docs/design/`).
- Persistência de tema por campanha/usuário no backend (fora do M1).
- Qualquer mudança em fórmula/regra (`shared/regras`) ou no conteúdo das abas da calculadora.

## Dependências

- `m1-13-sistema-temas-runtime.spec.md` (o `TemaService`, a trava de contraste e o painel
  `ConfiguracoesTema` que esta task estende).
