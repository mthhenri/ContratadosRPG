# ui-01-primitivos-base.spec.md

> Task 1/5 do guarda-chuva `ui-biblioteca-componentes.spec.md`. Origem: `PROBLEMS.md` `P-034`.

## Objetivo

Criar `frontend/src/app/shared/ui/` e os três primitivos de maior duplicação — `Botao`, `Campo` e
`Selecao` —, estabelecer a regra de consumo que substitui o "copie o bloco BEM", e provar os três
adotando-os no módulo `autenticacao` sem alterar um pixel da tela.

## Auditoria (feita antes de implementar, 2026-08-28)

Números medidos sobre `frontend/src/app`, com os métodos anotados no fecho:

| Fato | Medida |
|---|---|
| Blocos `.botao` de topo em SCSS | **20**, praticamente idênticos |
| Chamadas de `.botao` em template | **142** (136 `<button>`, 6 `<a>`) |
| Variantes reais | `--secundario` 62 · `--primario` 59 · `--perigo` 3 · `--positivo` 1 |
| Tamanho do botão | **não está no `.botao`** — vem da classe-companheira do consumidor (`detalhe__acao`, `autenticacao__enviar`…), em mais de dez formas distintas |
| Blocos `.campo` de topo | **4** — e um deles (`painel-encontro`) chama de `.campo` o próprio `<input>`, não o invólucro |
| Invólucro de campo sob outros nomes | **40** blocos `&__rotulo`, sempre mono + UPPERCASE + `--text-mute`; a variação real é só o tamanho (9 / 10 / 11px) |
| `<select>` em `autenticacao` | **0** — os 71 estão em `ficha`, `simulacao`, `campanha`, `encontro` |

Duas correções à premissa da spec saem daí: o "17 arquivos com `.campo`" era contagem de
ocorrências do texto, não de blocos; e a duplicação do campo existe, mas **sob nomes locais**
(`autenticacao__campo`, `perfil__campo`, `.campo`…), não sob um nome só.

## Decisões de arquitetura desta task

**Onde vivem.** `frontend/src/app/shared/ui/<nome>/<nome>.component.{ts,html,scss,spec.ts}`,
standalone, prefixo `app` (exigido pelo `@angular-eslint/component-selector` em
`frontend/eslint.config.mjs`; não mudar a regra para introduzir um prefixo `ui-`).

**O `Botao` é um componente de seletor de atributo — `<button app-botao>`** (decisão tomada com o
autor depois da auditoria, substituindo o `<app-botao>` que esta spec escrevia antes). O host é o
próprio `<button>`/`<a>` do consumidor: nenhum nó novo no DOM (logo nenhum risco de layout nos
containers flex/grid com `gap` onde os 142 botões vivem), a classe-companheira que carrega o
tamanho continua valendo, e `type`, `disabled`, foco e semântica continuam nativos. É o padrão do
`<button matButton>`. Custo: `component-selector` passa de `type: 'element'` para
`['element', 'attribute']` no `eslint.config.mjs` — o **prefixo** `app` continua exigido, que é o
que a decisão original protegia.

**A divisão de responsabilidade do `Botao`:** o primitivo é dono da **identidade** (raio, fonte
mono, cursor, transição, cores da variante, estado desabilitado); o consumidor continua dono do
**tamanho e do layout** (padding, `font-size`/`weight`, `min-height`, alvo de toque, grid). A
auditoria não autoriza outra divisão: não existe um padding "padrão" a extrair — existem mais de
dez, e inventar uma taxonomia de `[tamanho]` seria criar variante sem duplicação medida por trás,
o que esta mesma spec proíbe.

**A `Selecao` sai da ui-01 e vai para a ui-03** (decisão tomada com o autor): `autenticacao` não
tem nenhum `<select>`, e adotá-la em outro módulo contrariaria o "fora de escopo" desta task.
Entregar o primitivo sem consumidor contrariaria "primitivo sem consumidor não fecha". A ui-03
tem módulo com `<select>` para pilotar.

**O `Campo` não recebe `[control]`.** A spec previa `[control]: AbstractControl` com o erro
aparecendo por `touched && invalid`. Os dois únicos consumidores reais mostram que esse portão
mudaria o comportamento: em `registro`, `senha` fica inválida também por `required` (hoje um campo
vazio e tocado não mostra mensagem nenhuma, e `touched && invalid` passaria a mostrar a de
`minlength`), e `confirmacaoSenha` depende de `senhasDivergentes`, que é erro **do formulário**,
não do controle. O `Campo` fica com `[erro]` — a mensagem já filtrada pelo consumidor — e
`[control]` volta à mesa na ui-04, se aparecer um conjunto real de campos com portão
`touched && invalid`.

**Quem é dono do estilo.** O `.scss` **do primitivo**, encapsulado pelo Angular — não um
stylesheet global. `docs/design/tema/_componentes.scss` deixa de ser um catálogo para copiar e
passa a ser documentação que **aponta** para o primitivo correspondente; continua fora do build.
A regra nova, que vale a partir desta task: **componente novo consome o primitivo; copiar bloco
BEM de um componente para outro passa a ser defeito.**

**`Campo` e `Selecao` são shells, não `ControlValueAccessor`.** O consumidor continua escrevendo o
`<input formControlName="...">` / `<select>` nativo e o projeta por `<ng-content>`; o primitivo
entrega rótulo, dica, mensagem de erro, estados e o contorno visual. Isso preserva a proibição de
`ngModel` (`CONVENTIONS.md` → Frontend) sem CVA, e atende tanto os formulários reativos (34
arquivos) quanto os ~185 `<input>` que hoje não são form-bound e vivem presos a Signals.

## Entregáveis

1. **`shared/ui/botao/`** — `button[app-botao], a[app-botao]`, com `[variante]` nas **quatro**
   variantes medidas (`primario`, `secundario`, `perigo`, `positivo`) e nenhuma além delas. O
   primitivo emite as classes canônicas `botao` / `botao--<variante>` no host, para que os
   seletores contextuais que já existem (`.dialogo__acoes .botao--primario`) continuem valendo
   durante a ui-04. Cobrir `disabled` e o `<a>` (6 chamadas). O foco visível **não** entra aqui:
   `styles/tema/_base.scss` já define `a:focus-visible, button:focus-visible` globalmente e
   repetir duplicaria a regra. O alvo de toque no mobile também não: é tamanho, e tamanho é do
   consumidor (ver decisões).
2. **`shared/ui/campo/`** — `app-campo`, shell de campo: rótulo, dica opcional, mensagem de erro
   e `<ng-content>` para o controle. `[tamanho]` nos **três** degraus medidos nos 40 blocos
   `&__rotulo` — `compacto` (9px), `padrao` (10px, o mais comum) e `amplo` (11px +
   `--tracking-label`). O controle projetado tem de continuar sendo **filho direto do `<label>`**,
   senão a regra global de asterisco obrigatório (`label:has(> input:required)`, em
   `styles/tema/_base.scss`) para de casar.
3. **Specs** (`*.spec.ts`, Vitest + `TestBed`) dos dois primitivos: cada variante renderiza a
   classe canônica, `disabled` bloqueia o clique, `Campo` mostra e esconde o erro e preserva o
   controle como filho direto do `<label>`. Asserções por classe BEM, como o resto da suíte.
4. **Adoção-piloto em `autenticacao`** (`login`, `registro` — 2 componentes, 227 linhas de
   template, 714 de SCSS, hoje idênticas entre si a menos de um comentário): trocar botões e
   campos pelos primitivos e **apagar** os blocos BEM locais que eles substituem. É a validação
   por uso da task — primitivo sem consumidor não fecha.
5. **Documentação**: `docs/design/DESIGN.md` §"Componentes visuais base" e a seção "Estilos" de
   `docs/CONVENTIONS.md` passam a mandar consumir o primitivo em vez de copiar o bloco, com a
   ressalva de que a migração dos módulos restantes é a `ui-04` — até lá, código já existente pode
   continuar com sua cópia. Atualizar a skill `design-fidelity` no mesmo passo, **nas duas pastas**
   (`.claude/skills/` e `.agents/skills/`), onde ela manda copiar o bloco BEM.

## Critérios de Aceite

- `npm run test --workspace=frontend -- --include=<spec do primitivo>` verde para os dois; suíte
  ampla do frontend e `npm run lint` (raiz) sem erro novo — falha preexistente (`P-033`) relatada
  em separado.
- Nenhum bloco `.botao` nem invólucro de campo local (`&__campo`, `&__rotulo`, `&__erro`) sobra em
  `modules/autenticacao/**/*.scss`.
- **Gate visual (proibição #31), com pixel diff:** capturar `login` e `registro` em `1920×1080` e
  `360×800` **antes** de tocar no módulo; repetir depois; a diferença tem de ser **zero byte**.
  Percorrer os estados reais dos formulários — vazio, foco, inválido com mensagem, desabilitado
  durante o envio, erro do backend — comparando com o análogo aprovado
  `docs/design/examples/login.html` / `cadastro.html`.
- `diff -r .claude/skills .agents/skills` vazio.
- Fecho auditável conforme `AGENTS.md`: variantes encontradas vs. implementadas, comandos, números
  e o que ficou pendente.

## Fora de Escopo

- Adotar os primitivos em qualquer módulo além de `autenticacao` — é a `ui-04`, e antecipar aqui
  torna o gate visual desta task grande demais para ser confiável.
- `Modal`, `Notificacao` (`ui-02`), `Selecao`, `Cartao`, `Stat`, `Stepper`, `Chip`, `Abas`
  (`ui-03`).
- Tocar em `primeng`/`@primeuix` (`ui-05`).
- Melhorar qualquer coisa na tela de login/registro. Se a comparação revelar defeito visual
  **preexistente**, registrar em `PROBLEMS.md` e deixar como está — pixel diff zero é o critério.
- Criar primitivo sem duplicação medida por trás ("já que estou aqui, um `Badge`").

## Dependências

- `docs/design/DESIGN.md`, `docs/design/tema/_tokens.scss` e `_componentes.scss` — fonte de verdade
  das variantes e dos tokens.
- `docs/design/examples/login.html` e `cadastro.html` — análogos aprovados do piloto.

## Riscos e Mitigação

- **Inventar variante.** Toda variante precisa de uma cópia real que a justifique; a auditoria das
  20 declarações de `.botao` vem **antes** da implementação, e a lista entra no fecho.
- **O shell não cobrir um caso e virar CVA no meio da task.** Se a auditoria mostrar que `Campo`
  não fecha sem `ControlValueAccessor`, parar e registrar em vez de improvisar — a decisão de shell
  está escrita aqui de propósito.
- **Pixel diff impossível por causa de fonte/antialias.** Capturar sempre pela mesma sessão de
  `verify`, mesmo viewport e mesmo zoom; se ainda assim houver ruído sub-pixel, documentar o
  método e comparar por região, nunca abrir mão da comparação.
