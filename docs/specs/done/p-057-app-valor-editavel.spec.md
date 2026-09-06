# p-057-app-valor-editavel.spec.md

> Spec avulsa. Corrige `PROBLEMS.md` `P-057` (`ABERTO` · frontend/design system) — decisão do
> autor tomada em 2026-09-06: criar o primitivo `app-valor-editavel` em `shared/ui/`.

## Objetivo

Criar o primitivo `app-valor-editavel` em `shared/ui/` para o papel "valor da ficha que vira
`<input>`/`<select>` de edição ao clicar" — hoje reimplementado em CSS local em ~30 ocorrências
espalhadas por 4 componentes — e migrar todas as ocorrências reais para usá-lo, eliminando a
duplicação sem mudar nenhum comportamento de edição existente.

## Design do primitivo

O primitivo **não** tenta genericizar o tipo do campo de edição (`number`/`text`/`select` variam
de ocorrência para ocorrência, cada um com assinatura de confirmação própria) — ele é dono só da
**máquina de estado exibição↔edição e da identidade visual do estado de exibição**, que hoje é
byte-a-byte idêntica nas ~30 cópias:

- Estado de **edição**: conteúdo do consumidor via `<ng-content />` padrão (o próprio
  `<input>`/`<select>` com `appAutoFocus`, `(keydown.enter)`, `(keydown.escape)`, `(blur)` como já
  são escritos hoje) — o primitivo só decide **quando** mostrar esse conteúdo.
- Estado de **exibição**: um `button[app-botao][estilo="texto"]` interno mostrando `[valor]`, com
  `<ng-content select="[valorEditavelSufixo]" />` para conteúdo extra (ex.: o `<span
  class="criatura__stat-sufixo">` do multiplicador de Tenacidade).
- Estado **desabilitado** (`[somenteLeitura]`): renderiza `<strong>`/`<span>` estático sem botão —
  cobre o caso `[disabled]="!ajustavel()"`/`h1 sem interação` que várias ocorrências já têm.

Inputs: `valor` (`required<string | number>`), `editando` (`required<boolean>`, controlado pelo
consumidor — mesmo padrão de `[aberto]` no `app-modal`/`app-painel-flutuante`), `somenteLeitura`
(`false`), `rotuloAria` (`required<string>`, vira `aria-label="Editar " + rotuloAria()` no botão).
Output: `editarSolicitado` (`void`) — o consumidor decide o que fazer (setar o signal `editando`
correto, igual a `editar(campo)` hoje).

Reaproveita `app-botao[estilo="texto"]` (já existe, `frontend/src/app/shared/ui/botao/`) por
dentro do próprio template — não duplica cor/hover/cursor, herda do primitivo de botão.

## Entregáveis

1. `frontend/src/app/shared/ui/valor-editavel/` novo: `.component.ts`, `.html`, `.scss` (a
   moldura do estado de exibição — cursor, hover, foco — sai do CSS local de cada consumidor e
   vira a única fonte, dentro do primitivo), `.component.spec.ts` cobrindo os 3 estados
   (exibição/edição/somente-leitura) e a emissão de `editarSolicitado`.
2. Migrar `frontend/src/app/shared/ui/barra-recurso/` (2 ocorrências: `atual`/`maximo`) para usar
   `app-valor-editavel` por dentro, removendo o CSS duplicado do próprio primitivo
   (`barra-recurso.component.scss` linhas ~57-81, hoje quase idêntico ao de `ficha-ident__nome`).
3. Migrar `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/` — todas as ocorrências
   `--editavel` que são valor+edição (`ficha-ident__nome`, `__contrato`, `__meta-valor`,
   `ficha-mini__valor` nas suas ~5 ocorrências, `ficha-resistencia__valor`). **Não** inclui
   `ficha-ident__avatar--editavel` (é gatilho de troca de foto, não "valor" de ficha — fora de
   escopo do `P-057`).
4. Migrar `frontend/src/app/modules/ficha/componentes/criatura-visualizacao/` — todas as
   ocorrências `criatura__stat-valor`/`criatura__stat-botao*`, `criatura__designacao--editavel`,
   `criatura__tag-valor` (múltiplas, ex. deslocamento terrestre/voador). **Não** inclui
   `criatura__avatar--editavel` (mesmo motivo do item 3). `criatura__info-nota-texto`: conferir
   antes de migrar se é realmente clicável/editável (não apareceu com `@if editando` nas linhas
   pesquisadas) — se for só texto estático, **não** faz parte deste primitivo e sai do relato de
   fecho como achado à parte.
5. Migrar `frontend/src/app/modules/ficha/componentes/ficha-inventario/` — `ficha-inv__carga-valor`
   e `__municao-valor`.
6. Remover, em cada arquivo migrado, o bloco SCSS local que só existia para estilizar o estado de
   exibição (cursor/hover/foco/disabled) — manter apenas geometria/tipografia específica do
   contexto (tamanho de fonte, cor de contexto) que não é responsabilidade do primitivo.

## Critérios de Aceite

- `npm run test --workspace=frontend -- --include=**/valor-editavel/**` verde, cobrindo os 3
  estados do primitivo novo.
- `npm run test --workspace=frontend`, `npm run lint --workspace=frontend` e
  `npm run build --workspace=frontend` continuam verdes, mesmos números de teste de antes (fora as
  suítes tocadas por este corte).
- `grep -rn -- "--editavel\|stat-botao" frontend/src/app/modules/ficha frontend/src/app/shared/ui/barra-recurso`
  não retorna mais nenhuma classe CSS de identidade de botão/hover local — só, no máximo, uma
  classe companheira de tamanho/tipografia por contexto (auditar manualmente o resultado, não só
  contar linhas).
- **Gate visual obrigatório** (skill `verify`, `1920×1080` e `360×800`): abrir a aplicação real e
  exercitar os 3 estados (exibição, clique→edição, `Enter`/`Escape`/`blur`→confirma/cancela) em ao
  menos: Ficha de Agente (`ficha-visualizacao` — nome, contrato, meta, um `ficha-mini__valor`,
  uma resistência), Ficha de Criatura (`criatura-visualizacao` — designação, um stat numérico, a
  Tenacidade em `<select>`, um deslocamento em tag), Inventário (carga e munição), e a barra de
  Vida/Energia editável da ficha. Comparar hover/cursor/foco antes/depois — devem ficar
  visualmente idênticos ao comportamento atual (`P-057` não muda identidade visual, só remove
  duplicação).
- `PROBLEMS.md` `P-057` sai da lista de Ativos; `HISTORY.md` ganha o bloco desta task no topo.

## Fora de Escopo

- Qualquer classe `--editavel` que seja gatilho de foto/avatar (`__avatar--editavel`) — papel
  diferente ("trocar imagem"), não "valor que vira input".
- Mudar a lógica de confirmação/validação de cada campo (tipo de dado, faixa, arredondamento) —
  o primitivo só troca a moldura, a lógica de `confirmar*()` de cada consumidor continua igual.
- Ampliar `app-botao` — o primitivo novo o consome como está, sem pedir variante nova.
- Migrar ocorrências que a investigação do entregável 4 concluir que não são "valor editável" de
  verdade (ex.: se `criatura__info-nota-texto` for só texto estático) — registrar como achado à
  parte (`PROBLEMS.md`/`IDEAS.md`), não forçar a migração.

## Dependências

Nenhuma. Usa `app-botao` como já existe hoje (`estilo="texto"`), sem pedir mudança nele.
