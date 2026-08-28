# ui-01-primitivos-base.spec.md

> Task 1/5 do guarda-chuva `ui-biblioteca-componentes.spec.md`. Origem: `PROBLEMS.md` `P-034`.

## Objetivo

Criar `frontend/src/app/shared/ui/` e os três primitivos de maior duplicação — `Botao`, `Campo` e
`Selecao` —, estabelecer a regra de consumo que substitui o "copie o bloco BEM", e provar os três
adotando-os no módulo `autenticacao` sem alterar um pixel da tela.

## Decisões de arquitetura desta task

**Onde vivem.** `frontend/src/app/shared/ui/<nome>/<nome>.component.{ts,html,scss,spec.ts}`,
standalone, seletor `app-<nome>` (o prefixo `app` é exigido pelo `@angular-eslint/component-selector`
em `frontend/eslint.config.mjs`; não mudar a regra para introduzir um prefixo `ui-`).

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

1. **`shared/ui/botao/`** — `app-botao`. As variantes nascem da auditoria, não de hipótese:
   inventariar as **20** declarações de `.botao` em SCSS e as 24 telas que a usam, listar as
   variantes que existem de fato (o catálogo tem `--primario` e `--secundario`; a auditoria dirá
   se há perigo/fantasma/ícone-só e quais tamanhos), e implementar exatamente essas. Cobrir:
   `disabled`, foco visível (`outline: 2px solid var(--accent-border)`, ver `DESIGN.md`), alvo de
   toque mínimo no mobile, e ícone via `app-icone`. Registrar no fecho a lista de variantes
   encontradas e as descartadas por não ter caso real.
2. **`shared/ui/campo/`** — `app-campo`, shell de campo de formulário: rótulo, dica opcional,
   mensagem de erro, estado inválido/desabilitado, `<ng-content>` para o controle. Input opcional
   `[control]: AbstractControl` — quando presente, o erro aparece por `touched && invalid`; quando
   ausente, o consumidor controla por `[erro]`. Base: as **17** versões locais de `.campo` mais os
   219 `<input>` e 31 `<textarea>` do frontend.
3. **`shared/ui/selecao/`** — `app-selecao`, mesmo contrato de shell, para os **71** `<select>`
   nativos. Auditar os 71 antes de implementar: se houver uma forma dominante de origem de opções,
   oferecer também `[opcoes]`; se não houver, ficar só no shell e registrar a decisão.
4. **Specs** (`*.spec.ts`, Vitest + `TestBed`) dos três primitivos: cada variante renderiza a
   classe canônica, `disabled` bloqueia o clique, `Campo` mostra e esconde erro pelas duas vias
   (`[control]` e `[erro]`), foco e `aria-*` presentes. Asserções por classe BEM, como o resto da
   suíte.
5. **Adoção-piloto em `autenticacao`** (`login`, `registro` — 2 componentes, 227 linhas de
   template, 714 de SCSS): trocar botões, campos e selects pelos primitivos e **apagar** os blocos
   BEM locais que eles substituem. É a validação por uso da task — primitivo sem consumidor não
   fecha.
6. **Documentação**: `docs/design/DESIGN.md` §"Componentes visuais base" e a seção "Estilos" de
   `docs/CONVENTIONS.md` passam a mandar consumir o primitivo em vez de copiar o bloco, com a
   ressalva de que a migração dos módulos restantes é a `ui-04` — até lá, código já existente pode
   continuar com sua cópia. Atualizar a skill `design-fidelity` no mesmo passo, **nas duas pastas**
   (`.claude/skills/` e `.agents/skills/`), onde ela manda copiar o bloco BEM.

## Critérios de Aceite

- `npm run test --workspace=frontend -- --include=<spec do primitivo>` verde para os três; suíte
  ampla do frontend e `npm run lint` (raiz) sem erro novo — falha preexistente (`P-033`) relatada
  em separado.
- Nenhum bloco `.botao`, `.campo` ou `.selecao` sobra em `modules/autenticacao/**/*.scss`.
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
- `Modal`, `Notificacao` (`ui-02`), `Cartao`, `Stat`, `Stepper`, `Chip`, `Abas` (`ui-03`).
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
