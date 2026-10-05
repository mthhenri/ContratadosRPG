# m4-18-ficha-npc-atributos-como-jogador.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, continuação da revisão do NPC.
> Pedido direto do autor (2026-10-05): *"os atributos [do NPC] são muito similares aos atributos
> do jogador, eles têm que ser exibidos iguais aos atributos do jogador… seguiu o que a gente
> tem lá na visão do jogador."* **Promove a `I-047`** de `IDEAS.md`.
>
> Terceira das specs desta frente: `m4-16`
> (`m4-16-ficha-npc-usabilidade-edicao.spec.md`) → `m4-17`
> (`m4-17-ficha-npc-coluna-identidade-compacta.spec.md`) → **`m4-18` (esta)** → `m4-19`
> (`m4-19-npc-testes-de-atributo-regra-e-rolagem.spec.md`). As duas primeiras devem estar em
> `done/` antes: a `m4-16` define **como** o card de Atributos edita (lápis + Salvar/Cancelar no
> bloco) e a `m4-17` fixa a escala da coluna em que o card cabe. A `m4-19` **liga** no NPC as
> linhas do ladrilho que esta task deixa prontas e desligadas.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> **Análogo aprovado obrigatório:** o card **Atributos da ficha de Jogador**
> (`componentes/ficha-visualizacao/ficha-visualizacao.component.html`, `#blocoAtributos`;
> estilos `.ficha-atributos*` e `.ficha-atributo*` em `ficha-visualizacao.component.scss`).
> Análogo secundário: o card Atributos da Criatura (`criatura__atributo-card*`). Mapear shell,
> densidade, hierarquia, espaçamento, controles, estados, iconografia e comportamento
> responsivo — não só "usar os tokens".

## Objetivo

Hoje o card **Atributos** do NPC (`npc-visualizacao.component.html`, segundo `app-cartao` da
coluna 1) usa cinco `app-stat` por linha com o **nome por extenso** e "DT N" como nota, rótulos
de grupo centralizados e a edição em campos `app-campo` com `app-step-input`. A ficha de
Jogador mostra os mesmos 10 atributos em Físicos/Mentais com a **caixa `.ficha-atributo`**:
sigla (DES, FOR, LUT, PON, VIG, INT, MED, SEN, SOC, VON) com nome e DT no `appTooltip`, valor em
destaque, e — em edição — a mesma caixa com o `app-step-input` no lugar do valor. Esta task faz
o card de Atributos do NPC usar **o mesmo componente** do Jogador, com a mesma grade, densidade
e estados, **sem** trazer ainda as linhas que dependem de regra e dados novos do NPC (isso é a
`m4-19`).

## Decisões do autor (2026-10-05 — já tomadas, não perguntar de novo)

1. **Mesmo ladrilho do Jogador; se preciso, expandir o dele.** O autor não vê necessidade de um
   primitivo "só do NPC": *"ele usa o mesmo primitivo que o do jogador, não tem problema.
   Qualquer coisa, a gente altera ou expande o primitivo do jogador para ter uma opção de ter o
   mesmo primitivo, só que sem a possibilidade de aumentar dados e modificadores, se for o caso
   do NPC não ter isso."* Como o ladrilho do Jogador hoje é **receita local** (`.ficha-atributo`
   no template de ~2500 linhas de `ficha-visualizacao`), "o mesmo" significa **extraí-lo** para
   um componente compartilhado — `app-atributo-ficha` em `shared/ui/atributo-ficha/` — e fazer
   **Jogador e NPC consumirem o mesmo componente**. Entradas **opcionais** controlam o que
   aparece: `mostrarModificador`, `mostrarDados`, `mostrarMaestria`, `mostrarLesao`,
   `mostrarRolar` (todas `true` por padrão no Jogador, **configuráveis** para o NPC). Isso
   cobre o "ter ou não ter dados e modificadores" sem duas implementações.
   - **A Criatura não migra nesta task** (tem receita própria `criatura__atributo-card` com
     Modificador de 4 níveis, outra mecânica): fica em `IDEAS.md` como "unificar o ladrilho da
     Criatura".
   - **Condição de parada:** se a extração do Jogador mostrar risco de regressão que a bateria
     de testes + captura antes/depois não cubra (item 1), **parar e perguntar** ao autor entre
     (a) copiar a receita para o SCSS do NPC (terceira cópia, como em `I-045`) ou (b) seguir
     com a extração com mais cobertura. Não decidir sozinho.
2. **Dados e modificadores no NPC: o autor acha que ele deve ter.** *"Ele pode ter uma
   habilidade passiva que aumenta os testes dele em mais 10, por exemplo."* Isso é **regra e
   modelo de dados** (campos novos no `dados` do NPC, regra de teste, rolagem), portanto é da
   **`m4-19`**, que começa por uma auditoria do sistema. **Nesta task** o ladrilho do NPC
   nasce com `mostrarModificador`, `mostrarDados` e `mostrarRolar` **desligados** e a `m4-19`
   os liga. **Não** inventar campo nem fórmula aqui (regra vence o mockup).
3. **Rolagem do NPC:** também é da `m4-19`.

## Entregáveis

### 1. Diagnóstico e rede de segurança (primeiro passo, antes de editar)

Com o app real rodando (**pedir autorização ao autor antes de subir o stack**; ver `verify`),
abrir lado a lado o card Atributos de Jogador, de Criatura e de NPC em `1920×1080` e `360×800`
(leitura **e** edição) e registrar no fecho a **lista de divergências** e a **tabela de medidas**
(largura/altura do ladrilho, `gap`, colunas por linha por viewport, altura do card).
**Antes** de extrair, capturar o card Atributos do **Jogador** em todos os estados que o
ladrilho assume — leitura; com Maestria (estrela); com lesão (`--lesionado` e selo `−N`); com
modificador de teste ativo e negativo; com ajuste de dados; edição; `podeRolar()` verdadeiro e
falso; `1920×1080`, `960×1080`, `1366×768`, `360×800` — e guardar como linha de base para a
comparação pós-extração (**diferença visual zero** é o critério; qualquer mudança no Jogador é
bug desta task). Conferir os testes existentes do Jogador que tocam atributos
(`ficha-visualizacao.component.spec.ts`): eles são a rede de segurança e **não podem ser
enfraquecidos**.

### 2. Extrair `app-atributo-ficha` do Jogador

- Novo primitivo em `shared/ui/atributo-ficha/` (componente + HTML + SCSS + spec), com o desenho
  atual de `.ficha-atributo`/`.ficha-atributo--edicao` movido **sem alteração visual**: sigla
  focável com `appTooltip`/`aria-label` "Nome — DT N", valor, selo de lesão, linha de
  modificador, botão de rolar, estrela de Maestria e o modo edição. Dono da identidade do
  ladrilho (como os demais primitivos); o consumidor só passa dados e recebe eventos.
- Entradas: `sigla`, `nome`, `valor`, `dt` (para o tooltip), `maestria` (bool), `lesao`
  (number), `modificador` (number), `dados` (number), as cinco chaves `mostrar*`, `podeRolar`,
  `editando` (e, em edição, o controle do valor e os steppers de modificador/dados projetados
  via `<ng-content>` ou entradas explícitas — decidir pela API mais simples que mantenha o
  `app-step-input` do consumidor). Saídas: `rolar`, `maestriaAlternada`, e o que a edição
  precisar. **Sem lógica de domínio** dentro (DT, lesão, proficiência continuam calculadas pelo
  consumidor).
- `ficha-visualizacao` passa a usar o primitivo e **perde** o bloco local de ladrilho e o SCSS
  correspondente. Os helpers (`rolarTesteAtributo`, `atributosEfetivos`, `penalidadesLesao`,
  `modificadorTeste`) ficam onde estão. O template do Jogador **encolhe** (hoje ~2500 linhas):
  registrar no fecho quantas linhas saíram.
- Se a extração para o Jogador exigir mudar qualquer comportamento (rolagem, edição,
  rascunho de atributos), **parar** — vale a condição de parada da decisão 1.

### 3. NPC: leitura com o mesmo ladrilho, só com o que o NPC tem hoje

- Cabeçalho do card como o de Jogador: `//`, título "Atributos", régua e lápis (padrão da
  `m4-16`: o lápis some em edição e Salvar/Cancelar aparecem sob o cabeçalho do próprio card).
- Grupos **Físicos** e **Mentais** (ordem e membros iguais ao `gruposAtributos` do Jogador; os
  mesmos 10 atributos: `destreza, forca, luta, pontaria, vigor` e `intelecto, medicina,
  sentidos, social, vontade`), rótulo de grupo, grade e `gap` iguais aos do Jogador **na mesma
  largura de coluna** (a coluna do NPC é mais estreita; a grade acompanha a regra de colunas do
  Jogador, não uma nova).
- Ladrilho `app-atributo-ficha` com sigla, `appTooltip`/`aria-label` "**Nome — DT N**" (a DT
  vem de `dt(campo.chave)` do NPC — **não** recalcular; consumir a regra de `shared/regras/npc`
  que o componente já consome) e o **valor base** de `dados().atributos[chave]`; zero aparece
  como "0". `mostrarModificador`, `mostrarDados`, `mostrarRolar`, `mostrarMaestria` e
  `mostrarLesao` **desligados** — o ladrilho fecha sem vão.
- A frase "DT contextual por atributo. Alterar atributos mantém os recursos salvos." deixa de
  ser nota fixa: a DT vai ao tooltip; o aviso "Alterar atributos mantém os recursos salvos"
  aparece **só em edição**, dentro do card (referência: `criatura__atributos-aviso`).
- Opcional, **perguntar ao autor no diagnóstico**: o chip de fórmula de DT do resumo do Jogador
  (`chip-formula`/`formulaDt`), se a regra de `shared/regras/dt` se aplica ao NPC igualmente
  (Guia de Mestre, "DTs de Atributos": `10 + Nível + Atributo × 2` — a mesma). Se sim, mostrar.

### 4. NPC: edição

- Em edição (bloco, `m4-16`), cada ladrilho **mantém a caixa de leitura** e troca o valor por
  `app-step-input` (`variante="discreto"`, mesmo `tamanho` do stepper do Jogador, `[min]="0"`,
  `[digitavel]` conforme o análogo, `ariaRotulo` com o nome por extenso), como
  `.ficha-atributo--edicao` do Jogador — **sem** os steppers de modificador/dados nem a
  alternância de Maestria (chaves `mostrar*` desligadas).
- Limite por Categoria (`validarAtributosCategoria`: Civil 2 … Lendário 6) e valor inteiro ≥ 0:
  violação **bloqueia Salvar** com aviso **dentro do card**. `[bloquearAumentar]`/
  `[bloquearDiminuir]` enquanto `edicao.salvando()`.
- A edição continua escrevendo no `FormGroup` `atributos` e salvando via `alterarFichaNpc` —
  **contrato, validação e persistência inalterados**. Modo leitor: leitura, sem lápis.

### 5. Responsivo e painel lateral

- `1920×1080`, `960×1080`, `1366×768` e `360×800`: a grade acompanha a do Jogador; nenhum
  overflow; a sigla não é coberta por nenhum selo (o Jogador tem uma regra de largura mínima por
  causa do dadinho — **sem** o dadinho no NPC, o primitivo só aplica a regra quando
  `mostrarRolar`).
- Painel de histórico aberto (`npc--apertado`) não gera overflow nem esmaga a sigla.
- Alvos de toque ≥ 44 px onde há controle (lápis, Salvar, Cancelar, steppers) no mobile.

### 6. Código

- Extrair o card Atributos do NPC para um subcomponente em `componentes/npc-visualizacao/`
  (o template do componente principal já passa de 490 linhas): recebe `dados`, `gerenciavel` e o
  que a `m4-16` definir para a edição.
- Remover o que ficar morto: `npc__atributos`, `npc__subtitulo--centro` (se só servia aqui), o
  uso de `app-stat` neste card, o `app-campo` por atributo em edição. Nenhum hex, fonte ou raio
  solto. `docs/design/DESIGN.md`: entrada do `app-atributo-ficha`.
- `IDEAS.md`: mover `I-047` para "Promovidas" (apontando esta spec) — **já feito na criação das
  specs** — e abrir uma ideia para **unificar o ladrilho de atributo da Criatura**.

## Critérios de Aceite

- Linha de base do Jogador (item 1) × depois da extração: **diferença visual zero** em todos os
  estados e viewports listados; testes do Jogador intactos e verdes.
- Lado a lado com o card de Jogador em `1920×1080` e `360×800`, leitura **e** edição: mesma
  caixa, mesma grade, mesma densidade e hierarquia, mesma sigla com tooltip "Nome — DT N",
  mesmos steppers; **não parece HTML genérico**; sem overflow; foco, contraste e alvos corretos.
- Nenhuma mecânica de Jogador (Maestria, modificador, dados, lesão, rolagem) aparece no NPC
  **nesta task**; os valores mostrados são exatamente os de `dados().atributos` e a DT é a da
  regra existente.
- Nenhuma mudança de conteúdo, regra, fórmula, permissão, DTO, endpoint ou tempo real; salvar
  atributos grava o mesmo `dados.atributos` de antes (conferir por teste do `alterarFichaNpc`).
- Nenhum SCSS/template morto; `app-atributo-ficha` com spec e entrada em `DESIGN.md`; template
  do Jogador menor.

## Verificação exigida

- **Testes:** `app-atributo-ficha` (spec novo: sigla+tooltip, cada chave `mostrar*`, edição,
  zero visível, eventos, foco); `ficha-visualizacao.component.spec.ts` **sem enfraquecer**;
  `npc-visualizacao.component.spec.ts` ajustado: ordem Físicos/Mentais, sigla+tooltip dos 10,
  ausência de Maestria/modificador/dados/rolar, edição com stepper no lugar do valor, valor
  inválido/acima do limite bloqueia Salvar com aviso no card, aviso de recursos salvos só em
  edição, modo leitor sem lápis. Spec focado a cada passo; suíte completa + lint no fecho.
- **Gate visual obrigatório** (`AGENTS.md`, skills `verify` e `design-fidelity`), em
  `1920×1080` **e** `360×800` (mais `960×1080` e `1366×768`): Jogador (regressão, todos os
  estados do item 1) e NPC combatente e Civil; leitura e edição de Atributos (valor válido,
  inválido, salvando, falha); modo mestre e leitor; painel de histórico aberto; sigla com
  tooltip por hover **e** foco de teclado. O agente principal inspeciona pessoalmente e compara.
- Dados de teste por soft delete ao fim.

## Fora de Escopo

- **Dados de teste, modificador de teste, rolagem de atributo e qualquer regra nova do NPC**
  (decisões 2 e 3) — `m4-19`. Aqui as chaves `mostrar*` ficam desligadas.
- Migrar a Criatura para o ladrilho compartilhado.
- O padrão de edição por bloco (`m4-16`), a escala da coluna 1 e a Cooperação (`m4-17`), as
  abas Habilidades/Conduta/Sanidade, a coluna de ações.
- Backend, `shared/regras/npc`, `shared/regras/dt`, DTOs, rotas e permissões.
- Mudar qualquer **comportamento** do Jogador: a extração é refatoração com diferença visual e
  funcional zero.
- Achado fora do escopo vira `PROBLEMS.md`/`IDEAS.md` e aviso ao autor, sem corrigir aqui.

## Dependências

- `m4-16` e `m4-17` em `done/` (nesta ordem). `m4-14` (`done`) — o card atual; `I-047` —
  promovida por esta spec.
- Fontes: `docs/design/DESIGN.md`, `docs/design/tema/`, `docs/core/sistema-v4.1.0.md` (atributos
  e DT — **não alterar fórmulas**), `docs/core/guia_de_mestre-v4.0.0.md` (NPC > Atributos, DTs),
  `shared/regras/` (DT).
- Libera a `m4-19`.

## Riscos e Mitigação

- **Regressão no Jogador** (a tela mais importante do produto): a extração mexe numa tela
  aprovada e grande. Mitigação: linha de base de capturas antes (item 1), testes existentes
  intactos, diff do template revisado linha a linha, e a condição de parada da decisão 1.
- **Encapsulação de estilos:** mover SCSS de `ficha-visualizacao` para o primitivo muda quem
  aplica as regras (`ViewEncapsulation`); conferir seletores descendentes
  (`.ficha-atributos__grade .ficha-atributo`) que cruzam a fronteira e ajustá-los sem alterar o
  resultado visual.
- **Mecânica fabricada:** antes de ligar qualquer linha para o NPC, conferir se o dado
  correspondente existe em `FichaNpcDados`; se não existe, é `m4-19`.
- **Atalho tentador:** reproduzir o aspecto com `app-stat` e CSS local. O pedido é "igual ao do
  Jogador"; o critério é a comparação lado a lado, não "parecido".
