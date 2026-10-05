# m4-18-ficha-npc-atributos-como-jogador.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, continuação da revisão do NPC.
> Pedido direto do autor (2026-10-05): *"os atributos [do NPC] são muito similares aos atributos
> do jogador, eles têm que ser exibidos iguais aos atributos do jogador… seguiu o que a gente
> tem lá na visão do jogador."* **Promove a `I-047`** de `IDEAS.md` (ladrilho de atributo do NPC
> igual ao da Criatura/Jogador), que o autor tinha deixado para depois e agora pediu.
>
> Terceira das três specs desta frente: `m4-16`
> (`m4-16-ficha-npc-usabilidade-edicao.spec.md`) → `m4-17`
> (`m4-17-ficha-npc-coluna-identidade-compacta.spec.md`) → **`m4-18` (esta)**. As duas
> anteriores devem estar em `done/` antes: a `m4-16` define **como** o card de Atributos edita
> (lápis + Salvar/Cancelar no bloco) e a `m4-17` fixa a escala da coluna em que o card cabe.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> **Análogo aprovado obrigatório:** o card **Atributos da ficha de Jogador**
> (`componentes/ficha-visualizacao/ficha-visualizacao.component.html`, `#blocoAtributos`;
> estilos `.ficha-atributos*` e `.ficha-atributo*` em `ficha-visualizacao.component.scss`).
> Análogo secundário: o card Atributos da Criatura (`criatura__atributo-card*`, mesma receita
> em leitura e em edição). Mapear shell, densidade, hierarquia, espaçamento, controles, estados,
> iconografia e comportamento responsivo — não só "usar os tokens".

## Objetivo

Hoje o card **Atributos** do NPC (`npc-visualizacao.component.html`, segundo `app-cartao` da
coluna 1) usa cinco `app-stat` por linha com o **nome por extenso** e "DT N" como nota, rótulos
de grupo centralizados e a edição em campos `app-campo` com `app-step-input`. A ficha de
Jogador mostra os mesmos 10 atributos em Físicos/Mentais com a **caixa `.ficha-atributo`**:
sigla (DES, FOR, LUT, PON, VIG, INT, MED, SEN, SOC, VON) com o nome e a DT no `appTooltip`,
valor em destaque, e — em edição — a mesma caixa com o `app-step-input` no lugar do valor.
Esta task faz o card de Atributos do NPC **ter o mesmo desenho, a mesma grade, a mesma
densidade e os mesmos estados** do de Jogador, **sem** trazer para o NPC mecânicas que só o
Jogador tem.

## Decisões de abertura (confirmar com o autor **antes** de implementar)

`shared/ui/` não tem o ladrilho de atributo: ele existe como **receita local** em três lugares
(`.ficha-atributo` no Jogador, `criatura__atributo-card` na Criatura e, hoje, `app-stat` no
NPC); o próprio `Stat` registra que `.ficha-atributo` "mistura exibição com edição e rolagem" e
ficou fora do primitivo. Pela regra do projeto, **criar ou ampliar primitivo é decisão do
autor** — **pergunte** (`AskUserQuestion`, com os trade-offs) e só implemente a escolhida:

1. **Como o NPC ganha o ladrilho.**
   - **A (recomendada): novo primitivo `app-atributo-ficha`** em `shared/ui/` — sigla, nome (para
     tooltip/aria), valor, nota opcional (DT), estado `edicao` (projeta um `app-step-input`),
     slot opcional de selos/ação. Consumido **só pelo NPC** nesta task; migrar Jogador e
     Criatura para ele fica como `IDEAS.md` (as telas aprovadas não são tocadas). Evita uma
     terceira cópia do SCSS e abre caminho para unificar as três.
   - **B: copiar a receita `.ficha-atributo` para o SCSS do NPC** (mesma decisão tomada para
     os cascos `guia__*` e registrada em `I-045`). Rápido e visualmente idêntico hoje, mas é a
     terceira cópia e as três vão divergir.
   - **C: extrair um componente compartilhado e migrar os três** (Jogador, Criatura, NPC). É a
     solução limpa, mas mexe em duas telas aprovadas com regressão visual dupla — maior que
     esta task; só se o autor quiser.
2. **O NPC rola teste de atributo?** A ficha de Jogador tem o dadinho de rolar
   (`ficha-atributo__rolar`, `rolarTesteAtributo`). O NPC **não** tem rolagem de atributo hoje
   e "rolagem" ficou fora de escopo na `m4-14`. **Recomendada: sem rolagem nesta task** (ladrilho
   igual ao do Jogador **sem** o dadinho, sem lugar vazio onde ele ficaria). Se o autor quiser
   rolar, é uma task própria (`shared/regras` + backend de rolagem para ficha NPC + histórico),
   registrada em `IDEAS.md`.

## Entregáveis

### 1. Diagnóstico lado a lado (primeiro passo, antes de editar)

Com o app real rodando (**pedir autorização ao autor antes de subir o stack**; ver `verify`),
abrir lado a lado o card Atributos de uma ficha de Jogador, o de uma Criatura e o do NPC em
`1920×1080` e `360×800` (leitura **e** edição) e registrar no fecho uma **lista de divergências**
e a **tabela de medidas** (largura/altura do ladrilho, `gap`, colunas por linha em cada
viewport, altura do card). Essa lista é o contrato dos itens 2–5; **não implementar nada que não
esteja nela**. Conferir também, no código, o conjunto exato de elementos do ladrilho do Jogador
para decidir o que **se aplica** ao NPC (item 2).

### 2. Leitura: o ladrilho do Jogador, só com o que o NPC tem

- Cabeçalho do card como o de Jogador: `//`, título "Atributos", régua, lápis (padrão da
  `m4-16`: o lápis some em edição e Salvar/Cancelar aparecem sob o cabeçalho do próprio card).
- Grupos **Físicos** e **Mentais** (ordem e membros iguais ao `gruposAtributos` do Jogador; no
  NPC são os mesmos 10 atributos: `destreza, forca, luta, pontaria, vigor` e `intelecto, medicina,
  sentidos, social, vontade`), rótulo de grupo no estilo `.ficha-atributos__rotulo-grupo`,
  grade e `gap` iguais aos do Jogador na mesma largura de coluna.
- Ladrilho: **sigla** no estilo `.ficha-atributo__abrev` focável (`tabindex="0"`), com
  `appTooltip` e `aria-label` "**Nome — DT N**" (a DT já vem de `dt(campo.chave)`; **não**
  recalcular nem duplicar a regra — consumir o que o componente já consome de `shared/regras`),
  e o **valor** base de `dados().atributos[chave]` no estilo `.ficha-atributo__valor`. Zero é
  valor real e aparece como "0".
- **Não** trazer para o NPC (mecânicas que só existem no Jogador; não fabricar campo nem
  fórmula — memória do projeto "mockup divergente das regras: regra vence"): estrela/Maestria,
  Proficiência, linha de modificador de teste, ajuste manual de dados, penalidade de lesão,
  dadinho de rolar (decisão 2). Se o ladrilho do Jogador tiver linhas dessas mecânicas, o do NPC
  simplesmente **não as renderiza** e a caixa fecha sem vão.
- A frase "DT contextual por atributo. Alterar atributos mantém os recursos salvos." deixa de
  ser nota fixa no rodapé do card: a DT vai para o tooltip; o aviso "Alterar atributos mantém os
  recursos salvos" aparece **só em edição**, dentro do card, como aviso discreto
  (`criatura__atributos-aviso` como referência).
- Opcional, **a confirmar com o autor**: o chip da fórmula de DT (`chip-formula`/`formulaDt` do
  resumo do Jogador), se a mesma regra de `shared/regras/dt` se aplica ao NPC — se não, não
  mostrar.

### 3. Edição: mesma caixa, `app-step-input` no lugar do valor

- Em edição (grupo `atributos` do formulário do NPC, conforme `m4-16`), cada ladrilho **mantém a
  caixa de leitura** e troca o valor por `app-step-input` (`variante="discreto"`, mesmo
  `tamanho` do stepper do Jogador, `[min]="0"`, `[digitavel]` conforme o análogo, `ariaRotulo`
  com o nome por extenso), como `.ficha-atributo--edicao` no Jogador — **sem** os steppers de
  modificador/dados e **sem** o botão de maestria.
- Valores inválidos (negativo, não inteiro) bloqueiam o Salvar com aviso **no card**
  (`m4-16`); `[bloquearAumentar]`/`[bloquearDiminuir]` enquanto `edicao.salvando()`.
- A edição continua escrevendo no mesmo `FormGroup` `atributos` e salvando via
  `alterarFichaNpc` — **contrato, validação e persistência inalterados**.
- Modo leitor (`gerenciavel() === false`): ladrilhos de leitura, sem lápis.

### 4. Responsivo e painel lateral

- `1920×1080`, `960×1080`, `1366×768` e `360×800`: a grade acompanha o Jogador (colunas por
  linha e quebra); nenhum overflow; sigla não é coberta por nenhum selo (o Jogador tem uma
  regra de largura mínima por causa do dadinho — sem dadinho, **não** copiar a regra à toa).
- Painel de histórico aberto (`npc--apertado`) não gera overflow nem esmaga a sigla.
- Alvos de toque ≥ 44 px onde há controle (lápis, Salvar, Cancelar, steppers) no mobile.

### 5. Código e primitivos

- Seguir a decisão 1. Se A: `shared/ui/atributo-ficha/` com spec próprio e entrada em
  `docs/design/DESIGN.md`; o primitivo recebe `valor`, `sigla`, `nome`, `nota`, `editando` e
  projeta o controle de edição — **sem** lógica de domínio. Se B: copiar apenas o subconjunto
  usado ao SCSS do NPC e registrar a cópia (referência a `I-045`).
- Extrair o card Atributos para um subcomponente em `componentes/npc-visualizacao/` (o
  template do componente principal já passa de 490 linhas): o subcomponente recebe `dados`, o
  `gerenciavel`, o formulário de edição e emite o que a `m4-16` definir.
- Remover o que ficar morto: `npc__atributos`, `npc__subtitulo--centro` (se só servia aqui), o
  uso de `app-stat` neste card, o `app-campo` de cada atributo em edição. Nenhum hex, fonte ou
  raio solto.
- `IDEAS.md`: mover `I-047` para "Promovidas" (apontando esta spec) e abrir uma ideia para
  **migrar Jogador e Criatura** ao ladrilho único (se a decisão 1 for A) e outra para **rolagem
  de atributo do NPC** (se a decisão 2 for "sem rolagem").

## Critérios de Aceite

- Lista de divergências e tabela de medidas do item 1 no fecho, todas as linhas resolvidas ou
  justificadas.
- Lado a lado com o card de Jogador em `1920×1080` e `360×800`, leitura **e** edição: mesma
  caixa, mesma grade, mesma densidade e hierarquia, mesma sigla com tooltip "Nome — DT N",
  mesmos steppers; **não parece HTML genérico**; sem overflow; foco, contraste e alvos corretos.
- Nenhuma mecânica de Jogador (Maestria, modificador, dados, lesão, rolagem) aparece no NPC; os
  valores mostrados são exatamente os de `dados().atributos` e a DT é a da regra existente.
- Nenhuma mudança de conteúdo, regra, fórmula, permissão, DTO, endpoint ou tempo real; salvar
  atributos grava o mesmo `dados.atributos` de antes (conferir por teste do `alterarFichaNpc`).
- Nenhum SCSS/template morto; primitivo novo (se A) com spec e `DESIGN.md` atualizado.

## Verificação exigida

- **Testes:** `npc-visualizacao.component.spec.ts` (e do subcomponente/primitivo novo) ajustados
  **sem enfraquecer** as asserções existentes de atributos (edição por grupo, rascunho,
  Salvar/Cancelar, modo leitor). Novos: sigla + tooltip "Nome — DT N" dos 10 atributos, valor
  zero visível, ordem Físicos/Mentais, ausência de Maestria/modificador/dados/rolar, edição com
  stepper no lugar do valor, valor inválido bloqueia Salvar com aviso no card, aviso de recursos
  salvos só em edição, modo leitor sem lápis. Spec focado a cada passo; suíte completa + lint no
  fecho.
- **Gate visual obrigatório** (`AGENTS.md`, skills `verify` e `design-fidelity`), em
  `1920×1080` **e** `360×800` (mais `960×1080` e `1366×768`): NPC combatente e Civil; leitura e
  edição de Atributos (valor válido, inválido, salvando, falha); modo mestre e leitor; painel de
  histórico aberto; sigla com tooltip por hover **e** foco de teclado. O agente principal
  inspeciona pessoalmente e compara com Jogador e Criatura.
- Dados de teste por soft delete ao fim.

## Fora de Escopo

- Rolagem de teste de atributo do NPC (decisão 2) e qualquer regra de Maestria, Proficiência,
  modificador de teste, dados de teste ou lesão para NPC — **não existem** no NPC; não inventar.
- **Migrar** Jogador e Criatura para um ladrilho compartilhado (decisão 1, opção A/B); são telas
  aprovadas e ficam intocadas.
- O padrão de edição por bloco (`m4-16`), a escala da coluna 1 e a Cooperação (`m4-17`), as
  abas Habilidades/Conduta/Sanidade, a coluna de ações.
- Backend, `shared/regras/npc`, `shared/regras/dt`, DTOs, rotas e permissões.
- Achado fora do escopo vira `PROBLEMS.md`/`IDEAS.md` e aviso ao autor, sem corrigir aqui.

## Dependências

- `m4-16` e `m4-17` em `done/` (nesta ordem).
- `m4-14` (`done`) — o card Atributos atual; `I-047` (`IDEAS.md`) — promovida por esta spec.
- Fontes: `docs/design/DESIGN.md`, `docs/design/tema/`, `docs/core/sistema-v4.1.0.md` (atributos
  e DT — **não alterar fórmulas**), `shared/regras/` (DT).

## Riscos e Mitigação

- **Terceira cópia que diverge** (opção B): registrar o risco no fecho e deixar a ideia de
  unificação aberta em `IDEAS.md`; preferir a opção A se o autor aceitar um primitivo novo.
- **Mecânica fabricada:** o ladrilho do Jogador tem várias linhas que só fazem sentido para
  ele. Antes de copiar qualquer elemento, conferir se o NPC tem o dado correspondente em
  `FichaNpcDados`; se não tem, o elemento **não** entra (a regra vence o mockup).
- **DT no NPC:** hoje o NPC calcula `dt(chave)` no componente; conferir a fonte (regra em
  `shared/regras`) e reaproveitá-la em vez de reescrever a fórmula no subcomponente/primitivo.
- **Atalho tentador:** reproduzir o aspecto com `app-stat` e CSS local. O pedido é "igual ao do
  Jogador"; o critério é a comparação lado a lado, não "parecido".
