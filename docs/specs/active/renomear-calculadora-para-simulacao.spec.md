# renomear-calculadora-para-simulacao.spec.md

> **Task avulsa (pedido direto do autor, 2026-08-25), não é feature de milestone.** O
> número/slot definitivo (`mN-NN`) fica a critério do autor na revisão de backlog.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff do tema "Terminal de
> Contenção" em `docs/design/tema/`. Esta task não muda layout, densidade nem componentes
> visuais — só nomes (rótulo, rota, identificadores de código) — mas o gate visual da seção
> "Critérios de Aceite" ainda se aplica, porque toca a topbar e a tela pública da calculadora.

## Objetivo

Renomear o módulo público hoje chamado **"Calculadora"** (`frontend/src/app/modules/
calculadora/` — abas Agente/Civil, DT, Novo Agente, Patentes, Descanso, Compras, Vendas; M1)
para **"Simulação"**, em todo o código e na interface. O nome "Calculadora" deixou de ser
unívoco: desde `m3-54` existe, dentro da ficha, uma calculadora aritmética de verdade
(`shared/calculadora-flutuante/`, botão flutuante com +, −, ×, ÷) — essa **não muda de nome
nem de escopo**, ela já é a única coisa no app que faz jus ao nome "calculadora". O módulo M1
nunca fez contas de calculadora: ele **simula** números de um agente/civil (atributos, DT,
progressão, patente, descanso, compras/vendas) fora do contexto de uma ficha real persistida —
o nome "Simulação" descreve isso com precisão e resolve a colisão com a calculadora real.

## Estado atual (o que existe)

**Módulo (`frontend/src/app/modules/calculadora/`):**

- `calculadora.routes.ts` (exporta `calculadoraRoutes`) + `calculadora.routes.spec.ts`, montado
  em `app.routes.ts:23-26` sob o path `'calculadora'` (lazy).
- `calculadora-shell.component.ts`/`.html`/`.scss` — classe `CalculadoraShell`, seletor
  `app-calculadora-shell`, interface local `AbaCalculadora`, template com `<h1 class="calculadora__titulo">Calculadora</h1>`
  e `aria-label="Abas da calculadora"`; SCSS com o bloco BEM `.calculadora { &__cabecalho,
  &__titulo }`.
- `estado-abas-calculadora.service.ts`/`.spec.ts` — classe `EstadoAbasCalculadoraService`, tipo
  `AbaCalculadoraComEstado`.
- `componentes/ajuda-calculadora/` — `ajuda-calculadora.component.ts`/`.html`/`.scss`/`.spec.ts`
  (classe `AjudaCalculadora`, seletor `app-ajuda-calculadora`) + `conteudo-ajuda.ts` (tipos
  `AbaAjuda`/`ConteudoAjuda`, já genéricos — não precisam renomear, só os comentários e duas
  strings de texto visível ao usuário, ver abaixo).
- `componentes/step-input/` — genérico, sem menção a "calculadora" no nome; **fora de escopo**.
- `paginas/{agente,dt,novo-agente,patente,descanso,compras}/` — nomes de pasta/arquivo já são o
  nome da aba, não da "calculadora"; **fora de escopo o rename de pasta**, só ajustar comentários
  internos que citam "a calculadora" (ex.: `descanso.page.ts`, `patente.page.ts`).
- `rotulos.ts` — nome de arquivo já genérico; só o comentário de topo cita "calculadora" (linha
  10).

**Fora do módulo, mas acoplado a ele:**

- `app.routes.ts:23-26` — `path: 'calculadora'` + import de `./modules/calculadora/calculadora.routes`.
- `frontend/src/app/shared/layout/layout.component.html:35-38` — item de nav `routerLink="/calculadora"`,
  ícone `nome="calculadora"`, rótulo `Calculadora`.
- `frontend/src/app/shared/layout/layout.component.ts:19-20` — comentário de topo cita
  "nav (Painel/Calculadora)" e "A calculadora permanece pública."
- `frontend/src/app/shared/icone/icone.component.ts` — literal `'calculadora'` no union
  `IconeNome` (linha 44) + o `<svg>` correspondente em `icone.component.html`; comentário de topo
  (linhas 4, 91) cita "abas da calculadora"/"menus de abas da calculadora". O mesmo ícone é
  reaproveitado em `autenticacao/paginas/login/login.page.html:20` (bullet "Stats calculados
  pelas regras oficiais").
- `frontend/src/app/modules/ficha/status-derivado.ts:32` — `import { ROTULOS_PATENTE } from
  '../calculadora/rotulos'` (caminho de import quebra se a pasta for renomeada).
- `docs/design/tema/_componentes.scss:254-255` — comentário listando as famílias de abas
  ("pela calculadora (AGENTE/CIVIL · DT · ...)").

**Não faz parte deste rename (confirmar que continua intocado):** qualquer arquivo/símbolo com
"calculadora" que se refere à calculadora aritmética real (`shared/calculadora-flutuante/**`,
o import `CalculadoraFlutuante` e o signal `calculadoraAberta` em `campanha/paginas/detalhe`,
`ficha/paginas/visualizar(-criatura)`, `encontro/paginas/painel`, e os textos "Abrir calculadora"
em `historico-rolagens-sidebar`) — esses nomes já descrevem a coisa certa e não mudam.

## Entregáveis

1. **Renomear a pasta do módulo e todo arquivo interno** de `calculadora` para `simulacao`:
   - `modules/calculadora/` → `modules/simulacao/`.
   - `calculadora.routes.ts`/`.spec.ts` → `simulacao.routes.ts`/`.spec.ts`; export
     `calculadoraRoutes` → `simulacaoRoutes`.
   - `calculadora-shell.component.{ts,html,scss}` → `simulacao-shell.component.{ts,html,scss}`;
     classe `CalculadoraShell` → `SimulacaoShell`; seletor `app-calculadora-shell` →
     `app-simulacao-shell`; interface local `AbaCalculadora` → `AbaSimulacao`.
   - `estado-abas-calculadora.service.ts`/`.spec.ts` → `estado-abas-simulacao.service.ts`/
     `.spec.ts`; classe `EstadoAbasCalculadoraService` → `EstadoAbasSimulacaoService`; tipo
     `AbaCalculadoraComEstado` → `AbaSimulacaoComEstado`.
   - `componentes/ajuda-calculadora/` → `componentes/ajuda-simulacao/`; arquivos
     `ajuda-calculadora.component.*` → `ajuda-simulacao.component.*`; classe `AjudaCalculadora` →
     `AjudaSimulacao`; seletor `app-ajuda-calculadora` → `app-ajuda-simulacao`.
   - `paginas/**` e `componentes/step-input/` **não mudam de nome** (já genéricos) — só os
     imports que apontam para os arquivos renomeados acima.
2. **Atualizar `app.routes.ts`** — `path: 'calculadora'` → `path: 'simulacao'`, import ajustado
   para `./modules/simulacao/simulacao.routes` / `simulacaoRoutes`. Sem entrada de redirect para
   `/calculadora` (decisão do autor: quebra limpo, sem shim de compatibilidade).
3. **Topbar (`layout.component.html`/`.ts`)** — `routerLink="/calculadora"` → `/simulacao`,
   `<span>Calculadora</span>` → `<span>Simulação</span>`, `nome="calculadora"` → `nome="simulacao"`
   (ícone, entregável 4); atualizar o comentário de topo da classe `Layout` que cita "Calculadora"
   (e, se a task `renomear-painel-para-campanhas` já tiver rodado antes desta, também não deve
   mais citar "Painel" — refletir o rótulo/rota de nav vigente no momento da implementação, não
   necessariamente o texto literal citado aqui).
4. **Ícone (`icone.component.ts`/`.html`)** — renomear o literal `'calculadora'` do union
   `IconeNome` para `'simulacao'` (mesmo `<svg>`, sem redesenhar o traço — é só a chave, a
   calculadora M1 nunca teve um glifo "de calculadora física", o ícone já é abstrato). Atualizar
   os dois usos: `layout.component.html` (entregável 3) e `login.page.html:20`
   (`nome="calculadora"` → `nome="simulacao"`). Ajustar os comentários de topo do arquivo que
   citam "abas da calculadora" → "abas da simulação".
5. **Título e textos da tela (`simulacao-shell.component.html`)** — `<h1
   class="simulacao__titulo">Simulação</h1>` (a classe BEM raiz também vira `.simulacao` no SCSS,
   entregável 6), `aria-label="Abas da simulação"`.
6. **SCSS do shell** — bloco `.calculadora { &__cabecalho, &__titulo }` → `.simulacao { &__cabecalho,
   &__titulo }`. As classes `.abas`/`.chip-classificacao` no mesmo arquivo não mudam (genéricas,
   sem "calculadora" no nome).
7. **`ROTULOS_PATENTE` e o import em `status-derivado.ts`** — atualizar o caminho de import de
   `'../calculadora/rotulos'` para `'../simulacao/rotulos'` (arquivo `rotulos.ts` só muda de
   pasta-mãe, não de nome). Atualizar o comentário de topo de `rotulos.ts` que cita "da
   calculadora".
8. **Textos de ajuda visíveis ao usuário (`conteudo-ajuda.ts`)** — nas duas strings que citam
   "a calculadora" (aba `compras`, campo `texto`: "na barra da calculadora"; campo `nota`: "desta
   calculadora", "a calculadora não modela"), trocar para "a simulação"/"desta simulação"/"a
   simulação não modela". **Não tocar** a referência ao nome próprio do site antigo
   (`contratados-calculadora`, comentário de topo) — é um identificador histórico de outro
   repositório, não o nome deste módulo. Atualizar o comentário "Aba da calculadora que possui
   conteúdo de ajuda" (linha 14) para "Aba da simulação...".
9. **Comentários internos residuais** citando "a calculadora" como nome do módulo atual (não
   como referência ao site antigo nem à calculadora aritmética real) — varrer
   `descanso.page.ts`, `patente.page.ts` e qualquer outro arquivo de `paginas/**` sob a nova
   pasta e trocar por "a simulação". Onde o comentário citar explicitamente "calculadora antiga"
   (referência ao site pré-migração, SYSTEM.SPEC §1), **manter como está** — é sobre o produto
   anterior, não sobre este módulo.
10. **`docs/design/tema/_componentes.scss:254-255`** — atualizar o comentário que lista as
    famílias de abas ("pela calculadora (AGENTE/CIVIL · DT · ...)") para "pela simulação (...)".
    Não alterar nenhum token/regra de estilo, só o comentário.
11. **Specs `.spec.ts` movidos** — cada `*.spec.ts` renomeado no entregável 1 deve continuar
    passando após a renomeação de import/seletor/classe (sem mudar a cobertura, só os
    identificadores referenciados).

## Fora de Escopo

- Qualquer mudança em `shared/calculadora-flutuante/**` ou nos pontos que a consomem
  (`campanha/detalhe`, `ficha/visualizar(-criatura)`, `encontro/painel`,
  `historico-rolagens-sidebar`) — ela já se chama corretamente e não é o alvo desta task.
- Redirect de `/calculadora` para `/simulacao` — decisão do autor: sem shim de compatibilidade.
- Rename de `paginas/{agente,dt,novo-agente,patente,descanso,compras}/` — nomes já descrevem a
  aba, não o módulo "Calculadora".
- Comentários em `shared/src/regras/**` que usam "calculadora" como termo genérico/histórico
  (ex.: "bounds aceitos pela calculadora", "clamps da calculadora antiga") — descrevem
  comportamento herdado do site antigo ou o consumidor de forma genérica, não fazem referência de
  import/rota ao módulo; reescrever esse volume de comentários (uma dezena de arquivos em
  `shared/`) não muda nenhum contrato e está fora do pedido do autor.
- `docs/design/examples/calculadora-de-atributos.html`/`--mobile.html` — mockup já implementado,
  registro histórico do design (`docs/design/examples/README.md`); não é reescrito por esta task.
- `docs/context/HISTORY.md` e qualquer spec em `docs/specs/done/` que mencione "calculadora" —
  registro histórico imutável (regra do `AGENTS.md`/`CLAUDE.md`); não reescrever entradas
  passadas. `docs/context/CONTEXT.md` só é atualizado, ao concluir esta task, nas seções afetadas
  pela regra normal de fechamento — não é reescrita retroativa do histórico.
- Qualquer redesenho visual, novo ícone com traço próprio, ou mudança de comportamento/regra das
  seis abas — é rename puro de identificador e rótulo.

## Critérios de Aceite

- `npm run test --workspace=frontend`: suíte verde, incluindo os specs renomeados
  (`simulacao.routes.spec.ts`, `estado-abas-simulacao.service.spec.ts`,
  `ajuda-simulacao.component.spec.ts`) e qualquer spec de `layout.component`/`icone.component`
  que cubra o rótulo/ícone novo.
- `npm run lint --workspace=frontend`: limpo (sem import quebrado para o caminho antigo
  `modules/calculadora/**`).
- Build do frontend passa; nenhuma referência residual a `modules/calculadora` no código
  (`grep -r "modules/calculadora"` vazio).
- `grep -rn "'calculadora'" frontend/src/app/shared/icone/` não deve mais conter o literal do
  `IconeNome` (só, se sobrar, referências à calculadora aritmética real em outros módulos, que
  são um nome de arquivo/import diferente, não o `IconeNome`).
- Gate visual (skill `verify`, `1920×1080` e `360×800`): topbar mostra o item **"Simulação"**
  apontando para `/simulacao`, com o ícone renomeado sem quebra visual; a tela
  `/simulacao/agente` (e demais abas) abre normalmente, cabeçalho mostra **"Simulação"**; a
  calculadora aritmética real (botão flutuante na ficha) continua funcionando e com seu próprio
  rótulo "Abrir calculadora" intocado — confirma que os dois não foram confundidos pela mudança.
- Navegar para a URL antiga `/calculadora` não resolve mais para o módulo (comportamento
  esperado após remover o redirect — confirmar que não sobrou nenhuma rota morta).

## Dependências

- `frontend/src/app/modules/calculadora/**` (todo o módulo, ver "Entregáveis" 1).
- `frontend/src/app/app.routes.ts`.
- `frontend/src/app/shared/layout/layout.component.{html,ts}`.
- `frontend/src/app/shared/icone/icone.component.{ts,html}`.
- `frontend/src/app/modules/autenticacao/paginas/login/login.page.html`.
- `frontend/src/app/modules/ficha/status-derivado.ts` (import de `ROTULOS_PATENTE`).
- `docs/design/tema/_componentes.scss` (só o comentário citado).
