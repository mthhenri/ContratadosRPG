# m7-23-frontend-hub-cenas.spec.md

> Terceira task do milestone `m7-cenas.spec.md` — frontend. Junto com `m7-21`/`m7-22`, entrega o
> pedido imediato do autor: tipar a cena na criação.

## Objetivo

Hub de cenas com o seletor de tipo na criação, chips por tipo, redirecionamento das rotas antigas
de Iniciativa e a renomeação do item de navegação — sem regredir o painel de Combate existente.

## Estado atual

- Rota atual: `campanhas/:campanhaId/iniciativa` e `.../iniciativa/:encontroId`
  (`frontend/src/app/modules/encontro/encontro.routes.ts:19-28`), montadas por `app.routes.ts:59`.
  Comentário no arquivo de rotas explica a ausência de guard: a casca resolve o papel, o backend
  recorta o payload.
- `PainelEncontroShell` (`frontend/src/app/modules/encontro/paginas/painel/painel-shell.page.ts`)
  resolve **papel** (mestre/jogador) e monta `PainelEncontroMestre`/`PainelEncontroJogador`. O
  layout comum das duas vive em `paginas/_casca-iniciativa.scss` (mixin `casca`).
  `docs/design/DESIGN.md:338-407` documenta a composição aprovada (`ui-37`/`ui-39`).
  `EncontroPainelDadosService` (`paginas/painel/encontro-painel-dados.service.ts`) é o provider
  compartilhado pelas duas visões.
- Criação hoje: `painel-mestre.page.html:525-565` — dialog "Novo combate" (`app-modal`), um campo
  "Nome do encontro" (`app-campo`), Cancelar/"Abrir combate"; `painel-mestre.page.ts:263-` monta o
  `formularioCriacao` e chama `criarEncontro()` → `encontroService.criarEncontro(campanhaId, {...})`
  (`.ts:274`).
- `app-coluna-acoes` é o primitivo de navegação lateral (`shared/ui/coluna-acoes/`); o item
  "Iniciativa" hoje aponta para a rota acima.
- `app-chip` (`shared/ui/chip/`) e `app-campo` com `<select>` (padrão do projeto — ver armadilha
  registrada: usar `[selected]` na `<option>`, nunca `[value]` no `<select>`) são os primitivos a
  reusar; nenhum primitivo novo é necessário para o seletor de tipo.

## Entregáveis

1. **`PainelEncontroShell` vira `PainelCenaShell`** (renomear arquivo/classe, mesmo diretório
   reorganizado sob `frontend/src/app/modules/cena/` — ver decisão de escopo abaixo): resolve papel
   **e** consulta `cenaTemIniciativa(cena.tipo)`. `true` → monta `PainelEncontroMestre`/
   `PainelEncontroJogador` como hoje (zero mudança visual/comportamental nesses componentes).
   `false` → monta o painel novo de `m7-24` (esta task só precisa que a bifurcação exista; o
   conteúdo de "sem iniciativa" é entregue lá — usar um placeholder mínimo aqui se `m7-24` ainda não
   estiver pronta, documentado como pendência explícita, não como funcionalidade).
2. **Rotas**: `campanhas/:campanhaId/cenas` (hub) e `.../cenas/:cenaId` (painel de uma cena) sob
   `frontend/src/app/modules/cena/cena.routes.ts`. `encontro.routes.ts` some; `app.routes.ts:59`
   redireciona `campanhas/:campanhaId/iniciativa` → `campanhas/:campanhaId/cenas` e
   `.../iniciativa/:encontroId` → a rota de cena dona daquele encontro (resolvida por uma consulta
   ao backend antes do redirect, já que a URL antiga só tinha o id do encontro).
3. **Hub de cenas** (`cena/paginas/hub/hub-cenas.page.ts`): cena ativa em destaque no topo; lista de
   planejadas em ordem manual (drag ou setas — reusar o padrão de reordenação já existente no
   projeto, se houver um primitivo pronto; senão, setas simples, sem inventar um novo componente de
   drag-and-drop só para isto); histórico de encerradas abaixo. Cada cartão mostra `app-chip` com o
   nome do tipo (`CenaTipoEnum` → rótulo em português, tabela de rótulos nova
   `rotulos-cena.ts`, molde de `rotulos-encontro.ts`).
4. **"Nova cena"**: substitui o dialog "Novo combate" — mesmo `app-modal`, campo "Nome" (`app-campo`
   já existente) mais um `<select>` de tipo (as cinco opções de `CenaTipoEnum`, rótulos em
   português). Duas ações: "Planejar" (`ativarImediatamente: false`) e "Abrir agora"
   (`ativarImediatamente: true`); se já houver cena ativa, "Abrir agora" pede confirmação
   (`ConfirmacaoService`, padrão já usado no projeto) antes de enviar.
5. **Navegação**: item "Iniciativa" da `app-coluna-acoes` (mestre e jogador) renomeado para "Cenas",
   apontando para o hub.
6. **`EncontroService` (frontend)** ganha `CenaService` equivalente para os novos endpoints
   (`m7-22`); `criarEncontro` deixa de ser chamado direto pela tela — a criação passa a ser
   `cenaService.criarCena`.

## Critérios de Aceite

- Criar uma cena exige escolher um tipo; o hub mostra esse tipo como chip em toda cena listada.
- "Planejar" cria uma cena `PLANEJADA` que não aparece para um jogador logado em outra aba (mesma
  campanha) até ser aberta.
- "Abrir agora" com uma cena já ativa pede confirmação e, ao confirmar, a antiga desaparece da
  visão do jogador e a nova aparece, ao vivo.
- Acessar a URL antiga `.../iniciativa` redireciona para o hub; `.../iniciativa/:encontroId` de um
  encontro existente redireciona para a cena correta.
- Uma cena de tipo `COMBATE`/`FURTIVA`/`PERSEGUICAO` aberta mostra exatamente o painel de Iniciativa
  de hoje, sem diferença visual ou funcional — regressão zero em `docs/specs/done/m7-*`.
- `npm run test -w frontend` verde, com testes novos do hub e do dialog de criação.
- Verificação pela skill `verify` em `1920×1080` e `360×800`: criar com os cinco tipos, planejar
  sem vazar ao jogador, abrir, redirecionamento das rotas antigas.

## Decisão de escopo a confirmar no início da task

Mover o módulo `encontro/` inteiro para dentro de `cena/` (subpasta) versus deixá-lo onde está e só
acrescentar `cena/` ao lado, com `PainelCenaShell` importando de `../encontro/...`. A primeira opção
deixa a árvore de arquivos mais honesta com o domínio nesta escala de mudança; a segunda evita um
diff de mover ~35 arquivos numa task que já mexe em rotas e navegação. Registrar a escolha feita e
o porquê no fecho desta task (`HISTORY.md`).

## Fora de Escopo

- Conteúdo do painel sem iniciativa (Investigação/Resistência) — `m7-24`/`m7-25`.
- Passe responsivo dedicado (a tela precisa funcionar em 360px, mas o polimento fino é `m7-26`).
- Qualquer mudança em `PainelEncontroMestre`/`PainelEncontroJogador` além de onde são importados.

## Dependências

`m7-22` (endpoints e eventos de cena), `docs/design/DESIGN.md` ("Iniciativa — visão do mestre"/
"visão do jogador") para a composição preservada.
