# ui-01b-botao-paridade-primeng.spec.md

> Continuação da `ui-01` (`docs/specs/done/ui-01-primitivos-base.spec.md`), a pedido do autor.
> Origem: `PROBLEMS.md` `P-034`. Não bloqueia `ui-02`/`ui-03`.

## Objetivo

Dar ao `app-botao` a mesma cobertura de variantes que o `p-button` do PrimeNG 21.1.9 entrega, para
que a saída do PrimeNG (`ui-05`) não deixe o projeto com um botão mais pobre do que o que estava
disponível. A `ui-01` implementou só o que a auditoria media em uso; esta task completa a API pelo
que a biblioteca **oferece**, sem esperar consumidor.

## API do PrimeNG e o que corresponde aqui

Lida de `node_modules/primeng/types/primeng-button.d.ts` e `primeng-types-button.d.ts`
(`primeng@21.1.9`), não de memória.

| PrimeNG | Aqui | Token |
|---|---|---|
| `severity="primary"` | `variante="primario"` | `--accent` |
| `severity="secondary"` | `variante="secundario"` | `--border-strong` + `--text` |
| `severity="success"` | `variante="positivo"` (nome já em uso no produto) | `--positive` |
| `severity="info"` | `variante="info"` | `--energy` |
| `severity="warn"` | `variante="aviso"` | `--warning` |
| `severity="danger"` | `variante="perigo"` | `--accent` (ver Riscos) |
| `severity="help"` | `variante="ajuda"` | **`--help`, token novo** |
| `severity="contrast"` | `variante="contraste"` | **`--contrast`, token novo** |
| `[outlined]` / `[text]` / `[link]` / `variant` | `estilo="contorno" \| "texto" \| "link"` | — |
| `size="small" \| "large"` | `tamanho="pequeno" \| "medio" \| "grande"` | — |
| `[fluid]` | `[fluido]` | — |
| `iconPos` | `posicaoIcone="esquerda" \| "direita" \| "acima" \| "abaixo"` | — |
| `[loading]` + `loadingIcon` | `[carregando]` + ícone `carregando` novo | — |

## Decisões desta task

**Severidade e estilo são eixos ortogonais, como no PrimeNG** — `variante` escolhe a **cor**,
`estilo` escolhe **como a cor é aplicada**. A diferença é que cada variante tem um estilo
**padrão**, que é o que o produto já pratica: `secundario` e `perigo` nascem em `contorno`, as
demais em `preenchido`. Sem isso, `variante="secundario"` passaria a significar "preenchido
cinza" e brigaria com as 20 cópias de `.botao--secundario` que ainda existem nos SCSS de módulo
até a `ui-04`.

**A classe do estilo só é emitida quando o estilo é explícito** (`botao--estilo-contorno` etc.).
Nenhum SCSS legado usa esse nome, então a coexistência com as cópias durante a `ui-04` continua
sem empate de especificidade.

**`tamanho` é opcional e, sem ele, o primitivo não define tamanho nenhum** — a divisão da `ui-01`
(primitivo é dono da identidade, consumidor é dono do tamanho) continua valendo, e os três degraus
entram como **oferta**, não como padrão. Os valores saem dos agrupamentos medidos na auditoria da
`ui-01`, não de conversão das medidas do PrimeNG.

**`rounded` e `raised` ficam de fora** (decisão do autor): `DESIGN.md` diz "sem raio maior que 6px
em nenhum lugar do sistema" e "sem sombra pesada". As duas regras valem mais que a paridade.

## Entregáveis

1. **Tokens novos** `--help` e `--contrast` (+ `-dim` e `-border` pela mesma receita `color-mix`
   das demais cores semânticas) em `docs/design/tema/_tokens.scss` **e** no espelho
   `frontend/src/styles/tema/_tokens.scss`, mais a linha correspondente na tabela de paleta de
   `docs/design/DESIGN.md`. Coerentes com o dark-first e com contraste suficiente sobre `--bg`.
2. **`app-botao` completo**: `variante` (8), `estilo` (4), `tamanho` (3 + ausente),
   `[fluido]`, `posicaoIcone` (4) e `[carregando]`.
3. **Ícone `carregando`** em `shared/icone/` (`IconeNome`), com a animação de giro no SCSS do
   primitivo — não há spinner no projeto hoje.
4. **Specs** cobrindo: cada variante emite sua classe; cada estilo emite a sua e só quando
   explícito; o estilo padrão por variante; `tamanho` ausente não aplica classe de tamanho;
   `carregando` bloqueia o clique e expõe `aria-busy`; `fluido` e `posicaoIcone`.
5. **Atualizar** a linha do `.botao` na tabela de `docs/design/DESIGN.md`, o cabeçalho do bloco em
   `docs/design/tema/_componentes.scss` e o `CONTEXT.md` §4.

## Critérios de Aceite

- Toda severidade do `ButtonSeverity` do PrimeNG tem correspondente, e todo `estilo` é alcançável
  com qualquer `variante` (8 × 4 = 32 combinações válidas).
- `npm run test --workspace=frontend -- --include=<spec do botão>` verde; suíte ampla e
  `npm run lint` (raiz) sem erro novo — `P-033` relatado em separado.
- **Gate visual (proibição #31):** a matriz 8 × 4 renderizada **na aplicação real**, com o CSS
  compilado do primitivo, em `1920×1080` e `360×800`, incluindo `hover`, `:disabled`, foco de
  teclado e `carregando`. Conferir contraste de texto sobre fundo em cada variante preenchida.
- **Pixel diff zero em `login` e `registro`** contra as capturas da `ui-01`: nenhuma variante nova
  pode alterar o que já está em produção.
- `diff -r .claude/skills .agents/skills` vazio; `docs/design/tema/_tokens.scss` e
  `frontend/src/styles/tema/_tokens.scss` com o mesmo conteúdo (só a formatação diverge).

## Fora de Escopo

- `rounded` e `raised` (decisão acima).
- `badge`/`badgeSeverity`: é um segundo componente dentro do botão, não uma variante dele — entra
  como primitivo `Chip`/`Badge` na `ui-03`.
- `[icon]`/`[label]` como **strings**: aqui o conteúdo é projetado, o que já cobre o caso e é mais
  flexível. `posicaoIcone` entrega o que o `iconPos` entregava.
- `plain`, marcado como deprecated no próprio PrimeNG.
- Adotar qualquer variante nova em tela existente — é `ui-04`.
- Redefinir o que `perigo` significa (ver Riscos).

## Dependências

- `docs/design/DESIGN.md` e `docs/design/tema/_tokens.scss` — fonte de verdade da paleta.
- `frontend/src/app/shared/ui/botao/` — o primitivo da `ui-01`.
- `node_modules/primeng/types/primeng-button.d.ts` — a API que serve de referência.

## Riscos e Mitigação

- **Cor nova destoar da identidade.** `--help` e `--contrast` entram na fonte de verdade do tema e
  passam a valer para o sistema inteiro. Mitigação: mesma chroma/lightness das demais cores
  semânticas, e conferência renderizada sobre `--bg` e `--surface` antes de fechar.
- **`perigo` e `primario` colapsarem.** Hoje `perigo` usa `--accent`, que é trocável por usuário —
  com accent vermelho os dois ficam parecidos, e com accent azul um botão destrutivo fica azul.
  O `--vida` (vermelho fixo) resolveria. **Não** mexer aqui: mudaria o significado de uma variante
  já em uso e criaria diferença de pixel na `ui-04`. Registrar em `IDEAS.md` e decidir na `ui-04`.
- **Regressão silenciosa no que já existe.** Toda a API nova é aditiva e nenhuma tela adota nada
  nesta task; o pixel diff contra as capturas da `ui-01` é o que prova.
