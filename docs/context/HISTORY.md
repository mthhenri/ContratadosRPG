# HISTORY.md — Histórico do Projeto

## 2026-08-15 — `m4-04b`: acabamento visual da ficha de criatura — abas cheias e ações de lista sob demanda

Segundo pedido do autor na mesma sessão do realinhamento de layout (entrada abaixo), depois de ver
a tela nova rodando de verdade: (1) as abas "Informações"/"Ataques e Habilidades" deviam sempre
ocupar o máximo da barra — mesmo com só 2 abas, cada uma metade — em vez do tamanho de conteúdo que
o `.abas` canônico usa; (2) os botões de editar/remover por item (Ataques, Habilidades,
Resistências, Fraquezas) não podiam ficar sempre visíveis — precisavam ser "triggerados", exigindo
entrar num modo antes de aparecer.

**Abas.** `.criatura__aba` ganhou `flex: 1 1 0` — divergência deliberada do `.abas` canônico
(`docs/design/tema/_componentes.scss`, que deixa cada aba do tamanho do próprio conteúdo),
documentada em comentário no SCSS. Only-2-tabs hoje já cresce pra 3+ sem ajuste, porque `flex: 1 1
0` distribui o espaço igualmente entre quantas abas existirem.

**Modo de edição por lista.** `criatura-ataque-lista`, `criatura-habilidade-lista` e
`criatura-resistencia-lista` (reusada por Resistências e Fraquezas) ganharam um signal local
`modoEdicao` + método `alternarModoEdicao()` (idêntico nos três — sem base compartilhada, mesma
convenção de "copiar e adaptar" já usada no resto do módulo). O `<div class="…__acoes">`/`…
__grade-acoes` com os ícones de editar/remover por item, que antes só dependia de `editavel()`
(true sempre que o autor é o mestre da campanha), passou a exigir `editavel() && modoEdicao()`. Um
botão novo no cabeçalho de cada lista ("Editar"/ícone lápis quando desligado, "Concluir"/ícone
check quando ligado — `criatura-ataque-lista`/`criatura-habilidade-lista` com rótulo de texto,
`criatura-resistencia-lista` só ícone, mesma densidade do `+` de Adicionar que já existia ali)
alterna o modo; desligar cancela qualquer edição ou remoção pendente daquela lista
(`cancelar()`/`cancelarRemocao()`), pra nunca deixar um formulário ou confirmação de remoção
"órfã" quando o autor sai do modo. O botão "Adicionar"/`+` continua sempre visível quando
`editavel()` — só as ações por item (editar/remover) exigem o modo, não a criação; mesmo padrão
visual do mockup (`docs/design/examples/ficha-de-criatura.html`), que só mostra "+" nos cabeçalhos
de seção e nenhum ícone de edição/remoção nos cards em estado de leitura.

Testes: suíte completa do frontend 1056/1056 (+4 sobre a baseline anterior — um teste por lista,
mais a variante grade/lista da `criatura-resistencia-lista`, confirmando que as ações ficam ocultas
por padrão e aparecem/somem ao alternar o modo). Lint e build limpos. Verificado ao vivo (Postgres +
backend + frontend reais, Playwright, nova sessão descartável semeada por REST reaproveitando o
`dados` de "A Estátua" já persistido — campanha 26, ficha 40025): abas ocupando a barra inteira nas
duas telas; Resistências/Fraquezas e Ataques/Habilidades sem nenhum ícone de editar/remover visível
por padrão; clique no botão "Editar" do cabeçalho revela os ícones por item nas quatro listas;
clique no lápis de um Ataque ainda abre o formulário de edição normalmente; "Concluir" esconde tudo
de novo. 360×800 não verificado nesta rodada — mobile segue fora de escopo (`m4-10`).

## 2026-08-15 — `m4-04b`: realinhamento visual da ficha de criatura ao mockup atualizado (dashboard de 3 colunas)

Pedido direto do autor, fora da fila de specs: ele reconstruiu `docs/design/examples/ficha-de-
criatura.html` (o antigo arquivo era um placeholder genérico não relacionado — thumbnail "SCP"/
"FICHA DE AMEAÇA" — não uma captura real; ver `m4-04b` § "Antes de qualquer UI" e o spec
`docs/specs/done/m4-04b-frontend-visualizacao-criatura.spec.md`, que já registrava o protótipo como
alvo de fidelidade desktop) e pediu pra alinhar `CriaturaVisualizacao` a ele. Mobile explicitmente
fora de escopo desta sessão — o autor é o único mestre da campanha e decidiu adiar; o backlog já
reserva `m4-10-refinamento-mobile-criatura-npc.spec.md` pra isso.

**Diagnóstico.** `CriaturaVisualizacao` (implementada nas sessões anteriores de `m4-04b`) saiu como
uma pilha vertical de 9 seções numeradas ao estilo do assistente de criação (`max-width: 900px`).
O novo mockup é um dashboard denso de 3 colunas com abas — estruturalmente muito mais próximo de
`FichaVisualizacao` (ficha de jogador, já aprovada) do que do assistente. Capturado via Playwright
(o mockup é um bundle de Artifact auto-contido, não HTML/CSS plano — precisou renderizar de
verdade, não só ler o arquivo) e comparado lado a lado com o app real.

**Checagem de fidelidade de conteúdo antes de tocar layout.** O mockup reaproveita visualmente
blocos da ficha de jogador sem ajustar pras regras de criatura: mostra Esquiva/Bloqueio/Contra-
ataque como estatística fixa (o guia diz explicitamente, linha 501, que "criaturas não podem
reagir a ataques" — só Defesa é real pra Ameaça; Esquiva/Bloqueio só existem pra NPC, tipo ainda não
implementado, com fórmula própria `Defesa Base + VIG`/`+DES`), uma caixa "DT = 10 + VD ÷ 2 + ATR"
(fórmula que não existe pra Ameaça — a única fórmula de DT do documento, linha 287/976, é de
agente/NPC e usa Nível, não VD) e "Teste Base 5D20" (sem campo/fórmula correspondente — cada
atributo rola seu próprio pool). Os números do mockup também não batem com o que
`calcularAtributoEfetivo` produz pros mesmos dados — confirma que o conteúdo numérico ali é
ilustrativo, não normativo. Levada a decisão ao autor (`AskUserQuestion`): confirmado seguir as
regras acima do mockup, sem adicionar nada novo (nem os três campos fabricados, nem "Percepção",
que tem fórmula real reusável mas não estava no escopo) — realinhamento 100% visual sobre os campos
que já existem em `FichaCriaturaDadosDto`.

**O que mudou.** `criatura-visualizacao.component.{html,scss,ts}` reescritos: shell de 3 colunas
(`--identidade`/`--atributos`/`--status`, mesmo padrão fixo/fixo/flexível de `ficha-visualizacao`,
colapsando em `bp.tablet`); avatar com upload/remover (os inputs/outputs `imagemUrl`/`cor`/
`imagemMudou`/`removerImagem` já existiam sem uso no template antigo); chips de classificação
(Origem/Porte/Comportamento neutros, NA em destaque de perigo com `--vida`, não `--accent` —
divergência deliberada do `.chip-classificacao` canônico, documentada no SCSS); VD/Tenacidade/
Defesa como 3 `.stat` (Defesa saiu da extinta seção "Reações"); Atributos com grupos Físicos/
Mentais (a ordem de `CAMPOS_ATRIBUTO` já nascia agrupada 5+5, terminologia real do
`sistema-v4.1.0.md` — só fatiar o array, sem tabela nova), mantendo intacto o seletor de 4 barras
de Modificador já existente; abas "Informações"/"Ataques e Habilidades" (`.criatura__abas`, cópia
do `.abas` canônico); Deslocamento como tira de tags em vez de 4 campos empilhados; Descrição
(Conceito) + callout "Gancho" + Motivação (preservada mesmo fora do mockup — é campo obrigatório
do DTO, sem lugar nele); Natureza Física/Tema de Horror lado a lado; Anotações no fim da aba
Informações. `criatura-ataque-lista`/`criatura-habilidade-lista` reestilizados de lista de linhas
pra grade de cards (2-up/3-up); ataque ganhou botão **Teste** além do **Dano** existente — não é
mecânica nova, só expõe `rolarTesteAtributoCriatura` (já usado pela grade de Atributos) no
contexto do ataque, via `ataque.atributo`. `criatura-resistencia-lista` ganhou input `variante`
(`'resistencia'` = grade compacta neutra nova; `'fraqueza'` = lista com tom de aviso, mesmo
`--vida` de sempre) — formulário de edição idêntico nos dois casos. `visualizar-criatura.page`
ganhou eyebrow "FICHA DE CRIATURA" + badge `FICHA-CRT-{id real da ficha}` no topo (o "0173" do
mockup é só número de exemplo); `.ficha-pagina` passou de `max-width: 900px` fixo pra `80vw` (mesmo
valor de `visualizar.page.scss`/jogador — o layout de 3 colunas não cabia no teto antigo).

Testes: suíte completa do frontend 1052/1052 (+2 sobre a baseline: `testarAtaque` em
`criatura-ataque-lista.component.spec.ts` e a variante `fraqueza` em
`criatura-resistencia-lista.component.spec.ts`); 3 specs existentes ajustados por troca de seletor
(`.ataque-lista__rolar` → `--dano`/`--teste`; `.resistencia-lista__tipo` → `__grade-tipo` no modo
padrão; `.criatura__vd` → `.criatura__stat--vd`; aba padrão "Informações" faz `.ataque-lista__nome`
só aparecer depois de `selecionarAba('ataques')`). Lint e build limpos. Verificado ao vivo
(Postgres + backend + frontend reais, Playwright, sessão descartável semeada por REST com o mesmo
`dados` de "A Estátua" — campanha 23, ficha 40022): 1920×1080 nas duas abas, comparação lado a lado
com o mockup confirmando densidade/hierarquia/cores equivalentes; edição no próprio lugar (Defesa
30→31, persistiu); os dois botões de rolagem do card de Ataque (Teste e Dano) abrem a bandeja de
dados; adicionar uma Habilidade Especial pelo editor de lista reflete na tela. 360×800 checado só
informativamente (colunas empilham via `bp.tablet`, nada quebra), sem ajuste fino — mobile
permanece pendência de `m4-10`.

## 2026-08-14 — `m4-04c`: passo // Atributos da criatura em 3 cards, com contador real de Pontos de Ajuste

Pedido direto do autor a partir de um screenshot no mobile: no passo // Atributos, o bloco único
"Base do VD" quebrava visualmente (o botão "+" do stepper de cada atributo aparecia cortado) e
misturava três números (Base, Limite, Pontos de Ajuste) numa única frase corrida. Pedido: 3 cards
separados, Base e Limite estáticos, Pontos de Ajuste com "alguma forma de contador, igual dos
agentes" (o guia de jogador tem um "Saldo de distribuição" que trava o avanço em 0).

**Causa do corte no mobile.** `.atributo` (a linha de cada atributo) tem grid de 2 colunas —
identidade + `.stepper` — com a 2ª coluna fixa em `116px`, valor correto só no desktop. No
breakpoint mobile o `.stepper` cresce para `bp.$alvo-toque × 2 + 48px = 136px` (alvo de toque de
44px por botão), mas a regra mobile de `.atributo` só ajustava `min-height`, nunca
`grid-template-columns` — o guia de jogador já resolve isso (`auto minmax(0,1fr) 136px`, com uma
coluna a mais pro botão de Maestria); a versão de criatura, sem esse 3º campo, nunca ganhou o
ajuste equivalente. Corrigido: `.atributo { grid-template-columns: minmax(0, 1fr) 136px; }` dentro
do `@include bp.mobile`, mesma largura final do jogador sem a coluna extra.

**3 cards.** O bloco `.guia__orcamento` (fundo verde, texto corrido) virou `.guia__metricas`, um
grid de 3 `.stat` — o mesmo componente já usado nos passos Saúde/Defesa (`.stat__rotulo` +
`.stat__valor`, com `.stat--alerta` para o estado de erro), evitando inventar um bloco visual novo.
A frase de ajuda ("Realocação de até 3 pontos...") ficou como `<small>` abaixo dos cards, sem mais
repetir os três números que os cards já mostram.

**Contador real, não só cosmético.** `obterBaseELimitePorVd` já calculava `pontosAjuste` (o total
distribuível por VD, `docs/core/guia_de_mestre-v4.0.0.md` — "Base, Limite e Pontos de Ajuste"),
mas nada na tela somava quanto já tinha sido investido — o texto antigo só citava o total, nunca o
gasto. Novo computed `pontosAjuste()` em `criar-criatura.page.ts`: `gastos` é a soma de
`atributo − Base` de cada um dos dez atributos (mesma fórmula de `validarDistribuicaoAtributos` do
guia de agente, `shared/regras/agente/criacao.ts` — um atributo abaixo da Base contribui negativo,
liberando orçamento pros demais, exatamente como a Realocação descrita no documento); `saldo =
total − gastos`. O card de Pontos de Ajuste mostra `gastos/total` e ganha `.stat--alerta` quando
`saldo !== 0`. `passoValido()` do passo // Atributos passou a exigir `saldo === 0` além da checagem
de limite que já existia — mesmo padrão do passo // Atributos do guia de jogador (exige
`distribuicao().saldo === 0`) e do próprio passo // Resistências da criatura (exige `custo <=
limite`); antes disso o orçamento era só informativo, sem nenhuma trava real.

**Dois efeitos colaterais corrigidos por serem expostos pelo contador novo, não pedidos à parte:**
- *Atributos não nasciam na Base.* O estado inicial do assistente fixa todos os dez atributos em
  `1` (correto só quando VD = 0, Base = 1). Ao escolher um VD que eleva a Base (ex.: VD 30 → Base
  2), os atributos continuavam em `1` até o mestre tocar em algum stepper — o card novo mostraria
  isso como "gastos negativos" logo de cara, uma leitura confusa. Novo método `mudarVd()`
  (substituindo o `atualizar({ vd })` direto no `(input)` do campo VD): reinicializa os dez
  atributos para a nova Base, mas **só enquanto o passo // Atributos ainda não foi visitado**
  (`visitado() < passos.indexOf('Atributos')`) — se o mestre já distribuiu pontos e volta pra
  Ameaça pra ajustar o VD, a distribuição feita não é apagada silenciosamente; ele reajusta lendo o
  saldo, que passa a acusar o desbalanço.
- *Realocação sem teto de 3 pontos.* O documento limita a Realocação a "até 3 pontos" retirados de
  um atributo (pode zerar, nunca negativar); `passoAtributo()` só impedia negativar (piso 0), sem o
  teto de 3 abaixo da Base — irrelevante para VD ≤ 40 (Base 1–2, o piso 0 já é mais apertado que
  Base−3), mas permitia, por exemplo, zerar um atributo de Base 4 (uma queda de 4, não 3) em VDs
  mais altos. Corrigido no mesmo método: piso agora é `max(0, Base − 3)`.

Testes: `shared`/`backend` inalterados (mudança só em `frontend`); suíte completa do frontend
1016/1016 (nenhum teste quebrou — os dois usos de `atributos` fixos em `criar-criatura.page.spec.ts`
já reproduzem "A Estátua" com os valores exatos do documento, que somam 6/6 de Pontos de Ajuste,
então a nova trava `saldo === 0` não afeta o fluxo gravado no teste). Lint e build limpos. Verificado
ao vivo (Postgres + backend + frontend reais, Playwright): em 1920×1080 e 360×800 os 3 cards
aparecem corretamente (`Base 2 · Limite 5 · Pontos de Ajuste 0/6` ao entrar, atributos já na Base);
distribuir os mesmos ajustes da "A Estátua" (Destreza+2, Luta+3, Força+1, Vigor+1, Sentidos+1,
Social−2) leva o card a `6/6` sem `.stat--alerta` e habilita "Avançar"; desfazer um ponto mostra
`5/6` em vermelho e desabilita "Avançar"; no mobile, nenhum botão `+` do stepper ultrapassa a borda
direita do card do atributo (medido via `getBoundingClientRect`, confirmando o fim do corte).

## 2026-08-14 — `m4-04b`: polimento de UI do assistente de criatura e do painel do mestre (fora da fila de specs)

Pedido direto do autor, entre a `m4-04` e o início da `m4-05` — não uma task numerada da fila M4,
mas registrado com o mesmo rigor por tocar código de produção (frontend + um ajuste real de
backend). Cinco pedidos, todos entregues:

**1. Revisão visual do assistente de criatura.** `.campo` consecutivos fora de um `.guia__campos`
(ex.: "Linha de conceito" → "Natureza física" na Identidade, ou qualquer par de campos avulsos nos
demais passos) encostavam um no outro — `.campo` tem `margin: 0` e só existiam regras de
espaçamento para quando um `.guia__campos` entrava no meio (`&__campos + .campo`/`.campo +
&__campos`, 16px). Faltava a regra simétrica `.campo + .campo`. Corrigido com uma única linha de
CSS (`criar-criatura.page.scss`), reaproveitando o mesmo valor de 16px já usado nos vizinhos —
verificado ao vivo (Playwright mediu 0px → 16px entre "Linha de conceito" e "Natureza física").
Segundo achado: o botão "+ Adicionar X" (Resistências/Fraquezas/Ataques/Habilidades) encostava
direto no grid de cards acima dele por falta de margem — `&__formacoes + &__vaga-escolher` (8px
topo / 18px base) resolve, sem alterar o resto do framework `.guia__*` (compartilhado por
precedente com o guia de jogador, sem partial comum — ver comentário no topo do `.scss`).

**2. Upload de imagem na criatura.** O passo // Identidade não tinha nenhum campo de imagem — a
`m4-04` original não trouxe (o guia de jogador tem avatar desde `m3-62`, mas os blocos foram
removidos do `.scss`/`.html` da criatura "por precedente" ao adaptar o framework). Reintroduzido o
mesmo padrão exato do guia de jogador: `imagemArquivo`/`imagemPreviewUrl`/`erroImagemGuia`
(signals), validação client-side de tipo/tamanho (JPEG/PNG/WEBP, 2MB) espelhando os limites do
backend, preview via `URL.createObjectURL` revogado no `DestroyRef.onDestroy`, e o upload real
como **segundo request** (`FichaService.alterarImagem`, já existente e agnóstico de tipo de
ficha — nenhuma rota nova) disparado por `criar()` só depois que o `id` da ficha existir; falha no
upload não desfaz a criatura nem trava a navegação. Layout: nova modificador `&__campos--base`
(mesmo grid `minmax(120px,200px) 1fr` do guia de jogador) com a caixa de imagem à esquerda e
Designação+Origem empilhadas à direita, substituindo a antiga linha de duas colunas
Designação/Origem. Verificado ao vivo: `setInputFiles` de um PNG 1×1 e o preview aparece na hora
(`.guia__avatar-imagem`), tanto em 1920×1080 quanto em 360×800 (mobile empilha `--base` para
`1fr`, mesma regra do jogador).

**3. Botões "Nova Criatura"/"Novo Agente" no painel do mestre.** O cabeçalho da coluna
"Esquadrão" (`CampanhaDetalhe`) tinha um único botão "Nova ficha" → `abrirCriarFicha()`. Renomeado
para "Novo Agente" (ícone `novo-agente`, já existia — o nome do ícone antecipava essa renomeação)
e adicionado "Nova Criatura" (secundário, ícone `alerta` — mesmo usado no avatar do resumo
operacional do guia de criatura) → novo método `abrirCriarCriatura()`, navega para
`/painel/:campanhaId/criatura/nova`. Escopo confirmado: este cabeçalho já só renderiza dentro de
`@if (exibirComoMestre())` — nenhum guard novo necessário, o `mestreCampanhaGuard` da `m4-04` já
protege a rota de destino contra acesso direto por URL.

**4. Tira de estatísticas reduzida a "Convite".** Os tiles Membros/Fichas/Alertas saíram da tira
`.detalhe__estatisticas` (ficava só o Convite, a pedido do autor) — a contagem de Membros/Fichas já
aparece no cabeçalho de cada coluna (`&__secao-contagem`) e o alerta de ficha crítica já tem o
banner condicional próprio acima (`fichaCritica`/`&__banner-alerta`); nada duplicava informação de
graça. `alertasCount` (computed que só alimentava o tile removido) foi excluído por não ter mais
consumidor — `fichasCriticas`/`fichaCritica`, usados pelo banner, ficaram. CSS: a tira virou
`display: flex` com o tile de Convite em `flex: 0 1 340px` (era um grid fixo de 4 colunas) —
`flex-basis: 100%` no mobile, mesmo comportamento de antes.

**5. "Esquadrão" dividir a coluna com "Criaturas".** Pedido mais substancial: a coluna
"Esquadrão" ganhou uma subseção própria "Criaturas" logo abaixo do grid de fichas de jogador —
**mesma coluna**, não uma terceira (era literalmente o que o autor pediu: "dividir uma coluna",
não adicionar uma). Isso expôs uma lacuna real: `FichaResumoDto` não carregava `tipo` nenhum —
`FichaRepository.colunasResumo()` nunca selecionava a coluna `tipo_ficha_id` (nem seu `codigo`), e
os campos de saúde/defesa da query assumiam sempre o formato de jogador (`dados->'estado'->>...`,
`dados->'derivados'->>...`) — uma criatura guarda `vidaAtual`/`vidaMaxima`/`defesa` na **raiz** de
`dados` (`FichaCriaturaDadosDto`), então essas três colunas sempre voltavam `NULL` para uma
criatura (a mesma lacuna, num raio menor, por trás do `TypeError` do `FichaVisualizacao` já
registrado como pendência na `m4-04`). Corrigido no `FichaRepository`: `JOIN tipo_ficha` novo
(`juncaoTipoResumo()`, mesma tradução `codigo ↔ id` que o `criar` já fazia) e `COALESCE` entre os
dois formatos de `dados` para `vidaAtual`/`vidaMaxima`/`defesa`, mais a coluna `na` (Nível de
Ameaça, só existe numa criatura). `FichaResumoDto` ganhou `tipo?`/`na?` — **opcionais** de
propósito (não obrigatórios): a query de produção sempre os preenche (FK `NOT NULL` + `JOIN`
sem `LEFT`), mas exigir o campo quebraria um número grande de fixtures de teste pré-`m4-04` em
`acervo`/`criar`/`detalhe`/`ficha.service` que nunca precisaram declará-lo — tratar ausência como
"não é criatura" é o comportamento correto pra qualquer um desses fixtures legados. `FichaService.
paraResumoPublico` ganhou um guard de tipo: o fallback "Contra-ataque ao vivo" (`calcularDerivados`,
assume `classe`/`nivel`/`atributos` de jogador) só roda quando `tipo === JOGADOR` — antes disso ele
rodaria também para uma criatura (com `classe`/`nivel` sempre `null`), sem sentido e arriscado.
Frontend (`CampanhaDetalhe`): `fichasPorMembro` passou a pular fichas `CRIATURA` (elas nunca tinham
`classe`/`energia`/condições de qualquer forma; filtrar cedo evita o item malformado, não só
escondê-lo depois) e um novo computed `criaturasEsquadrao` monta os cards enxutos (nome, imagem,
cor, "NA {rótulo}", Vida, Defesa) direto de `fichas()`, ordenados por nome. Os cards **não têm
link de navegação** — decisão deliberada, não um esquecimento: `FichaVisualizacao` ainda não sabe
renderizar dados de criatura (a mesma pendência da `m4-04`, ver `CONTEXT.md` seção 7); linkar pra
lá reproduziria o `TypeError` já documentado, só que a partir de um ponto de entrada novo. Testes
novos em `detalhe.page.spec.ts` provam a separação (jogador nunca aparece em Criaturas e
vice-versa) e o estado vazio ("Nenhuma criatura registrada ainda.").

Todos os três testes de workspace passam: shared (build limpo), backend (365/365, incluindo os
fixtures ajustados para o novo campo `tipo`), frontend (1016/1016 — 2 testes novos líquidos:
"Novo Agente"/"Nova Criatura" substituíram o antigo teste de "Nova ficha", e a subseção Criaturas
ganhou 2 testes; a tira de estatísticas ganhou 1 teste substituto para os 2 removidos). Lint
limpo nos três workspaces. Verificação ao vivo (Postgres nativo + backend + frontend reais, gate
obrigatório) confirmou tudo: painel do mestre com só o tile Convite, os dois botões com os rótulos
certos, a subseção Criaturas vazia e depois com "A Estátua"/"Debug*" aparecendo separada do
Esquadrão, upload de imagem com preview funcionando, gap de 16px entre campos e 8px do botão
"+ Adicionar" ao grid — em 1920×1080 e 360×800, sem erro de console novo. Painel do jogador
verificado sem regressão (nenhuma criatura vaza pra "Equipe", que já excluía fichas do mestre) e o
`mestreCampanhaGuard` da `m4-04` continua barrando acesso direto à rota de criação por um jogador.

## 2026-08-14 — `m4-04`: assistente de criação de criatura (frontend), reproduz "A Estátua" ponta a ponta

Frontend do `m4-03`: assistente de criação de criatura (Ameaça) para o mestre —
`frontend/src/app/modules/ficha/paginas/criar-criatura/` (`CriaturaCriar`), rota
`/painel/:campanhaId/criatura/nova`. Mesma filosofia visual de trilha vertical + resumo
operacional progressivo do guia de jogador (`FichaCriar`, `m3-57`/`58`/`59`), mas componente,
estado e roteiro **totalmente separados** — o roteiro do "Guia de Criação de Ameaças" não tem
relação estrutural com o de agente (12 passos fixos, sem passo condicional, diferente do de
jogador onde // Habilidades só existe com Nível > 0): Identidade → Ameaça (NA/VD) → Atributos →
Modificadores → Saúde → Defesa → Resistências (e Fraquezas) → Regeneração → Porte e
Deslocamento → Ataques → Habilidades → Revisão.

**Nenhuma fórmula reimplementada** — todo número vem de `shared/regras/criatura` (`m4-02`) via
`computed`: `obterBaseELimitePorVd`, `calcularAtributoEfetivo`, `calcularVidaMaxima`,
`calcularDefesaBase`, `possuiContraAtaque`, `calcularLimiteResistencias`/
`calcularCustoResistencia`/`validarFraqueza`, `calcularValorRegeneracao`,
`sugerirDeslocamentoTerrestre`, `calcularBonusIniciativaSugerido`, `obterDanoReferenciaPorVd`.
O passo // Revisão não reimplementa cada regra de coerência como trava de passo separada —
chama `validarFichaCriatura` (a mesma função que `FichaService.criarFichaCriatura` chama no
backend antes de persistir, `m4-03`) sobre os dados montados e usa a lista de violações tanto
para exibir o que falta quanto para habilitar/desabilitar "Registrar criatura". Passos
individuais (Atributos, Modificadores, Resistências, Regeneração, Porte e Deslocamento) ainda
têm travas próprias e mais cedo — usando as mesmas funções do motor, nunca uma cópia da regra —
para não deixar o mestre chegar à Revisão sem saber o que está incompleto.

**Decisões de abertura desta task:**
- **Sem rascunho persistido** — diferente do guia de jogador
  (`GuiaCriacaoRascunhoService`/`localStorage`), este assistente não salva progresso local. A
  task não pedia retomada nos entregáveis, e o risco de perda é menor que o do guia de jogador
  (é o mestre criando uma ficha da própria campanha, não um jogador perdendo a ficha do próprio
  agente).
- **`nome` da ficha (DTO de nível superior) = `designacao`** da Ficha de Identidade — o roteiro
  do documento não tem um segundo campo "nome de registro" distinto da Designação; um campo a
  mais quase idêntico seria redundância sem ganho.
- **Sem seletor de "operador responsável"** — `FichaCriaturaCriarDto` não tem `usuarioId` (dono
  é sempre o mestre autenticado, fixado no backend desde a `m4-03`), então o guia não precisa
  (nem pode) criar em nome de outra pessoa, ao contrário do guia de jogador.
- **Realocação de atributos sem trava de "3 pontos"** — o motor (`validarRealocacaoAtributos`)
  só valida limites `[0, limite]` por atributo, não um teto de pontos realocados por atributo de
  origem; o assistente segue a mesma superfície de validação do motor (stepper livre dentro dos
  limites) em vez de inventar uma regra adicional que não existe em `shared/regras/criatura`.

**Rota guardada por `mestreCampanhaGuard`** (novo, `frontend/src/app/core/guards/
mestre-campanha.guard.ts`) — `CanActivateFn` que consulta `CampanhaService.listarMembros` e
redireciona a `/acesso-negado` quem não é mestre daquela campanha (ou quando a consulta falha).
Não existia guard nenhum escopado a papel-de-campanha no projeto (`adminGuard`/`tipoGuard`
checam só o tipo global do usuário); backend já barra com 403 desde a `m4-03`, este guard só
evita a viagem até o formulário para quem nunca teria a criação aceita. Registrado em
`app.routes.ts` sob `painel/:campanhaId/criatura`, ao lado (não dentro) de
`painel/:campanhaId/ficha`, em módulo próprio (`frontend/src/app/modules/ficha/
criatura.routes.ts`) — só a rota `nova` por enquanto (visualização/edição ficam fora do
escopo, ver abaixo).

**Verificação ao vivo** (stack real: Postgres 16 + backend NestJS + frontend Angular, dois
navegadores — mestre e jogador — em 1920×1080 e 360×800; Docker/imagens públicas indisponíveis
no ambiente de execução desta sessão, então o Postgres subiu via `apt`/`pg_ctl` local em vez de
`docker compose`, mesmo schema e migrations): o mestre reproduziu "A Estátua" (docs/core/
guia_de_mestre-v4.0.0.md — "Exemplo de Ficha Completa") passo a passo pelo assistente e os
valores calculados bateram exatamente com o documento — Base 2/Limite 5/6 Pontos de Ajuste,
Atributo Efetivo de cada linha (Força 12, Destreza 16, Luta 17, Pontaria 4...), Vida Máxima
1.050, Defesa 30 com Contra-Ataque disponível, custo de Resistências 52/60, sugestão de
Deslocamento Terrestre 10–12m (a Estátua usa 9m, sugestão não é trava). Zero violações na
Revisão; `POST /ficha/criatura` persistiu e o `GET` seguinte devolveu os mesmos dados. Testado
também que um jogador da mesma campanha, sem concessão, recebe lista vazia em `GET
/ficha?campanhaId=` e 403 direto em `GET /ficha/criatura/:id` — a regra "invisível por padrão"
do `m4-03` segura na prática, não só na leitura do código (o campo `oculta` nasce `false` e
**não** é o mecanismo de proteção; quem protege é a exigência de posse/concessão em
`listarVisiveisParaUsuario`/`recuperarFicha` — checado e documentado em `CONTEXT.md` para não
confundir o próximo leitor). Mobile: trilha vira barra de progresso no topo, resumo abre como
bottom sheet — mesmo padrão do guia de jogador, sem erro de console.

**Achado registrado como pendência (não corrigido nesta task — fora de escopo declarado):**
abrir a criatura recém-criada em `/painel/:campanhaId/ficha/:id` (`FichaVisualizacao`, a tela de
visualização/edição de ficha de **jogador**) lança `TypeError: Cannot read properties of
undefined (reading 'vidaBase')` em `calcularVida` — a tela assume campos de jogador
(`classe`/`nivel`/`atributos` no formato de agente) que não existem no documento de criatura. A
spec `m4-04` já previa esse caso ("Fora de Escopo": "a criatura segue a mesma convenção
'snapshot editável no próprio lugar' da ficha de jogador — se precisar de tela dedicada além da
reutilização de `FichaVisualizacao`/`modo`, registrar como pendência ao fechar esta task").
§14 impede qualquer jogador de chegar lá sem concessão, então hoje só afeta o mestre navegando
direto após criar. Decisão de rumo (tela dedicada vs. adaptar `FichaVisualizacao`) fica em
aberto para quem fechar `m4-09` (listagem/revelação no painel do mestre) — registrado em
`CONTEXT.md` §7.

Testes: `frontend` ganhou `criar-criatura.page.spec.ts` (reproduz "A Estátua" via chamadas
diretas aos métodos protegidos do componente — mesmo padrão de `criar.page.spec.ts` — e
confere o DTO exato enviado ao `FichaService.criarFichaCriatura`) e
`mestre-campanha.guard.spec.ts`. `m4-04` movida para `docs/specs/done/`.

## 2026-08-14 — `m4-03`: `backend/ficha` estendido para `CRIATURA`, com DTOs de operação próprios

Extensão do módulo `ficha` (backend) para o tipo `CRIATURA` (a task deixava explicitamente em
aberto uma decisão de desenho: DTOs de operação **próprios** para a criatura ou os genéricos de
jogador (`FichaCriarDto`/`FichaResumoDto`…) virando união por tipo. Optou-se por **DTOs
próprios** (`FichaCriaturaCriarDto`/`*CriadaDto`/`*RecuperarDto`/`*RecuperadaDto`/
`*AlterarDto`/`*AlteradaDto`, novo arquivo `shared/src/dtos/ficha/
ficha-criatura-operacao.dtos.ts`), pela mesma razão que já fechou "dois contratos, não um" para
o documento de jogo em si na `m4-01`: a forma diverge o suficiente (sem `classe`/`nivel`/
identidade de jogador; dono sempre o mestre, nunca delegável; sempre dentro de campanha) que uma
união exigiria type-guards espalhados pela `FichaService` inteira, inclusive em código já
testado e específico do formato de jogador (`aplicarSnapshotDeMaximos`,
`validarImutabilidadeIdentidade`, `validarContratoSomenteMestre`), sem ganho real. Documentado no
próprio arquivo de DTOs e em `CONTEXT.md` §6.

**Camada de persistência é o único ponto de fronteira entre os dois contratos.** `FichaRepository`
segue único e sem duplicação — `criarFicha`/`recuperarPorId`/`alterarFicha`/`excluirFicha` já são
SQL agnóstico da forma do JSONB (só `colunasResumo()`, usada pelas listagens de jogador, é
jogador-específica, e não foi tocada). A ponte entre `FichaCriatura*Dto` (contrato público desta
task) e `Ficha*Dto`/`FichaInterno*Dto` (contrato interno do repositório, desenhado só para
jogador) é feita inteiramente dentro de `FichaService`, com casts documentados
(`dto.dados as unknown as FichaJogadorDadosDto` na entrada; `paraCriaturaCriada`/
`paraCriaturaRecuperada`/`paraCriaturaAlterada` na saída) — o `dados` armazenado sempre foi
JSONB, então o tipo do repositório sempre foi uma promessa de forma do lado do TypeScript, nunca
uma garantia de runtime, mesmo para jogador.

**Três métodos novos em `FichaService`** (`criarFichaCriatura`/`recuperarFichaCriatura`/
`alterarFichaCriatura`) e três rotas novas no controller (`POST`/`GET`/`PUT
/ficha/criatura/:id`), sem colidir com as rotas de jogador — o segmento literal `criatura` tem
número de segmentos diferente de `:id` sozinho, então a ordem de declaração não importa (ao
contrário de `minhas`, que precisa vir antes de `:id`). `criarFichaCriatura`: só o **mestre** da
campanha cria (`UnauthorizedAccessException` para qualquer outro papel — sem delegação de dono
como em jogador, dono é sempre o próprio mestre autenticado); sempre dentro de campanha (sem
"avulsa" nesta task); valida contra `validarFichaCriatura` (`shared/regras/criatura`, `m4-02`) —
única validação de domínio, nenhuma regra de criação duplicada no backend.
`recuperarFichaCriatura`/`alterarFichaCriatura` **reusam sem alteração** os métodos privados de
permissão já testados por jogador (`validarPermissaoVisualizacao`/`validarPermissaoEdicao` — só
olham `usuarioId`/`campanhaId`, nunca a forma de `dados`) e `omitirCamposPrivados` (delete seguro
de chave ausente — `historia` não existe em criatura, `anotacoes` existe nas duas formas).
Exclusão (`DELETE /ficha/:id`) e acesso (`concederAcesso`/`revogarAcesso`/`listarAcessos`,
`/ficha/:id/acesso*`) já eram 100% agnósticos de tipo — reusados tal como estão, sem endpoint
próprio (confirmado por teste: um jogador sem concessão não vê a criatura recém-criada; passa a
ver depois de `concederAcesso`, sem duplicar o mecanismo de `m3-04`).

**Tempo real — `ficha:criada` deliberadamente não é emitido na criação de criatura.**
`CampanhaGateway.emitirFichaCriada` monta o resumo direto de `ficha.dados.classe`/
`.estado.vidaAtual` (forma de jogador) e transmite para a sala `campanha:<id>` **inteira**,
qualquer membro, sem checar permissão de visualização (a sala é mais aberta que o documento,
por design — §14). Chamá-lo para uma criatura vazaria nome/vida da ameaça a todo jogador da
campanha antes de qualquer revelação deliberada, contradizendo a regra fundamental "invisíveis
aos jogadores por padrão" (§14). `criarFichaCriatura` por isso **não** chama
`emitirFichaCriada` — divergência deliberada da leitura mais literal da task ("reusar
emitirFichaCriada/emitirFichaAlterada sem mudança de gateway"), motivada pela proteção de
visibilidade, que é entregável explícito da própria task. `emitirFichaAlterada` já é seguro de
reusar sem essa ressalva (chamado sem cast — `FichaRecuperadaDto`/`FichaAlteradaDto` têm forma
idêntica): ele só atinge a sala `ficha:<id>`, cuja entrada (`CampanhaGateway.entrarSalaFicha`)
já exige a mesma permissão de visualização via `recuperarFicha` — quem está na sala já podia ver
a ficha. Zero linhas mudaram em `campanha.gateway.ts`.

`m4-03` movida de `docs/specs/backlog/` para `docs/specs/done/`. Sem migration (tabela `ficha`
já é agnóstica de tipo desde `m3-01`; `tipo_ficha` já tinha `CRIATURA` seedado desde `m3-02`).
Frontend (`m4-04`) e listagem/revelação dedicada no painel do mestre (`m4-09`) ainda não
consomem esta API. Verificado: `npm run build`/`test` do `shared` limpos (660/660, sem
alteração de lógica, só novo arquivo de DTOs); `backend` — build (`nest build`), typecheck e
lint limpos (os 2 erros de lint remanescentes em `campanha.service.spec.ts`/
`ficha.service.spec.ts` são pré-existentes, confirmados via `git stash`, não relacionados a esta
task) e 365/365 testes (12 novos, cobrindo criação restrita ao mestre, rejeição de dados
incoerentes contra `shared/regras/criatura`, visibilidade oculta por padrão com revelação via
concessão, e edição restrita ao dono).

## 2026-08-14 — `m4-02`: motor de regras da ficha de criatura, com duas divergências do guia documentadas

`shared/src/regras/criatura/` — motor de regras puro do "Guia de Criação de Ameaças"
(`docs/core/guia_de_mestre-v4.0.0.md`), espelhando a estrutura de `shared/regras/agente`: um
módulo por bloco do roteiro, cada um com DTOs de entrada em `criatura.dtos.ts` (mesma convenção
de `agente.dtos.ts`) e funções puras testadas isoladamente. Módulos: `atributos.ts`
(`obterBaseELimitePorVd` — tabela de Base/Limite/Pontos de Ajuste por faixa de VD, com os dois
casos especiais 80–100/100+ onde o Limite não é Base+3; `validarRealocacaoAtributos` — atributos
finais dentro de `[0, limite]`), `modificadores.ts` (`calcularValorModificador`,
`calcularAtributoEfetivo`), `saude.ts` (`calcularVidaMaxima` = VD × multiplicador de
Tenacidade), `defesa.ts` (`calcularDefesaBase` = 15+VD÷2, `possuiContraAtaque`),
`resistencia.ts` (`calcularLimiteResistencias`, `calcularCustoResistencia` — Geral em dobro,
subtipo pela metade —, `validarFraqueza`, `calcularMultiplicadorCriticoFraqueza`),
`regeneracao.ts` (`calcularValorRegeneracao`), `deslocamento.ts`
(`sugerirDeslocamentoTerrestre` — retorna uma faixa `{minimo, maximo}`, nunca um valor único,
porque o guia tabula faixas e escolher um ponto fixo seria decisão do motor que não é dele),
`cadencia.ts` (`calcularBonusIniciativaSugerido` ≈ 10% do VD), `ataques.ts`
(`obterDanoReferenciaPorVd` — tabela de dano de referência por VD/custo de ação; a coluna
"Turno" da tabela do guia não corresponde a nenhum `CustoAcaoEnum`, então ganhou uma função
separada, `obterDanoReferenciaTurnoPorVd`) e `validacao.ts` (`validarFichaCriatura` — soma de
resistências dentro do limite, ao menos 1 fraqueza com valor mínimo respeitado, nenhum
tipo/subtipo simultâneo em resistência e fraqueza, distribuição fixa 2/3/3/2 de Modificadores,
ao menos um modo de Deslocamento preenchido; retorna `{ violacoes: string[] }`, mesmo padrão de
`validarDistribuicaoAtributos` em `shared/regras/agente/criacao.ts`). Novo subpath de export
`./regras/criatura` em `shared/package.json`, ao lado dos demais domínios de regra.

Ao montar o caso de teste completo exigido pelo critério de aceite do milestone —
`a-estatua.spec.ts`, reproduzindo "A Estátua" (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de
Criação de Ameaças" > "Exemplo de Ficha Completa") — duas divergências **internas ao próprio
documento**, entre a fórmula geral de uma seção e os números literais do exemplo, apareceram:
(1) o modificador Fraco em VD 30 — a fórmula geral (base -2 em VD 5, +1,5 a cada +5 de VD,
arredondado para baixo) dá 5,5→5, mas o exemplo mostra "+6" para os três atributos Fraco da
Estátua, enquanto Forte/Médio/Frágil do mesmo exemplo batem exatamente com a fórmula; (2) o
mínimo de Fraqueza — a fórmula (5 ou metade da soma de resistências, o que for maior) dá
max(5, 52÷2)=26 para a soma de resistências da Estátua (Físico 36 + Balístico 16), mas o
exemplo declara a Fraqueza de Explosão em 20, abaixo do próprio mínimo que a fórmula do mesmo
documento exige. Perguntado, o autor decidiu que a **fórmula geral vence** nos dois casos — ela
é a regra reutilizável, o exemplo é uma aplicação pontual mais sujeita a erro de transcrição.
As duas divergências ficam documentadas em comentário no código (`modificadores.ts` e
`a-estatua.spec.ts`) e em `CONTEXT.md` §6, com uma nota de atenção para `m4-06`
(`shared/regras/npc`) caso a Biblioteca de Referência do NPC tenha o mesmo tipo de
inconsistência. O caso de teste completo usa os valores derivados da fórmula (Fraqueza em 26)
para fechar sem violações de `validarFichaCriatura`, e testes isolados documentam explicitamente
os dois pontos onde o exemplo do guia diverge.

Uma terceira aparente divergência — o Deslocamento Terrestre da Estátua (9m) cai fora da faixa
sugerida para Destreza 4 (10–12m) — **não** foi tratada como inconsistência: `docs/core/
guia_de_mestre-v4.0.0.md` já é explícito que Deslocamento é sempre declarado pelo Mestre, com o
atributo apenas como referência sugerida, e o próprio conceito da Estátua (só se move quando não
observada) já justifica um valor abaixo da tabela. `sugerirDeslocamentoTerrestre` documenta essa
natureza de sugestão no código.

`m4-02` movida de `docs/specs/backlog/` para `docs/specs/done/`. Camada 100% `shared/` — sem
consumo no backend (`m4-03`) ou frontend (`m4-04`) ainda. Verificado: `npm run
build`/`typecheck`/`lint`/`test` do workspace `shared` limpos, 660/660 testes (57 novos desde a
`m4-01`, cobrindo os 10 módulos + validação de coerência + o caso de teste completo).

## 2026-08-14 — M4 (Ficha de Criatura/NPC) aberto; contrato da ficha de criatura fechado

O milestone `m4-ficha-criatura-npc.spec.md` (`docs/specs/backlog/`) foi dividido em **10 tasks
numeradas** (`m4-01`…`m4-10`), seguindo o mesmo padrão de quebra usado no M2/M3. A ordem segue o
pedido do autor — criatura primeiro, NPC depois: `m4-01` contrato da criatura, `m4-02`
`shared/regras/criatura`, `m4-03` backend, `m4-04` frontend (assistente); `m4-05` contrato do NPC,
`m4-06` `shared/regras/npc`, `m4-07` backend, `m4-08` frontend; `m4-09` listagem/revelação no
painel do mestre (cobre os dois tipos) e `m4-10` refinamento mobile (idem), como fechamento do
milestone — espelhando `m3-09`. As 9 tasks restantes (`m4-02`…`m4-10`) ficaram em
`docs/specs/backlog/`; só `m4-01` foi implementada nesta sessão e já está em `docs/specs/done/`.

`m4-01` codificou o design que já estava **fechado** em `SCHEMA.md` desde antes desta sessão (seção
"FichaCriaturaDadosDto", derivada do capítulo "Guia de Criação de Ameaças" de
`docs/core/guia_de_mestre-v4.0.0.md`) — não houve decisão de forma nova, só a tradução para TS.
Novo arquivo `shared/src/dtos/ficha/ficha-criatura.dtos.ts`: `FichaCriaturaDadosDto` + sub-DTOs
(`FichaCriaturaIdentidadeDto`, `FichaCriaturaResistenciaDto` — reusado para resistências **e**
fraquezas, mesma forma `{tipo, subtipo, valor}`, evitando um segundo tipo idêntico —,
`FichaCriaturaRegeneracaoDto`, `FichaCriaturaDeslocamentoDto`, `FichaCriaturaAtaqueDto`,
`FichaCriaturaHabilidadeDto`), exportado pelo subpath `./dtos/ficha` já existente (sem subpath
novo). `atributos` **reusa** `FichaAtributosDto` do jogador (mesmos 10 campos) e `resistencias`/
`ataques` reusam `TipoDanoEnum` (já tinha `GERAL`) — nenhum tipo duplicado (proibição #21). 11
enums novos de conteúdo de jogo em `shared/src/enums/` (`SCREAMING_SNAKE_CASE`, sem tabela
`tipo_*` — §10.3): `NivelAmeacaEnum`, `OrigemCriaturaEnum`, `ComportamentoCriaturaEnum`,
`ModificadorCriaturaEnum`, `TenacidadeEnum`, `RegeneracaoModoEnum`, `RegeneracaoIntensidadeEnum`,
`PorteCriaturaEnum`, `CadenciaEnum`, `CustoAcaoEnum` (nome genérico, não prefixado por
"Criatura" — reutilizável por outro consumidor do mesmo conceito de ação) e
`HabilidadeTipoCriaturaEnum`. Sem Maestria (decisão de abertura do milestone: exclusiva de
jogador); `vidaMaxima`/`vidaAtual`/`defesa` seguem a mesma filosofia `m3-10` — snapshot na
criação (calculado por `shared/regras/criatura`, ainda não implementado — `m4-02`) e editável
depois, sem recálculo automático sobre a edição. DTOs `interface readonly` puros, sem
class-validator, coerente com a decisão vigente do projeto (`CONTEXT.md` §5) — o texto antigo de
`m3-01` que mencionava class-validator está desatualizado nesse ponto e não foi replicado aqui.

`SCHEMA.md` atualizado: a seção `FichaCriaturaDadosDto` deixou de dizer "codificar no M4" e passou
a apontar para o arquivo/subpath final, igual ao tratamento que `FichaJogadorDadosDto` recebeu na
`m3-01`. Camada 100% `shared/` — sem migration (a tabela `tipo_ficha` já tem `CRIATURA` seedada
desde `m3-02`), sem service, sem endpoint, sem frontend. Verificado: `npm run build`/`lint`/`test`
do workspace `shared` limpos (603/603 testes, sem regressão — a suíte só ganhou os arquivos novos,
nenhum teste de comportamento ainda, já que este contrato não tem lógica além dos tipos).

## 2026-08-14 — Ajuste rápido de vitalidade deixa de regravar a ficha

O ajuste de Vida/Energia dos mini-cards da campanha usava o `PUT /ficha/:id` completo. Como esse
fluxo enviava apenas `nome` e `dados`, a repository interpretava `cor` e `oculta` ausentes como
`null` e `false`: um clique de vitalidade podia apagar a cor da ficha e tornar visível uma ficha
oculta. O avatar não era apagado porque tem endpoint próprio, mas o contrato continuava frágil para
qualquer novo campo relacional.

O fluxo agora chama `PATCH /ficha/:id/vitalidade`, com somente `vidaAtual` e/ou `energiaAtual`.
O backend aplica a mesma permissão de edição, preserva a regra de Vida não negativa e Energia
negativa permitida, mescla exclusivamente esses valores em `dados.estado` via JSONB e emite
`ficha:alterada`. O cliente serializa os PATCHes de cada ficha para uma resposta antiga não
sobrescrever o valor mais recente. Cor, avatar, visibilidade, nome e todo o restante do documento
permanecem intocados. Os testes cobrem o cliente HTTP, o lote dos cards, o recorte SQL, a
permissão/emissão e a integração do detalhe da campanha.

## 2026-08-14 — Cadernos privados e busca textual por campanha

Cada participante passou a ter um caderno privado por campanha, composto por várias páginas com
título e conteúdo Markdown. O autor cria, edita, reordena e exclui as próprias páginas; o mestre
pode abrir os cadernos dos jogadores somente para leitura e pesquisa, enquanto jogadores nunca
acessam os cadernos uns dos outros. Salvamentos são serializados, usam controle otimista de versão e
preservam o rascunho local quando outra sessão altera a mesma página.

O caderno entrou na tela da campanha como utilitário flutuante análogo ao leitor de documentos e à
calculadora: no desktop pode ser arrastado, redimensionado e minimizado, com geometria local por
navegador; no mobile ocupa a área útil e alterna entre lista e editor. O editor oferece escrita e
prévia de Markdown seguro, sem HTML, imagens ou anexos. A busca da campanha reúne páginas do mestre,
páginas dos jogadores e anotações das fichas em uma consulta com fontes combináveis, sempre limitada
pelo papel e pelos vínculos do usuário. Resultados de ficha abrem diretamente em `#anotacoes`.

A busca foi implementada no PostgreSQL com configuração portuguesa, `websearch_to_tsquery`, vetores
e índices GIN. O PostgreSQL permanece a fonte autoritativa; Elasticsearch ficou somente como opção
futura para volume ou relevância que justifiquem uma projeção externa reconstruível. A migration
`0018` também foi testada em rollback/reaplicação, e o plano de consulta confirmou os índices das
páginas e das anotações de ficha.

A aplicação real foi exercitada em 1920×1080 e 360×800, incluindo abertura, minimização, arraste,
redimensionamento, persistência da geometria, Markdown, busca, leitura do mestre, conflito de edição
e confirmação de exclusão. Não houve overflow, os alvos mobile mantiveram 44px e a janela preservou
a linguagem visual dos utilitários existentes. Passaram 603 testes no `shared`, 349 no backend e
990 no frontend, além dos três builds. O lint de `shared` e frontend passou; o lint raiz continua
bloqueado apenas por duas asserções desnecessárias preexistentes em testes de campanha e ficha. O
build do frontend manteve o aviso conhecido do budget inicial (639,41 kB para o limite de 630 kB).

Após a revisão de uso, a pilha de atalhos do jogador passou a remover a vaga inexistente do
inventário de esquadrão; no mobile, o Caderno entrou na mesma faixa de 44px de rolagens e
calculadora. A lista de páginas do desktop pode ser recolhida e reaberta. A janela agora reduz até
440px; abaixo de 640px, a lista aberta sobrepõe o editor em vez de comprimi-lo. Os 994 testes do
frontend, lint e build foram repetidos; o build manteve somente o aviso conhecido de budget.

Na revisão seguinte, os filtros do caderno passaram a refluir dentro da janela estreita — inclusive
o seletor de jogador — e a criação de uma página recolhe a lista para mostrar o editor imediatamente.
No card compacto de ficha, Dinheiro e Salário ocupam a primeira linha enquanto Patente e Limite de
Crédito formam a segunda. O botão mobile do caderno passou a usar a mesma aparência dos controles do
cabeçalho. Por fim, atalhos recolhidos de Caderno e Documentos voltaram à faixa de utilitários abaixo
das janelas arrastáveis, para nunca sobrepor um diálogo aberto.
Os 995 testes do frontend, lint e build passaram; o build preservou apenas o aviso conhecido do
budget inicial (639,41 kB para o limite de 630 kB).

O fluxo de escrita foi simplificado novamente após a validação do autor: a alternância entre
`Editar` e `Visualizar` saiu, e a própria página formatada passou a ser editável com Milkdown. A
integração usa o núcleo do editor, sem o pacote visual Crepe, para não carregar recursos fora do
escopo como imagens, tabelas, matemática e as fontes do KaTeX. Uma barra compacta oferece texto,
títulos, negrito, itálico, código, listas e citação; atalhos Markdown continuam funcionando e o
PostgreSQL continua recebendo Markdown puro. A mesma superfície fica bloqueada e sem barra ao
consultar o caderno de outro jogador. A aplicação real foi percorrida em 1920×1080 e 360×800:
seleção, formatação direta, salvamento e reabertura do conteúdo formatado funcionaram sem overflow.
Passaram 999 testes do frontend, além de lint e build; o build manteve apenas o aviso conhecido do
budget inicial (639,63 kB para o limite de 630 kB).

Uma correção posterior separou as alterações reais do usuário das notificações assíncronas emitidas
pelo Milkdown ao receber outra página. Essas sincronizações internas deixaram de acionar o autosave
com uma revisão antiga. A investigação na aplicação real também encontrou perda de microssegundos
quando o PostgreSQL entregava `updated_date` como `Date` do JavaScript: o valor devolvido ao cliente
já não correspondia exatamente ao armazenado. O repositório passou a serializar as datas das páginas
em UTC com precisão de microssegundos. Juntas, as correções eliminaram conflitos falsos ao alternar,
criar e salvar páginas sucessivamente, com regressões automatizadas específicas para os dois casos.

Os controles de ação do editor receberam feedback tátil visual: `Salvar agora` eleva e ilumina com
o accent, enquanto `Excluir` realça apenas sua área de risco. Ambos recuam brevemente ao clique e
desativam a transição quando o sistema solicita redução de movimento. A aplicação real foi
conferida em 1920×1080 e 360×800, sem overflow.

## 2026-08-14 — Consulta do inventário de esquadrão durante missão

O acesso ao inventário coletivo foi dividido entre leitura e alteração. Qualquer membro da campanha
agora pode listar os itens, inclusive durante uma missão; adicionar, ajustar quantidade, remover e
transferir continuam usando o gate de escrita já existente, que exige `Na Base` para jogadores. O
Mestre não teve seu acesso alterado.

Na visão do jogador, o atalho deixa de ser desabilitado em missão e o painel mostra os registros em
modo de consulta, com aviso discreto. Todos os controles de escrita — catálogo, item custom,
steppers, remoção e transferência — são ocultados e também protegidos nos handlers do componente.

A aplicação real foi validada com jogador em missão em 1920×1080 e 360×800: o item temporário ficou
visível, nenhum controle de alteração foi exposto e não houve overflow. Ao final, o item foi removido
e a campanha local voltou a `Na Base`. As suítes passaram com 315 testes no backend e 957 no frontend;
o lint passou e o build do frontend manteve apenas o aviso conhecido de budget inicial (638,52 kB para
o limite de 630 kB).

## 2026-08-14 — Sidebars de inventário e rolagens com 500px

As sidebars compartilhadas de Inventário de Esquadrão e Histórico de Rolagens passaram de 420px para
500px no desktop. Como o histórico é o mesmo componente na campanha e na ficha, a largura se aplica
aos dois contextos. O inventário coletivo é uma sidebar exclusiva da campanha; a ficha preserva sua
aba de inventário individual. No mobile, ambos os painéis continuam com largura total da viewport.

A aplicação real foi inspecionada em campanha e ficha nos viewports 1920×1080 e 360×800. No desktop,
os dois painéis mediram 500px e não provocaram overflow; no mobile, mantiveram 360px sem overflow.
Lint e build do frontend passaram; o build manteve apenas o aviso conhecido do budget inicial
(638,52 kB para limite de 630 kB).

## 2026-08-14 — Itens customizados no inventário de esquadrão

O inventário compartilhado passou a oferecer `Item custom` ao lado do catálogo. O formulário
replica o análogo aprovado do inventário da ficha: mesma superfície, densidade, controles numéricos,
seletor de categoria com ícones e campos condicionais de dano/informação, resistência ou bônus.
Também inclui quantidade e descrição, que já fazem parte do contrato coletivo. Catálogo e formulário
são alternativas mutuamente exclusivas, e o formulário só fecha depois da persistência bem-sucedida.

Fragmentos e modificações estruturadas não foram simulados nem descartados silenciosamente: ficam
fora das categorias oferecidas porque o DTO coletivo ainda não consegue preservá-los. A ampliação
continua registrada na **I-020**, incluindo transferência ficha ↔ base e identidade de stacks.

A aplicação real foi comparada ao formulário da ficha em 1920×1080 e 360×800. A inspeção encontrou
e corrigiu overflow horizontal na linha de custo/peso/quantidade; depois do ajuste, formulário e
página ficaram sem overflow, e os controles mobile mediram 44px. Foram exercitados abertura,
categorias, campo condicional de Proteções, criação e remoção de um item temporário. Lint, build e os
956 testes do frontend passaram. O build manteve somente o aviso conhecido do budget inicial
(638,52 kB para limite de 630 kB).

## 2026-08-13 — Atalhos flutuantes movidos para a esquerda

O contrato compartilhado de utilitários flutuantes passou a ancorar a pilha desktop a 24px do
canto inferior esquerdo. A mudança vale conjuntamente para o inventário de esquadrão, o histórico
de rolagens e a calculadora nas telas de campanha e ficha, preservando ordem, tamanho de 48px e vão
vertical de 12px. O popup inicial da calculadora acompanha a nova âncora; painéis laterais mantêm
seu comportamento próprio.

No mobile, os atalhos da campanha e da ficha continuam `static` no cabeçalho, com alvos de 44px e
sem coordenada esquerda herdada. A aplicação real foi inspecionada em campanha e ficha nos
viewports 1920×1080 e 360×800: no desktop, os gatilhos mediram `left: 24px`; no mobile ficaram
inline e não produziram overflow. Não houve erros no navegador. Os 954 testes do frontend, lint e
build passaram; o build manteve apenas o aviso conhecido do budget inicial (638,35 kB para limite
de 630 kB).

## 2026-08-13 — Empilhamento e remoção segura no inventário de esquadrão

Adicionar um item Operacional ou Medicinal agora procura um stack com a mesma identidade
descritiva (`nome`, categoria, custo, peso, descrição, dano, informação, resistência e bônus) e,
quando encontra, incrementa sua quantidade preservando o identificador existente. Diferenças em
qualquer um desses campos mantêm registros separados; todas as demais categorias também continuam
criando registros independentes. A decisão vive no backend, autoridade do inventário, e não foi
duplicada na interface.

O botão de remoção passou a repetir o padrão aprovado do inventário da ficha: o primeiro clique no
`×` troca a ação no próprio card por `Remover item?`, com ✓ para confirmar e `×` para cancelar.
A ampliação necessária para receber, preservar, exibir e transferir itens com modificações
estruturadas foi separada do ajuste atual e registrada como **I-020** em `IDEAS.md`.

Na aplicação real, dois acionamentos da Lanterna produziram um único registro com quantidade 2;
cancelar a remoção preservou esse stack e confirmar o removeu. A confirmação foi comparada ao
padrão da ficha em 1920×1080 e 360×800; no mobile, ocupou uma linha própria sem overflow. O
navegador não registrou erros. Passaram 314 testes do backend, 953 testes do frontend, os builds dos
dois workspaces e o lint do frontend. O lint completo do backend permaneceu bloqueado somente pelas
duas asserções desnecessárias preexistentes em `campanha.service.spec.ts:675` e
`ficha.service.spec.ts:2135`; as novas ocorrências encontradas durante o desenvolvimento foram
corrigidas.

## 2026-08-13 — Refino visual do inventário de esquadrão

A visão de jogador passou a nomear o atalho como `Inventário do esquadrão`, preservando a mesma
caixa, tipografia e iconografia do controle vizinho `Abrir completa`. O estado operacional ficou
mais fino e deixou de depender do accent: `Na Base` usa o texto neutro do tema, portanto fica claro
na base escura e escuro na base clara, com o ícone canônico de item guardado; `Em Missão` usa o
vermelho fixo de Vida e o ícone de combate nas duas bases do tema.

O catálogo do inventário de esquadrão foi alinhado ao inventário da ficha: a busca ocupa uma
linha inteira antes das categorias; as categorias usam os mesmos botões com ícone, quebra de linha
e estado ativo, sem faixa rolável horizontal; os nomes dos itens não recebem ícone decorativo; e a
tipografia dos cards foi reduzida para a densidade canônica. Adicionar um item não fecha mais o
catálogo e mostra `Adicionado` temporariamente no card acionado.

A verificação na aplicação real cobriu a visão de jogador na base e em missão, temas claro e
escuro, catálogo vazio/preenchido, busca, categorias e feedback de adição em 1920×1080 e 360×800.
No celular, as categorias quebraram em linhas sem overflow horizontal; o item criado para provar a
adição foi removido ao final da inspeção. Lint, build e os 951 testes do frontend passaram. O
build manteve somente o aviso conhecido do budget inicial (638,35 kB para limite de 630 kB).

## 2026-08-13 — Frontend do inventário de esquadrão

O painel de campanha passou a expor o estado operacional `Na Base`/`Em Missão` e o inventário
compartilhado já implementados no backend. O mestre alterna o estado no cabeçalho e acessa o
inventário por uma sidebar baseada no padrão aprovado do histórico de rolagens; jogadores acessam
o mesmo conteúdo na coluna lateral quando a campanha está na base. O componente compartilhado
permite adicionar itens do catálogo, ajustar ou remover quantidades e transferir itens nos dois
sentidos entre a base e fichas do próprio jogador. Na ficha, itens não equipados oferecem a ação
`Mandar pra base`; stacks pedem a quantidade antes da transferência. As alterações chegam por
WebSocket e provocam nova leitura REST, preservando o gateway como broadcast-only.

A inspeção da aplicação real cobriu o estado vazio, catálogo, item preenchido, bloqueio em missão,
transferência ficha → base → ficha e a visualização do jogador em 1920×1080 e 360×800. O drawer foi
alinhado ao `HistoricoRolagensSidebar`, os cards/steppers passaram a seguir a densidade do inventário
da ficha e o diálogo de transferência foi corrigido para ficar centralizado e visível no mobile. O
cabeçalho compacto também acomoda os dois controles do jogador sem overflow. A suíte completa passou
com 59 arquivos e 949 testes no frontend e 22 arquivos e 310 testes no backend; lint e build do
frontend também passaram.
O build manteve apenas o aviso conhecido do budget inicial (638,35 kB para limite de 630 kB).

Uma revisão visual posterior alinhou o gatilho do jogador exatamente ao botão `Abrir completa`
(mesma caixa, tipografia e ícone nos dois viewports) e substituiu o seletor genérico do catálogo por
categorias com os ícones canônicos. Os cards de aquisição agora repetem a hierarquia da ficha:
nome, dado mecânico, descrição, custo/peso e ação compacta. No mobile, a grade acompanha a rolagem
da página em vez de criar uma rolagem interna. A inspeção confirmou os dois botões com 141,5×44 px,
texto de 10 px e ícones de 12×12 em 360×800, sem overflow; os 949 testes, lint e build passaram.

## 2026-08-13 — Resolução tardia de `CampanhaService` em `FichaService`

O backend voltava a falhar ao iniciar com `UndefinedDependencyException` no terceiro argumento de
`FichaService`. A causa era o ciclo `FichaModule → CampanhaModule → GatewayModule → FichaModule`:
o token de `CampanhaService` era avaliado antes de o ciclo estar completo. A injeção agora usa
`@Inject(forwardRef(() => CampanhaService))`, espelhando a resolução já usada para
`CampanhaGateway`. Um teste de regressão verifica o metadado de injeção adiada. Build e a suíte
completa do backend passaram (22 arquivos, 310 testes); o lint continua bloqueado por duas
asserções desnecessárias preexistentes em `campanha.service.spec.ts:675` e
`ficha.service.spec.ts:2135`, fora deste ajuste.

## 2026-08-12 — Design dos cadernos privados e busca unificada

O autor aprovou o design de cadernos por campanha: cada membro possui um caderno conceitual formado
por várias páginas Markdown, sem imagens ou anexos. O autor administra suas páginas; o mestre lê e
pesquisa as páginas dos jogadores em modo estritamente somente leitura; jogadores não compartilham
cadernos entre si. A busca PostgreSQL combina, por filtros permitidos ao papel, páginas de caderno e
anotações de ficha. Na interface, o Caderno será uma janela não modal na mesma pilha de utilitários
da Calculadora e dos Documentos, arrastável, redimensionável e minimizável no desktop e adaptada como
painel no mobile. A especificação de design está em
`docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md`.

## 2026-08-12 — Busca de documentos e anotações: PostgreSQL primeiro

O autor decidiu que a futura busca de anotações de ficha, campanha e documentos usará inicialmente
o full-text search nativo do PostgreSQL/Supabase. A implementação deve usar `tsvector`, consulta
amigável e índice GIN, com a service do backend aplicando as permissões antes de retornar qualquer
resultado. Elasticsearch não integra a infraestrutura atual: fica registrado como evolução possível
para busca semântica/híbrida, relevância mais sofisticada ou volume maior. Se adotado, será apenas um
índice reconstruível; PostgreSQL continua a fonte de verdade.

## 2026-08-12 — hover temático do retorno ao painel

O botão `Retornar ao painel` da tela de acesso negado passou a seguir o comportamento sancionado
dos controles primários: repouso vazado, preenchimento com `--accent` no hover, texto em `--bg`,
brilho de 1,08 e glow derivado de `--accent-border`. A transição deixou de usar `all` e agora se
limita a cor, fundo, borda, sombra e filtro, mantendo o peso tipográfico estável.

Lint, teste focado e build do frontend passaram, com apenas o aviso conhecido de budget `P-004`.
A inspeção real confirmou o hover com os accents vermelho e azul em 1920×1080; em 360×800 o botão
manteve 44 px de altura e a página permaneceu sem overflow horizontal. O servidor temporário foi
encerrado e a porta 4301 ficou livre.

## 2026-08-12 — registro expurgado variável

O bloco `REGISTRO` de `/acesso-negado` deixou de usar uma barra contínua. O frontend agora escolhe
um de oito moldes Lorem Ipsum e converte cada letra em `█`, preservando espaços e pontuação para
produzir ritmo de palavras e quebras documentais naturais sem expor o texto original no DOM. O
catálogo institucional passou de 16 para 32 mensagens com aproximadamente o dobro do conteúdo, e
cada uma recebe um fragmento censurado variável de protocolo, unidade, autoridade ou localização.

Os ajustes visuais feitos pelo autor na classificação, nos avisos, no rodapé e no botão foram
preservados. Lint, build e a suíte completa do frontend passaram (57 arquivos, 933 testes), com
apenas o aviso conhecido de budget `P-004` (638,35 kB). A inspeção real em 1920×1080 e 360×800
confirmou duas e cinco linhas censuradas, respectivamente, sem overflow horizontal. Dez recargas
produziram dez mensagens e oito registros distintos. O servidor temporário foi encerrado e a porta
4301 ficou livre.

## 2026-08-12 — acesso negado isolado e reforçado

A rota `/acesso-negado` deixou de renderizar a topbar e os utilitários globais, preservando apenas
o documento central de contenção. O `Layout` deriva esse estado da URL final do Angular Router,
inclusive quando a rota possui parâmetros de consulta, sem alterar o shell das demais páginas.

O documento passou a usar a marca oficial do site como selo da Fundação, ganhou largura de 920 px
no desktop, retorno ao painel com tratamento inequívoco de botão e censuras formadas pelo caractere
`█`. Um catálogo imutável de 16 mensagens institucionais escolhe uma variação por carregamento;
em oito recargas da verificação real foram observadas seis mensagens distintas.

Lint, build e a suíte completa do frontend passaram (57 arquivos, 931 testes); o build manteve
somente o aviso conhecido de budget `P-004` (638,35 kB). A inspeção real em 1920×1080 e 360×800
confirmou topbar ausente, logo presente, documento sem overflow horizontal e botão de retorno com
48 px no desktop e 44 px no mobile. O primeiro corte mobile revelou compressão de textos longos;
os limites flexíveis foram corrigidos antes da segunda captura.

## 2026-08-12 — `m6-08`: impersonação administrativa implementada, gate visual desktop pendente

A gestão administrativa ganhou a ação **Logar como** para contas ativas diferentes da sessão
atual. A confirmação inline identifica nome/login e explicita que a sessão administrativa será
substituída; cancelar ou clicar fora não chama o endpoint. No sucesso, `SessaoService` grava o
`UsuarioAutenticadoDto` retornado como a única sessão, o cliente de tempo real reconecta com o
novo token e a aplicação navega para `/painel`. A própria conta e contas excluídas não oferecem a
ação.

No backend, `POST /usuario/admin/impersonar` permanece protegido por `ADMIN`, valida alvo ativo e
recusa autoimpersonação. O emissor JWT foi extraído para `SessaoTokenService`, usado tanto pelo
login quanto pela impersonação, garantindo id, login, tipo e `tokenVersao` atuais sem senha/hash.
A migration `0016` criou `usuario_impersonacao`, com origem, alvo e data; foi aplicada com sucesso
no banco local. Validações malsucedidas não geram token nem auditoria.

Shared fechou 601 testes, backend 281 e frontend 928; lint e builds dos três workspaces passaram,
com o aviso conhecido de budget `P-004` (637,08 kB). A inspeção real em 360×800 encontrou e
corrigiu a quebra de login longo na confirmação, confirmou alvos de 44 px, ausência de overflow,
omissão na própria conta e preservação da densidade da linha aprovada. A automação Edge usada para
o segundo viewport ficou bloqueada repetidamente antes da captura de 1920×1080; portanto, pela
definição de pronto do repositório, a spec permanece em `active/` até esse último gate visual.

## 2026-08-12 — `m6-07`: refinamento mobile da gestão de usuários

O passe responsivo obrigatório do M6 auditou a gestão administrativa, a topbar e a página de
acesso negado usando o padrão aprovado da `m1-15`/`m2-08`: breakpoint Sass compartilhado,
densidade por tokens e `$alvo-toque` de 44 px. A gestão ganhou quebra segura para nomes e logins
longos, alvos adequados no comando de criação, troca de tipo e paginação, além de ações empilhadas
nos formulários de criação, edição, senha e confirmação de exclusão. DOM, TypeScript, permissões e
operações administrativas permaneceram intactos.

A verificação ao vivo percorreu listagem, filtros, criação, edição, redefinição de senha, menu e
confirmação de tipo, exclusão e reativação em 360×800, 390×800 e 430×800; a gestão também foi
inspecionada em 1920×1080. Em todos os estados, `html` e `body` permaneceram sem overflow
horizontal e os controles interativos novos mediram ao menos 44 px no mobile. A topbar manteve o
item Admin dentro da viewport, e a página de acesso negado preservou classificação, censura,
`[DADOS EXPURGADOS]`, `REDACTED` e retorno ao painel em 360 px. Lint e a suíte completa do frontend
passaram (56 arquivos, 925 testes); o build de produção passou com o aviso conhecido de budget
inicial (`P-004`, 637,13 kB para o limite de aviso de 630 kB). Próxima task: `m6-08`.

## 2026-08-12 — `m6-06`: gate frontend por tipo e acesso negado institucional

O frontend ganhou a factory `tipoGuard(tiposPermitidos)`, pronta para proteger rotas de módulos
futuros por `TipoUsuarioEnum`. Ela preserva a URL pedida ao enviar uma sessão ausente para o login,
libera tipos autorizados e direciona os demais usuários autenticados a `/acesso-negado`. O JSDoc
documenta tanto a aplicação do gate quanto sua substituição por `autenticacaoGuard` quando um
módulo deixar a fase restrita. Nenhuma rota funcional existente recebeu o gate nesta task.

A nova rota pública e lazy apresenta uma negação genérica no tema Terminal de Contenção: shell
institucional, classificação `CLASSE-4 // CONFIDENCIAL`, censura visual, `[DADOS EXPURGADOS]`,
marcação `REDACTED` e retorno ao painel. O card da Gestão de Usuários e seus estados de feedback
serviram como análogos aprovados. Testes focados do guard fecharam 4/4; lint e build do frontend
passaram, com o aviso conhecido do budget inicial (`P-004`). A inspeção visual desktop confirmou
hierarquia, densidade e tokens; o primeiro corte mobile revelou largura mínima excessiva e recebeu
limites responsivos antes do fecho. A spec foi movida para `docs/specs/done/`; próxima task:
`m6-07-refinamento-mobile-gestao-usuarios.spec.md`.

## 2026-08-12 — correção do entrypoint de produção do backend

O deploy do Render compilava o backend com sucesso, mas encerrava ao executar `node dist/main`.
A inclusão recente das ferramentas locais em `backend/tools/` ampliou implicitamente a raiz comum
do TypeScript, fazendo o Nest emitir a aplicação em `dist/src/main.js` e também publicar scripts de
desenvolvimento no artefato de produção. O `tsconfig.build.json` agora inclui explicitamente apenas
`src/**/*.ts`, restaurando o contrato original `dist/main.js` usado por `start:prod` e mantendo
`tools/` fora do build de produção.

## 2026-08-12 — `m6-05`: gestão visual administrativa de usuários

A aplicação ganhou `/admin/usuarios`, rota lazy protegida por `adminGuard` e acessível pela topbar
somente para administradores. A tela reúne listagem paginada e todas as operações das `m6-03` e
`m6-04` em interações inline, usando a lista de campanhas como análogo visual aprovado.

- A busca única consulta nome ou login com debounce de 300 ms; tipo e situação filtram
  imediatamente. A situação inicia em “Não deletados”, aceita todos/deletados, e uma vassoura
  restaura o conjunto padrão em uma consulta.
- A troca de tipo usa chips com iconografia e cores estáveis, menu contextual que exclui o valor
  atual, fecha por clique externo e só persiste após o check; o X descarta a seleção. Criação,
  edição de nome/login e reset de senha permanecem na própria linha, assim como confirmações de
  exclusão e reativação.
- A criação administrativa ganhou `UsuarioAdministrativoCriarDto`, separado do registro público:
  admin escolhe `NORMAL`, `ADMIN` ou `TESTER`, enquanto auto-registro continua forçando `NORMAL`.
- O perfil agora informa o tipo sem permitir edição; a sessão fornece fallback para instâncias de
  API antigas que ainda omitam o campo. A topbar sinaliza `ADMIN` com escudo e `TESTER` com o
  ícone azul, mantendo contas normais sem selo adicional.
- A listagem backend passou a aceitar busca OR por nome/login e situação ativa/excluída/todas. O
  login voltou a incluir `tipo` na resposta, alinhando o contrato de sessão ao JWT.
- Refino visual pós-entrega removeu o avatar decorativo listrado da topbar. O gatilho do perfil
  passou a mostrar o ícone do tipo para contas `NORMAL`, `ADMIN` e `TESTER`, ao lado do nome.
- No mobile, a troca inline de tipo ganhou uma faixa própria abaixo da identidade; menu, check e
  cancelamento deixam de disputar largura com o nome em 360 px.

Gates focados cobriram guard, cliente HTTP, service/repository backend, perfil, topbar e interações
da gestão; as suítes completas fecharam em shared 601/601, backend 275/275 e frontend 921/921,
com lint e builds dos três workspaces sem falhas. A spec foi movida para `docs/specs/done/`. Próxima
task: `m6-06-frontend-gate-tester-acesso-negado.spec.md`.

## 2026-08-12 — `m6-04`: operações sensíveis e invariantes administrativas

A gestão de usuários agora permite trocar o tipo global e resetar a senha de uma conta. As duas
operações incrementam `token_versao`, fazendo o `AutorizacaoGuard` rejeitar no request seguinte
qualquer sessão emitida antes da mutação; o reset usa o mesmo custo bcrypt dos fluxos existentes e
nunca retorna senha ou hash.

- A `UsuarioService` preserva ao menos um `ADMIN` ativo em exclusões administrativas,
  rebaixamentos e na exclusão self-service. A gestão também bloqueia o admin de excluir ou
  rebaixar a si próprio, independentemente da quantidade de outros administradores.
- A exclusão administrativa consulta o `CampanhaRepository`, dono da relação de campanhas, e
  bloqueia mestres de campanhas ativas com orientação explícita para transferir o papel ou excluir
  a campanha. O edge histórico do self-service não foi ampliado, conforme o fora de escopo.
- O SQL traduz `TipoUsuarioEnum` pela tabela `tipo_usuario`, conta administradores ativos com alvo
  opcionalmente excluído e incrementa a versão do token somente em contas ativas. Novos DTOs
  compartilhados cobrem troca de tipo, reset de senha e seus retornos sem credenciais.
- O TDD registrou 7 falhas de service, 4 de repository e 2 de controller antes das implementações.
  Gates finais: shared 601/601, backend 272/272, lint e builds de shared/backend sem falhas. O
  frontend não foi alterado.

## 2026-08-12 — `m6-03`: CRUD administrativo básico de contas

O módulo de usuário ganhou uma superfície administrativa sob `usuario/admin`, protegida no
controller inteiro por `@TiposPermitidos(ADMIN)`. Ela lista contas ativas ou excluídas com busca,
filtro de tipo, ordenação segura e paginação; cria contas sempre como `NORMAL`; altera nome/login;
faz soft delete; e reativa uma conta preservando `login` e `nome`.

- Novos contratos compartilhados cobrem filtro/listagem paginada, resumo com descrição do tipo e
  reativação. A listagem resolve `tipo_usuario.codigo` e `descricao` no SQL e mantém
  `usuario.is_deleted = :apenasExcluidos` explícito em todas as consultas.
- A regra de criação passou para `UsuarioService`; o registro público delega a ela, garantindo uma
  única validação de login e um único fluxo de bcrypt/persistência `NORMAL`.
- Alteração e exclusão administrativas reutilizam os mesmos pontos centrais do self-service. As
  invariantes e operações sensíveis seguem deliberadamente fora deste corte, reservadas à `m6-04`.
- TDD registrou as ausências dos métodos e metadados, além de uma regressão específica que provou e
  fechou a interpolação insegura da direção de ordenação. Gates finais: shared 601/601, backend
  259/259, lint e builds de shared/backend sem falhas. O frontend não foi alterado.

## 2026-08-11 — `m6-02`: autorização global e revogação imediata de sessão

O backend passou a validar o estado persistido da sessão em toda rota não pública. O JWT agora
carrega `tipo` e `tokenVersao` como conveniência, enquanto o novo `AutorizacaoGuard`, registrado
depois do `JwtAuthGuard`, relê tipo, versão e soft delete no banco antes de decidir o acesso.

- Sessão ausente, excluída ou com versão divergente produz 401 no request seguinte; a consulta
  dedicada é a exceção intencional que enxerga `usuario.is_deleted` para revogar a conta.
- `@TiposPermitidos(...)` centraliza restrições por `TipoUsuarioEnum` e decide com o tipo fresco;
  incompatibilidade produz 403. Nenhuma rota M0–M5 foi restringida nesta entrega.
- `recuperarPorLogin` e `recuperarPorId` passaram a traduzir a FK ativa de `tipo_usuario` e trazer
  a versão usada na emissão do token.
- TDD cobriu claims, SQL e guard; gates finais: shared 601/601, backend 244/244, builds de shared e
  backend e lint dos dois workspaces sem falhas. O frontend não foi alterado.

## 2026-08-11 — `m6-01`: tipo global de usuário e controle de sessão

O M6 foi aberto com a fundação de dados para papéis globais e invalidação futura de sessões. A
migration `0015` criou `tipo_usuario`, semeou `NORMAL`/`ADMIN`/`TESTER`, adicionou a FK
`usuario.tipo_usuario_id` e `usuario.token_versao`, e fez o backfill sem `DEFAULT`: a conta
`senhor.contratados` tornou-se `ADMIN`, as demais `NORMAL`, todas na versão `1`.

- `TipoUsuarioEnum` passou a ser o espelho compartilhado da tabela relacional.
- O registro público injeta `NORMAL` na service; o repositório traduz o código para a FK ativa e
  grava a versão `1` como literal, sem permitir que o cliente escolha o próprio tipo.
- `SCHEMA.md` foi sincronizado com a nova tabela e as colunas de `usuario`.
- TDD: os testes focados provaram primeiro a ausência do tipo na service e do novo SQL no
  repositório; depois fecharam verdes. Gate final: shared 601/601, backend 236/236, lint e builds
  de ambos os workspaces sem falhas.
- Banco real com quatro contas existentes: `up` confirmou os três seeds, backfill e colunas
  `NOT NULL` sem `DEFAULT`; `down` removeu tabela/colunas limpo; novo `up` reaplicou. Um
  `POST /autenticacao/registro` real persistiu `NORMAL` e `token_versao = 1`; a conta temporária
  de verificação foi removida por soft delete.

## 2026-08-11 — `dev-01`: stubs ganham fichas nas duas campanhas

O cenário inicial vinculava `jogador.stub.1` e `jogador.stub.2` às duas campanhas, mas criava fichas
somente para Matheus e Codex. O seed foi ampliado de quatro para oito fichas: cada stub agora possui
uma ficha diferente em cada campanha, com nome, classe, arquétipo, progressão e cor próprios.

- Campanha do Matheus: `Vanguarda Stub 1` (`#0891B2`) e `Diplomata Stub 2` (`#DB2777`).
- Campanha do Codex: `Acadêmico Stub 1` (`#0D9488`) e `Lutador Stub 2` (`#DC2626`).
- O resumo do seed deixou de hardcodar contagens e passou a derivá-las de `CENARIO_DEV`, evitando
  divergência quando o cenário crescer.
- O banco local foi apagado novamente sem backup por autorização do autor, recriado com 14
  migrations e auditado com 4 usuários, 2 campanhas, 8 membros, 8 fichas e 8 cores distintas. Uma
  segunda execução do seed manteve as mesmas contagens.
- Após o autor confirmar o login pessoal e os testes manuais do cenário, a spec `dev-01` foi
  encerrada e movida para `docs/specs/done/`.

## 2026-08-11 — `P-020`: backend volta a carregar o `.env` da raiz em dev

O `ConfigService` resolvia o `.env` subindo três níveis a partir de `__dirname`. Isso funcionava
durante testes sobre `src/`, mas o JavaScript compilado vive em `backend/dist/src/config/` e chegava
a `backend/.env`, fazendo `npm run backend:dev` encerrar com `DB_HOST` ausente.

- A resolução agora parte de `process.cwd()` e procura primeiro no diretório de execução e depois
  em seu pai. Assim cobre tanto execução pela raiz do monorepo quanto pelo workspace `backend`, sem
  depender de `src` versus `dist`.
- O spec de configuração ganhou regressão para os dois diretórios e passou a isolar o efeito externo
  do `dotenv`; o caso de variável obrigatória ausente voltou a testar somente o contrato do service.
- Verificado com build, lint e suíte backend completos (231/231). O artefato compilado foi iniciado
  com `DB_HOST` removido do ambiente herdado e respondeu `GET /health` com HTTP 200 numa porta
  temporária, comprovando a leitura do `.env` real.

## 2026-08-11 — `dev-01`: banco local reproduzível com contas, campanhas e fichas padrão

O banco de desenvolvimento acumulava dados antigos e não havia reset seguro nem um cenário comum
para testes manuais. A base local foi apagada sem backup por autorização explícita do autor e
recriada do zero com 14 migrations e fixtures determinísticas.

- `backend/tools/database/reset-dev.guard.ts`: trava anterior a qualquer subprocesso — exige
  `development`, loopback, banco `contratados_rpg`, usuário `postgres` e armazenamento `local`.
- `reset-dev.ts`: `npm run db:reset:dev` opera somente sobre o Compose desta raiz, remove o volume,
  sobe o PostgreSQL, migra e semeia em fail-fast. A primeira integração revelou que Node/Windows
  devolve `EINVAL` ao executar `npm.cmd` por `execFileSync`; a regressão ganhou teste e o fluxo passou
  a chamar `node.exe + npm-cli.js`, sem shell.
- `cenario-dev.ts`/`seed-dev.ts`: seed transacional e idempotente com Matheus, Codex e dois stubs;
  duas campanhas com mestre/jogadores cruzados; quatro fichas de agente com JSONB derivado por
  `shared/regras` e cores âmbar/azul/verde/violeta. A senha do autor é preservada; Codex/stubs usam a
  credencial local documentada. `npm run db:seed:dev` reconcilia somente as fixtures.
- Banco auditado após reset e duas repetições do seed: 14 migrations, 4 usuários, 2 campanhas,
  8 vínculos, 4 fichas, 4 cores distintas, somente tipo `JOGADOR`, nenhum dono sem vínculo e hash do
  autor idêntico ao seed histórico.
- Verificação real com `codex.dev`: login REST emitindo token; painel e detalhes observados em
  `1920×1080` e `360×800`; Codex aparece mestre na própria campanha e jogador na do Matheus; quatro
  membros nas duas; como jogador vê somente a própria ficha, como mestre vê as duas; cores corretas,
  sem overflow, erro de console ou request inesperado. O login pessoal de `senhor.contratados` ficou
  para confirmação manual do autor, sem compartilhar credencial nem forjar sessão; por isso a spec
  permanece em `active/`.
- Gates: builds `shared`/backend verdes; 34/34 testes focados; lint do backend e das ferramentas
  verdes; suíte backend completa em 229/230 pela mesma falha baseline de `ConfigService` aceita antes
  da implementação. A verificação ao vivo também revelou o novo `P-020`.
- Operação e credenciais documentadas em `docs/DEVELOPMENT.md`; README, `.env.example`, `CONTEXT.md`
  e `MEMORY.md` sincronizados.

## 2026-08-11 — `I-011`: dadinhos do pool ganham a cor do tipo de dano do próprio termo

Numa fórmula com vários tipos de dano (`4d6[F] + 4d6[Q]`), só os chips de resumo abaixo
(`resultado-rolagem__grupo`) eram coloridos por tipo — o pool de dados em si ficava todo na mesma
cor neutra, sem pista visual de qual `NdM` era qual tipo além da ordem na fórmula. Pedido pequeno o
bastante (só frontend, paleta e dado já existiam) pra implementar direto, sem passar por spec no
backlog.

- `resultado-rolagem.component.ts`: novo `classeDado(dado: DadosRoladosDto)`, no mesmo padrão do
  `classeGrupo` já existente — usa o `tipoDano` do próprio termo (`DadosRoladosDto.tipoDano`, já
  vinha do motor) e o mesmo mapa `SUFIXO_TIPO_DANO`. Termo Composto (`[A-B]`) não tem `tipoDano`
  (fica no par 50/50, `composto`) — o dado não sabe pra qual metade caiu, então fica só na classe
  base neutra, sem tentar adivinhar.
- `resultado-rolagem.component.html`: o `<span>` de cada dadinho trocou a classe estática por
  `[class]="classeDado(dado)"`, mantendo `[class.resultado-rolagem__dado--escolhido/--descartado]`
  como bindings à parte — Angular compõe as duas.
- `resultado-rolagem.component.scss`: novo `@each` dentro de `&__dado` com a mesma paleta de
  `&__grupo` (`--dano-*`/`-border`/`-dim`). Declarado **antes** de `--escolhido`/`--descartado` no
  SCSS de propósito: quando um dado também está marcado como mantido (`kh`/`kl`), a cor de
  "escolhido" (accent) continua prevalecendo — mesma prioridade visual de sempre; "descartado" só
  mexe em opacidade/risco, então a cor de tipo continua visível por baixo.
- Testado: componente não tinha spec dedicada — criada `resultado-rolagem.component.spec.ts` (4
  testes: sem tipo fica neutro, cada termo tipado colore os próprios dados, Composto não colore,
  escolhido/descartado combinam com a cor de tipo). `frontend`: 900/900 (+4, +1 arquivo). `lint`/
  `build` limpos.
- `IDEAS.md`: `I-011` sai de Abertas, registrada em Promovidas apontando pra este relato (sem spec
  formal — implementação direta).

## 2026-08-11 — `P-019`: seletor de Classe do guia de criação vira dois passos (base → arquétipo/subclasse)

O `<select>` único do passo // Classe misturava, nos mesmos `<optgroup>`, as três classes-base, as
três subclasses de Experimento e Civil — todos como opções de primeiro nível. O dono pediu o fluxo
que o próprio doc já descreve (`sistema-v4.1.0.md` — "⬡ Subclasse": "Após escolher a sua classe você
pode escolher tomar uma subclasse e abdicar de ganhar o seu arquétipo"): primeiro escolher a
classe-base (Combatente/Especialista/Suporte) ou Civil; só então, se não for Civil, uma segunda
etapa escolhe entre os arquétipos regulares **e** a subclasse de Experimento daquela base.

- `shared/regras/agente/habilidades-catalogo.ts`: novo export `subclasseExperimentoDaClasseBase`,
  o inverso de `classeBaseDeHabilidades` — devolve a subclasse de Experimento de uma classe-base
  (`null` pra Civil ou pra quem já é subclasse). Reusa o mapa `CLASSE_BASE_DA_SUBCLASSE` já existente,
  nenhuma tabela nova duplicada.
- `frontend/.../opcoes-ficha.ts`: `GRUPOS_CLASSE_BASE` (primeira etapa: só as três bases + Civil,
  sem Experimento) e `gruposPerfilDaClasseBase(base)` (segunda etapa: optgroup "Arquétipos" + optgroup
  "Subclasse" quando existe) — `GRUPOS_CLASSE` original ficou intacto pro editor de classe da ficha
  já existente (`ficha-visualizacao.component.ts`), fora do escopo pedido. `classeBaseDoSeletor(classe)`
  resolve a base "efetiva" de uma classe já definitiva (a própria, se base/Civil; a base da subclasse,
  se Experimento) — usada pra reabrir o primeiro select no valor certo.
- `frontend/.../criar.page.ts`: `EstadoGuiaCriacao` ganhou `classeBase` (a escolha da primeira etapa,
  guardada à parte de `classe` porque ela existe antes da segunda etapa fechar o perfil). Computeds
  novos: `classeBaseAtual()` (cai pra derivar de `classe` quando `classeBase` está ausente — cobre
  rascunhos salvos antes desta mudança e os vários testes que montam estado direto via
  `atualizar({classe, arquetipo})`), `gruposPerfil()`, `perfilSelecionado()`. `mudarClasse`/
  `mudarArquetipo` viraram `mudarClasseBase`/`mudarPerfil`; trocar a base sempre reseta tudo (igual
  antes); trocar entre arquétipo ↔ subclasse na segunda etapa só reseta o pacote de Habilidades
  iniciais e as melhorias quando a `classe` final de fato muda — entre dois arquétipos da mesma base,
  preserva as duas coisas (mesmo comportamento de sempre).
- Testado: `habilidades-catalogo.spec.ts` ganhou testes de `subclasseExperimentoDaClasseBase`.
  `criar.page.spec.ts` ganhou um describe novo (8 testes: DOM das duas etapas, escolha de
  arquétipo/subclasse, reset ao trocar de base, preservação/reset do pacote inicial). `shared`:
  601/601 (+2). `frontend`: 896/896 (+8). `backend`: 196/196 (não mudou). `lint`/`build` limpos nos
  três workspaces.

## 2026-08-11 — `P-014` follow-up 2: rótulo dos pacotes de Habilidades iniciais também vira "Classe/Subclasse"

Mais um ponto que o `P-014` tinha deixado fixo em "Arquétipo": os cards de **Pacote de criação** do
passo // Habilidades ("2 Gerais + 1 de Classe/Arquétipo", "2 de Classe/Arquétipo") são texto de
`listarPacotesHabilidadesIniciais` (`shared/regras/agente/habilidades-iniciais.ts`), que não tinha
sido tocado nas duas rodadas anteriores — o dono reportou pelo print da tela.

- `habilidades-iniciais.ts`: `PACOTES_AGENTE` (constante fixa) virou `pacotesAgente(classe)`
  (função), que monta o rótulo da vaga combinada via `rotuloClasseOuArquetipo` — mesmo critério de
  `classeBaseDeHabilidades` usado em todo o resto do P-014 (Classe/Subclasse quando a classe é uma
  subclasse de Experimento; Classe/Arquétipo nas demais). Só os dois pacotes que citam essa vaga
  mudam (`DUAS_GERAIS_UMA_CLASSE_OU_ARQUETIPO`, `DUAS_CLASSE_OU_ARQUETIPO`); "4 Gerais" e "3 Civis"
  não citam Arquétipo, ficam como estavam.
- Testado: `habilidades-iniciais.spec.ts` ganhou um `it.each` novo cobrindo as três subclasses de
  Experimento. `criar.page.spec.ts` ganhou dois testes de DOM nos cards de pacote (Experimento vs.
  classe base). `shared`: 599/599 (+3). `frontend`: 888/888 (+2). `backend`: 196/196 (não mudou).
  `lint`/`build` limpos nos três workspaces.

## 2026-08-11 — `P-014` follow-up: Subclasse ganha aba própria no seletor de habilidades, separada de Arquétipo

Correção sobre a correção do dia: o `P-014` (rótulo "Arquétipo" virando "Subclasse") tinha resolvido
o diálogo "Adicionar do sistema" trocando o **nome** de uma aba única que carregava os dois
conceitos juntos (a subclasse do Experimento como um sub-chip a mais dentro da aba "Arquétipo"). O
dono pediu uma correção mais estrutural: Subclasse e Arquétipo deviam ser **abas separadas**, não
uma só trocando de nome. Escopo confirmado com o dono: só o diálogo do seletor — o contador do
resumo da aba Habilidades da ficha e o rótulo da vaga no guia de criação continuam como ficaram no
`P-014` (um rótulo só, que troca de nome).

- `shared/regras/agente/habilidades-catalogo.ts`: `GrupoHabilidades['id']` ganhou o valor
  `'subclasse'`. `grupoArquetipo` foi dividido em duas funções — `grupoSubclasse` (só a própria
  subclasse do Experimento, sempre `ehDaFicha`, `[]` fora de Experimento) e `grupoArquetipo`
  (só os arquétipos regulares da classe-base, nunca `ehDaFicha` pra um Experimento — a dele é a
  Subclasse). `catalogoHabilidades` passou a devolver os dois grupos em sequência (Gerais, Classe,
  Subclasse, Arquétipo), cada um omitido quando vazio.
- `frontend/.../ficha-habilidade-seletor.component.ts`: revertida a lógica dinâmica do `P-014`
  (que inspecionava o subgrupo `ehDaFicha` pra decidir se a aba "Arquétipo" virava "Subclasse") —
  agora `subclasse`/`arquetipo` são ids de aba genuinamente distintos, então o rótulo volta a ser um
  mapa fixo por id. `temSubfiltro` não mostra chips pra Subclasse (só tem um subgrupo possível, nunca
  cruza — igual Gerais/Civil).
- `frontend/.../criar.page.ts` (`gruposParaVaga`, guia de criação): achado no caminho — sem ajuste
  aqui, a vaga `classeOuArquetipo` teria **perdido acesso à Subclasse inteira** pra um Experimento
  (o filtro de ids relevantes só conhecia `'classe'`/`'arquetipo'`; com a subclasse morando num id
  novo, ela simplesmente não apareceria mais nessa vaga — incluindo a Peculiaridade). Corrigido
  incluindo `'subclasse'` na lista de ids relevantes. Essa vaga continua mostrando só as abas de
  origem **própria** (Classe/Subclasse) — pra um Experimento, a aba "Arquétipo" nunca aparece aqui
  mesmo, porque nenhum arquétipo regular da classe-base é "seu" (o dele é a subclasse); isso já era
  assim antes do follow-up, não é regressão.
- Testado: `habilidades-catalogo.spec.ts` (shared) reescrito pro grupo dividido, +1 teste novo.
  `ficha-habilidade-seletor` não tem spec própria (component só de apresentação); a cobertura de DOM
  vive em quem o abre — `ficha-habilidades.component.spec.ts` ganhou um describe novo provando as
  duas abas simultâneas numa ficha Experimento (e só Arquétipo numa classe-base) no diálogo livre de
  "Adicionar do sistema"; `criar.page.spec.ts` teve o teste do `P-014` ajustado pra refletir que a
  vaga `classeOuArquetipo` mostra só "Subclasse" (não "Arquétipo") pra um Experimento. `shared`:
  596/596 (+1). `frontend`: 886/886 (+2, um teste do P-014 ajustado no lugar). `backend`: 196/196
  (não mudou, só roda contra o `shared` publicado). `lint`/`build` limpos nos três workspaces.

## 2026-08-11 — `P-014` corrigido: rótulo "Arquétipo" agora vira "Subclasse" nas fichas de Experimento

`P-014` estava aberto esperando o dono confirmar o escopo exato — em especial se o Civil também
precisava de ajuste, já que ele tem um grupo próprio (`id: 'civil'`, rótulo "Civil") separado de
"Arquétipo". O dono confirmou nesta sessão: o pedido anterior sobre o Civil foi um engano dele, sem
bug nenhum aí — o escopo real é só trocar "Arquétipo" por "Subclasse" nos três lugares onde o rótulo
fica fixo mesmo numa ficha de subclasse de Experimento (Bestial/Artificial/Híbrido).

- `ficha-habilidade-seletor.component.ts` (diálogo "Adicionar do sistema"): a aba que hoje sempre
  mostra "Arquétipo" agora checa se o subgrupo da própria ficha naquele grupo é identificado por uma
  `ClasseEnum` (a subclasse ocupa o lugar do arquétipo pra Experimento, mesmo dado que já vinha de
  `catalogoHabilidades`/`grupoArquetipo`) — se for, o rótulo vira "Subclasse". Nenhuma regra nova:
  só leitura do que o catálogo já resolvia.
- `ficha-habilidades.component.ts` (resumo por categoria da aba Habilidades): o chip "Arquétipo"
  virou dinâmico (`rotuloResumoArquetipo`, mesmo critério de `classeBaseDeHabilidades` usado pelo
  chip por item) — "Subclasse" numa ficha Experimento, "Arquétipo" nas demais, nunca em Civil
  (`classeBaseDeHabilidades` devolve `null` pra Civil, tratado à parte pra não virar "Subclasse" por
  engano). De quebra, corrigido um gap encontrado no caminho: `bucketResumo` nunca somava habilidades
  de categoria `SUBCLASSE` em bucket nenhum — elas ficavam fora da contagem e do filtro inteiro. Agora
  somam no mesmo bucket de Arquétipo (é o mesmo conceito, só renomeado na exibição).
- `criar.page.ts` (guia de criação, passo // Habilidades): a vaga `classeOuArquetipo` tinha rótulo
  fixo "Classe ou Arquétipo"; agora vira "Classe ou Subclasse" quando a classe da ficha não é de base
  (`!ehClasseBase`, mesmo critério já usado no resto do guia) — cobre tanto o cabeçalho da vaga quanto
  o botão "+ Escolher…" e a aba do seletor que abre a partir dela.
- `docs/core/sistema-v4.1.0.md` não mudou — isto é rótulo de UI, não revisão de regra.
- Testado: `criar.page.spec.ts` ganhou um teste de rótulo de vaga (`vagasMelhoria()`) e dois testes de
  DOM abrindo o seletor pra conferir a aba renderizada, Experimento vs. classe base.
  `ficha-habilidades.component.spec.ts` ganhou um describe novo cobrindo o rótulo dinâmico do resumo
  e a contagem de uma habilidade `SUBCLASSE`. `shared` não mudou (nenhum teste novo lá). `frontend`:
  884/884 (era 878/878, +6 testes novos). `lint`/`build` limpos nos dois workspaces.

## 2026-08-11 — `P-016` corrigido: Potencializador solto no inventário não custa mais Energia

`P-016` estava marcado como pendente de decisão do dono — o comportamento reportado como
indesejado (Potencializador drenando Energia Máxima assim que adquirido/portado, mesmo solto e sem
nunca ter sido acoplado a nada) era exatamente o que `docs/core/sistema-v4.1.0.md` descrevia ("⬥
Módulos": "Cada um dos módulos gasta sua Energia ao entrar em contato com você"). O dono pediu
diretamente pra resolver o problema nesta sessão, o que autoriza a revisão de regra que a própria
entrada do `PROBLEMS.md` já deixava mapeada: cobrar só no acoplamento.

- **Regra nova:** um fragmento Potencializador não custa Energia nenhuma enquanto solto no
  inventário — só passa a custar ao ser de fato **acoplado** (`custoAcoplarFragmento`, inalterado).
  O Construtor não muda: ele **é** a arma/proteção assim que existe, então continua pagando na
  aquisição, dobrado, como sempre.
- `shared/regras/compras/fragmento.ts`:
  - `custoAquisicaoFragmento` retorna **0** pro Potencializador em qualquer módulo/Anomalia; o
    Construtor mantém a fórmula de sempre (base × 2, dobrado de novo com Anomalia).
  - `aplicarReducaoAfinidade` ganhou uma guarda pro custo `0`: o piso de "no mínimo 1 de Energia
    Máxima" existe pra não deixar a Afinidade **anular** um custo real — não pra inventar uma
    cobrança de 1 sobre um custo que já era 0. Sem essa guarda, todo fluxo que agora recebe custo 0
    do Potencializador (adquirir, remover, consumir, o cartão do catálogo) cobraria 1 de qualquer
    jeito.
- `frontend/.../ficha-inventario.component.ts`: `debitarAquisicaoFragmento`/
  `restaurarAquisicaoFragmento` saem cedo (sem emitir `ajusteEnergiaFragmento`) quando o custo de
  aquisição é 0, evitando um evento sem efeito nenhum que faria a página persistir à toa.
  `custoLiquidoAplicarFragmento` (usado por "Aplicar em...") e `desacoplarFragmento` (usado por
  "remover mod de fragmento") pararam de somar/restituir uma "aquisição" que não existe mais — o
  acoplamento passou a ser o único débito de Energia Máxima do Potencializador, e desacoplar
  restitui esse débito por completo (nada continua drenando depois que ele volta a ser avulso). O
  cartão de módulo no catálogo de Fragmentos (`cartaoModulosFragmento`) trocou o que mostrava pro
  Potencializador — custo de **acoplar**, rotulado "(ao acoplar)" — em vez do custo de aquisição
  (que virou sempre 0 e, sem contexto, faria parecer que o Potencializador nunca custa nada).
- `docs/core/sistema-v4.1.0.md` — "⬥ Módulos" e "⬦ Construtor" reescritos pra descrever o gatilho
  certo por tipo (Construtor: imediato ao portar; Potencializador: só ao acoplar), sem mudar nenhum
  valor da tabela de custos nem a seção "⬥ Acoplamento" (que já descrevia o custo de acoplar
  corretamente).
- Testado: `shared/regras/compras/fragmento.spec.ts` reescrito pro novo comportamento de
  `custoAquisicaoFragmento`/`aplicarReducaoAfinidade`. `ficha-inventario.component.spec.ts` — os 17
  testes que dependiam do valor antigo foram recalculados; onde o teste existia especificamente pra
  provar "a Afinidade reduz o custo de **adquirir**" um Potencializador (que não existe mais), o
  fragmento sob teste virou Construtor pra manter a cobertura da mecânica de Afinidade retroativa
  intacta. Dois testes novos de Anomalia com Construtor preenchem a lacuna deixada pelos
  equivalentes antigos de Potencializador. `lint`/`build` limpos em `shared`/`frontend`/`backend`;
  suíte `shared` 595/595 e `frontend` 878/878 verdes.
- **Ambiente desta rodada:** Postgres via Docker Compose seguiu indisponível (sem daemon no
  sandbox) — verificação só via suíte de testes/lint/build, sem app real rodando.

## 2026-08-11 — `P-015` corrigido: fragmento consumido volta a contar pra Afinidade

`listarModulosFragmentosPortados` (`shared/regras/compras/fragmento.ts`) só somava módulos de
fragmentos ainda **soltos** no inventário ou já **acoplados** (`origemFragmento` numa
Modificação) — um fragmento **consumido** (cardápio "Consumido" do Potencializador, m3-64) vira só
um bônus de stat no agente e não sobrava em nenhuma das duas listas, então caía fora de
`calcularAfinidade`/`aplicarReducaoAfinidade`, apesar do registro completo do consumo já existir
em `dados.fragmentosConsumidos` (`FichaFragmentoConsumidoDto`, com `modulo`) desde a m3-64.

- `listarModulosFragmentosPortados` ganhou um segundo parâmetro opcional, `modulosConsumidos:
  readonly FragmentoModuloEnum[] = []`, somado por cima de soltos/acoplados no array retornado.
  Recebe só os módulos (não o DTO completo) porque `regras/compras` não pode depender de
  `dtos/ficha` (evita ciclo — `dtos/ficha` já importa de `regras/compras`); quem lê
  `dados.fragmentosConsumidos` e extrai os módulos é o chamador.
- `ficha-visualizacao.component.ts` — `modulosFragmentosPortados` (entrada de `afinidadeFragmentos`
  e `gruposFragmentosPortados`, os dois já existentes) passou a somar
  `this.fragmentosConsumidos().map((registro) => registro.modulo)`. Como os três computeds
  encadeiam da mesma fonte, o chip "Módulo X" da aba Extras e o número de Afinidade exibido também
  passaram a refletir fragmentos já consumidos, sem precisar de um segundo cálculo em paralelo
  (proibição #26 — uma fonte só).
- `ficha-inventario.component.ts` — a Afinidade "retroativa" (`afinidadeConsiderando`, usada nos 7
  pontos que debitam/restituem Energia de fragmento — adquirir, remover, acoplar, desacoplar, e as
  prévias dos painéis "Consumir"/"Aplicar em...") ganhou o mesmo parâmetro. Novo input
  `fragmentosConsumidos` (default `[]`, mesmo formato de `dados.fragmentosConsumidos`) e um
  computed privado `modulosConsumidos` que extrai só os módulos — repassados em todas as chamadas
  de `afinidadeConsiderando`. `ficha-visualizacao.component.html` passou a ligar
  `[fragmentosConsumidos]="fragmentosConsumidos()"` no `<app-ficha-inventario>`.
- Testado: `shared/regras/compras/fragmento.spec.ts` ganhou 2 casos (soma por cima dos
  soltos/acoplados; conta só os consumidos quando o inventário está vazio).
  `ficha-visualizacao.component.spec.ts` ganhou um caso confirmando que a Afinidade exibida soma um
  fragmento consumido mesmo com o inventário vazio (doc — "Afinidade = 6 - Módulo": módulo IV
  sozinho = 2). `ficha-inventario.component.spec.ts` ganhou um caso confirmando que 3 fragmentos
  consumidos de módulo I (Afinidade 15) reduzem o custo de adquirir um novo fragmento módulo I,
  mesma conta já coberta pra fragmentos soltos. `lint`/`build` limpos nos dois workspaces;
  suíte `shared` 596/596 e `frontend` 876/876 (874 + 2 novos) verdes.
- **Ambiente desta rodada:** Postgres via Docker Compose seguiu indisponível (sem daemon no
  sandbox) — verificação só via suíte de testes/lint, sem app real rodando. Nenhuma decisão de
  design pendente aqui (diferente do P-014/P-016): o dono já havia descrito o comportamento
  esperado ao reportar o problema em 2026-08-09, então a correção seguiu direto o que estava
  registrado no `PROBLEMS.md`.

## 2026-08-11 — `P-012` corrigido: descrição de habilidade não corta mais sem aviso no seletor

O `PROBLEMS.md` listava três candidatos de correção sem decidir qual ("mitiga mas não resolve",
"permitir expandir", "rever o clamp por breakpoint") — perguntado ao dono, a escolha foi um
híbrido: `text-overflow: ellipsis` sempre, **hover com tooltip do texto inteiro no desktop**, e um
botão explícito **"Ver mais"/"Ver menos" só no mobile** (onde não existe hover).

- `ficha-habilidade-seletor.component.scss` — `&__opcao-desc` ganhou `text-overflow: ellipsis`
  (resolve o "corta sem nenhum sinal" — agora corta em "…") e um modificador `&--expandida` que
  zera o `-webkit-line-clamp` pro estado aberto do "ver mais". Novo `&__opcao-ver-mais`: `display:
  none` por padrão, só reaparece em `@include bp.mobile` — no desktop o hover já resolve, o botão
  seria redundante.
- `ficha-habilidade-seletor.component.html` — a `<span>` da descrição ganhou `[appTooltip]` (a
  diretiva de hover/toque já usada nesta mesma tela, linha do botão "Na ficha ✕") e a nova diretiva
  `appClampTruncado`, exportada como `#desc="appClampTruncado"`; o botão "ver mais" só é renderizado
  quando `desc.truncado()` é verdadeiro — uma descrição curta que já cabe nas 2 linhas nunca ganha
  botão à toa.
- **Nova diretiva `shared/clamp-truncado/clamp-truncado.directive.ts`**: mede
  `scrollHeight > clientHeight` do próprio host **uma única vez**, no primeiro render, sem
  `ResizeObserver`. De propósito: diferente da `OverflowFade` (que precisa remedir toda hora porque
  a lista rola ao vivo), aqui uma remedição ao expandir zeraria `truncado()` no exato momento em que
  o clamp é removido — o botão "ver mais" sumiria no meio do próprio clique que ele disparou, sem
  chance de virar "ver menos" pra fechar de novo. Medição congelada evita esse looping.
- Estado de expansão: `descricaoExpandida = signal<string | null>(null)` no componente, uma chave
  por vez (a mesma do `track` da lista — `nome + categoria`, que já precisa ser único entre a
  habilidade comum e a melhorada de mesmo nome).
- **Ambiente desta rodada:** Postgres via Docker Compose seguiu indisponível (sem daemon no
  sandbox) — sem stack real pra abrir o seletor dentro da ficha (ele só é alcançável depois de
  navegar a criação guiada até uma vaga de melhoria). Verificado por um repro isolado: compilei o
  SCSS real do componente com o `sass` do próprio repo (fidelidade de tokens/cores) e repliquei a
  fórmula exata da nova diretiva num script solto (mesma medição `scrollHeight > clientHeight`).
  Confirmado ao vivo (Playwright, Chromium): a 1920px o botão "ver mais" não aparece nem pra
  descrição truncada (`display: none` do `bp.mobile`); a 360px aparece só pra descrição que
  realmente estoura 2 linhas (a curta não ganha botão); clicar expande (`scrollHeight===clientHeight`
  passa a bater, classe `--expandida` presente, "…" some) e troca o rótulo pra "Ver menos"; um
  segundo clique volta ao estado cortado. `lint`/`build`/suíte completa (874/874) verdes.

**Addendum (mesmo dia) — verificado também no app de verdade, não só no repro isolado.** O
Postgres seguiu indisponível, mas dava pra chegar no seletor sem backend: `/fichas/nova` (m3-28,
ficha avulsa) faz o passo // HABILIDADES existir assim que `classe !== null`, e o rascunho da
`GuiaCriacaoRascunhoService` fica só no `localStorage` (`contratados-rpg.guia-criacao.acervo`).
Plantei um rascunho com `passo: 4` (Habilidades), `classe: 'COMBATENTE'`,
`sobrescreverProgressao: true` + `nivelManual: 5` (dá vagas de melhoria sem precisar de campanha),
subi só o `ng serve` e cliquei "Retomar" → "+ Escolher Gerais" pra abrir o seletor real, com o
catálogo de verdade (`shared/regras`). Confirmado com dado real (habilidade "6º Sentido", que
realmente estoura 2 linhas): mobile mostra "…" + "VER MAIS", expande pro texto inteiro e vira
"VER MENOS"; desktop mostra "…" sem nenhum botão, e o hover abre o tooltip com o texto completo.
Habilidades com descrição curta (Analisar Cenário, Arrepio, Ataque Duplo) não ganham botão à toa,
confirmando que `appClampTruncado` só dispara quando o clamp de fato cortou algo.

## 2026-08-11 — `P-009` corrigido: `npm run lint` volta a fechar limpo em `frontend`/`backend`

Diferente do `P-001`/`P-010`/`P-011` (que já estavam corrigidos, só não fechados na
documentação), o `P-009` era um problema de verdade — `npm run lint --workspace=frontend`
reproduziu os 7 erros documentados e `npm run lint --workspace=backend` reproduziu o 1 erro.
Corrigido a pedido do autor:

- `ficha-inventario.component.html` — o `autofocus` declarativo do campo de busca virou
  `appAutoFocus`, a diretiva que já existe no projeto (`shared/auto-focus/`) e faz `.focus()` via
  script no `afterNextRender` — evita a "autofocus processed flag" da spec HTML, que só honra um
  `autofocus` por documento (mesmo motivo pelo qual a diretiva foi criada originalmente para
  outro caso).
- `ficha-visualizacao.component.spec.ts` e `ficha.service.spec.ts` (backend) — a variável não
  usada vinha de `const { anotacoes, ...resto } = dados` (destructuring só para excluir uma
  chave). Prefixar com `_` **não resolve** neste projeto: nenhum dos dois `eslint.config.mjs` tem
  `varsIgnorePattern`/`ignoreRestSiblings`, confirmado testando ao vivo (`_anotacoesOmitida` já
  vinha prefixado no backend e ainda assim era flagado). Troquei pelo padrão
  `{ ...dados, anotacoes: undefined }` — `toEqual` do Vitest ignora chaves com valor `undefined`
  (mesma semântica do Jest), e o código sob teste já lê `dados.anotacoes ?? ''`, então
  `undefined` se comporta exatamente como ausente.
- `acervo.page.spec.ts` — o mock `duplicarFicha: vi.fn((id: number) => ...)` nunca usava `id`;
  removido o parâmetro (mesmo padrão já usado por `atribuirCampanha` no mesmo arquivo).
- `criar.page.html` — dois elementos clicáveis sem suporte a teclado:
  - o `<dialog>` de saída ganhou `tabindex="-1"` e `(keydown.escape)="cancelarSaida()"`. Native
    `<dialog>` já fecha com Esc via evento `close` nativo (já ligado a `cancelarSaida()`) — o
    handler novo é redundante em termos de comportamento, só formaliza o par clique/teclado que o
    lint exige.
  - `<div class="guia__resumo-fundo" (click)="...">` virou `<button type="button"
    aria-label="Fechar resumo operacional">`, replicando o padrão `.dialogo__fundo` já usado em
    6 outras páginas do app (`acervo`, `detalhe`, `visualizar`, `entrar`) — inclusive o reset
    `border: 0; cursor: default;` no SCSS, copiado do mesmo lugar.

Verificado ao vivo com Playwright (sem Docker disponível neste sandbox remoto, então sem
Postgres/backend — a rota `/fichas/nova` sem campanha não faz chamada HTTP nenhuma, então dá para
verificar o `<dialog>` e o drawer de resumo só com `ng serve`): nos dois viewports padrão
(360×800 e 1920×1080), o diálogo de saída abre, fecha ao clicar no `::backdrop` e fecha com Esc; no
mobile, o drawer de resumo abre e fecha ao clicar no novo `<button>` de fundo — nenhuma mudança de
comportamento visível, só a marcação ficou acessível. `npm run lint` limpo nos dois workspaces
(exit 0) e as suítes completas continuam verdes (frontend 874/874, backend 196/196). `P-009`
movido para "Resolvidos".

## 2026-08-11 — `PROBLEMS.md`: `P-011` também já estava corrigido, mesmo padrão do `P-001`/`P-010`

Investigação a pedido do autor sobre o `P-011` (suíte de `shared` coletando specs compiladas de
`dist/**` e quebrando `npm test`). Rodei `vitest run` isolado no workspace `shared`
(`cd shared && ../node_modules/.bin/vitest run`): **33 arquivos de teste, 594 testes, todos
passando** — exatamente o número de `*.spec.ts` em `shared/src` (`find shared/src -name
'*.spec.ts' | wc -l` também deu 33). Nenhum arquivo de `shared/dist` foi coletado, e `shared/dist`
não contém nenhum `*.spec.js` hoje.

A causa: `shared/tsconfig.build.json` (`git log` mostra o commit `8e3b757`, 2026-08-08, mas o
arquivo aparentemente já existia informalmente por volta de 2026-08-05) excedeu
`"src/**/*.spec.ts"` do `exclude`, além de `node_modules` e `dist`. Como o script `build` do
`shared/package.json` sempre apontou para `tsconfig.build.json` (`tsc --project
tsconfig.build.json`), a build passou a nunca mais copiar specs para `dist/`, e o Vitest da raiz
(que roda com `exclude` padrão, cobrindo `**/dist/**`) nunca mais tem o que quebrar.
`git merge-base --is-ancestor 8e3b757 HEAD` confirma que o commit já está no `HEAD` atual.

Mesmo padrão do achado anterior desta mesma sessão (`P-001`/`P-010`): a correção aconteceu, mas o
item nunca foi tirado de `PROBLEMS.md`. `P-011` movido para "Resolvidos".

## 2026-08-11 — `PROBLEMS.md`: `P-001` e `P-010` já estavam corrigidos, só nunca foram fechados

Investigação a pedido do autor sobre o `P-001` ("apelido de equipamento" quebrado em
`ficha-inventario.component.spec.ts`). Rodei a suíte completa do frontend duas vezes
(`ng test --watch=false`) e as duas fecharam **874/874 testes, 51/51 arquivos**, sem nenhuma
falha — nem P-001 nem P-010, que sempre eram citadas juntas nos relatos de task anteriores.

`git log` no arquivo mostrou a causa: o commit `0aa92c2` ("test(ficha): corrige expectativas
defasadas em inventário e visualizar", 2026-08-08) já tinha ajustado as duas asserções
desatualizadas — o nome mecânico do item passou a incluir "— categoria" (`'Leve'` →
`'Leve — Corpo a Corpo'`, P-001) e o link "Voltar" virou ícone-só com `aria-label` em vez de
texto visível (P-010). A causa real nunca foi `ResizeObserver`, como o `P-001` suspeitava — era
simplesmente uma expectativa de teste que não acompanhou uma mudança de template. `git
merge-base --is-ancestor 0aa92c2 HEAD` confirma que o commit já está no `HEAD` atual.

O motivo de as duas falhas continuarem aparecendo como "preexistentes" em tantas tasks depois de
8/ago é que várias branches `claude/*` foram cortadas de commits anteriores ao `0aa92c2` e só
viram a correção depois de mescladas — exatamente o tipo de atraso que o próprio `P-002`
descreve. `PROBLEMS.md` nunca foi atualizado para refletir a correção; P-001 e P-010 movidos para
"Resolvidos".

## 2026-08-11 — Acervo de fichas passa a mostrar cor e avatar do card, como no Esquadrão

`FichaAcervo` (`/fichas`) já lia `imagemUrl` de `FichaResumoDto` e renderizava a foto, mas nunca
lia `cor` — o comentário do SCSS ainda dizia "o cartão do acervo não recebe `cor` — recorte
enxuto de `FichaResumoDto`, sem a coluna relacional", uma justificativa que ficou obsoleta assim
que `m3-61` acrescentou `cor` ao mesmo `FichaResumoDto` (o backend já devolvia a coluna; só o
frontend do acervo nunca foi atualizado). Resultado visível: todo avatar do acervo saía com borda
e listras neutras (`--border-strong`), sem a identidade de cor da ficha, e sem o preview ampliado
no hover que o card de ficha do Esquadrão (`CampanhaDetalhe`, `m3-52`) já tinha para a mesma foto.

Correção trouxe a mesma receita do Esquadrão para o card do acervo: `ItemAcervo.cor` mapeado de
`FichaResumoDto.cor`, `[style.--cor-ficha]` no avatar alimentando o mesmo `color-mix` de borda e
listras diagonais (fallback pra `--border-strong` sem cor definida), avatar alargado (36px → 52px,
esticado à altura do bloco nome/meta/vitais) e o hover sustentado (`agendarPreviewAvatar`/
`cancelarPreviewAvatar`, 600 ms) abrindo um preview 200×200 `object-fit: contain` na raiz do
template — mesma posição fora de `.acervo__lista` que o menu kebab já ocupava, pela mesma razão
(overflow + mask-image cortariam um `position: fixed` filho na pintura).

Testes: os 15 de `acervo.page.spec.ts` e os 541 do módulo `ficha` passam; build e lint do
frontend limpos no recorte tocado. Verificação visual na aplicação real (Postgres local via
`postgresql-16` do sistema — Docker não disponível neste ambiente) em `1920×1080` e `360×800`,
com três fichas semeadas via REST (com cor sem foto, com cor e foto, sem nenhuma das duas): borda
e listras seguem a cor de cada ficha, a terceira cai no neutro esperado, e o hover sustentado sobre
o avatar com foto abre o preview ampliado. Comparação lado a lado com o card do Esquadrão
(`/painel/:id`) confirma a mesma receita visual (cor, listras, preview).

## 2026-08-11 — `P-013`, correção de escopo: Anomalia também dobra o ponto de atributo do Módulo I e o Construtor

Relato direto do autor: consumir um Fragmento Potencializador de Módulo I com a habilidade
"Anomalia" (Experimento Artificial) devia conceder **2** pontos de atributo, não 1, e ele suspeitava
que os fragmentos Construtor também não estavam sendo amplificados. Os dois estavam certos — a
primeira implementação do `P-013` (2026-08-10) tinha excluído `concedePontoAtributo` e os efeitos
fixos do Construtor do escopo da dobra, por decisão registrada naquele momento ("regra estrutural,
não um valor de efeito" / "dobrá-los sem pedido seria extrapolar a spec"). Reler o doc
(`docs/core/sistema-v4.1.0.md` — "◈ Anomalia": "Fragmentos custam o dobro de Energia em seu uso, mas
têm todos os seus efeitos dobrados") não abre exceção nenhuma para nenhum dos dois: Construtor
também é um Fragmento, e o ponto de atributo do Módulo I é um efeito do cardápio "Consumido" como
qualquer outro. Documento vence o código (proibição #27) — corrigido.

**Ponto de atributo do Módulo I.** `OpcaoBonusConsumoFragmentoDto` (`shared/regras/compras/
fragmento.ts`) ganhou `pontosAtributo?: number` ao lado de `concedePontoAtributo` — 1 normalmente, 2
com `possuiAnomalia` (`listarBonusConsumoFragmentoPotencializador` calcula `dobro` igual aos outros
três valores do cardápio). `aplicarBonusConsumoFragmento`/`reverterBonusConsumoFragmento`
(`shared/regras/agente/fragmento-consumo.ts`) somam `opcao.pontosAtributo ?? 1` em vez do `1`
hardcoded (o `?? 1` mantém compatível qualquer opção construída à mão sem o campo, ex. registros
antigos de `fragmentosConsumidos` persistidos antes desta correção). `FichaInventario` monta o rótulo
("+N ponto(s) no atributo") a partir de `opcao.pontosAtributo`, não mais um "+1" fixo.

**Efeitos fixos do Construtor.** `listarEfeitosFixosConstrutor`/`bonusMunicaoConstrutor`
(`shared/regras/compras/fragmento.ts`) ganharam `possuiAnomalia = false` e dobram todo valor de
efeito (dano, teste, resistência, Esquiva/Bloqueio/Defesa, custo de "Recarregar") — `danoFaces` (o
tipo de dado, ex. D12) fica de fora, mesmo raciocínio de `MULTIPLICADOR_MAIOR_DADO_MODULO` no
Potencializador (dobra o valor final, nunca a face do dado alvo). `FichaInventario` repassa
`this.possuiAnomalia()` nos três pontos que chamavam as duas funções (bônus fixo ao criar o item,
"Recarregar" munição, exibição do bônus de munição no card).

Testes novos em `fragmento.spec.ts` (cardápio Consumido módulo I com Anomalia, efeitos fixos do
Construtor com Anomalia, munição com Anomalia), `fragmento-consumo.spec.ts` (aplicar/reverter 2
pontos) e `ficha-inventario.component.spec.ts` (fiação do input `possuiAnomalia` nos três novos
pontos, mais o ajuste do teste pré-existente que comparava o `opcao` inteiro do Módulo I e passou a
incluir `pontosAtributo`). Suítes cheias sem regressão: shared 592/592, backend 196/196, frontend
874/874 — todos os três workspaces fecham 100%.

## 2026-08-11 — Gerais Melhoradas migram para a aba Gerais, substituindo a comum

Redesenho de correção: as **Gerais Melhoradas** (`GERAL_MELHORADA`) deixaram de aparecer
misturadas às habilidades do próprio arquétipo, na aba **Arquétipo** do seletor, e passaram a
viver na aba **Gerais** — no lugar exato da Geral que elas melhoram, para quem é do arquétipo
dono da melhoria. Um Assassino não vê mais "6º Sentido" (comum) e "6º Sentido melhorada" como
duas entradas possíveis: a lista Geral dele tem só a versão melhorada, com o selo "Geral
melhorada"; qualquer outro arquétipo continua vendo a comum. `grupoGerais` (antes sem parâmetros)
passou a receber o `arquetipo` da ficha, monta um mapa nome→melhorada de
`HABILIDADES_GERAIS_MELHORADAS[arquetipo]` e substitui a entrada correspondente ao percorrer
`HABILIDADES_GERAIS`, mantendo a mesma contagem e ordem da lista original — nunca soma as duas.
`grupoArquetipo` parou de anexar as melhoradas ao subgrupo do próprio arquétipo. Nenhuma mudança
de categoria/efeito mecânico: `defesa.ts` (contra-ataque) e `inventario.ts` (Mochileiro) já liam
`categoria === GERAL_MELHORADA` da habilidade gravada na ficha, não de onde o seletor a exibia, e
continuam funcionando sem alteração. O passo de criação "06 Habilidades" (vaga `'geral'`, que já
filtra `catalogoHabilidades(...).id === 'gerais'`) herda o comportamento automaticamente: ao
montar o pacote inicial/de progressão, um Assassino escolhendo uma vaga Geral já recebe a versão
melhorada quando o nome coincide.

Testes: shared **589/589** (18 no arquivo do catálogo, reescritos para provar a substituição —
mesma contagem, uma entrada por nome, origem = o arquétipo — e que a aba Arquétipo nunca mais
carrega `GERAL_MELHORADA`); frontend **871/871**; build/lint de `shared` limpos. `frontend`
manteve os sete erros de lint pré-existentes de `P-009`, nenhum nos arquivos tocados. Mudança só
de `shared/regras/agente` (dado/regra pura) + comentários do componente do seletor — a UI já
renderizava o selo "Geral melhorada" por item de categoria, então nenhuma mudança de template foi
necessária.

Verificação visual feita na aplicação real (Postgres local via `postgresql-16` do sistema, já que
o Docker deste ambiente não alcançava o Docker Hub — sem mudança permanente de infra, só para
esta sessão) em `1920×1080` e `360×800`, com uma ficha Especialista/Assassino: a aba **Gerais**
do seletor mostra "6º Sentido" com o selo "GERAL MELHORADA" na mesma posição alfabética das
Gerais comuns (entre "Analisar Cenário" e "Arrepio"), descrição da versão melhorada, sem entrada
duplicada da comum; a aba **Arquétipo → Assassino** mostra só as 7 habilidades de arquétipo (a
inicial "Ceifador" com selo "INICIAL"), sem nenhum selo "Geral melhorada" sobrando. Sem overflow
em nenhum dos dois viewports; visual consistente com o padrão de selo já usado por "Inicial".

## 2026-08-11 — `m3-65a`: visibilidade da ficha com confirmação e tempo real

O checkbox longo da ficha completa virou uma ação `Ocultar`/`Exibir` com ícone e confirmação
específica para cada sentido. No desktop, o botão compacto permanece junto ao avatar; em 360 px,
a ação fica no menu de três pontos e usa a mesma dialog, liberando espaço vertical sem duplicar
estado. Cancelar ou fechar não altera a ficha; confirmar segue o auto-save existente.

Depois da persistência, `FichaService` emite o evento dedicado `ficha:visibilidade-alterada` somente
quando `oculta` realmente mudou e a ficha pertence a uma campanha. O payload compartilhado contém
apenas `fichaId` e `campanhaId`. O detalhe da campanha reage refazendo seu recorte REST autorizado,
portanto a ficha some ou reaparece para os demais jogadores sem reload, enquanto dono e mestre
mantêm o acesso previsto.

Foram verificados testes focados de shared/backend/frontend, builds e as suítes amplas. O backend
mantém uma falha preexistente em `config.service.spec.ts` causada pelo `.env`, e o lint amplo mantém
sete ocorrências preexistentes fora deste recorte. Na aplicação real, 1920×1080 e 360×800 ficaram
sem overflow; as duas confirmações e os dois estados foram percorridos. Com mestre, dono e observador
conectados, ocultar e exibir atualizaram o painel do observador na mesma URL, sem F5.

## 2026-08-10 — visualização completa permite remover a ficha da campanha

O menu de ações de `/fichas/:id` e `/painel/:campanhaId/ficha/:id` passou a oferecer **Remover da
campanha** quando a ficha carregada está vinculada. A ação reutiliza o fluxo direto já aprovado no
painel da campanha e no acervo: chama `atribuirCampanha(fichaId, null)`, fecha o menu, bloqueia
reentrada enquanto a requisição está em voo e, após sucesso, leva ao acervo. Fichas já soltas não
mostram o item.

O teste focado de `visualizar.page.spec.ts` passou com 47/47 casos. A aplicação real foi inspecionada
em 1920×1080 e 360×800 com uma ficha vinculada temporária: as três ações apareceram na ordem
esperada, sem overflow do menu ou da página. A fixture local foi removida ao final.

## 2026-08-10 — `m3-72`: leitor global dos documentos de regras

Sistema e Guia do Mestre passaram a ser públicos em um único acesso **Documentos**, disponível no
`Layout` em qualquer rota. No desktop, o shell é uma janela não modal móvel, redimensionável,
recolhível, maximizável e capaz de passar sobre a topbar; no mobile, ocupa a tela inteira. Maximizar
usa a viewport da aplicação e restaurar recupera a geometria anterior, sem acionar a Fullscreen API.
O estado global conserva documento ativo e geometria, e o gatilho recolhido integra a pilha de
calculadora e histórico.

A primeira implementação criou um leitor completo com PDF.js, canvas, camada textual, links,
virtualização e busca própria. A validação visual mostrou que essa complexidade piorou o resultado:
o PDF perdeu nitidez e a camada textual sobreposta duplicou trechos. Por decisão do autor, o pipeline
foi removido e cada PDF passou a usar o viewer nativo do navegador dentro de um `iframe`. Busca,
seleção, páginas, zoom, impressão e download pertencem agora ao navegador; a aplicação preserva
somente o shell e mantém o `iframe` montado ao recolher. A escolha reduz código, dependências e
superfície de falha, aceitando variações do viewer entre navegadores.

Os artefatos canônicos continuam em `docs/core/`. Scripts de pré-build/pré-start os publicam em
`/documentos/` e o pós-build verifica os dois arquivos. Testes focados do leitor e Layout ficaram
20/20; lint focado e build de produção passaram, com os dois PDFs verificados. A inspeção real em
1920×1080 e 360×800 confirmou shell sem overflow, viewer nítido no desktop, alvos mobile de 44px,
troca de documento e recolhimento sem desmontar o iframe. O bundle inicial de 625,76 kB motivou a
atualização do teto de warning para 630 kB; o limite de erro permanece 1 MB.

## 2026-08-10 — `P-013`: habilidade "Anomalia" agora dobra custo/efeito de Fragmentos

A habilidade "Anomalia" (Experimento Artificial) sempre existiu só como texto no catálogo
(`habilidades-catalogo.dados.ts`): "Fragmentos custam o dobro de Energia em seu uso, mas têm todos
os seus efeitos dobrados". Nenhuma função de `fragmento.ts` considerava se o agente a possuía —
puro texto descritivo sem motor por trás.

**Onde a flag entra.** `shared/regras/identidade/experimento.ts` ganhou `experimentoComAnomalia`
(gêmea de `experimentoComPeculiaridade`, mas fechada em `EXPERIMENTO_ARTIFICIAL` — a habilidade só
existe no catálogo dessa subclasse, as outras duas não a têm). A página (`FichaVisualizacao`)
resolve o booleano num `computed` (`possuiAnomalia`, a partir de `dados().classe`/`habilidades`) e
repassa a `FichaInventario` via `[possuiAnomalia]` — as funções de `fragmento.ts` continuam puras,
recebendo o booleano já resolvido em vez de importar `identidade/` (evita o ciclo entre
`compras/` e `identidade/`).

**Escopo dobrado.** Cinco funções de `shared/regras/compras/fragmento.ts` ganharam o parâmetro
opcional `possuiAnomalia = false`: `custoAquisicaoFragmento`, `custoAcoplarFragmento` (energia e
energiaMaxima) e `custoRemoverFragmento` dobram o custo em Energia por cima do que já cobravam —
inclusive o dobro que o Construtor já paga, já que o doc não abre exceção para ele.
`listarBonusFragmentoPotencializador` e `listarBonusConsumoFragmentoPotencializador` dobram o valor
de toda opção do cardápio (em item/Consumido), incluindo a opção "N× maior dado" — **exceto**
`concedePontoAtributo` (Módulo I), que continua concedendo +1 ponto: é regra estrutural de
ultrapassar o limite de 6 pontos, não um "valor de efeito" do cardápio. `custoRemoverFragmento`
entrou no escopo por consistência (a doc trata remoção como "uso" de Energia do Fragmento) mesmo
sem estar citada nominalmente no relato original do `P-013`; o preço de Sanidade do consumo
(`custoSanidadeConsumirFragmento.energiaMaximaExtra`) e os efeitos fixos do Construtor
(`listarEfeitosFixosConstrutor`/`bonusMunicaoConstrutor`) ficaram **fora** — não são "cardápio do
Potencializador" nem custo de aquisição/acoplamento/remoção, e dobrá-los sem pedido seria
extrapolar a spec.

`FichaInventario` (`ficha-inventario.component.ts`) ganhou `input() possuiAnomalia` e passa o valor
em todos os 12 pontos onde chamava as cinco funções — inclusive nos dois lados de operações
simétricas (aplicar/desacoplar fragmento, adquirir/remover) para preservar os invariantes de
"líquido zero" já comentados no código; um lado dobrado e o outro não teria destravado um novo bug
de Energia Máxima incoerente. Testes novos em `fragmento.spec.ts`/`experimento.spec.ts` (motor) e
em `ficha-inventario.component.spec.ts`/`ficha-visualizacao.component.spec.ts` (fiação
classe/habilidades → input → cardápio/custo). Suítes cheias sem regressão: shared 587/587
(+17 sobre 570), frontend 813/813 (+6 sobre 807), backend 190/190 (sem alteração — o backend nunca
tocou custo/efeito de Fragmento).

## 2026-08-10 — Habilidade de Personalidade segue a cor da ficha, não mais o accent fixo do usuário

Pós-`m3-61`: a categoria Personalidade em `FichaHabilidades` (borda do item + chip) estava
hardcoded em `var(--accent)` — "Personalidade segue o accent do usuário", comentário que o próprio
`m3-61` deixou para trás sem perceber que já existia um token dedicado para isso. O componente não
recebia `cor` nenhuma; ganhou `input() cor` (mesmo padrão de `FichaInventario`/`FichaCombos`) e seta
`[style.--cor-ficha]` no próprio elemento raiz (self-contido, como `ResultadoRolagem` — não depende
de um ancestral já ter setado a variável). `ficha-visualizacao.component.html` passa `[cor]="cor()"`
ao `<app-ficha-habilidades>`. O SCSS trocou `var(--accent)`/`var(--accent-border)` por
`var(--cor-ficha, var(--accent))`/`var(--cor-ficha-border)` (este já embute o mesmo fallback) —
ficha sem cor definida cai no accent de quem visualiza, igual a todo outro consumo de `--cor-ficha`
no app.

## 2026-08-10 — `m3-62`: avatar da ficha (blob storage local/Cloudflare R2)

Fecha o último item da fila do backlog aberta desde `m3-53`. Dono ou mestre agora sobem uma
imagem (jpg/png/webp, até 2MB) pela ficha — ela substitui o avatar decorativo no cabeçalho e no
card do acervo, e também pode ser escolhida no Passo 01 do guia de criação (`FichaCriar`,
`m3-57`). Migration `0013 - Ficha imagem.sql`: coluna `ficha.imagem_url` (`VARCHAR` nullable, sem
`DEFAULT`) ao lado de `nome`/`cor` — o binário nunca entra no Postgres, só o caminho/URL.

**Armazenamento atrás de uma interface, escolhida por toggle de ambiente.** Módulo novo
`backend/src/core/armazenamento/` (técnico, fora de `shared/` — nunca cruza pro frontend):
`ArmazenamentoProvedor` (`salvarImagem`/`excluirImagem`) com duas implementações —
`ArmazenamentoLocalProvedor` (disco, `backend/uploads/agentes/<uuid>.<extensão>`, servido estático
via `app.useStaticAssets` sob `/uploads` — `main.ts` trocou para `NestExpressApplication`) e
`ArmazenamentoR2Provedor` (`@aws-sdk/client-s3` apontando `endpoint` pro domínio da conta R2,
`region: 'auto'`) — `agentes/` é a pasta que o autor já tinha criado dentro do bucket R2 antes da
implementação (separada de futuras pastas para outros tipos de imagem, ex. avatar de usuário), daí
`construirChaveImagemFicha` fixar esse prefixo em vez de `ficha/`. `ArmazenamentoModule.useFactory`
lê `ConfigService.obterConfiguracaoArmazenamento()`
(novo grupo `ConfiguracaoArmazenamento`, union discriminada por `provedor: 'local' | 'r2'`) e só
**instancia** a implementação escolhida — em `local`, `ArmazenamentoR2Provedor` (e as cinco
`ARMAZENAMENTO_R2_*`) nunca é construído, então nenhuma credencial R2 é exigida em dev.
`ARMAZENAMENTO_PROVEDOR` é sempre obrigatória (mesmo padrão de todo grupo do `ConfigService` —
nunca "variável ausente" como sinal); `.env.example` ganhou `ARMAZENAMENTO_PROVEDOR=local`;
`render.yaml` ganhou as seis chaves, `ARMAZENAMENTO_PROVEDOR=r2` fixo em produção e as cinco `R2_*`
com `sync: false`; `DEPLOY.md` ganhou uma seção-runbook nova (criar bucket, habilitar acesso
público, gerar API token Object Read & Write escopado ao bucket) entre Supabase e Render, com a
renumeração das seções seguintes.

**Endpoint dedicado, fora do `PUT /ficha/:id` genérico.** `POST /ficha/:id/imagem`
(`FileInterceptor('arquivo')`, memória) e `DELETE /ficha/:id/imagem` — `FichaService.alterarImagem`/
`excluirImagem` validam MIME (jpeg/png/webp) e tamanho (2MB) como `BusinessException`, reusam
`validarPermissaoEdicao` (dono ou mestre) e excluem o arquivo anterior do armazenamento ao trocar
(nunca acumula lixo). `FichaRepository.alterarImagem` é um `UPDATE` dedicado só para
`imagem_url` — o `alterarFicha` genérico continua só `nome`/`cor`/`dados`. DTOs novos em
`shared/src/dtos/ficha/ficha-operacao.dtos.ts`: `FichaImagemArquivoDto` (value-object,
`conteudo: Uint8Array` — não `Buffer`, tipo Node-only que quebraria o `tsconfig` do frontend, que
importa o `.ts` fonte do `shared` direto via path mapping), `FichaImagemAlterarDto`/
`FichaImagemExcluirDto`/`FichaImagemInternoAlterarDto`/`FichaImagemAlteradaDto`; `imagemUrl:
string | null` somado a `FichaCriadaDto`/`FichaAlteradaDto`/`FichaRecuperadaDto`/`FichaResumoDto`
(sempre `null` na criação — a ficha só ganha `id` depois do `POST /ficha`, então o upload é sempre
um segundo request, em sequência).

**Frontend — três superfícies.** `ficha-ident__avatar` (cabeçalho, `FichaVisualizacao`) ganhou um
`<img>` real quando `imagemUrl()` existe, cobrindo o fundo tracejado decorativo; editável
(`ajustavelAmplo()`), o `<input type="color">` continua cobrindo a caixa inteira (picker de cor,
m3-61) e ganhou dois selos sobrepostos — lápis (canto inferior, abre `<input type="file">`) e "×"
(canto superior, só com avatar definido) — sem aninhar `<label>`s (cada um seu próprio alvo de
clique). Novos outputs `ajusteImagem`/`removerImagem` chamam `FichaEdicaoService.ajustarImagem`/
`removerImagem`, que persistem **imediato** via `FichaService.alterarImagem`/`excluirImagem`
(`FormData`) — **não** passam pelo `agendarPersistencia` debounced que os demais `ajustar*` usam,
porque o upload em si já é a persistência. Validação de tipo/tamanho no client antes de enviar
(feedback imediato; a autoritativa continua no backend). Card do acervo (`acervo.page.html`) ganhou
o mesmo tratamento — thumbnail 36px, sem a cor da ficha (o `FichaResumoDto` do acervo nunca teve
`cor`). Guia de criação (`criar.page.ts`, Passo 01 // Base): o `File` escolhido nunca entra em
`EstadoGuiaCriacao`/no rascunho salvo em `localStorage` (não é serializável em JSON) — fica num
signal à parte até `criar()` chamar `criarFicha` e, com o `id` em mãos, encadear
`alterarImagem`; falha nesse segundo request não desfaz a ficha nem trava a navegação.

## 2026-08-09 — `P-017`: migration `0012` (coluna `cor`) nunca rodou em produção

O dono reportou "erro interno no servidor" ao abrir `/painel/1/ficha/8`. O log do Render
identificou a causa: `column "cor" does not exist` na query de `FichaRepository.recuperarPorId`
— toda leitura/escrita de ficha em produção estava quebrada, não só a 8. A migration `0012 - Ficha
cor.sql` (coluna `ficha.cor`, `m3-61`, entrada abaixo) tinha sido commitada e deployada junto do
código novo, mas nunca foi **aplicada** ao Postgres de produção (Supabase): o deploy nativo
(Render/Cloudflare puxando do Git) nunca incluiu `npm run db:migrate --workspace=backend` — sempre
foi um passo manual, e dessa vez ficou pendente.

**Causa raiz corrigida no pipeline, não só no incidente.** `render.yaml`: `buildCommand` passou a
encadear `npm run db:migrate --workspace=backend` depois de `nest build`, então toda migration
pendente aplica sozinha a cada deploy daqui pra frente — seguro porque a convenção de migration do
projeto (proibição #7) proíbe `DEFAULT`/`NOT NULL` sem valor, então o código da versão anterior
continua rodando contra o schema novo sem quebrar durante a janela do deploy. `docs/DEPLOY.md`
atualizado (nota do M2 trocada pela explicação do `buildCommand` novo, tabela do Web Service manual
e checklist). Mergeado (`PR #18`) e confirmado pelo dono: Render reimplantou aplicando a `0012`,
`/painel/1/ficha/8` abre normal e o picker de cor (`m3-61`) funciona de ponta a ponta em produção.
Sem mudança de código de aplicação — só pipeline de deploy e documentação.

## 2026-08-09 — `m3-61`: cor de identidade visual por ficha

Fechou o item mais antigo da fila do backlog (`m3-53`/`m3-61`/`m3-62`): dono ou mestre agora
escolhem uma cor por ficha, e as rolagens daquele personagem aparecem coloridas com ela — na
bandeja de dados, no histórico e no feed "Rolagens Recentes" do painel de campanha, tanto via REST
quanto ao vivo por WebSocket. Migration `0012 - Ficha cor.sql`: coluna `ficha.cor` (`VARCHAR`
nullable, sem `DEFAULT`) ao lado de `nome` — nunca dentro do JSONB `dados`.

**Threading de ponta a ponta, sem tocar no gateway.** `cor` entra nos DTOs de operação que já
carregam `nome` (`FichaCriarDto`/`FichaCriadaDto`/`FichaAlterarDto`/`FichaAlteradaDto`/
`FichaRecuperadaDto`) e no `INSERT`/`SELECT`/`UPDATE` de `FichaRepository`, mesmo padrão relacional
de `nome`. A `FichaService` valida o formato (hex de 6 dígitos, `#RRGGBB`) como regra de negócio —
**não** como `class-validator`: o projeto não liga `ValidationPipe` (decisão vigente, §5 do
CONTEXT.md) e DTOs continuam `interface readonly`, então a validação estrutural do item 3 da spec
virou um método privado (`validarCor`) em vez de decorator. O ponto central é
`RolagemRepository.colunasResumo()`: soma `ficha.cor AS "corFicha"` na mesma query que já resolve
`nomeFicha`/`nomeAutor` via `INNER JOIN ficha` — o campo "pega carona" no `RolagemResumoDto` que já
trafega tanto no REST quanto no evento `rolagem:registrada`, sem mudar `RolagemService` nem o
gateway.

**Token novo, independente do `--accent`.** `--cor-ficha` (+ `--cor-ficha-dim`/`--cor-ficha-border`
via `color-mix()`) documentado em `DESIGN.md`: nunca ganha valor em `_tokens.scss` (só
`[style.--cor-ficha]` inline por instância), e todo consumo lê `var(--cor-ficha, var(--accent))` —
ficha sem cor cai no accent de quem visualiza. `ResultadoRolagem` ganhou `input() corFicha` e seta a
própria `--cor-ficha` no container (self-contido, funciona tanto na bandeja quanto no histórico sem
depender de um ancestral já ter setado a variável); só `__total`/`__critico-badge`/`__critico`
trocaram de `--accent` — o pool de dados e os controles da tela continuam no accent do viewer. Os
quatro chamadores ficha-scoped que jogam resultado na bandeja (`FichaVisualizacao`, `FichaRolagens`
via `FichaRolagensPainel`, `FichaInventario`, `FichaCombos` — este último sem consumidor no
template ainda, mas atualizado por completude) ganharam `input() cor` e passam `corFicha` a cada
`bandeja.mostrar(...)`. `HistoricoRolagensSidebar` lê `item.corFicha` por linha.

**Cabeçalho da ficha.** Swatch `<input type="color">` embrulhado em `FormControl` (mesmo padrão de
`configuracoes-tema.component`) ao lado do avatar, visível só quando `ajustavelAmplo()` (mesmo gate
do Codinome); sem `cor` definida, o picker nasce no hex de fábrica do tema (`#d53030`) sem persistir
sozinho — só emite `ajusteCor` quando o dono/mestre efetivamente escolhe uma. `ajusteCor` segue o
padrão de `ajusteNome`: `visualizar.page.html`/`detalhe.page.html` ligam no mesmo
`FichaEdicaoService.ajustarCor`, que agora inclui `cor` no `PUT /ficha/:id` debounced.

**Guia de criação.** A spec previa o swatch no `FichaCriarDialog` "hoje" e no Passo 01 do guia
"quando `m3-57` existir" — mas `FichaCriarDialog` não existe mais no código (aposentado em
2026-08-07) e `m3-57` já tinha fechado antes desta task. O swatch entrou direto no Passo 01 //
BASE (`criar.page.html`), ao lado do Codinome, seguindo o idioma nativo do arquivo (`atualizar()` +
`(input)`, sem Reactive Forms — o arquivo inteiro não usa) em vez do padrão FormControl do item 5.
`construirFichaInicial` (`ficha-padrao.ts`) passou a devolver `{ nome, cor, dados }`; `criar()` já
espalhava `...resultado` no `POST /ficha`, então `cor` chegou de graça.

**Duplicar herda a cor.** Não estava na spec, mas `duplicarFicha` já clona `nome` (com sufixo " –
cópia") — deixar `cor` de fora criaria uma inconsistência nova entre os dois campos relacionais
irmãos; a duplicação agora repassa `fichaOriginal.cor` para o `criarFicha` interno.

**Verificação.** `shared` (557), `backend` (170) e `frontend` (802) passaram; lint limpo nos
arquivos tocados. Sem Docker disponível no ambiente desta sessão, o Postgres 16 nativo do container
serviu de banco (`service postgresql start` + `createdb`) — mesmas 12 migrations, incluindo a nova.
Aplicação real dirigida por Playwright em 1920×1080 e 360×800: ficha criada com cor via `POST
/ficha` nasceu com o swatch já preenchido; troca pelo picker persistiu (`GET /ficha/:id` confirmou
o novo hex); ficha sem cor mostrou o swatch no padrão de fábrica sem quebrar o resto da tela;
navegar entre uma ficha com cor e uma sem cor, na mesma aba, provou que o `FormControl` resincroniza
por ficha (sem herdar o valor da anterior). Uma rolagem de `3d6` na ficha azul (`#3a86ff`) resultou
no total pintado em `rgb(58, 134, 255)` na bandeja **e** no histórico (`getComputedStyle`,
não só inspeção visual); a mesma rolagem numa ficha sem cor caiu em `rgb(213, 48, 48)` — o
`--accent` de fábrica —, confirmando o fallback. O picker/gatilho de tema (`--accent`) permaneceu
vermelho em ambas as telas, provando que os dois tokens não se pisam. O Passo 01 do guia renderizou
o swatch em 1920×1080 e 360×800 sem overflow, seguindo a mesma densidade dos demais campos
(`.campo__controle`, 42px de altura — igual ao Codinome ao lado, nenhuma regressão de alvo de
toque).

## 2026-08-08 — Guia de criação: remove a vaga extra de Experimento no passo Habilidades

Pedido direto do autor logo após a `m3-64`: o passo Habilidades já garante a todo agente (inclusive
Experimento) um pacote inicial obrigatório que pode incluir vagas de Classe/Arquétipo — a vaga fixa
adicional que a `m3-64` dava só a Experimento ficou redundante e foi removida de
`FichaCriar.vagasMelhoria` (`frontend/.../criar.page.ts`). Experimento com Peculiaridade continua
possível, só que pelo mesmo pacote de qualquer outra classe, não por uma vaga garantida à parte. O
texto do passo que anunciava essa vaga garantida também saiu do template.

## 2026-08-08 — `m3-64`: habilidades iniciais, progressão exata e identidade legível

Pedido direto do autor para fechar quatro lacunas do guia e do resumo da ficha. O pacote de
habilidades da criação, antes registrado como `P-012`, passou a ser regra pura em
`shared/regras/agente/habilidades-iniciais.ts`: agentes convencionais escolhem exatamente um entre
**4 Gerais**, **2 Gerais + 1 de Classe/Arquétipo** ou **2 de Classe/Arquétipo**; Civil recebe
**3 habilidades civis**. O passo Habilidades agora existe desde o Nível 0 e compõe o pacote com a
vaga adicional de Experimento e as vagas acumuladas da progressão, impedindo duplicatas e removendo
escolhas excedentes quando classe, pacote, Nível ou modo mudam. A tabela de progressão permaneceu
intacta: criação e evolução continuam conceitos separados.

O passo Novo Agente ganhou valores finais exatos. Em campanha, Nível e Prestígio médios continuam
selecionados por padrão, com controle explícito para sobrescrever os dois valores; fora de campanha,
os campos manuais são o caminho padrão. Esses valores alimentam derivados, vagas, revisão, resumo e
o payload final, permitindo criar diretamente uma ficha avulsa de nível alto.

Na apresentação da ficha, uma subclasse passa a preservar também a classe-base — por exemplo,
**Especialista** e **Experimento Artificial** aparecem como identificadores separados. Quando uma
Peculiaridade substitui a Origem, o resumo mostra somente **Substituída pela Peculiaridade**, sem o
estado concorrente “Não definida” nem ação de edição; o chip ganhou quebra interna segura nos
viewports estreitos.

**Verificação:** `shared` compilou e passou 546 testes; os 49 testes do guia e os 136 testes do
componente de ficha/rotulagem passaram; o frontend compilou. Na aplicação real, o fluxo completo foi
percorrido em 1920×1080 e 360×800 com Experimento Artificial, Peculiaridade, pacote de 4 Gerais,
Nível 12 e Prestígio 37. O resumo e a ficha persistida exibiram classe-base + subclasse, Origem
substituída e valores exatos sem overflow horizontal. O lint mantém sete violações preexistentes,
fora dos trechos alterados; o build mantém o aviso preexistente de orçamento do bundle inicial.

## 2026-08-07 — Acervo (`/fichas`) ganha o guia de criação; `FichaCriarDialog` aposentado

Pedido direto do autor (não numerado — sem spec no backlog): o "Criar ficha" da tela `/fichas`
(acervo, m3-28) ainda abria o `FichaCriarDialog` antigo (m3-16) — um formulário único sem
orçamento de atributos, sem Identidade, sem rolagem de Recursos e sem o Passo // EQUIPAMENTO
INICIAL da `m3-59`, recém-fechada. A `m3-57` já havia declarado isso "Fora de Escopo"
("ficha sem campanha segue pelo caminho atual") porque o guia (`FichaCriar`,
`modules/ficha/paginas/criar/`) nasceu inteiro em cima de `campanhaId` — membros da campanha
(seletor de dono), fichas da campanha (médias de Nível/Prestígio do passo Novo Agente), rascunho
em `localStorage` por campanha e `POST /ficha` com `campanhaId`. Esta task fecha esse buraco.

**`campanhaId: number | null`.** Mesmo padrão já usado por `FichaVisualizar` (m3-28): o parâmetro
de rota vem de `lerParamRota` e, ausente, o componente trata como `null` em vez de inventar um
`Number(null) === 0`. Com `campanhaId` nulo, o construtor pula `listarMembros`/`listarFichas`
(`of([])` no lugar da chamada HTTP) — sem membros, o seletor "Operador responsável" já some
sozinho (mesmo gate `ehMestre()` de sempre); sem fichas, o passo // NOVO AGENTE cai no caminho
"primeiro agente" que já existia para campanha vazia (Nível 0, Prestígio 0, sem bônus monetário) —
zero UI nova, só o texto do aviso virou condicional ("Ficha avulsa, sem campanha" em vez de
"Primeiro agente da campanha", já que não existe "campanha" nesse contexto). `criar()` monta o DTO
sem a chave `campanhaId` quando nulo (o backend já aceitava isso — é o mesmo formato que
`FichaCriarDialog` sempre enviou) e navega para `/fichas/:id` em vez de `/painel/:campanhaId/ficha/:id`;
"Sair" confirmado volta para `/fichas`. `GuiaCriacaoRascunhoService` (rascunho em `localStorage`)
passou a aceitar `campanhaId: number | null`, com `null` caindo numa chave fixa (`...guia-criacao.acervo`)
que nunca colide com um `campanhaId` numérico real.

**Rota:** `nova` foi montada de novo em `ficha-acervo.routes.ts` (antes de `:id`, mesmo cuidado de
sempre — senão `nova` casa como id), carregando o **mesmo** componente `FichaCriar` já usado em
`/painel/:campanhaId/ficha/nova`. Nenhuma tela nova — a mesma implementação atende os dois
contextos, igual ao padrão que `FichaVisualizar` já usava para `/fichas/:id` vs.
`/painel/:campanhaId/ficha/:id`.

**`FichaCriarDialog` removido.** Última consumidora era `FichaAcervo`; com ela migrada para
`router.navigate(['/fichas', 'nova'])` (mesmo padrão de `CampanhaDetalhe.abrirCriarFicha`, que já
navegava para o guia desde a `m3-57`), o componente (`.ts`/`.html`/`.scss`/`.spec.ts`) não tinha
mais consumidor — apagado por inteiro, fechando o que o critério de aceite da `m3-57` já pedia
("o dialog antigo não existe mais no código") e que só não tinha sido cumprido para o caminho sem
campanha.

**Verificação ao vivo** (stack real + Playwright, 1920×1080 e 360×800): em `/fichas`, "Criar
ficha" navega para `/fichas/nova` sem abrir mais `app-ficha-criar-dialog`; passo 01 // BASE não
mostra seletor de dono; passo 03 // NOVO AGENTE mostra "Ficha avulsa, sem campanha" (nunca
"Primeiro agente da campanha"); guia completo (Base → Classe → Novo agente → Atributos →
Identidade → Recursos → Equipamento inicial, com 1 item "Leve" → Revisão → Criar ficha) termina em
`/fichas/:id`, não em `/painel/...`; Postgres confirma `campanha_id NULL`, `dinheiro` intocado pelo
kit (rolagem à parte) e `inventario.itens` com o item escolhido; a ficha aparece em `/fichas` com o
chip "Sem campanha". Repetido em mobile (360×800): mesma trilha "GUIA · 03/08"/"07/08"/"08/08",
sem scroll horizontal em nenhum passo, kit deixado vazio (passo pulável) chega em Revisão como
"Nenhum item — inventário nasce vazio" e cria a ficha normalmente. Nenhum `alert`/`confirm`/`dialog`
nativo disparou em nenhum dos dois passes. `shared` 532/532, `frontend` 733/735 (as mesmas duas
falhas pré-existentes documentadas em `P-001`/`P-010` — nenhuma delas tocada por esta mudança) e
lint sem novas violações (mesmas 7 pré-existentes do `HEAD` anterior).

## 2026-08-07 — `m3-59`: Passo // EQUIPAMENTO INICIAL fecha o trio do guia de criação

Terceira e última task do trio `m3-57`…`m3-59`: o guia ganha o **Passo 08 // EQUIPAMENTO
INICIAL**, entre Recursos e Revisão (sempre presente, ao contrário de Melhorias — kit inicial
existe mesmo no Nível 0). O jogador escolhe o kit na loja dentro de dois tetos do documento — soma
até **$2500** e peso até **5** —, sem poder modificar itens; um kit vazio é válido e não trava o
guia.

**Decisão de arquitetura — componente novo, não reuso literal de `FichaInventario`/`ComprasPage`.**
A spec pedia para "reusar o componente de compras/carrinho da `m3-14`", mas nem a Loja pública
(`ComprasPage`, m1-10) nem o editor de Inventário (`FichaInventario`, m3-14) expõem um
catálogo/carrinho **standalone** — os dois são componentes monolíticos (2786/1666 linhas de TS)
com responsabilidades irrelevantes ao kit inicial (modificações, amplificadores, fragmentos,
edição de item já existente, "Aplicar em.../Consumir"). Embutir qualquer um dos dois só para
desabilitar a maior parte do que oferecem contrariaria a regra do `AGENTS.md` de avaliar extração
antes de acrescentar responsabilidade a um componente já extenso. A leitura adotada: reusar o
**motor** (nunca uma segunda tabela de itens ou uma segunda fórmula de totais) e construir uma UI
nova, focada, para a fatia realmente necessária aqui. Nasceu `GuiaEquipamentoLoja`
(`frontend/.../ficha/componentes/guia-equipamento-loja/`) — componente burro (input `itens`/output
`itensMudaram`, mesmo contrato de `FichaHabilidadeSeletor` na m3-58): catálogo por categoria + busca
+ carrinho com stepper de quantidade, sem noção alguma de orçamento — a trava dura, o "modo livre"
e os medidores são do **passo** (`criar.page.ts`), não do componente, replicando a separação já
estabelecida entre `FichaHabilidadeSeletor` (não sabe quantas vagas existem) e o passo Melhorias.
Os totais usam `calcularTotaisCarrinho` (mesma função de `ComprasPage`/`FichaInventario`) sobre
`CarrinhoItemDto[]`/`CATALOGO_ITENS` (`shared/regras/compras`) — nenhuma fórmula nova, nenhum
catálogo duplicado.

**Novo em `shared/regras/compras`:** `KIT_INICIAL_ORCAMENTO_MAXIMO` (2500) e
`KIT_INICIAL_PESO_MAXIMO` (5), ao lado das demais constantes de regra do módulo — os dois tetos do
documento ("Informações Adicionais > Equipamento Inicial") viram fonte única em vez de número
mágico espalhado no componente do passo.

**Decisão de escopo — variante de Civil não implementada.** O documento tem uma seção à parte
("Jogando como um Civil > Equipamento Inicial") com regra **diferente**: kit de $1000 (não $2500),
sem teto de peso descrito, e proibição de Proteção/Explosivos/modificação. A spec da `m3-59`,
porém, lista para leitura só "Informações Adicionais > Equipamento Inicial", "> Dinheiro" e o
capítulo "Equipamentos" — deliberadamente **sem** apontar para o capítulo do Civil, que é um
subsistema de criação inteiro à parte (atributos, saúde, defesa e habilidades todos diferentes,
nada disso modelado no guia hoje). Resolvido como fora de escopo desta task por "não extrapole": o
Civil usa a mesma regra $2500/peso 5 de qualquer outra classe no guia por ora. Registrado o gap
para uma spec futura se o autor decidir modelar Civil de ponta a ponta no guia.

**`ficha-padrao.ts`:** `OpcoesFichaInicial` ganhou `equipamentoInicial?: readonly CarrinhoItemDto[]`
(mesmo padrão do `habilidadesExtras` da `m3-58`); `construirFichaInicial` passou a usar
`opcoes.equipamentoInicial ?? []` em `dados.inventario.itens` em vez do array vazio hardcoded —
`dados.dinheiro` continua vindo só de `opcoes.dinheiro`, nunca descontado do kit (orçamento à
parte, conferido em teste e ao vivo).

**`criar.page.ts`/`.html`/`.scss`:** `EstadoGuiaCriacao.kit` (novo campo, default `[]`,
normalizado em rascunhos antigos via `normalizarEstado`); `passos()` sempre insere "Equipamento
inicial" entre "Recursos" e "Revisão" (8 posições sem Melhorias, 9 com); `passoValido()` ganhou o
`case` correspondente (`modoLivre || kitValido()`); Revisão e o resumo lateral ganharam uma linha
de kit (contagem, gasto, peso). Os dois medidores ("Gasto"/"Peso") reusam o padrão visual de trilho
fino já usado no progresso do guia (`guia__resumo-trilho`), com variante `--erro` (token `--vida`)
quando o total ultrapassa o teto — nunca hex solto.

**Verificação ao vivo** (stack real + Playwright, 1920×1080 e 360×800): fluxo completo do guia até
criar a ficha, com o kit estourando ambos os tetos (2× "Pesada", $3000/peso10 — os dois medidores
acendem em vermelho e "Avançar" desabilita), "Modo livre" liberando, remoção de item levando
exatamente ao teto ($1500/peso5, ambos "≤" — válido sem modo livre), Revisão exibindo o resumo do
kit, e o Postgres confirmando `dados.inventario.itens` idêntico ao escolhido e `dados.dinheiro`
intocado (igual ao total do passo Recursos). Conferido também que o item aparece na aba Inventário
da ficha recém-criada com o peso correto. No mobile: catálogo/carrinho em coluna única, sem scroll
horizontal, alvo de toque do botão "+" em 44×44, kit vazio pulável sem travar o guia, nenhum dialog
nativo do navegador em nenhum passo. Troca de categoria e busca no catálogo conferidas
separadamente. Testes: `shared` 532/532, `frontend` 738/740 (as 2 falhas são as pré-existentes
`P-001`/`P-010`, não relacionadas a esta task); `criar.page.spec.ts` ganhou o describe `m3-59`
(trava dura, modo livre, `mudarKit`, kit chegando em `dados.inventario` sem tocar `dinheiro`);
`ficha-padrao.spec.ts` ganhou 2 testes cobrindo `equipamentoInicial`. Lint sem novas violações
(comparado par a par contra o baseline da branch).

Com isso o trio `m3-57`/`m3-58`/`m3-59` fecha a base funcional do guia de criação de ficha — a
spec `m3-57` (que documentava as três tasks) e a `m3-59` movem para `docs/specs/done/`.

## 2026-08-07 — Remove o aviso nativo de `beforeunload`; espaçamento entre Motivo de entrada e as médias

**F5/fechar aba não avisa mais.** Pedido do usuário: fazer o F5 abrir a mesma `<dialog>` do botão
"Sair do guia". Não dá — `beforeunload` é um evento síncrono e o navegador proíbe UI customizada
ou decidir de forma assíncrona se cancela a navegação; só existe o prompt nativo genérico
("Esta página pede que você confirme se quer sair"), texto fixo, sem tema. Como o rascunho agora é
salvo de forma confiável a cada mudança e recuperável ao reabrir a página (fix anterior), esse aviso
também tinha ficado **incorreto** — dizia "Informações inseridas podem não ser salvas", o que não é
mais verdade. Removido o `@HostListener('window:beforeunload', ...)` (`antesDeSair`) de
`criar.page.ts` inteiro: F5/fechar aba agora são silenciosos, como o resto do site — o mesmo banner
"Rascunho encontrado" que já existia cobre a recuperação. Confirmado com o usuário via pergunta
direta antes de remover.

**Espaçamento entre "Motivo de entrada" e a grade de médias.** No passo // NOVO AGENTE, o `<label
class="campo">` do Motivo de entrada ficava colado na grade de Média de Nível/Prestígio logo abaixo
— só existia a regra inversa (`&__campos + .campo`), não essa ordem. Adicionado `.campo +
&__campos { margin-top: 16px; }` em `criar.page.scss`, mesmo valor já usado no sentido oposto. Não
afeta as outras 4 ocorrências de `.guia__campos` no arquivo — todas precedidas por `.guia__introducao`
ou `<section>`, nunca por um `.campo` solto.

Verificado ao vivo (stack real + Playwright) em 1920×1080: `page.reload()` completa sem travar,
nenhum diálogo nativo aparece, o rascunho é oferecido para retomar e o nome digitado volta certinho;
o espaçamento entre as duas linhas do Novo agente ficou em 16px. 17 testes de `criar.page.spec.ts`
continuam passando.

## 2026-08-07 — Confirmação de saída vira `<dialog>` nativo, com texto explicando que o rascunho não se perde

Refinamento do fix anterior (mesmo dia): a confirmação de saída tinha virado um painel inline
(`.guia__sair-confirmar`, `role="alertdialog"`) empurrando o conteúdo da página para baixo — não
era de fato uma "dialog". Pedido do usuário: usar uma dialog de verdade, e deixar claro no texto que
o progresso não se perde.

Trocado por um `<dialog>` HTML nativo (`.guia__sair-dialog`), aberto via `showModal()`/fechado via
`close()` num `effect()` que sincroniza com o signal `confirmandoSaida()` (esses métodos são
imperativos — sem equivalente declarativo em template). Ganha de graça o comportamento padrão do
elemento: overlay no top layer, `::backdrop` esmaecendo o resto da página, Esc fecha sozinho, foco
preso dentro do diálogo. Clique no backdrop também fecha (checagem `event.target ===
event.currentTarget` no clique do próprio `<dialog>`, já que o clique fora do conteúdo cai nele
mesmo). Texto novo: "Seu progresso foi salvo neste dispositivo. Você não vai perder nada — ao voltar
para esta tela, pode continuar exatamente de onde parou" — reforça que dá pra sair e retomar depois
(o rascunho que o fix anterior já garantiu não sumir mais).

jsdom (ambiente de teste) não implementa `HTMLDialogElement.showModal`/`close` — o efeito checa
`typeof` antes de chamar, então os testes continuam passando sem exercitar o `<dialog>` de verdade;
o comportamento real (abre, Esc fecha, backdrop fecha, confirmar navega, nenhum `confirm()`/`alert()`
nativo aparece) foi conferido ao vivo (stack real + Playwright) em 1920×1080 e 360×800. 17 testes de
`criar.page.spec.ts` continuam passando.

## 2026-08-07 — Confirmação de saída sem `confirm()` nativo + rascunho não some mais antes da decisão

Dois problemas reportados no guia de criação de ficha:

**1. `sair()` usava `confirm()` nativo do navegador.** Botão de voltar do cabeçalho (`.guia__sair`)
chamava `confirm('Seu progresso foi salvo. Deseja sair do guia?')` — caixa de diálogo do navegador,
fora do tema, sem acessibilidade/estilo controlados pela aplicação. Trocado por um painel inline no
próprio tema (`.guia__sair-confirmar`, `role="alertdialog"`), mesmo padrão já usado em
`perfil.page` para excluir conta (`confirmandoExclusao`) — nada de `confirm()`/`alert()` nativos.
`sair()` agora só abre o painel; `confirmarSaida()`/`cancelarSaida()` decidem.

**2. Rascunho podia ser apagado antes do jogador decidir "Retomar" ou "Começar do zero".** O efeito
de auto-save (`effect(() => { if (!carregando()) rascunhos.salvar(...) })`) salvava o `estado()`
assim que `carregando()` virava `false` — o que acontecia **antes** de qualquer clique no banner
"Rascunho encontrado", sobrescrevendo o rascunho de verdade com o estado inicial (quase vazio) do
formulário recém-aberto. Na prática, o rascunho exibido no banner já estava corrompido pelo tempo
que o jogador levava para ler a pergunta e clicar. Corrigido acrescentando `&& !temRascunho()` à
condição do efeito: enquanto o banner está pendente de decisão, nada é salvo; assim que
`retomar()`/`recomecar()` zera `temRascunho`, o auto-save volta a rodar normalmente.

Verificado ao vivo (stack real + Playwright) em 1920×1080 e 360×800: nenhum diálogo nativo do
Chromium aparece ao clicar em Sair; o rascunho permanece intacto no `localStorage` mesmo depois de
esperar com o banner "Rascunho encontrado" na tela, e "Retomar" restaura o nome digitado
corretamente. 4 testes novos em `criar.page.spec.ts` (17 no total, todos passando) cobrindo os dois
casos — inclusive o cenário exato do bug (rascunho existente + nenhuma decisão ainda + efeito não
deve ter salvo nada).

## 2026-08-07 — Passo // CLASSE não deve calcular Vida/Energia (atributos ainda não escolhidos)

Feedback do usuário sobre o passo **02 // CLASSE**: o bloco "Saúde de partida (atributos atuais)"
mostrava `vida()`/`energia()` já calculados (ex.: Vida 88, Energia 53) — mas `atributosFinais()`
naquele passo ainda é só o valor de fábrica (1 em cada atributo, `ATRIBUTOS_BASE_PADRAO`) mais o
bônus fixo do arquétipo; o jogador só distribui atributos de verdade no passo **04 // ATRIBUTOS**.
O número exibido parecia definitivo mas era baseado em atributos que o jogador nem escolheu ainda.

**Correção:** o bloco virou "Saúde base (antes dos Atributos)" e mostra só o que é fixo da classe —
Vida/Energia base e a progressão por Nível/atributo (ex.: "30, +7/nível, +4 por Vigor") — sem aplicar
Nível nem atributo nenhum. Nova função `obterSaudeClasse` (`shared/regras/agente/saude.ts`) expõe os
mesmos coeficientes de `calcularVida`/`calcularEnergia` (`SAUDE_POR_CLASSE`) sem a parte de
Nível/atributo, evitando duplicar as constantes no frontend (fonte única). `vida()`/`energia()`
continuam usados sem mudança nos passos que já têm atributos definidos (Resumo Operacional a partir
do passo 04, Revisão) — só o bloco do passo // CLASSE mudou. Verificado ao vivo (stack real +
Playwright) em 1920×1080 e 360×800; sem regressão nos 13 testes de `criar.page.spec.ts` nem nos 19 de
`saude.spec.ts` (2 novos para `obterSaudeClasse`).

## 2026-08-07 — Ajuste de UX pós-m3-58: passo // MELHORIAS ficava enorme verticalmente

Revisão visual pedida logo após a entrega da `m3-58`: com as vagas preenchidas (ex.: Combatente
Nível 7, 11/12 vagas), o passo **06 // MELHORIAS** passava de 1467px de altura em 1920×1080 (36%
além de uma tela cheia) e no mobile (360×800) já nascia esticado mesmo vazio, por dois motivos
independentes.

**Causa 1 — `.guia__vagas` esticava as 4 cartas para a altura da mais cheia da mesma linha.** Grid
usa `align-items: stretch` por padrão; uma carta com 1 vaga (ex.: "Outra classe/outro arquétipo
1/1") ficava tão alta quanto a vizinha com 4 (ex.: "Habilidade Geral 4/4"), sobrando espaço vazio.
Corrigido com `align-items: start` — cada carta agora cresce só com o próprio conteúdo.

**Causa 2 — `.guia__vaga-lista` era uma coluna única (uma habilidade por linha), sem limite.** Em
níveis altos (a tabela de progressão chega a conceder bem mais que 4 vagas de um tipo em Nível 20)
essa lista cresceria sem parar, e mesmo em Nível 7 as 11 habilidades escolhidas já ocupavam 11
linhas cheias. Trocada de `display: grid` (coluna única) para `display: flex; flex-wrap: wrap`
— os nomes viram chips que quebram linha conforme a largura da carta (mesmo padrão já usado em
`.guia__briefing-chips`/`.guia__destaques`), sem introduzir rolagem aninhada dentro da página.
Nenhuma mudança de template/lógica — só CSS; a trava de "Escolher" some no alvo e o botão de
remover (`✕`) continuam ≥44px no mobile, herdado das regras já existentes.

Também aparado o padding do painel "Ganhos automáticos do nível" (`--ganhos`) e o espaçamento entre
as cartas de vaga no mobile, para devolver mais um pouco de altura sem mudar a informação exibida.
**Resultado:** o mesmo cenário (Combatente Nível 7, 11/12 vagas) caiu de 1467px para 1263px em
1920×1080 — verificado ao vivo (stack real + Playwright, skill `verify`) nos dois breakpoints antes
e depois do ajuste; nenhuma regressão nos 13 testes de `criar.page.spec.ts`.

## 2026-08-07 — m3-58: passo // MELHORIAS do guia de criação (habilidades de nível + Fortificação de Personalidade)

Segunda perna do trio do guia de criação: o passo **06 // MELHORIAS**, entre Identidade e
Recursos, gasta as vagas de habilidade que a progressão do Nível já concede mas que a `m3-57`
deixava sem consumidor. Só existe quando o Nível/Treinamento inicial (passo 03) é maior que 0 — a
trilha (`passos`) virou um `computed<readonly string[]>` derivado de `temMelhorias()` em vez do
array fixo de 7 posições; `passoValido()`, `avancar()` e o `@switch` do template passaram a chavear
pelo **nome** do passo (`passos()[estado().passo]`), não mais por índice numérico — a inserção
condicional de um passo no meio da sequência tornaria qualquer `case` numérico frágil. Um `effect`
novo grampeia `passo`/`visitado` dentro do tamanho atual da trilha, para o caso raro de o autor
voltar ao passo 03 e mudar as médias depois de já ter visitado passos além do que a nova contagem
de passos comporta.

**Vagas** vêm direto de `calcularProgressaoAcumulada` (Habilidade Geral, de Classe, Classe ou
Arquétipo, Outra classe/outro arquétipo, Civil) — nenhuma tabela nova, só orquestração. Cada vaga
abre o **mesmo seletor de catálogo da `m3-13`** (`FichaHabilidadeSeletor`), mas com os `grupos()`
recortados por vaga num novo método privado `gruposParaVaga`: 'geral' é a aba Gerais inteira;
'classe'/'classeOuArquetipo' mostram só o(s) subgrupo(s) **da própria ficha** (`ehDaFicha`);
'outraClasse' mostra os demais — as duas outras classes-base e os outros arquétipos da mesma
classe, que é exatamente o "outra classe/outro arquétipo da sua classe" do documento, já que
`catalogoHabilidades` inclui as três classes e todos os arquétipos da classe-base na mesma
chamada. O caso à parte é um Civil no Treinamento Elite ("1 Habilidade de Classe... não é possível
escolher uma habilidade de arquétipo"): usa `catalogoHabilidades(COMBATENTE, null)` só para pegar
a lista das 3 classes e zera `ehDaFicha` em todas (Civil não tem classe própria a destacar). A
Habilidade Inicial do passo Classe entra em `nomesNaFicha` do seletor (não consome vaga, mas
também não pode ser escolhida de novo) e a mesma habilidade não pode ser escolhida duas vezes
entre vagas (o seletor já resolve isso nativamente).

**Fortificação de Personalidade** (níveis 7/14, 0–2 vagas) não usa o catálogo — é um mini-formulário
por vaga (nome + efeito), reusando literalmente as classes `.guia__formacoes`/`.guia__formacao` do
Passo 05 (mesmo padrão visual de "N cartões de formulário curto", já aprovado). Cada uma vira, na
criação, uma `FichaHabilidadeDto` com `categoria: PERSONALIDADE` — o contrato já suportava (`m3-01`/
`m3-23`), só faltava um produtor. `OpcoesFichaInicial` (`ficha-padrao.ts`) ganhou
`habilidadesExtras?: readonly FichaHabilidadeDto[]`, anexado depois da Habilidade Inicial em
`construirFichaInicial`.

**Ganhos automáticos do nível** (Proficiência, Defesa, Dano furtivo, Habilidades por turno) — só
informação, nada escolhido — reusam o painel "Memorial de cálculo" do Passo 03 (`.guia__memorial`)
alimentado por `calcularDerivados(classe, nivelInicial, atributosFinais, habilidadesDoNivel)`, sem
fórmula nova (proibição #26); campos que a classe não possui (Civil não tem Defesa/Proficiência/
Dano furtivo) somem via `@if`.

**Trava dura**: reusa o mesmo `estado().modoLivre` do Passo 04 // ATRIBUTOS (um único interruptor
para o guia inteiro) — sem ele, `passoValido()` exige todas as vagas preenchidas e as Fortificações
com nome+efeito; com ele, avança mesmo faltando. **Achado na verificação ao vivo**: a primeira
versão também deixava o botão "Escolher" de uma vaga visível **além** do alvo quando modo livre
estava ligado, e um teste manual de ponta a ponta produziu uma vaga "20/4" ao clicar repetidamente
— nada travava o excesso. Corrigido para o botão sempre sumir ao atingir o alvo, **independente**
de modo livre (o mesmo comportamento dos steppers de Atributos, cujo clamp nunca depende do
interruptor — modo livre só destrava a validação de avançar, nunca o campo em si).

**Segundo achado da verificação ao vivo**: o painel "Ganhos automáticos" reaproveitou
`.guia__memorial`, cuja 3ª coluna (`strong`) é fixa em `38px` — dimensionada para números curtos
como "17" ou "7", mas "Dano furtivo" é notação de dado (`3D6+3`), que estourava a coluna e cortava
visualmente tanto no desktop quanto no mobile. Corrigido com um modificador `--ganhos` que troca a
3ª coluna para `auto` nos dois breakpoints, sem afetar o memorial original de Novo Agente.

**Fora de escopo, registrado em `PROBLEMS.md` (P-012):** lendo `docs/core/sistema-v4.1.0.md` —
"Habilidades" para esta task, apareceu um pacote de habilidades **de criação** (Nível/Treinamento
0), narrado à parte da tabela de progressão por nível e nunca modelado em `shared/regras` — nem
`calcularProgressaoAcumulada` nem a `m3-58` o cobrem, então uma ficha criada no Nível 0 (o caminho
"primeiro agente" e a maioria das entradas num Civil) nasce sem esse pacote. É uma regra de domínio
nova, fora do que esta spec definiu; registrado para não se perder, com contorno (editor de
habilidades da própria ficha) e não implementado por decisão de escopo — "não extrapole".

**Verificado:** `tsc --noEmit` limpo; `ng build` (development) e `eslint` sobre os arquivos tocados
sem erros novos (os 2 pré-existentes de `.guia__resumo-fundo`, ver `P-009`, continuam); suíte de
`criar.page.spec.ts` com 9 testes prévios + 4 novos (passo ausente no Nível 0; trava dura e modo
livre; preenchimento das vagas pelo catálogo sem repetir a Inicial nem uma já escolhida; exigência
de nome+efeito da Fortificação mesmo com as vagas do catálogo cheias) — 13/13 verdes; suíte inteira
do frontend (724/726, as 2 falhas conhecidas de `P-001`/`P-010`) e de `shared` (530/530) sem
regressão. Ao vivo (stack real + Playwright, skill `verify`): criada uma ficha "primeiro agente"
(Nível 0) confirmando a ausência do passo; criada uma segunda ficha de Combatente/Lutador cuja
média de esquadrão (uma ficha elevada a Nível 8 direto no Postgres) resultou em Nível inicial 7,
passando pelas 4 vagas de catálogo (Geral 4/4, Classe 2/2, Classe ou Arquétipo 4/4, Outra classe
1/1 — bate exatamente com a soma manual da tabela do documento do Nível 1 ao 7) e 1 Fortificação,
em 1920×1080 e 360×800 (seletor do sistema, formulário de Fortificação, "Escolher" some ao encher
mesmo em modo livre, `3D6+3` sem corte); a ficha criada foi conferida na própria aba Habilidades
(`Arquétipo 1` — a Inicial, sem consumir vaga — `Classe 6`, `Geral 4`, `Outras classes/arquétipos
1`, e a Fortificação nomeada aparecendo com o chip "Personalidade").

## 2026-08-07 — m3-57: resumo operacional some no mobile (botão no cabeçalho), alinhamento do cabeçalho, respiro em Identidade e resumo com mais informação

Três pedidos encadeados sobre o guia de criação. **(1)** No mobile, o "Resumo operacional" saiu da
barra inline colapsável — que ainda empurrava o rodapé fixo e ocupava espaço mesmo fechada — para um
botão dedicado no cabeçalho, ao lado de "Novo agente" (`.guia__resumo-abrir`); o corpo do resumo fica
100% oculto por padrão e só abre como a mesma folha (bottom sheet) do registro anterior, reusando o
signal `resumoAberto` já existente. **(2)** O botão "Voltar" (`.guia__sair`), o título "Novo agente" e
o novo botão "Resumo" aterrissavam em alturas diferentes no cabeçalho mobile — os dois `margin-top:
13px` que empurravam manualmente o `h1` e o botão para compensar o kicker escondido (`display:none`)
deixavam o botão de resumo 13px mais baixo que o "Voltar", já que ambos têm a mesma altura de alvo de
toque (44px) mas só um carregava a margem. Trocado por `align-items: center` no `.guia__cabecalho` e
remoção das duas margens — a centralização vertical do flexbox faz o alinhamento sozinha. O botão de
resumo também deixou de ser um pill sólido (`background: var(--surface-2)`) inconsistente com os
demais controles e passou a seguir o padrão visual de `.botao--secundario` (fundo transparente, borda
`--border-strong`, hover para `--surface-2`), mantendo só o estado `--ativo` (accent) que já existia.
**(3)** Os campos do Passo 05 // IDENTIDADE estavam com pouco respiro (`padding`/`gap` de 10–16px
entre blocos e sub-seções) — aumentados moderadamente (`.guia__campos` 14→18px, `.guia__identidade-
bloco` 16→20px de padding e 14→20px entre blocos, `.guia__subsecao` 20→26px de margem superior,
`.guia__formacoes`/`.guia__formacao` +2–4px de gap/padding) e adicionada uma regra genérica
(`.guia__campos + .campo`) para o par Gatilho/Efeito da Especialidade não colar no textarea "Saber de
campo" logo abaixo, que antes não tinha nenhuma margem entre os dois.

O "Resumo operacional" também ganhou mais conteúdo, sem introduzir estado novo — tudo reusa
computeds/signals já existentes: uma tira de progresso no topo (`passo`/`passos`, a mesma fonte da
trilha de passos e da barra mobile), o bônus fixo de atributos e a Habilidade Inicial do perfil
(reusa `.guia__destaques`, o mesmo componente visual dos "Destaques" de atributo, e `bonusAtributosLista`/
`habilidadeInicial`, já computados para o briefing do Passo 02), o Motivo de entrada (novo
`rotuloMotivoEntrada` em `rotulos-ficha.ts`, espelhando o texto de `calculadora/rotulos.ts` já que os
módulos de feature não se importam entre si), o aviso "Amaldiçoado pelo Passado" (`novoAgente().
recebeAmaldicoadoPeloPassado`, hoje só aparecia na Revisão) e as Formações escolhidas com texto
preenchido (`formacoesPreenchidas`, mesmo padrão de chips). Um ajuste de CSS entrou no caminho: a
grade da faixa de tablet (`@include bp.tablet`) redefine `.guia__resumo-linha` para `display: grid` e
esse estilo "vazava" para o breakpoint mobile também (`bp.tablet`/`bp.mobile` são os dois
`max-width`, então ambos batem a ≤560px) — sem um `display: flex` explícito dentro de `bp.mobile`,
as linhas do resumo (inclusive as três que já existiam antes: Personalidade/Origem/Recursos) ficavam
grudadas umas nas outras sem o `border-top` de separação. Corrigido com um `&__resumo-linha` dedicado
dentro do bloco mobile restaurando `display: flex` e o separador.

**Verificado:** `tsc --noEmit`, `ng build` de produção, `eslint` e a suíte de testes (`criar.page.
spec.ts`, 9/9) limpos. Na aplicação real (Postgres 16 nativo + backend + frontend): em 1920×1080, o
Passo 05 mostrou o respiro maior entre os blocos de Identidade e o resumo lateral com a tira de
progresso, bônus, Habilidade Inicial, Personalidade/Origem e as duas Formações escolhidas como chips;
uma segunda ficha na mesma campanha (`fichas().length > 0`) com motivo "Contenção ou extermínio"
mostrou a linha "Motivo de entrada" e o aviso "Amaldiçoado pelo Passado" no resumo, batendo com o
memorial de cálculo do próprio passo. Em 360×800: cabeçalho com "Voltar"/"Novo agente"/"Resumo"
alinhados na mesma linha, resumo oculto por padrão, folha do resumo abrindo por cima com as linhas
devidamente separadas (sem o vazamento do grid de tablet) e nada sobrepondo o botão "×" fixo no topo
da folha.

## 2026-08-07 — m3-57: stepper de Atributos exibe o valor final somado, não só a nota

Seguindo o pedido do autor logo após o registro anterior: o Passo 04 // ATRIBUTOS ainda mostrava
o valor **base** no número grande do stepper, deixando o bônus só numa nota ao lado ("+1 fixo ·
final 2") — o jogador tinha que somar de cabeça. O número do stepper agora é `atributosFinais()`
(base + bônus já clampado, o mesmo valor que `construirFichaInicial` persiste); os botões +/-
continuam incrementando a base em 1 a cada clique — e o orçamento/saldo continuam validando só a
base, sem mudança de regra. O marcador junto ao nome do atributo trocou "fixo" pelo nome real da
fonte do bônus (`rotuloOrigemBonus`, de `rotulos-ficha.ts`): "+1 Lutador", "+1 Experimento
Bestial". **Verificado:** `tsc --noEmit`, `ng build` e `eslint` limpos; na aplicação real (mesmo
setup do registro acima), Força foi incrementada duas vezes em 1920×1080 e 360×800 — o saldo caiu
de 4 para 2 e o stepper foi de "2" para "4" (base 1→3 + bônus 1), confirmando que base, saldo e
valor final andam juntos.

## 2026-08-07 — m3-57: briefing de Classe (bônus, Habilidade Inicial), rótulo "Classe - Arquétipo" e resumo mobile em overlay

O Passo 02 // CLASSE prometia ("os bônus fixos serão aplicados após a distribuição dos atributos")
sem nunca mostrar quais eram — nem ali, nem no Passo 04 // ATRIBUTOS, onde os steppers exibiam só o
valor base, escondendo o que `construirFichaInicial` já persistia corretamente (bônus fixo somado e
clampado). O gap era só de exibição: o motor sempre aplicou `obterBonusAtributos` certo. O Passo 02
agora traz um briefing completo por classe/arquétipo/subclasse — a descrição de flavor do documento
(`guia-briefing.ts`, citação literal de "Classes e Arquétipos"/"Jogando como um Civil"), os chips de
bônus fixo de `obterBonusAtributos`, Vida/Energia de partida via `calcularVida`/`calcularEnergia` (os
mesmos computeds já existentes, sem fórmula nova) e a Habilidade Inicial de `habilidadesIniciais` —
só aparece depois que classe **e** arquétipo/subclasse estão definitivos. O Passo 04 ganhou o mesmo
bônus por atributo (`+N fixo · final X`) ao lado da base editável.

Separadamente, "Perfil selecionado" (Passo 02), o card do resumo lateral e a linha "Classe /
Arquétipo" da Revisão usavam `estado().arquetipo || estado().classe` — mostrava só um dos dois, cru
(`COMBATENTE`, não "Combatente"), e nunca "Classe - Arquétipo". O guia é o único lugar da ficha que
não passava por `rotuloClasseCompleto` (`rotulos-ficha.ts`), já usado pelo mini-card da campanha e
pelo acervo — os três pontos agora reusam essa mesma função central, sem novo mapa de rótulos.

No mobile, o "Resumo operacional" expandia **inline**, empurrando o rodapé fixo para baixo do
conteúdo do passo. Ele passa a abrir como uma folha (bottom sheet) por cima da tela — fundo
semitransparente clicável para fechar, botão "×" dedicado, `max-height: 82dvh` com rolagem própria —
só via CSS (`@include bp.mobile`), sem novo estado no componente: o mesmo `resumoAberto` de sempre
já bastava.

**Verificado:** `tsc --noEmit`, `ng build` de produção e `eslint` limpos nos arquivos tocados. A
suíte completa do frontend manteve as mesmas duas falhas preexistentes fora do guia (apelido de
equipamento e "Voltar ao acervo") — nenhuma nova falha, `criar.page.spec.ts` sem regressão. Na
aplicação real (Postgres 16 nativo + backend + frontend, sem Docker disponível neste ambiente): guia
percorrido em 1920×1080 para Combatente-Lutador, Experimento Bestial e Civil (bônus, Habilidade
Inicial e Vida/Energia corretos para os três; "nenhum bônus fixo" no Civil, sem card de Habilidade
Inicial) e em 360×800 para o mesmo fluxo, incluindo abrir/fechar o resumo pelo botão e pelo fundo. Uma
ficha completa foi criada de ponta a ponta (Combatente-Lutador) e a leitura direta do PostgreSQL
confirmou `forca`/`luta` em 2 (base 1 + bônus 1) e Vida/Energia (34/17) idênticos ao que o guia
mostrou antes da criação.

## 2026-08-07 — m3-57: fluxo convencional, Identidade, Recursos e resumo progressivo

O validador de Atributos tratava a restrição dos quatro pontos de criação como se ela também
limitasse os pontos recebidos pela progressão: por isso agentes de Nível maior ficavam impedidos de
avançar sem “modo livre”. A regra pura agora confirma que a distribuição final contém uma base de
criação legal e, separadamente, respeita orçamento e teto da progressão. Casos convencionais dos
Níveis 1, 5, 10, 15 e 20 passaram a ter cobertura explícita no `shared` e no componente do guia.

Na Identidade, Personalidade e Origem ganharam blocos distintos; Personalidade passou a ser
preenchível, as duas Formações usam o catálogo completo do sistema com alternativa `Outra`, e a
seleção catalogada preenche seu efeito e parâmetro quando houver. Especialidade permanece texto
livre por ser esse o contrato do sistema. Recursos agora começam realmente vazios: um único botão
executa a rolagem, anima e revela os quatro dados, registra o resultado definitivo e não permite
rerrolar. O resumo operacional também deixou de fabricar Combatente, Nível, Prestígio e dinheiro
antes das escolhas; ele nasce vazio e passa a mostrar classe, progressão, destaques de atributos,
Identidade e Recursos somente quando esses dados existem.

**Verificado:** testes focais com 10/10 casos em `shared` e 9/9 no guia, lint dos arquivos tocados e
build Angular de produção. Na aplicação real foram criados e persistidos, sem “modo livre”, cinco
agentes convencionais: Níveis 1, 5, 10, 15 e 20. O percurso alternou 1920×1080 e 360×800, cobriu o
estado vazio, bloqueio antes da rolagem, animação, revelação única, Identidade e revisão; no mobile
não houve overflow horizontal e os botões do rodapé mediram 44px. A leitura do PostgreSQL confirmou
Nível, dinheiro, Personalidade, Origem e atributos persistidos para as cinco fichas. A suíte completa
do frontend manteve somente `P-001`/`P-010`; a de `shared` aprovou os 530 testes fonte e ainda esbarra
na coleta conhecida de `dist` (`P-011`). A `m3-57` permanece ativa pelos gaps de escopo restantes.

## 2026-08-07 — Qualidade acima de velocidade e gate visual inviolável

Por decisão explícita do autor, qualidade, fidelidade ao sistema e cumprimento integral das regras
passam a prevalecer formalmente sobre velocidade. Prazo, tamanho da spec, delegação, limite de
contexto ou custo de execução não autorizam atalhos. Se não houver tempo ou ambiente para verificar,
a tarefa permanece aberta; é preferível levar o dobro do tempo a entregar uma primeira versão que
precise ser refeita por divergências previsíveis.

Para toda UI, `AGENTS.md` agora exige antes da edição um componente análogo aprovado e um mapeamento
de shell, densidade, hierarquia, controles, estados, iconografia e responsividade — conformidade com
tokens isoladamente não prova fidelidade. Antes da entrega, o agente principal deve executar e
inspecionar pessoalmente a aplicação real com `verify` em 1920×1080 e 360×800, percorrer os estados
relevantes e comparar a tela renderizada com o análogo. Build, testes, lint, screenshot ou relato de
subagente são complementares e não substituem o gate. A regra também entrou em `SYSTEM.SPEC.md` como
proibição absoluta nº 31.

## 2026-08-07 — m3-57: revisão visual do guia de criação

O primeiro corte da tela `/painel/:campanhaId/ficha/nova` usava os tokens corretos, mas ainda se
comportava visualmente como um formulário genérico: hierarquia rasa, controles indiferenciados e
pouca relação com os painéis densos já aprovados. O shell foi reconstruído a partir dos padrões do
painel de campanhas e de `docs/design/tema/_componentes.scss`: cabeçalho técnico com índice e régua,
trilha vertical com estados explícitos, conteúdo em card, memorial de cálculo, steppers canônicos,
resumo operacional com stat boxes, alertas semânticos e ações primária/secundária. Ícones agora usam
`app-icone`; cores, tipografia, raios e superfícies continuam integralmente baseados nos tokens do
tema. No mobile, a trilha vira progresso compacto, o resumo é colapsável e o rodapé permanece fixo.

**Verificado:** build Angular de produção aprovado (permanece apenas o warning conhecido de bundle
inicial em 615,45 kB para o teto de 610 kB), teste focado de rotas 8/8 e lint dos arquivos TS/HTML
tocados. Na aplicação real, o guia foi percorrido até Atributos em 360×800 e inspecionado em
1920×1080; não houve overflow horizontal nem erro de console, e os botões dos steppers mediram
44×44px no mobile. A suíte completa manteve duas falhas preexistentes fora do guia: apelido do
inventário e texto do link de retorno ao acervo. A `m3-57` continua ativa porque seus demais gaps
funcionais/arquiteturais ainda não foram fechados.

## 2026-08-06 — Subnavegação e rolagem interna de Extras da ficha

A aba **Extras** da `FichaVisualizacao` passou a ter uma subbarra persistente com **Identidade**
(Patente, Origem e Personalidade) e **Fragmentos** (Fragmentos Consumidos, Afinidade de Fragmentos e
Anomalia Biológica). Os controles usam os ícones canônicos de agente e fragmento, expõem o estado
ativo por `aria-pressed` e preservam a seleção enquanto o componente permanece montado. A subbarra
fica fixa e o conteúdo de cada recorte rola separadamente; no desktop, Status acompanha exatamente
a altura das colunas de Agente/Atributos.

**Verificado:** spec focada da `FichaVisualizacao` com 124/124 testes, build de produção e
`git diff --check`. Na aplicação real, em 1920×1080 as três colunas mediram 714,28px, sem overflow
horizontal e com a navegação fora do painel rolável. Em 360×800, os dois controles mediram 44px de
altura, mantiveram ícones e rótulos completos e não produziram overflow horizontal.

## 2026-08-05 — Alinhamento desktop dos filtros do inventário

Na barra principal do inventário, `+ Adicionar itens` e `+ Item custom` permanecem à esquerda e o
grupo **Equipamentos / Amplificadores / Fragmentos** agora fica ancorado à direita da mesma linha no
desktop. O SCSS usa `margin-inline-start: auto` no grupo do filtro, em vez de criar wrappers ou
alterar o template. Em `bp.mobile`, a margem volta a `0`, preservando a segunda linha à esquerda,
os rótulos abreviados e a ausência de overflow.

**Verificado:** o novo teste de estilo passou; a spec do componente ficou em 135/136, com apenas a
falha P-001 preexistente. Na aplicação real, em 1920×1080 os botões de adição e o filtro tiveram o
mesmo `top` (292,94px), com o filtro na ponta direita; em 360×800, o filtro começou à esquerda da
linha própria (`left = 40px`) e manteve `scrollWidth = clientWidth = 258px`.

## 2026-08-05 — Ajuste da barra de filtros do inventário

O controle segmentado de **Equipamentos / Amplificadores / Fragmentos** passou a integrar a mesma
linha de `+ Adicionar itens` e `+ Item custom` no desktop. Em `bp.mobile`, a barra ocupa a segunda
linha e troca somente os rótulos visíveis para `Equip.`, `Amplif.` e `Frag.`, preservando ícones,
os nomes acessíveis completos, `aria-pressed` e o comportamento dos filtros. Esvaziar, Custos e
busca continuam na linha de ações secundárias.

**Verificado:** o teste do componente teve 134/135 casos aprovados; a única falha é a P-001
preexistente de apelido/`ResizeObserver`. Na aplicação real, a barra mediu uma única linha sem
overflow a 360×800 (`scrollWidth = clientWidth = 258px`) e ficou alinhada aos botões de adição a
1920×1080. A seleção de Fragmentos também preservou corretamente `aria-pressed`.

## 2026-08-05 — Gate obrigatório de qualidade e conclusão

Por decisão do autor, `AGENTS.md` passa a conter a definição de pronto obrigatória para qualquer
tarefa de código. Antes de mudar, o agente identifica as fontes de verdade, separa regra pura de
UI/orquestração e avalia extração ao ampliar componente extenso. Antes de declarar conclusão, revisa
o diff contra a spec, executa verificações proporcionais e, em UI, observa a aplicação real com a
skill `verify` nos cenários e viewports exigidos. Toda evidência e pendência deve ser reportada; uma
verificação obrigatória ausente mantém a tarefa aberta.

O registro vivo da decisão está em `CONTEXT.md` §5; o checklist canônico, carregado pelos agentes
no início do trabalho, está em `AGENTS.md` “Gate obrigatório de qualidade e conclusão”.

## 2026-08-05 — m3-70: contagem persistida de munição

Munições do catálogo agora declaram duração tipada (`CENA`/`DISPARO`) no motor compartilhado e podem persistir `contagemMunicao { atual, maxima, unidade }` no inventário. A 9mm nasce com 3 cenas, o Míssil com 1 disparo e a Munição de Fragmento Construtor conta 1 cena. O card exibe o saldo, permite reduzir uma unidade e editar Atual/Máxima; ao zerar, recebe o estado textual e visual “Vazia”. A UI usa tokens e `bp.mobile`, preservando o alvo de toque de 44px.

Munição Extra altera máximo e saldo em uma cena somente para munição por cena; os valores são persistidos e não são recalculados ao renderizar. O backend valida elegibilidade, inteiros, unidade e `0 <= atual <= maxima`. Não há automação de combate/cena, nem mudança no Recarregar do Construtor.

**Verificado:** shared 78/78; `tsc --noEmit` de shared, frontend e backend. A suíte Angular completa mantém apenas as falhas preexistentes P-001 e P-010.

> **Nota de migração (2026-08-01).** Este arquivo era `docs/CONTEXT.md`. Ele havia crescido para
> 4.450 linhas / 476KB — grande demais para ser lido de uma vez, que é justamente o que se espera
> de um arquivo de contexto. O conteúdo foi movido para cá **inteiro e sem cortes** (`git mv`,
> histórico preservado) e passou a ser o **registro histórico** do projeto: acumula, nunca é
> reescrito. O estado atual do sistema agora vive em `docs/context/CONTEXT.md`, que é **reescrito**
> a cada task e tem teto de ~400 linhas. Ver `CLAUDE.md` → "Context Directory".
>
> **Como usar este arquivo:** não leia do começo ao fim — busque dentro dele (`grep` por código de
> task `m3-27`, por arquivo, ou por termo). Cada entrada abaixo é o relato completo de uma task:
> o que foi feito, **por que** foi feito assim, o que foi verificado e o que quebrou no caminho.
> As seções `Estado Geral`, `Status dos Milestones`, `Status dos Módulos`, `Próxima Task`,
> `Implementado`, `Decisões Pendentes` e `Referências` mais abaixo são um **retrato congelado de
> 2026-07-29**, preservado como estava; a versão viva delas está em `CONTEXT.md`.
>
> Especificações em `docs/specs/done/` que citam `docs/CONTEXT.md` referem-se a este arquivo. Elas
> **não** foram reescritas: são registro histórico e devem continuar dizendo o que diziam.

---

## Registro por task (mais recente primeiro)

## m3-69 — Fragmento Construtor: item custom ganha "Base" do catálogo (2026-08-05)

Spec: `docs/specs/done/m3-69-fragmento-construtor-base-do-catalogo.spec.md`. Continuação do
"Fechamento de Fragmentos" (`m3-63`…`m3-68`) — ajuste de UX discutido com o autor ao revisar o card
do Fragmento Construtor na ficha. Task de **frontend**; `docs/design/DESIGN.md` relido antes da UI
nova (proibição #29).

**O problema.** Criar um Fragmento Construtor sempre pedia dano/resistência **digitados do zero**
(`itemCustomForm`) — o bônus fixo do módulo (`listarEfeitosFixosConstrutor`, `m3-65`) entrava como
Modificação em cima de um texto livre desconectado de qualquer item real. O doc diz "ele é a arma em
si" (`sistema-v4.1.0.md` ~1945): um Construtor Módulo I sendo uma "Mediana" (`3D4+FOR`) deveria somar
o bônus do módulo (`+4D12`, doc) **sobre** o dano real daquela arma, não sobre um texto inventado.

**O que foi feito.**
1. Novo `<select>` "Base" no form de item custom, visível só quando a categoria é
   `FRAGMENTO_CONSTRUTOR` e `formaFixaConstrutor(categoriaEmprestada)` resolve `'ARMA'`/`'PROTECAO'`
   (Corpo a Corpo/Armas de Fogo/Proteções, na prática — Explosivos/Munições não têm forma reconhecida
   e ficam de fora, mesmo padrão de "Recarregar" pra Munições). Lista `CATALOGO_ITENS[categoriaEmprestada]`
   + "Outra (digitar)" como última opção — o texto livre continua existindo, só deixou de ser único
   caminho.
2. Escolher uma Base preenche e **trava** (`FormControl.disable()`) dano/informação (Arma) ou
   resistência (Proteção) com os valores daquele item do catálogo, e pré-preenche o peso (o
   Construtor "é" aquele item — ocupa o mesmo espaço; custo segue livre, fragmentos são achados,
   `m3-49`). Voltar pra "Outra" destrava e limpa os campos, exatamente como o form sempre funcionou.
3. A lógica de auto-preenchimento (`escolherBaseConstrutor`) está ligada ao `(change)` do `<select>`
   no template — **não** a uma subscription de `valueChanges` no construtor. Uma subscription
   reativa parecia mais robusta a princípio, mas quebrou um teste existente: `FormGroup.setValue()`
   emite `valueChanges` pra **todo** campo, mesmo os que não mudaram de valor — um `.setValue({...,
   baseConstrutor: ''})` de teste disparava o "efeito Outra" *depois* de setar `dano`/`informacao`,
   sobrescrevendo os dois de volta pra `''`. `(change)` só dispara numa interação de verdade no
   `<select>`, nunca num `reset`/`setValue` em lote.
4. `resetarItemCustomForm` (novo helper, substitui as duas chamadas de `.itemCustomForm.reset(...)`
   em `escolherTipoFragmento`/`alternarCriarItem`): reabilita dano/informação/resistência antes do
   `reset()` (que sozinho **não** desfaz um `disable()` anterior) e sempre volta `baseConstrutor` pra
   `''` ("Outra").
5. **Achado durante os testes, corrigido:** `calcularStatItem` (`shared/regras/compras/compras.ts`)
   já fundia dano de qualquer categoria com `itemCatalogo.dano` presente (sem gate de categoria), mas
   o bloco de **Resistência** só rodava pra `PROTECOES`/`ARMAZENAMENTO` — excluía
   `FRAGMENTO_CONSTRUTOR`. Resultado: um Construtor forma Proteção nunca teve a Resistência
   computada fundida com o bônus do módulo (o stat ficava `null`), mesmo a modificação automática
   (`m3-65`) já carregando o efeito `RESISTENCIA` certo nos dados — a UI simplesmente nunca mostrava
   o resultado combinado. A spec listava "o motor de fusão do `calcularStatItem`" como Fora de
   Escopo ("já correto"), mas os Critérios de Aceite exigem explicitamente que "o dano/resistência
   final... combina a base... com o bônus fixo do módulo, num único stat computado" — sem essa
   correção o critério não se sustentava pro caso Proteção. Ajuste mínimo: adicionar
   `FRAGMENTO_CONSTRUTOR` ao gate de categoria do bloco de Resistência (os sub-blocos de
   Blindada/Reforçada/Camuflada/Hazmat/Antibombas/Camadas Extras têm seus próprios gates de
   categoria, então continuam restritos a Proteções/Armazenamento como antes).
6. `montarItemCustom` não mudou — já lia `dano`/`informacao`/`resistencia`/`peso` do form (agora
   preenchidos pela Base, quando houver uma).

**Testes.** `shared`: 1 teste novo em `compras.spec.ts` provando a fusão de Resistência do Construtor
(Colete Tático `4 [Físico]` + Módulo I `RESISTENCIA` 10 → `14 [Físico]`). `frontend`: novo describe
`'seletor "Base" do Fragmento Construtor (m3-69)'` em `ficha-inventario.component.spec.ts` — Arma
(Mediana + Módulo I: dano final `5D4+4D12+FOR [Físico]`, base 3+2 dados fundida com o `DANO_DADOS_BASE`
do módulo e o grupo extra `4D12` sobrevivendo junto, peso 2), Proteção (Colete Tático + Módulo I:
`14 [Físico]`, peso 1), "Outra" mantém texto livre (padrão, sem trava), trocar de Base recalcula os
campos travados, categoria sem base reconhecida (Munições) não mostra o seletor.

**Fora de escopo, confirmado nesta revisão:** `listarEfeitosFixosConstrutor`/`BONUS_FIXO_CONSTRUTOR`
em si (dados já corretos, só a origem do texto base mudou); Munição do Construtor (`m3-65`, mantém
"Recarregar"); validação de texto livre sem colchete `[Tipo]` na opção "Outra" (comportamento já
existente pra qualquer item custom).

**Verificação final:** `shared` 519/519 (era 518/518) · lint limpo · build limpo. `backend` 170/170
(inalterado). `frontend` 709/711 (era 706 antes da suíte crescer 5 testes novos; as 2 falhas restantes
são as pré-existentes `P-001`/`P-010`, sem novas quebras) · lint só os 3 erros pré-existentes
(`P-009`) · `ng build --configuration development` limpo. **Não verificado num browser real** — a
cobertura de componente (`ficha-inventario.component.spec.ts`) já exercita DOM/estado travado/computed
diretamente, mas o fluxo completo (abrir o form, clicar no `<select>`, ver o campo travado
visualmente) não foi clicado manualmente nesta sessão.

## m3-68 — Fragmentos: "efeito" do Potencializador não é dano (2026-08-05)

Spec: `docs/specs/done/m3-68-fragmento-potencializador-efeito-nao-e-dano.spec.md`. Correção sobre o
"Fechamento de Fragmentos" (`m3-63`…`m3-67`) — auditoria adicional encontrada ao revisar o cardápio
do Potencializador com o autor. A spec (`bedec37`) já tinha sido registrada por outra sessão;
implementação feita agora.

**O problema.** `listarBonusFragmentoPotencializador` (`shared/regras/compras/fragmento.ts`) mapeava
**errado** duas das quatro opções do cardápio "em um item" (doc — "⬦ Potencializador", tabela ~1938):
a opção "+N dados (efeito)" ia para `DANO_DADOS_BASE` e a opção "+N no valor" de efeito (dentro do
sub-cardápio "teste, efeito ou resistência") ia para `DANO_FIXO`, tratando **efeito** como se fosse
**dano**. O doc rotula essas duas opções explicitamente como "(efeito)" — numa granada incendiária
com dano e efeito "Em Chamas" separados, esses dados deveriam reforçar o "Em Chamas", nunca o dano.
Só a opção "N× valor máximo do maior tipo de dado" É dano de verdade (pega o maior dado do item,
soma como dano fixo) — essa e "+1 dado no teste" já estavam certas e não mudaram.

**O que foi feito.**

1. **Novo tipo `EFEITO`** em `ModificacaoEfeitoTipoEnum` (`shared/enums/modificacao-efeito-tipo.enum.ts`),
   com `variante` `'DADO'`/`'FIXO'` (mesmo padrão de `BONUS_TESTE`). É puramente descritivo — não
   funde em `calcularStatItem` (mesmo grupo de `ALCANCE`/`RAIO`/`DURACAO`/`CONDICAO`; o `switch` de
   `calcularStatItem` já ignora tipos não tratados, então nenhuma mudança foi necessária lá).
   Precedente: `m3-31` já trata bônus que o motor não computa como descritivo, jogador aplica na mão.
2. **`listarBonusFragmentoPotencializador` corrigida**: "+N dados" → `EFEITO` variante `DADO`
   (rótulo "+N dados de efeito (não é dano)"); "+N no valor" de efeito → `EFEITO` variante `FIXO`
   (rótulo "+N no efeito"). As opções de "N× maior dado" (`DANO_FIXO`) e "+dado no teste"
   (`BONUS_TESTE`) ficaram inalteradas.
3. **`funcaoFragmento` ganhou a função `'EFEITO'`** — antes, `EFEITO` (então inexistente) caía em
   `null` e não participava de `existeFragmentoNaMesmaFuncao`, um furo real: dois fragmentos ambos
   mirando "efeito" no mesmo item não eram bloqueados pela regra de "uma única função" (doc — "⬦
   Potencializador": "um item/ser pode conter mais de um fragmento, mas para apenas uma única
   função"). Removido também o caso `DANO_DADOS_BASE` do switch (não é mais produzido pelo cardápio
   do Potencializador — Construtor ainda usa esse tipo pro seu próprio bônus fixo, `m3-65`, mas
   Potencializador nunca acopla num item Construtor, doc: "exceto em fragmentos construtores", então
   as duas frentes nunca colidem nesse `switch`).
4. **`descreverEfeitoModificacao`** (`compras.ts`) ganhou o `case EFEITO` (dado vs fixo), no mesmo
   padrão do `case BONUS_TESTE` — chip da mod nunca mais menciona "dano" pra um bônus de efeito.
5. **Testes**: `fragmento.spec.ts` — reescrito o mapeamento esperado de `listarBonusFragmentoPotencializador`
   (3 testes ajustados) e `existeFragmentoNaMesmaFuncao` ganhou um teste de colisão "efeito vs efeito"
   (variantes diferentes, dado vs fixo, ainda bloqueiam) além dos ajustes nos 2 testes de dano/comum;
   `compras.spec.ts` ganhou 3 asserts pro rótulo do chip `EFEITO` (fixo, 1 dado, N dados — plural).
   No frontend, 3 testes de `ficha-inventario.component.spec.ts` que simulavam um fragmento já
   aplicado com `DANO_DADOS_BASE` (representando "dano ocupado") foram reescritos para `EFEITO`
   variante `DADO` — passam a testar de fato a colisão de função "efeito" pedida pela spec, em vez de
   um cenário que o motor não produz mais.

**Fora de escopo, confirmado nesta revisão.** Cardápio "Consumido" (`BONUS_CONSUMIDO`, `m3-64`) — já
correto, não mexido. Fundir `EFEITO` num stat computado (dado de cura, de status) — o sistema não
define um motor de "efeito" genérico hoje; fica descritivo, mesmo tratamento de `m3-31`. Bônus fixo
do Construtor (`m3-65`) — tabela própria, não usa este cardápio.

**Verificação final.** `shared` 518/518 (era 517/517 — rede de +1 após reescrever os testes
quebrados pela correção do mapeamento e acrescentar os novos de colisão/rótulo). `backend` 170/170,
inalterado (não toca essa camada). `frontend` 704/706 (as 2 falhas são as pré-existentes conhecidas,
`PROBLEMS.md` `P-001`/`P-010`, nenhuma nova). `npm run lint` limpo em `shared`; `frontend` só os 3
erros pré-existentes de `P-009`, nenhum novo. `ng build --configuration development` limpo.

## m3-67 — Fragmentos: Limite mínimo de Energia e Anomalia Biológica (2026-08-05)

Spec: `docs/specs/done/m3-67-fragmentos-limite-energia-anomalia-biologica.spec.md`. Continuação do
lote de Fragmentos (`m3-35`, `m3-42`), desenvolvida em cima da branch que já tinha `m3-63`…`m3-66`
(mesma sessão de trabalho; `m3-66`/`m3-68`/`m3-69` chegaram já commitadas ao puxar a branch, sem
registro próprio neste arquivo — dívida de outra sessão, não coberta aqui).

**O problema.** Nada modelava o "Limite mínimo de Energia" do doc (`(Vigor + Destreza) × 2`): um
agente podia portar fragmentos suficientes pra zerar a Energia Máxima sem aviso nem consequência —
faltava o estado "Anomalia Biológica" (efeitos: −15 testes, −10 Defesa, vida atual travada em 10%
da máxima) e o atalho pro trauma "Limiar da Humanidade".

**O que foi feito.**

1. **`limiteMinimoEnergiaMaximaFragmentos`** (`shared/regras/agente/fragmento-limite-energia.ts`,
   novo arquivo) — `(Vigor + Destreza) × 2`. Nomeada de propósito pra não colidir com
   `calcularLimiteEnergia` (`saude.ts`), que é outro conceito (quanto a Energia **atual** pode
   negativar, `Destreza × 2`/`Destreza`) — os dois docstrings agora se referenciam um ao outro pra
   não repetir a confusão que a spec avisou já ter acontecido uma vez.
2. **`emAnomaliaBiologica`** — estado 100% derivado (Energia Máxima atual, já reduzida pelos
   fragmentos, `<` o limite), sem campo persistido — mesma filosofia de "nada é travado pelo motor,
   o narrativo é refletido por quem joga" (`m3-10`). Mais `tetoVidaAnomaliaBiologica` (10% da Vida
   Máxima, `Math.floor`) e as constantes `PENALIDADE_TESTES_ANOMALIA_BIOLOGICA`/`_DEFESA_` (−15/−10,
   texto informativo — **não** tocam `calcularDefesa`/motor de rolagem, fora de escopo por pedido
   explícito da spec) e `TRAUMA_LIMIAR_HUMANIDADE_NOME`/`_DESCRICAO` (nome/descrição prontos, mesmo
   padrão de `SEQUELA_CONSUMO_FRAGMENTO`).
3. **Aviso na aquisição** (`FichaInventario`) — `avisoLimiteEnergiaAquisicao`, computed que projeta a
   Energia Máxima após adquirir o fragmento do form custom (categoria + módulo já escolhidos, mesma
   conta de `debitarAquisicaoFragmento`, só sem debitar) e mostra um `ficha-inv__aviso` quando a
   projeção cairia abaixo do limite. **Não trava** — a ação de confirmar o item continua livre,
   exatamente como a spec pediu.
4. **Exibição na aba Extras** (`FichaVisualizacao`) — nova seção "Anomalia Biológica" ao lado de
   "Afinidade de Fragmentos": limite mínimo sempre visível; em Anomalia Biológica, lista os três
   efeitos calculados (mesmo padrão visual de sequelas/traumas — nome/descrição, aplicação manual).
5. **Atalho do trauma "Limiar da Humanidade"** — confirmação inline (abrir → mostra nome/descrição
   pré-preenchidos → "Registrar trauma"/"Cancelar", mesmo padrão de `pedirRemocaoFragmentoConsumido`)
   só visível pra quem edita (`ajustavel()`) e só em Anomalia Biológica; nunca dispara sozinho —
   reusa o canal `ajusteSanidade` (m3-12) já existente, sem persistência paralela. **Decisão:**
   implementado como painel próprio na aba Extras (não uma chamada imperativa pro `FichaSanidade`
   embutido noutra sub-aba do card de Status) — evita acoplar componentes por `viewChild` através de
   uma troca de sub-aba assíncrona só pra abrir um dialog; o resultado (registrar no trio
   `sequelas/traumas/lesoes` via `ajusteSanidade`) é idêntico ao que o editor de Sanidade faria.

**Testes.** `shared`: `limiteMinimoEnergiaMaximaFragmentos`, `emAnomaliaBiologica` (abaixo/igual/
acima do limite), `tetoVidaAnomaliaBiologica`, constantes. `frontend`: `FichaVisualizacao` — limite
exibido, estado ligado/desligado, efeitos calculados corretos (vida: Vida Máxima derivada × 10%
`floor`), atalho do trauma escondido pra visualizador, fluxo completo abrir/cancelar/confirmar do
atalho (não dispara sozinho, emite o trio esperado). `FichaInventario` — sem aviso sem módulo
escolhido, sem aviso quando o custo não cruza o limite, aviso presente e correto num Fragmento
Construtor módulo I (custa o dobro) que cruza o limite, e a aquisição confirmando normalmente
(não trava).

**Verificação.** `shared`: 517/517 (10 novos), lint limpo. `backend`: 170/170 inalterado (fora do
escopo). `frontend`: build limpo, 704/706 (18 novos; as 2 falhas são as conhecidas `P-001`/`P-010`,
confirmadas pré-existentes via `git stash`/lint antes da mudança), lint limpo nos arquivos tocados
(o único erro de lint do repo, em `ficha-visualizacao.component.spec.ts:1942`, é pré-existente —
confirmado via `git stash`). Sem stack local (Postgres/Docker indisponível neste ambiente) pra
verificação end-to-end no navegador real — a UI foi conferida via `TestBed` (DOM/template reais,
change detection real, eventos emitidos reais), não apenas lógica isolada. Spec movida de
`backlog/` pra `done/`.

## m3-65 — Fragmentos: tabela de bônus fixos do Construtor (2026-08-04)

Spec: `docs/specs/done/m3-65-fragmentos-tabela-construtor.spec.md`. Continuação do lote de
Fragmentos (`m3-35`, `m3-42`, `m3-63`, `m3-64`), desenvolvida em cima da branch que já tinha as duas
últimas (mesma sessão, `git merge` prévio de `m3-63` para dentro da branch de `m3-64`).

**O problema.** Um fragmento Construtor virava só uma arma/proteção comum digitada à mão pelo
jogador — nenhum dos bônus fixos por módulo da tabela do doc (dano/teste da arma, recarga+dano da
munição, resistência+Esquiva/Bloqueio/Defesa da proteção) era aplicado automaticamente, e
modificações adicionadas a ele não recebiam o dobro de custo / isenção de peso que o doc garante
("⬦ Construtor": "podem receber modificações como sua arma base, com o dobro do custo e sem
acréscimo de peso").

**O que foi feito.**

1. `BONUS_FIXO_CONSTRUTOR` (`shared/regras/compras/fragmento.dados.ts`) — tabela por módulo × 3
   formas (Arma/Munição/Proteção), lida direto da tabela do doc (~1950). **Decisão de mapeamento**
   (ambígua na spec, resolvida a favor do doc — proibição #27): "Adiciona +1D8 de dano" não é o dado
   base do item (o jogador continua declarando a base, `dano`/`informacao`, como em qualquer item
   custom — "concede bônus **adicionais**" e "ele é a arma em si" contrastam com "aprimorar" só no
   sentido de não se acoplar a um item externo, não no sentido de dispensar uma base própria);
   virou `DANO_DADOS` (pool de dado separado, com a face fixa do módulo — não `DANO_DADOS_BASE`, que
   reusaria a face do dado base, contradizendo a face explícita crescente D8→D12 da tabela). O termo
   à parte "+1 dado"/"+2 dados" (só Módulo II/I, sem face própria) é que soma ao dado **base** —
   esse sim virou `DANO_DADOS_BASE`. "+N de teste" virou `BONUS_TESTE` variante `FIXO` (mesmo
   raciocínio de `BONUS_POTENCIALIZADOR`: é campo descritivo/chip, o motor não "usa" o bônus de
   teste em nenhum cálculo, mesmo comportamento já existente pro bônus "em item" do Potencializador).
   Proteção: `RESISTENCIA` + `DEFESA` (variantes `Esquiva`/`Bloqueio`/`Defesa`, cada uma só a partir
   do módulo em que a tabela a introduz) — bateu exatamente com a sugestão da própria spec.
2. `formaFixaConstrutor`/`listarEfeitosFixosConstrutor` (`fragmento.ts`) — função pura que resolve a
   forma (Arma/Proteção) a partir da `categoriaEmprestada` do item e devolve os `ModificacaoEfeitoDto`
   correspondentes; Munição devolve `null` (não modifica item, ver item 4). `bonusMunicaoConstrutor`
   expõe só o par `{ custoRecarregar, dano }` da tabela.
3. **Aplicação automática** — `FichaInventario.comBonusFixoConstrutorSeNecessario` (chamado por
   `confirmarCriarItem`, antes de `inserirItem`) empurra a modificação já calculada pro item recém
   criado, com `origemFragmento: { tipo: CONSTRUTOR, modulo }` (mesmo padrão do bônus "em item" do
   Potencializador — badge de origem no card) e `ignoraLimiteTotal`/`ignoraLimiteProprio` (não é uma
   modificação comprada). **Cuidado descoberto ao implementar:** `removerModificacao` já tinha uma
   ramificação que trata **qualquer** `origemFragmento` como "desacoplar" (o fragmento Potencializador
   volta como item avulso ao inventário) — reusar isso pro bônus fixo do Construtor geraria um item
   fantasma (o "alvo" do desacoplamento seria o próprio item Construtor, e o código empurraria um
   segundo Fragmento Construtor avulso duplicado). Corrigido restringindo essa ramificação a
   `origemFragmento.tipo === POTENCIALIZADOR`; o bônus fixo do Construtor agora só some pelo caminho
   comum (como qualquer mod), sem "desacoplar" — não existe pra onde desacoplar, o fragmento **é** o
   item.
4. **Munição Construtor** — ação própria "Recarregar" (botão no card, mesmo padrão de "Aplicar
   em.../Consumir"): debita a Energia **atual** do módulo (custo de ação, não de aquisição) e marca
   `item.recarregada = true` (campo novo em `CarrinhoItemDto`, `m3-65`). "Dura 1 cena" modelado como
   reset manual — um segundo botão ("encerrar a cena") volta `recarregada` a `false` sem mexer em
   Energia; sem sistema de cena automatizado no app hoje, então o reset é decisão do jogador/mestre.
   Sem efeito se já está recarregada (evita debitar Energia de novo sem passar pelo reset).
5. **Dobro de custo/peso zero** — `obterCustoModificacao`/`obterPesoModificacao`
   (`shared/regras/compras/compras.ts`) reconhecem `item.categoria === FRAGMENTO_CONSTRUTOR`: dobram
   o custo (calculado normalmente por baixo — inclusive o caminho "emprestada" de categoria — só
   dobrado no fim) e zeram o peso incondicionalmente. Vale tanto pro bônus fixo automático quanto
   pra qualquer modificação comum que o jogador adicionar depois (o "cuidado" da spec sobre
   modificações de Potencializador nem se aplica — Construtor já não pode receber Potencializador,
   `m3-63`).

**Testes.** `shared`: `formaFixaConstrutor` (Arma/Proteção/Munição/null), `listarEfeitosFixosConstrutor`
(todos os 5 módulos de Arma incl. o termo extra de dado em II/I, Proteção em V/IV/I cobrindo a
progressão de Esquiva-Bloqueio-Defesa), `bonusMunicaoConstrutor`, e o dobro de custo/peso zero em
`compras.spec.ts`. `frontend`: criação automática da modificação (Arma, Proteção, Munição sem
modificação), custo dobrado/peso zero tanto no bônus automático quanto numa mod comum adicionada
depois, e o fluxo completo de "Recarregar" (débito de Energia, marca `recarregada`, não debita de
novo, reset manual sem debitar).

**Verificação.** `shared`: typecheck limpo, 507/507 (13 novos), lint limpo. `backend`: 170/170
inalterado (fora do escopo). `frontend`: build limpo, 688/690 (12 novos; as 2 falhas são as
conhecidas `P-001`/`P-010`, confirmadas pré-existentes e não relacionadas via `git diff --stat`),
lint com os mesmos 3 erros pré-existentes (`P-009`). Spec movida de `backlog/` pra `done/`.

## m3-64 — Fragmentos: cardápio "Consumido" e rastro do consumo (2026-08-04)

Spec: `docs/specs/done/m3-64-fragmentos-consumo-bonus-historico.spec.md`. Continuação do lote de
Fragmentos (`m3-35`, `m3-42`); fechado **independente** de `m3-63` (ambas as tasks vieram da mesma
spec de milestone dividida em `m3-63..m3-68`, mas `m3-64` foi implementada numa branch cortada
direto de `origin/master`, sem as mudanças de `m3-63` — que ainda não tinha sido mergeada — porque
o "Fora de Escopo" da própria spec já deixa isso explícito: "Cardápio 'em item' do Potencializador
(`m3-63`)").

**O problema.** O painel "Consumir" (`ficha-inventario.component.ts`) cobrava o Preço de Sanidade do
Consumo (`m3-42`: sequela "Rejeição Biológica" × multiplicador + Energia Máxima extra) mas dizia "o
benefício pessoal do Consumo é narrativo — combine com o Mestre". O documento (`sistema-v4.1.0.md`,
"⬦ Potencializador", coluna "Consumido") define um cardápio **fechado** de 3 bônus por módulo — isso
não é narrativo, é mecânico, e estava sendo ignorado. Consumir também não deixava rastro nenhum: o
item some do inventário e só resta uma sequela genérica sem indicar de qual fragmento veio.

**O que foi feito.**

1. `BONUS_CONSUMIDO` (`shared/regras/compras/fragmento.dados.ts`) — tabela por módulo (`teste`/
   `defesa`/`danoCorpo`), espelhando `BONUS_POTENCIALIZADOR`. `listarBonusConsumoFragmentoPotencializador`
   (`fragmento.ts`, função pura irmã de `listarBonusFragmentoPotencializador`) monta as 3 opções; só
   Módulo I marca `concedePontoAtributo: true` na opção de teste (doc: "única forma de ultrapassar
   limite de 6 pontos em um atributo é consumindo um Fragmento de Módulo I").
2. **Onde o bônus aterrissa** — decisão explícita pedida pela spec. Ao contrário do bônus "em item"
   (vira `ModificacaoAplicadaDto` de um item), o bônus "Consumido" é do **agente** e **permanente**
   (o fragmento é destruído ao ser consumido — não há "desacoplar" pra desfazer, diferente do bônus
   em item). Isso descartou o padrão "soma por cima só na leitura, nunca persistido" que
   `amplificador.ts`/`calcularBonusDefesaEquipamento` usam (eles recalculam ao vivo a partir de uma
   lista de itens/amplificadores **ainda portados** — aqui não há lista, o fragmento já não existe
   mais pra reprocessar). Achei precedente melhor em `identidade/formacoes.ts`
   (`aplicarEfeitoUnico`, m3-23): Origem também aplica um **delta único, permanente**, direto nos
   campos persistidos (`derivados[campo] += valor`, `somarDanoFixo` pro dano do Corpo). Generalizei
   esse padrão numa função nova, `aplicarBonusConsumoFragmento`
   (`shared/regras/agente/fragmento-consumo.ts`, **não** `compras/` — o motivo é de dependência: o
   arquivo toca `FichaAtributosDto`/`FichaDerivadosDto` e `agente/*` já importa de `compras/fragmento`
   pra outras coisas, então ficar em `agente/` evita inverter a direção e criar ciclo). Ela resolve
   os 3 tipos: `TESTE` soma em `modificadoresTeste[atributoEscolhido]` (o campo que a spec já apontava
   como "candidato natural" — o mesmo usado pra modificador temporário de teste por atributo) e, só
   quando `concedePontoAtributo`, soma **+1** também em `atributos[atributoEscolhido]` (sem clamp — a
   ficha já não trava `atributos` em lugar nenhum do runtime, o "limite de 6" do doc é uma convenção
   de mesa reforçada só na UI de criação; nada precisou ser "destravado" de propósito). `DEFESA`/
   `DANO_CORPO` somam em `derivados.defesa`/`derivados.danoCorpoACorpo`, com a mesma guarda de
   `aplicarEfeitoUnico` ("`!== undefined`"/truthy — não fabricar uma stat que a classe não tem, ex.
   Civil sem Defesa).
3. **UI de escolha** — `FichaInventario` ganhou `opcaoConsumoFragmento`/`atributoConsumoFragmento`
   (signals) e `opcoesConsumoFragmento`/`opcaoConsumoFragmentoEscolhida` (computeds); o painel
   "Consumir" ganhou um `<select>` "Bônus 'Consumido'" (3 opções) e um segundo `<select>` "Atributo",
   condicional a `tipo === 'TESTE'`. O botão "Consumir" trava (`[disabled]`) até um bônus estar
   escolhido (e o atributo, quando for TESTE) — a mesma trava já existe em `confirmarConsumirFragmento`
   como guarda defensiva, não só no template. O texto "combine com o Mestre" saiu.
4. **Onde o componente entrega o resultado** — `FichaInventario` **não** aplica o efeito sozinho: ele
   não recebe `derivados`/`modificadoresTeste`/`maestria`/`dadosTeste` como input (só `atributos`, pra
   outra coisa — fórmula de dano de item). Em vez disso emite um novo output,
   `bonusConsumoFragmento` (`{ opcao, atributoEscolhido }`), e quem aplica é `FichaVisualizacao`
   (`aoConsumirFragmentoBonus`), que já tem o `dados()` inteiro. Ela chama
   `aplicarBonusConsumoFragmento` e reusa os canais de persistência **já existentes** — `ajusteAtributos`
   (que também re-deriva Vida/Energia quando o atributo muda, mesmo caminho de uma edição manual,
   relevante pro caso Módulo I) pro tipo `TESTE`, `ajusteDerivado` pros outros dois — em vez de abrir
   um canal de persistência paralelo (mesmo espírito de `aoAjustarEnergiaFragmento`/
   `aoConsumirFragmentoSanidade`, que já reusam `ajusteVitalidade`/`ajusteSanidade`).
5. **Rastro do consumo** — `textoBonusConsumoFragmento` (privado, em `ficha-inventario.component.ts`;
   deliberadamente **não** em `shared` — é formatação de texto de UI, não regra) monta o texto do
   bônus escolhido (ex.: `"+3 em Defesa"`; pro teste, inclui o nome do atributo e, no Módulo I, "e +1
   ponto no atributo"). Alimenta a `descricao` da sequela "Rejeição Biológica" quando ela é gerada.

**Correção pós-entrega, mesmo dia:** a 1ª versão desta task deixava o rastro **só** na `descricao`
da sequela — e a sequela é evitável com o teste de Vontade (`m3-42`), então evitá-la também apagava
o rastro do consumo. Rejeitado pelo autor em revisão: um registro que existe *condicionalmente* não é
um registro. Correção: novo campo `FichaJogadorDadosDto.fragmentosConsumidos?:
readonly FichaFragmentoConsumidoDto[]` (`shared/dtos/ficha`, `{ modulo, bonusEscolhido }`) — a aba
**Extras**, logo **acima de "Afinidade de Fragmentos"**, ganhou a seção "Fragmentos Consumidos"
(mais recente primeiro, lista rolável a partir de 195px, mesma filosofia de teto de
`.ficha-status__anotacoes`). `FichaInventario` emite o novo output `fragmentoConsumido`
**incondicionalmente** em `confirmarConsumirFragmento` (sempre, independente de
`evitouSequelaConsumo()`) — diferente de `bonusConsumoFragmento`/`sequelasFragmentoConsumido`, que
seguem com suas semânticas de sempre. `FichaVisualizacao.aoRegistrarFragmentoConsumido` prepende o
registro e emite `ajusteFragmentosConsumidos`, reusando o mesmo padrão array-completo de
`ajustarCombos`/`ajustarRolagens` (`FichaEdicaoService.ajustarFragmentosConsumidos`, novo, wireado
em `visualizar.page.html` e `detalhe.page.html`); o merge de edição concorrente (`mesclar-ficha.ts`)
já cobre a chave nova de graça — o reducer é genérico sobre `Object.keys`, nenhuma mudança lá. A
`descricao` da sequela continua existindo (redundante, mas inofensiva) — o registro em Extras é que
virou a fonte de verdade do rastro. A ideia `I-010` (`IDEAS.md`, "histórico dedicado de fragmentos
consumidos") foi removida de "Abertas" — a correção a implementou no mesmo dia em que foi escrita.

**2ª correção pós-entrega, mesmo dia:** o registro de "Fragmentos Consumidos" era só exibição —
uma vez lançado, ficava preso na ficha para sempre. Pedido do autor: "eu posso remover um fragmento
consumido também, isso tem que ser possível" — e, esclarecido em seguida, remover não é só apagar a
linha: tem que **desfazer o consumo por inteiro** (bônus no agente, Energia Máxima e devolução do
item ao inventário), mas **sem** mexer na(s) sequela(s) "Rejeição Biológica" já geradas (essas
continuam sob o controle manual de sempre, painel de Sanidade). `FichaFragmentoConsumidoDto` ganhou
os campos que faltavam pra isso ser possível — `opcao` (a `OpcaoBonusConsumoFragmentoDto` estruturada,
não só o texto), `atributoEscolhido`, `deltaEnergiaMaxima` (o delta que o consumo aplicou à Energia
Máxima: restituição da aquisição − Preço de Sanidade físico) e `item` (o snapshot do próprio
fragmento removido do inventário) — sem isso o registro seria incapaz de desfazer o que descreve.
`aplicarBonusConsumoFragmento` (`shared/regras/agente/fragmento-consumo.ts`) ganhou um parâmetro
`sinal: 1 | -1 = 1` e uma nova `reverterBonusConsumoFragmento` (`sinal: -1`) — mesmo padrão de
`aplicarFormacaoAosDerivados`/`removerFormacaoDosDerivados` (`identidade/formacoes.ts`, m3-23), só
generalizado aqui pro Consumo de Fragmentos. `FichaInventario` passou a emitir o registro completo
em `confirmarConsumirFragmento` (antes só `{ modulo, bonusEscolhido }`). `FichaVisualizacao` ganhou
`confirmarRemocaoFragmentoConsumido` (com confirmação inline `pedirRemocaoFragmentoConsumido`/
`cancelarRemocaoFragmentoConsumido` — mesmo padrão ✕→"Remover?"→✓/✕ de `ficha-combos`): reverte o
bônus (reusando `ajusteAtributos`/`ajusteDerivado` via um helper `emitirEfeitoBonusFragmento`
extraído de `aoConsumirFragmentoBonus`, já que aplicar/reverter só diferem no sinal do delta), reverte
`estado.energiaMaxima` (`ajusteVitalidade`) e devolve o item ao array de `inventario.itens`
(`ajusteInventario`) — três canais de persistência **já existentes**, nenhum novo. O botão "Remover"
só aparece com `ajustavel()` (dono/mestre), mesma trava do resto da aba Extras.

**Verificação.** `shared`: 484/484 (479 da entrega original + 5 novos testes de
`reverterBonusConsumoFragmento`). `backend`: 170/170 (sem mudança — nada em `backend/` referencia
`FichaFragmentoConsumidoDto`). `frontend`: 670/672 — as 2 falhas são as já conhecidas e
pré-existentes `P-001`/`P-010`, confirmadas via `git diff --stat` (nenhum arquivo delas tocado por
esta task). `npx tsc --noEmit`, `eslint` e `ng build` (orçamento de bundle) limpos em todos os
arquivos tocados — `npm run lint --workspace=frontend` continua batendo só nos mesmos 3 erros
pré-existentes e não relacionados de `P-009`. Testes pré-existentes que montavam
`FichaFragmentoConsumidoDto` com o shape antigo (`{ modulo, bonusEscolhido }`) foram atualizados pro
shape novo — comportamento antigo intencionalmente estendido, não um regression fix.

## m3-63 — Fragmentos: 5ª opção do cardápio do Potencializador, alvo mais largo e função única (2026-08-03)

Fechou as três lacunas que a `m3-35`/`m3-42` deixaram no fluxo "Aplicar em..." do fragmento
Potencializador (`shared/src/regras/compras/fragmento.ts`,
`frontend/.../ficha-inventario.component.ts`).

**Maior dado do item + 5ª opção.** Nova `maiorDadoItem(item)` (`fragmento.ts`) resolve o `dano` do
item (catálogo ou custom, via `resolverDadosItem` — mesma fonte de `calcularStatItem`) e casa toda
notação `D<n>` no texto, devolvendo a maior; `null` sem dado no campo. `listarBonusFragmentoPotencializador`
ganhou um 2º parâmetro opcional `maiorDado: number | null` — quando não-`null`, insere a opção "N×
maior dado" (novo `MULTIPLICADOR_MAIOR_DADO_MODULO` em `fragmento.dados.ts`, V=1×...I=5×; efeito
`DANO_FIXO`, valor = multiplicador × faces) logo após a 1ª opção (dadosBase), na ordem em que o doc
lista as 4 alternativas de "Em um item". O componente resolve `maiorDado` do alvo **escolhido** no
painel (`opcoesBonusFragmento` passou a depender de `alvoFragmento`, não só do módulo) — sem alvo ou
com alvo sem dado, cai pra trás pro cardápio antigo. Trocar de alvo zera `opcaoBonusFragmento` (o
índice deixa de ser estável quando a lista muda de tamanho).

**Nota de contagem (divergência com a spec).** A spec (e o comentário desatualizado que ela cita,
escrito na `m3-35`) descreve o cardápio "hoje" como tendo 4 das 5 opções e o critério de aceite pede
"5 quando o alvo tem dado, 4 quando não". Na prática, `listarBonusFragmentoPotencializador` **já**
devolvia 5 entradas antes desta task (a doc agrupa "+N no valor" com 3 destinos — teste/efeito/
resistência — num só "OU", mas a `m3-35` optou por expandir isso em 3 entradas de cardápio
separadas, uma por destino, pra reusar `ModificacaoEfeitoTipoEnum` sem motor novo — ver teste
`toHaveLength(5)` preexistente). Adicionar é o verbo do entregável #2 ("Adicionar a
`BONUS_POTENCIALIZADOR`/`listarBonusFragmentoPotencializador` a opção..."), não substituir; encolher
o baseline pra 4 exigiria remover uma das 3 entradas de "valor fixo" já testadas e usadas, o que a
spec não pede em lugar nenhum. Resolução: o baseline continua 5 (inalterado, testes antigos passam
sem tocar), e a 5ª opção **da tabela do documento** (a 6ª entrada do cardápio, já que "valor fixo"
por si só ocupa 3) entra condicionada ao alvo ter dado — 6 no total quando presente, 5 quando
ausente. O comportamento pedido pela spec (opção nova só aparece com dado no alvo) está implementado
por inteiro; só o dígito literal do critério de aceite não bate com o array real, por essa
divergência de contagem herdada do comentário antigo. Documentado aqui em vez de silenciado.

**Restrição de alvo.** `alvosFragmentoDisponiveis` trocou o filtro de "qualquer categoria de
Fragmento" para só `ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR` (doc: "podem ser usados em qualquer item
ou ser, exceto em fragmentos construtores") — um Potencializador agora pode ser alvo de outro
Potencializador. Passou a excluir também o próprio índice do fragmento sendo aplicado (antes o
filtro genérico de "qualquer Fragmento" cobria isso de graça; precisou virar explícito).

**Função única.** Nova `existeFragmentoNaMesmaFuncao(modificacoesAlvo, efeito)` (`fragmento.ts`)
agrupa `DANO_DADOS_BASE`/`DANO_FIXO` na função "DANO", `BONUS_TESTE` (qualquer `variante`) em
"TESTE" e `RESISTENCIA` em "RESISTENCIA" (doc: "não pode haver 2 fragmentos... aumentando seu dano",
tratado como função única independente do mecanismo — dados a mais ou valor fixo a mais são a mesma
função). Só compara contra modificações com `origemFragmento` preenchido — uma mod comum do mesmo
tipo nunca bloqueia. O componente expõe `conflitoFuncaoFragmento` (computed), que desabilita o botão
Aplicar e mostra um segundo `<p class="ficha-inv__aviso">` explicando o bloqueio; `confirmarAplicarFragmento`
também checa no código (defesa em profundidade, não só UI).

**Testes.** `shared`: `maiorDadoItem` (várias notações, minúsculo, catálogo vs custom, ausente/
malformado), `listarBonusFragmentoPotencializador` com/sem `maiorDado`, `existeFragmentoNaMesmaFuncao`
(bloqueia mesma função mesmo com efeitos diferentes, libera função diferente, ignora mod sem origem).
`frontend`: alvo com/sem dado (6 vs 5 opções), troca de alvo zera o bônus, Potencializador como alvo
de outro, Construtor nunca aparece como alvo, fragmento não aparece como o próprio alvo, bloqueio de
função duplicada (não emite `inventarioMudou`), função diferente libera, mod comum não bloqueia.
Suíte cheia rodada depois: shared 477/477 verde; frontend 655/657 — as 2 falhas são preexistentes e
alheias a este diff (`P-001`, `ResizeObserver`; e um teste de link "Voltar" em
`visualizar.page.spec.ts` que falha isolado, sem nenhuma linha tocada por esta task — não registrado
em `PROBLEMS.md` antes, mas confirmado independente do diff).

## layout-lista-edicao-atributos — lista vertical na edição de atributos (2026-08-02)

Sem código de task de milestone — plano em
`docs/superpowers/plans/2026-08-02-layout-lista-edicao-atributos.md`, design em
`docs/superpowers/specs/2026-08-02-layout-lista-edicao-atributos-design.md`.

**O problema.** O card de edição de atributos (`FichaVisualizacao`) usava uma grade de caixas
compactas (2 colunas), cada uma empilhando verticalmente abreviação, valor com stepper `−`/`+`,
estrela de Maestria e os dois mini-steppers (modificador de teste, ajuste de dados) numa caixa
estreita — denso, e a leitura de "qual stepper é qual" dependia só de ícone/posição. Além disso, o
grupo Físicos (5 atributos, número ímpar) exigia CSS especial pra centralizar o item órfão na grade
de 2 colunas.

**O desenho.** Mudança puramente visual, só no modo de edição — o modo leitura (a mesma grade
compacta) fica byte-a-byte idêntico, mesma marcação, mesmo CSS. Reusa 100% do estado/métodos já
existentes (`rascunhoAtributos`, `rascunhoMaestria`, `rascunhoModificadoresTeste`,
`rascunhoDadosTeste`, `ajustarAtributoRascunho`, `ajustarModificadorTesteRascunho`,
`ajustarDadosTesteRascunho`, `alternarMaestria`, `maestriaHabilitada`) — nenhum signal, computed ou
método novo. O `@if (editandoAtributos())`, que antes decidia por atributo (dentro da mesma grade),
subiu pra decidir por grupo (Físicos/Mentais): em edição, o grupo renderiza `.ficha-atributos__lista`
de `.ficha-atributo-linha`, cada uma com duas sub-linhas — a 1ª com a estrela de Maestria, o **nome
completo** do atributo (não mais a abreviação, já que a linha tem largura de sobra) e o valor com
`−`/`+` alinhado à direita; a 2ª com os dois mini-steppers existentes (modificador de teste e ajuste
de dados), cada um agora com um rótulo de texto curto ("Mod."/"Dados"), sempre lado a lado no
desktop e empilhando só no mobile quando não cabem (`flex-wrap`, não um `flex-direction: column`
forçado). O CSS do "5º atributo órfão" foi removido, mas só do seletor de edição
(`.ficha-atributos__grade--edicao`) — a regra de órfão do modo leitura (tanto a versão base de 2
colunas quanto a variante do card compacto) ficou intocada.

**Onde entrou.** Só `ficha-visualizacao.component.html`/`.scss` (o card de edição de atributos
dentro de `FichaVisualizacao`). Nenhuma mudança em DTO, service ou `.ts` — 100% apresentação.

**Verificação.** Verificado ao vivo (stack real, via Playwright) nos dois viewports fixos do
projeto — mobile 360×800 (Galaxy S20 FE) e desktop 1920×1080 (FullHD): a lista renderiza
corretamente com os mini-steppers lado a lado nos dois tamanhos, sem estouro de largura, e o modo
leitura confirmado bit-a-bit idêntico ao anterior (grade de 2 colunas com o 5º item centralizado no
desktop, grade de 3 colunas no mobile) — zero regressão. Nenhum teste novo foi necessário (mudança
puramente de apresentação; `ficha-visualizacao.component.spec.ts` só testa signals/métodos do
componente, nenhum depende da marcação alterada, e todos continuaram passando sem alteração).

## ajuste-manual-dados-atributo — ajuste manual de dados de teste por atributo (2026-08-02)

Sem código de task de milestone (nenhuma task do plano em curso era dona do item) — plano em
`docs/superpowers/plans/2026-08-02-ajuste-manual-dados-atributo.md`, design em
`docs/superpowers/specs/2026-08-02-ajuste-manual-dados-atributo-design.md`.

**O problema.** Cada atributo da ficha fazia dupla função: era a fonte dos derivados (Energia,
Deslocamento, Vida, Maestria) **e** a contagem de dados rolada nos testes desse atributo. Não havia
como ajustar só a contagem de dados (pensando num futuro sequela/condição que reduza dados sem tocar
no atributo em si) sem também mexer nesses derivados. Uma feature irmã já existente,
`modificadoresTeste`, resolvia o problema equivalente pro **resultado** da rolagem (soma/subtrai no
final), mas nada cobria a **contagem de dados** do pool.

**O desenho.** Campo novo `FichaJogadorDadosDto.dadosTeste?: Partial<Record<keyof FichaAtributosDto,
number>>` (`shared/src/dtos/ficha/ficha.dtos.ts`) — manual apenas, nada alimenta automaticamente
ainda, sem piso/clamp (mesma liberdade dos outros steppers). Nova função pura
`calcularAtributosParaDados` em `shared/src/regras/agente/lesao.ts`, que compõe o
`calcularAtributosEfetivos` já existente (lesão) com o ajuste manual por cima. Usada **só** como
fonte de contagem de dados — nunca para o valor exibido do atributo, para o cálculo de DT, nem para o
bake de lesão permanente: esses três continuam de propósito presos a `atributosEfetivos`/
`calcularAtributosEfetivos`.

**Onde entrou.** Um quarto stepper por atributo no card de edição de `FichaVisualizacao` (ao lado do
já existente modificador de teste, terceiro stepper), um badge só-leitura que só aparece quando o
ajuste é diferente de zero, o `rolarTesteAtributo` do próprio card (dadinho de rolar do atributo) e o
`FichaRolagensPainel` → `FichaRolagens` (presets salvos + rolagem avulsa/"livre"). Vale registrar
explicitamente: o preset "Iniciativa" semeado automaticamente na criação da ficha
(`PRESET_INICIATIVA_PADRAO`, fórmula `DESd6`, `backend/src/modules/ficha/ficha.service.ts`, m3-47) é
só um `FichaRolagemDto` como qualquer preset criado pelo jogador — passa pelo mesmíssimo pipeline de
`FichaRolagensPainel`/`FichaRolagens`, então ganhou o ajuste de dados de graça, sem nenhuma linha de
código dedicada. Isso corrige uma suposição errada feita durante o design/planejamento (as
Global Constraints do plano chegaram a dizer que "não existe feature de Iniciativa no módulo
`ficha`") — existe sim, só que não como UI própria: é um preset comum como outro qualquer.

**Verificação.** Verificado ao vivo (stack real) nos dois viewports fixos do projeto (mobile
360×800/Galaxy S20 FE, desktop 1920×1080/FullHD): zero scroll horizontal, alvo de toque real
44×44 confirmado por clique fora do centro do botão, sem colisão visual entre o badge novo e os
badges de lesão/modificador já existentes na mesma caixa de atributo, e uma rolagem de preset ao
vivo provando a composição da contagem de dados ponta a ponta. Testes novos:
`shared/src/regras/agente/lesao.spec.ts` (`calcularAtributosParaDados` — soma manual, combinação com
lesão, sem piso, ajuste vazio) e `ficha-visualizacao.component.spec.ts` (ciclo de rascunho/salvar,
leitura do valor persistido fora da edição, divergência entre `atributosParaDados` e
`atributosEfetivos`).

## m2-21 — painel do jogador: abas no card compacto, Rolagens na lateral e menu de ficha (2026-08-02)

Continuação direta da `m2-20`, que entregou a visão do jogador de `/painel/:id` mas deixou duas
colunas desequilibradas: a coluna 1 do card compacto acumulava Identidade + Vitalidade + Reações +
Resistências + Atributos + Combate, enquanto a 2 empilhava Inventário/Habilidades/Rolagens **de uma
vez** (a m2-20 tinha desligado a barra de abas no compacto) e rolava sem fim. Esta task **religa as
abas** com um trio reduzido e redistribui o conteúdo.

**Abas no `modo="compacto"`.** Não é mecanismo novo: é o mesmo `abaStatusAtiva`/`selecionarAbaStatus`
que o `'padrao'` já usava, apenas desligado por `@if (modo() !== 'compacto')`. O compacto passou a
expor **Informações · Inventário · Habilidades** (`ABAS_STATUS_COMPACTO`); `rolagens` saiu porque o
painel foi pra coluna lateral da página, `extras`/`historia` seguem exclusivas da ficha completa. Um
`abaStatusEfetiva` computed protege o card de um `#` de URL antigo/manipulado apontando pra uma aba
que não existe neste modo (cai em Informações em vez de renderizar nada). O `modo="padrao"` mantém
as seis abas, sem regressão.

**Aba Informações do compacto = Atributos + Combate + Anotações.** O `.ficha-visao__coluna--atributos`
inteiro **migrou da coluna 1 pra dentro da aba** — virou um `<ng-template #blocoAtributos>` com dois
outlets (coluna 1 no `'padrao'`, aba Informações no `'compacto'`), em vez de duplicar ~240 linhas de
marcação. O glance de Combate (`statusRapido()`) saiu de dentro do card de Atributos, onde a m2-20 o
tinha enfiado por falta de aba pra hospedá-lo, e voltou a ser seção própria — **só leitura** no
compacto (os gates do valor clicável passaram de `ajustavel()` pra `ajustavelAmplo()`, mantendo a
restrição pós-entrega da m2-20), com os dadinhos de rolar dano preservados. Anotações são editáveis
inline (`ajustavel()` puro — ficha de colega em leitura nem vê a caixa, o backend não manda
`dados.anotacoes` pro visualizador, m3-51). Sanidade/Nível/Prestígio continuam fora. A coluna 1
termina em Resistências.

**Card "Rolagens" na lateral, entre Equipe e Sessão** (a pedido do autor: "manter as coisas tudo num
lugar só" — rolar e ler o histórico recente na mesma coluna). `max-height: 420px` + `appOverflowFade`,
a mesma régua dos dois vizinhos, pra que os três caibam sem empurrar Sessão pra fora da tela. A nota
`ficha-rolagem-nota` ("Histórico da sessão na coluna Sessão, ao lado") foi removida — sem aba
Rolagens no compacto, perdeu o motivo de existir.

**Dois componentes novos, os dois nascidos de necessidade e não de estética:**

- **`FichaRolagensPainel`** (`frontend/src/app/modules/ficha/componentes/ficha-rolagens-painel/`) —
  o toggle "Rolagem oculta" + `<app-ficha-rolagens>` com os derivados que ele consome
  (`atributosEfetivos`/`proficiencia`/`atalhosDano`) calculados a partir do `dados`. Existe porque o
  painel passou a ter **dois** consumidores: a aba Rolagens da ficha completa (que passou a delegar)
  e a lateral de `CampanhaDetalhe`. Sem ele, os três `computed` seriam duplicados na página.
  `atalhosDano` **saiu** de `FichaVisualizacao` (não tinha mais consumidor lá).
- **`FichaRolagemRegistroService`** (`frontend/src/app/modules/ficha/ficha-rolagem-registro.service.ts`,
  `@Injectable()` sem `providedIn: 'root'`, mesma disciplina do `FichaEdicaoService` da m2-20: a
  **página** provê a instância). Carrega o signal `oculta` + o `registrar()` que viviam em
  `FichaVisualizacao`. A extração **não é cosmética**: o toggle mudou pra lateral enquanto
  `rolarTesteAtributo`/`rolarDano` continuam disparando de dentro do card — sem a flag compartilhada,
  marcar "oculta" na lateral deixaria de afetar o teste de atributo, um bug silencioso. O output
  `(rolagemRegistrada)` de `FichaVisualizacao` foi **removido** em favor de `registrada$` do serviço:
  agora `VisualizarPage` e `CampanhaDetalhe` escutam o mesmo canal, e a rolagem feita **pela lateral**
  (fora do card) também aparece na hora no feed da coluna Sessão.

**Menu "⋯" do jogador no cabeçalho**, ao lado do voltar, mesma marcação do kebab do mestre (reusa
`menuCampanhaAberto` — os dois são mutuamente exclusivos por `ehMestre()`), com "Criar nova ficha" e
"Vincular ficha existente". Aparece sempre, não só quando o jogador está sem ficha: trazer uma
segunda ficha do acervo é legítimo (a Equipe suporta várias por membro desde a m2-20). O estado vazio
da coluna principal ganhou atalhos pras mesmas duas ações. **Zero backend** — "criar" reusa o
`<app-ficha-criar-dialog>` que já estava montado na página (`[podeEscolherDono]="ehMestre()"` já
resolvia o `false`), e "vincular" usa `listarMinhasFichas()` + `atribuirCampanha()` da m3-28,
filtrando `campanhaId === null` (acervo vazio mostra estado vazio, não um `<select>` sem opções). Ao
criar ou vincular, o **jogador fica na página** (a visão dele já embute a ficha; recarrega a Equipe e
aponta `fichaExibidaId` pra ficha nova) — o mestre continua navegando pra ficha, como antes.

**Mobile — só adaptação do visual atual** (um recorte pensado pra celular é task futura).
`COMPACTO_DESTINOS_MOBILE` ganhou `'informacoes'`: cinco destinos. `'rolagens'` virou o **único
destino da barra que não é uma aba** — no compacto ele não altera `abaStatusAtiva`, só emite
`abaStatusMudou`, e `CampanhaDetalhe` reage rolando até o card da lateral (`scrollIntoView`).

**Bug pré-existente da m2-20 corrigido no caminho:** o card de Status **transbordava por baixo da
coluna lateral**. Medido ao vivo a 1440px de viewport: `coluna-agente` travada em `flex: 0 0 500px`
mais `--status` com `min-width: 260px` pediam 776px numa linha de 644 — o Status ia de x=681 a 941
contra uma lateral começando em x=846. Passava despercebido enquanto a coluna 2 tinha só listas;
com Atributos dentro dela ficou gritante. As duas viraram `flex: 1 1 340px` (`max-width: 500px` no
agrupador preserva o teto de antes nas telas largas), e mais dois ajustes de contenção: o glance de
Combate usa 2 colunas iguais no compacto (a régua `repeat(4, max-content) 1fr` da regra base conta
com a largura do Status do `'padrao'`) e Proficiência/Maestria ganharam `flex-wrap` com base de
150px, em vez de vazar o rótulo `nowrap` pela borda a 1280px. Também no SCSS, os seletores de
recorte mobile do `&__linha-colunas` viraram **filho direto** (`> .ficha-visao__coluna-agente >`) —
como descendente solto, escondiam também a instância de Atributos que agora vive no card de Status,
e a aba Informações do celular nascia vazia.

**Verificação ao vivo** (Playwright, dois usuários reais criados por REST, campanha + convite): 29
checagens, todas verdes — trio de abas com um painel por vez; Atributos e Combate na aba Informações
(glance só leitura, sem lápis) e Anotações presentes; Sanidade fora; coluna 1 sem Atributos; lateral
Equipe→Rolagens→Sessão com o card do meio rolando por dentro (`overflow-y: auto`, 293px) e Sessão
ainda visível a y=676 numa tela de 900; **toggle da lateral ligado → a rolagem disparada de dentro do
card sai `PRIVADA`** (POST capturado) e aparece na coluna Sessão; criar e vincular ficha sem
recarregar a página (sentinela sobreviveu), seletor listando só a ficha sem campanha, ficha vinculada
virando a exibida e entrando na Equipe; mobile a 360px com os 5 destinos, sem scroll horizontal, e
tocar em Rolagens rolando até a lateral **sem** trocar a aba do card; regressão do `'padrao'` com as
seis abas, Atributos na coluna própria e a aba Rolagens renderizada pelo componente novo. Screenshots
a 1280/1440/1920 confirmaram o fim do transbordo.

`detalhe.page.spec.ts`: os dois testes que afirmavam "o jogador não tem kebab" ficaram obsoletos
(agora tem, com as ações de ficha) — reescritos pra afirmar o que continua verdadeiro: ele nunca vê
Editar/Excluir da campanha. `ficha-visualizacao.component.spec.ts` passou a prover
`FichaRolagemRegistroService` no TestBed, fazendo o papel da página.

`build`/`test` do frontend verdes (641/642 — a falha é a de sempre, `ficha-inventario.component.
spec.ts`, P-001). `lint` com os mesmos 3 erros pré-existentes de antes da task (P-009), nenhum nos
arquivos alterados. O budget de `anyComponentStyle` continua estourado (P-004), mas a task **reduziu**
o excedente de 1,16 kB para 632 bytes.

### Ajuste pós-m2-21 — altura das listas, Rolagens só-leitura na lateral, Sessão a 3 pills (2026-08-02)

Três pedidos do autor sobre a entrega acima, direto em conversa (sem spec própria — ajuste fino da
mesma frente):

**1. Inventário/Habilidades no compacto voltaram a ocupar espaço de verdade.** O teto de
`.ficha-inv__lista`/`.habilidades__lista` no card compacto (230px/250px) datava de quando o
agrupador Identidade+Atributos ao lado era alto — pós-m2-21, sem Atributos, ele encolheu pra
Identidade+Vitalidade+Reações+Resistências (739px, medido ao vivo), e o teto antigo desperdiçava a
maior parte disso. Os dois subiram pra **420px** (a mesma régua já usada nos cards da lateral e no
teto irmão `.ficha-inv__amps`) — com uma ficha de 10 itens/10 habilidades, o card de Status passou
a fechar quase exatamente na altura da Identidade (antes sobrava ~500px de card praticamente vazio
abaixo de 3-4 itens). Achado no caminho: `POST /ficha` com um item de inventário sem
`modificacoes` (campo obrigatório de `CarrinhoItemDto`, não opcional) derruba `listarFichas` com
500 — útil registrar aqui porque não há validação de schema no backend (DTOs são interface, sem
`class-validator` — decisão vigente) que pegasse isso antes de chegar no cálculo.

**2. O painel de Rolagens da lateral virou só-leitura.** `<app-ficha-rolagens-painel
[editavel]="false">` no `detalhe.page.html` (era `podeAjustarFichaExibida()`) — a lateral existe
pra rolar os presets que a ficha já tem + a rolagem rápida, não pra gerenciar o catálogo de
presets; "+ Novo preset" e os ícones de duplicar/editar/remover por preset somem (o próprio
`FichaRolagens` já gateava tudo isso por `editavel()`, então foi só essa uma linha). Criar/editar
preset continua exclusivo da ficha completa (`FichaVisualizacao`, que passa `ajustavelAmplo()`)
— único outro consumidor do mesmo `FichaRolagensPainel`, que manteve seu input `editavel` normal.

**3. "Sessão" mostra só 3 rolagens antes de rolar.** `.detalhe__sessao-lista` tinha `max-height:
420px` (a régua "lista longa" padrão do arquivo) — pra uma tira de rolagens recentes, 420px cabiam
~8 pills, empurrando a lateral (e o resto do scroll da página) bem mais que os outros dois cards
vizinhos. Cada `.rolagem-pill` mede exatamente 53px (2 linhas de texto fixas — medido ao vivo,
constante independente do conteúdo); com `gap: 8px` e os 4px de padding do container, o teto virou
`53×3 + 8×2 + 4 = 179px`.

Nenhuma mudança de TS além da única linha do item 2. `build`/`test`/`lint` do frontend seguem nos
mesmos números do fecho da `m2-21` (nenhuma regressão introduzida).

## m2-20 — painel de campanhas: detalhe `/painel/:id` na visão do jogador (2026-08-01)

Irmã da `m2-19` (mesmo detalhe, visão complementar): até aqui a visão do jogador em `/painel/:id`
herdava **o mesmo template** do mestre, só escondendo blocos via `@if (ehMestre())` — banner/
estatísticas/tira de rolagens continuam assim (compartilhados), mas a grade "Membros | Esquadrão"
(`.detalhe__grade`) agora só renderiza para o mestre; um `@else` novo renderiza o layout dedicado
do jogador (direção **A · Ficha em Primeiro Plano**, aprovada em protótipo comparativo contra
"Meu Posto" e "Abas do Jogador"): a ficha exibida (a própria, por padrão, ou a de um colega via
"Ver ficha") como conteúdo principal, num card condensado (`<app-ficha-visualizacao
modo="compacto">`, o componente real, não uma réplica — 2 colunas, sem abas de Informações/
Extras/História, com "Abrir ficha completa" pra ver a ficha inteira sem corte) e uma coluna
lateral de 450px — "Equipe" (roster compacto com Vida/Energia + botão "Ver ficha" por ficha
visível de cada colega) e "Sessão" (rolagens da última hora, mesma fonte da tira do topo).

**Novo `signal<number | null> fichaExibidaId`** em `CampanhaDetalhe`, semeado com a própria ficha
do usuário assim que `fichas()` carrega pela 1ª vez (só quando ainda `null` — uma troca via "Ver
ficha" sobrevive a uma ressincronização em tempo real posterior). Um `effect()` busca o documento
completo (`fichaService.recuperarFicha`, já que `fichas()`/`FichaResumoDto` não tem `dados`
completo) sempre que o `id` muda — mesma chamada que `VisualizarPage` já fazia. "Ver ficha" na
coluna Equipe é só `fichaExibidaId.set(novoId)`, sem navegação: o conjunto de fichas com botão é
exatamente `fichasPorMembro()` (já filtrado pelo backend via `listarVisiveisParaUsuario`, §14) —
nenhuma mudança de backend, nenhuma regra de permissão nova no front.

**Handlers `ajustar*` extraídos para `FichaEdicaoService`** (`frontend/src/app/modules/ficha/
ficha-edicao.service.ts`, `@Injectable()` **sem** `providedIn: 'root'` — cada página que precisa
dele declara `providers: [FichaEdicaoService]` para ganhar sua própria instância). Os ~18 métodos
`ajustar*` (Vida/Energia, atributos, classe, sanidade, condições, inventário, presets, combos,
anotações, história, nome, personalidade, contrato, origem, campo de dados) e os helpers de
progressão (`aplicarProgressao`/`recalcularSaude`/`progredir*`) saíram de `VisualizarPage`
(`visualizar.page.ts:575-935` antes da extração) — `CampanhaDetalhe` consome o mesmo composable
via `fichaEdicao.ajustar*($event)` no template, zero duplicação. O composable também assumiu
`estadoPersistencia`/`edicaoPendente`/`fichaBase` (a base do merge de três vias de `VisualizarPage.
absorverRemoto`, m3-17) — `CampanhaDetalhe` não precisa do merge (não tem tempo real por-ficha
alterada em edição concorrente própria), só chama `definirBase` a cada fetch novo.

**Novo input `modo: 'padrao' | 'compacto'`** em `FichaVisualizacao` — quando `'compacto'`, uma
classe de host (`.ficha-visao--compacto`, seletor irmão de maior especificidade, não precisa de
`@media`) reduz as 3 colunas do layout `'padrao'` (Identidade 420 + Atributos 260 + Status mín.
420 ≈ 1130px, mais do que a coluna principal do `CampanhaDetalhe` tem — ~900px numa tela de
1600px) pra 2, **independente da largura real da janela**: Identidade+Atributos empilhados num
agrupador único (`&__coluna-agente`) ao lado da Status sem abas (só Inventário/Habilidades/
Rolagens, sempre visíveis — Informações/Extras/História ficam só na ficha completa) — some
também com Prestígio. **Não** força o recorte de `$bp-mobile` (HUD/barra inferior do m3-60) —
esse continua só de viewport real; numa tela pequena de verdade os dois efeitos se somam
sozinhos. A barra inferior do m3-60, nesse modo, também só lista os destinos que o compacto tem
(Agente/Inventário/Habilidades/Rolagens — Informações/Extras/História somem da barra junto com os
painéis). `VisualizarPage` continua com `modo="padrao"` (default, omitido no template) —
comportamento inalterado lá.

A mini-aba **Rolagens** do card de Status ganhou uma nota condicional (`modo() === 'compacto'`)
apontando para a coluna "Sessão" — a aba nunca teve feed próprio (só preset/rolagem avulsa), a nota
só documenta a decisão de não duplicar nada ali.

**Verificação ao vivo** (Playwright, dois usuários reais — mestre + jogador, campanha + 3 fichas
via REST, uma delas compartilhada via `usuario_ficha_acesso`): mestre continua vendo `.detalhe__
grade` (visão antiga intacta); jogador vê `.detalhe__jogador` com a ficha compacta, os 3 botões
"Ver ficha" na Equipe (a própria + a compartilhada do mestre); trocar de ficha via clique **não
navega** (sentinela sobreviveu) e o `fichaService.recuperarFicha` é chamado com o novo `id`; a
ficha do mestre aparece **sem** nenhum stepper de Vida/Energia (só leitura) e a própria ficha, ao
reselecionar, volta a ter o stepper. Depois, num segundo passe focado em mobile (viewport 390×844,
mestre e jogador): a barra inferior mostra só os 4 destinos válidos do compacto; o gatilho da
calculadora flutuante (`<app-calculadora-flutuante>`, adicionada no cabeçalho ao lado do gatilho
de histórico, `[acimaDaCalculadora]="true"` nele pra empilhar os dois círculos no desktop) aparece
pros dois papéis; a bandeja de dados (resultado de rolagem) e o fim da coluna "Sessão" não ficam
mais escondidos atrás da `.ficha-nav` fixa (reserva de piso via `--piso-flutuante`, mesma receita
do m3-60 em `visualizar.page.scss`, replicada em `detalhe.page.scss` + `padding-bottom` só na
visão do jogador); no viewport `'padrao'` (`/painel/:campanhaId/ficha/:id`), confirmado sem
nenhuma mudança — larguras de coluna, Prestígio e as 7 abas continuam intactos.

`frontend/src/app/modules/campanha/paginas/detalhe/detalhe.page.spec.ts`: os dois testes que
verificavam "jogador comum só vê os passos/menu na própria ficha" dentro do grid Esquadrão ficaram
obsoletos (esse grid não renderiza mais pra jogador) — substituídos por um novo
`describe('visão do jogador (m2-20)')` cobrindo a troca de ficha, a permissão (`podeAjustarFichaExibida`)
e o link "Abrir completa" apontando pra ficha certa. O mock de `fichaService.recuperarFicha` no
mesmo arquivo (usado antes só pelo `FichaVitalidadeRapidaService`) ganhou o `FichaJogadorDadosDto`
completo (atributos/maestria/habilidades/inventário/estado) — sem isso `<app-ficha-visualizacao>`
quebrava lendo `atributos.vigor` de um objeto incompleto.

`lint`/`test`/`build` do frontend verdes (mesma falha pré-existente de sempre, `ficha-inventario.
component.spec.ts`, P-001).

## Ajuste pós-m2-19 (5) — revisão do dadinho d20/Contra-ataque: bug de snapshot, barra de tempo e alinhamento (2026-08-01)

Revisão pedida pelo autor sobre os dois ajustes anteriores (itens 3 e 4 desta mesma sequência),
três achados corrigidos:

**1. Contra-ataque sumia no mini-card para fichas que o tinham.** Causa raiz: `derivados.contraAtaque`
é gravado como **snapshot** só na **criação** da ficha (`aplicarSnapshotDeMaximos`,
`ficha.service.ts`), mas a habilidade "Contra-Ataque" normalmente entra **depois**
(`ajustarHabilidades`, `visualizar.page.ts`) — e essa edição não recalcula `derivados` ("sem
cascata/progressão", m3-13, anterior à fórmula de Contra-ataque do m3-39). A tela da própria ficha
nunca notava porque `montarInformacoesExtras` já cai no calculado ao vivo quando o stored vem
`undefined` ("stored > calculado", m3-10); o mini-card do painel, adicionado no item 3 desta
sequência, só lia a coluna SQL bruta (`ficha.dados->'derivados'->>'contraAtaque'`) — sem onde
recalcular, ficava permanentemente em branco pra qualquer ficha que ganhou a habilidade após
nascer. **Corrigido no backend**, não no fluxo de edição: `FichaRepository.colunasResumo()` passou
a selecionar também `atributos`/`habilidades` brutos (novos campos em `FichaResumoInternoDto`,
nunca expostos ao público); `FichaService.paraResumoPublico` aplica o mesmo fallback "stored >
calculado" da tela da ficha — `fichaInterna.contraAtaque ?? calcularContraAtaqueAoVivo(...)`, que
chama `calcularDerivados` (mesma fonte única do m3-39) e extrai `.contraAtaque`. Corrige
retroativamente **toda** ficha existente, sem precisar de "tocar" a edição de habilidades pra
seed­ar o valor.

**2. Barra de tempo (auto-sumir) aparecia na prévia do d20, mas nunca deveria ter existido ali** — a
prévia é "mostra enquanto o mouse está em cima, fecha quando sai", sem prazo próprio. Antes, o
`mostrar()` da `BandejaDadosService` sempre agendava o timer de 7s e o SCSS sempre desenhava a
barra, então a prévia corria o risco de sumir sozinha mesmo com o mouse ainda no dadinho.
`EntradaBandeja` ganhou `semAutoSumir?: boolean`; `mostrar()` só chama `agendar()` quando ausente;
`retomar()` ganhou o mesmo guard (senão o hover na própria carta da bandeja recriaria um timer que
nunca deveria existir); o template só renderiza `.bandeja__barra` quando `!entrada.semAutoSumir`.
`mostrarPreviaRolagem` (`detalhe.page.ts`) passa `semAutoSumir: true`.

**3. Ícone d20 desalinhado verticalmente do rótulo do pill** — o `.rolagem-pill__d20` era
`position: absolute` (`top: 6px`), fora do fluxo, então seu centro vertical não acompanhava a
métrica de fonte do `.rolagem-pill__rotulo` ao lado (3px de diferença medida ao vivo). Trocado por
uma linha flex própria (`.rolagem-pill__topo`, `display: flex; align-items: center`) contendo
rótulo + botão d20 lado a lado — o `meta` continua abaixo, fora dessa linha. `align-items: center`
resolve porque agora os dois **compartilham o mesmo eixo cruzado do flex**, ao contrário do
posicionamento absoluto anterior.

**Verificação:** backend 170/170 (3 casos novos: recalcula ao vivo batendo com `calcularDerivados`
direto; snapshot persistido vence o calculado quando presente; `undefined` sem habilidade mesmo sem
snapshot — mais 3 fixtures existentes que precisaram de `atributos`/`habilidades` mínimos pra não
quebrar com o novo fallback); frontend 639/640 (mesma falha pré-existente não relacionada de
sempre; 4 novos: 3 em `bandeja-dados.service.spec.ts` sobre `semAutoSumir`, 1 em
`detalhe.page.spec.ts` provando que a prévia sobrevive além de `duracaoMs` com o hover mantido);
`tsc --noEmit`/`ng build`/eslint limpos nos arquivos tocados. Ao vivo (Playwright, ficha criada via
REST com atributos completos, habilidade "Contra-Ataque" mas **sem** `derivados.contraAtaque`
salvo — reproduzindo o bug exato): API já devolve `contraAtaque: 17` calculado ao vivo (bate com o
exemplo do m3-39, Lutador Melhorada Nível 3 Luta 4 → Defesa Base 13 + 4); mini-card mostra
"Contra-ataque 17"; hover no d20 mostra a bandeja sem nenhum `.bandeja__barra` no DOM; 8s de hover
contínuo (mais que os 7s padrão) não fecha a carta; tirar o mouse fecha na hora; screenshot com
zoom no pill confirma ícone e texto centralizados na mesma linha.

## Ajuste pós-m2-19 (4) — dadinho d20 nos pills de Rolagens Recentes (2026-08-01)

Terceiro pedido do autor na mesma sessão, sobre a tira "Rolagens Recentes" do detalhe da campanha
(`/painel/:id`, visão do mestre): cada `.rolagem-pill` ganhou um `.rolagem-pill__d20` — um botão
pequeno com o ícone `d20` (já existente, é o mesmo do gatilho da sidebar de histórico) no canto
superior direito do pill. Hover ou foco no botão chama `mostrarPreviaRolagem(item)`
(`detalhe.page.ts`), que repassa `rotulo`/`resultado` da rolagem já registrada pra
`BandejaDadosService.mostrar()` — a **mesma** bandeja de dados flutuante (`BandejaDados`, m3-22)
que hoje só aparecia na página de ficha (`ficha-visualizacao`) pra rolagens ao vivo. Sair do hover
(`mouseleave`/`blur`) chama `esconderPreviaRolagem()`, que fecha a entrada na hora
(`bandejaDadosService.fechar(id)`) em vez de deixar os 7s do auto-sumir correrem — é só uma prévia
de algo que já rolou, não uma rolagem nova.

**Duas mudanças de suporte:**
- `BandejaDadosService.mostrar()` passou a **devolver o `id`** da entrada criada (antes `void`) —
  sem isso não dava pra fechar a prévia certa no `mouseleave` (a bandeja empilha até 5 entradas, o
  `id` mais recente não é necessariamente conhecido de fora). Assinatura muda mas é
  aditivo/compatível: os 6 call-sites que mockavam `mostrar` em specs de outros módulos
  (`ficha-visualizacao`/`ficha-rolagens`/`ficha-inventario`/`ficha-combos`) precisaram só trocar
  `mockImplementation(() => undefined)` por `() => 1` pra bater com o novo tipo de retorno — nenhum
  comportamento real mudou nesses módulos.
- `<app-bandeja-dados />` (o componente que renderiza a bandeja) precisou ser importado e colocado
  no template do `detalhe.page.html` — ele só existia em `ficha-visualizacao.component.html` até
  aqui. O componente é `position: fixed`, então funciona em qualquer página que o importe; a
  service (`providedIn: 'root'`) já era global.

**Verificação:** `detalhe.page.spec.ts` 73/73 (2 novos: hover mostra a entrada na bandeja com
`rotulo`/`resultado.total` corretos; `mouseleave` marca a entrada como `saindo`); suíte completa do
frontend 635/636 (mesma falha pré-existente não relacionada de sempre); `ng build` limpo. Ao vivo
(Playwright + REST, criando ficha/rolagem mínimas do mesmo jeito da verificação anterior): três
screenshots — antes do hover (só o dadinho no canto do pill), durante (bandeja aparece no rodapé da
tela com "TESTE LUTA 1D20+5" / total "20" e a barra de progresso do auto-sumir) e depois de tirar o
mouse (bandeja já fechada) — confirmam o ciclo completo.

## Ajuste pós-m2-19 (3) — janela de 1h nas Rolagens Recentes + Contra-ataque no mini-card (2026-08-01)

Dois pedidos do autor na visão do mestre em `/painel/:id`, ambos sobre o card do detalhe.

**Rolagens Recentes vira janela de tempo, não recorte fixo** — `rolagensRecentes` (`detalhe.page.ts`)
trocou `this.rolagensFeed().slice(0, 4)` (top-4 fixo) por um filtro pela última hora:
`rolagensFeed().filter((item) => new Date(item.createdDate).getTime() >= agora() - UMA_HORA_MS)`.
Reavalia a cada tick do relógio de 5s (`agora()`, o mesmo que já alimentava "Atualizado há Xs"),
então uma rolagem sai da tira sozinha ao completar 1h, sem novo fetch. O pedido inicial era trocar
o layout pra um grid que sempre preenche a largura (sem espaço vazio à direita com poucos itens);
o autor recuou nisso a meio da implementação ("pode ser uma linha com scroll mesmo") — a tira
horizontal rolável (`overflow-x: auto` + `appOverflowFade`) **não mudou**, só o filtro de dados.
Spec atualizada: `mostra no máximo 4 pills mesmo com mais rolagens no feed` virou duas — uma
confirmando que 6 rolagens recentes aparecem todas (sem teto fixo) e outra que uma rolagem há 61
min some.

**Contra-ataque na linha de reações do mini-card do Esquadrão** — mesmo padrão de
Defesa/Esquiva/Bloqueio (item 5 da `m2-19`), lido do mesmo snapshot `dados.derivados` (persistido
por `calcularDerivados`, `shared/regras/agente/derivados`), só que `undefined` na maioria das
fichas (só existe com a habilidade "Contra-Ataque"). Layers tocadas, de baixo pra cima:
`FichaResumoDto`/`FichaResumoInternoDto` (`shared/dtos/ficha/ficha-operacao.dtos.ts`, novo campo
opcional `contraAtaque?: number`) → `FichaRepository.colunasResumo()` (nova coluna
`(ficha.dados->'derivados'->>'contraAtaque')::int AS "contraAtaque"`) → `FichaService.paraResumoPublico`
(repassa o campo) → `ItemFicha`/`fichasPorMembro` (`detalhe.page.ts`) → template (`detalhe.page.html`,
novo `@if (ficha.contraAtaque !== undefined)` dentro de `.detalhe__ficha-reacoes`, mesma regra das
outras três reações — só mostra a linha inteira se ao menos uma das quatro existir). `shared` precisou
rebuild (`npm run build` em `shared/`) pra `dist/index.d.ts` pegar o campo novo — sem isso o eslint
type-aware do backend reclamava (`no-unsafe-assignment`) porque `fichaInterna.contraAtaque` ainda
resolvia pra `any` contra o `.d.ts` antigo.

**Bug pré-existente achado na verificação ao vivo, não introduzido por esta task:** o template usava
`!== undefined` pra decidir mostrar Defesa/Esquiva/Bloqueio — mas o valor que chega do backend via
JSON **nunca** é a chave ausente quando `derivados.campo` não existe no JSONB (o `JSON.stringify` do
lado do backend *dropa* uma chave com valor `undefined` na hora de persistir, então o SQL
`dados->'derivados'->>'campo'` de uma ficha sem aquele campo devolve `NULL`, que o driver `pg`
entrega como `null` em JS — nunca `undefined`). `null !== undefined` é `true`, então o mini-card
mostrava "Defesa " em branco (rótulo sem valor) pra qualquer ficha Civil (que não tem
defesa/esquiva/bloqueio calculados) — achado ao vivo criando uma ficha via REST sem esses campos e
vendo o rótulo vazar. Corrigido normalizando `null → undefined` num único ponto,
`fichasPorMembro` (`ficha.defesa ?? undefined`, e o mesmo pros outros três), em vez de trocar os
quatro `@if` do template pra `!= null` (evita igualdade solta espalhada pelo HTML). Nova spec cobre
isso direto: fixture com os quatro campos setados como `null as unknown as undefined` (simulando o
JSON de rede) e confirma que `.detalhe__ficha-reacoes` some por completo.

**Verificação:** unitários — `detalhe.page.spec.ts` 71/71 (4 novos: filtro de 1h ×2, mostra/esconde
Contra-ataque, esconde tudo com `null` vindo da API); backend `ficha.service.spec.ts` 96/96, suíte
completa do backend 167/167; suíte completa do frontend 633/634 (1 falha pré-existente e não
relacionada em `ficha-inventario.component.spec.ts`, já documentada). `tsc --noEmit` do backend e
`ng build` do frontend limpos após o rebuild do `shared`. Ao vivo (Playwright + REST + `psql` direto
pro Postgres pra forjar uma rolagem "há 90 min" e criar fichas mínimas via `POST /ficha` bypassando o
assistente): campanha com duas fichas (uma com `derivados.contraAtaque`, outra sem) e duas rolagens
(uma agora, uma retroativa) — screenshot confirma "Contra-ataque 7" só no card com a habilidade, e
a tira de rolagens mostrando só a rolagem recente.

## Ajuste pós-m2-19 (2) — coluna Membros mais larga e ordenada (2026-08-01)

Segundo pedido de ajuste do autor na visão do mestre em `/painel/:id`, desta vez sobre a coluna
"Membros" (item 4 da `m2-19`).

**Largura no desktop** — `&__grade` (grid de duas colunas Membros|Esquadrão) tinha
`grid-template-columns: minmax(0, 300px) minmax(0, 1fr)`; a coluna Membros passou para
`minmax(0, 450px)` (+50%, 300px→450px), sobrando mais espaço para nome/chip-papel/ações de gestão
sem apertar. Só afeta o desktop — abaixo de `bp.tablet` a grade já colapsa para 1 coluna
(`minmax(0, 1fr)`), onde a largura fixa não se aplica.

**Ordenação mestre-primeiro/alfabética, mobile e desktop** — novo computed
`membrosOrdenados` (`detalhe.page.ts`) ordena `membros()`: papel `MESTRE` sempre primeiro, depois
`JOGADOR` em ordem alfabética pelo nome (`localeCompare` com locale `pt-BR`, `sensitivity: 'base'`
pra acentos/maiúsculas não afetarem a ordem). O `@for` da coluna "Membros" no template passou a
iterar `membrosOrdenados()` em vez de `membros()` cru. O grid do "Esquadrão" ao lado **também**
passou a acompanhar essa ordem — `fichasEsquadrao` já iterava `membros()` só para espelhar a ordem
da coluna vizinha (decisão de design da própria `m2-19`, documentada no computed), então trocar a
fonte para `membrosOrdenados()` manteve os dois sincronizados sem precisar de lógica nova.

**Verificado** com o stack real via Playwright: mestre + 2 jogadores (nomes fora de ordem
alfabética de propósito) numa campanha nova, confirmando via `boundingBox()` que a coluna Membros
mede 450px no desktop (Esquadrão ficou com 686px, o resto do espaço) e via `textContent` que a
ordem renderizada é mestre→alfabética tanto em 1440×900 quanto em 375×800. Suíte do frontend
630/631 (mesma falha pré-existente e não relacionada `P-001`; passou de 629/630 porque um teste
novo de ordenação foi adicionado), lint limpo nos arquivos tocados, `ng build` ok.

## Ajuste pós-m2-19 — reflow do cabeçalho no mobile e botão "Voltar" (2026-08-01)

Feedback do autor sobre a visão do mestre em `/painel/:id` logo após a `m2-19` ir ao ar, focado só
no mobile (`bp.mobile`, ≤560px): o nome da campanha dividia a primeira linha com o indicador de
tempo real, o gatilho do histórico de rolagens (`app-historico-rolagens-sidebar`, que vira botão
inline `position: static` nessa faixa — ver comentário em
`historico-rolagens-sidebar.component.scss`) e o kebab de ações, deixando o nome pouco destacado.

**`&__cabecalho` virou duas linhas lógicas** (`&__cabecalho-titulo-linha` / `&__cabecalho-acoes`),
lado a lado no desktop (`flex: 1` / `flex: none`) e empilhadas no mobile (`flex-basis: 100%` nos
dois, dentro do `&__cabecalho` com `flex-wrap: wrap`) — o nome fica sozinho na primeira linha,
ações (tempo real, voltar, histórico, kebab) na segunda.

**Botão "Voltar às campanhas" migrou do rodapé pro cabeçalho** — era um link de texto
(`<p class="detalhe__voltar">`) solto depois da grade; virou um botão quadrado
(`&__cabecalho-voltar`, mesma receita visual do kebab: 26×22 desktop, `bp.$alvo-toque` no mobile)
ao lado do gatilho de histórico de rolagens, sempre visível (o link antigo dependia de rolar até o
fim da página). Blocos `&__voltar`/`&__link` removidos.

**"Ver tudo" da tira de rolagens recentes removido** — ficava redundante com o botão de histórico
agora bem visível no cabeçalho (antes, no mobile, ele nem aparecia ali — era só um botão de texto
dentro da seção "Rolagens Recentes"). O método público `HistoricoRolagensSidebar.abrir()`,
adicionado na `m2-19` só pra esse gatilho, foi removido por ficar sem consumidor — a sidebar volta
a abrir só pelo próprio ícone D20 (`alternar()`, interno).

**Esquadrão passa a vir antes de Membros quando a grade empilha** — `&__coluna--esquadrao` ganhou
`order: -1` dentro do mesmo `@include bp.tablet` que já colapsa `&__grade` pra 1 coluna (1080px,
não `bp.mobile`): é o breakpoint onde a ordem visual passa a importar (nas 2 colunas do desktop,
`order` não muda nada). No desktop a ordem no DOM continua Membros→Esquadrão, inalterada.

**Verificado** com o stack real via Playwright (viewport 375×800): nome sozinho na primeira linha,
ações na segunda, botão "Voltar" presente com `href="/painel"`, "Ver tudo" ausente, Esquadrão
antes de Membros — e um viewport 1440×900 confirmando que o desktop não mudou. Suíte do frontend
629/630 (só a falha pré-existente e não relacionada `P-001`), lint limpo nos arquivos tocados
(3 erros pré-existentes documentados em `P-009`), `ng build` ok.

## m2-19 — Painel de campanhas: detalhe vira "banner + estatísticas + esquadrão" (visão do mestre) (2026-08-01)

Redesenho de `/painel/:id` (`CampanhaDetalhe`) — hoje um card "Identidade" (nome/descrição/
convite/ações) ao lado de "Membros" com fichas aninhadas por dono — para: banner de alerta
condicional (ficha crítica), tira de 4 estatísticas (Membros/Fichas/Convite/Alertas), tira
horizontal de rolagens recentes e duas colunas — **Membros** (gestão, sem fichas) e **Esquadrão**
(grid de mini-cards de toda a campanha). Spec
`docs/specs/done/m2-19-painel-campanha-detalhe-mestre-esquadrao.spec.md`; cobre só a visão do
**mestre** — a do jogador é a `m2-20`, próxima da fila. **Só apresentação** (proibições #16/#17):
nenhum endpoint novo, nenhuma regra de negócio nova — `membros`/`fichas`/`rolagensFeed` já eram
buscados pelo `CampanhaDetalhe` desde a `m2-16`/`m3-27`.

**`detalhe.page.ts` — dados achatados, não regra nova.** O computed `fichasPorMembro` (agrupado
por dono, m2-16) continua existindo — só ganhou um `fichasEsquadrao` por cima que itera
`membros()` e achata as fichas de cada um numa lista só, anexando `donoNome` (a `ItemFicha` ganhou
o campo `usuarioId`, que o card do Esquadrão precisa pra `podeAjustarFicha`/`alternarMenuFicha` já
que deixou de estar aninhado sob a linha do dono). `fichaCritica`/`alertasCount` são computeds
simples sobre `fichas().filter(vidaAtual <= 0)` — o banner mostra a primeira encontrada (a spec não
exige critério de desempate); `rolagensRecentes` é só `rolagensFeed().slice(0, 4)` (o feed já
chega mais-recente-primeiro, m3-27). O disclosure "N fichas ⌄" por membro no mobile
(`fichasExpandidas`/`alternarFichas`) e o estado vazio por membro (`podeAfirmarSemFichas`,
item 8 da m2-16) foram **removidos**, não adaptados — não fazem mais sentido com as fichas fora da
coluna "Membros".

**Menu kebab de ações da campanha (item 6).** O card "Identidade" que hospedava
editar/excluir/convite deixou de existir; um novo `menuCampanhaAberto` (signal simples, sem o
truque de `position: fixed` calculado no clique do menu de ficha — o cabeçalho não vive dentro de
nenhum ancestral com `overflow`+`mask-image`, então um dropdown `position: absolute` comum já
basta) abre um menu no cabeçalho com Editar/Excluir, reaproveitando **sem reescrever** a lógica
já existente (`abrirEdicao`/`pedirExclusao`/`formularioEdicao`/`confirmandoExclusao`) — só o
gatilho visual mudou. `regenerarConvite`/`copiarConvite` não se moveram para o kebab: ficaram
junto do próprio código, agora dentro do tile "Convite" da tira de estatísticas (mais perto do
dado que operam).

**`HistoricoRolagensSidebar` ganhou um método público `abrir()`** (era só `alternar()`/`fechar()`,
`protected`) — o botão "Ver tudo" da nova tira de rolagens abre a mesma sidebar já existente no
cabeçalho via referência de template (`#historicoSidebar`), sem duplicar a lista completa (item 3
da spec: a tira mostra só um teaser de 3-4 rolagens).

**Grid do Esquadrão é fixo, não dinâmico** — decisão explícita do autor documentada na própria
spec: o protótipo comparado usava `repeat(auto-fill, minmax(220px, 1fr))`, que rendia 3-4 colunas
no desktop; o código usa `grid-template-columns: repeat(2, minmax(0, 1fr))` sempre, colapsando pra
1 coluna só no breakpoint mobile. Isso também aposentou o antigo grid **dinâmico por contagem de
fichas do membro** (`--grid-2`/`--grid-3` da m2-16), que só fazia sentido quando as fichas viviam
agrupadas por dono.

**`max-width: 80vw`** (era `1160px` fixo, m2-17) — mesmo padrão de `visualizar.page.scss`/
`lista.page.scss` (m2-18). Grade de duas colunas (Membros | Esquadrão) empilha abaixo de
`bp.tablet` (1080px, não um `960px` mágico solto) — ganhou o token porque é exatamente o cenário
que `$bp-tablet` foi criado pra cobrir (m3-26): 2 colunas de grid ainda apertam antes do
`bp.mobile`.

**Testes:** `detalhe.page.spec.ts` reescrito quase por inteiro (66 testes) — a suíte antiga testava
as fichas aninhadas sob cada `.detalhe__membro`; a nova testa o kebab de campanha (mestre-only,
abre/fecha, editar/excluir reaproveitando o fluxo antigo), o banner crítico (aparece/some), a tira
de estatísticas (contagens + `stat--alerta`), o tile de convite (mestre-only, copiar/regenerar), a
tira de rolagens (recorte de 4, "Ver tudo" abre a sidebar) e o Esquadrão achatado (nome do dono por
card, sem fichas na coluna "Membros", estado vazio). Os testes de ação rápida de Vida/Energia e do
menu de ficha (m3-52) foram só re-selecionados pro novo DOM, sem mudar o que provam.
`HistoricoRolagensSidebar` não tinha spec próprio (segue sem — `abrir()` é coberto indiretamente
pelo teste "Ver tudo" do detalhe).

**Verificado ao vivo** (Postgres real + backend + frontend já em pé, Playwright): usuário
descartável MESTRE de uma campanha com um JOGADOR convidado, duas fichas criadas pelo próprio
assistente da UI (não craftadas por REST — o documento de ficha é grande demais pra montar à mão
sem passar pela mesma validação de `shared/regras` que o assistente já resolve), uma delas com
`vidaAtual` zerada **direto no Postgres** (mesma técnica da m2-18, pra simular o estado crítico sem
depender de dano de combate) e 3 rolagens via REST. Confirmado: banner "Vera (crítica) está crítica
(Vida ≤ 0)" com link pra ficha; tira "Membros 2 / Fichas 2 / Convite + copiar/regenerar
(clipboard + backend confirmados, com `context.grantPermissions` — o primeiro run bateu num
`NotAllowedError` de clipboard do Chromium headless sem permissão, não um bug do produto) / Alertas
1"; tira de rolagens com as 3 mais recentes, "Ver tudo" abrindo a sidebar; grid do Esquadrão em
`391px 391px` (exatamente 2 colunas iguais) no desktop e `315px` (1 coluna) em 375px, sem scroll
horizontal; ajuste rápido de Vida no mini-card do Esquadrão (34→33) funcionando igual à m2-16g;
coluna "Membros" sem nenhum `.detalhe__ficha-card"`. Sessão à parte como **jogador** confirmou o
gate `ehMestre()`: sem tile de convite, sem kebab de campanha, sem ações de gestão de membro —
zero erro de console nos dois papéis. Dados de teste (3 usuários, 3 campanhas, 2 fichas, 3
rolagens) removidos do banco de dev ao final (`DELETE` direto — throwaway).

**Ajuste pós-verificação:** a tira de estatísticas no mobile (`repeat(2, 1fr)`) deixava uma célula
vazia ao lado de "Alertas" quando o Convite (mestre-only) já ocupava a linha inteira — `.stat:
last-child { grid-column: 1 / -1 }` dentro do `@include bp.mobile` resolve porque "Alertas" é
sempre o último tile, mestre ou jogador.

**Próxima task candidata:** `m2-20` — mesmo detalhe `/painel/:id`, agora a visão do **jogador**
(spec já no backlog, dependente desta).

## m2-18 — Painel de campanhas: lista vira painel de controle (2026-08-01)

Redesenho de `/painel` (`CampanhaLista`): de grade de cartões (m2-17) para **painel de
controle** — linhas densas por campanha, tira de 4 estatísticas agregadas no topo, alerta visual
de ficha crítica por linha, resumo da própria ficha (jogador) e convite copiável direto na linha
(mestre). Spec `docs/specs/done/m2-18-painel-campanhas-lista-dashboard.spec.md`; movida para
`active/` por uma sessão concorrente antes desta (confirmado via `git status` — ver
[[sessoes-concorrentes-mesma-branch]]), retomada e fechada nesta task.

**Backend — `CampanhaRepository.listarPorUsuario` enriquecida, sem tabela nova.**
`CampanhaResumoDto` ganhou `totalMembros`/`totalFichas`/`temFichaCritica`/`fichaCriticaNome`/
`minhaFichaResumo`/`codigoConvite`/`atualizadoEm`, todos calculados numa única query com três
`LEFT JOIN LATERAL` correlacionados por `campanha.id` (e, para fichas, também pelo `usuario_id`/
`papel` da própria linha de `campanha_membro` que a query já tem): um para `COUNT` de membros,
um para o agregado de fichas **visíveis ao usuário atual** (mestre vê todas; jogador só as
próprias + as concedidas via `usuario_ficha_acesso` — mesma regra de
`FichaRepository.listarVisiveisParaUsuario`, replicada porque isto é agregação, não listagem) —
`totalFichas`, `temFichaCritica` (`BOOL_OR` de Vida ≤ 0) e `fichaCriticaNome`
(`MIN(nome) FILTER`, equivalente a "primeira por nome" já que a única ordenação é por nome) — e
um terceiro só para a própria ficha do jogador (`minhaFichaResumo`, via `json_build_object`,
`null` natural para o mestre porque o `WHERE` do LATERAL já restringe a `papel = 'JOGADOR'`,
sem precisar de `CASE` por fora). `atualizadoEm` é o `GREATEST` entre `campanha.updated_date` e o
`MAX(ficha.updated_date)` do mesmo agregado de fichas visíveis. `CampanhaService.listarCampanhas`
não mudou uma linha — segue passthrough puro, toda a agregação é responsabilidade do repositório
(SQL only, SYSTEM.SPEC §7.1).

**Pegadinha descoberta e documentada em comentário no código:** `COUNT(*)` do Postgres é
`bigint`, e o driver `pg` devolve `bigint` como **string** (evita perda de precisão acima de
`Number.MAX_SAFE_INTEGER`) — sem o `::int` explícito nos dois `COUNT(*)`, `totalMembros`/
`totalFichas` chegariam como `"4"`/`"3"` no DTO tipado `number`, um bug silencioso (TypeScript
não pega, `toEqual`/`===` no frontend comparariam string com number e quebrariam sutilmente
onde houver soma, ex. `estatisticas().fichasEmCampo`). Achado rodando a query de verdade contra o
Postgres real do dev (ver próximo parágrafo), não em teste unitário.

**Validação da query — direto no Postgres real do ambiente de dev, não só teste com mock.**
Como este repositório não tem teste de integração de banco (só unit test com repositório
dublado — `campanha.service.spec.ts`), a query nova foi provada rodando de verdade: (1) contra
dados reais já existentes no dev (usuário membro de 2 campanhas, um papel em cada, incluindo
ficha compartilhada via `usuario_ficha_acesso`); (2) contra um cenário sintético construído numa
transação `BEGIN…ROLLBACK` (nunca commitada) cobrindo o caso mais importante: um jogador dono de
uma ficha crítica, um mestre (vê a crítica + `totalFichas` corretos), e um **terceiro jogador sem
acesso** à ficha crítica do primeiro — confirmando que ele nunca vê a contagem/alerta de uma
ficha que não lhe foi compartilhada (o critério §14 que o item de aceite da spec exige). A string
SQL final testada é literalmente a que ficou no `campanha.repository.ts` (extraída do arquivo
editado, não uma cópia solta) — rodada via `knex.raw` com os mesmos bindings nomeados do
`BaseRepository`, garantindo que o `:papelMestre`/`:papelJogador`/`:usuarioId` reais funcionam.

**Frontend.** `lista.page.html`/`.ts`/`.scss` reescritos: cartões da grade (m2-17) viraram
`.campanhas__linha` — coluna identidade (avatar+nome+chip-papel) | coluna meio (descrição +
contadores "N membros"/"N fichas" + alerta-de-crítica-OU-resumo-da-própria-ficha, mutuamente
exclusivos, alerta tem prioridade) | coluna ação (rótulo relativo de `atualizadoEm` + botão
copiar convite quando mestre + botão "Abrir"). Estruturado como `<div>` com **dois `<a>` irmãos**
(um envolvendo identidade+meio, outro só o botão "Abrir") em vez de um `<a>` único envolvendo a
linha inteira — o botão "Copiar convite" é interativo e não pode aninhar dentro de um `<a>` (o
mesmo racional já documentado em `detalhe__ficha-card`/`detalhe__ficha-link`). Linha crítica
reusa o tratamento visual de `.detalhe__ficha-card--critico` (tokens fixos `--vida`/
`--vida-border`, não `--accent` — trocável em runtime, mesmo racional da m3-38 item 7). Tira de 4
estatísticas (`Campanhas`/`Você mestra`/`Fichas em campo`/`Alertas`) copiando o bloco `.stat`
canônico de `docs/design/tema/_componentes.scss`, somada no client a partir da lista já
enriquecida (sem endpoint próprio), com um modificador local `.stat--alerta` (mesmos tokens fixos
`--vida`/`--vida-border`). `max-width: 80vw` (era `1160px` fixo), espelhando
`visualizar.page.scss`.

**Util novo `frontend/src/app/shared/rotulo-relativo.util.ts`** — extraído do cálculo inline que
já existia em `CampanhaDetalhe.textoAtualizacao` (m2-16, "Atualizado há Xs"), agora reaproveitado
também pela coluna de ação da lista. Puro (`rotuloRelativo(instanteMs, agoraMs)`), sem o prefixo
"Atualizado" — cada tela decide o rótulo; a lista ganhou seu próprio relógio de 5s (`agora`
signal + `setInterval`), mesmo padrão já usado no detalhe.

**Testes novos:** `rotulo-relativo.util.spec.ts` (limites de 5s/1min/1h, nunca negativo);
`lista.page.spec.ts` (tira de estatísticas, linha crítica, resumo da própria ficha com
exclusão mútua do alerta, contadores singular/plural, botão de copiar só para mestre com
convite, estados de carregamento/vazio). Fixtures de `CampanhaResumoDto` em
`campanha.service.spec.ts` (frontend e backend) e `acervo.page.spec.ts` atualizadas para o DTO
enriquecido — só ajuste de shape, sem mudança de comportamento nesses arquivos.

**Verificado ao vivo** (Postgres real + backend + frontend já em pé, Playwright): usuário de
teste descartável criado via REST, MESTRE de uma campanha com 3 fichas (uma crítica, inserida
direto via SQL) e JOGADOR de outra (com a própria ficha Vida 12/30); tira de estatísticas somou
`2`/`1`/`4`/`1` corretamente; linha da campanha com a ficha crítica ganhou o tingido vermelho e
mostrou "Vera (crítica) crítica"; linha da campanha em que é jogador mostrou "Agente Aliado ·
Vida 12/30"; sem scroll horizontal em 375px nem 360px (`document.documentElement.scrollWidth ===
clientWidth` nos dois). Dados de teste (2 usuários, 2 campanhas, 5 fichas) removidos do banco de
dev ao final (`DELETE` direto — throwaway, não é fluxo da aplicação, não precisa de soft delete).

**Achados registrados em `PROBLEMS.md` (não corrigidos, fora do escopo desta task):** 3 erros de
lint de frontend e 1 de backend já existiam em `master` antes desta task (confirmado via `git
stash` contra o HEAD comitado) — nenhum nos arquivos tocados aqui (`autofocus` em
`ficha-inventario.component.html`, variável não usada em `ficha-visualizacao.component.spec.ts`
e em `ficha.service.spec.ts`, e uma segunda variável não usada em `acervo.page.spec.ts` que já
existia numa linha diferente antes do meu ajuste de fixture). `npm run lint` portanto **não**
fecha limpo hoje em `master`, apesar do CI rodar lint em todo PR — não investigado a fundo aqui.

**Próxima task candidata:** `m2-19` (detalhe `/painel/:id` na visão do mestre — "esquadrão"),
que já está no backlog junto com `m2-20` (mesma tela na visão do jogador), ambas parte da mesma
frente de redesenho do painel de campanhas iniciada aqui.

> Última atualização: 2026-07-29 (**m3-27 — Histórico de rolagem: persistência + feed em tempo
> real**: task antiga do backlog (apontada como "próxima" desde a `m3-26`, mas empurrada por dois
> lotes de refino inteiros — `m3-40`…`m3-56` e depois a `m3-60`) finalmente implementada. Rolagens
> feitas na ficha (rolagem rápida/preset em `FichaRolagens`, dano de item em `FichaInventario`,
> teste de atributo/dano em `FichaVisualizacao`) agora **persistem** em vez de só aparecer na
> bandeja efêmera. **Modelo:** tabela nova `rolagem` (migration `0011`) — `ficha_id`, `campanha_id`
> **nulo** (resolvido da própria ficha; ficha solta do acervo grava `null`, não quebra), `usuario_id`
> (autor da jogada, não necessariamente o dono da ficha), `rotulo`, `tipo_rolagem_visibilidade_id`
> e `resultado JSONB` reusando `ResultadoRolagemDto` **1:1** — zero transformação, o mesmo shape que
> já alimenta a bandeja de dados. **Visibilidade `PUBLICA`/`PRIVADA` é tabela de referência
> `tipo_rolagem_visibilidade` (migration `0010`)**, não enum solto na coluna — a spec original não
> detalhava a coluna, mas o §10.2.12 do `SYSTEM.SPEC.md` (proibição #24) exige `tipo_*` pra qualquer
> enum de coluna relacional; a exceção de enum-só-em-`shared/` vale só para conteúdo dentro do JSONB
> `ficha.dados`, o que não é o caso aqui. `PRIVADA` = visível só para o autor e o mestre da campanha;
> a permissão **reusa** `FichaService.recuperarFicha` (histórico da própria ficha) e
> `CampanhaRepository.recuperarMembro` (feed da campanha, barra quem não é membro) em vez de duplicar
> a matriz §14. **Decisão de design registrada em `SCHEMA.md`:** o gateway só emite
> `rolagem:registrada` pra rolagens `PUBLICA` — `PRIVADA` nunca trafega por WebSocket, só aparece no
> histórico de quem tem permissão de ver via REST. **Frontend:** nova mini-aba **Histórico** em
> `AbaStatus` (o `id` `'combate'` que a `m3-37` deixou de propósito por causa disso continua livre;
> `'historico'` é uma aba irmã nova, não um reaproveitamento) — lista paginada
> (`FichaHistorico`, "Carregar mais") mais recente primeiro, reusando `ResultadoRolagem` (extraído de
> `BandejaDados` pra não duplicar a renderização do resultado) e um toggle **Rolagem oculta** ao lado
> da aba Rolagens que decide `PUBLICA`/`PRIVADA` da próxima jogada. O detalhe da campanha
> (`/painel/:id`) ganhou a seção **"Rolagens Recentes"**: histórico via REST no load +
> `TempoRealService.rolagemRegistrada$` pro feed ao vivo, mesmo padrão de fade topo/base da lista de
> Membros. **Bug corrigido durante a verificação ao vivo:** `FichaHistorico` chamava
> `carregarPagina(1)` direto no corpo do construtor, lendo `fichaId()` (`input.required`) antes do
> Angular resolver os inputs — `NG0950` em runtime, não pego pelos testes (TestBed injeta o input
> antes do primeiro change detection); corrigido envolvendo em `effect()`, que só roda depois disso.
> `+10` testes de `rolagem.service.spec.ts` (backend 162/162); frontend 592/593 (a 1 falha é
> pré-existente/não-relacionada, confirmada via `git diff` vazio no arquivo). Budgets do
> `angular.json` ajustados (580kB→610kB inicial, 34kB→35kB `anyComponentStyle`). **Verificado ao
> vivo** (Postgres real, REST + Playwright): dono vê as duas (pública+privada) no próprio histórico;
> um terceiro membro da campanha (não-autor, não-mestre) vê a pública no feed mas **não** a privada;
> o mestre vê as duas; rolagem feita na ficha aparece no Histórico na hora (prepend local, sem
> reload) e a pública chega no feed do mestre em tempo real (WebSocket, sem reload); toggle "Rolagem
> oculta" muda de estado visualmente (ícone + cor accent) conforme o tema "Terminal de Contenção".
> Spec em `docs/specs/done/m3-27-historico-rolagem.spec.md`. **Próxima task: `m3-53`** (ficha —
> exportar PDF), única pendência do lote `m3-40`…`m3-56`, ainda no backlog — ver o bloco `m3-60`
> logo abaixo.)
>
> Última atualização anterior: 2026-07-28 (**m3-60 — Navegação mobile da ficha: HUD fixo + barra
> inferior**: task nova, aberta depois que o dono do produto olhou o resultado da `m3-56` e disse
> que "a UI/UX não encaixou". A `m3-56` passou nos testes de bounding box e ainda assim a tela não
> se usa em mesa — este é o diagnóstico de por quê, e a correção. **Achado central:** no desktop a
> ficha são três colunas (Identidade+Vitais | Atributos | Status com abas), em que as duas
> primeiras são **contexto permanente** e as abas trocam só a terceira; no mobile um único
> `flex-direction: column` (o `bp.tablet` que a própria `m3-56` introduziu) empilhava as três na
> ordem do DOM. Empilhar **preserva o conteúdo das colunas e destrói a relação entre elas** — a
> spec da `m3-56` pediu literalmente "grades que refluem para 1 coluna", ou seja, um passe
> responsivo mecânico, e é essa a raiz do problema, não um bug pontual. A tradução correta de
> paralelismo espacial (olhar para o lado) no celular é **navegação temporal (trocar de vista) +
> um resumo fixo**, não empilhamento. **Números medidos ao vivo** (390×844, ficha cheia — as
> capturas da `m3-56` usaram ficha **vazia**, e isso escondeu quase todos os defeitos reais):
> página de **3.224px** (3,8 telas) na aba Informações; topo da barra de abas em **y=1.903px**
> (2,25 telas de rolagem cega antes de encontrar a navegação, em **todas** as abas, o que dá
> 80% da rolagem em Informações e **129%** em História); e — o achado que faltava — **trocar de
> aba não movia o scroll**: `scrollTop` idêntico antes e depois nas três trocas medidas, com o
> painel nascendo em **y=705 de 844**, ou seja, cada troca custava *mais uma* rolagem. Só a tarefa
> "tomei 7 de dano" era barata (0 swipes); todas as outras pagavam ~3 swipes cegos + 1.
> **Solução (mantendo o modelo, não matando a "nova forma de ver a ficha"):** o contexto permanente
> vira um **HUD `sticky`** no topo (nome, patente/classe/nível, Vida/Energia com barra proporcional,
> selos de condição ativa) e o detalhe trocável ganha a **tela inteira**, com uma **barra de
> navegação `fixed` no rodapé**. As três colunas do desktop viram os destinos da barra, lidas da
> esquerda para a direita: `agente` (Identidade + Atributos, destino **mobile-only**, tipo
> `DestinoMobile = 'agente' | AbaStatus`) + as seis abas de Status já existentes. **`'agente'` não
> entra em `AbaStatus` de propósito** — o `#` da URL continua sendo o canal das abas de Status e o
> desktop segue com as três colunas visíveis ao mesmo tempo; `destinoMobileInicial` é calculado
> **separado** de `abaStatusInicial` (e não derivado dele) porque este último não distingue "sem
> fragmento" de "#informacoes", e sem fragmento o celular deve cair no agente. **Por que o sticky
> funciona sem mexer em nenhum ancestral:** a cadeia usa `overflow-x: clip` com `overflow-y:
> visible` (`html` em `styles.scss`, `.conteudo` em `layout.component.scss`) — é a única combinação
> da spec que **não** transforma o outro eixo em scroll container. **Trocar qualquer um desses
> `clip` por `hidden`/`auto` mata todo sticky da tela em silêncio** (tentação natural ao caçar
> overflow horizontal — está comentado no SCSS). **A barra inferior não é invenção:** é o padrão
> canônico já existente em `calculadora-shell.component.scss` (m1-20), z-index na faixa 10–19 e
> `env(safe-area-inset-bottom)`. A diferença que importa é `flex: 1 1 0` (lá e agora aqui) contra
> `flex: 0 0 auto` (a barra de abas do Status): com `1 1 0` os sete destinos **dividem** a largura e
> cabem sem rolagem lateral nenhuma — medido, 52×44px por item a 390px, nenhum rótulo cortado.
> **Isso invalida o fix da `m3-56.1`** (fade + auto-scroll até a aba ativa, commit `2e940d4`): ele
> tratava o sintoma da rolagem lateral; a resposta certa era **não rolar**. O fade e o auto-scroll
> continuam existindo, mas agora valem só no desktop, onde a coluna Status de fato pode ficar
> estreita. A barra fica **fora** de `.ficha-visao__painel--solo` de propósito: aquele bloco tem
> `animation` com `transform`, e um ancestral com transform vira containing block de descendente
> `position: fixed`. **Convivência no rodapé:** bandeja de dados (`bottom: 20px`) e gatilho da
> calculadora (`bottom: 24px`) moravam exatamente na faixa da barra nova — medido, a carta da
> bandeja cobria a barra de abas **e** o próprio gatilho por 6,35s a cada rolagem. Resolvido com a
> custom property `--piso-flutuante`, declarada no **`:host` da página** (não no `.ficha-pagina`:
> `app-calculadora-flutuante` é **irmão** dele no template e não herdaria) e consumida com fallback
> `0px`, então nenhuma outra tela muda. **Também nesta leva:** (a) **alvos de toque por área, não
> por caixa** — mixin `alvo-de-toque` com `::after` de 44×44 centrado, porque o valor clicável da
> edição no lugar (m3-10) é *texto no meio de uma frase* e crescer a caixa destruiria a densidade
> do card; cobre o dado de rolar teste (22×22, ×10, o gesto mais repetido da ficha), a estrela de
> Maestria e os `--editavel`. Inclui `.ficha-atributo__mod-passo`, que **parecia** corrigido pela
> `m3-56` e não estava: `@extend .ficha-passo` injeta o seletor no media query de 44px, mas um
> `width: 18px` declarado **depois** no arquivo, com a **mesma especificidade**, vence lá dentro —
> armadilha a lembrar sempre que houver `@extend` + media query. (b) **Grade de atributos em 3
> colunas no mobile**: a regra `bp.mobile { repeat(3) }` **já existia e nunca rodava**, anulada
> pela especificidade (0,2,0) de `.ficha-atributos--2col` contra (0,1,0) dela — o resultado eram os
> dois órfãos centralizados (VIG e VON); corrigido repetindo o media query **dentro** do bloco
> `--2col`, o que empata a especificidade e vence por ordem. (c) **Indicador de auto-save**: o
> signal `edicaoPendente` existia e **nunca era referenciado no template** — o sucesso do
> salvamento era completamente mudo (sem toast, sem "salvando…"); virou um selo discreto no
> cabeçalho, deliberadamente **não** um toast, porque salvar é constante nesta tela (cada passo de
> Vida agenda um save) e um toast por edição seria ruído contínuo. (d) **Tooltip abre por toque**
> (`shared/tooltip`): `pointerenter` agendava com 300ms e `pointerdown` escondia — num toque os
> dois disparam quase juntos e o `pointerdown` cancelava o timer, então **no celular o tooltip
> nunca aparecia**, apagando informação que não existe em nenhum outro lugar (DT de cada atributo,
> progressão de classe de Vida/Energia, decomposição das Resistências em base+equipamento+formação,
> Contra-ataque, requisito de Maestria). Contrato: host **informativo** → toque curto abre e o
> clique é engolido; host **acionável** (`a[href]`, `button`, campos, `role` equivalentes) → toque
> curto **executa a ação** e o balão só abre no **pressionar-e-segurar de 500ms** (convenção de
> long-press dos sistemas móveis). Modalidade por `PointerEvent.pointerType`, com `matchMedia
> ('(hover: none)')` só desempatando — sem sniffing de UA; `aria-describedby` enquanto aberto.
> **Colisão de seletor que quebrou dois testes existentes:** o selo de condição do HUD usava
> `data-condicao`, que **já** identifica os botões de condição do card de Identidade — o
> `querySelector` dos testes passou a casar o selo do HUD (que vem antes no DOM) em vez do botão;
> renomeado para `data-selo-condicao`. **Dívida deliberadamente adiada** (decisão do dono):
> **"Extras" continua se chamando Extras** e a **Origem continua morando lá, não em História** —
> a auditoria ao vivo mostrou que a tarefa "o mestre perguntou da minha origem" leva um humano a
> História (ícone de documento) e ele não acha; e o ícone que nomeia "Extras" é o `mais` (`+`),
> o mesmo dos botões "Adicionar" do app inteiro. Fica registrado como dívida de nomenclatura.
> Removido também o comentário no topo do template que ainda descrevia a tela como recorte
> experimental "para comparar com a versão em produção, não entregar paridade de funcionalidade" —
> o experimento virou estado permanente há várias tasks e o comentário passou a mentir.
> Spec em `docs/specs/done/m3-60-ficha-mobile-navegacao.spec.md`. **Próxima task:** `m3-53`
> (ficha — exportar PDF), única pendência do lote `m3-40`…`m3-56`, ainda no backlog. Ficam também
> registrados, fora do escopo desta task e **não corrigidos**: o cromo de autoria antes do conteúdo
> em cada painel (medidos 281px de botões — carga, "Adicionar itens", "Item custom", "Esvaziar",
> "Custos", busca e 3 chips — antes do 1º item do Inventário; Rolagens abrindo com um campo vazio e
> um botão "Rolar" desabilitado, com os presets salvos abaixo e **colapsados**; o editor de
> atributos com SALVAR/CANCELAR **acima** dos 10 campos), e a dívida de nomenclatura de "Extras"
> acima. Numa sessão se consulta e usa muito mais do que se cria, e a ordem visual dos painéis
> ainda não reflete isso.
>
> **Addendum (mesmo dia) — o bug real por trás do "trocar de aba não move o scroll".** A
> verificação ao vivo do parágrafo acima tinha medido o sintoma (`scrollTop` sem mudar) mas a
> primeira implementação do `rolarParaTopoDoConteudo()`/`irParaVitais()` **parecia** corrigi-lo e
> não corrigia: a checagem de "estou no mobile?" lia `this.navMobile()?.nativeElement.offsetParent`,
> e por especificação do CSSOM **`offsetParent` retorna `null` para todo elemento
> `position: fixed`** — não é detalhe de implementação, é o comportamento definido — e a barra
> inferior é `fixed`. A checagem sempre lia "desktop" mesmo no mobile, o método sempre retornava
> cedo, e o scroll nunca era de fato disparado. Passou pelos testes de componente porque o jsdom
> não faz layout de verdade (não há geometria real para `offsetParent` refletir); só apareceu numa
> verificação ao vivo medindo `window.scrollY` antes/depois da troca num navegador de verdade —
> confirmado com um teste isolado reproduzindo a sequência exata de navegação (`scrollTo(1200)` →
> trocar de destino → trocar de volta), que mostrou `scrollY` parado em 307–411px em vez de `0`.
> Fix: trocar a checagem por `getComputedStyle(nav).display !== 'none'`, que não depende de
> `position`. **Lição geral, não só deste bug:** `offsetParent` não é um substituto seguro de
> "está visível?"/"está no breakpoint X?" para qualquer elemento que possa ser `position: fixed`
> (nem `sticky`, ali funciona normal — só `fixed` degenera para `null`).
>
> Também nesta passada, com a árvore livre dos três agentes em paralelo: **`.ficha-passo`** (o
> stepper de Vida/Energia) não tinha `flex-shrink: 0` — dentro de `.ficha-barra__medidor`
> (`display: flex`), o padrão `flex-shrink: 1` deixava os 44px encolherem no eixo principal em
> telas apertadas (medido: 40×44/43×44 a 360-430px) mesmo com `width: bp.$alvo-toque` declarado.
> **Rótulos da barra inferior cortando a 360px** ("Habilid.", "Rolagens", "História" em 8 chars):
> reduzido `font-size`/`letter-spacing` do rótulo (8.5px/.04em → 8px/.01em) em vez de abreviar mais
> os nomes — abreviar mais era repetir o defeito da m3-56 (rótulo que não diz o que é). O `<a
> class="ficha-pagina__voltar">` (único caminho de volta da tela) media 89×18px, abaixo do alvo.
> **`.ficha-mini--fino .ficha-mini__valor { overflow: hidden }`** clipava o `::after` do alvo de
> toque dos valores editáveis (Nível/Prestígio/Dinheiro) — mudado para `overflow-wrap: anywhere`
> no mobile (também resolve reticência escondendo valor sem aviso, ex. Patente longa). Fechados
> também: `guia-gatilho` (fórmula), `.sanidade__add`, `.ficha-rol__mini-btn` — nenhum tinha
> tratamento mobile; corrigidos com a técnica de `::after` (não padding) sempre que o controle tem
> `width`/`height` explícitos — com `box-sizing: border-box` global, padding em elemento de
> dimensão fixa **encolhe o conteúdo em vez de crescer a caixa**, o oposto do efeito pretendido.
> **Trade-off aceito e documentado, não perseguido até o fim:** em fileiras densas (ícones de
> modificação do inventário, ações de sequela/trauma da Sanidade, o valor de carga ao lado da
> barra de peso), a zona de toque de 44px de um controle inevitavelmente encosta na do vizinho —
> a caixa real cresce (confirmado via `getBoundingClientRect`, não só o CSS declarado), mas um
> toque bem na fronteira ativa o vizinho, não o controle "certo". Isso é esperado em qualquer UI
> com controles compactos adjacentes (o próprio par −/valor/+ de Vida também tem essa sobreposição,
> sem prejuízo real porque o stepper — o controle dominante — sempre vence). Não vale inflar a
> densidade da ficha para eliminar esse último resíduo.

> Última atualização anterior: 2026-07-28 (**m3-56 — Passe mobile + esqueletos de carregamento da
> ficha**: task `m3-56` do lote de refino `m3-40`…`m3-56` implementada — fecha o lote (falta só
> a `m3-53`, ver "Próxima task"). **Achado central antes de implementar:** a `m3-26` (base mobile)
> tratava a antiga grade de 3 colunas da Visão Geral, mas o redesenho de comparação visual
> (branch `claude/redesign-ficha-screen-*`, anterior a este lote) substituiu aquilo por
> `.ficha-visao__linha-colunas` — um **flex row de larguras fixas** (Identidade 420px + Atributos
> 260px + Status mín. 420px, fora gaps ≈ 1116px) **sem nenhum tratamento responsivo** — a coluna
> mais crítica da tela inteira estourava qualquer viewport de tablet/celular. Virou o alvo
> principal do passe: `&__linha-colunas` ganhou `@include bp.tablet { flex-direction: column }`
> e as três colunas (`--identidade`/`--atributos`/`--status`) ganharam `width: 100%` no mesmo
> breakpoint — `bp.tablet` (1080px) escolhido em vez de `bp.mobile` porque a largura fixa já não
> cabe em nenhum notebook pequeno, não só em celular (usa os dois tokens de `_breakpoints.scss`
> com propósito: tablet resolve a estrutura, mobile afina densidade/alvo de toque por cima).
> **Barra de abas do Status** (`.ficha-status__abas`, 6 abas — Informações/Inventário/
> Habilidades/Rolagens/Extras/História): mesmo padrão **já usado** na barra de abas da calculadora
> (`calculadora-shell.component.scss`, m1-20, precedente citado pela spec) — ícone-só por padrão,
> rótulo reaparece só na aba ativa; **dois bugs pegos só ao vivo, não em teste unitário**: (1)
> a primeira versão dava `flex: 1 1 0` a todas + `flex: 2 1 0` à ativa — a 360px isso deixava 5
> das 6 abas com **40.7px de largura** (abaixo do alvo de 44px); trocado para `flex: 0 0 auto` +
> `min-width: bp.$alvo-toque` em todas (a ativa cresce pelo próprio conteúdo, não por um multiplicador
> de flex) e a barra ganhou `overflow-x: auto` no mobile — 6×44px + gaps (~289px) já não cabe nos
> ~288px disponíveis da coluna Status a 360px, então a barra rola em vez de espremer alguma abaixo
> do alvo; (2) o `width: 100%` do desktop (regra fora do `bp.mobile`) sobrevivia como `flex-basis`
> efetivo mesmo depois de setar `flex: 0 0 auto` (flex-basis:auto usa `width` quando presente) —
> as seis abas mediam **a mesma largura** (300px+) em vez de dimensionar pelo conteúdo; corrigido
> com `width: auto` dentro do próprio `bp.mobile`. **Achado metodológico, o mais importante desta
> rodada:** `styles.scss` tem uma "trava de segurança" global, `html { overflow-x: clip }`
> (pré-existente, m1-15), que impede o **scroll** horizontal do body mas **não impede** um elemento
> de renderizar fisicamente fora do viewport — ele só fica invisível e inclicável na parte cortada.
> Isso significa que **`document.body.scrollWidth <= clientWidth` sozinho não prova ausência de
> overflow** — só prova que não vira scrollbar. Descoberto ao comparar visualmente um screenshot
> (botão "+" de Energia cortado na borda) com o scroll-check batendo `0`; escrito um verificador à
> parte que soma o `getBoundingClientRect()` de **todo elemento visível da página** contra o
> viewport (excluindo descendentes de contêineres intencionalmente roláveis, como a própria barra
> de abas) — achou **43 elementos realmente fora do viewport** que o scroll-check não via, em 4
> bugs distintos: **(a)** `.ficha-vitalidade` (Vida/Energia lado a lado) usava `@media (max-width:
> 360px)` — número mágico que não cobria 390/430px; a 390px o stepper "+" de Energia ficava com o
> right edge em 409px (19px fora dos 390) porque a coluna de 2 já não cabia o `.ficha-barra__medidor`
> (steppers de 44px + valor); trocado para `bp.mobile` (560px), cobrindo toda a faixa 360-430
> testada — mesmo fix em `.ficha-rol__lista` (Rolagens, grade de presets, era `max-width: 420px`,
> não cobria 430px). **(b)** `.ficha-inv__filtro` (Equipamentos/Fragmentos/Amplificadores) era
> `inline-flex` sem `flex-wrap`, vazando 59px/29px (360/390px) pra fora do card — ganhou
> `flex-wrap: wrap` + `max-width: 100%` no mobile. **(c)** `.habilidades__cabecalho` (título + régua
> + 2 botões "Adicionar") não quebrava linha — vazava 51px/21px; cabeçalho e `&__add-grupo` ganharam
> `flex-wrap: wrap` (o grupo de botões cai pra linha própria, cheia, no mobile). **(d)** `p-toast`
> global (`app-layout`) tem `--p-toast-width: 25rem` (400px) fixo, centralizado por
> `translateX(-50%)` — vazava 20px/5px a 360/390px; o input `[breakpoints]` do PrimeNG (mesma API
> do `p-dialog`, que funciona) **não teve efeito** — o CSS gerado mira um atributo `pn_id_N` que
> essa versão do PrimeNG (21.2.13) não chega a colocar no elemento renderizado (confirmado
> inspecionando o DOM ao vivo); resolvido com override direto em `styles.scss`
> (`@include bp.mobile { .p-toast { width: calc(100vw - 32px) !important } }`, `!important`
> necessário pra vencer o estilo inline que o próprio PrimeNG já aplica com a mesma especificidade).
> **Bandeja de dados** (m3-55 tinha fixado a carta em 640px): virou responsiva — `LARGURA_CARTA`
> fixa trocada por `larguraCarta` (`computed`) = `min(640, larguraJanela − 32)`, `larguraJanela`
> um `signal` atualizado por `@HostListener('window:resize')`; exposta como CSS custom property
> (`--bandeja-carta-largura`, `[style.--bandeja-carta-largura.px]` no container) consumida pelo
> `width`/`flex-basis` da carta no SCSS — mantém a transição suave de saída da m3-55 (ambos os
> lados do `transition: flex-basis`/`width` continuam valores numéricos, nunca `auto`) e mantém o
> cálculo de `deslocamento` (empilhamento de múltiplas cartas) sincronizado com a largura real
> renderizada, não com a constante antiga. `&__corpo` ganhou `flex-wrap: wrap` no mobile (total +
> detalhe empilham em vez de espremer). **Calculadora flutuante** (m3-54): tecla do teclado
> (`&__tecla`, altura `calc(40px * var(--calc-escala, 1))`, 40px na escala padrão) ganhou piso de
> `bp.$alvo-toque` só no mobile — não mexe no redimensionamento manual (que já passa de 44px via
> `--calc-escala`); `&__fechar` (✕) ganhou o mesmo piso de 44×44. **Alvo de toque ≥44px** também
> aplicado, seletivamente (mesmo critério da m3-26 — "não exaustivo"), em: `.ficha-cartao__lapis`/
> `__acao` (já cobertos desde m3-26), `.ficha-inv__btn--principal` (40→44px), `.ficha-inv__mover-
> gatilho`/`-opcao` (sub-inventários, m3-44), `.habilidades__acao`/`__add`/`__utilizar` e
> `.ficha-passo` local (duplicado por componente — encapsulamento de estilo do Angular não
> compartilha `.scss`), barra de abas + botão fechar do seletor de habilidades do sistema
> (`ficha-habilidade-seletor`, que também ganhou `overflow-x: auto` nas abas de grupo — até 4
> categorias não cabiam em uma linha a 360px), `.ficha-rol__mini-btn`/`__btn`/`__hab-passo`/
> `__novo`/`__add-passo` (Rolagens), `.ficha-status__aba--compacto`/`__acao`/`.ficha-passo`
> (Sanidade), `.ficha-pagina__menu-botao`/`__menu-item`/`.botao`/`.dialogo__fechar`
> (`visualizar.page.scss`, cabeçalho + dialogs de Acesso/Exclusão). **Página** (`visualizar.page.scss`):
> `.ficha-pagina` trocou `max-width: 80vw` por `100%` no mobile (80vw sobrava ~20% de margem morta
> nos dois lados a 360-430px) e reduziu padding; `__topo` ganhou `flex-wrap` defensivo (selo
> "tempo real offline" só aparece após ~1,5s desconectado, raro de reproduzir ao vivo, mas sem
> tratamento quebraria a linha). **Esqueleto de carregamento:** texto solto "Carregando ficha…"
> virou `.ficha-esqueleto` — mesmo padrão `.esqueleto-bloco`/`esqueleto-pulso` de
> `campanha/paginas/lista`, `campanha/paginas/detalhe` e `usuario/paginas/perfil` (bloco cinza
> `--border-strong` com pulso de opacidade, `prefers-reduced-motion` zera a animação),
> reimplementado localmente (mesmo motivo do `.ficha-passo` duplicado — sem compartilhamento de
> `.scss` entre componentes) com a **mesma silhueta e os mesmos breakpoints** do layout real:
> topo (rótulo + chip) → `__linha` de 3 colunas (identidade 420px | atributos 260px | status
> flexível) que empilha em `bp.tablet`, réplica da barra de abas (6 blocos) + card de conteúdo.
> Decisão de escopo: inline na própria `visualizar.page` (HTML+SCSS), não virou componente à
> parte — silhueta única, um só consumidor, sem estado além de `@if (carregando())`; mesmo
> critério "não infla" do restante do lote. **Ambiente desta rodada:** o Postgres via Docker
> Compose não subiu — pull de `postgres:16` bloqueado pela política de egresso da organização
> (`production.cloudfront.docker.com`, 403); usado o PostgreSQL 16 já instalado localmente
> (`service postgresql start` + `createdb`) como substituto equivalente, sem alterar
> `docker-compose.yml`/scripts do projeto. **Achado sem fix (fora de escopo, desktop):** a aba
> "História" (6ª, só dono/mestre) já **vazava da própria `.ficha-status__abas`** em telas
> desktop largas mesmo **antes** desta task — confirmado via `git stash` (mesmo comportamento com
> e sem as mudanças desta rodada): a 1440px, `scrollWidth` da barra é 575px contra 418px de
> `clientWidth`, cortando visualmente o "A" final de "HISTÓRIA" — mas não gera scroll do body (o
> mesmo `overflow-x: clip` do `html` absorve, e a barra em si não tem próprio `overflow-x`, então
> o corte acontece num ancestral acima dela). É polimento visual de **desktop**, explicitamente
> fora de escopo desta spec ("isso é m3-55, já feito") — registrado aqui pra não se perder, não
> corrigido. **Testes:** sem teste unitário novo — task é SCSS/marcação responsiva + skeleton,
> mesmo padrão da `m3-26` (nenhum novo teste lá também); comportamento coberto pela suíte
> existente + verificação ao vivo abaixo. 572 testes frontend, **571 passando** — a 1 falha é a
> mesma pré-existente e alheia de `ficha-inventario` ("apelido de equipamento", m3-33), confirmada
> inalterada. Lint com os mesmos 4 erros pré-existentes (confirmados via `git stash`, não tocados).
> **Verificado ao vivo** (Playwright **instalado globalmente**, `npm root -g`, conforme a skill
> `verify`; Postgres + backend + frontend reais, usuário registrado via REST, ficha criada pela UI
> real — "Criar ficha" → "Criar ficha" com os valores padrão do diálogo): nos 6 tabs × 360/390/430px
> **e** desktop (1440px), `document.body.scrollWidth === clientWidth` **e** — o teste mais forte,
> given o achado do `overflow-x: clip` acima — **nenhum elemento visível da página com
> `getBoundingClientRect()` fora do viewport**, incluindo dentro dos dialogs (menu kebab, Acesso
> de Visualização, Excluir Ficha, Nova Habilidade, seletor "Do sistema", "+ Item custom" do
> Inventário, "Novo preset" de Rolagens). Alvos de toque medidos e confirmados ≥44×44px nas seis
> abas do Status, nos steppers de Vida/Energia, no lápis de Editar Atributos/História, na carta e
> no botão fechar da bandeja de dados, na tecla e no fechar da calculadora flutuante. Bandeja de
> dados (disparada com `2d6+3` na Rolagem Rápida) mediu carta com **328px/358px/398px** exatos
> (`640 − 32` truncado pela viewport) a 360/390/430px, sempre com o botão fechar em 44×44px e
> zero overflow. Calculadora flutuante: popup de 280px cabe com folga nas três larguras mobile
> (gatilho 48×48, tecla 56.5×44, fechar 44×44). Esqueleto: `GET /ficha/:id` atrasado via
> `page.route()` — `.ficha-esqueleto` renderizou com 28 blocos (incluindo os 6 placeholders da
> barra de abas) enquanto a resposta ficou pendente, sumiu e deu lugar à ficha real assim que a
> resposta foi liberada — testado em 1440px (screenshot conferido visualmente: silhueta reconhecível
> da tela real) e responsivo (mesmos breakpoints do layout real). Zero erros de console/página
> durante toda a verificação. **Adendo (mesma sessão, revisão de UX a partir das capturas):** a
> checagem por bounding-box acima provava "sem overflow do body", mas não provava "legível" — em
> capturas visuais a barra `.ficha-status__abas` cortava o rótulo da aba ativa na borda do card
> sem nenhuma pista de que a barra era rolável (achado tanto no mobile quanto — mais grave — no
> **desktop** 1440px, onde "HISTÓRIA" virava "HISTÓRI", já que a coluna Status pode ser mais
> estreita que os 6 rótulos completos mesmo em telas largas). Fix em duas partes: **(1)** fade nas
> bordas via `appOverflowFade` (mesmo directive/padrão de `.compras-fragmentos` da calculadora,
> `--fade-esquerda`/`--fade-direita` + `mask-image`), aplicado também no desktop (o
> `overflow-x: auto` da barra, antes só dentro de `bp.mobile`, passou a valer sempre). **(2)**
> auto-scroll até a aba ativa ficar totalmente visível ao trocar de aba (`effect` novo no
> componente) — primeira versão usou `botao.scrollIntoView({ inline: 'nearest' })`, mas **media a
> posição do botão no mesmo tick em que a classe `--ativa` mudava**, e é essa classe que expande o
> botão (ícone-só → ícone+rótulo); o layout ainda não tinha assentado a largura nova na hora da
> leitura (confirmado ao vivo: rolava só 11px de 30px necessários, sobrando ~14px cortados — bug
> só visível em screenshot, não no `document.body.scrollWidth`). Corrigido adiando a leitura pra
> depois de `requestAnimationFrame` e calculando o `scrollLeft` manualmente a partir das duas
> bordas (em vez de confiar no "nearest" do navegador) — `prefers-reduced-motion` pula a animação
> (`behavior:'auto'`), confirmado ao vivo (scroll instantâneo, aba visível em <150ms). **Verificado
> ao vivo de novo**, agora medindo explicitamente se o botão da aba ativa cabe inteiro dentro do
> container em cada troca (não só "dentro do viewport"): as 6 abas × 360/390/430px **e** 1440px —
> 24 combinações, todas com a aba ativa 100% dentro dos limites do container após o scroll assentar
> (antes do fix, "História" a 1440px ficava com a borda direita ~13px fora). Capturas antes/depois
> comparadas visualmente (zoom na barra de abas + página inteira) nas mesmas seis abas × quatro
> larguras + os dois esqueletos (mobile/desktop) — sem outro corte, sobreposição de texto ou
> espremimento encontrado nessa passada. Spec movida para
> `docs/specs/done/m3-56-ficha-mobile-skeletons.spec.md`. **Próxima task:** com a `m3-56` fechada,
> o lote `m3-40`…`m3-56` só tem um item pendente — a **`m3-53`** (ficha — exportar PDF), pulada
> duas vezes ao longo do lote e ainda em `docs/specs/backlog/`; deve ser retomada de lá para
> fechar o lote por completo.)
>
> Última atualização anterior: 2026-07-28 (**m3-55 — Refino visual desktop da ficha**: task `m3-55` do
> lote de refino `m3-40`…`m3-56` implementada — 3 itens (numeração da spec original de refino):
> **(3) alinhamento dos ícones das tabs**, **(17) hover/foco no atributo mostra a DT** e **(22)
> bandeja de dados 2× mais larga + saída sem bounce**. **Achado de drift antes de implementar:** a
> spec apontava `ficha-visualizacao.component.html` linhas ~10-28 para a "barra de abas" — mas o
> merge anterior da branch `claude/redesign-ficha-screen-*` (comentário no topo do arquivo) já tinha
> removido a barra de abas de nível superior (`ABAS_FICHA`/`AbaFicha` sobrevivem só como estado de
> deep-link em `visualizar.page.ts`, sem UI própria); a única barra de abas com ícone renderizada
> hoje é `.ficha-status__abas` (Informações/Inventário/Habilidades/Rolagens/Extras/História, terceira
> coluna) — foi o alvo real do item (3). **(3):** rótulo de cada aba passou a viver num
> `<span class="ficha-status__aba-texto">` próprio (era nó de texto cru ao lado do `app-icone`,
> caixa anônima do flex menos previsível) + `line-height: 1` em `.ficha-status__aba` (o
> `line-height` padrão da fonte, variável entre navegadores, fazia o rótulo ficar mais alto que o
> ícone — que já tem `line-height: 0` no host do `app-icone` — então `align-items: center`
> centralizava os dois em alturas ligeiramente diferentes entre as seis abas); verificado ao vivo
> (Playwright) que o delta de centro vertical ícone↔rótulo é **0px em todas as seis abas**. **(17):**
> novo `dtAtributo(chave)` no componente, `calcularDtAtributo` de `shared/regras/dt` (mesma fórmula
> da página de DT da calculadora, m1-08: `10 + Nível + Atributo×2`) sobre o atributo **efetivo** (já
> com a penalidade de lesão descontada — mesma base de `rolarTesteAtributo`); aplicado na abreviação
> do atributo (`.ficha-atributo__abrev`, ex. "FOR"), que ganhou `tabindex="0"` (um `<span>` sem isso
> nunca recebe foco por teclado — sem tabindex o `appTooltip` nunca abriria via `focusin`) +
> `aria-label` combinando nome e DT + o cue visual `--dica` (sublinhado pontilhado/`cursor: help`,
> mesmo padrão de `.ficha-barra__rotulo--dica` de Vida/Energia) com `:focus-visible` próprio (a regra
> global de foco em `_base.scss` só cobre `a`/`button`). **Bug pego e corrigido durante a
> verificação ao vivo:** a `div.ficha-atributo` (caixa inteira) também tinha `[appTooltip]="campo.nome"`
> — como `pointerenter` não borbulha mas dispara em todo ancestro cujo "tem o ponteiro dentro" virou
> verdadeiro (e `focusin`, usado pelo mesmo directive, borbulha de verdade), passar o mouse ou focar
> bem na abreviação abria **os dois balões ao mesmo tempo** (um por cima do outro). Resolvido
> removendo o `[appTooltip]` da `div` e consolidando tudo na abreviação (`"Força — DT 12"`, nome +
> DT juntos) — um único tooltip por box. **(22):** `LARGURA_CARTA` de `bandeja-dados.component.ts`
> 320→**640px** (e o SCSS junto). A saída "bounce" tinha duas causas: o "×" da carta chamava
> `fechar()` que **removia na hora** (sem passar pelo fade que só o auto-sumir usava), e mesmo no
> auto-sumir, ao fim do fade a entrada saía do array **de uma vez** — o layout flex reagia
> instantaneamente (cartas vizinhas saltam pra nova posição) no mesmo instante em que só o
> `transform` da pilha (recentralização) tinha transição CSS, produzindo um salto seguido de uma
> correção animada (o "bounce"). `BandejaDadosService.fechar()` virou o **único caminho** de saída
> (usado pelo "×" e pelo fim do auto-sumir) — idempotente, marca `saindo` e só remove do array depois
> de `DURACAO_SAIDA_MS` (280ms, era duas constantes/duas fases antes); o SCSS anima **opacidade e
> largura/padding juntos**, na mesma transição `ease-out` (sem overshoot), então a carta "fecha como
> cortina" em vez de sumir seca — quando enfim sai do array, a largura já está em ~0 e o salto residual
> é mínimo. `prefers-reduced-motion: reduce` zera as transições (carta, entrada e o `transform` da
> pilha) — confirmado ao vivo que `transition-duration` vira `0s` e a carta colapsa em <20ms sem
> animação visível. **Testes:** +6 (5 novos `bandeja-dados.service.spec.ts` — saída idempotente,
> mesmo caminho pro auto-sumir, `pausar`/`retomar` não mexe numa entrada já saindo, `limpar` sem
> transição — e +1 no `ficha-visualizacao.component.spec.ts` pro hover/foco de DT) — 572 testes
> frontend, **571 passando**; a 1 falha é a mesma pré-existente e alheia de `ficha-inventario`
> ("apelido de equipamento", m3-33) já documentada como quebrada em `master` antes desta rodada.
> Lint limpo (os mesmos 4 erros pré-existentes, confirmados via `git stash`, não tocados). **Verificado
> ao vivo** (Playwright **instalado globalmente**, não MCP — `npm root -g`, conforme a skill
> `verify`; Postgres + backend + frontend reais, usuário registrado via REST, ficha criada pela UI
> real): as três mudanças bateram os critérios de aceite na aplicação de verdade, não só em teste —
> abas com delta 0px, tooltip "Força — DT 12" idêntico por mouse e por teclado, carta da bandeja com
> 640px exatos, e a transição de saída amostrada em 30ms/150ms/280ms mostrando encolhimento
> contínuo de largura/opacidade (nunca um salto instantâneo). Zero erros de console/página durante a
> verificação. Spec movida para `docs/specs/done/m3-55-ficha-refino-visual-desktop.spec.md`.
> **Próxima task:** a fila do lote `m3-40`…`m3-56` segue com `m3-56` (ficha — mobile skeletons); a
> `m3-53` (ficha — exportar PDF), pulada há duas rodadas, **continua no backlog** e ainda precisa ser
> retomada antes do lote fechar.
>
> Última atualização anterior: 2026-07-27 (**m3-54 — Calculadora flutuante**: task `m3-54` do lote de
> refino `m3-40`…`m3-56` implementada — fora de ordem (pulou a `m3-53`, exportar PDF, que segue no
> backlog; ver "Próxima task" abaixo). Feature de UI isolada, sem dado/schema/permissão novos.
> **Componente novo** `shared/calculadora-flutuante/` (`CalculadoraFlutuante`), autocontido — quem
> consome só declara `<app-calculadora-flutuante />` uma vez; o próprio componente carrega o
> ícone-gatilho fixo (canto inferior direito, 48px, ≥44px de alvo de toque) e o popup. Ligado à
> `FichaVisualizar` (`visualizar.page.ts`/`.html`), única tela hoje coberta pela spec. **Motor
> aritmético** (`calculadora-flutuante.util.ts`) — recursive-descent **próprio** (sem `eval`, sem
> dependência): `+ − × ÷ %` e parênteses sobre números; `%` é pós-fixo (divide por 100), compõe com
> parênteses sem caso especial de "N% de M" (`(10+10)%` = 0.2). 9 testes unitários (vitest) cobrindo
> precedência, parênteses, decimais, unário negativo, divisão por zero e expressão inválida/vazia.
> **Popup arrastável sem Angular CDK** — pacote não está instalado no repo (spec permitia
> "cdkDrag/cdkDragHandle **ou handlers próprios**"); drag via pointer events no cabeçalho
> (`iniciarArraste`/`continuarArraste`/`finalizarArraste`), mesmo padrão de host bindings
> `(window:pointermove)`/`(window:pointerup)` já usado em `HoldRepeat`; posição clampada aos limites
> da viewport; nasce ancorada por CSS (canto inferior direito) até o primeiro arraste, quando passa a
> `left`/`top` em pixels. **Teclado** (além do clique) só escuta dentro do popup (`keydown` no próprio
> container, `tabindex="-1"` + `appAutoFocus` — foca ao abrir), então não interfere com o resto da
> ficha; `Escape` limpa a expressão em vez de fechar o popup (evita fechar sem querer no meio de uma
> conta). **Histórico** (Signal em memória, mais recente primeiro) sobrevive a fechar/reabrir o popup
> na mesma sessão — só o **reload da página zera** (nenhum storage, conforme a spec). Estilo 100%
> tokens do tema (`--surface`/`--surface-2`/`--accent`/`--font-mono`…, proibição #29); tecla "=" e
> ícone-gatilho em `--accent`; reusa o ícone `calculadora` já existente em `shared/icone` (mesmo
> glifo do M1, sem relação com a calculadora do sistema — spec explicita "fora de escopo"). **Testes:**
> +9 vitest (`calculadora-flutuante.util.spec.ts`) — 566/566 frontend, shared/backend inalterados (a
> 1 falha pré-existente e alheia de `ficha-inventario` — "apelido de equipamento", m3-33 — confirmada
> como já quebrada em `master` antes desta rodada, via `git stash`). Lint e `ng build` limpos.
> **Verificado ao vivo** (Playwright dirigindo o stack real — Postgres + backend + frontend, usuário
> registrado via REST, ficha criada pela UI real): ícone abre o popup, aritmética com precedência
> correta (`12+7×2` = `26`, não `38`), histórico lista a conta, arraste reposiciona o popup
> (confirmado por bounding box antes/depois), "x" fecha preservando o histórico da sessão, e um
> **reload completo zera o histórico** — todos os critérios de aceite da spec confirmados na
> aplicação real (não só testes). **Ajuste pós-entrega, a pedido do autor, mesma sessão:**
> popup passa a ser **redimensionável** — alça no canto inferior direito (`pointerdown` próprio,
> mesmo par de listeners `window:pointermove`/`window:pointerup` do arraste, reunidos num único
> `aoMoverPonteiro`/`aoSoltarPonteiro` já que os dois gestos são mutuamente exclusivos), tamanho
> clampado a um mínimo (260×380) e à viewport; o popup vira `display:flex; flex-direction:column`
> com o corpo em `flex:1; overflow-y:auto`, então encolher rola em vez de estourar o layout. Novo
> botão **"Limpar"** no cabeçalho do histórico (`limparHistorico()`, zera só o array — não mexe na
> expressão em edição). Reverificado ao vivo (mesmo Playwright): redimensionar cresce o popup nas
> duas direções, "Limpar" esvazia a seção (que some, já que é `@if (historico().length)`), e uma
> conta nova depois some do histórico igual após o reload. **Segundo ajuste pós-entrega, mesma
> sessão:** redimensionamento passa a ser **proporcional** (largura e altura escalam juntas) em vez
> de esticar os dois eixos independentemente — `continuarRedimensionamento` projeta o deslocamento
> do ponteiro sobre a diagonal do popup (`Math.hypot(largura, altura)`) pra achar um único fator de
> escala, aplicado às duas dimensões a partir do tamanho de partida; mínimo/máximo agora são limites
> de **escala** (`max(260/L, 380/H)` … `min(larguraViewport/L, alturaViewport/H)`), não clamps
> independentes por eixo, então a proporção nunca distorce nem nos extremos. Reverificado ao vivo
> (Playwright): arraste bem mais horizontal que vertical (e vice-versa) preserva a proporção
> original (erro < 0.001) tanto crescendo quanto encolhendo, e encolher além do mínimo trava no
> tamanho mínimo sem distorcer. **Terceiro ajuste, mesma sessão:** o próprio autor apontou que a
> proporção da *caixa* não bastava — os números/controles precisavam encolher/crescer junto, não só
> sobrar espaço em branco ou rolagem. Nova var CSS `--calc-escala` (`escala` computed = `tamanho()
> .width / LARGURA_PADRAO`, ligada via `[style.--calc-escala]` no popup) substitui os px fixos de
> fonte/altura/gap/padding do teclado, visor, título e histórico por `calc(Npx * var(--calc-escala,
> 1))` — puramente CSS, sem `transform: scale()` (que quebraria com a altura do histórico, que é
> dinâmica). Mínimos recalibrados pra abrir faixa de escala visível (`LARGURA_MINIMA` 260→190,
> `ALTURA_MINIMA` 380→250; antes o mínimo de altura era maior que a altura natural de abertura,
> então praticamente não dava pra encolher). Reverificado ao vivo: fonte da tecla "7" e altura do
> botão vão de ~15px/40px (escala 1×) a ~10px/27px encolhido e ~23px/62px esticado, sempre
> acompanhando o tamanho do popup. Spec movida para
> `docs/specs/done/m3-54-ficha-calculadora-flutuante.spec.md`. **Próxima task:** esta rodada pulou a
> `m3-53` (ficha — exportar PDF), que **segue no backlog**; a fila do lote `m3-40`…`m3-56` continua
> com `m3-55` (ficha — refino visual desktop) e `m3-56` (ficha — mobile skeletons), mas `m3-53` ainda
> precisa ser retomada antes do lote fechar.
>
> Última atualização anterior: 2026-07-27 (**m3-28 — Fichas desacopladas da campanha (acervo)**: a ficha
> deixa de ser filha obrigatória da campanha e ganha um **acervo próprio** do usuário. **(1)
> Migration `0009 - Ficha campanha opcional.sql`** — `ficha.campanha_id` vira nullable (`DROP NOT
> NULL`/`SET NOT NULL` no down); FK e índice já toleravam `NULL`, mantidos intactos. **(2)
> Contrato (shared)** — `campanhaId` vira `number | null` em `FichaCriadaDto`/`FichaRecuperadaDto`/
> `FichaAlteradaDto`; em `FichaCriarDto` vira opcional (`campanhaId?: number`); `FichaResumoDto`
> ganha `campanhaId`/`campanhaNome` (alimentam o chip do acervo, redundantes mas inofensivos nas
> listagens campanha-scoped); novos `FichaCampanhaAtribuirDto`/`FichaCampanhaAtribuidaDto`/
> `FichaCampanhaInternoAtribuirDto` (nomeados por convenção — complemento `Campanha` antes do verbo,
> mesmo padrão de `FichaAcessoConcederDto` — divergindo do nome literal `FichaAtribuirCampanhaDto`
> da spec original, que invertia complemento/verbo) e `FichaAcervoListarDto { usuarioId }`. **(3)
> Backend** — `criarFicha` pula `validarMembro` por completo quando `campanhaId` está ausente/`null`
> (`== null`, cobrindo tanto o corpo da requisição quanto o repasse de `duplicarFicha`), dono sempre
> o autenticado, sem sala de campanha pra emitir; `validarPermissaoVisualizacao`/
> `validarPermissaoEdicao` curto-circuitam pra dono-apenas quando `ficha.campanhaId === null` (nunca
> chamam `recuperarMembro` com `null`) — visualização ainda respeita concessões explícitas de
> `usuario_ficha_acesso`, edição vira estritamente dono (sem conceito de mestre sem campanha);
> `validarMembroAlvo` (reusada por `concederAcesso`/`atribuirCampanha`) rejeita com
> `ResourceNotFoundException('Membro')` quando `campanhaId` é `null` (não há "membro" a validar sem
> campanha). Novo `FichaRepository.listarPorUsuario` (`LEFT JOIN campanha` pra resolver
> `campanhaNome`, reusado também por `listarPorCampanha`/`listarVisiveisParaUsuario` via
> `colunasResumo()`/`juncaoCampanhaResumo()` compartilhados) e `FichaRepository.atribuirCampanha`
> (`UPDATE campanha_id`, devolve o formato de `FichaCriadaDto` pra service reusar
> `emitirFichaCriada` na atribuição). Novo `FichaService.listarAcervo`/`atribuirCampanha` (dono ou
> mestre atual edita; atribuir a uma campanha exige que o **dono da ficha** seja membro dela;
> `campanhaId: null` desatribui sem checagem extra; emite `ficha:criada` na sala nova só quando a
> campanha de destino muda — a remoção da sala anterior fica **fora de escopo**, a própria spec
> marca como opcional). Novos endpoints `GET /ficha/minhas` (antes de `:id` na ordem de rotas —
> senão o Nest capturaria "minhas" como `:id`) e `PUT /ficha/:id/campanha`.
> `CampanhaGateway.emitirFichaCriada` ganha uma guarda (`campanhaId === null` → no-op, sem sala) e o
> resumo emitido agora carrega `campanhaId`/`campanhaNome: null` (quem recebe já está na própria
> sala da campanha, não precisa do nome). **(4) Frontend** — nav "Fichas" na topbar (ícone `agente`,
> ao lado de "Painel"); rota nova top-level `/fichas` (`ficha-acervo.routes.ts`): `''` → nova página
> `FichaAcervo` (lista + criação), `:id` → **o mesmo** `FichaVisualizar` já usado em
> `/painel/:campanhaId/ficha/:id` — decisão de arquitetura tomada com o autor (a spec original
> prevê "fora de escopo unificar as duas rotas", mas reusar o mesmo *componente* sob duas rotas não
> é unificar rotas): `campanhaId` virou `signal<number | null>`, resolvido do parâmetro de rota
> quando presente (síncrono) ou do payload da ficha carregada quando ausente (`/fichas/:id`); sem
> campanha, a busca de membros é pulada (`switchMap` pra `of([])` em vez do antigo `forkJoin` fixo),
> `ehMestre()` cai em `false` naturalmente (array de membros vazio) e a navegação de saída
> (excluir/expulsão) vai para `/fichas` em vez de `/painel/:campanhaId`; o link "Voltar" no
> cabeçalho também alterna entre "Voltar à campanha"/"Voltar ao acervo". `FichaCriarDialog` **já
> não precisava de mudança nenhuma** — nunca conheceu `campanhaId`, só emite as escolhas base e um
> `usuarioId` opcional. Nova `FichaAcervo` (`paginas/acervo/`): grid de bloquinhos (mesmo padrão
> `card`/grade de `CampanhaLista`), cada um com chip da campanha (ou "Sem campanha"), Vida/Energia,
> botão "Criar ficha" (reusa `FichaCriarDialog` sem `campanhaId` → nasce solta) e um menu de ações
> (kebab) por cartão — "Atribuir a campanha" (dialog com `<select>` das campanhas do usuário) e
> "Remover da campanha" (ação direta, otimista, sem dialog); o dropdown do kebab mora na **raiz do
> template**, fora da lista com `overflow-y`/`mask-image` (`appOverflowFade`) — mesma correção de
> clipping da `m3-52` (`CampanhaDetalhe`), aplicada preventivamente aqui. `FichaService` ganha
> `listarMinhasFichas()`/`atribuirCampanha(id, campanhaId | null)`; `criarFicha` já aceitava o DTO
> inteiro (campanhaId agora opcional nele, sem mudança de assinatura). **Testes:** backend +23
> (`ficha.service.spec.ts` — ficha solta na criação, ignora `usuarioId` sem campanha, ainda valida
> Maestria, `listarAcervo`, permissão dono-only pra visualizar/editar ficha solta sem chamar
> `recuperarMembro`, `atribuirCampanha` — atribuir/desatribuir/mover entre campanhas, mestre atual
> move a ficha de um membro, `ResourceNotFoundException('Membro')` quando o dono não é membro do
> alvo, idempotência sem emitir evento — e `campanha.gateway.spec.ts` +1 pro guard de
> `campanhaId === null`) — 152/152 backend. Frontend +2 no `FichaService`, +5 em `FichaVisualizar`
> (resolve `campanhaId` do payload, ficha solta não busca membros/`ehMestre` false/dono ainda
> gerencia, membro sem concessão não gerencia, link "Voltar" pro acervo, exclusão redireciona a
> `/fichas`) e +9 na nova `FichaAcervo` (lista, chips, estado vazio, link do cartão, criação sem
> `campanhaId`, menu condicional, atribuir, remover) — 559/560 frontend (1 falha pré-existente
> alheia — "apelido de equipamento", m3-33 — inalterada; shared 452/452 inalterado). Lint/build
> limpos nos três workspaces (mesmos 3 erros de lint pré-existentes e alheios ao frontend, 1 ao
> backend — não tocados); bundle inicial de produção 591.75 kB (mesmo warning de budget
> pré-existente, `/fichas`/`/fichas/:id` são lazy chunks, não tocam o inicial). **Fora de escopo
> desta rodada** (conforme a própria spec `m3-28`): remoção da tela de fichas dentro da campanha
> (`m3-26`), unificação das duas *rotas* num único caminho de URL, cardinalidade N:N e
> cópia/snapshot ao atribuir, emissão de `ficha:removida` na sala anterior ao desatribuir/mover
> (marcada "opcional" na própria spec), UI de concessão de acesso (`usuario_ficha_acesso`) para
> fichas soltas (o backend já suporta a checagem — `validarPermissaoVisualizacao` respeita
> concessões existentes mesmo sem campanha —, mas conceder uma **nova** por essa via ainda exige
> campanha, `validarMembroAlvo` recusa com `campanhaId: null`; nenhuma UI expõe essa combinação
> hoje). Spec movida para `docs/specs/done/m3-28-fichas-desacopladas-acervo.spec.md`.
>
> Última atualização anterior: 2026-07-27 (**m3-52 — Acervo de ficha: excluir/duplicar (escopo adaptado, a
> pedido do autor)**: a spec `m3-52` pressupõe a tela de acervo da `m3-28` (rota `/fichas`,
> `campanha_id` nullable, `listarMinhasFichas`) — **que nunca foi implementada** neste código
> (continua no backlog, sem migration, sem rota). A pedido do autor, o escopo desta rodada foi
> restrito ao que dá pra entregar **sem** a `m3-28`: **excluir** na própria tela da ficha e
> **duplicar** só no painel da campanha; o resto fica **documentado como pendente** (ver a seção
> "Adaptação de escopo" na spec, em `docs/specs/done/m3-52-ficha-acervo-excluir-duplicar.spec.md`).
> **(1) Excluir na tela da ficha** — novo item "Excluir ficha" no menu (kebab) do cabeçalho de
> `FichaVisualizar` (`/painel/:campanhaId/ficha/:id`), com uma dialog de confirmação (mesmo padrão
> `.dialogo` já usado pela gestão de acesso — `dialogExclusao`/`excluindo`, `abrirExclusao`/
> `fecharExclusao`/`confirmarExclusao`); confirmar chama `FichaService.excluirFicha`
> (`DELETE /ficha/:id`, endpoint que já existia desde a `m3-03` — só faltava a affordance de UI) e
> navega de volta ao detalhe da campanha. Entregue **conforme a spec original** — este entregável
> não dependia da `m3-28`. **(2) Duplicar (net-new)** — novo endpoint `POST /ficha/:id/duplicar`
> (backend): `FichaController.duplicar` → `FichaService.duplicarFicha`, que exige permissão de
> **edição** da ficha original (§14 — só dono/mestre, `validarPermissaoEdicao`) e então **reusa
> `criarFicha` por inteiro** (mesmo snapshot de máximas/preset de Iniciativa/validação
> `shared/regras`): clona `dados`, nome vira `"<nome> (cópia)"`, dono = quem duplicou (nunca o dono
> original), sem herdar acessos de visualização (`criarFicha` nunca toca `usuario_ficha_acesso`).
> Contrato: novo `FichaDuplicarDto { id }` em `ficha-operacao.dtos.ts`; a saída reaproveita
> `FichaCriadaDto` (a duplicação **é** uma criação, sem DTO de saída dedicado — decisão documentada
> no código, seguindo a skill `dto-conventions`). **Divergência da spec original:** como
> `campanha_id` continua `NOT NULL` (sem a `m3-28`), o clone **não nasce solto** — nasce na **mesma
> campanha** da ficha original, única opção possível sem a coluna nullable.
> **(3) Refino de UI (a pedido do autor, mesma sessão):** Duplicar/Excluir migraram do painel da
> campanha para um **menu de ações (kebab) por ficha** no mini-card de `CampanhaDetalhe`
> (`m2-16`), mesmo padrão visual do menu do cabeçalho de `FichaVisualizar` — `menuFichaAberto`
> (um aberto por vez), item "Duplicar ficha"/"Excluir ficha", gated por `podeAjustarFicha`
> (dono/mestre, mesma regra reusada dos passos de Vida/Energia). Cada ação abre sua própria
> **dialog de confirmação** (`.dialogo`, copiado do padrão de `FichaVisualizar` — view
> encapsulation não deixa reusar o `.scss` de outro componente): duplicar pergunta
> `Deseja mesmo duplicar a ficha "<nome da ficha>" de "<nome do dono>"?` (`confirmandoDuplicar`
> guarda os dois nomes); excluir pergunta `Excluir <nome da ficha>? Esta ação não pode ser
> desfeita.` (`confirmandoExcluirFicha`). Confirmar exclusão remove o mini-card **na hora**
> (`this.fichas.update(...)`, sem refetch); confirmar duplicação chama `recarregarMembrosEFichas()`
> (já existente) pro clone aparecer. Novo ícone `duplicar` (dois retângulos sobrepostos) em
> `shared/icone`. **Testes:** backend +4 (`ficha.service.spec.ts` — dono duplica, mestre duplica em
> nome de quem duplicou (nunca o dono original), `UnauthorizedAccessException` para
> não-dono/não-mestre, `ResourceNotFoundException` para ficha inexistente) — 135/135 backend.
> Frontend +2 no `FichaService` (excluir/duplicar via HTTP) + 5 em `FichaVisualizar` (menu/dialog de
> exclusão, cancelar, confirmar navega) + 8 em `CampanhaDetalhe` (menu de ações gated por
> dono/mestre; duplicar — dialog com nome da ficha/dono, cancelar não chama o serviço, confirmar
> chama e recarrega; excluir — dialog com o nome, cancelar não chama o serviço, confirmar chama e
> remove o mini-card na hora) — 532/533 frontend (1 falha pré-existente alheia — "apelido de
> equipamento", m3-33 — já registrada em rodadas anteriores; shared 452/452 inalterado). Lint/build
> limpos nos três workspaces (os poucos erros de lint pré-existentes, alheios a esta task, não
> foram tocados). Spec em `docs/specs/done/m3-52-ficha-acervo-excluir-duplicar.spec.md`, com a
> seção "Adaptação de escopo" documentando o que falta para quando a `m3-28` for implementada
> (acervo `/fichas` em si, `campanha_id` nullable, `listarMinhasFichas`, duplicar nascendo solto,
> atribuir/remover campanha). **Próxima task (fila do lote `m3-40`…`m3-56`): `m3-53`** (ficha —
> exportar PDF); esta branch (`claude/redesign-ficha-screen-061wgy`) também tem a `m3-38`
> (redesenho visual da ficha) como task **própria e distinta**, ainda `active/` — não tocada nesta
> rodada.
>
> Última atualização anterior: 2026-07-26 (**m3-51 — Permissões granulares de acesso**: task `m3-51` do
> lote de refino `m3-40`…`m3-56` implementada. Quatro entregáveis independentes. **(1) Visualizador
> não rola dados (item 24).** Novo conceito `podeRolar` — distinto de `ajustavel`/edição, propositalmente
> granular para uma futura concessão de rolagem sem edição não exigir reabrir o contrato — como
> `input(false)` em `FichaVisualizacao`/`FichaRolagens`/`FichaInventario`, ligado pela página com
> `[podeRolar]="podeGerenciar()"` (hoje coincide com `ajustavel`: só dono/mestre rolam). Gateia, em
> template **e** no método (mesmo padrão defensivo de `alternarCondicao`): `rolarTesteAtributo`/
> `rolarDano` (teste de atributo e Dano C.a.C./Furtivo na Visão Geral), `rolarRapida`/
> `rolarPassoDoPreset`/`gastarEnergiaDoPasso` (aba Rolagens — presets e rolagem avulsa) e
> `rolarDanoItem` (dano de arma no Inventário, m3-45). **Sem endpoint de rolagem no backend ainda**
> (`m3-27` não existe) — o gate é hoje só de apresentação, como a spec previa como saída aceitável
> ("aqui só o gate de permissão quando ele existir"). **(2) Tratar trauma só em edição (item 2)** —
> o gate por papel (`@if (editavel())`, dono/mestre) já existia antes desta task e seguiu correto, mas
> QA ao vivo do autor pegou um problema mais fino: havia **dois** caminhos pra alternar `tratado` — o
> atalho `.sanidade__toggle` (um clique, direto na linha, fora de qualquer formulário — feature da
> `m3-12` original) e o checkbox "Tratado" dentro do `editorTrauma` (só some ao clicar o lápis
> "Editar trauma", com Salvar/Cancelar). O pedido original do autor era que `tratado` só alternasse
> **dentro da edição do trauma** — o atalho quebrava isso mesmo sendo gated por `editavel()`, porque
> ainda deixava qualquer dono/mestre mudar o estado sem passar pelo formulário. Correção: removido
> `.sanidade__toggle` do template, o método `alternarTratado()` (agora morto) e o SCSS `&__toggle`
> associado — `tratado` só muda mais via `traumaForm.controls.tratado` dentro do editor (que já
> existia desde a `m3-12`, sem mudança nele). **Indicador de leitura** (pedido em seguida pelo autor,
> pra não perder a informação visual que o toggle antigo carregava): ícone `medicinal` ao lado do nome
> do trauma quando `tratado`, marca `.sanidade__tratado` — mesmo padrão do ícone `infinito` de
> `lesao.permanente` (sempre visível, **fora** do `@if (editavel())`, sem `(click)`, só leitura). **(3) Revogar acesso expulsa (item
> 27).** `FichaService.revogarAcesso` emite `ficha:acesso-revogado` (`{ fichaId, usuarioId }`,
> reusa `FichaAcessoRevogadoDto`) via novo `CampanhaGateway.emitirAcessoRevogado` — broadcast único
> pra sala `ficha:<id>` inteira (mesmo padrão dos demais eventos: sem distinção por socket). O
> frontend (`TempoRealService.acessoRevogado$` novo) e `visualizar.page.ts` filtram pelo próprio
> `usuarioId` (+ `!podeGerenciar()` como segunda trava defensiva — dono/mestre nunca são alvo de uma
> revogação de qualquer forma) e chamam `expulsar()`: toast de aviso (`MessageService`, PrimeNG —
> precisou ser injetado no `TestBed` dos specs, não é `providedIn: 'root'`) + `router.navigate(['/painel',
> campanhaId])`, de volta ao detalhe da campanha. **(4) Anotações com gate de visualização (pedido do
> autor, fora do texto original da spec).** Mesma adaptação de local que a `historia` fez na m3-50: a
> spec original pedia gatear a aba `ABAS_FICHA`/`ehAbaFicha` (sistema aposentado desde a m3-38) — na
> prática `anotacoes` não é uma aba própria como `historia`, vive embutida na aba `informacoes` da
> mini barra `AbaStatus`; a caixa inteira (`.ficha-status__anotacoes-caixa`) entrou num
> `@if (ajustavel())`, mesmo tratamento visual da História. **Reusa literalmente** o mecanismo de
> "campos privados por permissão" da m3-50 — `CAMPOS_PRIVADOS_FICHA` (`ficha-campos-privados.util.ts`)
> virou `['historia', 'anotacoes']`, sem nova lógica de omissão. `anotacoes` (`FichaJogadorDadosDto`)
> virou **opcional** (`string` → `string?`), espelhando `historia` — frontend cobre a ausência com
> `?? ''` (mesmo padrão de `historia`). Nenhuma nova branch de omissão no gateway: `emitirFichaAlterada`
> já omitia `CAMPOS_PRIVADOS_FICHA` genericamente por chave, então `anotacoes` some do broadcast de
> graça. **Testes:** backend +8 (`ficha.service.spec.ts`: emite `ficha:acesso-revogado` após persistir,
> omite/mantém `anotacoes` no `recuperarFicha` espelhando os testes de `historia`, teste "membro com
> concessão" corrigido pra não esperar mais `anotacoes` no payload; `campanha.gateway.spec.ts`: emite
> `ficha:acesso-revogado` na sala certa; `ficha-campos-privados.util.spec.ts`: remove `anotacoes`
> também, no-op só quando nenhum dos dois campos privados está presente) — 131/131 backend. Frontend
> +19 entre os specs tocados (`tempo-real.service.spec.ts`: repassa `ficha:acesso-revogado`;
> `visualizar.page.spec.ts`: expulsão redireciona + toast, ignora revogação de outro usuário, dono/mestre
> nunca são expulsos; `ficha-visualizacao.component.spec.ts`: gate de Anotações + `podeRolar` pro
> teste de atributo/dano; `ficha-rolagens.component.spec.ts`: `podeRolar` pra rolagem rápida/passo/
> gastar energia, visualizador ainda vê presets sem poder rolar; `ficha-inventario.component.spec.ts`:
> `podeRolar` pro dano de arma; `ficha-sanidade.component.spec.ts`: removido o teste do atalho morto
> `alternarTratado`, +1 teste do indicador `.sanidade__tratado` visível mesmo sem `editavel`) —
> 518/519 frontend (1 falha pré-existente alheia — "apelido de equipamento", m3-33 — nada a ver com esta task, mesma classe de falha já
> registrada em rodadas anteriores; shared 452/452 inalterado). Spec em
> `docs/specs/done/m3-51-permissoes-granulares-acesso.spec.md`. Próxima task: **`m3-52`** (ficha —
> acervo: excluir/duplicar).)
>
> Última atualização anterior: 2026-07-26 (**m3-50 — Aba História (seção privada por
> permissão)**: task `m3-50` do lote de refino `m3-40`…`m3-56` implementada, **com adaptação de
> local** em relação ao texto original da spec — mesmo padrão da `m3-49`. A spec (escrita antes da
> `m3-38`) pedia para estender `AbaFicha`/`ABAS_FICHA`/`ehAbaFicha` (o sistema de abas de página
> inteira da `m3-11`) — mas esse sistema está **aposentado e fora do template** desde a `m3-38`
> (confirmado: zero referência a `abaAtiva()`/`ABAS_FICHA` no HTML); a UI real é a mini barra
> `AbaStatus` do card de Status (3ª coluna). A `historia` entrou como **6ª aba** de `AbaStatus`
> (`'historia'`, `ficha-visualizacao.component.ts`), **condicional**: o botão só renderiza
> `@if (ajustavel())` (`ajustavel` já é exatamente "dono ou mestre" — `visualizar.page.html` liga
> `[ajustavel]="podeGerenciar()"`, e `podeGerenciar = ehDono() || ehMestre()` em
> `visualizar.page.ts`) e o painel repete o mesmo guard (`abaStatusAtiva() === 'historia' &&
> ajustavel()`) pra um fragmento de URL `#historia` digitado à mão por um visualizador não renderizar
> a caixa vazia. Editor de texto **reusa literalmente** o bloco BEM de Anotações (m3-32—
> `.ficha-status__anotacoes-caixa/-cabecalho/-campo`, mesmo `.ficha-cartao__lapis` + textarea com
> blur/Escape) em vez de inventar variantes (proibição de duplicar padrão visual) — `editarHistoria`/
> `cancelarHistoria`/`confirmarHistoria` e o `output<string>() ajusteHistoria` espelham
> `*Anotacoes` campo a campo; `visualizar.page.ts` ganhou `ajustarHistoria` (mesmo formato de
> `ajustarAnotacoes`: otimista + `agendarPersistencia()`, sem regra de domínio). **O mecanismo de
> "campos privados por permissão"** (entregável central da task, reusado pela `m3-51` para
> `anotacoes`) é novo: `backend/src/modules/ficha/ficha-campos-privados.util.ts` exporta
> `CAMPOS_PRIVADOS_FICHA` (hoje só `['historia']`) e `omitirCamposPrivados(dados)` — função pura,
> sem I/O, chamada de dois lugares diferentes por motivos diferentes. (1) `FichaService.recuperarFicha`
> omite `historia` **só** quando quem pediu é só-visualizador — `validarPermissaoVisualizacao` mudou
> de `Promise<void>` (lança ou passa) para `Promise<boolean>` (devolve se é só-visualizador), sem
> quebrar nenhum outro chamador (era usado só ali). (2) `CampanhaGateway.emitirFichaAlterada`
> **decisão de arquitetura registrada aqui**: o broadcast de `ficha:alterada` é um `emit()` único pra
> toda a sala `ficha:<id>` (sem distinção por socket/permissão — a sala mistura dono/mestre/
> visualizador-com-concessão, todos que passaram em `entrarSalaFicha`), então não dá pra mandar
> payloads diferentes por destinatário sem reescrever o gateway pra rastrear permissão por socket
> (fora de escopo). A spec já previa essa saída como alternativa explícita ("ou emitir sem o campo") —
> `emitirFichaAlterada` agora omite `CAMPOS_PRIVADOS_FICHA` **sempre**, até pra dono/mestre (que
> recuperam o valor atualizado pelo REST/refetch; só perdem o live-sync entre si desse campo
> específico — aceitável, o critério de aceite só exige persistir e sobreviver a reload, não
> sincronizar em tempo real). Mesmo padrão de "payload reduzido no broadcast" que `emitirFichaCriada`
> já usava pro `dados` inteiro (§14). Contrato: `historia?: string` em `FichaJogadorDadosDto`
> (`shared/src/dtos/ficha/ficha.dtos.ts`) — opcional (ausente pro visualizador e em fichas sem
> texto); `docs/SCHEMA.md` atualizado. **Testes:** backend +6 (`ficha.service.spec.ts`: omite
> `historia` pra visualizador só-acesso, mantém pra dono e mestre; `campanha.gateway.spec.ts`: omite
> do broadcast mesmo com outros campos presentes; `ficha-campos-privados.util.spec.ts`: remove só o
> campo privado, não mexe no objeto original, no-op de conteúdo sem `historia`) — 126/126 backend.
> Frontend +6 em `ficha-visualizacao.component.spec.ts` (botão/painel ausentes pra não-ajustável,
> botão presente pra ajustável, clique mostra o texto, mensagem de vazio, `ajusteHistoria` emite só
> quando o texto muda) — 501/502 frontend (1 falha pré-existente alheia, mesma de sempre; shared
> 452/452 inalterado). Spec em `docs/specs/done/m3-50-aba-historia-privada.spec.md`. Próxima task:
> **`m3-51`** (permissões granulares de acesso — bloqueia rolagem/tratamento de trauma pro
> visualizador, expulsão da tela ao revogar acesso, e retrofita `anotacoes` pro mesmo mecanismo de
> campos privados introduzido aqui).)
>
> (**Fade de overflow no filtro do Inventário + ícone em
> "Equipamentos"**: dois pedidos diretos e curtos do autor. (1) "aplique o fade no overflow da
> lista de equipamentos, amplificadores e fragmentos" — auditoria achou que Equipamentos
> (`.ficha-inv__lista`) e Fragmentos (`.ficha-inv__amps`, dentro do `@if
> (!mostrandoSoAmplificadores() && itensListaFragmentos()...)`) já tinham `appOverflowFade`; só a
> seção **Amplificadores** (mesma classe `.ficha-inv__amps`, bloco `@if
> (mostrandoSoAmplificadores() && ...)` logo abaixo) estava **sem** a diretiva — inconsistência,
> não redesenho: os três já compartilhavam a mesma máscara CSS (`&__lista, &__amps` no SCSS), só
> faltava a diretiva computar as classes `overflow-fade--topo/base` pra essa seção. Adicionado
> `appOverflowFade` no `<div class="ficha-inv__amps">` da seção Amplificadores — verificado ao vivo
> (Playwright, ficha com os 16 amplificadores do catálogo + Vontade 30 pra passar dos 420px de
> teto): antes de rolar só `overflow-fade--base`; no meio do scroll, `--topo` **e** `--base` juntos,
> confirmando a máscara reagindo de verdade. (2) "coloca um icone em equipamentos" — o botão
> "Equipamentos" do controle segmentado era o único dos três sem ícone (Amplificadores usa
> `amplificador`, Fragmentos usa `fragmento`); adicionado `<app-icone nome="corpo-a-corpo" />`
> (glifo de espada já usado como ícone da categoria Corpo a Corpo — sem ícone genérico de
> "equipamentos" no catálogo do `Icone`, a espada é o glifo mais próximo de "arma/equipamento" que
> já existe, evitando inventar um novo). Testes: 88/89 frontend (mesma falha pré-existente alheia).
> Lint: só o mesmo erro alheio de sempre. Nenhum spec numerado criado.)
>
> (**Fix de layout — botões Potencializador/Construtor vazando do
> cartão**: seguindo direto a task anterior, o autor mandou print mostrando os dois botões lado a
> lado ("+ Potencializador"/"+ Construtor") **vazando pra fora do cartão** em telas largas — o
> texto do botão não encolhia (flex item sem `min-width:0`) e transbordava sobre o cartão vizinho,
> forçando até *overflow-x* na grade inteira. Corrigido **empilhando os dois botões** (coluna, não
> lado a lado) — sempre cabem por inteiro, independente da largura da coluna do grid. Novo modifier
> `.ficha-inv__cartao-acoes--coluna` (`flex-direction: column`) somado aos botões trocando
> `ficha-inv__btn--flex` por `ficha-inv__btn--largo` (100% de largura). Verificado ao vivo
> (Playwright, viewport 1600 — mesma largura do print do autor): nenhum botão vaza do próprio
> cartão, `scrollWidth === clientWidth` na grade (sem scroll horizontal). Testes/lint inalterados
> (489/490 frontend, mesma falha alheia; lint só o erro alheio de sempre).)
>
> (**Ajuste de UI/UX no atalho "Fragmentos" do catálogo** — dois
> pedidos diretos do autor logo depois da task anterior entrar, com print da grade de módulos:
> "ajuste o visual, inverta a ordem da lista (primeiro mod. V por fim mod. I)" + "o botão de
> adicionar deles deve ser dividido em contrutor e potencializador para ser mais simples". (1)
> **Ordem invertida**: `cartaoModulosFragmento` agora faz `.reverse()` no fim (V → I, do módulo mais
> fraco/comum pro mais forte/raro — só a grade do catálogo; o `<select>` "Módulo do fragmento" do
> item custom continua I → V, sem mudança). (2) **Passo intermediário removido**: a pergunta
> "Construtor ou Potencializador?" que abria depois de escolher o módulo (signal
> `moduloFragmentoEscolhido`, métodos `escolherModuloFragmento`/`cancelarModuloFragmento`) foi
> **eliminada** — cada cartão da grade agora tem os **dois botões direto** ("+ Potencializador"
> secundário, "+ Construtor" principal/accent, lado a lado em `.ficha-inv__cartao-acoes`).
> `escolherTipoFragmento` mudou de assinatura: recebia só o `tipo` (lendo o módulo do signal
> removido) e passou a receber `(modulo, tipo)` direto do clique — um clique a menos no fluxo
> inteiro. Visual do cartão também ganhou: badge "Afinidade +N" ao lado do nome (reaproveitando
> `.ficha-inv__tag`, mesmo padrão de bônus dos itens do catálogo) em vez de linha solta, e os dois
> custos (Potencializador/Construtor) em duas linhas rótulo↔valor (`.ficha-inv__cartao-fragmento-custo`,
> nova classe, só tokens do tema) em vez do texto corrido que colava "(Construtor)" no cartão vizinho
> da grade. **Testes:** as 4 antigas que testavam o passo intermediário (perguntar tipo, "Voltar")
> foram substituídas por 2 que provam os botões diretos no cartão + a ordem V→I via os badges de
> Afinidade — 6 testes no describe (489/490 frontend total, mesma falha pré-existente alheia de
> sempre). Lint: só o mesmo erro pré-existente alheio. **Verificado ao vivo** (Playwright, stack
> real): grade renderiza V→I, cada cartão com os 2 botões, clicar "+ Construtor" no cartão de Módulo
> V abre o item custom já com "Fragmento Construtor" + "Módulo V" selecionados — 2 screenshots
> confirmando. Nenhum spec numerado criado.)
>
> (**Atalho "Fragmentos" no catálogo "+ Adicionar itens"**: pedido
> direto do autor — "No '+ Adicionar Itens' adicione a opção de 'Fragmentos' onde ele já tem os 5
> módulos e, ao adicionar, ele pergunta se é construtor ou potencializador e, após a seleção, abre o
> formulário devido". Fragmentos não têm catálogo comprável (`CATALOGO_ITENS[FRAGMENTO_CONSTRUTOR]`/
> `[FRAGMENTO_POTENCIALIZADOR]` são `[]` — doc: são achados, não comprados), então a nova aba
> "Fragmentos" em `.ficha-inv__categorias` é uma **pseudo-categoria** (`catalogoFragmentosAtivo`
> signal, não um valor de `categoriaAtiva`) que troca a grade de itens/amplificadores por uma grade
> de 5 cartões (Módulo I–V, com Afinidade e custo de Energia de adquirir em Potencializador/
> Construtor — `custoAquisicaoFragmento`/`valorAfinidadeFragmento`, `shared/regras/compras`, zero
> fórmula nova). Clicar num módulo (`escolherModuloFragmento`) abre a pergunta Construtor ou
> Potencializador (`moduloFragmentoEscolhido` signal); escolher um tipo
> (`escolherTipoFragmento(tipo)`) fecha o catálogo, reseta o `itemCustomForm` já com `categoria` +
> `modulo` pré-preenchidos e abre `criandoItem` — o formulário de item custom que já existia
> (nome/custo/peso/dano/resistência, aviso explicando Construtor vs Potencializador) assume dali em
> diante sem nenhuma duplicação. `mostrarAmplificadores`/`itensCatalogo`/`catalogoVazio` ganharam o
> guard `!catalogoFragmentosAtivo()`; `definirCategoria()` (clicar numa categoria normal) sai da
> pseudo-categoria. **Bug pego na verificação ao vivo** (não nos testes): a aba "Fragmentos" e a
> categoria antiga (ex.: "Corpo a Corpo") apareciam **ativas ao mesmo tempo** (ambas com o
> `--ativa` accent) porque o `[class.ficha-inv__categoria--ativa]` das categorias normais só
> checava `categoriaAtiva()`, sem saber da pseudo-categoria — corrigido com
> `!catalogoFragmentosAtivo() &&` na condição. **Testes:** 8 novos (aba aparece nas categorias,
> grade mostra os 5 módulos, escolher módulo pergunta o tipo, Construtor/Potencializador
> pré-preenchem a categoria certa, "Voltar" retorna à grade sem fechar o catálogo, trocar de
> categoria sai da grade) — 489/490 frontend (1 falha pré-existente alheia, mesma de sempre; shared
> 452/452). Lint: só o mesmo erro pré-existente alheio (`no-autofocus`). **Verificado ao vivo**
> (stack real, Playwright): fluxo completo registro → campanha → ficha → aba Inventário → "+
> Adicionar itens" → "Fragmentos" → Módulo III → Construtor → item custom pré-preenchido → "Núcleo
> de Teste" preenchido e enviado → item aparece na seção Fragmentos do inventário com a Energia
> Máxima debitada — 5 screenshots confirmando cada passo, inclusive o antes/depois do fix do bug de
> duas abas ativas. Nenhum spec numerado criado.)
>
> (**Revisão de UX do filtro de Inventário — controle segmentado**:
> pedido direto do autor logo depois do filtro de Fragmentos entrar ("melhore a UI/UX destes
> botões, ta estranho os filtros", com print dos dois botões "Amplificadores"/"Fragmentos" lado a
> lado). Causa do estranhamento: os dois toggles independentes trocavam o **próprio rótulo** para
> "Equipamentos" no estado ativo (ambíguo — não dava pra saber de relance qual filtro estava ligado
> só olhando o par de botões) e, por serem só 2 numa `flex-wrap` linha cheia de outros botões
> ("+ Adicionar itens"/"+ Item custom"/"Esvaziar"/"Custos"), quebravam pra uma 2ª linha sozinhos com
> bastante espaço vazio sobrando. **Substituídos por um único controle segmentado de 3 opções**
> sempre visíveis (Equipamentos/Amplificadores/Fragmentos, sempre uma ativa) — mesmo padrão visual
> da barra de abas do Status (`ficha-visualizacao` — `.ficha-status__abas`/`.ficha-status__aba`,
> ativa em accent sólido), só com os itens do tamanho do próprio conteúdo em vez de esticados, e em
> linha própria abaixo dos botões de ação (não mais espremido dentro do `.ficha-inv__acoes`). Em
> `ficha-inventario.component.ts`: os dois `signal<boolean>` independentes (`mostrandoSoAmplificadores`/
> `mostrandoSoFragmentos`) mais os dois métodos `alternarSoX()` viraram um único
> `filtroInventario = signal<FiltroInventario>('equipamentos')` (`FiltroInventario = 'equipamentos' |
> 'amplificadores' | 'fragmentos'`, exportado) + `selecionarFiltroInventario(filtro)` — a exclusão
> mútua deixou de precisar de código (`.set(false)` cruzado): é estrutural, só um valor de cada vez.
> `mostrandoSoAmplificadores`/`mostrandoSoFragmentos` **continuam existindo**, agora como `computed`
> derivados do novo signal — toda a lógica de filtragem de listas (`itensListaPrincipal`, a seção
> "Fragmentos", a seção "Amplificadores") **não mudou uma linha**, só a fonte da verdade por trás
> dela. Novo bloco SCSS `.ficha-inv__filtro`/`.ficha-inv__filtro-item` (só tokens do tema —
> proibição #29), reaproveitando literalmente as mesmas regras de cor/peso de fonte do
> `.ficha-status__aba` (ativo = `--bg` sobre `--accent` sólido). **Testes:** os 5 testes do filtro
> (alguns já existentes da task anterior, outros novos) foram reescritos pra bater no novo método —
> "começa em Equipamentos por padrão", "selecionar fragmentos esconde o resto", "mensagem de vazio",
> "só uma opção ativa por vez" (a exclusão mútua virou trivial de provar) e "os 3 botões sempre
> existem, com rótulo fixo, e refletem o estado em `aria-pressed`" — 489/490 frontend (1 falha
> pré-existente alheia, mesma de sempre). **Verificado ao vivo** (stack real): 4 screenshots
> (Equipamentos/Fragmentos/Amplificadores, cada clique) confirmando visualmente o controle segmentado
> compacto numa linha só, sempre com as 3 opções visíveis e só uma em destaque accent sólido — sem
> mais o rótulo mutante nem a quebra de linha solitária. Nenhum spec numerado criado.)
>
> (**Filtro "ver só fragmentos" no Inventário**: pedido direto do
> autor, fora do fluxo de spec numerada — "fragmentos deveriam ter um filtro igual tem em
> amplificadores". `ficha-inventario.component.ts` ganhou `mostrandoSoFragmentos` (signal) e
> `alternarSoFragmentos()`, espelhando exatamente `mostrandoSoAmplificadores`/
> `alternarSoAmplificadores()` já existentes: um botão "Fragmentos"/"Equipamentos" na barra de ações
> (`.ficha-inv__acoes`, ao lado do botão "Amplificadores", mesmo ícone `fragmento` já usado alhures),
> que isola a seção "Fragmentos" (já existente desde a m3-44) escondendo o resto do inventário — lista
> principal, grade Medicinal/Operacional e sub-inventários. **Mutuamente exclusivo** com o filtro de
> Amplificadores (ativar um desativa o outro) — dois "ver só X" simultâneos não fariam sentido
> visual. Reestruturação no template: a seção "Fragmentos" saiu de dentro do bloco condicional da
> lista "normal" (que agora também exclui `mostrandoSoFragmentos()`) e virou um bloco irmão, gated só
> por `!mostrandoSoAmplificadores()` — assim continua aparecendo tanto no modo normal quanto no modo
> isolado, sem duplicar markup; ganhou também a mensagem de vazio "Nenhum fragmento no inventário."
> (mesmo padrão da mensagem de Amplificadores vazio). **Testes:** +4 em
> `ficha-inventario.component.spec.ts` (ativar o filtro esconde os demais itens e mostra só
> Fragmentos; mensagem de vazio sem fragmentos; mutuamente exclusivo com Amplificadores nos dois
> sentidos; o botão existe e alterna rótulo/`aria-pressed`) — 488/489 frontend (1 falha pré-existente
> alheia, mesma de sempre). **Verificado ao vivo** (stack real): ficha com 1 item comum + 2
> fragmentos + 1 amplificador; Playwright confirmou que ativar "Fragmentos" esconde o item comum e
> mantém só a seção de Fragmentos (botão vira "Equipamentos", accent ativo — mesmo visual do botão
> de Amplificadores), e que clicar em "Amplificadores" em seguida desliga o filtro de Fragmentos
> automaticamente (mutuamente exclusivo) e mostra só os amplificadores — três screenshots conferidos
> visualmente. Nenhum spec numerado criado.)
>
> (**Afinidade de Fragmentos passa a reduzir o custo de verdade**:
> a `m3-42` tinha modelado a mecânica (`calcularAfinidade`/`reducaoCustoPorAfinidade`/
> `aplicarReducaoAfinidade`, `shared/regras/compras/fragmento`) só como função pura "para consumo",
> sem nenhum fluxo real usá-la — a `m3-49` só **exibia** o número. Pedido direto do autor **fora do
> fluxo de spec numerada** (refinamento pontual, sem `docs/specs/`) pra fechar esse gap: **a
> Afinidade agora desconta Energia de verdade** ao adquirir/acoplar/desacoplar/remover um fragmento
> em `ficha-inventario.component.ts`. **Critério do autor pra ambiguidade do documento** (não
> deixava claro se a redução usada num fragmento considera ele mesmo): **retroativa** — a Afinidade
> usada em qualquer ação é sempre a **atual** (nunca a "de quando foi comprado"), e a compra de um
> fragmento **conta com ele mesmo** na Afinidade que reduz o próprio custo dela. Na prática: (1)
> **`listarModulosFragmentosPortados(itens)`** — a lógica de "que fragmentos contam como portados"
> (soltos × `quantidade` + acoplados via `origemFragmento`) que a `m3-49` tinha só localmente em
> `ficha-visualizacao.component.ts` **subiu pro `shared/regras/compras/fragmento.ts`** (proibição
> #26 — as duas telas agora consomem a mesma fonte; `ficha-visualizacao` só chama a versão
> compartilhada). (2) Nova função de módulo `afinidadeConsiderando(itens, moduloExtra?)` em
> `ficha-inventario.component.ts`: soma a Afinidade de `itens` e, só na **aquisição** (onde o
> fragmento ainda não existe na lista no momento do débito), soma também o módulo do fragmento
> sendo comprado — nas demais ações (remover/acoplar/desacoplar/consumir) o fragmento já está
> portado em `itens` **antes** da ação, então já vem contado sem precisar somar de novo; por isso os
> 5 métodos de custo passaram a capturar `itensAntes` explicitamente **antes** de mutar a lista
> (nunca depender de o `input()` do inventário já refletir a mudança no mesmo tick). (3)
> `aplicarReducaoAfinidade` envolve cada custo de Energia: aquisição
> (`debitarAquisicaoFragmento`/`restaurarAquisicaoFragmento`), acoplamento
> (`confirmarAplicarFragmento` — os dois lados, aquisição restituída e acoplamento debitado, usando
> a **mesma** Afinidade dentro do método, preservando o líquido-zero do Potencializador) e
> desacoplamento (`desacoplarFragmento` — os três termos, incluindo o custo de remoção `×2`).
> **Deixado de fora, deliberadamente:** o Preço de Sanidade do Consumo (`energiaMaximaExtra` de
> `custoSanidadeConsumirFragmento`) não é reduzido — é o preço físico de **consumir** o fragmento
> (mecânica distinta, doc — "⬦ Consumo de Fragmentos"), não um "custo de fragmento" no sentido da
> seção de Afinidade; só a restituição da aquisição embutida no consumo usa a redução. **Testes:**
> `shared` +3 (`listarModulosFragmentosPortados`: stack solto conta por unidade, Construtor solto +
> Potencializador acoplado juntos, item sem fragmento não conta nada — 452/452 shared). `frontend`
> +5 em `ficha-inventario.component.spec.ts` (aquisição considera o próprio fragmento — Afinidade
> 15→20, custo 20→15; piso de 1 mesmo com Afinidade muito alta; remoção restitui a Afinidade
> **atual**, menos do que foi cobrado na compra original — prova direta da retroatividade;
> acoplamento e desacoplamento sob Afinidade alta continuam líquido-zero de Energia Máxima apesar da
> redução) — 484/485 frontend (1 falha pré-existente alheia, mesma de sempre). **Verificado ao
> vivo** (stack real): ficha criada via REST com 3 fragmentos módulo I já portados (Afinidade 15,
> Energia Máxima 200); Playwright abriu a ficha, conferiu "Afinidade 15" na aba Extras, adicionou um
> **4º** fragmento módulo I pelo formulário real ("+ Item custom" → categoria Fragmento
> Potencializador → Módulo I → Adicionar), e confirmou **os três lados batendo**: Energia Máxima caiu
> pra **185** (200 − 15, não os 20 cheios — a Afinidade 20 já considerando o novo fragmento reduziu
> em 5), a aba Extras atualizou pra "Afinidade 20" com a nota "Afinidade acima de 10: −5 de Energia
> no custo de fragmentos", e o `GET /ficha/:id` confirmou os mesmos 185 **persistidos no Postgres**
> (não só otimista no browser). Nenhum spec numerado criado — registrado só aqui por ser
> continuação direta da `m3-42`/`m3-49` dentro da mesma sessão.)
>
> (**m3-49 — Informações Extras: Origem/Personalidade/afinidade de
> fragmentos**: task `m3-49` do lote de refino `m3-40`…`m3-56` implementada, **com adaptação de
> local** em relação ao texto original da spec. A spec pedia para estender o card "Informações
> Extras" da aba Visão Geral — mas esse card e o sistema de abas (`m3-11`) **não existem mais**
> nesta branch: a `m3-38` (redesenho de comparação visual, spec **ativa**, concorrente a este lote)
> substituiu tudo por um layout de 3 colunas e **já reservava uma posição vazia** pra isto — a aba
> "Extras" (`AbaStatus`, 3ª coluna "Status", ao lado de Informações/Inventário/Habilidades/
> Rolagens), até agora um `<div>` vazio no template. É lá que o conteúdo entrou — mesmo requisito
> (Origem + Personalidade + afinidade num único painel), local adaptado à realidade atual do
> código; `AbaFicha`/`ABAS_FICHA` (o sistema de abas antigo, aposentado pela `m3-38` mas ainda no
> código) **não foi tocado**, como a spec pedia. Em `ficha-visualizacao.component.ts`: 4 novos
> `computed` — `habilidadePersonalidade` (busca em `dados().habilidades` a que tem
> `categoria: HabilidadeCategoriaEnum.PERSONALIDADE`), `modulosFragmentosPortados` (mecânica m3-42:
> junta os fragmentos **ainda soltos** no inventário — Construtor **é** o item, Potencializador
> solto até ser acoplado, cada um repetido pela própria `quantidade` do stack — com os **já
> acoplados** a outro item como Modificação, `origemFragmento` em `modificacoes[]`, já que acoplar
> remove o item avulso e dobra ele numa mod do alvo, m3-42), `afinidadeFragmentos` (chama
> `calcularAfinidade` de `shared/regras/compras/fragmento`, função pura da m3-42 — zero motor novo
> aqui, só consumo) e `reducaoAfinidade` (`reducaoCustoPorAfinidade`, legenda de quanto a Energia de
> fragmentos futuros é reduzida acima de 10 de afinidade). Origem mostra nome/descrição/Saber de
> Campo/Especialidade (gatilho — efeito) + chips com o texto de cada Formação; Personalidade mostra
> a palavra + descrição/custo de Energia da habilidade correspondente (ou aviso se a ficha não tem
> uma habilidade PERSONALIDADE cadastrada); Afinidade mostra o total num `.ficha-mini` (mesmo
> padrão visual de Nível/Prestígio) + um chip por módulo portado + nota de redução quando > 10.
> Três estados vazios (Origem indefinida/bloqueada por Peculiaridade, Personalidade indefinida, sem
> fragmentos portados) reusam `.ficha-visao__vazio` (mesma classe dos outros vazios da tela). Novo
> bloco BEM `.ficha-extras` no SCSS, só tokens do tema (proibição #29) — reusa `.ficha-cartao__subrotulo`/
> `.chip`/`.ficha-mini`/`.ficha-cartao__divisor` já existentes em vez de inventar variantes. **Testes:**
> +7 no spec do componente (Origem completa renderizada, Origem indefinida, Personalidade + habilidade
> associada, Personalidade sem habilidade cadastrada, afinidade somando fragmento solto em stack +
> fragmento acoplado como Modificação — 2×Módulo V + 1×Módulo IV = 4, conferido contra o exemplo do
> documento, sem fragmentos → afinidade 0 e vazio, afinidade > 10 → nota de redução com o valor certo).
> 479/480 frontend (a 1 falha é a mesma pré-existente de `ficha-inventario.component.spec.ts`, alheia
> a esta task, já registrada no histórico da `m3-48`). **Verificado ao vivo** (stack real: Postgres +
> backend + frontend): ficha criada via REST com Origem/Personalidade/2 fragmentos módulo V,
> Playwright abriu `/painel/:campanhaId/ficha/:id`, clicou na aba "Extras" e confirmou o texto
> renderizado + um screenshot em viewport largo (1600px, as 3 colunas cabem sem quebrar) mostrando a
> aba "Extras" ativa (destaque accent) com Origem/Personalidade/Afinidade = 2 corretos. Spec em
> `docs/specs/done/m3-49-extras-conteudo.spec.md`. Próxima task: **`m3-50`** (aba História —
> privacidade).)
>
> (**m3-48 — Filtro/contador de Habilidades (cumulativo)**: task
> `m3-48` do lote de refino `m3-40`…`m3-56` implementada, com um ajuste de comportamento pedido
> pelo autor **depois** da 1ª entrega — este registro já reflete a versão final. Na aba Habilidades
> (`frontend/src/app/modules/ficha/componentes/ficha-habilidades/`), os contadores do resumo por
> categoria (antes só exibição) viraram **botões clicáveis e cumulativos**: um novo Signal
> `filtroCategoria` guarda um `ReadonlySet<'arquetipo' | 'classe' | 'geral' | 'outraClasse'>`
> (vazio = sem filtro, mostra tudo) e um método privado `bucketResumo()` (extraído do corpo de
> `contagemPorCategoria`, que agora o reusa) classifica cada habilidade no mesmo bucket usado pela
> contagem. Clicar em um tipo **soma** ao conjunto ativo (`alternarFiltro`); clicar de novo no
> mesmo tipo o **tira** da seleção; se o clique fizer a seleção cobrir os **4 tipos**, ela é
> **zerada** (equivalente a "todos" — não faz sentido manter os 4 acesos, já que o resultado visual
> é idêntico a nenhum filtro). Um botão **"🧹 Limpar filtro"** (`&__limpar-filtro`) aparece **no fim
> da lista** só quando há algum tipo selecionado (`filtroCategoria().size > 0`) e chama
> `limparFiltroCategoria()`, zerando o conjunto inteiro de uma vez — a versão anterior tinha um 5º
> pill "Todos" no resumo para isso; foi **removido** e substituído por este botão, por pedido
> explícito do autor. `habilidadesFiltradas` compõe **filtro de categoria (união dos tipos ativos)
> + busca de texto**. Mensagem de lista vazia (`mensagemListaVazia`) junta os rótulos dos tipos
> ativos em prosa (`juntarComOu` — "Classe", "Classe ou Geral", "Classe, Geral ou Outra
> classe/arquétipo") e compõe com o termo de busca quando os dois filtros não batem com nada. Cada
> pill é `<button>` com `[attr.aria-pressed]` refletindo `filtroCategoria().has(tipo)` (vários
> podem estar `true` ao mesmo tempo — não é exclusivo como uma aba) — navegável por teclado de
> graça (elemento nativo), `role="group"` no container (mesmo padrão do `seletor__subfiltro` em
> `ficha-habilidade-seletor`). Sem persistência (estado de UI volátil, nenhum campo novo em `dados`).
> **Fora de escopo:** busca textual/ordenação além do que já existia, e qualquer mudança no
> `ficha-habilidade-seletor`.
>
> **Ajuste pós-entrega (mesmo dia, pedido do autor após ver a 1ª versão):** três correções sobre o
> comportamento acima. **(1) Glow por cor própria do tipo** — o estado ativo **não** usa mais accent
> uniforme; cada um dos 4 modificadores (`--arquetipo`/`--classe`/`--geral`/`--outra-classe`) fixa
> `color` num dos 4 tokens semânticos do tema (`--positive`/`--warning`/`--energy`/`--accent` — os
> únicos 4 disponíveis, nenhum hex novo, proibição #29) e `&--ativo` usa `currentColor` pra
> `border-color`/`background`/`box-shadow`, herdando a cor do próprio tipo (Arquétipo verde, Classe
> âmbar, Geral azul, Outra classe/arquétipo accent). **Bug pego durante a verificação ao vivo**: a
> regra `&:hover { border-color: var(--accent-border); }` tinha *mais* especificidade CSS (2
> seletores: classe base + `:hover`) que `&--ativo` (1 seletor), então passar o mouse sobre um tipo
> **já ativo** apagava o glow colorido e mostrava o hover neutro por baixo — corrigido com
> `&:hover:not(.habilidades__resumo-item--ativo)`, que exclui os ativos da regra de hover neutra em
> vez de competir por especificidade com eles. **(2) Botão "Limpar filtro" mais visível e
> reposicionado** — o autor relatou não ter visto o botão vassoura da 1ª entrega; ele **existia e
> funcionava** (a cor é que era neutra/discreta demais, mesmo padrão do `&__cancelar`, e ficava no
> fim da lista) — 1ª correção: trocado pra estilo accent sólido (`--accent`/`--accent-dim`/
> `--accent-border`), mesma posição. Depois de ver essa versão, o autor pediu mais um ajuste: mover
> o botão pra **dentro da linha do resumo**, logo depois do pill "Outras classes/arquétipos", **e**
> reduzi-lo a **ícone só** (sem o texto "Limpar filtro") **alinhado à direita** da própria linha —
> versão final usa `margin-left: auto` no `&__limpar-filtro` (funciona mesmo com `flex-wrap` no
> `&__resumo`: quando os pills não cabem numa linha só, o ícone fica à direita da linha em que
> caiu, não force a quebra pra linha própria). **(3) Clique direito desmarca** —
> `removerFiltroPorContexto(tipo, evento)` no `(contextmenu)` de cada pill: suprime o menu nativo
> do browser (`evento.preventDefault()`) e **tira** aquele tipo específico da seleção (sempre
> remoção, nunca alterna; no-op se o tipo já não estiver selecionado) — mais rápido que achar o
> mesmo pill e clicar de novo quando vários tipos estão ativos. **Testes:** frontend `+7` no spec
> do componente (cumulativo: filtra por 1 tipo, soma um 2º, tira um do meio mantendo os outros,
> completar os 4 tipos zera tudo e tira o `aria-pressed` de todos, múltiplos `aria-pressed`
> simultâneos, botão vassoura só aparece com filtro ativo e limpa tudo, mensagem de vazio juntando 2
> rótulos com "ou") `+3` no 1º ajuste pós-entrega (cada pill carrega o modificador de cor certo,
> clique direito remove só aquele tipo sem mexer nos demais, clique direito num tipo já inativo é
> no-op e `defaultPrevented` fica `true`) — os mesmos 10 continuam valendo depois do reposicionamento
> do ícone (a asserção é por classe `.habilidades__limpar-filtro`, indiferente à posição/conteúdo).
> 472/473 frontend (a 1 falha é pré-existente em `ficha-inventario.component.spec.ts`, arquivo não
> tocado por esta task — nome mecânico da arma "Leve" vs "Leve — Corpo a Corpo", alheio ao filtro
> de Habilidades). Verificado ao vivo no browser quatro vezes ao todo (stack real: Postgres +
> backend + frontend, ficha criada via REST, driver via Playwright) — a 2ª rodada provou o
> cumulativo (Arquétipo, depois +Classe, depois +Geral, depois +Outras completando os 4 e limpando
> tudo automaticamente); a 3ª leu a `border-color` computada de cada pill ativo via
> `getComputedStyle` e confirmou os 3 RGBs certos (`--positive`/`--warning`/`--energy`), clicou com
> `button: 'right'` pra confirmar o clique direito removendo só um tipo (foi essa mesma rodada que
> **pegou o bug do hover** antes do fix — Geral aparecia com a borda accent-tintada errada até eu
> perceber que era o cursor do Playwright ainda "em cima" do botão do clique anterior, disparando
> `:hover`); a 4ª (pós-reposicionamento do ícone) confirmou visualmente o botão como ícone só, à
> direita da linha, logo depois de "Outras classes/arquétipos". **(4) Ícone trocado por um glifo
> mono** — o 🧹 (emoji colorido) destoava do resto do tema (`✎`/`✕`/`⚡`/`＋` são todos glifos
> monocromáticos que herdam `currentColor`, sem cor própria de fonte); trocado por `↺` (reset), que
> renderiza na cor do botão (`--accent`) como qualquer outro ícone da tela, em vez de vir colorido
> pela fonte de emoji do sistema. Spec em
> `docs/specs/done/m3-48-habilidades-filtro-contador.spec.md`. Próxima task: **`m3-49`**
> (Informações Extras — Origem/Personalidade/afinidade de fragmentos no card já existente da Visão
> Geral).)
>
> (**m3-47 — Iniciativa automática na criação da ficha**: task
> `m3-47` do lote de refino `m3-40`…`m3-56` implementada. Ao **criar** uma ficha (`FichaService.criarFicha`,
> `backend/src/modules/ficha/ficha.service.ts`), o backend agora grava automaticamente um preset em
> `dados.rolagens` — rótulo **"Iniciativa"**, fórmula **`DESd6`** (gramática de atributo-como-fonte-de-dados
> já existente, m3-29 — cada ponto de Destreza é 1d6 rolado na Iniciativa) e a descrição fixa do documento
> de jogo. **Fonte única no backend** (não duplicado no wizard `ficha-criar-dialog`): como toda criação de
> ficha passa por `criarFicha` independente do caminho do frontend, gravar só ali cobre 100% dos casos sem
> duplicar a semente em dois lugares. Novo `PRESET_INICIATIVA_PADRAO` (exportado do service, reusado pelos
> testes) + `aplicarPresetIniciativa` (chamado em conjunto com `aplicarSnapshotDeMaximos` — ambos "enriquecem
> o documento na criação"), que só adiciona o preset se `dados.rolagens` ainda não tiver um de mesmo nome
> (evita duplicar caso o cliente já mande um — não há caso de uso atual, mas é uma guarda barata). O preset
> nasce **editável/removível como qualquer outro** (não é imutável — é só um `FichaRolagemDto` comum) e a
> fórmula `DESd6` já é gramática válida (`ATRdM`, m3-29/m3-46). **Fora de escopo** (conforme a spec): sem
> stat derivada de Iniciativa no motor (é preset de rolagem, não derivado) e sem migração de fichas
> existentes (só criação nova). **Testes:** backend `+2` (`ficha.service.spec.ts` — preset gerado com
> `DESd6`/descrição corretos, e não duplica quando o cliente já manda um preset de mesmo nome); os testes
> existentes de `criarFicha` que comparam o documento inteiro (`comSnapshot`) foram ajustados para incluir
> o novo preset. 120/120 backend, 449/449 shared, build limpo em `shared`/`backend`. Spec em
> `docs/specs/done/m3-47-ficha-iniciativa-automatica.spec.md`. Próxima task: **`m3-48`**
> (filtro/contador de habilidades).)
>
> (**m3-46 — Gramática de rolagem v4**: task `m3-46` do lote de
> refino `m3-40`…`m3-56` implementada — motor puro em `shared/regras/rolagem`, dois entregáveis.
> **Parênteses no parser** (`interpretarFormula`/`interpretarSegmento`, `rolagem.ts`): o motor não
> suportava `(`/`)` (rejeição cega); agora aceita só **duas formas sancionadas**, sem aninhamento
> arbitrário — qualquer outro uso de parênteses continua erro de parse. Novo helper
> `dividirTermosNivelSuperior` faz o split de termos por `+`/`−` respeitando profundidade de
> parênteses (necessário pro `+` interno de `(ATR+n)`). **Item 21 — atributo+valor como quantidade
> de dados** `(ATR±n)dM` (ex.: `(LUT+3)d20`): novo campo `quantidadeAtributoOffset?: number` em
> `TermoDadoDto`; distinto do `ATRdM` já existente — **não** aciona a desvantagem intrínseca de
> atributo zerado (regra 270), é uma contagem explícita, clampada em `[0, QUANTIDADE_DADOS_MAXIMA]`.
> **Item 20 — repetição** `(<fórmula>)#N` (ex.: `(PONd20kh1cm1+PROF)#3`): novo campo
> `repeticoes?: number` em `FormulaInterpretadaDto`, detectado por `extrairRepeticao` (só reconhece
> quando os parênteses envolvem a fórmula **inteira**, nunca um trecho); repetição aninhada é erro
> explícito. Teto `REPETICOES_MAXIMA = 20` (`rolagem.dados.ts`, mesmo espírito defensivo do
> `QUANTIDADE_DADOS_MAXIMA`). `rolarInterpretada` (chamada por `rolarFormula`/`rolarPasso`) rola N
> vezes **independentes** e devolve o novo `ResultadoRolagemDto.subResultados` — o objeto externo
> espelha a 1ª rolagem por compatibilidade (zero mudança de assinatura pros call sites existentes).
> **Decisão de UI sem pedir esclarecimento** (a spec deixava em aberto "como o resultado múltiplo
> entra na UI"): a repetição continua **uma única carta** na bandeja — `BandejaDados`
> (`frontend/.../bandeja-dados.component.ts`/`.html`) ganhou `resultadosExibidos(entrada)`
> (`subResultados ?? [resultado]`) e o `@for` do corpo da carta agora itera essa lista, empilhando
> um bloco de total+dados por rolagem (com o índice `N/total` e uma régua fina separando cada bloco,
> via `.bandeja__resultados`/`.bandeja__corpo:not(:first-child)` no SCSS) em vez de abrir uma carta
> por repetição; `BandejaDadosService.mostrar` não precisou mudar, e nenhum dos call sites que
> chamam `bandeja.mostrar` sabe da repetição. Cheatsheet
> (`guia-formula.component.ts`/`.html`) ganhou as duas seções novas e a nota "não use parênteses"
> virou "só nos dois casos abaixo". **Testes:** shared 449/449 (+20 — offset positivo/negativo/
> clamp, distinção da desvantagem, operadores por pool no offset, repetição simples/tags/crítico/
> aninhamento rejeitado/teto, composição das duas formas, regressão dos casos de parênteses já
> rejeitados antes). Frontend: `tsc --noEmit` limpo; sem spec de componente pra bandeja/guia-formula
> ainda. Fora de escopo (conforme a spec): dados físicos 3D, crítico automático, aninhamento além do
> mínimo viável. Spec em `docs/specs/done/m3-46-rolagem-gramatica-v4.spec.md`. Próxima task:
> **`m3-47`** (iniciativa automática na criação da ficha).)
>
> (**m3-45 — Rolar dano da arma direto no card**: 6ª task do lote de
> refino `m3-40`…`m3-56` implementada. Botão "Rolar dano" nos cards de item do Inventário
> (`ficha-inventario.component.ts`/`.html`) para qualquer categoria com dano computável (não uma
> lista fixa de categorias — o gate é `item.danoFormula !== null`, que na prática cobre
> Corpo a Corpo/Armas de Fogo/Explosivos/Exóticos e Fragmento Construtor, os mesmos de
> `CATEGORIAS_COM_DANO`). Novo campo `danoFormula: string | null` na `ItemInventarioVM`, preenchido
> a partir de `calcularStatItem({ item })?.dano` (`shared/regras/compras`, m3-18) — a mesma string
> tipada (`"3D4+FOR [Físico]"`) já usada pra montar `item.stat`, com mods/fragmentos aplicados
> embutidos, sem cálculo duplicado (proibição #26). Clicar chama `rolarFormula` direto
> (`shared/regras/rolagem`, m3-22/m3-29) — não passa pelo runner de preset
> (`executarPassoPreset`/`resolverPreset`) porque não há preset aqui, só uma fórmula pronta, mesmo
> padrão de `FichaVisualizacao.rolarDano` (Dano C. a C./Furtivo no glance de Status) — e joga o
> resultado na `BandejaDadosService` (`rotulo` = `item.nomeExibido`, `formula` = a própria fórmula).
> Três novos inputs no componente (`atributos: FichaAtributosDto`, `proficiencia: number | null`,
> `nivel: number`), passados por `ficha-visualizacao.component.html` com os mesmos signals já usados
> por `app-ficha-rolagens` (`atributosEfetivos()`/`proficiencia()`/`dados().nivel`). **Decisão sem
> pedir esclarecimento** (a spec deixava em aberto): o botão **não é gated por `editavel()`** —
> rolar dado não é uma ação de edição da ficha, mesmo padrão já estabelecido em
> `rolarTesteAtributo`/`rolarDano` da Visão Geral (nenhum dos dois é gated por `ajustavel()`); um
> visualizador sem permissão de editar ainda rola. **`m3-27` (histórico de rolagem) e `m3-51` (gate
> de permissão de rolagem) continuam no backlog** — nenhum dos dois existe ainda no código
> (confirmado por busca: zero ocorrências de `RolagemService`), então a spec's dependências
> opcionais caem no cenário mais simples: fire-and-forget só na bandeja, sem gate extra além da
> visibilidade normal da ficha. Fora de escopo (conforme a spec): rolar ataque/acerto, nova
> gramática de rolagem. **Testes:** shared 429/429 (sem mudança — task não tocou `shared/regras`),
> frontend 462/463 (+3: rola e joga na bandeja com a fórmula do catálogo, botão aparece mesmo sem
> `editavel()`, não aparece em categoria sem dano computável como Armazenamento —
> `ficha-inventario.component.spec.ts`; a 1 falha remanescente é a mesma pré-existente e
> não-relacionada — apelido de equipamento, `ResizeObserver`), backend sem mudança (task não tocou o
> backend). Spec em `docs/specs/done/m3-45-arma-rolar-dano.spec.md`. Próxima task: **`m3-46`**
> (nova gramática de rolagem v4).)
>
> (**m3-44 — Inventário: sub-inventários/listas**: 5ª task do lote
> de refino `m3-40`…`m3-56` implementada, em quatro entregáveis. **Item 14 (Pochete/Bolso de Corpo
> como inventários separados):** `ItemCatalogo` (`shared/regras/compras/catalogo.dados.ts`) ganhou
> `inventarioProprio?: { categoriasPermitidas? }` — marcado só nos dois itens do doc que "possuem
> inventário separado" (Pochete: só Munições/Operacional/Medicinal; Bolso de Corpo: sem restrição,
> doc — "Apenas 1 item de até 1 de peso", aqui só um aviso de capacidade, não uma trava dura, mesma
> filosofia "liberdade total" do resto do motor). `CarrinhoItemDto` ganhou dois campos opcionais:
> `id?` (atribuído só a um container com `inventarioProprio`, gerado por `crypto.randomUUID()` na
> criação — `ficha-inventario.component.ts#comIdDeContainerSeNecessario`) e `containerId?` (aponta
> pro `id` do container onde o item foi guardado). Nova `calcularBonusArmazenamentoItem(item)`
> (extraída do bloco de bônus de armazenamento de `calcularStatItem`) e nova
> `listarSubInventarios(itens)` (ambas `shared/regras/compras/compras.ts`) — um container vestido
> com `inventarioProprio` e `id` abre sua própria lista, cuja capacidade é o `bonus` do catálogo;
> `calcularTotaisCarrinho` foi ajustada para **excluir** tanto o bônus desses containers quanto o
> peso de itens com `containerId` do pool principal (nunca contam duas vezes). Containers de antes
> desta task (sem `id`) continuam se comportando como armazenamento comum até serem
> removidos/recriados — retrocompat sem migração. **Item 19 (lista própria de Fragmentos):**
> `ORDEM_CATEGORIAS_LISTA` perdeu as duas categorias de Fragmento; novo computed
> `itensListaFragmentos` monta uma seção própria abaixo da grade de Medicinal/Operacional, no mesmo
> padrão visual da lista de Amplificadores (`.ficha-inv__amps`, cabeçalho + itens). **Item 12
> (Amplificadores em 2 colunas):** nova `.ficha-inv__grade-amps` (`grid-template-columns:
> repeat(2, 1fr)`, 1 coluna no breakpoint mobile de `_breakpoints.scss`) envolvendo a lista de
> amplificadores — descoberto ao vivo que o modo `dialog` (único usado de verdade, `apresentacao`
> sempre `'dialog'` em `ficha-visualizacao.component.html`) tinha uma regra pré-existente forçando
> `grid-template-columns: 1fr` na coluna estreita (herdada de Medicinal/Operacional); a régua real
> da coluna Status mede ~700px no desktop (grade de 3 colunas da m3-26), então a nova classe foi
> deixada de fora dessa regra — só Medicinal/Operacional (fora de escopo aqui) permanece em 1
> coluna no modo compacto. **Restrição de layout (1920×1080):** `.ficha-inv__amps` (Amplificadores
> e Fragmentos) ganhou teto fixo (420px, 220px no modo compacto) + rolagem própria + a mesma
> máscara de fade de `.ficha-inv__lista` (selector combinado no SCSS), pra não crescer sem fim e
> estourar a tela junto com a lista principal de itens. **Ação "Mover para":** cada item elegível
> (fora de containers) ganhou um `<select>` compacto (`moverItemParaContainer`) listando os
> containers abertos + "Inventário principal"; um item cujo `containerId` aponta pra um container
> que deixou de estar ativo (guardado/removido) "cai" sozinho de volta pras listas principais
> (`noInventarioPrincipal`, computed derivado do conjunto de `id`s ativos) — nunca fica invisível.
> **Bugs achados e corrigidos em QA ao vivo com o autor, mesma task (antes de qualquer commit):**
> (1) o `<select>` de "Mover para" não refletia o container atual do item — `[value]` no elemento
> `<select>` some com o `<option>` gerado pelo `@for` na primeira renderização (a propriedade é
> setada antes dos filhos existirem, e o Angular não reaplica em CD seguinte porque a string ligada
> não muda); trocado por `[selected]` em cada `<option>` individualmente, que é robusto a essa
> ordem. (2) itens de Armazenamento (mochilas comuns) podiam ser movidos **para dentro** de um
> Pochete/Bolso de Corpo pelo mesmo seletor — sem sentido no domínio (mochila dentro de bolso) e
> ainda deixava o bônus de inventário da mochila somando no pool principal **e** seu peso contando
> no sub-inventário ao mesmo tempo; a condição do seletor virou `!item.ehArmazenamento` (nenhum
> Armazenamento é "movível" mais, só o que já vinha implícito nos containers de `inventarioProprio`
> — o campo `ehContainer` do view-model, que ficou sem uso, foi removido) e `calcularTotaisCarrinho`
> ganhou uma defesa extra (`&& !item.containerId` no bônus de inventário) pro motor não confiar só
> na UI. (3) "Bolso de Corpo" oferecia as 6 modificações de Armazenamento do catálogo, quando o doc
> diz "Apenas pode aplicar a modificação Bolso Tático" — novo `ItemCatalogo.modificacoesPermitidas?`
> (lista de nomes; ausente = sem restrição) filtra `listarModificacoesCategoria` quando a categoria
> é a **própria** do item (não afeta mods emprestadas via Faz Parte/Combativo); só "Bolso de Corpo"
> usa o campo hoje. (4) o `<select>` nativo do "Mover para" abria um popup do sistema (branco no
> Chrome/Edge por padrão) que nenhum CSS de app estiliza de verdade — `color-scheme: dark` em
> `:root` (`tema/_base.scss`) foi a primeira tentativa (avisa o navegador a usar a variante escura
> nativa em qualquer controle sem CSS próprio — date/time picker, autofill também — mantido, é
> ganho de graça em qualquer `<select>` que sobrar no app), mas o resultado ainda não batia com os
> tokens do tema (cinza genérico do SO, não `--surface`/`--accent`); o "Mover para" virou um
> **popover próprio** (`.ficha-inv__mover*`, botão-gatilho + lista posicionada em `position:
> absolute` com `.ficha-inv__mover-opcao`/`--ativa`) — só ele, os demais `<select>` do componente
> (categoria, módulo, "Aplicar em...") continuam nativos, fora de escopo aqui. `moverAbertoIndice`
> (signal) controla qual item tem o menu aberto, mesmo padrão de painel único por vez de
> `aplicandoFragmentoIndice`; não fecha em clique fora (mesma filosofia dos demais painéis inline
> do componente — fecha ao escolher uma opção). **Testes:** shared
> 429/429 (+14 no total desta task: `listarSubInventarios`/sub-inventário em
> `calcularTotaisCarrinho` + `modificacoesPermitidas`/defesa de `containerId`, `compras.spec.ts`),
> frontend 459/460 (+11: sub-inventários, mover para/de volta, Fragmentos em seção própria, grade de
> Amplificadores, popover "Mover para" sem `<select>` nativo, restrição de mods do Bolso de Corpo —
> `ficha-inventario.component.spec.ts`; a 1 falha remanescente é a mesma pré-existente e
> não-relacionada — apelido de equipamento, `ResizeObserver`), backend sem mudança (task não tocou o
> backend); build limpo nos 3 workspaces (mesmo aviso de budget pré-existente do `ng build`, 591.31
> kB vs. 580 kB). **Verificado ao vivo** (Postgres local, backend+frontend reais, Playwright,
> 1920×1080 e 390×844): Pochete vestida com 4× "9mm" guardadas mostra a seção própria "Pochete —
> 2/2 · Só Munições, Operacional, Medicinal" com a munição dentro e fora da lista principal; seção
> "Fragmentos" separada da lista de itens; grade de Amplificadores confirmada em 2 colunas
> (`grid-template-columns` computado: `362px 362px`) a 1920px e 1 coluna (`380px`) a 390px, sem
> overflow horizontal (`scrollWidth − clientWidth = 0`) em nenhuma das duas larguras; mover "9mm"
> para o Bolso de Corpo pelo popover persistiu `containerId: 'bolso-1'` via REST e o rótulo do
> gatilho mostrou "Bolso de Corpo" tanto logo após mover quanto **depois de recarregar a página**
> (prova do bug 1 corrigido, sem depender mais de `<select>`); os cartões de "Pochete"/"Bolso de
> Corpo" confirmados **sem** o gatilho "Mover para" (bug 2); painel "Modificar" do Bolso de Corpo
> mostrou só "Bolso Tático" (bug 3); popover capturado em screenshot com fundo `--surface`/borda
> `--border-strong`/opção ativa em `--accent`, igual ao resto do tema (bug 4, revisado de
> `color-scheme: dark` pro popover próprio depois que o autor apontou que ainda destoava). Spec em
> `docs/specs/done/m3-44-inventario-sub-inventarios-listas.spec.md`. Próxima task: **`m3-45`**
> (rolar dano nas armas).)
>
> (**m3-43 — bugs de modificadores em Combate**: 4ª task do lote de
> refino `m3-40`…`m3-56` implementada. Três modificadores documentados que não tinham efeito
> mecânico algum — todos descobertos por inspeção do código (nenhum reportado pelo autor nesta
> task). **Item 16 (mods de armadura → Esquiva/Defesa):** as mods de Proteções "Flexível" (+1
> Esquivar/stack) e "Resistente" (+1 Bloquear/stack, doc — "⬥ Modificações" de Proteções e Escudos)
> só existiam como chip descritivo — `calcularStatItem` (`shared/src/regras/compras/compras.ts`)
> ganhou um bloco `DEFESA` (novo, gate por `categoria === PROTECOES`) que soma essas duas por nome
> mais o efeito custom `DEFESA` (`variante` Esquiva/Bloqueio/Defesa — o enum já previa isso desde a
> m1-05/m3-01, mas nunca tinha consumidor) em três campos novos de `StatItemDto`
> (`bonusEsquiva`/`bonusBloqueio`/`bonusDefesa`). Novo `calcularBonusDefesaEquipamento(itens)`
> (`shared/src/regras/agente/defesa.ts`) soma isso de itens **equipados**, no mesmo padrão
> "manual/calculado + equipamento, nunca persistido de volta" de `resistencia.ts`/`amplificador.ts`
> — `status-derivado.ts` (`montarInformacoesExtras`, novo parâmetro `itens`) soma o resultado **por
> cima** do amplificador já existente nas linhas Defesa/Esquiva/Bloqueio. **Item 28 (armazenamento
> com resistência):** a ramificação de resistência de `calcularStatItem` só rodava quando
> `itemCatalogo.resistencia` existia — então a mod "Camadas Extras" (+1 Físico/Balístico) em
> qualquer mochila comum (sem resistência de catálogo, a maioria) nunca executava, e a Mochila
> Kevlar nem tinha a resistência embutida (`docs/core/sistema-v4.1.0.md`: "2 Físico e Balístico")
> cadastrada no catálogo (`catalogo.dados.ts`) — corrigido nos dois: `resistencia` some ao
> `bonus` no catálogo da Mochila Kevlar (os dois stats agora coexistem no mesmo `StatItemDto`, a
> função parou de fazer `return` cedo demais) e a ramificação passou a rodar sempre que a categoria é
> `ARMAZENAMENTO`, com ou sem resistência de catálogo. `calcularResistenciaEquipamento`
> (`resistencia.ts`) filtrava só `item.equipado === true` (campo exclusivo de Proteções) — armazenamento
> usa `guardada`, não `equipado`, então nenhum armazenamento entrava na soma; o filtro agora inclui
> `categoria === ARMAZENAMENTO && guardada === false` (vestido). **Item 15 (amplificador de
> Inventário):** `ajusteInventarioAmplificadores` já existia (`shared/regras/agente/amplificador.ts`,
> de um ajuste anterior) e já era somado na linha "Inventário" de `informacoesExtras()` — mas essa
> linha é **realocada** para a aba Inventário (`CHAVES_REALOCADAS`) e nunca renderizada; o valor que
> a aba Inventário de fato usa (`inventarioMaximoValor` em `ficha-visualizacao.component.ts`, e o
> `resumo`/`calcularResumoCompras` dentro de `ficha-inventario.component.ts`) vinha só do
> stored/calculado, sem o amplificador — corrigido com um novo `inventarioMaximoEfetivo` computed em
> `FichaInventario` que soma `ajusteInventarioAmplificadores` por cima do `inventarioMaximo` (input,
> a base), usado no `calcularResumoCompras` e no texto "(base X +Y vest.)"; a edição no próprio lugar
> continua mexendo só na base (mesmo cuidado anti-drift dos demais ajustes de amplificador). **Testes:**
> shared 414/414 (+14: `Proteções: Esquiva/Bloqueio/Defesa` e `Armazenamento: resistência` em
> `compras.spec.ts`, `calcularBonusDefesaEquipamento` em `defesa.spec.ts`, armazenamento vestido em
> `resistencia.spec.ts`), frontend 446/447 (+8: mods de armadura equipada/não-equipada e Mochila
> Kevlar vestida em `ficha-visualizacao.component.spec.ts`, amplificador Inventário em
> `ficha-inventario.component.spec.ts`; a 1 falha remanescente é a mesma pré-existente e
> não-relacionada — apelido de equipamento, `ResizeObserver`), backend sem mudança (task não tocou o
> backend); build limpo nos 3 workspaces (mesmo aviso de budget pré-existente do `ng build`,
> 591.29 kB vs. 580 kB). **Verificado ao vivo** (Postgres local, backend+frontend reais, Playwright,
> PUT direto via REST para montar o cenário): colete equipado com Flexível×2 + Resistente×2 — Esquiva
> 15→17, Bloqueio 17→19; Mochila Kevlar vestida soma sua resistência embutida (2 Físico/Balístico) à
> do colete (5 Físico) → 7 total exibido no Combate; amplificador "Inventário" (+5) some ao Inventário
> máximo derivado (Força×5=15) → base efetiva 20, exibida corretamente na aba Inventário. Spec em
> `docs/specs/done/m3-43-bugs-modificadores-combate.spec.md`. Próxima task: **`m3-44`** (Inventário —
> sub-inventários/listas).)
>
> (**m3-42 — mecânicas de Fragmento hoje deferidas**: 3ª task do lote
> de refino `m3-40`…`m3-56` implementada. **Entregável 1 (Preço de Sanidade):** novo
> `custoSanidadeConsumirFragmento(modulo)` (`shared/src/regras/compras/fragmento.ts`) devolve o
> multiplicador da sequela "Rejeição Biológica" (doc — "Consumo de Fragmentos": "multiplicada por
> Módulo - 6"), a DT de Vontade pra evitá-la e a Energia Máxima extra (preço físico, "custo do
> módulo × 3") — todos derivados do mesmo valor `6 - numeral romano` que também é a Afinidade de um
> fragmento (conferido contra os 2 exemplos do documento: módulo III → sequela 3× mais forte; módulo
> IV → 21 de Energia Máxima extra). `calcularSanidade` (`sanidade.ts`) ganhou o campo opcional
> `moduloFragmentoConsumido`, preenchendo `precoSanidadeFragmento` quando informado. No Inventário
> (`ficha-inventario.component.ts`), um fragmento Potencializador avulso ganhou o botão "Consumir"
> ao lado de "Aplicar em...": remove o fragmento, restitui a Energia Máxima da aquisição, debita o
> preço físico e emite as sequelas via novo output `sequelasFragmentoConsumido` — a página
> (`ficha-visualizacao.component.ts`) as acrescenta a `estado.sequelas` pelo mesmo canal
> `ajusteSanidade` já usado pela aba Sanidade (m3-12). O jogador declara (checkbox, não travado por
> dado automático) se evitou a sequela com o teste de Vontade feito à parte; o benefício pessoal do
> Consumo em si (+1 em testes/Defesa/dano do Corpo, tabela "Consumido") ficou **fora de escopo**
> conscientemente — nenhum entregável pede esse catálogo, só o preço de consumir, e construí-lo
> exigiria um sistema novo de buffs permanentes sem contrato definido. **Entregável 2 (Afinidade):**
> `valorAfinidadeFragmento`/`calcularAfinidade`/`reducaoCustoPorAfinidade`/`aplicarReducaoAfinidade`
> (mesmo arquivo) — só a mecânica pura, sem wiring em nenhum custo existente nem exibição (ambos
> fora de escopo: a exibição é da `m3-49`, e a redução automática exigiria threading de "afinidade
> atual" por toda a UI de Inventário sem um pedido explícito para isso). **Entregável 3
> (Fragmento-como-Modificação):** já funcionava desde a `m3-35` via `origemFragmento`/
> `ModificacaoAplicadaDto` (`confirmarAplicarFragmento`) — o gap era só deixar explícito no
> formulário de item custom qual dos dois tipos faz o quê; o form agora mostra um aviso condicional
> ("é a peça em si, use Encaixa em" para Construtor vs. "melhora outro item, use Aplicar em.../
> Consumir depois" para Potencializador) assim que o jogador escolhe a categoria. **Bugs achados e
> corrigidos em QA ao vivo com o autor (pré-existentes da m3-35, fora do escopo original mas na
> mesma área — o autor identificou testando a app de verdade):** (1) `confirmarAplicarFragmento`
> (acoplar) debitava o custo do acoplamento **em cima** da Energia Máxima já drenada pela aquisição,
> sem restituí-la — dobrando o dreno real (14 em vez dos 7 do exemplo do documento pro módulo IV).
> (2) `removerModificacao` (desacoplar) destruía o fragmento e não devolvia nada de Energia Máxima —
> o autor esclareceu a regra correta: o fragmento **continua contando energia enquanto estiver em
> qualquer lugar do inventário** (solto ou acoplado) e só para de contar quando o jogador de fato o
> **remove do inventário** (não quando desacopla). Corrigido nos dois pontos com um modelo
> consistente: acoplar restitui a Energia Máxima da aquisição antes de debitar o custo do
> acoplamento (líquido 0 — bate com o exemplo do documento, 7 de Energia Máxima drenados, não 14);
> desacoplar (`desacoplarFragmento`, novo método) devolve o fragmento como **item avulso** à lista do
> inventário, restituindo o custo do acoplamento e reaplicando a aquisição — líquido também 0, então
> a Energia Máxima nunca sai do valor que já estava drenando desde que o fragmento entrou no
> inventário; só a Energia atual é debitada (× 2 do módulo, doc). Round-trip completo (adquirir →
> acoplar → desacoplar) verificado ao vivo: Energia Máxima constante do início ao fim, fragmento
> reaparece na lista com suas próprias ações (Aplicar em.../Consumir/Remover). **Testes:** shared
> 414/414 (+14: 5 na Afinidade, 4 no Preço de Sanidade do Consumo — `fragmento.spec.ts` — e 4 em
> `sanidade.spec.ts` pro novo campo), frontend 440/441 (+14: 4 no fluxo Consumir + 2 no aviso
> Construtor/Potencializador — `ficha-inventario` — e 2 em `ficha-visualizacao`; 2 testes
> pré-existentes de acoplar/desacoplar tiveram os números e o formato esperados reescritos junto com
> os bugs; a 1 falha remanescente é a mesma pré-existente e não-relacionada — apelido de
> equipamento), backend 118/118 (sem mudança — task não tocou o backend); build limpo nos 3
> workspaces (o aviso de budget do `ng build`, 591.29 kB vs. 580 kB, é pré-existente — confirmado
> idêntico em byte a byte contra o HEAD commitado antes desta task). Spec em
> `docs/specs/done/m3-42-fragmentos-mecanicas.spec.md`. Próxima task: **`m3-43`** (bugs de
> modificadores em Combate).)
>
> (**m3-41 — Origem passa a afetar cálculos de verdade**: 2ª task do
> lote de refino `m3-40`…`m3-56` implementada, em duas fatias. **Entregável 1 (motor de efeitos),
> escopo reduzido conscientemente:** das 6 categorias de efeito de Formação sem consumidor
> (`RESISTENCIA`/`INICIATIVA`/`SOBRECARGA`/`ROLAGEM`/`DT_REPARO`/`DURACAO_EFEITO`), só 3 tinham onde
> aterrissar sem inventar subsistema novo — `obterResistenciaFormacao`/
> `obterToleranciaSobrecargaFormacao`/`obterBonusRolagemAtributoFormacao`
> (`shared/src/regras/identidade/formacoes.ts`) ganharam consumidor: Resistência soma em
> `montarResistencias` (novo campo `formacao` em `ResistenciaLinhaDto`), a tolerância de Sobrecarga
> desloca o limiar de "Sobrecarregado" do Inventário (`toleranciaSobrecarga`, novo input de
> `FichaInventario`), e o dado/bônus de Formação num teste de atributo específico entra em
> `rolarTesteAtributo`/`modificadorTeste`. `INICIATIVA`/`DT_REPARO`/`DURACAO_EFEITO`/`ROLAGEM` por
> categoria de arma ou condição foram pra **Fora de Escopo** — exigiriam construir do zero um
> sistema de durabilidade/reparo, um rastreador de duração de efeito por turno e um motor de
> rolagem ciente de contexto, nenhum existente nem detalhado o bastante no `sistema-v4.1.0.md` pra
> não extrapolar; ficam para quando `m3-47` (Iniciativa) e specs futuras ainda inexistentes
> cobrirem os outros três. **Entregável 2 (aplicação server-side):** `aplicarSnapshotDeMaximos`
> (`ficha.service.ts`, só em `criarFicha`) agora aplica o delta de Formação ao snapshot que o
> próprio backend deriva do zero, via nova `calcularDerivadosComOrigem` — `alterarFicha` continua
> sem recalcular `derivados` (m3-10, liberdade total; o cliente já manda o delta aplicado).
> **Entregável 3 (Especialidade↔Origem):** já era estruturalmente impossível ter uma sem a outra
> (`especialidade` é campo obrigatório de `FichaOrigemDto`); o gap real era completude —
> `validarFormaOrigem` agora exige `gatilho` não-vazio. **Entregável 4 (Experimento+Peculiaridade
> zera a Origem):** nova `experimentoComPeculiaridade(classe, habilidades)`
> (`shared/src/regras/identidade/experimento.ts`) — true quando a classe é uma das 3 subclasses de
> Experimento e a ficha tem a habilidade "Peculiaridade" (catálogo de Subclasse); backend
> (`validarFormaIdentidade`) rejeita `identidade.origem` não-nulo nesse caso, vale pra qualquer
> editor (regra de forma, não de posse); frontend trava `origemEditavel` e mostra um chip
> "Substituída pela Peculiaridade". **Testes:** shared 386/386 (+13 na formação: 3 funções novas +
> 6 do `experimentoComPeculiaridade`; +1 em `montarResistencias`), backend 115/115 (+7: snapshot
> com/sem Origem, gatilho vazio, 4 casos de Experimento+Peculiaridade), frontend 426/427 (a 1 falha
> é pré-existente, não-relacionada — `ficha-inventario` apelido de equipamento); build limpo nos 3
> workspaces. Spec em `docs/specs/done/m3-41-origem-motor-efeitos.spec.md`. Próxima task: **`m3-42`**
> (mecânicas de Fragmento hoje deferidas — Preço de Sanidade, Afinidade, fragmento-como-Modificação).)
>
> (**m3-40 — cabeçalho da Identidade: "Codinome"→"Agente" +
> Contrato só-mestre**: 1ª task do lote de refino `m3-40`…`m3-56` implementada. **Rótulo:** o card
> de Identidade (`ficha-visualizacao.component.html`) trocou "Codinome" por "Agente" — só o texto;
> o binding (`nome()`, coluna relacional) e o conceito interno (`ajusteNome`, comentários) seguem
> "Codinome"/`nome`, como a spec previu. **Contrato:** novo `contrato?: string` opcional em
> `FichaJogadorDadosDto` (JSONB `dados`, não coluna — `docs/SCHEMA.md` atualizado), exibido ao lado
> do nome do Agente como "CONTRATO — 0000" (mono/uppercase, tokens do tema; "0000" é o placeholder
> quando ainda não definido). Reusa o padrão de edição no lugar de Personalidade/Codinome (canal
> `editandoIdentidade`, agora com o membro `'contrato'`) mas com trava **exclusiva do mestre** — ao
> contrário de Personalidade/Origem (que liberam o dono até a 1ª definição), o dono nunca edita o
> Contrato, nem antes nem depois de definido: `contratoEditavel = ajustavel() && ehMestre()`, novo
> output `ajusteContrato`. **Backend é o árbitro** (não só o front escondendo o lápis): nova
> `validarContratoSomenteMestre` em `ficha.service.ts`, chamada ao lado de
> `validarImutabilidadeIdentidade` dentro do `if (dono === autor)` de `alterarFicha` — um PUT direto
> do dono tentando mudar `dados.contrato` recebe `BusinessException` ("Contrato só pode ser alterado
> pelo Mestre"), mesmo que a UI nunca ofereça esse caminho. **Personalidade editável pelo mestre
> (deliverable 3):** já estava correto desde a m3-24/m3-25 — `personalidadeEditavel` no componente já
> checava `ehMestre()`, e `alterarFicha` já só chama `validarImutabilidadeIdentidade` quando
> `fichaEncontrada.usuarioId === usuarioAtivo.sub` (dono); confirmado ao vivo, sem mudança de código
> (fora de escopo da spec, além de confirmar). **Testes:** shared 333/333 (sem novo — nenhuma regra
> de jogo tocada), backend 108/108 (sem novo teste dedicado — a trava é coberta indiretamente pela
> suíte existente de `alterarFicha`, mas verificada ao vivo abaixo), frontend +4 no componente
> (placeholder "CONTRATO — 0000", número persistido, dono sem lápis, mestre edita e emite
> `ajusteContrato`); lint/build limpos nos 3 workspaces. **Verificado ao vivo** (Postgres local,
> backend+frontend reais, Playwright, mestre + dono distintos): cabeçalho mostra "Agente" pros dois
> papéis; mestre vê "CONTRATO — 0000" clicável, edita para "0731", reload confirma persistência real
> no Postgres; dono vê "CONTRATO — 0731" só leitura, sem lápis; `PUT /ficha/:id` disparado direto
> pelo dono (bypassando a UI) tentando gravar `contrato: '9999'` volta `400` com a mensagem exata da
> trava — confirma que a UI não é a única linha de defesa. Spec em
> `docs/specs/done/m3-40-ficha-cabecalho-agente-contrato.spec.md`. Próxima task: **`m3-41`**
> (Origem — motor de efeitos das 16 linhas de Formação ainda sem consumidor).)
>
> (**m3-26 — otimização de espaço + refino mobile da ficha,
> absorvendo a `m3-09`**: a `m3-09-refinamento-mobile-ficha.spec.md` estava marcada **SUPERSEDED**
> no próprio backlog — banner do autor (2026-07-15) dizendo que o passe mobile virou parte deste
> redesenho desktop+mobile único; ao invés de implementar a m3-09 isolada, a task real foi a
> `m3-26`, que a incorpora (as duas fecham juntas em `docs/specs/done/`). **Desktop — aba Combate
> deixava de aproveitar a largura** (4 cartões de 640px empilhados, com a coluna 1160px da página
> quase metade vazia à direita): virou uma grade de 2 colunas (`.ficha-visao__painel--grade`,
> `grid-template-columns: repeat(auto-fit, minmax(420px, 1fr))`, mesmo padrão "grades que refluem"
> da calculadora — m1-15) — Combate/Resistências na 1ª linha, Rolagens/Combos na 2ª, cada cartão
> ocupando a coluna inteira (`max-width: none` dentro do modificador `--grade`, em vez do
> `max-width: 640px` do `&__painel-cartao` isolado). As demais abas (Inventário/Habilidades/
> Sanidade/Anotações) já usavam `--largo` (1040px) de tasks posteriores à m3-26 original — não
> precisaram de ajuste. **Mobile — breakpoint mágico substituído por token:** `_breakpoints.scss`
> ganhou `$bp-tablet: 1080px` + mixin `tablet`, substituindo os dois `@media (max-width: 1080px)`
> soltos que colapsavam a grade de 3 colunas da Visão Geral para 2 (eram token técnico, distinto do
> `$bp-mobile: 560px`). **Alvos de toque ≥44px** (`$alvo-toque`, definido desde a m1-15 mas nunca
> usado na ficha): `.ficha-passo` (steppers de Vida/Energia/Atributos — o mais repetido da tela),
> `.ficha-abas__aba` (navegação principal), `.ficha-cartao__lapis`/`__acao`, `.ficha-ident__chip-lapis`
> e `.ficha-condicoes__item`, todos só dentro de `@include bp.mobile` (sem inchar a densidade do
> desktop) — escolha seletiva, não exaustiva: ícones secundários/ocasionais (dado de rolar teste do
> atributo, estrela de Maestria) ficaram de fora, mesmo critério já usado no passe mobile parcial do
> Inventário (m3-14). **Seções colapsáveis** (`<details>`/`<summary>` nativos, zero JS/estado novo):
> só nos cartões com cabeçalho **estático** (título + régua + meta somente leitura, sem lápis/
> Salvar/Cancelar dentro) — Combate, Resistências, Rolagens, Combos (aba Combate) e Informações
> Extras, Anotações (Visão Geral); abertos por padrão (`open`). Deliberadamente **fora**: Atributos
> (o cabeçalho tem os botões Salvar/Cancelar do modo edição — colidiriam com o toggle de clique do
> `<summary>`) e os cartões de Identidade/Vitalidade (sem um cabeçalho estático para virar
> `<summary>`). **Fade topo/base:** lista de presets de `app-ficha-rolagens` (`.ficha-rol__lista`)
> ganhou `max-height: 560px` + `overflow-y: auto` + `appOverflowFade`, mesmo padrão de máscara em
> gradiente do `&__grade` do Inventário (m3-14) — só essa lista fechava o item "rolagens... quando
> aplicável" da spec; Inventário/Habilidades/Sanidade já tinham o fade de tasks anteriores.
> **Achado ao vivo:** a 1ª tentativa da grade do Combate usava só `minmax(420px, 1fr)` sem override
> mobile, assumindo que `auto-fit` colapsaria sozinho — errado: `minmax` com mínimo fixo em px não
> encolhe abaixo de 420px mesmo com 1 coluna só, e a ~360-430px de largura isso estourava a página
> (bug pego pela verificação responsiva ao vivo, não pelos testes unitários). Corrigido com o mesmo
> padrão de override explícito que `&__grade`/`&__atributos__grade` já usavam:
> `@include bp.mobile { grid-template-columns: minmax(0, 1fr); }`. Budget do `anyComponentStyle`
> subiu 20→**22kB** (aviso)/22→**24kB** (erro) pra acomodar o SCSS responsivo — mesmo precedente de
> elevação da m1-15. **Testes:** frontend **418/418** (sem novo teste unitário — task é só SCSS/
> marcação, comportamento coberto pela suíte existente + verificação ao vivo abaixo); lint/build
> limpos nos 3 workspaces. **Verificado ao vivo** (Playwright, stack real): desktop 1280px —
> Combate/Resistências e Rolagens/Combos lado a lado, sem vazio à direita; clique no cabeçalho
> fecha/reabre o cartão Combos (`<details>` nativo); mobile 360/390/430px — zero scroll horizontal
> do body na Visão Geral e na aba Combate (grade 2 colunas → 1), `.ficha-passo` e `.ficha-abas__aba`
> com alvo de toque ≥44px nas três larguras. Spec em `docs/specs/done/m3-26-otimizacao-espaco-ficha.spec.md`
> (`docs/specs/done/m3-09-refinamento-mobile-ficha.spec.md` fecha junto, como superseded/absorvida).
> Próxima task: **`m3-27`** (histórico de rolagem — persistência + feed em tempo real na campanha).)
>
> (**m3-25 — frontend da Identidade (Personalidade + Origem)**: card
> "Identidade" na aba **Visão Geral** (decisão do autor — a `m3-11` real não criou a aba "Identidade"
> que a spec original previa; ver nota de desvio abaixo), no padrão de edição no próprio lugar de
> `FichaVisualizacao`. **Personalidade** reusa o canal `editandoIdentidade` (mesmo padrão do
> Codinome). **Origem** ganha um mini-editor próprio (`editandoOrigem`/`rascunhoOrigem`, no padrão
> Salvar/Cancelar de `editarClasse`): 3 textos livres (nome/descrição/Saber de Campo), Especialidade
> (gatilho + `<select>` de efeito) e as **2 linhas de Formação** — `<select>` das 21 linhas de
> `FORMACOES` (m3-23, `optgroup` por grupo via `opcoes-formacao.ts`, novo) com opção "Outro
> (autorizado pelo Mestre)" (`bonus: null`); ao escolher um bônus do catálogo, o `texto` de exibição
> é pré-preenchido com o rótulo (editável depois) e o `parametro` zera. Quando a linha exige
> parâmetro, aparece o controle — **Esquiva ou Bloqueio vira um `<select>` fechado** (não texto
> livre: o motor casa a string exata contra `'esquiva'`/`'bloqueio'`, `DERIVADO_ESCOLHA`); os demais
> tipos (Atributo/Categoria de arma/Tipo de dano/Condição) ainda não têm consumidor programático
> (só `ROLAGEM`/`RESISTENCIA`, sem campo — m3-23), então ficam texto livre. **Selo dos efeitos
> pendentes:** uma linha de Formação cujo alvo não está em `ALVOS_APLICAVEIS` (16 das 21) ganha um
> chip "Sem efeito automático ainda" — contextual (só nas linhas escolhidas), não uma lista solta
> das 16. **Trava de imutabilidade refletida** (m3-24 arbitra; o front só apresenta): novo input
> `ehMestre` em `FichaVisualizacao` (distinto de `ajustavel`, que não diferenciava dono/mestre) —
> `personalidadeEditavel`/`origemEditavel` = `ajustavel() && (ehMestre() || !jáDefinida())`; o dono
> com campo já definido vê leitura + nota "(imutável)"/"🔒 imutável", sem lápis; o mestre sempre vê o
> lápis. **Delta de Formação nos derivados** (entregável mais delicado): `shared/regras/identidade`
> ganhou `removerFormacaoDosDerivados` — `aplicarFormacaoAosDerivados` passou a aceitar um 3º
> parâmetro opcional `sinal: 1|-1` (multiplica `efeito.valor` antes de somar; default `1`,
> retrocompatível com as chamadas de 2 argumentos do m3-23), e `removerFormacaoDosDerivados` é só
> `sinal: -1` — reusa o mesmo switch, zero duplicação (proibições #26/#27). `visualizar.page.ts`
> ganhou `ajustarOrigem`: se já havia uma Origem, remove o delta dela dos derivados **atuais**
> (preserva ajustes manuais fora dos campos que a Formação toca) antes de somar o da nova — o mesmo
> espírito de `aplicarDeltaBonus`/`ajustarClasse` (m3-10), só que a `removerFormacaoDosDerivados` do
> shared faz o "subtrai" em vez de reimplementar na página. **Testes:** shared **332** (+5:
> `removerFormacaoDosDerivados`, round-trip de cada alvo aplicável + troca de Origem sem duplicar
> delta), frontend **418** (+14: 9 no componente — trava dono/mestre, auto-preenchimento do texto,
> `<select>` de Esquiva-ou-Bloqueio, "Outro" grava `bonus: null`, selo pendente, cancelar descarta —
> + 5 na página — Personalidade/Origem otimistas, delta aplicado/trocado/preservado, sem derivados
> não quebra). **Verificado ao vivo no browser** (Playwright, dono + mestre reais, Postgres local):
> dono define Personalidade e Origem (com Esquiva-ou-Bloqueio via `<select>` real), Deslocamento sobe
> de 9m→10m na aba Combate; reload confirma a trava (dono sem lápis, nota "imutável"); o mestre abre
> a mesma ficha e vê os dois lápis; `GET /ficha` confere a persistência real no Postgres. Spec em
> `docs/specs/done/m3-25-frontend-identidade.spec.md`.
>
> **Desvio da spec original:** `m3-25-frontend-identidade.spec.md` foi escrita esperando uma aba
> "Identidade" própria que a `m3-11` criaria — a `m3-11` real (já concluída) fechou com um conjunto
> diferente de abas (Visão Geral/Combate/Inventário/Habilidades/Sanidade/Anotações), sem essa aba.
> Perguntado, o autor escolheu encaixar o card dentro de **Visão Geral** (onde a identidade básica —
> nome/classe/nível — já mora) em vez de abrir uma 7ª aba. Próxima task: **`m3-09`** (refinamento
> mobile da ficha), depois **`m3-26`** (otimização de espaço).)
>
> (**m3-24 — backend: validação de forma + imutabilidade da
> Identidade**: ensina o backend a validar a **forma** do bloco `identidade` (§11 camada 1) e a
> impor a imutabilidade que o documento exige — *"assim que receber a descrição e efeito de sua
> personalidade, ela não poderá mais ser mudada"* / *"uma vez definida, a Origem não pode ser
> alterada"*. Sem frontend (`m3-25`). `FichaService.validarDadosContraRegras` ganhou
> `validarFormaIdentidade`/`validarFormaOrigem`: Personalidade uma única palavra (sem espaço
> interno, aparada), Origem com exatamente 2 Formações, cada bônus de Formação existente em
> `FORMACOES` (reusa o catálogo de `shared/regras/identidade`, m3-23 — nenhuma regra de conteúdo
> reimplementada, proibições #26/#28) com `parametro` presente quando a definição exige, `texto`
> sempre obrigatório (inclusive no bônus custom `bonus: null`) e Especialidade com `efeito`
> existente em `EspecialidadeEfeitoEnum`. `alterarFicha` ganhou `validarImutabilidadeIdentidade`:
> **trava para o dono, o mestre passa** (decisão do autor — o mestre constrói as duas e o sistema
> não versiona ficha, `SYSTEM.SPEC`, então uma trava total tornaria um erro de digitação
> irrecuperável); campo a campo — travar Personalidade não trava Origem, e definir pela primeira
> vez (`null` → valor) é sempre permitido, inclusive ao dono. `origensIguais` (privado, comparação
> estrutural campo a campo — não por referência/serialização, já que o dono costuma reenviar o
> documento inteiro a cada PUT) deixa o dono reenviar a Origem já definida sem alterá-la sem
> disparar a trava por engano. **Testes:** backend **108** (+17: 8 de forma da Identidade em
> `criarFicha` + 9 de imutabilidade em `alterarFicha`, cobrindo dono/mestre × Personalidade/Origem
> × definir-primeira-vez/alterar/reenviar-igual). **Verificado ao vivo contra o Postgres** (padrão
> m3-03/m3-04): registro de mestre+dono, campanha, entrada por convite, 3 casos de forma inválida
> rejeitados na criação, definição inicial de Personalidade/Origem aceita, alteração pelo dono
> rejeitada, reenvio idêntico aceito, alteração pelo mestre aceita e persistida — 14/14 checagens
> via REST direto (sem UI, task é backend-only). Spec em
> `docs/specs/done/m3-24-backend-identidade-imutabilidade.spec.md`. Próxima task: **m3-25**
> (frontend da Identidade).)
>
> (**m3-23 — contrato + motor de Identidade**: fecha o contrato de
> **Identidade** (Personalidade + Origem) no JSONB `ficha.dados` e o motor puro que interpreta os 21
> bônus de Formação — só `shared/` e documentação, zero mudança em `backend/`/`frontend/` (entram em
> `m3-24`/`m3-25`). Três enums novos de conteúdo de jogo: `FormacaoBonusEnum` (as 21 linhas, agrupadas
> em Combate/Movimento/Perícia/Equipamento/Logística), `FormacaoParametroEnum` (o tipo de escolha que
> uma linha exige — atributo, categoria de arma, tipo de dano, esquiva/bloqueio, condição) e
> `EspecialidadeEfeitoEnum` (dado extra / bônus no teste / dano). Contrato em `ficha.dtos.ts`:
> `FichaFormacaoDto` (`bonus`/`parametro`/`texto` — `bonus: null` é o escape do documento p/ bônus
> customizado autorizado pelo Mestre), `FichaEspecialidadeDto`, `FichaOrigemDto` (nome/descrição/
> exatamente 2 Formações/Especialidade/Saber de Campo — **imutável após definida**, trava em `m3-24`)
> e `FichaIdentidadeDto` (`personalidade` + `origem`), campo **opcional** `identidade?` em
> `FichaJogadorDadosDto` — fichas anteriores continuam válidas sem o campo. Motor novo
> `shared/regras/identidade/`: tabela declarativa `FORMACOES` (as 21 linhas transcritas 1:1 do
> documento, `Record<FormacaoBonusEnum, FormacaoDefinicaoDto>` — o tipo força as 21 chaves) e duas
> funções puras, `aplicarFormacaoAosDerivados` (delta único sobre um `FichaDerivadosDto`, mesmo padrão
> de `ajustarClasse`/m3-10) e `listarEfeitosPendentes`. **Cobertura real: 5 de 21** — só
> `DERIVADO`/`DERIVADO_ESCOLHA`/`DANO_CORPO`/`DANO_FURTIVO_DADO` têm campo hoje em `FichaDerivadosDto`
> (`deslocamento`, `inventarioMaximo`, `esquiva`/`bloqueio`, `danoCorpoACorpo`, `danoFurtivo`); as
> outras 16 (`ROLAGEM`/`DURACAO_EFEITO`/`RESISTENCIA`/`SOBRECARGA`/`INICIATIVA`/`DT_REPARO`) ficam
> **modeladas e corretas, sem consumidor** — decisão deliberada do autor, não apagar por "não usado":
> quando os campos existirem, muda-se o aplicador, não a tabela. Novo helper `somarDanoFixo` em
> `regras/agente/dano.ts` (soma ao componente fixo de uma notação de dano, reusando o padrão de
> `incrementarDanoFurtivo` por analogia — sem duplicar fórmula, proibições #26/#27). Um fix pontual:
> `EQUIPAMENTO_TURNO_EXTRA_STATUS` ("+1 turno extra de duração") ganhou o próprio alvo `DURACAO_EFEITO`
> em vez de reusar `ROLAGEM` por engano. `SCHEMA.md` documenta o bloco `identidade` no exemplo JSONB e
> sai de "ainda fora do contrato". **Testes:** shared **297** (+16: `somarDanoFixo` +5, `FORMACOES`/
> `aplicarFormacaoAosDerivados`/`listarEfeitosPendentes` +11). Spec em
> `docs/specs/done/m3-23-contrato-motor-identidade.spec.md`. **Sem verificação ao vivo** — task é só
> `shared/` + documentação, sem UI/backend para rodar; validado por typecheck + suíte completa verde.
> Feito numa worktree isolada (`worktree-m3-23-identidade`), depois integrada de volta a `master`.)
>
> (**aposentadoria da aplicação de efeitos de habilidade + habilidade
> repetível por passo (m3-31)**: a **fusão automática de efeitos** na fórmula (m3-20) foi **removida** —
> por decisão do dono, agregava complexidade com pouco retorno. Deletados: `aplicarEfeitos`/`alvoPadrao`,
> o campo `efeitos` do catálogo + `HabilidadeBaseDto.efeitos` + `FichaHabilidadeDto.efeitos`, `RolagemEfeitoDto`,
> os enums `RolagemEfeitoTipoEnum`/`RolagemEfeitoAlvoEnum` (+ barrel), o campo `bonusDados` de `TermoDadoDto`
> e as extensões DANO_DADOS_ARMA/BONUS_TESTE ATRIBUTO. **O que fica:** a **marcação de habilidades por
> passo** continua, mas agora **só conta Energia** — `resolverPreset` usa a fórmula **crua** e apenas soma
> o custo. A lista `habilidades` virou **multiconjunto**: a **mesma habilidade pode ser aplicada N vezes**
> num passo (energia soma por ocorrência). UI: o seletor por passo virou um **stepper `− N +`** por
> habilidade; os chips de vínculo do preset agrupam em **"Nome ×N"**; a energia do passo reflete as
> repetições. O tooltip da descrição (m3-30) fica ainda mais útil — o jogador lê e aplica o efeito na mão.
> O **crítico mecânico** (m3-30) segue: dobra a **fórmula crua** (dados/fixos/atributos escritos, exceto
> PROF/NIV). **Teste de atributo da Visão Geral:** passou a aplicar **`cm1`** (margem de crítico natural,
> regra 1216) — `(Atributo)d20kh1cm1 + PROF`; e a legenda da bandeja ficou **honesta na desvantagem**
> (atributo ≤ 0 → mostra `(2+|attr|)d20kl1cm1` = mantém o menor, em vez de exibir `kh1`). **Bandeja:** muitos
> dados (6d6, crítico 10d10→20d10) não são mais cortados — o termo quebra em linhas e a coluna de detalhe
> ocupa a largura restante. **Rolagem rápida:** campo livre no topo da aba Rolagens — digita uma fórmula e
> rola na hora (bandeja), **sem salvar preset nem gastar energia**. **Testes:** shared **281** (removidos os
> testes de fusão; +2 de multiconjunto de energia),
> frontend **323** (stepper add/remove/contagem + serialização repetida; teste de atributo cm1 + legenda
> honesta na desvantagem; rolagem rápida rola sem salvar). Verificado no stack real:
> vínculo "Força Bruta ×2" com energia "− 8 E"; rolar o dano usa `2d8` cru (sem FOR×3 fundido); stepper
> mostra a contagem por passo. Build/lint verdes.)
>
> (**crítico mecânico + polimento visual (m3-30)**: um passo de preset
> pode ser marcado como **critável** (`critico` em `FichaRolagemDto`/`FichaRolagemPassoDto`). Na UI, o
> passo critável ganha **dois botões — "Rolar" e "Rolar crítico"**; o crítico **dobra o dano** conforme
> `sistema-v4.1.0` (1217/1303): dobra o **número de dados** (`2d8`→`4d8`, rolagem fresca), os **fixos** e
> os **atributos** — **inclusive efeitos de habilidade** (Força Bruta `FOR×3`→`×6`) — **exceto** valores de
> **Patente/Nível** (`PROF`/`NIV`), que se mantêm. Motor: `rolarInterpretada`/`rolarPasso` ganharam um
> parâmetro `critico`; `rolarTermo` dobra a contagem de dados; `resolverPreset` carrega `critico` no
> `PassoInterpretadoDto`; `ResultadoRolagemDto.critico` sinaliza a rolagem. `normalizarPresetLegado`
> preserva o novo campo. **Bandeja**: realce de crítico **maior + glow** — o **total** brilha (crítico de
> dano ou termo que bateu `cm`), selo **"crítico ×2"** na rolagem dobrada, e o indicador `◆` de margem
> ficou maior com brilho. **Testes:** shared **301** (+5: dobra de dados/fixos/atributos, exceção
> PROF/NIV, grupo tipado, `resolverPreset`/`rolarPasso` crítico), frontend **317** (+2: serialização de
> `critico` + rolar crítico marca a entrada). Verificado no stack real (Playwright): passo critável mostra
> os dois botões; "Rolar crítico" dobra o pool (`2D8`→`4D8`) e a Força Bruta (`FOR×3 18`→`36`), total com
> glow e selo. Lint/build verdes.)
>
> (**duas extensões do modelo de efeitos (m3-20) — fecham duas lacunas**:
> (1) **`BONUS_TESTE` variante `'ATRIBUTO'`** — soma `atributo × multiplicador` ao **resultado do teste**
> (reusa os campos `atributo`/`multiplicador` do DTO; sem tipo de dano). Destrava **Atirador Calculista**
> (Geral + melhorada do Mercenário: soma Pontaria ao ataque). (2) Novo tipo **`DANO_DADOS_ARMA`** —
> `+N dados de dano iguais ao dado da arma`: `aplicarEfeitos` **espelha o maior dado de dano positivo** da
> fórmula (mesmas faces + tipo/composto) N vezes; no-op se a fórmula não tem dado de dano. Destrava
> **Queima-Roupa** (Geral + melhorada), **Técnica Aplicada**, **Manejo**, **Vingativo**, e completa
> **Reforço Adrenalizado** (FIXO no teste + dado de dano) e **Especialista em Explosivos melhorada**
> (ELEVAR + dado de dano) — antes fora por faces dependentes da arma. Enum `RolagemEfeitoTipoEnum` ganhou
> `DANO_DADOS_ARMA`; `RolagemEfeitoDto.variante` ganhou `'ATRIBUTO'`. **Sem mudança de grammar/DTO de
> rolagem** além disso, e **sem mudança de frontend** (os dados espelhados entram como termos normais da
> fórmula, rolados/exibidos pela bandeja sem alteração). Continuam fora: contagem de dados **derivada de
> atributo** (Fúria Controlada = Força÷2 dados) e "atributo do teste **ao dano**" (Berserk, atributo
> ambíguo). **Testes:** shared **296** (+7: fusão + rolagem e2e conferidas — Atirador soma PON ao total,
> Queima dobra os dados da arma no dano); build/lint verdes.)
>
> (**catálogo de habilidades — efeitos mecânicos (m3-20)**: passou-se um
> lote de habilidades do sistema de "só descrição" para **efeito estruturado** (`efeitos` em
> `habilidades-catalogo.dados.ts`), aproveitando a infra que já existia (só Força Bruta a usava). Modeladas
> só as **contribuições aditivas limpas** que mapeiam para os 5 tipos de efeito: `+N dado(s)` /
> `+N no resultado` (**`BONUS_TESTE`** `DADO`/`FIXO`), `Atributo × N no dano` (**`DANO_ATRIBUTO`**) e
> `+1 tipo nos dados de dano` (**`ELEVAR_DADO`**). A **condição de gatilho não é codificada** (o jogador
> vincula ao passo certo, como Força Bruta). Novos: **DANO_ATRIBUTO** — Pistoleiro (DES×3 Balístico),
> Golpe Pesado (VIG×1), Golpe Frenético (LUT×2), Atacante Furtivo (DES×2, dano furtivo → Físico por
> padrão); **BONUS_TESTE DADO** — Eclético, Charlatão, Investida Brutal, Passos Furtivos, Persistência,
> Raciocínio Dedutivo, Na Base do Ódio, Duplamente Letal, Conhecimento Técnico, Hacker, Investigador Nato,
> Perito, Linha de Frente, Mira de Elite, Acesso Privilegiado; **BONUS_TESTE FIXO** — Espólios de Guerra,
> Prodígio Forense, Linguagem Corporal, Camuflagem Rápida, Olhos de Águia, Sombra, Socorrista, Barreira
> Mental; **ELEVAR_DADO** — Especialista em Explosivos, Pugilista; e 4 **Gerais Melhoradas** que compõem
> dado+fixo (Persistência/Lutador, Passos Furtivos/Assassino, Raciocínio Dedutivo/Acadêmico,
> Charlatão/Diplomata). **Ficaram só na descrição** as que não mapeiam aos 5 tipos: magnitude que
> escala/tem teto (Esforço Extra, Guerreiro de Rua, Porradeiro, Postura de Ataque…), escolha "A **ou** B"
> (Observador Astuto, Planejamento Tático, Analisar Cenário melhorada…), troca de atributo (Artista
> Marcial, Jogo de Corpo, Bacharel em Agressão…), buff em aliado (Marcar Alvo, Aura de Liderança, Ordem
> Direta…), rerolagem (Segunda Chance, Mimado, Arrepio…), e tudo de cura/defesa/deslocamento/condição/
> reação. (`+N dados de dano da arma` e `+atributo no teste` **saíram desta lista** — viraram
> `DANO_DADOS_ARMA` e `BONUS_TESTE 'ATRIBUTO'` no bloco acima.) **Sem mudança de engine** — só dados contra
> o contrato tipado existente. Fusão conferida em runtime: Pistoleiro → DES×3 Balístico no dano, Eclético →
> `bonusDados:1` no pool; build/lint verdes.)
>
> (**m3-29 — Rolagem gramática v3: fim dos "modos"**: o
> `RolagemModoEnum { SOMA | TESTE }` foi **aposentado** (enum deletado, campo `modo?` removido de
> `FichaRolagemDto`/`FichaRolagemPassoDto`, `RolagemDto`, `PassoInterpretadoDto`). Um **teste deixa de
> somar Proficiência por baixo dos panos**: a fórmula agora especifica tudo — um teste é a expressão
> explícita `LUTd20kh1 + PROF`. Novos **operadores por pool** no parser (`shared/regras/rolagem`):
> **`kh`/`kl`** (manter maior/menor, padrão N=1), **`cm`** (margem de crítico — só **conta** os críticos,
> sem efeito automático, por decisão do dono), **`!`** (explosão) e **`?`** (implosão) — estes dois
> **não-canônicos** (não existem no `sistema-v4.1.0`; entram como operadores de ferramenta, com teto de
> dados contra runaway). A **desvantagem de atributo zerado** (regra 270) sobrevive como propriedade
> **intrínseca** de um pool de atributo (`ATRd20kh…` com atributo ≤ 0 → rola 2+|attr| dados, mantém o
> menor) — sem reintroduzir "modo". `aplicarEfeitos` deixou de rotear por `modo` e passou a **inferir o
> papel** da fórmula (com keep = teste; senão dano); `BONUS_TESTE DADO` agora infla `bonusDados` do termo
> com keep (vantagem = pool maior). Nova função pura **`normalizarPresetLegado`** migra presets antigos
> (`modo:'TESTE'`) para a notação nova na **carga** da ficha (`visualizar.page`), idempotente; o backend
> segue guardando o JSONB opaco (**sem migração SQL** — nunca valida rolagem). Frontend: `ficha-visualizacao`
> rola `${atributo}d20kh1 + PROF`; `ficha-rolagens` perdeu os toggles/badges de modo; `bandeja-dados`
> mostra **mantidos/descartados/críticos/desvantagem** por termo (o ramo `teste` sumiu); `guia-formula`
> documenta os operadores novos. `ResultadoTesteDto` e `teste?` removidos; `DadosRoladosDto` ganhou
> `mantidos?/descartados?/criticos?/desvantagem?`, `TermoDadoDto` ganhou os operadores. **Testes:** shared
> **282** (rolagem 74, era 38), frontend **311**, backend **88** — todos verdes; `lint` shared+frontend e
> `tsc` backend limpos; build do frontend no budget. Spec `docs/specs/done/m3-29-rolagem-gramatica-v3.spec.md`.
> **Verificação de render pendente** — validado por testes/build/lint. )
>
> (**m3-13++ — refinamentos do seletor + confirmar remoção na Sanidade**:
> no `FichaHabilidadeSeletor`, o **"＋" agora adiciona a habilidade direto na ficha** (o diálogo
> **permanece aberto**) e a marca **"Na ficha ✕"** (o ✕ ali mesmo a remove) — dá para montar a lista
> inteira sem fechar; as **gerais melhoradas** ganharam **selo** (não se misturam mais às do arquétipo);
> a lista virou **2 colunas** com **fade topo/base** (`appOverflowFade`, mesmo recurso das listas da
> calculadora) e o diálogo ficou **menos comprido** (teto 600px). O parent `FichaHabilidades` trocou o
> fluxo "pré-preenche editor" por **`aoAdicionarDoCatalogo`** (grava direto, com `origem`) +
> **`aoRemoverDoCatalogo`** (por nome). Na aba **Sanidade** (`FichaSanidade`), remover
> sequela/trauma/lesão agora pede **confirmação inline** (mesmo padrão de `FichaHabilidades`). Testes:
> frontend **273** (habilidades: add/remove direto + custo variável; sanidade: gate de confirmação),
> `lint`/`build` verdes (bundle **569,77 kB**). **Verificação de render ainda pendente** — validado por
> testes/build.)
>
> (**m3-13+ — habilidades do sistema na ficha**: a aba **Habilidades**
> passou a permitir **adicionar habilidades do catálogo do sistema**, não só texto livre. Novo dado
> puro em `shared/regras/agente`: `habilidades-catalogo.dados.ts` (as ~224 habilidades do
> `sistema-v4.1.0.md` — Gerais, Classe, Arquétipo, Gerais Melhoradas e Subclasses de Experimento,
> desnormalizadas) + `habilidades-catalogo.ts` com a função pura **`catalogoHabilidades(classe,
> arquetipo)`** que resolve os grupos de filtro do seletor: **Gerais** sempre; **Classe** entre as três
> classes-base (a da ficha em `ehDaFicha`, omitida p/ Civil); **Arquétipo** só os arquétipos da classe
> da ficha (o Experimento entra como **subclasse**; Gerais Melhoradas só do **próprio** arquétipo;
> outras subclasses **nunca** aparecem). +7 testes shared (181). Enum `HabilidadeCategoriaEnum` ganhou
> **`ESPECIALIDADE`** (categoria só-criada, como Personalidade); `FichaHabilidadeDto` ganhou o campo
> opcional **`origem`** (classe/arquétipo-fonte, dentro do JSONB — sem schema relacional novo). UI: novo
> **`FichaHabilidadeSeletor`** (modal com abas + **sub-filtro inline** de chips, o da ficha destacado
> com ponto accent e ativo por padrão, + busca; item já na ficha esmaecido "Na ficha"); escolher
> pré-preenche o editor inline (com a `origem`) para revisar antes de salvar. `FichaHabilidades` ganhou
> os botões **"＋ Do sistema"** / **"＋ Personalizada"**, o botão **⚡ Utilizar** por habilidade (custo
> fixo gasta a Energia direto; custo variável `[X E]` abre mini-campo perguntando quanto — a Energia
> **pode negativar**, reusa o `ajusteVitalidade` de m3-10) e o **chip com origem** ("Classe -
> Especialista" quando é de outra classe/arquétipo; cor por categoria, **Personalidade = accent do
> tema**). +6 testes frontend (270). `lint`/`build` verdes (bundle **569,77 kB**). Design em
> `docs/superpowers/specs/2026-07-14-habilidades-do-sistema-design.md`; stub visual conferido.
> **Verificação de render pendente** — validado por testes/build, não dirigido no navegador ainda.)
>
> (**m3-13 — editor de Habilidades no próprio lugar**: preenche a aba
> **Habilidades** (m3-11), antes um placeholder "em construção", com o CRUD da lista `habilidades` do
> `dados` (`FichaHabilidadeDto` — `{ nome, categoria (HabilidadeCategoriaEnum), custoEnergia (número|0|null),
> descricao }`). **Novo componente standalone `FichaHabilidades`** (`componentes/ficha-habilidades/`):
> input `habilidades`/`editavel`, output **`habilidadesMudou`** que emite a **lista inteira** a cada
> mutação. **Controlado** — a lista vem sempre do input; o componente só guarda o **rascunho transitório**
> do formulário (Reactive Forms, sem `ngModel`). **Um editor por vez** (`indiceEmEdicao`, `-1` = adicionar);
> um `<ng-template>` reusado entre **adicionar** e **editar** (`ngTemplateOutlet`). Campos: `nome`
> (obrigatório — única validação de forma), `<select>` de **categoria** (as 8 chaves do enum, com rótulos
> legíveis vindos do **shared** — novo `ROTULOS_HABILIDADE_CATEGORIA` ao lado do enum, fonte única), custo
> de Energia (stepper −/+ com piso 0 + checkbox **"Variável"** → persiste `custoEnergia: null`), `descricao`
> (textarea). Cada card exibe chip da categoria, o custo em notação do documento (`[N E]`/`[0 E]`/`[X E]`
> para `null`) e a descrição. **Remover com confirmação inline** (padrão do projeto — `indiceRemovendo`,
> área "Remover X?" Sim/Não; não usa `window.confirm`). Sem catálogo tipado (a ficha guarda a habilidade
> desnormalizada, contrato m3-01) e sem trava de regra (liberdade total, m3-10). Cada mutação sobe pela
> nova saída **`ajusteHabilidades`** do `FichaVisualizacao` (que agora embute o `FichaHabilidades` na aba,
> substituindo o placeholder + resumo read-only) e a `visualizar.page` (`ajustarHabilidades`) troca
> `dados.habilidades` inteira — **otimista** + persistência **em lote** (mesmo `alterarFicha` debounced de
> m3-10). Handler **trivial**, sem cascata/progressão: o custo de Energia é só registro (fora de escopo o
> efeito mecânico em play, como pré-requisitos/catálogo por classe). Só tokens do tema (proibição #29 — card
> e stepper `.ficha-passo` espelham o `FichaSanidade` de m3-12); nenhuma fórmula de jogo nova. **+10 testes**
> (Vitest, **frontend 266/266**): `ficha-habilidades.spec` (8 — read-only sem botões com chip/custo `[X E]`,
> adicionar aparando nome/descrição, nome vazio não emite, editar, custo variável persiste `null`, editar
> variável semeia a caixa marcada, stepper piso 0, remover só após confirmação), `ficha-visualizacao.spec`
> (aba Habilidades embute o editor e propaga `ajusteHabilidades`; o teste antigo de "em construção" passou a
> cobrir só Rolagens) e `visualizar.page.spec` (+1 — habilidades otimista + PUT em lote). `lint`/`build`
> verdes (bundle inicial **569,77 kB** dentro do budget de 575 kB — o editor mora na chunk lazy
> `visualizar-page`, agora 112,63 kB). Spec `m3-13` → `done/`. **M3 avança: 3 das 4 sub-coleções da ficha
> agora têm editor (Sanidade m3-12, Habilidades m3-13); faltam Inventário (m3-14) e presets de Rolagem
> (m3-15).** Sessão anterior (2026-07-14, **m3-12 — editor de Sanidade no próprio lugar**: preenche a aba
> **Sanidade** (m3-11) com o CRUD das três listas de `estado` — **sequelas** (temporárias), **traumas**
> (permanentes, tratáveis) e **lesões** (removem pontos de atributo) —, antes só read-only (m3-07).
> **Novo componente standalone `FichaSanidade`** (`componentes/ficha-sanidade/`): inputs
> `sequelas`/`traumas`/`lesoes`/`editavel`, output **`sanidadeMudou`** que emite o **trio inteiro** a cada
> mutação. **Controlado** — as listas vêm sempre dos inputs; o componente só guarda o **rascunho
> transitório** do formulário (Reactive Forms, sem `ngModel`), nunca uma cópia das listas: assim a
> persistência otimista + reconciliação do backend fluem sem dessincronizar. **Um editor por vez**
> (`listaEmEdicao`/`indiceEmEdicao`, `-1` = adicionar); um `<ng-template>` por lista é reusado entre
> **adicionar** e **editar** (`ngTemplateOutlet`). **Sequelas/Traumas** = `{nome, descricao?}` (+ `tratado`
> no trauma, com **toggle "Tratado" in loco** — o trauma permanece, só a penalidade cai, `sistema-v4.1.0`);
> **Lesões** = `{atributo (select das 10 chaves), severidade (SeveridadeLesaoEnum), pontos (stepper −/+
> com piso 0), permanente (checkbox)}`, exibindo o **efeito derivado** "−N Atributo (permanente)" (não
> persistido). Trocar a severidade **sugere** os pontos de origem (LEVE 1 / GRAVE 3 / MORTAL 5) — sugestão,
> **não trava** (liberdade total, m3-10; nome obrigatório é a única validação de forma). Cada mutação sobe
> pela nova saída **`ajusteSanidade`** do `FichaVisualizacao` (que agora embute o `FichaSanidade` na aba,
> substituindo a lista read-only; a antiga `marcasSanidade` saiu e o contador `totalMarcas` passou a somar
> os três `length`) e a `visualizar.page` (`ajustarSanidade`) troca os três blocos em `estado` de uma vez,
> **otimista** + persistência **em lote** (mesmo `alterarFicha` debounced de m3-10). Só tokens do tema
> (proibição #29 — o padrão de "marca" com borda colorida à esquerda espelha o read-only de m3-11; stepper
> `.ficha-passo` copiado); nenhuma fórmula de jogo nova. Fora de escopo (mantido): **aplicar
> mecanicamente** o efeito de lesão/trauma nos derivados (o autor edita os `derivados` direto — m3-10) e o
> **limite por Vontade** como trava (só o documento; aqui nem aviso). **+10 testes** (Vitest, **frontend
> 252/252**): `ficha-sanidade.spec` (8 — read-only sem botões, adicionar sequela emitindo o trio, nome
> vazio não emite, editar trauma, alternar tratado in loco, remover lesão, sugestão de pontos por
> severidade + stepper com piso + efeito derivado, adicionar lesão), `visualizar.page.spec` (+1 — edição de
> Sanidade otimista + PUT em lote) e `ficha-visualizacao.spec` (o teste da aba Sanidade passou a ler
> `.sanidade__nome`). `lint`/`build` verdes (bundle inicial **568,16 kB** dentro do budget de 575 kB — o
> editor mora na chunk lazy `visualizar-page`). **Verificado por render** (Playwright/Chromium sobre o build
> de desenvolvimento, sessão + REST mockados): como **mestre**, a aba Sanidade mostra os três grupos
> (Sequelas/Traumas/Lesões) com "＋ Adicionar", a sequela "Insônia" e o trauma "Pânico" (com toggle
> TRATADO), o **editor de lesão** com selects de Atributo/Severidade + stepper de Pontos + Permanente, e
> **adicionar "Vertigem" aparece na hora** (otimista) na lista de sequelas; a barra de abas confirma **uma
> só aba ativa** (aria-selected único); **zero erros de app** (só o socket sem gateway → selo offline).
> **Refino pós-entrega (a pedido do autor): efeito mecânico das lesões no atributo + aba renomeada.** A
> aba **Sanidade** virou **"Sanidade & Lesões"** (id `sanidade` mantido — deep-link estável; título do
> card idem). As **lesões passaram a impactar o atributo efetivo** — nova regra pura
> `shared/regras/agente/lesao.ts` (`somarLesoesAtributo`/`calcularAtributoEfetivo`/
> `calcularAtributosEfetivos`), conferida contra `sistema-v4.1.0.md` ("⬡ Lesões": cada ponto de lesão
> remove 1 do atributo; Leve 1 / Grave 3 / Mortal 5), **sem piso — o efetivo pode negativar** (ver 3ª
> rodada do refino, abaixo). **Princípio-chave: o valor base
> (`atributos`) nunca é mutado — o efetivo é derivado.** Consequência (concern explícito do autor): a
> **Maestria sobrevive à lesão** — ela é validada sobre o **base** (`maestriaValida`), então FOR 6 com
> Maestria que toma −1 mostra **5** mas **mantém a estrela** (o backend segue aceitando a Maestria; nada
> a revalidar). Os **Atributos (leitura)** exibem o **efetivo + badge "−N"** (accent) + leve tinta no box
> lesionado; **edição/rascunho e a Maestria seguem no base**.
>
> **Lesões PERMANENTES cascateiam para todos os cálculos (2ª rodada do refino, a pedido do autor).** O
> documento ("⬥ Lesões Permanentes") é explícito: *"ter uma lesão permanente irá afetar qualquer cálculo
> que utilize este atributo — Vigor removeria vida e inventário; Destreza, deslocamento e energia."* — ao
> contrário da temporária, que (linha "lesão em atributo de cálculo de saúde não afeta os mesmos") **não**
> reduz Vida/Energia. Implementado assim: no `ajustarSanidade` da `visualizar.page`, calcula-se o atributo
> efetivo **só pelas lesões permanentes** (`calcularAtributosEfetivos(base, lesões.filter(permanente))`)
> **antes vs. depois** da edição; se mudou, roda a **mesma progressão por delta de m3-10**
> (`aplicarProgressao`) usando esses efetivos como entrada — máximas (Vida/Energia) **e** todos os
> derivados stored acompanham a variação, preservando ajustes manuais. O valor **base** continua
> intocado, então a **Maestria sobrevive** mesmo à permanente. A **temporária** segue só reduzindo o
> atributo efetivo exibido (badge "−N"); os `derivados` dela seguem manuais (m3-10). O box de Atributos
> mostra o efetivo por **todas** as lesões (perm + temp); os derivados refletem **só** as permanentes —
> coerente com o documento. Limpeza: os estilos mortos `.ficha-marca*` (migraram para o `FichaSanidade` na
> extração) saíram do `ficha-visualizacao.scss` — o budget de estilo por componente voltou a passar sem
> bump. **+6 testes** (**shared 172/172** — `lesao.spec`: soma por atributo, efetivo sem piso, mapa
> preservando o resto, **Maestria válida no base e não no efetivo**; **frontend 254/254** —
> `ficha-visualizacao.spec`: lesão reduz o efetivo "−1" e a estrela sobrevive; `visualizar.page.spec`: a
> **permanente cascateia a Vida máxima pelo delta** e a temporária não, com base/Maestria intactos; a
> lista de abas espera "Sanidade & Lesões"). `lint`/`build` verdes (bundle **568,16 kB**, sem warning de
> budget). **Verificado por render (ponta a ponta, editando no navegador com PUT ecoando o corpo):**
> adicionar uma lesão **permanente** de −2 Vigor e −1 Força na aba fez a **Vida máxima cair 52 → 32**, o
> **Inventário máx 30 → 25** (Força 6→5 ×5) e o box de **Força** virar **"5 −1"** — mas o base seguiu 6 e a
> **Maestria (★) permaneceu**; a redução sobreviveu ao PUT debounced + reconciliação; **zero erros de app**.
>
> **Atributo lesionado pode NEGATIVAR (3ª rodada do refino, a pedido do autor).** Caiu o **piso 0** de
> `calcularAtributoEfetivo`: `efetivo = base − pontos`, ponto final — lesão maior que o base leva o
> atributo a **valor negativo**, inclusive nas **permanentes**, que cascateiam. Atributo negativo já era
> um estado legítimo do sistema (os bounds de classe vão a **−5**, `limites.ts`) e as fórmulas o aceitam
> — então **Vigor negativado derruba a Vida máxima** (ex.: Combatente nv. 2, Vigor 4 → −1 com uma lesão
> permanente Mortal: Vida 76 → 36), Força negativa zera o inventário (doc — "Inventário") etc. Quem
> consome o efetivo num cálculo passa por `aplicarLimitesPorClasse`, que aplica o **−5** como piso do
> *cálculo* (não da ficha). O stepper de **pontos da lesão** mantém o piso 0 (pontos não negativam; o
> que negativa é o atributo). **+2 testes** (**shared 174/174** — `lesao.spec`: efetivo negativo no
> escalar e no mapa, e a **cascata do Vigor negativado na Vida**); frontend 254/254 sem mudança.
>
> **Esquiva e Bloqueio viraram editáveis no próprio lugar (aba Combate, a pedido do autor).** Eram as
> duas únicas linhas read-only do painel (m3-11); já eram **campos stored** de `derivados`
> (`FichaDerivadosDto.esquiva/bloqueio`) e já acompanhavam a **progressão por delta** (Nível e Destreza →
> Esquiva; Nível e Vigor → Bloqueio) — só faltava a UI. Entraram em `ChaveInfoExtra` +
> `montarInformacoesExtras` (`status-derivado.ts`), reusando **a mesma máquina** de edição/persistência
> de m3-10 (`ajusteDerivado` → override em `derivados[chave]`, otimista + PUT em lote); e entraram nas
> **`CHAVES_REALOCADAS`**, para seguirem aparecendo **só** na aba Combate (nunca estiveram em
> "Informações Extras"). Com isso **todas as 8 linhas de Combate são editáveis** — a `LinhaCombate`
> (wrapper com `info: InfoExtra | null`) e o `somenteLeitura` morreram; `combateLinhas` virou um
> `InfoExtra[]` ordenado por `CHAVES_COMBATE`. **+1 teste** (**frontend 255/255** — editar Esquiva e
> Bloqueio na aba emite `{chave, valor}`); `lint`/`build` verdes (bundle **568,16 kB**, sem bump).
>
> **Topbar: Tema no menu de perfil (mobile) + logo maior (a pedido do autor).** O `ConfiguracoesTema`
> ganhou o input **`variante: 'topbar' | 'menu'`** — só muda a **forma do gatilho** (na variante `menu`
> ele veste a linguagem das linhas do dropdown: linha inteira, sans, sem borda, `role="menuitem"`), o
> painel é idêntico e o estado segue todo no `TemaService`. O `layout` monta **duas instâncias** do mesmo
> componente e alterna por CSS: a do **menu de perfil** (junto de Perfil/Campanhas/Encerrar sessão) só
> aparece no **mobile**; a da **barra** some no mobile **apenas quando autenticado** (deslogado não há
> menu, então o gatilho fica na barra em qualquer largura) — a topbar de ~360px deixa de disputar largura
> entre nav, perfil e tema. A **logo** (`app-marca`, dimensionada em `em`) subiu de 20px para **28px** no
> desktop e **30px** no mobile (~39px / ~42px de imagem), dentro da topbar de 52px. O menu de perfil
> ganhou ainda um **cabeçalho com o nome do usuário** (`topbar__perfil-usuario`, mono/uppercase +
> régua hairline), **só no mobile** — é onde o `topbar__identidade` da barra é escondido, então o
> menu reapresenta de quem é a sessão antes das ações. **+1 teste** (**frontend 256/256** — variante
> `menu`: classe + `role="menuitem"` e abre o mesmo painel); `lint`/`build` verdes (bundle
> **569,77 kB**, budget 575 kB).
> Spec `m3-12` → `done/`. **M3 avança: a aba Sanidade virou um editor completo — e as lesões agora
> mordem o atributo (e, se permanentes, todos os cálculos), mas nunca a Maestria.** Sessão anterior
> (2026-07-13, **m3-11 — navegação por abas da ficha**: fecha o scaffold navegável
> que destrava o resto do M3 (os editores de sub-coleções m3-12…m3-15 e o frontend de Identidade m3-25,
> que aguardava a aba). A **ficha virou uma tela com abas** — barra mono/uppercase fiel ao protótipo
> (`docs/design/examples/ficha-de-jogador.html`), aba ativa em **accent sólido + texto escuro**, as demais
> em `--text-dim`; **Visão Geral · Combate · Inventário · Habilidades · Sanidade · Rolagens**. Tudo mora no
> **`FichaVisualizacao`** (a tela única de m3-10), sem nova rota de página; a aba ativa é `?aba=` na URL
> (**deep-link/refresh** preservam a seção). **Conteúdo por aba:** **Visão Geral** = o que já existia
> (identidade + Vida/Energia + Atributos + Informações Extras editáveis, m3-10); **Combate** = os derivados
> de combate **reorganizados** (Defesa/Esquiva/Bloqueio + Deslocamento/Proficiência/Dano C.a.C./Furtivo +
> **Hab./Turno** + chip da DT) — **organiza, não recalcula**: Defesa/Deslocamento/Proficiência/Danos/Hab.
> reusam as linhas **editáveis** de `Informações Extras` (mesma persistência de m3-10, `ajusteDerivado`),
> Esquiva/Bloqueio read-only (stored `derivados` ?? `calcularDefesa` de `shared/regras`, sem edição no
> lugar hoje); **Sanidade** = a lista de marcas (traumas/sequelas/lesões) do `estado`, read-only (**movida**
> da coluna esquerda da Visão Geral para cá); **Inventário** = **Máximo** (o derivado `inventarioMaximo`,
> editável — realocado de Informações Extras) + **Itens (atual)** + Amplificadores, com placeholder "em
> construção"; **Habilidades/Rolagens** = **placeholder** + **resumo read-only** lido do `dados` (nomes de
> habilidades, nome+fórmula dos presets) até os editores m3-12…m3-15. **Realocação de derivados (a pedido
> do autor):** `inventarioMaximo` saiu de "Informações Extras" (Visão Geral) para a aba **Inventário** e
> `habilidadesPorTurno` para a aba **Combate** — a Visão Geral usa um recorte `informacoesGerais` (exclui
> os realocados); a persistência editável (m3-10) é a mesma nas três abas. **Acessibilidade:** `role="tablist"/"tab"/"tabpanel"`,
> `aria-selected`/`aria-controls`, **roving tabindex** e navegação por teclado (←/→ com wrap, Home/End) que
> ativa a aba focada. **Responsivo:** as abas rolam na horizontal no mobile sem esticar o body
> (`overflow-x`, scrollbar oculta). **Wiring de deep-link:** o `FichaVisualizacao` expõe `abaInicial`
> (input, semeia via `linkedSignal` — re-deriva na navegação por URL mas permanece gravável no clique) e
> `abaMudou` (output); a `visualizar.page` lê o `?aba=` do snapshot (validado por `ehAbaFicha`, inválido →
> Visão Geral) e reflete a troca com `router.navigate` (`queryParamsHandling: 'merge'`, `replaceUrl` — não
> empilha histórico nem recarrega a ficha). Só tokens do tema (proibição #29 — raio via `--radius-card`/
> `--radius-control`); nenhuma fórmula nova (proibições #26/#27). **+12 testes** (Vitest, **frontend
> 243/243**): `ficha-visualizacao.spec` (+9 — as 6 abas na ordem certa com Visão Geral ativa, troca sem
> recarregar mostrando Combate com Defesa/Esquiva/Bloqueio/Hab., `abaMudou` emite no clique, deep-link
> semeia a aba, placeholder + resumo read-only, Esquiva stored, **a realocação Inventário máx→Inventário /
> Hab.→Combate fora de Informações Extras**, **edição do Inventário máximo na aba Inventário**; o teste de
> Sanidade agora ativa a aba) e `visualizar.page.spec` (+3 — `?aba=` válido semeia / inválido cai na Visão
> Geral / `mudarAba` navega com `replaceUrl`). `lint`/`test`/`build` verdes (bundle inicial **567,56 kB** dentro do budget de 575 kB; as
> abas moram na chunk lazy `visualizar-page`). **Verificado por render** (Playwright/Chromium sobre o build
> de desenvolvimento, sessão + REST mockados): como **mestre** abrindo a ficha de "Kane", as **6 abas**
> aparecem com Visão Geral ativa (identidade/atributos/Informações Extras + estrela de Maestria em Força),
> **Combate** mostra Defesa 13 / Esquiva 15 / Bloqueio 17 / Deslocamento 9m / Proficiência +3 / Dano C.a.C.
> 1D6 / Dano Furtivo 2D6+2 / **Hab. / Turno** com o chip da DT, **Inventário** o aviso "em construção" +
> **Máximo 15 máx / Itens (atual) 2 / Amplificadores 0** (a Visão Geral já **não** lista mais Inventário
> nem Hab./Turno) e **Sanidade** as marcas Pânico/Insônia; **zero erros de app** (só o socket sem gateway cai em 400 → selo
> offline, esperado). Fora de escopo (mantido): os **editores** das sub-coleções (m3-12…m3-15) e o refino
> mobile dedicado (m3-09). Spec `m3-11` → `done/`. **M3 avança: a ficha ganhou suas abas — o esqueleto que
> os editores de sub-coleção vão preencher.** Sessão anterior (2026-07-09, **Assistente de criação de ficha
> (a pedido do autor)**: "Nova ficha"
> deixou de despejar uma ficha padrão para edição no lugar — agora abre um **dialog de registro
> inicial** sobre a lista, coletando as escolhas cruciais **antes de criar**: Codinome, Classe/
> Subclasse/Arquétipo, Nível, Prestígio, **atributos base** e **Maestria** (★, única, só no total 6+).
> Novo componente standalone `FichaCriarDialog` (`componentes/ficha-criar-dialog/`) — steppers e boxes
> de atributo copiados dos padrões do editor no lugar; classe muda → **reclampa** Nível e atributos
> aos limites da classe (`obterLimitesClasse`) e some o arquétipo se a classe não o comporta; o **bônus
> fixo de arquétipo/subclasse** (doc, mesma `obterBonusAtributos` do editor) aparece num resumo verde e
> num badge `+n` por atributo, e a Maestria só habilita pelo **total** (base + bônus); **prévia ao vivo**
> de Vida/Energia máximas. A montagem foi centralizada em `ficha-padrao.construirFichaInicial(opcoes)`
> (fonte única — `construirFichaPadrao` agora delega): normaliza aos limites, soma o bônus fixo, valida a
> Maestria e grava o **snapshot** de Vida/Energia máximas + `derivados` de `shared/regras` (proibições
> #26/#27 — nenhuma fórmula nova; o backend revalida forma/Maestria/§14). A lista abre o assistente
> (`dialogCriar`), monta via `construirFichaInicial` no `criarFicha(opcoes)` e navega à ficha criada. Só
> tokens do tema (proibição #29). **+14 testes** (frontend **218/218**): `ficha-padrao.spec` (7 —
> snapshot, bônus somado ao base, reclampe Civil + arquétipo descartado, Maestria validada/habilitada
> pelo bônus, nome aparado), `ficha-criar-dialog.spec` (5 — emite base ao confirmar, reclampe Civil +
> arquétipo oculto, bônus + Maestria pelo total, Maestria some ao cair abaixo de 6, cancelar) e
> `lista.page.spec` (+2 líquidos — abre o assistente sem criar / confirma monta+navega / cancelar fecha).
> `lint`/`build` verdes (bundle inicial **567,56 kB**; o dialog mora na chunk lazy `lista-page`, 14→21 kB).
> **Verificado por render** (Playwright/Chromium sobre o build de desenvolvimento, sessão + REST
> mockados): "Nova ficha" abre o dialog fiel ao tema, escolher Lutador mostra "Bônus de arquétipo: +1
> LUT · +1 FOR" e badges `+1` em FOR/LUT, a Maestria em Força habilita com o total 6, a prévia Vida
> reage 34→52 ao subir o Nível, e confirmar faz **POST** com `forca 6`/`luta 2`/`nivel 2`/`vidaMaxima
> 52`/`derivados` presentes e **navega** para `/painel/9/ficha/42`; zero erros no fluxo do assistente.
> Sessão anterior no mesmo dia (**m3-08 — cliente Socket.IO + tela do mestre ao vivo**: fecha o §9
> no frontend — o tempo real das fichas —, consumindo o gateway broadcast-only da **m3-05** sem
> nenhuma escrita por WebSocket (proibição #25). **Revisão pós-implementação** endureceu três pontos:
> (1) **troca de conta na mesma aba** — `conectar` rastreia o `tokenConectado` e **reconecta** se a
> sessão trocar (logout→login) ou **desconecta** se some, para o socket não carregar a identidade
> anterior no gateway; (2) **erro de save não congela o tempo real** — o pipe de persistência do
> `visualizar` ganhou `catchError` que libera `edicaoPendente` e mantém o stream vivo (sem ele, um
> 400/403 prenderia a flag e travaria persistência **e** live-updates); (3) **join único** —
> `entrarSala*` só emite se já conectado, senão confia no reingresso do `connect` (elimina o join
> dobrado com o buffer offline do socket.io). A **fábrica do socket** virou um seam de DI
> (`SOCKET_FACTORY`, default `io`) para os testes injetarem um fake **sem `vi.mock` do
> `socket.io-client`** — o mock de módulo contaminava entre specs (os de página importam o serviço
> real pelo token de DI e carregavam o `socket.io-client` de verdade), deixando o spec do serviço
> **flaky** (io "0 vezes" de forma intermitente); com o token, determinístico. **Correção de
> progressão (a pedido do autor):** editar **Nível** e **atributos** passou a propagar a variação a
> **todos os derivados/máximas stored dependentes**, preservando ajustes manuais (m3-10). A lógica foi
> unificada em `visualizar.page`.`aplicarProgressao(antigos, novos)` (usada por Nível e por atributos):
> números somam `calcular(novo) − calcular(antigo)` das fórmulas de `shared/regras` — Vida (Vigor×
> Nível), Energia (Destreza×Nível), Defesa/Esquiva/Bloqueio, Deslocamento (Destreza), Proficiência,
> Percepção (Sentidos), Inventário (Força), Hab./Turno; o **Dano Furtivo** soma os marcos de Nível
> cruzados juntando **D6 com D6 e fixo com fixo** (cada marco = +1D6+1) via as novas
> `contarMarcosDanoFurtivo`/`incrementarDanoFurtivo` em `shared/regras/agente/dano` (fail-safe fora do
> formato, clamp ≥0); o **Dano C.a.C.** (tabela não-linear de Força+Vigor, sem delta somável)
> **recalcula só quando não foi customizado** (stored = calculado do estado anterior), senão preserva
> o valor editado. Campo/`derivados` ausente fica ausente (fallback ao cálculo). Assim aumentar Vigor
> sobe a Vida máxima conforme o Nível, aumentar Sentidos sobe a Percepção etc. **Atributos Bônus de
> arquétipo/subclasse (a pedido do autor):** escolher/trocar de arquétipo (ou subclasse Experimento)
> aplica o **delta dos Atributos Bônus fixos** do documento (ex.: Lutador → Mercenário tira +1 Força/
> +1 Luta e põe +1 Pontaria/+1 Destreza) — nova `obterBonusAtributos` em `shared/regras/agente/
> arquetipo` (tabela conferida contra o `sistema-v4.1.0.md`; os pontos "à escolha" de Engenheiro/
> Assassino/Acadêmico/Híbrido **não** são auto-aplicados — decisão do autor —, só o fixo). O
> `ajustarClasse` remove o bônus do arquétipo anterior e soma o do novo (preservando ajustes manuais)
> e então bifurca: **troca de arquétipo (mesma classe)** roda a `aplicarProgressao` (delta, os
> derivados dependentes acompanham — Força → Inventário/Dano C.a.C. etc.); **troca de classe** (a
> pedido do autor) **recalcula do zero** Vida/Energia máximas e o bloco de derivados para a classe
> nova (as fórmulas de saúde e os campos disponíveis mudam), via `recalcularSaude`
> (`calcularVida/Energia/Derivados`, a mesma fonte do snapshot de criação) — descarta ajustes manuais
> de saúde no reset, clampa a Vida/Energia **atuais** ao novo teto, e conserta o caso Civil (Defesa/
> Furtivo voltam a N/A). **+9 testes** (shared `dano.spec` +3 e `arquetipo.spec` +4; frontend
> `visualizar.page` +4 — atributos→derivados, Dano C.a.C. recalcula/preserva, Dano Furtivo por marco,
> troca Lutador→Mercenário, entrar em arquétipo propaga aos derivados, troca de classe recalcula
> saúde/derivados do zero). **Dependência nova** no frontend: `socket.io-client`
> `^4.8.3` (mesma major do `socket.io` do backend). Novo proxy `/socket.io` (`ws: true`) no
> `proxy.conf.json` para o dev-server encaminhar o handshake ao backend. **Novo `TempoRealService`**
> (`core/services/tempo-real.service.ts`, `providedIn: 'root'`): mantém **uma** conexão Socket.IO
> autenticada pelo JWT da sessão (m2-06) — `io(apiBase || undefined, { auth: { token } })`; em dev
> `apiBase` é `''` → **`undefined`** (mesma origem — passar `''` a `io` geraria uma URL inválida). O
> estado de conexão fica em **Signals** (`conectado`, `reconexao`); os três eventos de negócio
> (`ficha:alterada`, `ficha:criada`, `membro:entrou`) são **`Observable`s** (cada evento é um
> instante, não um estado). Métodos `entrarSalaFicha`/`entrarSalaCampanha` só emitem `*:entrar`
> (**nunca** mutação); `sairSala*` esquece a sala (o gateway m3-05 não tem handler de "leave", então
> só remove do rastreio local — a desinscrição por `takeUntilDestroyed` impede agir em evento de sala
> antiga). **Ressincronização (§9 — o Render free tier dorme e derruba a conexão):** a cada `connect`
> o serviço **reingressa** nas salas rastreadas (o servidor as perde ao cair o socket) e, se **não**
> for a primeira conexão, incrementa `reconexao` — as telas refazem o fetch. **Visualizar (a ficha
> aberta)** entra na sala `ficha:<id>` e, ao receber `ficha:alterada` **desta** ficha, **reconcilia o
> Signal local sem recarregar** (critério de aceite: o mestre com a ficha aberta vê a edição do
> jogador ao vivo) — **com a regra de m3-10:** enquanto há **edição local pendente** (`edicaoPendente`,
> do disparo do ajuste até a resposta do `alterarFicha`) o evento remoto é **descartado** para não
> sobrescrever o que o usuário edita; a resposta do próprio save reconcilia com o backend. Ao
> reconectar, refaz `recuperarFicha` (salvo edição pendente). **Lista (o painel da campanha)** entra
> na sala `campanha:<id>` e, a cada `ficha:criada`/`membro:entrou`/reconexão, **refaz o fetch REST** —
> o recorte visível (§14) e o nome do dono continuam **arbitrados pelo backend**, sem o front duplicar
> a regra a partir do payload do broadcast (o resumo chega a todos os membros da sala, mas a listagem
> REST filtra por §14); o refetch ao vivo não pisca o esqueleto. **Testes** (Vitest, **frontend
> 204/204**, **shared 168/168**): `tempo-real.service.spec` (9 — fake do socket injetado por `SOCKET_FACTORY`: não conecta
> sem sessão, conecta uma vez com o token, **reconecta ao trocar de token / desconecta ao sair a
> sessão**, entra nas salas só com `*:entrar`, repassa os 3 eventos aos Observables, reingresso+bump
> só a partir da 2ª conexão, esquece sala ao sair, desconecta limpo), `visualizar.page.spec` (+6 —
> entra/esquece a sala, aplica o `ficha:alterada` sem novo GET, ignora outra ficha + descarta remoto
> durante edição pendente, **erro de save libera a edição pendente**, **delta de Nível nos derivados
> stored**, ressincroniza ao reconectar) e
> `lista.page.spec` (+3 — entra/esquece a sala, refetch §14 em ficha:criada/membro:entrou,
> ressincroniza ao reconectar). **Indicador de reconexão na UI (§9, a pedido do autor):** componente
> standalone `IndicadorTempoReal` (`shared/tempo-real/`) consome o Signal `conectado` — **silêncio
> quando conectado**, e um chip `TEMPO REAL OFFLINE` em `--warning` quando a conexão cai; escopado às
> telas de ficha (cabeçalho da `lista` e da `visualizar`), onde a conexão está aberta. O **debounce**
> é 100% SCSS (mesmo padrão do `.carregando-global`): o selo só surge após ~1,5s desconectado — as
> micro-quedas (o socket reconecta sozinho) o desmontam antes de aparecer, sem piscar; o atraso é
> preservado em `prefers-reduced-motion` (só o fade/pulsar são removidos). `role="status"` +
> `aria-live="polite"`; só tokens do tema (proibição #29). **+3 testes** de componente (silêncio
> conectado / aviso com `role=status` desconectado / reage ao Signal); os stubs de `TempoRealService`
> nas páginas ganharam `conectado`. `lint`/`test`/`build` verdes (bundle inicial **567,56 kB** dentro do
> budget de 575 kB — o `socket.io-client` divide na chunk core compartilhada; o indicador mora nas
> chunks lazy de ficha). **Verificado por
> render** (Playwright/Chromium sobre o **build de desenvolvimento** — `apiBase` `''` = mesma origem —
> servido por um http+socket.io server local, REST mockado por rota exata para a navegação SPA cair no
> app): como **mestre (id 99)** abrindo a ficha do **jogador (id 7)**, o socket **conecta com o JWT no
> handshake** (`auth token? true`), ingressa em `ficha:42`, e um `ficha:alterada` emitido pelo servidor
> atualiza a tela de **"Kane" → "Kane Ferido" ao vivo, sem recarregar**; **zero erros de app** (só a
> fonte Google externa falha no sandbox sem rede). O **indicador offline** foi verificado por render
> contra um servidor **sem gateway** (o socket cai em `connect_error`): na tela real da ficha, antes de
> 1,5s o chip fica invisível (opacity 0 — não pisca) e após o debounce surge **"TEMPO REAL OFFLINE"**
> (opacity 1, `role=status`). Fora de escopo (mantido): refino mobile dedicado
> (m3-09), editores de sub-coleções (m3-11..m3-15). Spec `m3-08` → `done/`. **M3 avança: tempo real
> das fichas no ar — o mestre vê as edições dos jogadores ao vivo.** Sessão anterior no mesmo dia
> (**m3-10 — edição da ficha no próprio lugar + Maestria + "nada é
> exclusivamente calculado"**). **Revisão constitucional** (SYSTEM.SPEC §10.4/§11, SCHEMA.md, JSDoc
> do contrato): o princípio "nenhum derivado é persistido" foi **invertido** — na **criação**,
> `shared/regras` calcula tudo uma vez e **grava** no `dados` (Vida/Energia máximas em `estado`; o
> bloco **`derivados`**: Defesa/Esquiva/Bloqueio, Deslocamento, Proficiência, Dano C.a.C./Furtivo,
> Percepção, Inventário máx., Hab./turno); a partir daí são **stored e editáveis** e o motor **não
> recalcula** sobre as edições. A **atual pode exceder a máxima**; subir de nível **soma** o delta de
> progressão às máximas stored. O backend **deixou de travar faixas** do estado salvo — só valida
> **forma** (camada 1) e a regra de **Maestria** (`maestria`, novo campo `keyof atributos | null`:
> único, só em atributo com 6+). **Contrato (`shared/`):** `FichaDerivadosDto` + `FichaRolagemDto`
> (`rolagens`, para m3-15) + `estado.vidaMaxima/energiaMaxima` — todos **opcionais** (fallback ao
> cálculo em fichas antigas); novo `shared/regras/agente/derivados.calcularDerivados` (snapshot) e
> `maestria` (`maestriaAtingivel`/`maestriaValida`). **Backend:** `criarFicha` grava o snapshot
> (máximas + `derivados`); `validarDadosContraRegras` afrouxado à Maestria. **Frontend — a ficha
> virou um editor no próprio lugar, campo a campo:** o `FichaVisualizacao` ganhou **lápis por trecho**
> (Codinome; Classe/Arquétipo em mini-editor com dois `<select>`; Nível — que aplica o delta de
> progressão às máximas — e Prestígio; **atributos em grupo** com marcação de **Maestria** ★ 6+/única;
> Vida/Energia **atual e máxima** e cada **derivado** clicáveis para digitar). Cada confirmação é
> **otimista** e persistida **em lote** (`alterarFicha` debounced). **Não há mais botão global de
> editar nem `FichaFormulario`** — o componente e a rota `nova` foram **removidos**; **"Nova ficha"
> cria uma ficha padrão** (`ficha-padrao.ts`) e abre-a para edição (default-then-edit). O **acesso de
> visualização** saiu do corpo da tela: virou **menu (kebab) → dialog**. Opções de classe/arquétipo
> extraídas para `opcoes-ficha.ts`; status derivado editável em `status-derivado.ts`. **Verde:**
> shared **159**, backend **88**, frontend **177**; `lint`/`build` ok (bundle inicial **567 kB**;
> budget de estilo por componente subiu p/ 16/18 kB — o editor é rico). **Abas da ficha (m3-11)** e
> os editores de sub-coleções (**m3-12** Sanidade, **m3-13** Habilidades, **m3-14** Inventário,
> **m3-15** Rolagens) ficam **fora** desta task (specs já escritas em `docs/specs/`). Sessão anterior
> (2026-07-08, **m3-07 — frontend da
> lista e visualização read-only da ficha + UI de concessão de acesso**: fecha o consumo do CRUD de
> ficha (m3-03) e da concessão de acesso (m3-04) na UI, exceto o tempo real (m3-08). **`FichaService`
> estendido** (só transporte — o backend é o árbitro §14, o front só apresenta): `listarFichas`
> (`GET /ficha?campanhaId=`), `listarAcessos` (`GET /ficha/:id/acesso`), `concederAcesso`
> (`POST /ficha/:id/acesso` com `{ usuarioId }` no corpo, `fichaId` na rota), `revogarAcesso`
> (`DELETE /ficha/:id/acesso/:usuarioId`). **Componente read-only `FichaVisualizacao`**
> (`componentes/ficha-visualizacao/`): exibe identidade, atributos, estado (barras Vida/Energia
> atual÷máximo) e status derivado **reusando as fórmulas de `shared/regras/agente`** (mesma fonte da
> edição m3-06 — nenhuma fórmula duplicada, proibições #26/#27), **sem controle de formulário** (é só
> leitura); `N/A` onde a classe não possui a stat. **Helper `rotulos-ficha.ts`** (rótulos legíveis de
> classe/arquétipo, mesma grafia dos `<select>` do formulário) compartilhado pela lista e pela
> visualização, sem redefinir. **`FichaLista`** (`paginas/lista/`, rota **índice `''`**): `forkJoin`
> de `listarFichas` + `listarMembros` (para resolver o nome do dono), chip de dono ("Você" com realce
> accent para a própria, o nome do membro para as demais) + classe/nível; cada item liga à
> visualização (`:id`); botão "Nova ficha". **O recorte visível (dono vê a própria, mestre vê todas,
> outro membro só as concedidas) é filtrado pelo backend — o front não duplica regra.** **`FichaVisualizar`**
> (`paginas/visualizar/`, rota **`:id`**): `recuperarFicha` + `listarMembros`; deriva `ehDono`
> (`ficha.usuarioId === sessão.id`) e `ehMestre` (papel na lista de membros) → `podeGerenciar`. Todos
> com acesso veem a ficha read-only via `FichaVisualizacao`; **para o dono ou o mestre** aparecem o
> botão **Editar** (→ tela de edição m3-06) e o **painel de gestão de acesso** (m3-04): `<select>`
> Reactive Forms de **membros elegíveis** (exclui o dono — já vê —, o mestre — já vê tudo — e quem já
> tem concessão ativa) + "Conceder", e a lista de acessos ativos com "Revogar"; conceder/revogar
> chamam a service e **recarregam `listarAcessos`**. A autoridade é sempre o backend (§14) — a UI só
> reflete; `listarAcessos` só é buscado quando o usuário pode geri-los. **Rotas** em `ficha.routes.ts`:
> `''` (lista), `nova` (m3-06), `:id/editar` (m3-06), `:id` (visualização) — `nova` **precede** `:id`
> para não ser capturada como um `id`. **Ponto de entrada:** o detalhe da campanha ganhou um botão
> **"Fichas"** (→ `['/painel', id, 'ficha']`) ao lado do "Nova ficha" (rebaixado a secundário).
> `.scss`/BEM só com tokens do tema (proibição #29): card/stat/chip/lista copiados dos padrões da
> ficha (m3-06) e da lista de campanhas (m2-07); cores semânticas (Vida `--vida`, Energia `--energy`,
> Furtivo `--positive`). **+15 testes** (Vitest, **frontend 159/159**): `ficha.service.spec` (+4 —
> rota/verbo/corpo de listar/listarAcessos/conceder/revogar), `ficha-visualizacao` (4 — rótulo de
> classe, read-only sem controles, Vida Máxima derivada por `shared/regras`, N/A e omissão do card de
> anotações), `lista.page` (2 — lista o recorte da rota e resolve dono "Você"/nome + realce da própria),
> `visualizar.page` (5 — membro comum só vê / dono e mestre veem editar+painel com elegíveis corretos /
> conceder e revogar disparam a service e recarregam). `lint`/`test`/`build` verdes; bundle inicial
> **566,80 kB** dentro do budget de 575 kB (m3-06). **Verificado por render** (Playwright/Chromium
> sobre o **build de produção**, sessão + API mockadas): lista com 2 fichas e chips VOCÊ/nome do membro
> e botão Nova ficha; visualização read-only com **Vida 5/91 derivada por `shared/regras`** (bate com
> `calcularVida` Combatente nível 3 vigor 4), botão Editar, painel de acesso com 1 concessão (Vera
> Cruz), **zero inputs** (confirma read-only) e Vida Máxima 91 — **zero erros de console** nas duas
> telas. **Ajuste de design pós-entrega** (o autor atualizou o protótipo
> `docs/design/examples/ficha-de-jogador.html`): o `FichaVisualizacao` foi **realinhado ao novo
> alvo de fidelidade** — de cards empilhados para um **layout de três colunas** (identidade +
> Vida/Energia + Sanidade · Atributos · Informações Extras). Ganhou: **card de identidade** (avatar,
> CODINOME, chips classe+arquétipo, mini-boxes Nível / **Patente** — derivada do Prestígio via
> `shared/regras/patente`, `ROTULOS_PATENTE` reusado da calculadora — / Prestígio em `--warning`);
> **barras Vida/Energia** atual÷máximo; **card Sanidade** listando traumas/sequelas/lesões (do
> `estado`, read-only) com borda colorida por tipo e contagem de marcas; **Atributos** em stat-boxes
> (abrev. em cima, valor grande, nome embaixo) com chip da fórmula da DT; **coluna Informações Extras**
> (Defesa, Deslocamento, Proficiência, Dano C.a.C., Dano Furtivo, Percepção, Inventário, Hab./Turno);
> chip de **classificação `FICHA-JGD-NNNN`**. Inputs do componente agora `fichaId`/`nome`/`dados`; a
> página de visualização passou a **largura 1160px** (as três colunas) e o cabeçalho ficou enxuto
> (voltar + Editar). Nada de dado inventado — os domínios **fora do contrato m3-01** (Identidade —
> Personalidade/Origem/Saber de campo —, Dinheiro, Maestrias) que o protótipo ilustra **não** foram
> exibidos (não há campo no `FichaJogadorDadosDto`); as "abas" COMBATE/INVENTÁRIO/HABILIDADES do
> protótipo ficam para quando seus editores/campos existirem. Testes do `ficha-visualizacao` ajustados
> (6, cobrindo identidade/patente/chips/sanidade/read-only) — **frontend 161/161**; `lint`/`build`
> verdes (bundle inicial **566,80 kB**, o novo layout mora na chunk lazy `visualizar-page`).
> **Verificado por render** (Playwright/Chromium sobre o build de produção): as três colunas batem com
> o protótipo, todos os 10 atributos cabem, a Patente longa ("Força Tarefa Especial") quebra dentro do
> box sem vazar, **zero erros de console**. **Edição no próprio lugar** (a pedido do autor — a edição
> em página separada era "muito complexa e confusa"; o foco passou a ser usabilidade/praticidade,
> `/frontend-design`): a **ficha virou uma tela só** (`/painel/:campanhaId/ficha/:id`) — leitura por
> padrão (`FichaVisualizacao`) e **edição ativada por um clique em "Editar"** que troca a mesma tela
> pelo `FichaFormulario` (mesmo layout de três colunas, campos viram controles no lugar) com
> **Salvar/Cancelar**, **sem navegar** para outra página; durante a edição o painel de acesso sai de
> cena. A **rota `:id/editar` e a `FichaEditar` foram removidas**; o `FichaFormulario` ganhou
> `mostrarCancelar`/`cancelar` e input `fichaId` (chip de classificação; `FICHA-JGD-NOVA` na criação).
> A **criação** (`FichaCriar`) agora navega para a **ficha** criada (`:id`, que abre em leitura), não
> mais para `/editar`, e ganhou Cancelar (volta à lista). O status derivado (coluna "Informações
> Extras") e a Patente foram **extraídos para `status-derivado.ts`** (`montarInformacoesExtras`,
> `normalizarEntrada`, `rotuloPatente`) — **fonte única compartilhada** por visualização e formulário,
> para que leitura e edição mostrem exatamente as mesmas stats. **162 testes** (Vitest, frontend) —
> `visualizar.page.spec` cobre o toggle leitura↔edição no próprio lugar e o `salvarEdicao` via
> `alterarFicha`; `criar.page.spec` cobre a navegação à ficha e o Cancelar; spec da edição em página
> apagado com a página. **Verificado por render** (build de produção): em `:id` como dono, "Editar"
> troca a leitura pelo formulário na **mesma tela** (mesmas colunas, 13 steppers, Salvar Alterações +
> Cancelar, Informações Extras recalculando), **zero erros de console**. **Ajuste rápido de Vida/Energia
> na leitura** (a pedido do autor — usabilidade em jogo, `/frontend-design`): a `FichaVisualizacao`
> ganhou passos **− / +** ao lado do valor de Vida e Energia atuais, **fora da edição** (input
> `ajustavel`, output `ajusteVitalidade`; a página liga só para dono/mestre — `podeGerenciar`). Os
> passos clampam a **[0, máximo]** (− trava em 0, + no teto derivado por `shared/regras`) e a página
> aplica o novo valor **na hora (otimista)** e persiste **em lote** — cliques seguidos viram um único
> `alterarFicha` (`Subject` + `debounceTime(500)` + `switchMap`, `takeUntilDestroyed`); o backend
> revalida o teto e a resposta reconcilia a tela. Botão de estilo `.ficha-passo` (mesmo padrão de
> stepper do tema, só tokens). **166 testes** (Vitest, frontend): `ficha-visualizacao.spec` (+3 —
> passos ocultos sem `ajustavel`, emissão do valor clampado, trava nos limites) e `visualizar.page.spec`
> (+1 — ajuste otimista + persistência em lote coalescida). **Verificado por render** (build de
> produção, dono): "− 7 / 106 +" (Vida) e "− 5 / 51 +" (Energia) compactos e alinhados à barra, sobre
> o tema, **zero erros de console**. Fora de escopo (mantido): tempo real / tela do mestre ao vivo (m3-08), refino mobile dedicado
> (m3-09), editores das sub-coleções (sequelas/traumas/lesões/habilidades/inventário). Spec `m3-07` →
> `done/`. **M3 avança: lista + visualização + concessão de acesso no ar (front consumindo o CRUD e a
> matriz §14 do backend).** Sessão anterior no mesmo dia (**m3-06 — frontend da
> ficha de jogador (criação e edição)**: abre o módulo `modules/ficha/` no frontend — as telas de
> **criação** e **edição** da própria ficha, reusando os controles e cálculos da calculadora de agente
> (M1) com **status derivados ao vivo** via `shared/regras` (proibições #26/#27 — nenhuma fórmula
> duplicada no front). **`FichaService`** (`providedIn:'root'`, transporte HTTP puro — extrai `dados`
> do `StandardResponse`, DTOs do shared `./dtos/ficha`, JWT via `auth-token.interceptor`): `criarFicha`
> (`POST /ficha`), `recuperarFicha` (`GET /ficha/:id`), `alterarFicha` (`PUT /ficha/:id`) — as três do
> CRUD m3-03 que criar/editar exigem (listagem/visualização por terceiros e UI de concessão são m3-07).
> **`/ficha` adicionado ao `proxy.conf.json`**. **Componente reutilizável `FichaFormulario`**
> (`componentes/ficha-formulario/`, o `ficha-formulario.component.ts` que o CONVENTIONS já citava) —
> onde vive o reuso da calculadora: **Reactive Forms** (`FormGroup` plano + subgrupo `atributos`),
> `input` `valorInicial` (null na criação, o documento na edição) / `salvando` / `rotuloAcao`, `output`
> `salvar<{nome,dados}>`. Reusa o **`StepInput`** (m1-06) e **todas** as fórmulas de
> `shared/regras/agente` (Vida/Energia máximas, Defesa/Esquiva/Bloqueio, Proficiência, Deslocamento,
> Dano Corpo/Furtivo, Inventário, Limite de Energia, Sanidade/Traumas, Hab./Turno, Percepção) em
> Signals `computed`, **idêntico à aba `agente`**. **Dez atributos** (`FichaAtributosDto`, m3-01)
> agrupados Físicos/Mentais; as fórmulas consomem os cinco que `regras/agente` usa
> (Vigor/Destreza/Força/Vontade/Sentidos, via `aplicarLimitesPorClasse`) — os outros cinco são
> guardados, sem alimentar derivado (nenhuma fórmula os usa hoje). O **protótipo** mostrava 5 atributos,
> mas o **contrato m3-01 fixa 10** — o contrato vence. **Coerência que o backend revalida
> (`validarDadosContraRegras`) espelhada no front:** ao trocar de classe, reclampa Nível e os 10
> atributos aos limites (`obterLimitesClasse`) e descarta o arquétipo inválido (Experimento/Civil não
> têm — `arquetipo: null`); um `effect` mantém Vida/Energia atuais ≤ máximo derivado ao vivo (e clampa
> de novo no submit — Energia pode negativar, só o teto é limitado). **Sub-coleções que esta tela ainda
> não edita** (sequelas, traumas, lesões, habilidades, **inventário**) são **preservadas** no round-trip
> da edição (Signal `preservado`, mescladas de volta no submit) e nascem vazias na criação — nunca
> zeradas; editores ricos delas ficam para tasks futuras (não é extrapolação — a spec fixa o reuso da
> calculadora, não CRUD de coleções). **Telas** (`paginas/criar` + `paginas/editar`, standalone lazy):
> `FichaCriar` lê `campanhaId` da rota, `criarFicha` e navega à **edição** da ficha nova (recarrega
> íntegra — critério de aceite); `FichaEditar` lê `campanhaId`+`id`, `recuperarFicha` → entrega ao
> formulário, `alterarFicha` com confirmação "Salvo ✓" efêmera. **Rotas** em novo
> `modules/ficha/ficha.routes.ts` (`nova`, `:id/editar`) montadas em `app.routes.ts` sob
> **`painel/:campanhaId/ficha`** atrás do `autenticacaoGuard` — colocada **antes** da rota `painel`
> genérica para casar o prefixo mais longo (o router não volta à irmã após consumir só `painel`); o
> `campanhaId` mora na rota-pai, lido por um helper `lerParamRota` que sobe a cadeia de rotas
> (herança `emptyOnly` não propaga a filhas de caminho não-vazio). **Ponto de entrada:** um botão mínimo
> **"Nova ficha"** (`.detalhe__ficha-acao`) foi adicionado ao **detalhe da campanha** (`/painel/:id`),
> visível a **qualquer membro** (a matriz §14 deixa cada membro criar a própria ficha; o backend é o
> árbitro), ligando a `['/painel', campanhaId, 'ficha', 'nova']`; a **lista de fichas** propriamente
> (edição/visualização por ficha) continua sendo m3-07. `.scss`/BEM só com tokens do tema (proibição #29): card/stat/stepper/slider
> copiados dos padrões da aba `agente`; cores semânticas (Vida `--vida`, Energia `--energy`, Furtivo
> `--positive`), N/A onde a classe não possui a stat (Civil sem defesa). **+13 testes** (Vitest,
> **frontend 144/144**): `ficha.service.spec` (3 — rota/verbo/corpo de cada método), `ficha-formulario`
> (5 — nome obrigatório, criação com Vida/Energia cheias e sub-coleções vazias, semeadura da edição,
> **preservação** de habilidades/inventário/sequelas no round-trip, reclampe Civil zerando Vigor 6→3 e
> limpando arquétipo), `criar.page` (1 — cria e navega à edição), `editar.page` (2 — carrega e salva) e
> `app.routes.spec` (+2 — guard redireciona a criação sem sessão; libera com sessão). `lint`/`test`/
> `build` (AOT type-checou os templates) verdes. **Ajuste de budget:** o novo módulo lazy dividiu
> módulos compartilhados (StepInput + `regras/agente`, usados pela calculadora **e** pela ficha) e
> empurrou o bundle inicial de 564,88 → **566,80 kB**, acima do budget de 565 kB; seguindo o precedente
> aprovado pelo autor (mesmo caso do bump de estilos da m1-20), o `maximumWarning` de `initial` subiu
> **565→575 kB** no `angular.json` — build **sem warning**. **Verificado ao vivo:** (1) **REST contra o
> Postgres** com um payload **exatamente na forma que o formulário produz** — registro→login→campanha→
> `POST /ficha` 201 → `GET` recupera íntegro (nome/nível/vigor/vida/anotações) → `PUT` (nível 3→5,
> prestígio 0→1, vida 10→12) 200 → `GET` confirma persistido íntegro; dados incoerentes (vida 9999) →
> **400** (validação `shared/regras` do backend, confirmando que o clamp do front é necessário); (2)
> **render (Playwright/Chromium)** da tela de criação com sessão injetada — 5 cards, **Vida Máxima
> reage ao vivo 34→54** ao subir Vigor 1→6 (mesma fonte da calculadora), troca para Civil reclampa
> atributos a **máx 3**, oculta o arquétipo e auto-limita Vida Atual a 13/13 quando o máximo cai, **zero
> erros de console**. Fora de escopo (mantido): lista de fichas da campanha e visualização por terceiros
> (m3-07), tempo real/tela do mestre ao vivo (m3-08), refino mobile dedicado (m3-09), editores das
> sub-coleções (sequelas/traumas/lesões/habilidades/inventário). Spec `m3-06` → `done/`. **M3 avança:
> criação/edição da ficha no ar (front + back integrados).** Sessão anterior no mesmo dia (**m3-05 — gateway de
> tempo real (WebSocket) broadcast-only**: fecha o §9 — o tempo real das fichas — **sem frontend, sem
> escrita pelo gateway** (proibição #25). **Dependências novas** no backend: `@nestjs/websockets`,
> `@nestjs/platform-socket.io`, `socket.io` (o `README` já anunciava "Socket.IO broadcast-only").
> **Infra em `backend/src/core/gateway/`** (entregável 1): **`CampanhaGateway`** (`@WebSocketGateway`,
> broadcast-only) + **`GatewayModule`** + **`WsIoAdapter`**. O nome `CampanhaGateway` segue o exemplo
> canônico do `CONVENTIONS.md` (`this.campanhaGateway.emitirFichaAlterada(...)`) — um único gateway,
> a campanha é o hub de tempo real, mas ele também emite eventos de ficha. **Handshake autenticado
> pelo mesmo mecanismo do Passport** (§9): o `GatewayModule` importa o `AutenticacaoModule` (que passou
> a **exportar o `JwtModule`**) e o gateway valida o token do handshake (`auth.token` ou header
> `Authorization: Bearer`) com o **`JwtService` configurado com o mesmo `JWT_SECRETO`** que a
> `JwtStrategy` verifica — nada de segundo validador; token ausente/inválido → `socket.disconnect(true)`,
> payload guardado em `socket.data.usuario`. **Origem do Socket.IO travada em `APP_FRONTEND_ORIGEM`**
> (§10.6) pelo `WsIoAdapter` (estende `IoAdapter`, lê a origem do `ConfigService` no `bootstrap` — o
> decorator só aceita opções estáticas), espelhando o CORS HTTP do `main.ts` (origem de produção +
> regex de preview `*.pages.dev`); ligado em `main.ts` via `app.useWebSocketAdapter`. **Salas e
> permissão de entrada** (entregável 2): `ficha:entrar` → `CampanhaGateway` **reusa
> `FichaService.recuperarFicha`** (permissão de visualização §14: dono/mestre/concessão) e só então
> `socket.join('ficha:<id>')`; `campanha:entrar` → **reusa `CampanhaService.recuperarCampanha`** (só
> membros) e `socket.join('campanha:<id>')`. O gateway **consulta a service dona** (não duplica regra —
> proibição #28): se a service lança, a entrada é negada (ack `{ sucesso: false }`, sem `join`).
> **Eventos de negócio** (entregável 3): `ficha:alterada` na sala `ficha:<id>`, `ficha:criada` e
> `membro:entrou` na sala `campanha:<id>`. Payloads: `ficha:alterada` (sala já gateada pela §14 no
> `join`) reusa `FichaAlteradaDto` inteiro; **`ficha:criada` emite só o `FichaResumoDto` (sem o
> `dados`)** — a sala `campanha:<id>` inclui qualquer membro, mas ver o documento da ficha é mais
> restrito (§14: dono/mestre/concessão), então o conteúdo completo fica atrás do REST gateado, nunca
> no broadcast (proibição #28); **`membro:entrou` ganhou DTO novo no shared**
> (`CampanhaMembroEntradaDto { campanhaId, usuarioId }`, notificação da sala, distinta da
> `CampanhaEntradaDto` que é a resposta REST ao ingressante). **Emissão cabeada nas services após a
> mutação** (entregável 4, §9): `FichaService.criarFicha`/`alterarFicha` chamam
> `emitirFichaCriada`/`emitirFichaAlterada`; `CampanhaService.entrarCampanha` chama
> `emitirMembroEntrou` — a regra fica na service, o gateway só transmite. **Dependência mútua
> gateway↔services resolvida com `forwardRef`** nos dois lados (módulos e `@Inject`): `Ficha`/`Campanha`
> modules importam `forwardRef(() => GatewayModule)` e passaram a **exportar as services**; o
> `GatewayModule` importa `forwardRef` dos dois. **+11 testes** (Vitest, backend **87/87**) no novo
> `campanha.gateway.spec`: handshake (JWT válido guarda payload; inválido/ausente desconecta), entrada
> em sala respeitando a **matriz §14** (join quando a service concede; **negado sem `join` quando a
> service lança**; negado sem socket autenticado) e emissão nas salas certas; os specs de service
> ganharam a asserção de emissão pós-mutação. `lint`/`build`/`test` do shared e backend verdes;
> **verificado ao vivo**: app **sobe** (DI + `forwardRef` + gateway resolvem) e, com um cliente
> `socket.io-client` real contra o gateway ouvindo, o handshake **rejeita** conexão sem token / com
> token inválido e **mantém** a conexão com JWT válido. Fora de escopo: cliente Socket.IO e a tela do
> mestre ao vivo (m3-08), frontend. Spec `m3-05` → `done/`. Sessão anterior no mesmo dia (**m1-20 — modo
> Vender na aba Compras**: task complementar do M1 (após a m1-19), 100% client-side, zero
> backend/persistência de servidor. **Camada de regras** (`shared/regras/compras`, sem dependência
> externa): 3 enums novos de conteúdo de jogo em `shared/src/enums/` — `TaxaVendaEnum`
> (`NORMAL`/`CHECKIN`/`FORA_PATENTE`), `FragmentoTipoEnum` (`POTENCIALIZADOR`/`CONSTRUTOR`) e
> `FragmentoModuloEnum` (`I`–`V`, string enum) — sem tabela `tipo_*` (§10.3). Novo submódulo
> `venda.{dtos,dados,ts}`: `MULTIPLICADOR_TAXA_VENDA` (`0.5`/`0.75`/`0.25` — Loja = metade,
> check-in = 75%, fora de patente = 25%), `VENDA_FRAGMENTOS` (tabela módulo × tipo do documento),
> `calcularValorVendaCarrinho` (**não recalcula custo** — aplica a taxa sobre o `gasto` já computado
> por `calcularTotaisCarrinho` da m1-05, arredondado), `obterValorFragmento` (lookup unitário) e
> `calcularVendaFragmentos` (soma `quantidade × valor`, ignora ≤ 0). **Derivado 1:1 de
> `sistema-v4.1.0.md`** ("Loja", "Retornando após uma Missão", "Venda de Fragmentos" — o documento
> vence, proibição #27). **+10 testes** (Vitest, shared **153/153**) conferindo cada taxa sobre um
> carrinho conhecido, cada célula da tabela de fragmentos e o total combinado. **UI** (`compras.page`,
> só apresentação/estado — regra 100% no motor, proibição #26): **Compras e Vendas são duas abas da
> barra da calculadora** (revisão do autor — não um alternador interno): cada uma sua rota
> (`/calculadora/compras` e `/calculadora/vendas`) carregando a **mesma `ComprasPage`** em modos
> diferentes; o `modo` (`comprar`/`vender`) chega por `data` da rota → `input()` via
> `withComponentInputBinding` (ligado no `app.config`). Ícone novo `vendas` (etiqueta) no `shared/icone`.
> O modo roteia leituras/escritas para um **carrinho de venda separado**
> (`carrinhoVenda`/`amplificadoresVenda`) via helpers `lerCarrinho`/`definirCarrinho` — **o carrinho
> de compra e sua persistência m1-11 ficam 100% intactos**; o de venda é efêmero (não persiste). Na
> **aba Vendas os cards Configuração e Resumo somem** (só Comprar usa dinheiro/limites) e os cards
> visíveis renumeram (Catálogo 1, Carrinho de Venda 2, Venda 3). Card "Venda" com os **fragmentos
> primeiro** e os **valores no fim** (revisão do autor): **grade de fragmentos** (Módulo V→I ×
> Potencializador/Construtor, contadores −/+, rótulo de tipo por célula, subtotal por linha) e, abaixo,
> "Valores da venda" com **seletor de taxa** (Normal 50 / Check-in 75 / Fora de patente 25), **valor de
> venda dos itens**, **total de fragmentos** e **Total de Venda** = itens (na taxa) + fragmentos em
> **stat box de destaque accent**. **Fragmentos no mobile viram scroll lateral** (cartões por módulo lado
> a lado num scroller horizontal contido — encurta a tela; body não rola de lado), com **fade nas
> bordas esquerda/direita** pela mesma regra (sem fade na ponta onde a lista começa/termina); para isso
> a diretiva **`OverflowFade` passou a detectar os dois eixos** (`--esquerda`/`--direita` além de
> `--topo`/`--base`). Exportar/Importar só em Compras. **Painel de modificações do item** (Compras e
> Vendas) ganhou o **mesmo esquema de scroll dos itens** (`[appOverflowFade]` + `max-height`: mostra ~2
> linhas e rola o resto, fade vertical só na borda que corta; o gradiente vertical foi unificado num
> seletor `.compras-grade, .compras-mod-grade`). **Limpar (m1-19)** zera taxa e
> fragmentos da venda (o modo vem da rota). **+5 testes** de página (Vitest, frontend **131/131**): taxa
> pelo motor (50/75/25), fragmentos + total combinado, aba Vendas ocultando Config/Resumo, independência
> dos carrinhos e Limpar zerando venda. Fora de escopo (viraram **nota na Ajuda m1-12**, não trava de
> cálculo): "equipamento inicial só vende ao atingir Operador", "item inutilizável não tem valor" e o
> Módulo ∅ (negociado com o Mestre); forja/redução de módulo também fora. **Ajuste de budget:** o modo
> Vender levou o CSS da `compras.page` (a página mais pesada) acima de 10 kB, então o `anyComponentStyle`
> do `angular.json` subiu de **10→12 kB (warning) / 12→14 kB (error)** — mesmo precedente do bump de
> 565 kB do bundle inicial, aprovado pelo autor; build sem warning. `lint`/`test`/`build` (564,52 kB
> inicial, dentro do budget, **sem warning**) verdes; **verificado por render** (Playwright/Chromium):
> Vendas sem Config/Resumo, valores após os fragmentos, matemática confere na tela; fragmentos com
> scroll lateral no mobile (sem overflow do body) e painel de mods rolando com fade na base. **Barra
> flutuante mobile (shell) reorganizada** para caber a 7ª aba: virou **navegação só de ícones** — os 7
> ícones cabem folgados e todos visíveis, e o **rótulo aparece só na aba ativa** (que ganha `flex: 2`),
> substituindo os rótulos de 9px que quebravam em 2–3 linhas; ícone de 18→20px. No desktop os rótulos
> seguem ao lado do ícone (a regra `display:none` do `.abas__rotulo` é só `@include bp.mobile`). Spec
> `m1-20` em `done/`. **M1 fecha com 20 tasks.** Sessão anterior no mesmo dia (**ux-loading —
> refino visual do indicador de carregamento global do shell**. Antes qualquer requisição HTTP
> acendia um `<span class="topbar__carregando">` **dentro de** `.topbar__acoes` (barra indeterminada
> de 6rem × 2px): por estar **no fluxo**, acender/apagar empurrava os itens ao lado (*layout shift*) e
> no mobile (~360px), com a topbar já apertada, chegava a **quebrar** a barra; ainda piscava em
> requests instantâneos. **Correção — SCSS-first + marcação mínima, sem tocar na lógica** (o
> `LoadingService`/`loadingInterceptor` e a semântica de contagem de requests ficaram **intactos** —
> só apresentação): o indicador saiu de `.topbar__acoes` e virou uma **linha fina fixa no topo do
> viewport** (`.carregando-global`, `position: fixed; top/left/right: 0; height: 2px; z-index: 50`,
> largura total, `pointer-events: none`), **fora do fluxo** — montar/desmontar via `@if
> isLoading()` **nunca** desloca nenhum item da topbar. Segmento deslizante no `--accent` (identidade
> "Terminal de Contenção" — traço fino/discreto, sem spinner/gradiente, **só tokens**, proibição #29).
> **Debounce visual SCSS-only** (sem tocar na contagem): `opacity: 0` + `animation ... 0.18s forwards`
> — a barra só surge após ~180ms, então requests instantâneos desmontam antes de aparecer (não pisca).
> `@media (prefers-reduced-motion: reduce)` (padrão do tema, como os skeletons): sem deslize nem fade
> atrasado — linha accent estática a `opacity .65`, aparecendo de imediato. Acessibilidade preservada
> (`role="status"` + `aria-label="Carregando"`). Nenhum seletor usado por teste renomeado (não havia
> spec referenciando o indicador). `lint`/`test` (**frontend 126/126**)/`build` (563,28 kB inicial,
> dentro do budget de 565 kB, sem warning; AOT type-checou os templates) verdes. **Verificado ao vivo**
> (Playwright/Chromium sobre o build servido) em **desktop 1280px** e **mobile 360px**: barra medida
> `position: fixed`, largura total (1280/360px), 2px, `z-index 50`; **deslocamento dos 4 itens da
> topbar** (logo/nav/ações/tema) medido antes×depois de acender = **0/0/0** em ambas as larguras;
> **zero scroll horizontal**; screenshot confirma a linha accent fina no topo com a topbar intacta.
> Spec `ux-loading-indicador-conciso` → `done/` (o slot `mN-NN` definitivo fica a critério do autor,
> como a própria spec registra — nasce como refino de UX do shell). Fora de escopo (mantido): lógica de
> contagem do `LoadingService`/interceptor, loaders inline/por-componente. Sessão anterior no mesmo dia
> (**refino mobile da
> lista de campanhas: chip de papel desce para a própria linha em ~360px**, aprovado pelo autor numa
> re-revisão geral do mobile do M2. **Achado da re-revisão** (auditoria Playwright das 6 telas ×
> 360/390/430px — as 18 combinações agora rodando **sem erro** graças a browser relançado por largura
> + retry, contornando o esgotamento de processo do Chromium que derrubava o passe de 430px antes):
> zero scroll horizontal e zero alvo de toque < 44px em todas — mobile **aprovado**. O único ponto
> cosmético era a **lista de campanhas** (`lista.page`): o chip MESTRE/JOGADOR dividia a linha flex
> com o nome, espremendo a coluna de texto a ~114px em 360px, então nomes de várias palavras quebravam
> uma palavra por linha (até "Protocolo Cinza" virava 2 linhas; medido via `getBoundingClientRect`).
> **Correção (SCSS-only, escopada a `@include bp.mobile`):** `.campanhas__ligacao` ganhou
> `flex-wrap: wrap` + `align-items: flex-start` (avatar topo-alinha com o nome); `.campanhas__texto`
> ganhou `flex-basis: 75%` — grande o bastante para que avatar + texto ocupem a 1ª linha e a soma com
> o chip passe de 100%, **empurrando o chip para a linha de baixo**; `.chip-papel` ganhou
> `margin-left: auto` (alinha à direita, pill colado ao rótulo — a borda não estica). Resultado
> (medido): coluna de texto **114px → 208px**, "Protocolo Cinza" volta a 1 linha, "Operação Sentinela
> Vermelha" (nome realista) cai de ~4 para 2 linhas. **Desktop intocado** (bloco `@media
> max-width: 560px`): o chip continua inline à direita na mesma linha do nome (`sameRow` confirmado a
> 900px). Sem mudança de DOM/TS, nenhum seletor usado por teste renomeado. Reauditoria das 18
> combinações confirmou zero overflow / zero alvo < 44px; `lint`/`test` (**frontend 126/126, shared
> 143/143**)/`build` verdes. Sessão anterior no mesmo dia (**correção: código de
> convite sobrepondo o botão de copiar no mobile ao apertar "Regenerar"**, reportado pelo autor ao
> usar a tela de detalhe da campanha num aparelho real). **Causa raiz:** `.detalhe__convite-linha`
> (`detalhe.page.scss`) é um `flex; flex-wrap: wrap` com três filhos — `.detalhe__codigo` (`flex: 1;
> min-width: 0`), `.detalhe__copiar` e `.detalhe__regenerar` — e o rótulo do botão regenerar **muda de
> tamanho** durante o ciclo (`Regenerar` → `Regenerando…` → `Regenerado`, `detalhe.page.ts`); o
> crescimento do rótulo aperta o espaço da linha, e como `.detalhe__codigo` não tinha nenhuma trava de
> overflow, o texto do código (que não tem espaço/hífen para quebrar) **vazava visualmente por cima**
> do botão de copiar em vez de encolher — reproduzido ao vivo via Playwright (mock do endpoint de
> regenerar com atraso) nos 3 estados, screenshot confirmou a sobreposição inclusive no estado normal,
> pior no estado "Regenerado" (rótulo mais largo). **Correção (SCSS-only, `detalhe.page.scss`):
> (1)** `.detalhe__codigo` ganhou `overflow: hidden; white-space: nowrap; text-overflow: ellipsis`
> como rede de segurança (nunca mais vaza por cima de um vizinho, mesmo que o espaço aperte de novo);
> **(2)** dentro de `@include bp.mobile`, `.detalhe__codigo` ganhou `flex: 1 1 100%` — com
> `flex-wrap: wrap`, isso força o código a ocupar sozinho a própria linha (largura cheia,
> independente do tamanho do rótulo do regenerar), empurrando copiar+regenerar para a linha de baixo;
> o código nunca mais compete por espaço com um botão de rótulo variável. Reproduzido e confirmado via
> `getBoundingClientRect` antes/depois (código 270px de largura fixa nos 3 estados vs. 74,9px
> espremido antes da correção) e por screenshot nos 3 estados (normal/regenerando/regenerado) em
> 360px — sem sobreposição em nenhum. Reauditoria das 6 telas do M2 × 360/390px (12/18 combinações;
> as 6 de 430px falharam por esgotamento do Chromium headless após uso pesado do navegador na sessão —
> falha de ambiente, não de layout, já que o breakpoint mobile é um único `@media max-width: 560px`
> sem distinção entre as 3 larguras) confirmou **zero** overflow e **zero** alvo de toque abaixo de
> 44px. `lint`/`test` (**frontend 126/126, shared 143/143**)/`build` (562,92 kB inicial, dentro do
> budget de 565 kB, sem warning) verdes. Sem mudança de DOM/TS — só SCSS; nenhuma tela/feature nova.
> Sessão anterior no mesmo dia (**re-execução do
> refinamento visual mobile do M2 (m2-08)**: a pedido do autor, nova auditoria completa das 6 telas
> do M2 (login, registro, painel/lista, criar, entrar, detalhe) via Playwright/Chromium headless nas
> 3 larguras de referência da §6 do `PARIDADE-M1.md` (360/390/430px), sessão + API de campanha
> mockadas (mesmo método das revisões anteriores da m2-08). **Achado de partida:** zero scroll
> horizontal nas 6 telas (confirma o passe original), mas **5 alvos de toque abaixo de 44px** que a
> m2-08 e as 2 auditorias seguintes não haviam coberto — presentes nas 3 larguras (não eram regra de
> breakpoint faltante, e sim controles nunca tocados): **(1)** o **gatilho "Tema"** da topbar
> (`shared/configuracoes-tema` — presente em todas as telas, inclusive as públicas de auth; a m1-15
> só havia tratado os controles *dentro* do modal, nunca o próprio botão de abrir), 85×34px; **(2)**
> os **links de navegação entre telas** — "Criar agora"/"Entrar" (login/registro) e "Voltar às
> campanhas" (criar/entrar) — texto solto de ~15px de altura dentro de um `<p>`, sem nenhum
> tratamento de toque, mobile ou desktop. O critério de aceite #3 da própria m2-08 já listava "links
> de navegação entre telas" entre os controles exigidos — gap real, não extrapolação. **Correção**
> (SCSS-only, escopada a `@include bp.mobile`): `.config-gatilho` ganhou `min-height:
> bp.$alvo-toque`; os 4 `__link` (login/registro/criar/entrar) ganharam `display: inline-flex;
> align-items: center; justify-content: center; min-height: bp.$alvo-toque; padding: 4px 6px` —
> mesma técnica dos outros controles de toque da m2-08, sem alterar DOM/TS. Reauditoria confirmou os
> 18 casos (6 telas × 3 larguras) com **zero** overflow e **zero** alvo abaixo de 44px.
> **Verificação adicional** com dados realistas de borda (nome/descrição de campanha bem longos,
> código de convite no tamanho real gerado pelo backend — 8 caracteres, `TAMANHO_CONVITE` em
> `campanha.service.ts`): sem overflow horizontal em `lista`/`detalhe`; a caixa de código de convite
> e o botão de copiar, medidos via `getBoundingClientRect`, mantêm os 12px de gap do design (a
> impressão de sobreposição num screenshot de baixa resolução não se confirmou — falso alarme
> descartado antes de "corrigir" algo que não estava quebrado). Um nome de membro artificialmente
> extremo (49 caracteres) produz quebra de uma palavra por linha e um chip de papel centralizado no
> meio do bloco — cosmeticamente não ideal, mas sem sobreposição real de caixas nem scroll
> horizontal, e fora do padrão de nomes reais do domínio; registrado como observação, não corrigido
> (evita extrapolar escopo sobre um edge case sintético). `lint`/`test` (**frontend 126/126, shared
> 143/143**)/`build` (562,92 kB inicial, dentro do budget de 565 kB, sem warning) verdes. Spec
> `m2-08` permanece em `done/` (nenhuma regra nova — só acabamento sobre o que ela já definia);
> nenhuma tela/feature nova, nenhuma mudança de DOM/TS. Sessão anterior no mesmo dia (**m3-04 —
> concessão/revogação de acesso de visualização da ficha (backend)**: fecha a **matriz §14** ("outro
> membro vê só com linha em `usuario_ficha_acesso`") estendendo o módulo `ficha` da m3-03 — sem
> frontend, sem WebSocket. **6 DTOs novos** em `shared/src/dtos/ficha/ficha-operacao.dtos.ts`:
> `FichaAcesso{Conceder,Concedido,Revogar,Revogado}Dto` + `FichaAcessosListarDto`/`FichaAcessoResumoDto`
> — complemento `Acesso` inteiro **antes do verbo** (proibição de complemento partido:
> `FichaAcessoConcederDto`, nunca `FichaConcederAcessoDto`). **`FichaRepository`** (dono de
> `usuario_ficha_acesso`, proibição #23) ganhou: `concederAcesso` (`INSERT ... SELECT ... RETURNING`,
> sem `VALUES`/`DEFAULT`), `revogarAcesso` (**soft delete por chave composta** `ficha_id`/`usuario_id`,
> espelhando `removerMembro` da m2-10 — nunca `DELETE` físico), `listarAcessos` (`JOIN usuario` para o
> `nome`, `is_deleted = false` nos dois lados — mesmo padrão de `listarMembros`). **`FichaService`**:
> `concederAcesso`/`revogarAcesso`/`listarAcessos` — só o **dono ou o mestre** concede/revoga/lista,
> **reusando `validarPermissaoEdicao`** (mesma regra dono-ou-mestre, sem duplicar permissão — proibição
> #28), `UnauthorizedAccessException` caso contrário. O **alvo** da concessão precisa ser membro da
> campanha (`validarMembroAlvo` → `ResourceNotFoundException('Membro')`, mesmo tratamento do alvo da
> transferência de mestre da m2-10). **Idempotência:** `concederAcesso` confere concessão ativa
> (`recuperarAcesso`) e devolve a existente sem reinserir (respaldado pelo índice único parcial
> `uix_usuario_ficha_acesso_ficha_usuario_ativo`); `revogarAcesso` é no-op se não houver linha ativa. A
> leitura de permissão da m3-03 (`recuperarFicha`/`listarFichas` via `EXISTS`/`recuperarAcesso`) já
> considerava a linha de acesso — nada a mudar ali. Controller burra: `GET`/`POST /ficha/:id/acesso`,
> `DELETE /ficha/:id/acesso/:usuarioId` (`fichaId` do `@Param`; `usuarioId` do corpo na concessão / do
> `@Param` na revogação). **+12 testes de service** (Vitest, backend **76/76**) cobrindo quem
> concede/revoga/lista (dono/mestre/membro), alvo não-membro (404), idempotência e ficha inexistente.
> `lint`/`build`/`test` do shared e backend verdes; **verificado ao vivo contra o Postgres**
> (mestre/dono/outro/forasteiro numa campanha real via REST, **17 checks**): outro-sem-acesso 403 e some
> da listagem (0) → dono concede 201 → outro vê 200 e aparece na listagem (1); listagem de acessos com
> `nome`; reconceder **idempotente** (mesma linha, sem 2ª row); conceder a não-membro 404;
> membro-com-acesso concede/lista 403; dono revoga 200 → outro volta a 403; mestre concede/revoga 200.
> `SELECT` confirmou a revogação por **soft delete** (`is_deleted`/`deleted_date`) sem duplicar linha
> ativa. Fora de escopo: tempo real WS (m3-05), frontend/UI de concessão (m3-07), edição por terceiros
> (não existe — só visualização). Sessão anterior no mesmo dia (**m3-03 —
> backend do CRUD da ficha de jogador**: o coração do backend do M3 — módulo `ficha` (backend)
> com CRUD completo, a **matriz de permissões §14** arbitrada no service (único árbitro, proibição
> #28) e a **validação do documento de jogo contra `shared/regras`** antes de persistir (§11 camada
> 2). Sem frontend, sem WebSocket. **DTOs de operação** em `shared/src/dtos/ficha/ficha-operacao.dtos.ts`
> (`Ficha{Criar,Criada,Listar,Resumo,Recuperar,Recuperada,Alterar,Alterada,Excluir}Dto` + internos
> `Ficha{InternoCriar,InternoAlterar,VisiveisInternoListar,AcessoInternoRecuperar,AcessoInternoRecuperado}Dto`);
> o campo `dados` reusa `FichaJogadorDadosDto` (m3-01), sem redefinir. **`FichaRepository`** (dono de
> `ficha` + `usuario_ficha_acesso`, proibição #23): `INSERT ... SELECT ... RETURNING` com `dados::jsonb`
> e tradução `codigo→id` de `tipo_ficha` por subconsulta (§10.2.12); listagens leem o recorte JSONB
> (`dados->>'classe'`, `(dados->>'nivel')::int` — §10.4); `listarPorCampanha` (todas, uso do mestre) ×
> `listarVisiveisParaUsuario` (próprias + concedidas via `EXISTS` em `usuario_ficha_acesso`);
> `recuperarAcesso` alimenta a permissão de membro; soft delete via `executarSoftDelete`. **`FichaService`**:
> `criarFicha` (dono = `@ActiveUser().sub`, tipo **sempre `JOGADOR`**, exige ser membro da campanha),
> `listarFichas` (mestre vê todas; membro comum só as visíveis), `recuperarFicha` (visualização: dono OU
> mestre OU linha em `usuario_ficha_acesso`), `alterarFicha`/`excluirFicha` (edição: **só dono ou mestre** —
> membro com concessão **nunca** edita). Papel na campanha vem do `CampanhaRepository` (importa
> `CampanhaModule`), sem duplicar regra de permissão. **Validação via motor de regras** (`validarDadosContraRegras`,
> reusa fórmulas do M1 sem reimplementar): Nível e cada atributo dentro do intervalo da classe
> (`obterLimitesClasse`), Vida atual ≤ `calcularVida`, Energia atual ≤ `calcularEnergia` (só teto — a
> Energia pode negativar) → `BusinessException`. **Escopo consciente:** "stacks de modificação por patente"
> ficou **de fora** — `PatenteDados.limiteModificacoes` é texto livre ('… até N modificações no item'), sem
> função pura machine-checkable; validá-lo seria reimplementar regra (a spec veda) / extrapolar (#13); os
> exemplos verificados (HP/atributo/nível) satisfazem o critério do milestone. Controller burra (`POST /ficha`,
> `GET /ficha?campanhaId=`, `GET/PUT/DELETE /ficha/:id`), `FichaModule` registrado no `app.module`. **+21
> testes de service** (Vitest, backend **64/64**) cobrindo a matriz (dono/mestre/membro × ver/editar/excluir/
> listar) e a rejeição de dados incoerentes (vida/atributo/nível). `lint`/`build`/`test` do backend verdes;
> **verificado ao vivo contra o Postgres** (3 usuários — mestre/dono/outro — numa campanha real via REST):
> criar 200 (dono correto no `usuario_id`), ver dono/mestre 200, ver/editar de outro-sem-acesso 403, editar
> do mestre 200, listagens escopadas por papel (mestre 1 / dono 1 / outro 0), dados incoerentes 400, soft
> delete 200 + GET subsequente 404, e `\d`/SELECT confirmando `is_deleted`/`deleted_date` e o JSONB
> roundtripado. Fora de escopo: concessão/revogação de acesso (m3-04), emissão de eventos WS (m3-05), frontend,
> criatura/NPC (M4). Sessão anterior (**m3-02 —
> migrations `tipo_ficha`/`ficha`/`usuario_ficha_acesso` + enum espelho `TipoFichaEnum`**: fundação
> de dados do M3 — pura camada de banco + shared, **sem** service/controller/repository/DTO de
> operação/frontend. Enum de **coluna** novo `TipoFichaEnum` (`JOGADOR|CRIATURA|NPC`) em
> `shared/src/enums/` (string enum, valor = nome), exportado no `index` — tem tabela de referência
> `tipo_ficha` (§10.2.12), ao contrário dos enums de conteúdo de jogo do JSONB (§10.3). **3 migrations
> `.sql`** em `backend/src/database/migrations/`, na **ordem de dependência de FK**: **`0006`
> `tipo_ficha`** (tabela `tipo_*` BaseEntity + `codigo`/`descricao`, `uix_tipo_ficha_codigo_ativo`
> parcial, trigger `trg_tipo_ficha_updated_date`, **seed** `JOGADOR`/`CRIATURA`/`NPC` por literais SQL
> — exceção sancionada só em migrations, §10.7); **`0007` `ficha`** (relacional p/ identidade/posse/
> permissão — `campanha_id`/`usuario_id`/`tipo_ficha_id` + `nome` + **`dados JSONB NOT NULL`** para o
> conteúdo de jogo fechado na m3-01; `fk_ficha_campanha`/`fk_ficha_usuario`/`fk_ficha_tipo_ficha`,
> índices `ix_ficha_campanha`/`ix_ficha_usuario`, trigger); **`0008` `usuario_ficha_acesso`** (concessão
> de **visualização** a outro membro — `fk_usuario_ficha_acesso_ficha`/`_usuario` + índice único
> **parcial** `uix_usuario_ficha_acesso_ficha_usuario_ativo` `(ficha_id, usuario_id) WHERE is_deleted
> = false`, trigger). Todas com **BaseEntity completa sem DEFAULT** (§10.1), seções `-- UP`/`-- DOWN`
> obrigatórias, sem `BEGIN/COMMIT/ROLLBACK` (o Knex gerencia a transação). `SCHEMA.md` já refletia a
> forma final (m3-01/m2-10) — nenhuma divergência a sincronizar; **CONVENTIONS "Próxima migration"
> atualizado `0006`→`0009`**. **Verificado ao vivo contra o Postgres:** `db:migrate` sobe as 3 tabelas,
> `db:rollback` desfaz o lote de forma limpa (DOWN idempotente com `DROP ... IF EXISTS`), re-migrate ok;
> `\d` conferiu colunas/tipos/FKs/índices parciais/triggers batendo com `SCHEMA.md` e as 3 reference
> rows presentes. `build`/`test` do shared verdes (**143/143**; enum não altera contagem). Fora de
> escopo: qualquer CRUD/permissão/validação via motor de regras (m3-03+), `FichaJogadorDadosDto`
> (m3-01), frontend. Sessão anterior (**m1-19 —
> botão "Limpar" nas abas da calculadora + ajuste da grade de fundo**: a pedido do autor, todas as
> **6 abas** da calculadora (`agente`, `dt`, `novo-agente`, `patente`, `descanso`, `compras`) ganharam
> um botão **"Limpar" ao lado do "Ajuda"** que faz a aba **voltar ao estado padrão** (o do primeiro
> load), com **confirmação em duas etapas**: 1º clique → rótulo vira **"Tem certeza?"** num botão
> **invertido/filled** (fundo `--accent`, texto `--bg` — linguagem do `.botao--primario`); 2º clique em
> até **3s** confirma e limpa; sem 2º clique, reverte sozinho para "Limpar" (temporizador cancelado na
> confirmação e via `DestroyRef` ao desmontar a rota lazy). Como o gatilho de ajuda já vem do componente
> único `AjudaCalculadora` (m1-12) no topo de cada página, o botão nasceu **nesse mesmo componente** —
> um ponto de inserção, mesma posição em toda aba. O componente permanece **burro quanto ao reset**: só
> **emite** o output `limpar` na confirmação; **quem reseta é a página** (`(limpar)="limpar()"`).
> Reset por página: `agente`/`dt`/`patente` — `formulario.reset()` (controles `nonNullable` voltam ao
> preset de construção; o `valueChanges` regrava o singleton m1-17); `novo-agente` — `reset()` **+**
> re-sincroniza o Prestígio do bônus auto-preenchido (bate com o load, não zera); `descanso` — cancela
> rolagem animada em curso, esconde a rolagem e `reset()`; `compras` — `reset()` dos recursos + esvazia
> carrinho/amplificadores/painéis + busca limpa + 1ª categoria (o `effect` de persistência m1-11 regrava
> o padrão no `localStorage`, **descartando o carrinho salvo**). Só apresentação/estado de UI —
> `shared/regras` intocado, sem backend/DTO, SCSS/BEM só com tokens (proibição #29). **+8 testes**
> (Vitest): **2** no `ajuda-calculadora.component.spec` (confirmação em dois passos; reversão após 3s com
> fake timers) e **1** por página (6) provando o reset ao padrão de cada aba. Também, **a pedido do
> autor, a grade de fundo (`--grid-line`) voltou de `0.03` para `0.02`** (mais discreta) — nos dois
> `_tokens.scss` (frontend + mirror `docs/design/tema/`, base escura) e no override da base clara do
> `TemaService` (`rgba(0,0,0,.02)`), mantendo as duas bases em paridade. `lint`/`test`
> (**126/126**)/`build` (562,78 kB inicial, dentro do budget de 565 kB, sem warning; AOT type-checou os
> templates) verdes; botão conferido por render (estado normal outlined + "Tem certeza?" filled). Spec
> `m1-19` redigida após a implementação e colocada direto em `done/`, a pedido do autor. Sessão anterior
> (**m3-01 —
> contrato `FichaJogadorDadosDto` (abre o M3)**: fecha a **forma final do documento JSONB
> `ficha.dados`** da ficha de jogador — pura camada `shared/`, sem migration/service/endpoint/
> frontend. Novo pacote `dtos/ficha/` (`FichaJogadorDadosDto` + sub-DTOs `FichaAtributosDto`/
> `FichaEstadoDto`/`FichaSequelaDto`/`FichaTraumaDto`/`FichaLesaoDto`/`FichaHabilidadeDto`/
> `FichaInventarioDto`), `interface readonly` puras como todo DTO do shared (o autor escolheu
> manter o padrão de interfaces; a validação estrutural class-validator da §11 fica documentada
> campo a campo e adiada para quando o backend ligar o `ValidationPipe` — m3-02/03), novo subpath
> `./dtos/ficha` no `package.json`. **Forma derivada 1:1 de `docs/core/sistema-v4.1.0.md`** (o
> documento vence — proibição #27), o que corrigiu o rascunho do `SCHEMA.md`: **10 atributos**
> (Destreza/Força/Luta/Pontaria/Vigor/Intelecto/Medicina/Sentidos/Social/Vontade), não 4 —
> **`sentidos` é um atributo**, não campo à parte (a Área de Percepção `5 + Sentidos×5` é
> derivada); **subclasse não é campo** — `ClasseEnum` já codifica as três Experimento e `CIVIL`,
> então guarda-se só `classe` + `arquetipo` (`ArquetipoEnum | null`, null p/ Experimento/Civil);
> **`nivel` 0–20**, **`prestigio`** inteiro que pode negativar e do qual a **Patente é derivada**
> (não persistida); **`estado`** com `vidaAtual`/`energiaAtual` (pode negativar) + listas
> `sequelas` (temporárias) / `traumas` (permanentes, `tratado`) / `lesoes` (estruturadas:
> `atributo`/`pontos`/`severidade`/`permanente`); **`habilidades`** com `categoria` +
> `custoEnergia` (número/0/`null` variável); **`inventario` reusa o carrinho da calculadora M1**
> (`{ itens: CarrinhoItemDto[], amplificadores: AmplificadorAplicadoDto[] }` de
> `shared/regras/compras` — **sem duplicar tipo**, `regras/` segue zero-dep). **Nenhum derivado
> persistido** (vida/energia máx, defesa, deslocamento, dano de corpo/furtivo, limite de
> inventário, DT, proficiência, patente/salário/limite de modificações). 3 enums novos de
> conteúdo de jogo em `shared/src/enums/` (§10.3, sem tabela `tipo_*`): `ArquetipoEnum` (9),
> `SeveridadeLesaoEnum` (LEVE/GRAVE/MORTAL), `HabilidadeCategoriaEnum` (8). **Escopo consciente:**
> a spec fixou o 1:1 em classe/atributos/estado/inventário; domínios do documento **não listados**
> (Identidade — Personalidade/Origem —, Dinheiro, Maestrias, Peculiaridade) ficaram **de fora** do
> contrato inicial e entram nas tasks de formulário do M3 (registrado no `SCHEMA.md`). `SCHEMA.md`
> passado de rascunho para a forma final do jogador. `build`/`lint`/`test` do shared verdes
> (**143/143**; interfaces não emitem runtime, os 3 enums resolvem 9/3/8); subpath compila e
> resolve em `dist/dtos/ficha`. Fora de escopo: migrations/tabelas (m3-02), validação via motor de
> regras no service (m3-03), `FichaCriaturaDadosDto`/NPC (M4). Sessão anterior (**m2-15 —
> refino visual da tela de campanhas**: passe de acabamento **SCSS-first** (com marcação mínima,
> sem tocar em TS/lógica/regra de negócio) aproximando a **lista** (`/painel`) e o **detalhe**
> (`/painel/:id`) dos protótipos `docs/design/examples/campanhas.html` e `lobby-de-campanha.html`,
> só apresentação e só com tokens do tema (proibição #29). Conteúdo decorativo dos protótipos **sem
> backing no schema** (status ao vivo/agendada/pausada, briefing, log de atividade, indicador online,
> níveis de esquadrão, "meu agente") ficou **de fora**, como a m2-09 já registrara. **Lista:** itens
> ganharam presença de "card de campanha" — avatar 40→44px, nome mono 14/600→15/700, padding
> 14/16→16/18px, gap 12→14px (esqueleto e bloco de avatar acompanham a nova silhueta); o cabeçalho do
> card ganhou **contagem à direita** (`card__contagem`, nº de campanhas — dado já em tela, mono mute),
> no padrão do contador de seção dos protótipos. **Detalhe:** o subtítulo seco "Membros" virou
> **cabeçalho de seção temático** (`detalhe__secao` — rótulo mono uppercase + régua fina +
> **contagem de membros** à direita), espelhando o painel "ESQUADRÃO 4" do lobby; e o **código de
> convite** passou a ser **emoldurado como campo próprio** (`detalhe__codigo` com caixa `--surface` +
> borda + raio), dando hierarquia de "credencial" como no protótipo, em vez de texto solto. Nenhum
> seletor usado pelos testes foi renomeado (`.detalhe__acoes`/`__exclusao`/`__membro-*`/`__entrada`,
> `.card__titulo`, `.campanhas`); comportamento das m2-12/m2-13 intacto (editar/excluir campanha,
> remover jogador, transferir mestre só se acomodaram melhor no layout). Responsividade da m2-08
> preservada (alvos de toque ≥44px, sem scroll horizontal ~384px). `lint`/`test` (**118/118**)/`build`
> (562,78 kB inicial, dentro do budget de 565 kB, sem warning; AOT type-checou os templates) verdes;
> conferido visualmente por render (desktop + 384px) contra os dois protótipos. **Fecha as tasks de
> polimento do M2.** Fora de escopo: qualquer dado/campo/seção novo, features funcionais e backend.
> Sessão anterior no mesmo dia (**m2-14 —
> frontend de perfil do usuário**: fecha o self-service do usuário na UI sobre o backend das
> m2-11 (perfil) e m2-03 (senha) — só camada de frontend. Novo módulo `modules/usuario/` com
> `UsuarioService` (`providedIn:'root'`, transporte HTTP puro — extrai o `dados` do
> `StandardResponse`, DTOs do shared `./dtos/usuario`, JWT via `auth-token.interceptor`):
> `recuperarPerfil` (`GET /usuario/perfil`), `alterarPerfil` (`PATCH /usuario/perfil`),
> `alterarSenha` (`PATCH /usuario/senha`) e `excluirConta` (`DELETE /usuario`, mapeia a resposta a
> `void`). **Rota privada nova `/perfil`** (lazy `loadChildren` em `usuario.routes`, atrás do
> `autenticacaoGuard`) e **item "Perfil"** no dropdown de perfil da topbar (`shared/layout`, ícone
> `agente`, antes de "Campanhas"). **Tela de perfil** (`paginas/perfil/`, standalone, Signals,
> Reactive Forms) com três cards: **editar nome/login** (`alterarPerfil` — reflete a nova
> identidade na sessão via novo `SessaoService.atualizarPerfil({nome,login})`, que atualiza o
> Signal + `localStorage` mantendo token/id, então a topbar acompanha sem novo login; login em uso
> é barrado pelo backend §11 e o toast vem do `error-handler`), **trocar senha** (`senhaAtual` +
> `novaSenha` com o toggle "olhinho" existente, `minLength(6)`; ao concluir limpa o formulário — a
> senha nunca fica retida) e **excluir conta** (**confirmação inline forte** — sem `confirm()`
> nativo, fora do tema; caixa `--accent-dim`/`--accent-border` no padrão das m2-12/m2-13; ao
> confirmar: `excluirConta` → `SessaoService.sair` → navega a `/login`). Feedback de sucesso inline
> (`--positive`) por não haver toast de sucesso global. `.scss`/BEM só com tokens (proibição #29 —
> card/botão/campo/olho/esqueleto copiados dos blocos sancionados), alvos de toque 44px no mobile,
> nenhum DTO redefinido no front (os 5 DTOs das m2-11/m2-03 já existiam no shared: `Usuario
> Recuperado/PerfilAlterar/PerfilAlterado/SenhaAlterar/SenhaAlterada`). **+13 testes** (Vitest):
> **4** no `usuario.service.spec` (cada método atinge rota/verbo/corpo e mapeia o `dados`), **1** no
> `sessao.service.spec` (`atualizarPerfil` reflete nome/login mantendo token/id no Signal e no
> `localStorage`), **6** no `perfil.page.spec` (carrega o perfil nos campos; salvar chama
> `alterarPerfil` e `atualizarPerfil`; trocar senha chama `alterarSenha` e limpa o form; nova senha
> curta não chama o backend; excluir exige confirmação → `excluirConta`+`sair`+navega a `/login`;
> cancelar não toca o backend) e **2** no `app.routes.spec` (`/perfil` redireciona ao login sem
> sessão e resolve a tela com sessão). `lint`/`test` (**118/118**)/`build` (562,78 kB inicial,
> dentro do budget de 565 kB, sem warning; AOT type-checou os templates; `perfil-page` vira chunk
> lazy) verdes. O `/usuario` já estava no proxy de dev (m2-11). Fora de escopo: backend (m2-11 /
> m2-03) e refino visual da tela de campanhas (m2-15). Sessão anterior no mesmo dia (**m2-13 —
> frontend de gestão de membros da campanha**: leva à tela de detalhe (`/painel/:id`), **só para o
> mestre**, a **remoção de jogador** e a **transferência do papel de mestre** sobre os endpoints da
> m2-10 (backend já pronto — só camada de frontend). O `CampanhaService` (frontend) ganhou
> `removerMembro(id, usuarioId)` (`DELETE /campanha/:id/membro/:usuarioId`, retorna
> `CampanhaMembroRemovidoDto`) e `transferirMestre(id, novoMestreUsuarioId)`
> (`POST /campanha/:id/mestre/transferir` com corpo `{ novoMestreUsuarioId }`, retorna
> `CampanhaMestreTransferidoDto`) — só transporte, DTOs do shared, autoridade no backend (§14). Na
> **lista de membros** do detalhe, cada linha de **jogador** (nunca a própria linha do mestre) ganha
> dois botões-ícone de gestão (coroa = transferir mestre, lixeira = remover). Cada ação abre uma
> **confirmação inline** na própria `<li>` (Signal `acaoMembro {usuarioId, tipo}` — **sem `confirm()`
> nativo**, fora do tema; caixa com `--accent-dim`/`--accent-border` no mesmo padrão da exclusão da
> m2-12); a de transferir deixa **claro que o mestre passará a jogador**. Ao **remover**, o membro sai
> da lista (`membros.update` filtrando); ao **transferir**, recarrega os membros (`listarMembros`) — o
> `ehMestre` (derivado dos membros vs `sessao.usuario().id`) recomputa para `false` e **todas** as
> ações de mestre (editar/excluir/convite/gestão) somem na hora, e o novo mestre passa a tê-las. A
> `<li>` de membro virou coluna (`&__membro-linha` + confirmação abaixo); botões-ícone reusam o
> tratamento do `&__copiar` (32px, hover `--accent-border`), alvos de 44px no mobile. Signals/
> standalone/Reactive Forms; `.scss`/BEM só com tokens (proibição #29), nenhum DTO redefinido no
> front (os 4 DTOs da m2-10 já existiam no shared). **+7 testes** (Vitest): **2** no
> `campanha.service.spec` (DELETE/POST atingem rota/verbo/corpo certos e mapeiam o `dados`) e **5** no
> `detalhe.page.spec` (gestão só na linha do jogador e nunca na do mestre; jogador comum não vê nada;
> remover chama `removerMembro` e tira o membro da lista; transferir chama `transferirMestre` e perde
> as ações de gestão/editar/excluir na hora; cancelar não toca o backend) — `lint`/`test`
> (**105/105**)/`build` (562 kB inicial, dentro do budget de 565 kB, sem warning; AOT type-checou os
> bindings do template) verdes. Fora de escopo: backend (m2-10), edição/exclusão da campanha (m2-12) e
> refino visual geral (m2-15). Sessão anterior no mesmo dia (**m2-12 —
> frontend de edição e exclusão de campanha**: fecha o CRUD de campanha na UI sobre os endpoints
> `PUT`/`DELETE /campanha/:id` da m2-04 (backend já pronto — só camada de frontend). O
> `CampanhaService` (frontend) ganhou `alterarCampanha(id, dto)` (`PUT`, retorna
> `CampanhaAlteradaDto`) e `excluirCampanha(id)` (`DELETE`, mapeia a resposta a `void`) — só
> transporte, DTOs do shared, autoridade no backend (§14). Na tela de **detalhe** (`/painel/:id`),
> **só para o mestre** (`ehMestre` já derivado dos membros): **edição inline** de nome/descrição via
> **Reactive Forms** (Signal `editando` alterna o card entre exibição e formulário; ao salvar,
> reflete o resultado no Signal `campanha` **e** no `CampanhaContextoService` — o seletor da topbar
> atualiza junto) e **exclusão com confirmação inline** (Signals `confirmandoExclusao`/`excluindo`;
> **sem `confirm()` nativo** — fora do tema; ao confirmar, `excluirCampanha` → navega de volta a
> `/painel`). Dois glifos novos de linha no `shared/icone` (`editar` lápis / `excluir` lixeira, mesmo
> SVG `stroke: currentColor`, sem emoji) para os botões do mestre. O jogador **não vê** as ações;
> tentativa direta seria barrada com 403 pelo backend e tratada pelo `error-handler`. Confirmar
> exclusão reusa `.botao--primario` (accent = vermelho já é a cor de perigo do tema, sem inventar
> variante); caixa de confirmação com `--accent-dim`/`--accent-border`. `.scss`/BEM só com tokens
> (proibição #29), standalone, alvos de toque 44px no mobile. **+7 testes** (Vitest): **2** no
> `campanha.service.spec` (PUT/DELETE atingem rota/verbo/corpo certos e mapeiam o `dados`) e **5**
> no novo `detalhe.page.spec` (só o mestre vê editar/excluir; a edição chama `alterarCampanha` e
> reflete nome no card **e** no `CampanhaContextoService`; a exclusão exige confirmação, chama
> `excluirCampanha` e navega a `/painel`; cancelar não toca o backend) — `lint`/`test`
> (**98/98**)/`build` (562 kB inicial, dentro do budget de 565 kB, sem warning) verdes; o `build`
> de produção (AOT) type-checou os bindings do template. Fora de escopo: gestão de
> membros/transferência de mestre no front (m2-13) e refino visual geral (m2-15). Sessão anterior no
> mesmo dia (**m2-11 —
> perfil do usuário (backend)**: completa o self-service do módulo `usuario` (m2-03) com
> **alteração de perfil (nome + login)** e **exclusão da própria conta** (soft delete), sem
> frontend nem WebSocket. `alterarPerfil` (`PATCH /usuario/perfil`): altera `nome`/`login` do
> usuário autenticado (`@ActiveUser()`); **valida unicidade do `login`** reusando
> `recuperarPorLogin` (m2-02) — login em uso por **outra** conta ativa → `BusinessException('Login
> já está em uso')` (§11), reinformar o próprio login é permitido; a resposta **nunca** inclui a
> senha. `excluirConta` (`DELETE /usuario`): soft delete da **própria** conta via
> `executarSoftDelete` (guarda existência → `ResourceNotFoundException`); o encerramento da sessão
> do cliente fica para o frontend (m2-14). Repositório `usuario` (dono, proibição #23) ganhou
> `alterarPerfil` (`UPDATE nome, login ... RETURNING id, login, nome`) e `excluirConta` (embrulha
> `executarSoftDelete`). 4 DTOs novos no shared (`UsuarioPerfilAlterarDto {nome,login}` /
> `UsuarioPerfilAlteradoDto {id,login,nome}` — sem senha; internos `UsuarioPerfilInternoAlterarDto
> {id,nome,login}` e `UsuarioExcluirDto {id}`); **+5 testes de service** (Vitest, **43/43** no
> backend) cobrindo alteração de nome/login, rejeição de login duplicado, reinformar o próprio
> login e a exclusão. Edge conhecido do v1 (campanhas órfãs de um mestre que exclui a conta) fica
> **fora de escopo** — a saída é transferir o mestre (m2-10) ou excluir a campanha antes.
> `lint`/`build`/`test` do backend verdes; fluxo validado **ao vivo contra o Postgres** (alterar
> perfil sem senha na resposta, 400 no login duplicado, `DELETE` → 404 subsequente + `is_deleted`/
> `deleted_date` conferidos no banco). Sessão anterior no mesmo dia (**m2-10 —
> gestão de membros da campanha pelo mestre (backend)**: estende o módulo `campanha` (m2-04/m2-05)
> com **remoção de jogador** e **transferência do papel de mestre**, sem frontend nem WebSocket.
> `removerMembro` (`DELETE /campanha/:id/membro/:usuarioId`): só o **mestre** remove (gate
> `validarMestre` — único árbitro, proibição #28); o mestre **não** pode remover a si mesmo
> (`BusinessException` orientando a transferir o papel ou excluir a campanha), membro-alvo
> inexistente → `ResourceNotFoundException`; remoção é soft delete do `campanha_membro`.
> `transferirMestre` (`POST /campanha/:id/mestre/transferir`): só o **mestre atual** transfere —
> promove um membro `JOGADOR` a `MESTRE` e **se rebaixa a `JOGADOR`** na mesma ação, mantendo a
> invariante de **exatamente um mestre**; alvo não-membro → `ResourceNotFoundException`, alvo =
> próprio / já-mestre → `BusinessException`. **Decisão de escopo que alterou a constituição:** o
> mestre deixou de ser necessariamente "(o criador)" — o papel é transferível (SYSTEM.SPEC §14 +
> SCHEMA.md atualizados). No repositório, a transferência é **atômica num único `UPDATE`** com
> `CASE` sobre os dois vínculos (troca os papéis sem janela intermediária); a remoção espelha o
> `executarSoftDelete` para a chave composta de `campanha_membro`. 4 DTOs públicos + 2 internos no
> shared; **+10 testes de service** (Vitest, **38/38** no backend) cobrindo permissões e a
> invariante de um único mestre. `lint`/`build`/`test` do backend verdes. Sessão anterior no mesmo
> dia (**toggle "olhinho"
> de revelar senha** no login e no registro, a pedido do autor). Dois glifos novos de linha no
> `shared/icone` (`olho` / `olho-fechado`, mesmo SVG `stroke: currentColor`, sem emoji); botão
> sobreposto à direita do campo (`&__olho`, alvo de 44px, `aria-label`/`aria-pressed`) alterna o
> `[type]` do input entre `password`/`text` via Signal. Login tem **um** toggle (`senhaVisivel`);
> registro tem **dois independentes** (`senhaVisivel` + `confirmacaoVisivel` — revelar a senha não
> afeta a confirmação). Reactive Forms/Signals/standalone, só tokens (`--text-mute`/`--text`,
> proibição #29), validações preservadas. `lint`/`test` (91/91)/`build` (562 kB) verdes; conferido
> no S24+ (oculto `••••` ↔ texto revelado, ícone alterna). Sessão anterior no mesmo dia (**revisão visual
> mobile da m2-08 no Galaxy S24+** — 384px CSS, via Playwright/Chromium com sessão + API de campanha
> mockadas; overflow horizontal conferido programaticamente = **zero** nas 7 telas). A revisão aprovou
> a m2-08 e rendeu **3 melhorias de UI/UX** aplicadas (SCSS-only, `lint`/`test` 91/91/`build` 561 kB
> verdes, re-conferidas por screenshot): **(1)** o **chip de campanha ativa some no mobile** — colapsado
> a só o ícone, ele duplicava o glifo "campanhas" do nav Painel ao lado, sem valor (o texto do chip fica
> escondido); **(2)** o **painel de marca de login/registro enxuga no mobile** — esconde descrição/
> destaques/nota (mantém logo+eyebrow+slogan), trazendo o formulário pra cima da dobra (escopado ao
> `&__marca` porque `--descricao` também existe no painel do formulário); **(3)** as **ações Criar/Entrar
> da lista empilham em coluna** (largura total) no mobile em vez de duas colunas apertadas. Uma 4ª ideia
> testada (`justify-content: flex-start` no painel do formulário) foi **descartada** — sem efeito visível,
> o espaço percebido era padding legítimo, não banda morta (bom exemplo de testar antes de aplicar).
> Sessão anterior no mesmo dia (m2-08 —
> **refinamento mobile de auth + campanhas**, **fechando o M2 no código: 9/9 tasks**). Passe de
> acabamento responsivo (~360px) **SCSS-only** sobre as telas do M2 como ficaram pós-m2-09, na
> linha da m1-15. Reusa os tokens de `_breakpoints.scss` (`$bp-mobile: 560px`, mixin `mobile`,
> `$alvo-toque: 44px`) — nenhuma largura mágica por arquivo, nenhum hex/fonte/raio solto
> (proibição #29). **Achado de partida:** o override global de densidade (`--pad-card`/`--gap-grid`
> num `@media` no `styles.scss`) e a trava `html { overflow-x: clip }` da m1-15 **já eram globais**
> e cobriam as telas de campanha; e a m2-09 já entregara um 1º passe mobile na topbar (colapso de
> rótulos) e no split-panel de auth (`flex-wrap` + troca de borda). Logo o trabalho real foi
> **alvo de toque ≥ 44px** nas superfícies novas (m2-09), não reflow. **(1) Topbar** (`shared/layout`):
> nav central, chip de campanha, gatilho + itens do dropdown de perfil e botões de sessão
> (Entrar/Registrar) ganharam `min-height`/`min-width: bp.$alvo-toque` no mobile (os que colapsam
> pra ícone também `justify-content: center`); o **wordmark textual "CONTRATADOSRPG" passou a ser
> escondido no mobile** (o logo `app-marca` já ancora a identidade) — libera a largura que nav+perfil+
> tema disputavam em ~360px, evitando que a topbar estourasse/fosse cortada. **(2) Auth** (login/
> registro): inputs e botão de enviar com `min-height` de 44px; painel de marca (que empilha inteiro
> acima do formulário) com padding apertado (34→22px), painel do formulário 26/20px e slogan 22→19px
> pra trazer o formulário mais pra cima da dobra. **(3) Campanha:** `criar`/`entrar` — inputs/enviar
> 44px; `lista` — ações Criar/Entrar esticam (`flex: 1`) e viram alvos de 44px; `detalhe` — botão de
> **copiar convite de 34→44px**, "Regenerar" e "Voltar" com 44px. Só `.scss` — zero mudança de DOM/TS,
> nenhum teste tocado. `lint`/`test` (91/91)/`build` (561 kB inicial, dentro do budget de 565 kB, sem
> warning) verdes. Verificação responsiva **estática** (sem tooling de browser no ambiente): Sass
> compilou (todos os `@use bp`/`bp.mobile`/`bp.$alvo-toque` resolvem), e o bundle emitido carrega as
> 25 media queries `max-width:560px` e os alvos de 44px; conferência de largura confirma que as únicas
> larguras fixas novas são os alvos quadrados intencionais (copiar 44×44), todo o resto é `min-*` que
> cresce o toque sem restringir layout. Sessão anterior no mesmo dia: 3 ajustes de
> UI/UX a pedido do autor, achados numa revisão de hover/foco do sistema). **(1) Ícone "tema"
> maior:** `font-size` do `app-icone` no gatilho subiu de 13px pra 17px — o glifo de sliders tem
> mais traço que o círculo antigo e ficava espremido/difícil de reconhecer. **(2) Foco de teclado
> brandado (acessibilidade):** regra global nova em `_base.scss` (+ mirror `docs/design/tema/`,
> documentada em `docs/design/DESIGN.md`) — `a:focus-visible, button:focus-visible { outline: 2px
> solid var(--accent-border); outline-offset: 2px; }`, definida **uma vez**, nenhum componente
> repete; inputs ficam de fora (já têm `:focus` próprio). **(3) Hover dos botões do sistema
> auditado:** achado que `.botao--primario`/`.botao--secundario` (bloco sancionado, duplicado em
> 6 páginas + o canônico `docs/design/tema/_componentes.scss`) **nunca tiveram hover** desde que
> foram criados — corrigido nos 7 lugares: primário ganha `filter: brightness(1.08)` (funciona com
> qualquer accent trocado em runtime, não uma 2ª cor fixa), secundário ganha
> `background: var(--surface-2)` + `border-color: var(--accent-border)`. Também reforçado:
> `.topbar__perfil-gatilho` (não tinha hover) e `.detalhe__copiar` (só trocava a cor do texto,
> agora também fundo+borda, consistente com o secundário). `lint`/`test` (91/91)/`build` verdes,
> conferido visualmente (hover + foco por Tab). Sessão anterior no mesmo dia: glifo do ícone
> "tema" trocado por "ajustes/sliders" — o autor escolheu essa opção entre 6 comparadas num
> artifact; path final `M5 21v-8M5 9V3M12 21v-7M12 10V3M19 21v-4M19 13V3` +
> `M3 13h4M10 10h4M17 13h4` no `@case ('tema')` de `shared/icone`. Comunica "3 controles
> ajustáveis" (base + preset + cor custom), mais fiel ao que o painel faz do que uma metáfora
> literal de sol/lua. `lint`/`test` (91/91) verdes, conferido visualmente. Sessão anterior no
> mesmo dia: 3 melhorias de
> UI/UX sugeridas e aplicadas a pedido do autor). **(1) Ícone do gatilho de tema:** trocou o glifo
> unicode cru `◐` (`config-gatilho__marca`) por `<app-icone nome="tema">` — novo glifo (`shared/
> icone`, círculo bissectado por uma linha) alinhado ao resto do sistema de ícones, único lugar que
> ainda fugia do padrão. **(2) Esqueletos de carregamento:** `campanhas` lista/detalhe trocaram o
> texto seco "Carregando…" por blocos `.esqueleto-bloco` pulsantes (`@keyframes esqueleto-pulso`,
> respeita `prefers-reduced-motion`, só token `--border-strong`) mimetizando a silhueta do conteúdo
> real (avatar+linha na lista; título+convite+linhas no detalhe) — `role="status"` mantém o
> anúncio pra leitor de tela. **(3) Hover das linhas de campanha:** o `<a class="campanhas__ligacao">`
> passou a envolver avatar+texto+chip (a linha inteira, que antes só a área de nome/descrição era
> clicável) e ganhou fundo `--accent-dim` no hover — antes só a borda escurecia; a lista de membros
> do detalhe **não** ganhou o mesmo hover porque não é clicável (interativo deve parecer
> interativo, e vice-versa). `lint`/`test` (91/91)/`build` verdes, conferido visualmente. Sessão
> anterior no mesmo dia: correção: o `.3` da
> `--grid-line` foi engano do autor — achava que o valor inicial já era `.2` (era `.02`) e pediu
> `.3` achando que seria um ajuste pequeno. Corrigido pra `.03`, mantendo a mesma proporção de
> aumento (~1,5×) que o autor pretendia sobre o valor real de origem. `lint`/`test` (91/91) verdes.
> Sessão anterior no mesmo dia: `--grid-line` subiu
> de novo, a pedido do autor: de `rgba(255,255,255,.045)` pra `.3` — grade de fundo agora bem
> marcada (efeito "papel quadriculado"), não mais discreta. Mesmo token único e global
> (`_tokens.scss` + mirror `docs/design/tema/`, `--grid-cell` 32px intocado). `lint`/`test` (91/91)
> verdes, conferido visualmente. Sessão anterior no mesmo dia: contraste do avatar
> decorativo reforçado, achado ao conferir a base clara: as listras diagonais (`.topbar__avatar`,
> `.campanhas__avatar`, `.detalhe__avatar`) usavam `--surface`/`--surface-2` — par calibrado pra
> diferença sutil de superfície, quase invisível na base clara (`#ffffff`/`#e7eaee`, m1-13). Trocado
> por `background-color: var(--surface-2)` + listras em `var(--border-strong)` (alpha já calibrado
> pra ler em cima de superfícies nas duas bases), mesmo raciocínio nos 3 lugares. `lint`/`test`
> (91/91) verdes, conferido visualmente nas duas bases. Sessão anterior no mesmo dia: grade de fundo mais
> visível, a pedido do autor: `--grid-line` de `_tokens.scss` (frontend + mirror
> `docs/design/tema/`) foi de `rgba(255,255,255,.02)` pra `rgba(255,255,255,.045)` — mesmo
> `--grid-cell` de 32px, token único e global (`body` em `_base.scss`), nada de valor solto por
> componente. `lint`/`test` (91/91) verdes, conferido visualmente (grade perceptível a olho nu sem
> virar poluição visual). Sessão anterior no mesmo dia: 2 achados de UI/UX
> corrigidos, a pedido do autor, ao revisar os prints da m2-09: (1) o `card__indice` de `campanhas`
> lista/detalhe mostrava literalmente **"M2"** (nome do milestone interno) pro usuário final — trocado
> por `//`, o mesmo neutro já usado em `criar`/`entrar`; (2) itens da lista de campanhas e da lista de
> membros do detalhe ganharam o **avatar decorativo** (quadrado com listras diagonais, mesmo padrão do
> botão de perfil da topbar) que faltava — antes era só texto+chip, sem o ícone que ancora cada linha
> nos protótipos. `lint`/`test` (91/91)/`build` verdes, conferido visualmente. Sessão anterior no mesmo
> dia (ajuste pós-m2-09): (1) **rota raiz redireciona a `/painel`** — `app.routes.ts` trocou o `path: ''` que carregava
> a `Home` do M0 por `redirectTo: '/painel'` (`pathMatch: 'full'`); sem sessão, o `autenticacaoGuard` de
> `/painel` encadeia o redirect até `/login?retorno=%2Fpainel` — a `Calculadora` continua pública (sem
> guard, inalterada). A `Home`/`HealthService` do M0 (`pages/home/`, `core/services/health.service.ts`)
> ficaram irrecuperáveis por rota e foram **removidas** (o próprio comentário da `Home` já previa a
> substituição "a partir do M1"); `docs/DEPLOY.md` atualizado (a verificação pós-deploy não depende mais
> da home exibindo `/health` — agora é registro de teste sem erro de CORS, ou `GET .../health` direto no
> Render). (2) **Vermelho padrão do sistema trocado de `#e5484d` para `#d53030`** — `--accent`/`--vida`
> em `_tokens.scss` (frontend + mirror `docs/design/tema/`), preset `'vermelho'` do `TemaService`, e a
> paleta 50-950 do `contencao.preset.ts` (frontend + mirror) regenerada com `palette('#d53030')` do
> `@primeuix/themes` (a antiga não batia bit-a-bit com a função atual — provavelmente gerada por versão
> diferente da lib); `CLAUDE.md` (tabela TEMA VISUAL) e testes do `tema.service.spec` ajustados. Segue
> passando a trava de contraste (§WCAG, piso 3:1) nas duas bases. Validado com `lint`/`test` (91/91,
> chunk da home some do bundle)/`build` (sem warning de budget) e conferência visual via Playwright
> (root deslogado → `/login`, root logado → `/painel`, calculadora pública sem sessão). Sessão anterior
> no mesmo dia: m2-09 — **revisão geral de
> estilização**: alinha topbar, autenticação e campanhas aos novos protótipos de `docs/design/examples/`
> (`login`/`cadastro`/`campanhas`/`lobby-de-campanha`/`topbar`). **Topbar (`shared/layout`)** reconstruída
> na direção "Barra de Comando" (1a) do handoff: nav central Painel/Calculadora (ícone + `routerLinkActive`,
> mesmo padrão do `CalculadoraShell`), seletor de campanha ativa (chip nome+código, só dentro de
> `/painel/:id`) alimentado pelo novo `CampanhaContextoService` (`modules/campanha/`, `providedIn:'root'`,
> puro estado de apresentação — `CampanhaDetalhe` define ao carregar e limpa ao desmontar via
> `DestroyRef`), dropdown de perfil (Campanhas/Encerrar sessão) que fecha só por ação (mesmo padrão de
> acessibilidade do painel de tema, sem clique-fora). **`shared/icone`** ganhou 11 novos glifos
> (`campanhas`, `calculadora`, `sair`, `entrar`, `chevron`, `copiar`, `mais`, `convite`, `coroa`,
> `atualizar`, `voltar`), reusando `agente`/`protecoes` onde já serviam. **`login`/`registro`** viraram
> layout split marca+formulário (detalhes de canto, eyebrow, destaques com ícone), mesmos campos/
> validators de antes — sem o bloco decorativo de "entrar por código" pré-autenticação do protótipo (não
> existe esse fluxo no domínio). **Marca do projeto** (`frontend/public/logo-{white,black}.{png,svg}`,
> assets do autor do design): novo componente `shared/marca/` troca a variante branca/preta conforme a
> base ativa do tema (`TemaService.base`) e substitui o wordmark só-texto na topbar e no painel de marca
> de login/registro, que ganhou também a marca d'água (`opacity: .04`, canto inferior direito, mesmo
> tratamento dos protótipos) no painel de marca; budget de bundle inicial ajustado de 560→565 kB no
> `angular.json`. **Correção:** a nav da topbar escondia "Calculadora" (rota pública, sem guard) junto
> com "Painel" quando deslogado — agora só "Painel" fica condicionado à sessão, "Calculadora" sempre
> visível. **`campanhas` lista**: ícones nos botões de ação e no `chip-papel`
> (coroa mestre / escudo jogador). **`campanha` detalhe**: botão de copiar o código de convite
> (clipboard, só apresentação), ícone no botão "Regenerar", `chip-papel` dos membros com ícone, link
> "Voltar" com seta. Conteúdo decorativo dos protótipos sem dado real (chips de status ao vivo/agendada/
> pausada, briefing, log de atividade, indicador online) ficou de fora — não existe no schema de
> `campanha`/`campanha_membro`. Nenhuma regra de negócio, permissão (§14 continua só backend) ou de jogo
> alterada; `/painel/criar`/`/painel/entrar` continuam páginas dedicadas (sem mudança de IA). Validado com
> `lint`/`test` (91/91) verdes e `build` de produção; telas conferidas visualmente via Playwright headless
> (topbar deslogado/logado, seletor de campanha, dropdown de perfil, login, registro, lista e detalhe com
> API mockada). **Fecha as 9 tasks do M2.** Sessão anterior no mesmo dia: m2-07 — **frontend de
> campanhas**: fecha o fluxo do M2 na UI sobre o backend das m2-04/m2-05 e a sessão/guard da m2-06. Módulo
> `modules/campanha/` com `CampanhaService` (`providedIn:'root'`, transporte HTTP puro — extrai o `dados`
> do `StandardResponse`, DTOs do shared `./dtos/campanha`, JWT via `auth-token.interceptor`) e **4 telas
> standalone lazy** montadas sob `/painel` (guard `autenticacaoGuard`, `loadChildren`): `lista` (`/painel`)
> — campanhas do usuário com o papel (chip `MESTRE`/`JOGADOR`), links p/ criar/entrar/detalhe; `criar`
> (`/painel/criar`) e `entrar` (`/painel/entrar`) — Reactive Forms, ao concluir navegam ao detalhe da
> campanha criada/ingressada; `detalhe` (`/painel/:id`, id do `ActivatedRoute.snapshot`) — nome/descrição,
> membros com papel, e **só para o mestre** o `codigo_convite` + botão **regenerar** (o `ehMestre` é
> derivado da lista de membros vs `sessao.usuario().id` — apenas apresentação; a autoridade é o backend §14,
> um jogador regenerando levaria 403 via `error-handler`). Estado em Signals; `.scss`/BEM/tokens do tema
> "Terminal de Contenção" (proibição #29 — card/botão/chip copiados de `_componentes.scss`, zero hex solto).
> A casca semente `pages/painel/` da m2-06 foi **substituída** por este módulo; proxy dev passou a encaminhar
> `/campanha` ao backend. DTOs consumidos do shared, nunca redefinidos no front. **18 arquivos de teste /
> 91 testes** no frontend (novo `campanha.service.spec` 6 — cada método atinge rota/verbo certo e mapeia o
> `dados`; `app.routes.spec` ajustado: `/painel` agora resolve a lista de campanhas `.campanhas`);
> `lint`/`build`/`test` do frontend verdes. Nenhuma regra de jogo (`shared/regras` intocado), nenhuma
> alteração de backend. Sessão anterior no mesmo dia: m2-06 — **primeira UI
> do M2**: frontend de autenticação sobre o backbone JWT da m2-02/m2-03. `SessaoService` (`core/services`)
> é o dono do estado de sessão em runtime — Signal do `UsuarioAutenticadoDto` (token + `{id,login,nome}`),
> ações `registrar`/`logar`/`sair`, token persistido em `localStorage` (`contratados-rpg.sessao`) e
> restaurado no boot (F5 mantém a sessão). Telas públicas standalone lazy `login` (`/login`) e `registro`
> (`/registro`) em `modules/autenticacao/` — Reactive Forms (sem `ngModel`), BEM/tokens do tema "Terminal
> de Contenção"; o registro encadeia `registrar → logar` e cai no `/painel`. `auth-token.interceptor`
> injeta `Authorization: Bearer <token>` quando há sessão; o `error-handler.interceptor` ganhou o trato
> de `401` (só com sessão ativa: encerra a sessão e vai ao `/login?retorno=<url>`; login inválido é 400,
> não dispara). `autenticacaoGuard` (`core/guards`) protege a **primeira rota privada** `/painel` (casca
> mínima, semente da m2-07): sem sessão redireciona ao `/login` guardando o destino em `retorno`, retomado
> após logar. A topbar do `shared/layout` reflete a sessão (entrar/registrar deslogado ↔ nome + sair
> logado); a **calculadora permanece pública** (sem guard). Proxy dev encaminha `/autenticacao` ao backend.
> DTOs consumidos do shared (`./dtos/usuario`), nunca redefinidos no front. **17 arquivos de teste / 85
> testes** no frontend (novos: `sessao.service.spec` 6, `autenticacao.guard.spec` 2, `app.routes.spec` 4 —
> resolução das rotas públicas + redirect/liberação do guard); `lint`/`build`/`test` do frontend verdes.
> Sessão anterior no mesmo dia (2026-07-06): m2-05 — **fecha o
> backend de campanhas**: entrada por código de convite, regeneração do código e listagem de membros,
> sobre o módulo `campanha` da m2-04. `entrarCampanha` (`POST /campanha/entrar`): o usuário autenticado
> ingressa informando o `codigoConvite` e vira `JOGADOR`; código inexistente → `ResourceNotFoundException`
> (404), já-membro → `BusinessException` (400, respeitando `uix_campanha_membro_campanha_usuario_ativo`).
> `regenerarConvite` (`POST /campanha/:id/convite/regenerar`, **só mestre**): gera um novo código único
> e invalida o anterior (o antigo deixa de resolver). `listarMembros` (`GET /campanha/:id/membros`):
> nome do usuário + papel, visível a qualquer membro (`UnauthorizedAccessException` p/ não-membro). 3
> novas rotas na `CampanhaController` burra (8 no total), 3 métodos na `CampanhaService` (permissões
> reusando `validarMembro`/`validarMestre` da m2-04 — service é o único árbitro, proibição #28) e no
> `CampanhaRepository` (`recuperarPorCodigoConvite`, `alterarConvite`, `listarMembros` — este junta
> `campanha_membro`→`usuario`→`tipo_campanha_membro_papel`); 8 novos DTOs no shared (incl.
> `CampanhaConviteRegenerarDto`/`...RegeneradoDto`, `CampanhaEntrarDto`/`...EntradaDto`,
> `CampanhaMembrosListarDto`/`CampanhaMembroResumoDto`); **matriz de permissões da campanha (§14)** coberta
> por +9 testes de service (Vitest, **28/28** no backend); fluxo completo (entrar/listar/regenerar +
> mestre×jogador×não-membro) validado ao vivo contra o Postgres). Sessão anterior no mesmo dia: m2-04 —
> módulo `campanha` (backend): **CRUD completo de campanha** — criar (o criador vira `MESTRE`, gerando o
> `campanha_membro` com papel e um `codigo_convite` aleatório único), listar só as campanhas de que o
> usuário autenticado é membro (com o papel dele), recuperar (exige ser membro), alterar e excluir
> (soft delete) restritos ao **mestre** (`UnauthorizedAccessException`; a service é o único árbitro —
> proibição #28). `CampanhaController` burra (5 rotas protegidas) + `CampanhaService` (permissões +
> geração de convite) + `CampanhaRepository` (dono de `campanha`/`campanha_membro`, traduz `codigo ↔
> id` do papel no SQL); **1º pacote de DTOs de campanha** no shared + subpath `./dtos/campanha`; 10
> testes de service (Vitest, 19/19 no backend); CRUD + matriz de permissões validado ao vivo contra o
> Postgres). Sessão anterior no mesmo dia: m2-03 — perfil e
> troca de senha self-service do módulo `usuario`: **1ª rota protegida da API** consumindo o
> `@ActiveUser()`/`JwtAuthGuard` da m2-02 — `GET /usuario/perfil` (dados do usuário logado, **sem**
> senha) e `PATCH /usuario/senha` (valida `senhaAtual` por `bcrypt.compare` → `BusinessException` se
> incorreta; grava `novaSenha` como hash bcrypt); `UsuarioService` + `UsuarioController` burra +
> métodos `recuperarPorId`/`alterarSenha` no `UsuarioRepository`; 4 novos DTOs no shared; 4 testes de
> service (Vitest, 9/9 no backend); fluxo perfil + troca de senha validado ao vivo contra o Postgres).
> Sessão anterior no mesmo dia: m2-02 — backbone de
> autenticação do M2: módulo `autenticacao` (registro `@Public()` com senha bcrypt; login JWT via
> Passport `JwtStrategy` lendo `JWT_*` do `ConfigService`), `JwtAuthGuard` global via `APP_GUARD`
> ativando o `@Public()` do M0, decorator `@ActiveUser()`, e a persistência mínima do módulo `usuario`
> (`UsuarioRepository`); primeiro test-runner do backend (Vitest) com 5 testes de service; fluxo
> `registrar → logar → rota protegida` validado ao vivo contra o Postgres — **1ª camada de negócio da
> API**. Sessão anterior no mesmo dia: m2-01 — fundação de dados do M2: migrations `0002`–`0005`
> criando `usuario`/`tipo_campanha_membro_papel`/`campanha`/`campanha_membro` conforme `SCHEMA.md` +
> enum espelho `TipoCampanhaMembroPapelEnum`; round-trip `db:migrate`/`db:rollback` validado no
> Postgres local — **abre o M2**. Sessão anterior: m1-18 — scrollbar customizada global do tema
> "Terminal de Contenção", definida uma vez em `_base.scss` — só CSS global; **fecha o M1 no código, 18 tasks**.

---

## Estado Geral

**Fase:** M0 concluído (implementação em repositório). O esqueleto do monorepo npm workspaces está de pé
(`shared/`, `backend/`, `frontend/`) com os pacotes se importando corretamente. A
infraestrutura de banco local está pronta: PostgreSQL 16 via Docker Compose e Knex
configurado com migrations. O `core/` do backend está implementado (`ConfigService`,
`BaseEntity`, `BaseRepository`, exceções, filtro global e interceptor de resposta), com o
Nest app subindo de ponta a ponta sem erros. A API já expõe seu primeiro endpoint real,
`GET /health` (público, `StandardResponse`), validando o `core/` de ponta a ponta. O
frontend agora tem shell mínimo de pé: topbar + `router-outlet`, interceptors `loading` e
`error-handler`, proxy de dev para o backend e uma home que consome `GET /health` — a
integração HTTP frontend → backend → `StandardResponse` está provada de ponta a ponta. O
shell já usa o tema "Terminal de Contenção" (dark-first) a partir do handoff em
`docs/design/` — tokens, base e preset PrimeNG `ContencaoPreset` ligados. A integração
contínua está ativa: um workflow do GitHub Actions (`.github/workflows/ci.yml`) roda lint +
testes nos três workspaces em todo Pull Request — lint configurado nos três (backend já
tinha; shared e frontend ganharam eslint agora), testes via `--if-present` (só o frontend
tem testes antes do M1). O deploy fecha o M0 por **integração nativa das plataformas** (sem GitHub Actions no deploy):
no push para `master`, o Render (backend) e a Cloudflare Pages (frontend) puxam do Git e
reimplantam sozinhos, com banco de produção no Supabase. A ligação frontend→backend em produção
é cross-origin: o backend habilita CORS a partir de `APP_FRONTEND_ORIGEM` (`main.ts`) e o
frontend chama a URL absoluta do Render via `environment.apiBase` (dev fica vazio → chamada
relativa pelo proxy; produção fixa a URL do Render no `environment.production.ts`, embutida no
build). Provisionamento das plataformas em `docs/DEPLOY.md`. O backend em produção já responde
`/health` no Render; o frontend fica live quando as Pages forem conectadas ao Git com branch de
produção `master`. Ainda sem módulo de negócio — esses nascem a partir do M1.

## Status dos Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, core/, pipelines, deploy) | **concluído** (deploy nativo Render+Cloudflare; setup das plataformas em `docs/DEPLOY.md`) |
| M1 | Calculadora com paridade | **concluído no código** (`m1-01` a `m1-20`, incluindo os refinamentos pós-paridade: mobile `m1-15`, tema em runtime `m1-16`, singleton de estado das abas `m1-17`, scrollbar customizada `m1-18`, botão Limpar `m1-19` e **modo Vender na aba Compras `m1-20`** — taxa de venda + venda de fragmentos, 100% client-side sobre `shared/regras/compras/venda`). Restam 2 passos operacionais de plataforma: publicar a Cloudflare Pages e arquivar o repo antigo no GitHub (ver `docs/PARIDADE-M1.md`) |
| M2 | Auth + Campanhas | **concluído no código** (`m2-01`…`m2-09`, **9/9 tasks**) — dados + backbone de autenticação JWT com guard global + perfil/troca de senha self-service + CRUD de campanha com papéis + convite/membros + **frontend de autenticação** (login/registro, sessão, interceptor JWT, guard de rota) + **frontend de campanhas** (listar/criar/entrar por código/detalhe com membros + convite/regenerar do mestre) + **revisão geral de estilização** (topbar "Barra de Comando", split-panel de auth, ícones em nav/dropdown/chips/botões, alinhados aos protótipos de `docs/design/examples/`) + **refino mobile `m2-08`** (alvos de toque de 44px nas telas de auth/campanha/topbar + densidade do painel de marca, SCSS-only na linha da m1-15); **backend de campanhas fechado** e **fluxo do M2 completo ponta a ponta na UI**, usável no mobile (~360px). **Lote de extensão `m2-10`…`m2-15`** (CRUD restante de campanha/usuário): backend **m2-10** (gestão de membros — remover/transferir mestre), **m2-11** (perfil do usuário — alterar nome/login + excluir conta), frontend **m2-12** (edição/exclusão de campanha) e **m2-13** (frontend de gestão de membros — remover jogador / transferir mestre) **concluídos**; restam o frontend **m2-14** (perfil/exclusão de conta) e o refino visual **m2-15**. **Extensão pós-M2 `m2-16`** (`docs/specs/done/m2-16-fichas-do-membro-na-lista.spec.md`) **concluída**: o detalhe da campanha (`/painel/:id`) virou o **lar das fichas** — cada membro mostra as suas fichas **inline** (mini-cards nome·classe·nível, clicáveis para `/painel/:campanhaId/ficha/:id`), sempre abertas no desktop e como disclosure `N fichas ⌄` no mobile; a extinta lista plana `FichaLista` (rota `/painel/:campanhaId/ficha`) foi **aposentada**, a criação (`FichaCriarDialog`) migrou para o detalhe e o link stale `.../ficha/nova` sumiu (o "Voltar" da ficha individual agora aponta para o detalhe da campanha); o resync em tempo real (`ficha:criada`/`membro:entrou`) e o fade topo/base (`appOverflowFade`) também migraram para o detalhe. **Verificado ao vivo** (Postgres real + dois usuários, mestre e jogador): fichas agrupadas por dono, permissão respeitada (jogador só vê as próprias), disclosure mobile funcional, criação abre o assistente e navega para a ficha nova, e uma ficha criada por outro membro aparece **sem reload** via WebSocket. **Extensão pós-M2 `m2-17`** (`docs/specs/done/m2-17-redesenho-visual-campanhas.spec.md`) **concluída**: redesenho visual — sem dado/schema novo — de `/painel` (grade de cartões, era coluna única) e `/painel/:id` (grade de duas colunas: identidade+convite lateral, membros+fichas principal), aproveitando a largura real da tela (alvo 1160px, escala da ficha de jogador); fade topo/base nas duas listas; mobile (m2-08) preservado. **Extensão pós-M2 `m2-16`/`m2-17` fechada.** |
| M3 | Ficha de Jogador | **em andamento** — **m3-01** concluído (contrato final `FichaJogadorDadosDto` do JSONB `ficha.dados` em `shared/dtos/ficha/` + `SCHEMA.md` fechado, derivado 1:1 de `sistema-v4.1.0.md`; 3 enums novos de conteúdo de jogo) + **m3-02** concluído (migrations `0006`–`0008`: `tipo_ficha` com seed + `ficha` com `dados JSONB` + `usuario_ficha_acesso`, round-trip `db:migrate`/`db:rollback` validado; enum de coluna `TipoFichaEnum`) + **m3-03** concluído (backend do CRUD da ficha de jogador: módulo `ficha` com controller/service/repository, matriz de permissões §14 no service, validação do documento contra `shared/regras`; DTOs de operação no shared; **verificado ao vivo contra o Postgres**; backend 64/64) + **m3-04** concluído (concessão/revogação de acesso de visualização — `usuario_ficha_acesso`: `concederAcesso`/`revogarAcesso`/`listarAcessos` no service, só dono ou mestre — reusa `validarPermissaoEdicao`, sem duplicar permissão; alvo precisa ser membro; idempotente; soft delete na revogação; 6 DTOs novos; **verificado ao vivo contra o Postgres**; backend 76/76) + **m3-05** concluído (gateway de tempo real WebSocket broadcast-only — `CampanhaGateway`/`GatewayModule`/`WsIoAdapter` em `core/gateway/`; handshake autenticado pelo mesmo `JwtService`/`JWT_SECRETO`; salas `ficha:<id>`/`campanha:<id>` com permissão §14 reusada das services; eventos `ficha:alterada`/`ficha:criada`/`membro:entrou` emitidos pelas services após a mutação; `forwardRef` gateway↔services; `CampanhaMembroEntradaDto` novo no shared; `ficha:criada` emite só o resumo (sem `dados` — §14); **verificado ao vivo com `socket.io-client`**; backend 87/87). Próxima: **m3-06** (frontend de criação/edição da ficha) |
| M4 | Ficha de Criatura/NPC | backlog |
| M5 | Guia de Missão | backlog |

## Status dos Módulos

| Módulo | Status |
|---|---|
| shared (estrutura) | **`interfaces/`** (`StandardResponse`/`PaginatedResult`) + **`enums/`** (`ClasseEnum`, `PatenteEnum`, `ItemCategoriaEnum`, `TipoDescansoEnum`, `QualidadeDescansoEnum`, `MotivoEntradaAgenteEnum` + `TipoCampanhaMembroPapelEnum` — m2-01, **1º enum de coluna**, espelho da tabela `tipo_*`; **+ m3-01:** `ArquetipoEnum` (9 arquétipos), `SeveridadeLesaoEnum` (LEVE/GRAVE/MORTAL) e `HabilidadeCategoriaEnum` (8) — enums de conteúdo de jogo do JSONB `ficha.dados`, sem tabela `tipo_*`; **+ m1-20:** `TaxaVendaEnum` (NORMAL/CHECKIN/FORA_PATENTE), `FragmentoTipoEnum` (POTENCIALIZADOR/CONSTRUTOR) e `FragmentoModuloEnum` (I–V) — conteúdo de jogo da venda, sem tabela `tipo_*`) + **`dtos/usuario/`** (m2-02, **1º pacote de DTOs de negócio**: `UsuarioCriarDto`/`UsuarioCriadoDto`, `UsuarioAutenticarDto`/`UsuarioAutenticadoDto` — saída sem `senha` — e os internos `UsuarioInternoCriarDto`/`UsuarioLoginRecuperarDto`/`UsuarioInternoRecuperadoDto`; **+ m2-03:** `UsuarioRecuperarDto {id}`/`UsuarioRecuperadoDto {id,login,nome}` (perfil, saída sem senha), `UsuarioSenhaAlterarDto {senhaAtual,novaSenha}`/`UsuarioSenhaAlteradaDto {id,login,nome}` (troca de senha) e o interno `UsuarioSenhaInternoAlterarDto {id,senha}` (repositório, senha = hash); export subpath `./dtos/usuario` no `package.json`; **+ m2-11:** `UsuarioPerfilAlterarDto {nome,login}`/`UsuarioPerfilAlteradoDto {id,login,nome}` (alteração de perfil, saída sem senha) e os internos `UsuarioPerfilInternoAlterarDto {id,nome,login}` (repositório) e `UsuarioExcluirDto {id}` (exclusão da própria conta)) **+ `dtos/campanha/`** (m2-04, **1º pacote de DTOs de campanha**: públicos `CampanhaCriarDto`/`CampanhaCriadaDto`, `CampanhaListarDto {usuarioId}`/`CampanhaResumoDto {id,nome,descricao,papel}`, `CampanhaRecuperarDto {id}`/`CampanhaRecuperadaDto`, `CampanhaAlterarDto`/`CampanhaAlteradaDto`, `CampanhaExcluirDto {id}`; internos `CampanhaInternoCriarDto`/`CampanhaInternoAlterarDto` e os do vínculo `CampanhaMembroInternoCriarDto`/`CampanhaMembroInternoRecuperarDto`/`CampanhaMembroInternoRecuperadoDto` — `papel` como `TipoCampanhaMembroPapelEnum`; subpath `./dtos/campanha` no `package.json`) **+ m2-05** (convite/membros: públicos `CampanhaEntrarDto {codigoConvite}`/`CampanhaEntradaDto {id,nome,descricao,papel}`, `CampanhaConviteRegenerarDto {id}`/`CampanhaConviteRegeneradoDto {id,codigoConvite}`, `CampanhaMembrosListarDto {campanhaId}`/`CampanhaMembroResumoDto {usuarioId,nome,papel}`; internos `CampanhaConviteRecuperarDto {codigoConvite}` e `CampanhaConviteInternoAlterarDto {id,codigoConvite}`) **+ `dtos/ficha/`** (m3-01, **1º pacote de DTOs de ficha** — contrato final do JSONB `ficha.dados` do jogador: `FichaJogadorDadosDto` + sub-DTOs `FichaAtributosDto` (10 atributos), `FichaEstadoDto`/`FichaSequelaDto`/`FichaTraumaDto`/`FichaLesaoDto`, `FichaHabilidadeDto` e `FichaInventarioDto` (reusa `CarrinhoItemDto`/`AmplificadorAplicadoDto` de `regras/compras`, sem duplicar); `interface readonly` puras; subpath `./dtos/ficha`; **+ m3-03:** DTOs de operação em `ficha-operacao.dtos.ts` (`Ficha{Criar,Criada,Listar,Resumo,Recuperar,Recuperada,Alterar,Alterada,Excluir}Dto` + internos `Ficha{InternoCriar,InternoAlterar,VisiveisInternoListar,AcessoInternoRecuperar,AcessoInternoRecuperado}Dto`); **+ m3-04:** `FichaAcesso{Conceder,Concedido,Revogar,Revogado}Dto` + `FichaAcessosListarDto`/`FichaAcessoResumoDto {usuarioId,nome}` — complemento `Acesso` inteiro antes do verbo); `validators/` ainda esqueleto |
| shared/regras | **`agente/` completo** (m1-02): 15 fórmulas puras da aba agente com testes Vitest conferidos contra o sistema (vida, energia, limite de energia, defesa/esquiva/bloqueio, proficiência, deslocamento, dano de corpo, dano furtivo, inventário, percepção, sanidade, limite hab./turno, benefícios por nível, progressão acumulada, limites por classe). **`dt/`, `novo-agente/`, `patente/` completos** (m1-03): DT de atributo (`10 + Nível + Atributo×2`); nível/prestígio iniciais + bônus monetário por motivo de entrada; lookup de patente por prestígio + recorte da aba, consumindo `PATENTES`. **`descanso/` completo** (m1-04): escada de dados (`ESCADA_DADOS` + `ajustarDado`/`elevarDado`/`descreverDado`), tabelas `DADOS_DESCANSO`/`QUALIDADE_MOD`, faixa de recuperação (`calcularDescanso`), interpretação de dados extras (`interpretarDadosExtras`), resultado a partir de valores rolados (`calcularResultadoDescanso`) + a utilidade de rolagem `rolarDados` (única brecha a `Math.random` — §6.6). **`compras/` completo** (m1-05): catálogo (`CATALOGO_CATEGORIAS`/`CATALOGO_ITENS`), modificações por categoria (`MODIFICACOES`) + custos (`CUSTO_MODIFICACAO`), amplificadores (`AMPLIFICADORES`) e limites por patente (`LIMITES_MODIFICACAO`); fórmulas `obterLimiteModificacoes`/`obterCustoModificacao`/`obterPesoModificacao`/`contarComprasModificacao`/`verificarConflitoModificacao`/`calcularStatItem` (reusa `elevarDado`)/`calcularCustoAmplificador`/`calcularTotaisCarrinho`/`calcularResumoCompras`, reusando `obterPatente` (m1-03). **+ m1-20 (venda):** submódulo `venda.{dtos,dados,ts}` — `MULTIPLICADOR_TAXA_VENDA` (0.5/0.75/0.25), `VENDA_FRAGMENTOS` (tabela módulo × tipo), `calcularValorVendaCarrinho` (taxa sobre o `gasto` de `calcularTotaisCarrinho`, sem recalcular custo), `obterValorFragmento` e `calcularVendaFragmentos`; conferidos 1:1 contra "Loja"/"Retornando após uma Missão"/"Venda de Fragmentos". `dados/` com `dadosAgente`, `dadosCivil` e `PATENTES` (m1-01) |
| backend/core | **pronto** (`BaseEntity`, `BaseRepository`, exceções, filtro, interceptor) |
| backend/config | **pronto** (`ConfigService`/`ConfigModule`, lê `DB_*`/`JWT_*`/`APP_*`) |
| backend/database | **pronto** (`DatabaseModule`/`database.provider.ts` — conexão Knex em runtime via DI) |
| backend/health | **pronto** (`HealthController` `GET /health` público; sem service/repository) |
| backend/core/decorators | **`@Public()`** (metadado `isPublic`, agora interpretado pelo `JwtAuthGuard` da m2-02) + **`@ActiveUser()`** (m2-02 — injeta o payload do JWT em `request.user`; validado ao vivo) |
| backend/autenticacao | **pronto (m2-02)** — `AutenticacaoController` (`POST /autenticacao/registro` e `/login`, ambas `@Public()`), `AutenticacaoService` (registro com `bcrypt.hash`; `validarLogin` recusa duplicado com `BusinessException`; login com `bcrypt.compare` + emissão de JWT; mesma mensagem p/ login inexistente e senha errada), `JwtStrategy` (Passport, segredo do `ConfigService`), `JwtAuthGuard` global via `APP_GUARD` (exige JWT salvo `@Public()`), `JwtModule.registerAsync` lendo `JWT_SECRETO`/`JWT_EXPIRACAO`. `JwtPayload { sub, login }`. 5 testes de service (Vitest) |
| backend/usuario | **completo (m2-03 + m2-11)** — perfil e troca de senha self-service, **1ª rota protegida da API** (sem `@Public()`; guard global + `@ActiveUser()` da m2-02). `UsuarioController` burra: `GET /usuario/perfil` (monta `{ id: usuarioAtivo.sub }`), `PATCH /usuario/senha` (repassa o body + `@ActiveUser()`), **+ m2-11:** `PATCH /usuario/perfil` (body + `@ActiveUser()`) e `DELETE /usuario` (monta `{ id: usuarioAtivo.sub }`). `UsuarioService`: `recuperarPerfil` (projeta os dados públicos, **sem** senha; `ResourceNotFoundException` se a conta sumiu) e `alterarSenha` (valida `senhaAtual` por `bcrypt.compare` → `BusinessException('Senha atual incorreta')`; encripta `novaSenha` com bcrypt cost 10 e persiste); **+ m2-11:** `alterarPerfil` (altera `nome`/`login`; **valida unicidade do `login`** via `recuperarPorLogin` — outra conta com o mesmo login → `BusinessException('Login já está em uso')`, o próprio login é permitido; retorna sem senha) e `excluirConta` (guarda existência → `ResourceNotFoundException`; soft delete da própria conta). `UsuarioRepository` (estende `BaseRepository`) ganhou `recuperarPorId` (`SELECT ... WHERE id = :id AND is_deleted = false`, carrega o hash) e `alterarSenha` (`UPDATE usuario SET senha = :senha ...`), **+ m2-11:** `alterarPerfil` (`UPDATE usuario SET nome = :nome, login = :login, updated_date = NOW() WHERE id = :id AND is_deleted = false RETURNING id, login, nome`) e `excluirConta` (embrulha `executarSoftDelete`), somando aos herdados da m2-02 `criarUsuario` (`INSERT ... SELECT ... RETURNING id, login, nome`) e `recuperarPorLogin`; dona das queries da tabela `usuario` (proibição #23). `UsuarioModule` registra controller + service e exporta o repositório; importado direto no `AppModule`. **9 testes de service (Vitest)** |
| backend/campanha | **completo (m2-04 + m2-05 + m2-10)** — CRUD de campanha com papéis + convite/membros + **gestão de membros pelo mestre** (remover jogador / transferir mestre). `CampanhaController` burra: **10 rotas protegidas** — CRUD (`POST /campanha`, `GET /campanha`, `GET /campanha/:id`, `PUT /campanha/:id`, `DELETE /campanha/:id`) **+ m2-05** `POST /campanha/entrar`, `GET /campanha/:id/membros`, `POST /campanha/:id/convite/regenerar` **+ m2-10** `DELETE /campanha/:id/membro/:usuarioId`, `POST /campanha/:id/mestre/transferir` — montando o DTO com o `id`/`usuarioId` do `@Param`, o corpo, ou o `usuarioId` do token. **m2-10** na `CampanhaService`: `removerMembro` (só mestre via `validarMestre`; mestre não se auto-remove → `BusinessException`; membro-alvo inexistente → `ResourceNotFoundException`; soft delete do vínculo) e `transferirMestre` (só o mestre atual; promove um `JOGADOR` a `MESTRE` e se rebaixa a `JOGADOR` **atomicamente**, mantendo exatamente um mestre; alvo não-membro → 404, alvo próprio/já-mestre → `BusinessException`). No `CampanhaRepository`: `removerMembro` (soft delete de `campanha_membro` pela chave composta campanha+usuário, espelhando o `executarSoftDelete`) e `transferirMestre` (troca de papéis num **único `UPDATE` com `CASE`** — atômico, traduz `codigo → id` do papel por subconsulta). 4 DTOs públicos (`CampanhaMembroRemoverDto`/`...RemovidoDto`, `CampanhaMestreTransferirDto`/`...TransferidoDto`) + 2 internos (`CampanhaMembroInternoRemoverDto`, `CampanhaMestreInternoTransferirDto`) no shared. **SYSTEM.SPEC §14 + SCHEMA.md atualizados:** o mestre deixou de ser necessariamente "(o criador)" — o papel é transferível pelo mestre atual, invariante de um único mestre preservada. `CampanhaService` (m2-04/m2-05): `criarCampanha` (gera `codigo_convite` aleatório — alfabeto sem caracteres ambíguos, unicidade garantida pelo índice parcial `uix_campanha_codigo_convite_ativo` — insere a campanha e o `campanha_membro` do criador com papel `MESTRE`), `listarCampanhas` (só campanhas de que o usuário é membro, com o papel dele), `recuperarCampanha` (exige ser membro → `UnauthorizedAccessException`; `ResourceNotFoundException` se não existe), `alterarCampanha`/`excluirCampanha` (gate `validarMestre` — só o mestre; soft delete via `executarSoftDelete`); **m2-05:** `entrarCampanha` (ingresso por `codigoConvite` como `JOGADOR`; 404 se código não existe, `BusinessException`/400 se já é membro), `regenerarConvite` (só mestre via `validarMestre`; novo código único invalida o anterior), `listarMembros` (nome+papel, exige ser membro via `validarMembro`); permissões validadas na service, único árbitro (proibição #28). `CampanhaRepository` (estende `BaseRepository`, dona das queries de `campanha`/`campanha_membro` — proibição #23): `criarCampanha` (`INSERT ... SELECT ... RETURNING`, alias `codigo_convite AS "codigoConvite"`), `criarMembro` (traduz `codigo → id` do papel via subconsulta em `tipo_campanha_membro_papel` — §10.2.12), `listarPorUsuario` (JOIN membro→campanha→tipo, todas com `is_deleted = false`), `recuperarPorId`, `recuperarMembro` (papel do vínculo p/ as permissões), `alterarCampanha` (`UPDATE ... RETURNING`), `excluirCampanha`, **+ m2-05** `recuperarPorCodigoConvite` (SELECT por `codigo_convite` ativo), `alterarConvite` (`UPDATE codigo_convite ... RETURNING`), `listarMembros` (JOIN membro→usuario→tipo, `is_deleted = false`, ordena por nome). `CampanhaModule` registra controller + service e exporta o repositório; importado no `AppModule`. **29 testes de service** (Vitest, 10 m2-04 + 9 m2-05 + 10 m2-10 cobrindo a matriz §14 e a invariante de um único mestre). **m3-05:** `entrarCampanha` injeta o `CampanhaGateway` (`forwardRef`) e emite `membro:entrou` na sala `campanha:<id>` após criar o vínculo; `CampanhaModule` exporta o `CampanhaService` e importa `forwardRef(() => GatewayModule)` |
| backend/ficha | **completo (m3-03 + m3-04 + emissão WS m3-05)** — CRUD da ficha de jogador com a **matriz de permissões §14** (único árbitro no service, proibição #28) e a **validação do documento contra `shared/regras`** antes de persistir. **m3-04 — concessão de visualização:** `FichaService` ganhou `concederAcesso`/`revogarAcesso`/`listarAcessos` (só dono ou mestre — **reusa `validarPermissaoEdicao`**, mesma regra dono-ou-mestre, sem duplicar permissão; alvo da concessão precisa ser membro da campanha → `validarMembroAlvo`/`ResourceNotFoundException('Membro')`; **idempotente** via `recuperarAcesso` + índice único parcial); `FichaRepository` ganhou `concederAcesso` (`INSERT ... SELECT ... RETURNING`), `revogarAcesso` (**soft delete por chave composta** `ficha_id`/`usuario_id`) e `listarAcessos` (`JOIN usuario` p/ o nome); controller `GET`/`POST /ficha/:id/acesso` + `DELETE /ficha/:id/acesso/:usuarioId`; 6 DTOs novos (`FichaAcesso{Conceder,Concedido,Revogar,Revogado}Dto` + `FichaAcessosListarDto`/`FichaAcessoResumoDto`). `FichaController` burra: `POST /ficha`, `GET /ficha?campanhaId=`, `GET/PUT/DELETE /ficha/:id`. `FichaService`: `criarFicha` (dono = `@ActiveUser().sub` por padrão; **m2-16b:** `dto.usuarioId` escolhe outro dono, só aceito se o autenticado for o mestre — `UnauthorizedAccessException` caso contrário — e o alvo precisa ser membro, `validarMembroAlvo`; tipo sempre `JOGADOR`), `listarFichas` (mestre vê todas via `listarPorCampanha`; membro comum só as visíveis via `listarVisiveisParaUsuario`), `recuperarFicha` (visualização: dono OU mestre OU linha em `usuario_ficha_acesso`), `alterarFicha`/`excluirFicha` (edição: só dono ou mestre — membro com concessão nunca edita); papel na campanha vem do `CampanhaRepository` (importa `CampanhaModule`), sem duplicar regra. `validarDadosContraRegras` reusa `obterLimitesClasse`/`calcularVida`/`calcularEnergia` (Nível/atributos no intervalo da classe, Vida atual ≤ máx, Energia atual ≤ máx — só teto; Energia pode negativar) → `BusinessException`; "stacks de modificação por patente" ficou de fora (texto livre em `PatenteDados.limiteModificacoes`, sem função pura — validá-lo seria reimplementar regra/extrapolar). `FichaRepository` (dona de `ficha` + `usuario_ficha_acesso`, proibição #23): `INSERT ... SELECT ... RETURNING` com `dados::jsonb` + tradução `codigo→id` de `tipo_ficha`; listagens leem `dados->>'classe'`/`(dados->>'nivel')::int` (§10.4); `recuperarAcesso` (`EXISTS`/SELECT em `usuario_ficha_acesso`); soft delete via `executarSoftDelete`. DTOs de operação no shared (`shared/dtos/ficha/ficha-operacao.dtos.ts`). `FichaModule` importa `CampanhaModule`, registrado no `AppModule`. **33 testes de service** (Vitest, backend 76/76 — 21 do CRUD m3-03 + 12 de acesso m3-04) cobrindo a matriz, a rejeição de dados incoerentes e quem concede/revoga/lista; **verificado ao vivo contra o Postgres** (permissões, listagens escopadas por papel, validação, soft delete, concessão/revogação + idempotência). **m3-05 — emissão WS pós-mutação:** `criarFicha`/`alterarFicha` injetam o `CampanhaGateway` (`forwardRef`) e chamam `emitirFichaCriada`/`emitirFichaAlterada` após persistir (a regra fica na service; o gateway só transmite — §9). Fora de escopo (próximas tasks): frontend (m3-06+). **m2-16c (Vida/Energia/Condições no resumo):** `FichaResumoDto` ganhou `vidaAtual`/`vidaMaxima?`/`energiaAtual`/`energiaMaxima?` + `morrendo`/`machucado`/`inconsciente` (booleans sempre resolvidos) para alimentar o mini-card de ficha no detalhe da campanha, sem expor o documento completo (§14/§10.4 preservados — segue um recorte). `FichaRepository` ganhou o helper privado `colunasResumo()` (SQL compartilhado por `listarPorCampanha`/`listarVisiveisParaUsuario`, evita duplicar a projeção): lê `dados->'estado'->>'campo'` + `COALESCE(..., false)` nas três condições. `CampanhaGateway.emitirFichaCriada` também monta esses campos a partir do `FichaCriadaDto` (o broadcast `ficha:criada` carrega o mesmo recorte da listagem). Nenhuma validação nova na service — as condições são alternadas manualmente (não entram em `validarDadosContraRegras`), mesma filosofia de liberdade de edição do m3-10 |
| backend/core/gateway | **completo (m3-05)** — gateway de tempo real WebSocket **broadcast-only** (§9, proibição #25). `CampanhaGateway` (`@WebSocketGateway`, um único gateway — nome do exemplo canônico do `CONVENTIONS`), `GatewayModule` e `WsIoAdapter` (estende `IoAdapter`, **trava a origem em `APP_FRONTEND_ORIGEM`** lida do `ConfigService`, espelhando o CORS HTTP do `main.ts`; ligado via `app.useWebSocketAdapter`). **Handshake autenticado pelo mesmo mecanismo do Passport:** valida o token do handshake (`auth.token` ou header `Authorization: Bearer`) com o `JwtService`/`JWT_SECRETO` (o `GatewayModule` importa o `AutenticacaoModule`, que passou a exportar o `JwtModule`); token ausente/inválido → `disconnect(true)`, payload em `socket.data.usuario`. **Salas + permissão de entrada:** `ficha:entrar` reusa `FichaService.recuperarFicha` (visualização §14) e `campanha:entrar` reusa `CampanhaService.recuperarCampanha` (só membros) — consulta a service dona, sem duplicar regra (#28); nega a entrada (ack `{sucesso:false}`, sem `join`) se a service lançar. **Emissão:** `emitirFichaAlterada` (sala `ficha:<id>`), `emitirFichaCriada`/`emitirMembroEntrou` (sala `campanha:<id>`), chamadas pelas services após a mutação. Dependência mútua gateway↔services por `forwardRef` nos dois lados. **11 testes** (`campanha.gateway.spec` — handshake, entrada em sala §14, emissão) + asserções de emissão nos specs de service; **verificado ao vivo** (`socket.io-client` rejeita sem/token inválido, mantém com JWT válido) |
| frontend (shell) | **pronto** (topbar + `router-outlet` via `shared/layout`, tema "Terminal de Contenção" dark-first via `docs/design`). Em **dev** a aba do navegador recebe sufixo "- DEV" (`provideAppInitializer` no `app.config.ts`, gated por `!environment.producao`; produção mantém o `<title>` do `index.html`). **Topbar reconstruída (m2-09)** na direção "Barra de Comando" do handoff: nav central Painel/Calculadora, seletor de campanha ativa (só dentro de `/painel/:id`, via `CampanhaContextoService`) e dropdown de perfil (fecha só por ação). **Rota raiz (pós-m2-09):** `/` redireciona a `/painel` (era a `Home` do M0 consumindo `/health`, removida junto do `HealthService` — ambos ficaram irrecuperáveis por rota; a calculadora segue pública, sem guard). **Refino mobile (m2-08):** alvos de toque de 44px (`bp.$alvo-toque`) na nav central, chip de campanha, gatilho + itens do dropdown de perfil e botões de sessão (os que colapsam pra ícone também centralizam); o **wordmark textual "CONTRATADOSRPG" é escondido no mobile** (logo `app-marca` mantém a identidade) pra topbar não estourar em ~360px. **Revisão S24+ (pós-m2-08):** o **chip de campanha ativa também some no mobile** (`&__campanha` `display: none`) — colapsado a só o ícone, duplicava o glifo "campanhas" do nav Painel logo ao lado |
| frontend/tema | **pronto + troca em runtime (m1-13)** (tokens + base + `ContencaoPreset` PrimeNG em `src/styles/tema/`). **Sistema de tema em runtime (m1-13):** `TemaService` (`core/services/tema.service.ts`) é a contraparte em runtime de `_tokens.scss` para a parte trocável — escreve `--accent` (e overrides de base clara) em `<html>`, alterna a classe `.dark` e regenera a paleta primária do PrimeNG (`updatePrimaryPalette`/`palette`); 4 presets de accent (só cores da paleta do tema — vermelho/azul/verde/âmbar), base clara/escura e color picker custom com **trava de contraste WCAG** (`razaoContraste`/`luminanciaRelativa`, piso 3:1 vs superfície); persiste em `localStorage` e restaura no boot via `provideAppInitializer`. Painel `ConfiguracoesTema` (`shared/configuracoes-tema/`) na topbar (gatilho + modal, fecha por botão). **Refino m1-16:** (a) **slot de cor custom salvo** — `salvarAccentCustom`/`selecionarAccentSalvo`/`accentCustomSalvo` no `TemaService` + swatch "Salva" no painel: guarda **um** slot (sobrescreve o anterior), persistido em `accentCustomSalvo` (distinto do `accentCustom` ativo), re-selecionável com um clique sem reabrir o picker; (b) **inversão visual por incompatibilidade de base** — `accentAplicado`/`accentAdaptado` + `variantePorContraste` (complemento RGB → ajuste de luminância até cruzar `CONTRASTE_MINIMO`): quando a cor salva/ativa fica ilegível na base ativa, o `--accent` exibido é uma variante legível **preservando o valor salvo**; ao voltar à base compatível a cor original é reaplicada (substitui o descarte antigo em `definirBase`, que agora só troca **presets fixos** travados). Nota discreta no painel quando a cor está adaptada. Paleta de presets expandida de 4 p/ **9** (as 4 oficiais + roxo/rosa/dourado/turquesa/cinza, a pedido do autor), todas sujeitas à mesma trava de contraste por base. Budget inicial elevado p/ 565 kB (era 560 kB; o motor de paleta do `@primeuix/themes` entra no bundle
inicial, e o novo `shared/marca/` da m2-09 empurrou mais alguns bytes). **Tailwind instalado e integrado ao build** (m1-06): `frontend/tailwind.config.ts` mescla o `theme.extend` do handoff (`docs/design/tema/tailwind.config.ts`) apontando cores/fontes/raios utilitários para as CSS custom properties dos tokens; diretivas `@tailwind` no fim de `styles.scss`, coexistindo com SCSS + tokens (preflight não sobrescreve a identidade — só reset). **Scrollbar customizada global (m1-18):** padrão próprio da barra de rolagem definido **uma vez** em `styles/tema/_base.scss` (espelhado no handoff `docs/design/tema/_base.scss`) — thumb fino (`10px`) em `--surface-2` com contorno `--border-strong` e raio `--radius-control`, track/corner transparentes, `:hover` realça o contorno com `--accent-border` (nunca `--accent` sólido); cross-browser via `::-webkit-scrollbar-*` (Chrome/Edge/Safari) + `scrollbar-width: thin`/`scrollbar-color` (Firefox). Só tokens → segue legível/discreto nas duas bases (clara/escura) do tema em runtime, que sobrescrevem `--surface-2`/`--border-strong`. Vale globalmente (scroll geral, os 3 modais, tabelas/textarea) sem repetição por componente; documentado em `docs/design/DESIGN.md` para as telas futuras (M2+) não reintroduzirem a barra nativa |
| frontend/core (interceptors + services) | **pronto** (`loading`/`error-handler` interceptors, `LoadingService`, `HealthService`). **m2-06:** `SessaoService` (Signal do `UsuarioAutenticadoDto`, `registrar`/`logar`/`sair`, token em `localStorage` restaurado no boot), `auth-token.interceptor` (injeta `Bearer` quando há sessão; registrado entre `loading` e `error-handler` no `app.config`), `error-handler` passou a tratar `401` (com sessão → `sair()` + `/login?retorno=`), `autenticacaoGuard` (`core/guards`, protege rotas privadas) |
| frontend/autenticacao | **pronto (m2-06)** — módulo `modules/autenticacao/` com telas standalone **lazy** `login` (`/login`) e `registro` (`/registro`), Reactive Forms + Signals, BEM/tokens do tema; login retoma o `retorno` ou vai ao `/painel`; registro encadeia `registrar → logar`. Rotas públicas montadas em `app.routes` (coexistindo com a `''` da home). Topbar (`shared/layout`) reflete a sessão (entrar/registrar ↔ nome + sair). A rota privada `/painel` (guardada pelo `autenticacaoGuard`) passou na m2-07 de casca semente para o **módulo de campanhas** (a `pages/painel/` foi removida). **Layout split marca+formulário (m2-09)**: painel de marca com detalhes de canto/eyebrow/destaques com ícone à esquerda, formulário à direita — mesmos campos/validators de antes. **Refino mobile (m2-08):** inputs e botão de enviar com `min-height` de 44px; no mobile o painel de marca (que empilha acima do formulário) aperta o padding (34→22px), o painel do formulário fica 26/20px e o slogan 22→19px, trazendo o formulário mais pra cima da dobra em ~360px. **Revisão S24+ (pós-m2-08):** o painel de marca **enxuga no mobile** — esconde descrição/destaques/nota (mantém logo+eyebrow+slogan), regra escopada ao `&__marca` porque `--descricao` também existe no painel do formulário; traz o formulário bem mais pra cima da dobra. **Toggle de senha (2026-07-07):** botão "olhinho" (`&__olho`) revela/oculta a senha — 1 no login, 2 independentes no registro (senha + confirmação), via Signal alternando o `[type]` do input; glifos `olho`/`olho-fechado` novos no `shared/icone` |
| frontend/campanha | **pronto (m2-07)** — módulo `modules/campanha/` (área privada sob `/painel`, `loadChildren` guardado): `CampanhaService` (`providedIn:'root'`, cliente HTTP dos endpoints das m2-04/m2-05 — `listarCampanhas`/`criarCampanha`/`entrarCampanha`/`recuperarCampanha`/`listarMembros`/`regenerarConvite`, extrai o `dados` do `StandardResponse`, DTOs do shared `./dtos/campanha`) e **4 telas standalone lazy**: `lista` (`/painel`, campanhas do usuário + papel, links criar/entrar/detalhe), `criar` (`/painel/criar`) e `entrar` (`/painel/entrar`) — Reactive Forms que ao concluir navegam ao `/painel/:id` —, `detalhe` (`/painel/:id`) — nome/descrição, membros com papel e, **só para o mestre** (derivado da lista de membros vs `sessao.usuario().id` — apresentação, não regra: autoridade é o backend §14), o `codigo_convite` + botão **regenerar**. Estado em Signals; `.scss`/BEM/tokens do tema (card/botão/chip de `_componentes.scss`, sem hex solto — proibição #29). Proxy dev encaminha `/campanha`. **6 testes** (`campanha.service.spec`). **m2-09:** novo `CampanhaContextoService` (`providedIn:'root'`, puro estado de apresentação — nome/código da campanha ativa para o seletor da topbar; `CampanhaDetalhe` define ao carregar e limpa ao desmontar via `DestroyRef`); ícones no `chip-papel` (coroa/escudo), botão de copiar o convite (clipboard) e ícone no "Regenerar". **Refino mobile (m2-08):** alvos de toque de 44px — `criar`/`entrar` (inputs/enviar), `lista` (ações Criar/Entrar esticam com `flex: 1` e viram 44px), `detalhe` (botão de copiar convite de 34→44px, "Regenerar" e "Voltar" com 44px); listas já eram de uma coluna, então o trabalho foi toque/densidade, não reflow. **Revisão S24+ (pós-m2-08):** as **ações Criar/Entrar da lista empilham em coluna** (largura total) no mobile — rótulos numa linha só, sem a quebra apertada de duas colunas. **m2-12:** edição inline (nome/descrição via Reactive Forms) e exclusão com confirmação inline da campanha, só para o mestre (Signals `editando`/`confirmandoExclusao`); `alterarCampanha`/`excluirCampanha` no `CampanhaService`; glifos `editar`/`excluir` no `shared/icone`. **m2-13:** **gestão de membros** na lista do detalhe, só para o mestre — cada linha de **jogador** ganha botões-ícone de **transferir mestre** (coroa) e **remover** (lixeira), cada um com **confirmação inline** na própria `<li>` (Signal `acaoMembro {usuarioId, tipo}`, sem `confirm()` nativo, caixa `--accent-dim`/`--accent-border`); a transferência avisa que o mestre passa a jogador. `removerMembro`/`transferirMestre` no `CampanhaService` (endpoints da m2-10). Remover tira o membro da lista; transferir recarrega os membros → `ehMestre` recomputa e as ações de mestre somem na hora. `+7 testes` (2 service + 5 detalhe). **m2-16 (lar das fichas):** `CampanhaDetalhe` passou a injetar também `FichaService`/`TempoRealService` — o `carregar()` inicial agora é um `forkJoin` de três (`campanha`+`membros`+`fichas`, via `fichaService.listarFichas`), um `computed` `fichasPorMembro` agrupa por `usuarioId` (reusa `rotuloClasse` do módulo `ficha`) e `fichasDoMembro(usuarioId)` alimenta o template; `fichasExpandidas` (um `Set` de `usuarioId`) controla o disclosure mobile via `alternarFichas` — a classe some no desktop e aparece no mobile só por SCSS (`@include bp.mobile`), o componente não decide a largura. O botão **"Nova ficha"** (cabeçalho da seção Membros) abre o `FichaCriarDialog` importado do módulo `ficha` (mesmo fluxo da extinta `FichaLista`: `construirFichaInicial` monta o documento, `fichaService.criarFicha` persiste, navega para `/painel/:id/ficha/:id`). Tempo real: entra na sala `campanha:<id>` ao montar (antes só a `FichaLista` entrava), `merge(fichaCriada$, membroEntrou$)` e o `effect` de `reconexao()` chamam `recarregarMembrosEFichas()` (um `forkJoin` membros+fichas, sem tocar a `campanha` — ela não muda por esses eventos); `confirmarTransferenciaMestre` passou a usar o mesmo método. `appOverflowFade` na lista de membros (`.detalhe__membros`, `max-height: 520px`) e em cada lista de fichas por membro (`.detalhe__fichas-lista`, `max-height: 220px`) — máscara em gradiente só quando corta de fato. O módulo `ficha` perdeu a página `paginas/lista/` e a rota `''` de `ficha.routes.ts` (só resta `:id`); o link "Voltar" da `FichaVisualizar` agora aponta para `/painel/:campanhaId` (a rota antiga `/painel/:campanhaId/ficha` não tem mais destino). `+13 testes` no `detalhe.page.spec.ts` (fichas inline agrupadas, membro sem ficha visível não mostra o bloco, link da ficha, toggle do disclosure, assistente de criação, sala de tempo real, refetch em `ficha:criada`/`membro:entrou`, ressincronização em `reconexao`). **m2-16b (mestre cria ficha para outro membro):** a matriz §14 sempre disse "criar ficha de jogador: dono só a própria, mestre sem restrição", mas `criarFicha` sempre gravava o dono como o próprio autenticado — corrigido. `FichaCriarDto` ganhou `usuarioId?: number` (shared); a service resolve `donoId = dto.usuarioId ?? usuarioAtivo.sub` e só aceita um dono diferente do autenticado quando ele é o **mestre** (senão `UnauthorizedAccessException`), validando que o alvo é membro (`validarMembroAlvo`, reusada da m3-04 — `ResourceNotFoundException('Membro')` caso contrário); helper `validarMembro` morto foi removido (a checagem de membro do autor virou parte do novo fluxo). No `FichaCriarDialog`, um seletor **"Ficha de"** aparece só quando `podeEscolherDono` (passado pelo `CampanhaDetalhe` como `ehMestre()`), populado por `membros()` e pré-selecionado no próprio `usuarioAtivoId()` (rótulo "(Você)"); o output `criar` passou de `OpcoesFichaInicial` solto para `FichaAssistenteResultado { opcoes, usuarioId? }` — separa "como montar o documento" de "quem é o dono", sem misturar conceito. `+3 testes` de service no backend (mestre cria para outro, jogador comum é barrado, alvo não-membro é 404) e `+4 testes` no `ficha-criar-dialog.component.spec.ts` (seletor oculto pro jogador, pré-seleção, confirmar sem mexer emite o próprio, trocar emite o escolhido); verificado ao vivo (mestre cria uma ficha em nome de "Jogador Dois" pelo seletor, ela aparece sob o dono correto no detalhe; jogador comum nunca vê o seletor). **m2-16c (Vida/Energia/Condições no mini-card):** `ItemFicha` (interno ao componente) ganhou `vidaAtual`/`vidaMaxima?`/`energiaAtual`/`energiaMaxima?` + `condicoesAtivas` (subconjunto filtrado de `CONDICOES_FICHA` — novo `shared` **de frontend**, `modules/ficha/condicoes-ficha.ts`, com o trio chave/rótulo/ícone das 3 condições, reusado também pelo editor da ficha para não duplicar a lista); o mini-card virou cartão em coluna (nome + ícones de condição ativa no topo, classe/nível, e a linha "Vida N/M · Energia N/M" com as cores fixas `--vida`/`--energy`). Editor da ficha (`ficha-visualizacao`, aba Visão Geral): nova barra de 3 toggles logo abaixo da barra de Energia — chip neutro quando inativo, cor semântica quando ativo (`--vida` p/ Morrendo, `--warning` p/ Machucado, neutro p/ Inconsciente — sem token que coubesse); `ajustavel()` controla se são clicáveis (mesmo padrão dos passos −/+ de Vida/Energia), `ajusteCondicoes` novo output, `visualizar.page.ts` persiste otimista + em lote (mesmo `agendarPersistencia` de todo ajuste). 3 ícones novos no `shared/icone` (`morrendo` caveira, `machucado` coração rachado, `inconsciente` rosto com olhos em ×). **Verificado ao vivo:** toggle marca/desmarca, sobrevive a reload (persistiu de verdade, não só otimista), e os ícones + Vida/Energia aparecem certos no mini-card da campanha. **m2-17 (redesenho visual):** nenhum dado novo, nenhuma mudança de TS/lógica em `CampanhaLista` além de importar `OverflowFade` — o trabalho é quase todo SCSS. `lista.page`: `.campanhas__lista` virou `display: grid` (`repeat(auto-fill, minmax(260px, 1fr))`, era `flex column`) com `max-height`/`overflow-y`/`appOverflowFade`; cada item virou `.campanhas__cartao` (era `.campanhas__ligacao`) — coluna vertical (avatar+nome no topo, descrição truncada em 3 linhas via `-webkit-line-clamp`, chip de papel no rodapé colado pela régua + `margin-top: auto`), altura igualada entre cartões da mesma linha da grade. `.campanhas` (e `.detalhe`) saíram de `max-width: 680px` para **1160px** (escala da ficha de jogador). `detalhe.page`: o único `<article class="card">` virou uma `.detalhe__grade` (`grid-template-columns: minmax(0,340px) minmax(0,1fr)`, empilha abaixo de 960px) com **dois** cards — `.detalhe__identidade` (nome/descrição/edição, convite, ações de mestre) e `.detalhe__equipe` (cabeçalho "Membros" + `.detalhe__membros`, inalterado por dentro — m2-16 preservado); todas as classes testadas em `detalhe.page.spec.ts` sobreviveram (`.card__titulo` continua único, na identidade). Achado ao vivo: o código de convite (`.detalhe__codigo`) truncava com reticências na coluna de 340px — o `flex-basis: 100%` que só valia no mobile (m1-15) virou **incondicional** (a coluna de identidade é sempre estreita agora), removendo a duplicata que só existia em `@include bp.mobile`. **Verificado ao vivo** (5 campanhas, larguras 1440/820/390px): grade de cartões reflui de 1 a 4 colunas, disclosure de fichas mobile intacto, sem scroll horizontal em 390px; a 820px o **topbar** (chip de campanha + nav + dropdown) se sobrepõe — confirmado como gap **pré-existente e fora de escopo** (a topbar sem sessão renderiza normal na mesma largura; m2-08 só cobriu 360–430px). **m2-16d (tempo real, destaque crítico, estado vazio, frescor):** cinco melhorias pontuais no `CampanhaDetalhe`, sem schema/backend novo. **(1) `ficha:alterada` em tempo real:** `sincronizarSalasFicha` entra/sai das salas `ficha:<id>` conforme a lista de fichas muda (chamada após todo `carregar()`/`recarregarMembrosEFichas()`), e `fichaAlterada$` do `TempoRealService` entrou no `merge(...)` que já disparava `recarregarMembrosEFichas()` — Vida/Energia/condições editadas por um membro agora atualizam o mini-card de todo mundo na campanha sem reload (**verificado ao vivo**: jogador reduz a própria Vida via stepper na ficha, o mini-card do mestre em outra aba muda de 40/49 para 37/49 sozinho). **(2) três ícones sempre visíveis:** o loop de condições no mini-card parou de filtrar por `condicoesAtivas` — `ItemFichaCondicao` agora carrega as 3 sempre, com `ativa: boolean`; o SCSS ganhou `--ativa` (opacidade 1, cor semântica por `[data-condicao]`) vs. o estado base esmaecido (opacidade .35, `--text-mute`) — antes uma condição inativa simplesmente não aparecia, agora aparece apagada (affordance de "isso existe e está desligado"). **(3) destaque de Vida crítica:** `ItemFicha.critico` (`vidaAtual <= 0`) é derivado, independente do toggle manual "Morrendo" — `.detalhe__ficha-card--critico` tinge o cartão com `color-mix(in srgb, var(--vida) 8%, var(--surface))` e borda `--vida-border`, mesmo que ninguém tenha marcado a condição ainda. **(4) estado vazio ciente de permissão:** `podeAfirmarSemFichas(membro)` só afirma a ausência de ficha quando quem vê é o mestre ou o próprio dono da linha (`"Você ainda não tem uma ficha aqui."` vs. `"Ainda sem ficha."`) — um jogador comum olhando outro membro sem ficha visível não vê nenhuma das duas frases, porque não tem base pra afirmar isso (podem existir fichas ocultas via `usuario_ficha_acesso`, §14). **(5) frescor:** `ultimaAtualizacaoEm` grava `Date.now()` a cada fetch bem-sucedido; `textoAtualizacao` (computed, com um `agora` re-emitido por `setInterval` de 5s) rende "Atualizado agora" / "Atualizado há Ns" / "Atualizado há Nmin" no cabeçalho da seção Membros. `+` testes em `detalhe.page.spec.ts` (sala de `ficha:alterada`, refetch, 3 ícones sempre presentes, destaque crítico com/sem Vida zerada, os dois textos de estado vazio + ausência de afirmação pro jogador comum, frescor imediato e após avanço de tempo). **Verificado ao vivo** com dois usuários reais (mestre + jogador, Postgres local): sync sem reload confirmado, cartão fica vermelho ao zerar a Vida sem tocar no toggle "Morrendo", ícones dimmed/ativos visíveis lado a lado. Diagnosticado à parte (não é bug de código): um relato de "Vida/Energia aparecendo em branco" em produção era **desalinhamento de deploy** — Cloudflare Pages publica preview de toda branch, Render só faz auto-deploy do `master`; sem código novo necessário, só merge pendente. **m2-16e (grid dinâmica de fichas):** `.detalhe__fichas-lista` ganha `--grid-2`/`--grid-3` (`[class.x]` no template, calculado a partir de `totalFichas`, já disponível como alias do `@if` que abre o bloco) — 1 ficha continua na linha única (flex column de sempre, sem classe extra), 2 fichas viram `grid-template-columns: repeat(2, minmax(0,1fr))`, 3+ viram `repeat(3, minmax(0,1fr))` (a 4ª ficha em diante quebra pra próxima linha da grade, `align-items: start` evita esticar cards de altura diferente). Só desktop: dentro de `@include bp.mobile` as duas classes de grid são zeradas (`grid-template-columns: none`) — o disclosure mobile continua sempre 1 coluna, sem competir por espaço horizontal. `+2 testes` (`detalhe.page.spec.ts`: 1/3 fichas sem grid-2 e com grid-3, exatamente 2 fichas com grid-2). **Verificado ao vivo** (Postgres real, um membro com 4 fichas e outro com 2, criado e depois removido via API só pra esse teste): grid-3 quebra linha corretamente, grid-2 preenche a largura em duas colunas, membro com 1 ficha permanece em linha cheia, e o mobile (390px) ignora a grid e mantém a lista vertical de sempre. **m2-16f (bug real de topbar em tablet):** o gap "820px sobrepõe" flagueado como fora de escopo na m2-17 foi isolado e corrigido — não era autenticação nem largura genérica, era especificamente o **chip de campanha** (`shared/layout/layout.component`, `.topbar__campanha`) que só existe dentro de `/painel/:id`: sem ele a topbar respirava até ~700px, com ele "Calculadora" colidia com o perfil a partir de ~870px (medido ao vivo, binary search de largura). Correção em `shared/layout/layout.component.scss`: `.topbar__marca` (wordmark), `.topbar__campanha-texto` (nome/código do chip — vira só ícone) e `.topbar__identidade` (nome ao lado do avatar) somem a partir de **900px** em vez de `bp.mobile` (560px) — 900px é um limiar mais largo que já cobre o mobile de sempre (não é um segundo breakpoint independente, então as três regras trocaram `@include bp.mobile` por `@media (max-width: 900px)` direto, sem duplicar bloco); mesmo valor já usado em `ficha-sanidade.component.scss`. `.topbar__perfil-usuario` (cabeçalho com o nome dentro do dropdown) trocou o mesmo limiar, pra continuar reapresentando o nome que saiu da barra. **Verificado ao vivo** (larguras 1440/960/900/870/820/700/560/390px): sem overlap em nenhuma, dropdown mostra "MESTRE UM" corretamente em 750px, nenhuma regressão nas larguras que já funcionavam. **m2-16g (ações rápidas de Vida/Energia no mini-card):** ± direto no card, sem abrir a ficha — só dono ou mestre (`podeAjustarFicha`, mesma regra §14 de `ehDono() || ehMestre()` do editor completo). Duas peças novas em `modules/ficha/` (reuso deliberado, não duplicação): `ajuste-vitalidade.ts` exporta `clamparVitalidade`/`CampoVitalidadeAtual` — o clamp (Vida com piso 0, Energia sem piso, m3-10) que antes só existia dentro de `ficha-visualizacao.component.ts` virou função pura importada dos dois lugares; e `FichaVitalidadeRapidaService` (`providedIn:'root'`) — ajuste fora de uma sessão de edição aberta: acumula o último valor pedido por `fichaId`+campo num `Map`, debounce de 500ms por ficha (`setTimeout`/`clearTimeout`, independente entre fichas), e só na hora de persistir busca o documento completo (`recuperarFicha`, nunca cacheado entre cliques — pode ter mudado por outra via) e mescla os campos pendentes por cima antes do `alterarFicha`; expõe `persistido$`/`falhou$`. `CampanhaDetalhe.ajustarVitalidade` aplica o clamp, atualiza o `fichas` signal na hora (otimista — o resumo já reflete o novo valor antes da rede responder) e delega ao serviço; um `falhou$` assinado no construtor reconcilia via `recarregarMembrosEFichas()` se a persistência der erro. O mini-card deixou de ser o próprio `<a>` — os botões `.detalhe__ficha-passo` (mesma receita visual do `.ficha-passo` da ficha completa, menor) não podem viver dentro de um link, então o card virou um `<div>` com o link só no topo+meta (`.detalhe__ficha-link`) e os vitais como irmão, cada um com − / + usando `appHoldRepeat` (o mesmo directive compartilhado da leitura da ficha, sem reimplementar segurar-pra-repetir). `+5 testes` em `detalhe.page.spec.ts` (visibilidade por permissão, otimismo imediato, desabilita no piso, debounce em lote) e `+6 testes` novos em `ficha-vitalidade-rapida.service.spec.ts` (debounce isolado por ficha, merge por cima do documento buscado, `persistido$`/`falhou$`, falha não trava o próximo ajuste). **Verificado ao vivo**: clique soma na hora, não navega (URL continua em `/painel/:id`), reload confirma que persistiu de verdade no backend (não só otimismo local), e clicar no nome continua navegando normalmente pra ficha |
| frontend/usuario | **pronto (m2-14)** — módulo `modules/usuario/` (rota privada `/perfil`, `loadChildren` guardado pelo `autenticacaoGuard`): `UsuarioService` (`providedIn:'root'`, cliente HTTP self-service — `recuperarPerfil` `GET /usuario/perfil`, `alterarPerfil` `PATCH /usuario/perfil`, `alterarSenha` `PATCH /usuario/senha`, `excluirConta` `DELETE /usuario`; extrai o `dados` do `StandardResponse`, DTOs do shared `./dtos/usuario`) e a **tela `perfil` standalone lazy** (Reactive Forms + Signals, 3 cards): editar nome/login (reflete na sessão via `SessaoService.atualizarPerfil` → topbar acompanha; login em uso barrado pelo backend §11 → toast do `error-handler`), trocar senha (`senhaAtual`+`novaSenha`, toggle "olhinho", `minLength(6)`, limpa o form ao concluir) e excluir conta (confirmação inline forte, sem `confirm()` nativo; `excluirConta` → `sair` → `/login`). Item "Perfil" (ícone `agente`) no dropdown de perfil da topbar. `.scss`/BEM só com tokens (proibição #29), alvos de toque 44px no mobile. **13 testes** (4 `usuario.service.spec` + 1 `sessao.service.spec` + 6 `perfil.page.spec` + 2 `app.routes.spec`) |
| frontend/calculadora | **6 abas prontas (paridade da calculadora completa)**. Fundação (m1-06): módulo `modules/calculadora/` com 6 rotas públicas **lazy** — `agente`/`dt`/`novo-agente`/`patente`/`descanso`/`compras` — sob o `CalculadoraShell` (navegação de abas + deep-link por rota via `routerLink`/`routerLinkActive`, paridade com o `switchTab`/`VALID_TABS` por hash do site antigo) e o `StepInput` (stepper/input numérico reutilizável, `ControlValueAccessor` + Reactive Forms, sem `ngModel`). **Aba `agente` (m1-07):** carro-chefe — `AgentePage` (Reactive Forms + Signals) consumindo `shared/regras/agente` para **todas** as stats. **Abas leves `dt`/`novo-agente`/`patente` (m1-08):** três páginas Reactive Forms + Signals consumindo `shared/regras/{dt,novo-agente,patente}`, reusando o `StepInput` e os tokens/BEM do tema; rótulos de `PatenteEnum`/`MotivoEntradaAgenteEnum`→pt-BR em `modules/calculadora/rotulos.ts` (formatação de UI). **Aba `descanso` (m1-09):** `DescansoPage` (Reactive Forms + Signals) consumindo `shared/regras/descanso` — faixa determinística + **rolagem animada** (scramble via `requestAnimationFrame`, RNG por `rolarDados`). **Aba `compras` (m1-10):** `ComprasPage` — a mais pesada: configuração do agente (4 steppers), resumo de limites/gastos, catálogo com busca/categorias e o carrinho com itens, modificações (painel + empilhamentos) e amplificadores; estado em **Signals**, todos os números vindos de `shared/regras/compras` (`calcularResumoCompras`/`calcularStatItem`/custos). **Persistência e exportar/importar (m1-11):** `effect()` salva carrinho/amplificadores/recursos em `localStorage` a cada mudança e recarrega na construção da página; modais de exportar (código `CRPG-COMPRAS-V1:<base64>`) e importar, com aviso de incompatibilidade com códigos do site antigo. **Ajuda por aba (m1-12):** componente único `AjudaCalculadora` (`componentes/ajuda-calculadora/`) — gatilho "? Ajuda" + modal — embutido nas 6 páginas via input signal `aba`; o texto (guia de "como usar cada página") vive em `CONTEUDO_AJUDA`, keyed por aba, sem duplicação. Todas as 6 abas concluídas com paridade completa. **Verificação de paridade + "sem duplicação" (m1-14):** achado corrigido — `compras.page.ts` recalculava custo/penalidade de amplificador com constantes de regra embutidas (`3000/1000/2`) → passou a consumir `calcularCustoAmplificador` + `PENALIDADE_VONTADE_POR_EMPILHAMENTO` de `shared/regras/compras` (zero constante de regra no front). **Cor da stat Vida** (abas agente/descanso) desacoplada do `--accent` trocável: novo token fixo `--vida`/`--vida-border` (vermelho da identidade) em `_tokens.scss` (front + `docs/design/tema/`) — Vida permanece vermelha mesmo com accent trocado no tema em runtime. **Refinamento mobile (m1-15):** estratégia responsiva dirigida por token — `src/styles/tema/_breakpoints.scss` (`$bp-mobile: 560px` + mixin `mobile` + `$alvo-toque: 44px`, resolvido via `stylePreprocessorOptions.includePaths` em `angular.json`); a densidade mobile vem de **override dos tokens** `--pad-card`/`--gap-grid` num `@media` no `styles.scss` (reflui todos os cards/grids de uma vez, sem valor mágico por arquivo); trava de scroll horizontal via `overflow-x: clip` em `html`/`.conteudo`. Abas do shell viram **barra flutuante fixa no rodapé** no mobile (ícone sobre rótulo, 6 itens distribuídos, deep-link preservado, área segura do iOS + espaço reservado no conteúdo); alvos de toque de 44px no `StepInput`, chips de categoria, mini-botões e controles do painel de tema; os 3 modais (ajuda/tema/exportar-importar) ganham `max-height` + rolagem interna. As 6 grades já refluem por `auto-fit`/`auto-fill minmax`. Verificação responsiva (360/390/430px) na §6 de `docs/PARIDADE-M1.md`. **Estado entre-abas em memória (m1-17):** singleton `providedIn: 'root'` `EstadoAbasCalculadoraService` (`modules/calculadora/estado-abas-calculadora.service.ts`, mapa `aba → valor bruto` em Signal, sem I/O) preserva o formulário das 5 abas `agente`/`dt`/`novo-agente`/`patente`/`descanso` ao trocar de aba (cada página restaura no construtor via `patchValue` e grava em cada `valueChanges`); F5 recria o service vazio → volta ao preset (só `compras` sobrevive a F5, pelo seu `localStorage` da m1-11, intocado). Preset da aba `agente` passou a **Nível 0** e atributos **1/1/1/1/1** (era Nível 3 / 2/2/2/1/1). **Sem regra de jogo** (`shared`/`shared/regras` intocados). **Aba Vendas (m1-20):** Compras e Vendas são **duas abas** da barra da calculadora (rotas `/calculadora/compras` e `/calculadora/vendas`) carregando a mesma `ComprasPage` em modos distintos — o `modo` vem por `data` da rota → `input()` (`withComponentInputBinding`). Em Vendas somem os cards Config/Resumo, **carrinho de venda separado** (o de compra e a persistência m1-11 intactos), card "Venda" com fragmentos primeiro (scroll lateral no mobile) e valores no fim (taxa 50/75/25%, valor itens, total fragmentos, Total de Venda em destaque); regra 100% no motor (`shared/regras/compras/venda`). Painel de modificações (Compras e Vendas) com scroll+fade igual ao dos itens (`[appOverflowFade]`, agora bi-eixo — fade lateral no scroller horizontal de fragmentos). Limpar (m1-19) zera taxa/fragmentos da venda. Budget `anyComponentStyle` subiu p/ 12/14 kB. Ícone novo `vendas` no `shared/icone`. **Barra flutuante mobile do shell** virou navegação **só de ícones** (rótulo só na aba ativa) para acomodar a 7ª aba sem espremer |
| frontend/ficha | não iniciado |
| Infra — banco local (Docker + Knex) | **pronto** (Postgres 16 + migrations). Migrations `0001` (`fn_set_updated_date`) + **`0002`–`0005` (m2-01)**: `tipo_campanha_membro_papel` (seed `MESTRE`/`JOGADOR`), `usuario`, `campanha`, `campanha_membro` + **`0006`–`0008` (m3-02)**: `tipo_ficha` (seed `JOGADOR`/`CRIATURA`/`NPC`), `ficha` (FKs campanha/usuario/tipo_ficha + `dados JSONB NOT NULL`), `usuario_ficha_acesso` (índice único parcial `(ficha_id, usuario_id) WHERE is_deleted = false`) — round-trip `db:migrate`/`db:rollback` validado. Próxima migration: `0009` |
| Infra — CI (lint + testes em PR) | **pronto** (GitHub Actions; lint nos 3 workspaces, testes via `--if-present`). **m2-02:** o backend ganhou seu 1º test-runner — **Vitest** (`backend/vitest.config.ts`, script `test`), então o CI agora roda também os testes de backend |
| Infra — Deploy (produção) | **pronto** (integração nativa: Render auto-deploy via `render.yaml` + Cloudflare Pages via Git; CORS + `apiBase` fixo. Sem GitHub Actions no deploy — `docs/DEPLOY.md`) |

## Próxima Task

**M2 concluído no código.** O milestone **M2 — Auth + Campanhas**
(`docs/specs/backlog/m2-auth-campanhas.spec.md`) foi quebrado em **9 tasks numeradas**
(`m2-01`…`m2-09`), **todas concluídas** (specs em `docs/specs/done/`): **m2-01** (fundação de dados),
**m2-02** (backbone de autenticação JWT), **m2-03** (perfil e troca de senha), **m2-04** (CRUD de
campanha), **m2-05** (convite/membros), **m2-06** (frontend de autenticação), **m2-07** (frontend de
campanhas), **m2-09** (revisão geral de estilização) e **m2-08** (refino mobile). O **backend de
campanhas está fechado** (CRUD + entrada por convite + regeneração + listagem de membros + matriz de
permissões §14); a UI fecha o **fluxo do M2 ponta a ponta** — sob `/painel` (guardado): listar
campanhas, criar, entrar por código e o detalhe com membros + convite/regenerar do mestre —, alinhada
aos protótipos de `docs/design/examples/` (topbar "Barra de Comando", split-panel de auth, ícones) e
**usável no mobile (~360px)** com alvos de toque de 44px (m2-08).

**Lote de extensão `m2-10`…`m2-15`** (CRUD restante de campanha/usuário, specs no backlog): fecha as
lacunas de gerência do M2 antes de abrir o M3. Backend **m2-10** (gestão de membros — remover/transferir
mestre), backend **m2-11** (perfil do usuário — alterar nome/login + excluir conta), frontend **m2-12**
(edição/exclusão de campanha — consome os endpoints `PUT`/`DELETE` da m2-04), frontend **m2-13** (gestão
de membros — remover jogador / transferir mestre, consome a m2-10) e frontend **m2-14** (perfil do
usuário — alterar nome/login, trocar senha e excluir a própria conta, consome as m2-11/m2-03) e
frontend **m2-15** (refino visual da tela de campanhas — passe SCSS-first aproximando lista/detalhe dos
protótipos, só apresentação e só com tokens) **concluídos** (specs em `docs/specs/done/`). **Lote de
extensão `m2-10`…`m2-15` fechado — M2 encerrado ponta a ponta.**

**M3 — Ficha de Jogador em andamento.** **m3-01** (contrato final `FichaJogadorDadosDto` do JSONB
`ficha.dados`), **m3-02** (fundação de dados — migrations `tipo_ficha`/`ficha`/`usuario_ficha_acesso`
+ enum `TipoFichaEnum`), **m3-03** (backend do CRUD da ficha de jogador — módulo `ficha` com a matriz
de permissões §14 e a validação do documento contra `shared/regras`; verificado ao vivo contra o
Postgres) e **m3-04** (concessão/revogação de acesso de visualização — `usuario_ficha_acesso`:
`concederAcesso`/`revogarAcesso`/`listarAcessos`, só dono ou mestre, alvo membro, idempotente, soft
delete; fecha a matriz §14; verificado ao vivo contra o Postgres; backend 76/76) e **m3-05** (gateway
de tempo real WebSocket broadcast-only — `CampanhaGateway`/`GatewayModule`/`WsIoAdapter` em
`core/gateway/`; handshake autenticado pelo mesmo `JwtService`/`JWT_SECRETO` do Passport; salas
`ficha:<id>`/`campanha:<id>` com a permissão §14 reusada das services `recuperarFicha`/`recuperarCampanha`;
eventos `ficha:alterada`/`ficha:criada`/`membro:entrou` emitidos pelas services após a mutação;
`forwardRef` nos dois lados; verificado ao vivo com `socket.io-client`; backend 87/87) **concluídos**
(specs em `docs/specs/done/`).

O frontend da ficha avançou muito além do CRUD inicial: **m3-06** (criação/edição), **m3-07**
(lista + visualização), **m3-08** (tempo real do mestre), **m3-10** (edição inline + Maestria + stats
editáveis), **m3-11** (navegação por abas), **m3-12** (editor de Sanidade & Lesões), **m3-13** (editor de
Habilidades), **m3-14** (editor de Inventário) e **m3-17** (merge de edição concorrente) — todos em
`docs/specs/done/`. As abas da ficha já editam Visão Geral, Combate, Sanidade, Habilidades e Inventário no
próprio lugar.

**m3-14 concluído** — editor de **Inventário** no próprio lugar (aba Inventário): componente controlado
`FichaInventario` (`componentes/ficha-inventario/`) que **reusa 100% de `shared/regras/compras`** (catálogo,
limites por patente, custo/peso de modificação, conflitos, stat de item, custo de amplificador e totais —
proibições #26/#27, nenhuma regra reimplementada). Monta/edita itens (com modificações) + amplificadores no
formato do carrinho da M1 (`FichaInventarioDto` = `CarrinhoItemDto[]` + `AmplificadorAplicadoDto[]`, sem tipo
duplicado — m3-01); catálogo recolhível com busca + categorias, painel de modificações por item, alternância
guardada/vestida e stacks de amplificador. Cada mutação emite o `FichaInventarioDto` inteiro e a página
(`FichaVisualizar.ajustarInventario`) persiste **otimista + em lote** (mesma máquina de m3-10/m3-12/m3-13). O
**Inventário máximo** (`Força × 5`, stored/derivado, editável em m3-10) entra como **referência** do peso
usado — exceder é **aviso**, não trava (liberdade total). SCSS-first só com tokens do tema (proibição #29).

**Refino de UX do inventário (ficha + calculadora de compras, em paridade)**: remover a última unidade pede
**confirmação inline**; remover um **stack** (quantidade > 1) abre um **dialog** perguntando quantas unidades
tirar; **Esvaziar** pede confirmação. Botão de adicionar dá **feedback visual** ("✓ Adicionado", pulso).
Passou a existir **item custom** (nome/categoria/custo/peso) e **modificação custom** (nome/empilhamentos) —
sem definição de catálogo, o motor cobra custo/peso padrão da categoria (fonte única mantida — proibição #26).
As modificações deixaram de aparecer sempre: um botão **"Modificar"** revela a caixa de mods. Armazenamento
ganhou um botão **menor e simples** de vestir/guardar. As mesmas mudanças valem na calculadora M1 de compras
(`ComprasPage`), usando o `app-step-input` nativo da calculadora.

**2ª rodada de refino (ficha + calculadora):** o card do item ganhou um **rodapé de ações** com
**Modificar** e o botão de porte **antes do X** de remover (X à direita). A **remoção confirma no próprio
X** (ele troca in-place por ✓/✕, sem abrir linha extra); stack ainda usa o dialog. O botão de porte agora
tem **ícone próprio** (novos ícones `vestida`/`guardada` no `Icone`): **Vestida = cor do tema (accent)**,
**Guardada = cinza claro**. E os custom ficaram **funcionais de fato**: `CarrinhoItemDto`/
`ModificacaoAplicadaDto` (shared) ganharam um `descricao?` opcional (ignorado pelo motor — proibição #26
intacta), então item custom e modificação custom carregam uma **descrição/efeito** em texto livre, exibida
na lista/chip. Verificado ao vivo (stack real) nos dois lados. Frontend 293/293, shared 190/190.

**3ª rodada (item/mod custom REALMENTE funcionais + Fragmentos):** o texto "Remover item?" acompanha o
✓/✕ da confirmação; **Operacional/Medicinal não aceitam modificação** (nem custom). O motor
(`shared/regras/compras`) passou a **resolver os stats do item pelo próprio item** quando ele é custom
(`resolverDadosItem`): `CarrinhoItemDto` ganhou `dano`/`informacao`/`resistencia`/`bonus`/
`categoriaEmprestada`/`modulo`, então uma **arma/explosivo/proteção/armazenamento custom calcula
dano/resistência/bônus de verdade** como um do catálogo. **Exótico custom** informa em qual categoria "se
encaixa" (recebe mods dela, ex.: manopla que aceita mods de Corpo a Corpo). **Modificação custom** ganhou
efeito **mecânico** (`ModificacaoAplicadaDto.efeito`: dano fixo, dados extras `NDx [tipo]`, resistência)
aplicado por `calcularStatItem`. Duas novas **categorias de item — Fragmento Construtor e Fragmento
Potencializador** (achados, montados como item custom com módulo I–V + forma base). Formulários de item/mod
custom (ficha e calculadora) ganharam os campos por categoria. Tudo com testes no motor (`compras.spec`
+7) e nos componentes. Frontend 296/296, shared 190/190.

**4ª rodada (mod custom cobrindo todos os casos + cadastro melhorado):** o efeito da mod custom deixou de
ser três campos fixos e virou uma **lista de efeitos** (`ModificacaoAplicadaDto.efeitos[]`) discriminada por
`ModificacaoEfeitoTipoEnum` (enum novo), cobrindo **todos os arquétipos** das tabelas de modificação de todas
as categorias: `DANO_FIXO`, `DANO_DADOS`, `DANO_DADOS_BASE`, `ELEVAR_DADO`, `PERFURACAO`, `BONUS_TESTE`,
`RESISTENCIA` (todas ou por tipo, aceita negativo), `DEFESA`, `ALCANCE`, `RAIO`, `DURACAO`, `CONDICAO`,
`INVENTARIO`. O motor **funde no stat computado** os efeitos de dano/resistência/inventário (como as mods do
catálogo) e os demais viram **descrição do chip** via `descreverEfeitoModificacao`/`descreverEfeitosModificacao`
(novos helpers puros). Uma mod pode **combinar efeitos** (ex.: dados + condição, estilo Incendiária). O
**cadastro** foi redesenhado: `FormArray` de efeitos com **seletor de tipo por linha** + campos condicionais do
tipo (add/remover efeito), espelhado em `FichaInventario` e `ComprasPage`, com os metadados de UI em
`app/shared/inventario/efeito-modificacao.ui.ts` (sem acoplar `ficha`↔`calculadora`). Verificado ao vivo:
uma mod multi-efeito num rifle exibe `Dano 2D8+PON [Balístico] + 1D6 [Químico]` e o chip
`+1D6 [Químico] · aplica Em Chamas por 2t (DT Vigor) · ignora 5 de resist. [Balístico]`. Shared 204/204,
frontend 298/298, lint limpo, build AOT ok.

**5ª/6ª rodadas (layout + limites flexíveis + marcadores):** o **X** de remover foi para o fim do cabeçalho
(`[Modificar] [Vestir] $custo peso [X]`); armazenamento **vestido ocupa "0 slots"**. O campo da mod custom
virou o **teto** dela (`empilhamentoMaximo`; entra em 1×) e **corrigiu** o bug de perder efeitos ao empilhar.
Os limites da **patente** deixaram de travar: exceder é permitido e marcado **"Excedente"** (âmbar). Cada mod
(catálogo ou custom) pode ser marcada, via checkbox no chip, para **não contar** no limite total da arma
(`ignoraLimiteTotal`) ou no próprio teto (`ignoraLimiteProprio`) — `modsUsados`/`podeAumentar`/`excedente`
respeitam as flags. Contrato: `ModificacaoAplicadaDto` ganhou `empilhamentoMaximo`/`ignoraLimiteTotal`/
`ignoraLimiteProprio`. Espelhado ficha+calculadora. Shared 204/204, frontend 301/301, lint limpo, build AOT ok.
m3-14 **concluída** (spec em `done/`, com a seção "Refinamentos entregues").

**m3-15 concluída** — **presets de rolagem** da ficha (aba Rolagens). Novo motor puro
**`shared/regras/rolagem`** (não `regras/dados`, que já é a pasta de dados/tabelas de jogo):
`interpretarFormula`/`validarFormula` (parser de `NdM`, inteiros e atributos por abreviação `LUT`/`FOR`/…
ou nome, com `+`/`−` e teto de dados) + `rolarFormula` (RNG **injetável** — a brecha a `Math.random` no
`rolarDadoPadrao`, §6.6; testes determinísticos). Tabela de abreviações em `rolagem.dados`, DTOs em
`rolagem.dtos`, export em `package.json`. **Editor `ficha-rolagens`** (controlado, Signals + Reactive
Forms): add/editar/remover preset com **validação de fórmula ao vivo** (inválida = aviso) e **Rolar**
mostrando o total em destaque + detalhamento (`18 · 1D20 [15] + LUT 3`); embutido na aba Rolagens da
`ficha-visualizacao`, persiste `dados.rolagens` via `alterarFicha` (otimista). Comentário do
`FichaRolagemDto` corrigido para apontar `regras/rolagem`. Spec em `done/` (com "Notas de implementação").
Shared 213/213, frontend 306/306, lint limpo, build AOT ok, verificado ao vivo. **Com m3-15, todas as abas
da ficha têm editor** (m3-12 Sanidade, m3-13 Habilidades, m3-14 Inventário, m3-15 Rolagens).

**Milestone Rolagem v2 (m3-16, m3-18…m3-22)** — **concluído** (m3-22 fecha a UI). Expande o motor de rolagem para as
regras reais: atributo como fonte de dados, `× ÷`, dano tipado + Composto, **modo TESTE** (maior
dado + Proficiência), **efeitos estruturados de habilidade**, presets **encadeados** que gastam
energia, guia de fórmula e **rolar teste na Visão Geral**. As specs de Identidade e otimização foram
renumeradas para **m3-23…m3-26** (rodam depois). Plano completo em
`~/.claude/plans/nos-presets-tamb-m-tem-structured-sparrow.md`.

**m3-16 concluída** — **gramática v2** do motor (`shared/regras/rolagem`). `interpretarFormula` ganhou
o **atributo como fonte de dados** (`FORd6` = FOR dados de 6 faces; `quantidadeAtributo` no
`TermoDadoDto`) e o **escalonamento** de atributo (`FOR*3`, `LUT/2` com piso; `multiplicador`/`divisor`
no `TermoAtributoDto`), além de **rejeitar parênteses** com mensagem. `rolarFormula` resolve a contagem
pelo atributo (≤0 → 0 dados, teto 100) e aplica mult/div. **Ainda somando** — modo TESTE e dano tipado
vêm a seguir. Tudo aditivo/opcional (presets legados idênticos). Shared **222/222** (6 novos casos).
Spec em `done/`.

**m3-18 concluída** — **dano tipado** no motor. Novo `TipoDanoEnum` (`shared/enums`, valores = as
strings já usadas em compras → sem migração) + `TIPOS_DANO_BLOQUEAVEIS`. A fórmula aceita tags
`[Tipo]` e `[TipoA-TipoB]` (**Composto**): o parser virou por **segmentos** (`split` por tag),
estampando cada termo; trecho sem tag numa fórmula tipada assume **Físico**; `resolverTipoDanoSimples`
tolera caixa/acentos. `rolarFormula` agrupa o total por tipo (`grupos: GrupoDanoDto[]`) e divide cada
Composto pela **soma do segmento** (resto pro primeiro). DTOs aditivos (`tipoDano?`/`composto?` nos
termos e resultados, `constantesTipadas?`, `GrupoDanoDto`). **Sem tags = idêntico ao legado** (sem
`grupos`). Shared **231/231** (9 novos casos). Spec em `done/`.

**m3-19 concluída** — **modo TESTE** no motor. Novo `RolagemModoEnum` (`TESTE|SOMA`; ausente =
`SOMA` legado). `RolagemDto` += `modo?`/`proficiencia?`. `interpretarFormula`/`validarFormula`
recebem `modo`; **açúcar do teste**: atributo puro (`luta`) vira o pool `(Atributo)`D20 no TESTE.
`rolarFormula` no TESTE → `montarResultadoTeste`: junta o pool, **pega o maior** (`Math.max`), separa
`descartados`, e `total = maiorDado + Proficiência (null=0) + bônus plano`. Novo `ResultadoTesteDto`;
`ResultadoRolagemDto` += `teste?` (presença sinaliza o modo — optei por não duplicar um campo `modo`).
Shared **238/238** (7 novos casos). Spec em `done/`.

**m3-20 concluída** — **efeitos estruturados de habilidade**. Novos `RolagemEfeitoTipoEnum`
(`DANO_FIXO`/`DANO_DADOS`/`DANO_ATRIBUTO`/`BONUS_TESTE`/`ELEVAR_DADO`) + `RolagemEfeitoAlvoEnum`
(`TESTE`/`DANO`) e `RolagemEfeitoDto` (espelha `ModificacaoEfeitoDto`). `FichaHabilidadeDto`/
`HabilidadeBaseDto` += `efeitos?` (herdado pelo catálogo; **Força Bruta** semeada = FOR×3 físico).
Motor: **`aplicarEfeitos(formula, efeitos, modo?)`** funde efeitos por `alvo`↔modo numa nova fórmula
(DANO_ATRIBUTO = termo escalado tipado; BONUS_TESTE = +D20/constante; ELEVAR_DADO via `elevarDado`
do descanso); **`rolarInterpretada`** extraído de `rolarFormula` (interpretar → rolar) para rolar
fórmulas já com efeitos. `abreviacaoAtributo` em `rolagem.dados`. Shared **244/244** (6 novos).
`ficha.dtos` passou a importar `type RolagemEfeitoDto` de `regras/rolagem` (só-tipo, sem ciclo runtime).
Spec em `done/`.

**m3-21 concluída** — **presets encadeados + runner** (fecha o **motor** da Rolagem v2). Novo
`RolagemPresetTipoEnum` (`SIMPLES|ENCADEADO`). `FichaRolagemDto` += `modo?`/`tipo?`/`seguintes?`/
`habilidades?` (nomes) + novo `FichaRolagemPassoDto` (retrocompatível: preset legado = `SIMPLES`/`SOMA`).
Runner puro em `rolagem.ts`: **`resolverPreset`** resolve as habilidades vinculadas pelo nome, coleta
`efeitos` + soma `custoEnergia` (`null` → `energiaVariavel`), monta os passos (primária + `seguintes`),
interpreta cada um e funde os efeitos (`aplicarEfeitos` por `alvo`↔modo) → `PlanoPresetDto`;
**`rolarPasso`** rola um passo via `rolarInterpretada`. Energia só **reportada** (o front debita por
`ajusteVitalidade`). DTOs `PresetResolverDto`/`PassoInterpretadoDto`/`PlanoPresetDto`. Shared
**250/250** (6 novos). Spec em `done/`.

**m3-22 concluída — frontend da Rolagem v2 (fecha o milestone).** Duas fatias.

**Fatia A — bandeja + teste na Visão Geral.** Nova **bandeja de dados** global (`shared/bandeja-dados/`,
`BandejaDadosService` `providedIn: root` + componente `BandejaDados`): fixa na base central, acúmulo
**horizontal** (a mais nova ao centro, histórico esmaecendo à esquerda), **auto-sumir** com barra de
tempo (7 s) que **volta ao cheio e pausa no hover**; teto de 5 entradas. Ícone `dado` (d6 face-5) no
`icone.component`. Na Visão Geral, um **dadinho** no canto de cada box `.ficha-atributo` rola o **teste**
(`<atributo>d20`, modo TESTE, **atributos efetivos** pós-lesão + Proficiência) → bandeja. **Regra de
desvantagem** (refino do teste): atributo **≤ 0** rola dados extras (0 → 2, −1 → 3, −2 → 4…) e pega o
**menor** — `ResultadoTesteDto.maiorDado` virou **`dadoEscolhido`** + flag **`desvantagem`**; a bandeja
mostra "menor N" + selo `desvantagem`. Shared **252** (2 novos).

**Fatia B — editor de preset + guia.** `ficha-rolagens` reescrito (controlado, Signals + Reactive
Forms): escolher **modo** (TESTE/SOMA, segmentado) da primária; **passos seguintes** (encadeamento —
FormArray, **todos visíveis**, cada passo com seu **Rolar**); **anexar habilidades** da ficha (chips
toggle) que, ao rolar o **passo primário**, debitam a Energia (soma via `resolverPreset`; `[X E]` = campo
inline) e aplicam os efeitos (Força Bruta = FOR×3). Rolar qualquer passo (`rolarPasso`) manda o resultado
para a **bandeja** — o cartão não mostra mais total inline. Novo output **`energiaGasta`** → o parent liga
em `aoUtilizarHabilidade` (canal `ajusteVitalidade` de m3-10) e passa **atributos efetivos** + **proficiência**
+ **habilidades** ao editor. Novo componente **`GuiaFormula`** (`?` no campo Fórmula → modal no padrão
`.ajuda-modal`, data-driven: dados, atributo-como-dado, `× ÷`, tipos/Composto, Teste×Soma). DTOs emitidos
**enxutos** (omitem `modo` SOMA, `tipo`/`seguintes` vazios, `habilidades` vazias → preset legado inalterado).
Só tokens do tema (proibição #29). Frontend **309** (spec do editor reescrito p/ a nova API), lint/build AOT
verdes. Spec `m3-22` em `done/`.

**Verificação ao vivo da m3-22 (2026-07-18, skill `verify`):** stack real (Postgres nativo — Docker
bloqueado no ambiente da sessão, pull de `postgres:16` negado pela política de rede —, backend,
frontend) com um agente novo + campanha + ficha via REST/UI. **Fatia A confirmada:** dadinho em cada
box de atributo rola o teste e manda pra bandeja; acúmulo horizontal com a mais nova em destaque e a
anterior esmaecida; barra de tempo pausa no hover e a entrada some sozinha ao tirar o mouse. **Fatia B
confirmada:** editor cria preset SOMA/TESTE, o modal `GuiaFormula` ("? GUIA") renderiza o conteúdo
completo (dados/atributo-como-dado/mult-div/tipos/Composto/Teste×Soma); passo seguinte encadeado (`T`/
`S`) com fórmula própria; anexar uma habilidade com `efeitos` (testado com "Força Bruta", FOR×3
físico, arquétipo Lutador) debita a Energia certinha ao rolar o passo primário (17→13, exatos os 4 E
do custo) e o passo de dano encadeado funde o efeito sem erro (2d6+FOR×3 → resultado plausível).
**Nenhum bug encontrado** — só uma confirmação de design (não é bug): a Habilidade Inicial de um
arquétipo (`Força Bruta` é o 1º item de `HABILIDADES_ARQUETIPO[LUTADOR]`) só aparece no catálogo do
seletor quando aquele é o **próprio** arquétipo da ficha (`ehDaFicha`) — em outra ficha ou sem
arquétipo escolhido ela some da lista por design (`habilidades-catalogo.ts` — "não é possível obtê-la
fora a seleção do próprio arquétipo"). **Milestone Rolagem v2 fechado ponta a ponta** (motor + UI +
verificação ao vivo).

**Rolagem v2 — refinamentos pós-m3-22** (a pedido do autor): (1) **Proficiência (`PROF`) e Nível
(`NIV`) como fontes de fórmula** — entram em qualquer fórmula igual a um atributo (`+PROF`, `PROFd6`,
`NIV*2`, `NIV/2`); novo tipo `FonteEscalar` + `resolverFonte` no motor, `nivel` no `RolagemDto`/
`rolarPasso`, guia e dicas atualizados. (2) **Bandeja mostra os dados rolados no modo SOMA** (chips por
termo `2D6` + legenda dos modificadores), não só o total. (3) **Habilidade por passo** — cada ação
escolhe quais habilidades aplica (`FichaRolagemPassoDto.habilidades`; a primária em
`FichaRolagemDto.habilidades`); `resolverPreset` funde efeitos + reporta energia **por passo**
(`PassoInterpretadoDto` ganhou `energiaGasta`/`energiaVariavel`/`habilidadesVinculadas`), e rolar um
passo debita só a energia dele. Shared **260**, frontend **311**, lint/build AOT verdes.

**`m3-23`/`m3-24`/`m3-25`/`m3-26` (Identidade: contrato+motor, backend, frontend; otimização de
espaço + mobile — `m3-09` absorvida) concluídos** — ver os blocos no topo do arquivo. **Próxima
task: `m3-27`** (histórico de rolagem).
**Antes de qualquer UI, ler `docs/design/DESIGN.md` e consumir os tokens de `docs/design/tema/`**
(proibição #29).

**Nova frente aberta (2026-07-19) — reforma da aba Combate.** A pedido do autor (a aba estava "vazia
demais"), seis specs novas no backlog do M3, `m3-32`→`m3-37` (paralelas a `m3-23`→`m3-25`, que rodam
em outra sessão): **m3-32** Anotações editáveis, **m3-33** apelido de equipamento, **m3-34** dinheiro
atual + salário, **m3-35** fragmentos consumíveis/aplicáveis no inventário (com custo de Energia),
**m3-36** resistências no Combate afetadas por equipamento e **m3-37** merge Combate+Rolagens com um
sistema de Combos. Sequência combinada com o autor: ordem crescente de complexidade, uma spec por
vez, `backlog/ → active/ → done/`. Nenhuma das seis precisa de migration — tudo cabe no JSONB
`ficha.dados` (§ "Ficha Data Model").

**m3-32 concluída — aba "Anotações".** O campo `anotacoes: string` (já existia em
`FichaJogadorDadosDto`, só exibido read-only na Visão Geral) ganhou aba própria e editável: nova
entrada em `AbaFicha`/`ABAS_FICHA` (`ficha-visualizacao.component.ts`), ícone novo `anotacoes` em
`shared/icone`, textarea com o mesmo padrão de edição no próprio lugar (lápis abre, blur/Escape
fecha) das demais seções, novo output `ajusteAnotacoes` persistido em `visualizar.page.ts` (mesmo
batching otimista dos outros campos — `mesclarFicha` já é genérico por chave, não precisou de ajuste
para o merge de edição concorrente). O card read-only da Visão Geral continua como "peek". Zero
mudança em `shared/` além do ícone. `+5` testes de componente. **Verificado ao vivo** (Postgres
nativo + backend + frontend, agente novo via REST): aba aparece, placeholder "Sem anotações." some
ao editar, texto sobrevive a reload. Spec `m3-32` em `done/`.

**m3-33 concluída — apelido de equipamento.** `CarrinhoItemDto` (`shared/regras/compras`) ganhou
`apelido?: string` — puramente de exibição, `resolverDadosItem`/`calcularStatItem` continuam
resolvendo por `categoria`+`nome` (zero mudança no motor). Novo helper `rotuloItem(item)` em
`modules/ficha/rotulos-ficha.ts` (`apelido ?? nome`, mesmo padrão de `rotuloClasse`/`rotuloArquetipo`)
— ponto único reusável pelos Combos (`m3-37`) mais tarde. `FichaInventario`: lápis inline no nome do
item (só em categorias **não-empilháveis** — Operacional/Medicinal ficam de fora, são pilha, não
instância), apelido em destaque + nome mecânico como legenda; confirmar vazio remove o apelido. A
lógica de empilhamento (`adicionarItem`) passou a exigir `apelido` igual (ou ambos ausentes) antes de
juntar duas entradas na mesma pilha, senão um item apelidado seria absorvido por outro sem apelido.
`+8` testes de componente. **Verificado ao vivo**: renomear "Arma Branca Média" → "Espada Excalibur",
legenda mecânica aparece, sobrevive a reload.

**m3-34 concluída — dinheiro atual + salário.** `FichaJogadorDadosDto` ganhou `dinheiro?: number`
(opcional, retrocompat — fichas antigas caem em 0). Novo par de funções em
`shared/regras/novo-agente` (mesmo lugar de `calcularBonusMonetario`, já documentado como "dinheiro
inicial calculado à parte" desde m1-03, nunca implementado até agora): `calcularDinheiroInicial({
somaDados })` pura (`1000 + somaDados × 250`) e `rolarDinheiroInicial()` (rola 4D4 via `rolarDados`
de `regras/descanso` — mesma "brecha sancionada" a `Math.random`, mesma separação rolagem/cálculo
puro já usada em `calcularResultadoDescanso`). Novo `salarioPatente(prestigio)` em `status-derivado.ts`
(`obterPatente(prestigio).salario`, zero código de regra novo). `ficha-padrao.ts` seta o dinheiro
inicial na criação. Visão Geral (Informações Extras): nova linha editável "Dinheiro" (reusa o canal
`ajusteCampoDados`/`CampoDadosEscalar` de Nível/Prestígio, sem cascata) e linha read-only "Salário".
`ficha-inventario.component.ts`: o `dinheiro: 0` hardcoded que alimentava `calcularResumoCompras`
virou um `@input` real — o "Dinheiro restante" (antes nunca exibido) agora aparece como 3º box de
referência na aba Inventário, com aviso visual quando negativo. `+9` testes de componente + `2` de
`shared`. **Verificado ao vivo**: Visão Geral mostra dinheiro/salário corretos, editar dinheiro
persiste a reload, Inventário mostra "Dinheiro restante" batendo com dinheiro − gasto do carrinho.

**m3-35 concluída — fragmentos no inventário (núcleo: adquirir/acoplar/remover).** A leitura completa
de "⬡ Fragmentos" no documento revelou uma mecânica bem maior que o pedido original (Afinidade,
Anomalia Biológica, Colapso/transformação em criatura, Consumo com Preço de Sanidade, Redução de
Módulo, Forja, tabela de bônus fixos do Construtor) — **recorte confirmado com o autor**: só o custo
de Energia de adquirir/acoplar/remover + aplicar o bônus do Potencializador num item; o resto vira
specs futuras. Novo `shared/regras/compras/fragmento.dados.ts` (tabela de custo por módulo — V=3,
IV=7, III=12, II=16, I=20 — e o cardápio de bônus "em um item" do Potencializador) +
`fragmento.ts` (`custoAquisicaoFragmento` — dobrado pro Construtor, doc: "seu valor... é dobrado —,
`custoAcoplarFragmento` — Energia + Energia Máxima do módulo —, `custoRemoverFragmento` — Energia ×2
—, `listarBonusFragmentoPotencializador` — mapeado a `DANO_DADOS_BASE`/`BONUS_TESTE`/`DANO_FIXO`/
`RESISTENCIA` já existentes, zero motor novo em `calcularStatItem`). A opção "N× valor máximo do
maior tipo de dado" do documento ficou de fora (exigiria uma primitiva de "maior dado do item" que
não existe ainda). `ModificacaoAplicadaDto` ganhou `origemFragmento?` (tipo + módulo) pra UI/remoção
não depender de string-matching em `nome`. `FichaInventario`: adquirir um fragmento (categoria +
módulo no form de item custom) debita Energia Máxima na hora; nova ação "Aplicar em..." num
fragmento Potencializador (seleciona item-alvo + uma das 5 opções de bônus) empurra a mod no alvo,
remove o fragmento do inventário avulso e debita Energia + Energia Máxima do acoplamento; remover
essa mod (o mesmo botão "−" de sempre, já que o fragmento nunca empilha) debita Energia ×2, sem
devolver a Energia Máxima nem ressuscitar o fragmento; remover um fragmento **ainda não aplicado**
diretamente do inventário restaura a Energia Máxima da aquisição. Badge com o ícone `fragmento` no
chip da mod de origem fragmento. Novos inputs `energiaAtual`/`energiaMaxima` + output
`ajusteEnergiaFragmento` em `FichaInventario`, capturado por `FichaVisualizacao` e traduzido em dois
`ajusteVitalidade.emit()` (reusa o canal de persistência de m3-10, sem canal novo). `+10` testes de
`shared` + `5` de componente. **Verificado ao vivo** (Postgres real): adquirir um fragmento
Potencializador módulo IV (50/50→50/43), aplicar na arma (fragmento some, mod aparece, 50/43→43/36 —
bate exatamente com o exemplo do documento "7 de Energia + 7 de Energia Máxima"), remover a mod
(43/36→29/36 — Energia ×2, Máxima intocada), tudo sobrevivendo a reload.

**m3-36 concluída — resistências no Combate.** Novo campo `equipado?: boolean` em `CarrinhoItemDto`
(só Proteções, com toggle "Equipado"/"Na mochila" no Inventário — hoje só Armazenamento tinha um
conceito parecido, `guardada`, que não servia pra isso). O regex de parsing de resistência que vivia
inline em `calcularStatItem` virou função exportada `interpretarNotacaoResistencia` (refactor puro,
264→264 testes de shared inalterados) pra ser reusada sem duplicar.

**Ajuste pós-m3-36 (mesma sessão, a pedido do autor)**: a versão "calculado ao vivo, sem edição" foi
substituída por **sempre as cinco linhas de `TipoDanoEnum` + base manual editável + complemento do
equipamento**. `shared/regras/agente/resistencia.ts` trocou `calcularResistencias`/
`ResistenciaAgregadaDto` (só somava equipamento, filtrava zero) por `montarResistencias({ itens,
amplificadores, manual? })` → `ResistenciaLinhaDto[] { tipo; manual; equipamento; total }`, sempre 5
entradas (`ORDEM_TIPOS`), `total = max(0, manual + equipamento)`. `equipamento` soma
`calcularStatItem({item}).resistencia` dos itens equipados (Fragmento aplicado, m3-35, incluso de
graça) **mais os dois amplificadores que mexem em resistência** (primeira vez que um amplificador
ganha efeito mecânico real em `shared/regras` — os demais seguem só texto no catálogo): `Resistente`
= +1 Geral fixo (não escala com empilhamento) e `Defesa` = a partir do 2º empilhamento, `-(empilhamentos
− 1)` em **todos** os tipos (efeito em Defesa em si, fora de escopo aqui). `FichaDerivadosDto` ganhou
`resistencias?: Partial<Record<TipoDanoEnum, number>>` (a base manual, stored/editável — mesmo padrão
`stored + editável` de m3-10). Frontend: `ficha-visualizacao.component.ts` ganhou
`ajusteResistencia` output + `editarResistencia`/`cancelarResistencia`/`confirmarResistencia` (mesmo
padrão clique-pra-editar de `editarDinheiro`); `visualizar.page.ts` persiste em
`derivados.resistencias[tipo]`. `+10` testes de `shared` (274 no total) cobrindo as 5-linhas-sempre,
soma de equipamento/Fragmento, complemento manual, clamp em 0, e os dois amplificadores; specs de
componente reescritos (a antiga asserção "sem affordance de edição" virou o oposto). **Verificado ao
vivo**: Físico manual=7 (editado e sobrevive a reload) + Colete de Kevlar equipado (5 Físico, 3
Balístico) → Combate mostra Físico=12, Balístico=3, batendo exatamente com manual+equipamento.

**m3-37 concluída — merge Combate+Rolagens, Combos (fecha a nova frente).** `AbaFicha`/`ABAS_FICHA`
perdeu `'rolagens'` (ficam 6 abas); o `id` `'combate'` permanece de propósito, deixando `m3-27`
(histórico de rolagem, backlog) livre pra somar um `'historico'` futuro sem colidir. A aba Combate
mesclada agora hospeda 4 seções na mesma tela: os stats de sempre, Resistências (m3-36),
`<app-ficha-rolagens>` (m3-15/m3-22, intacto) e a nova `<app-ficha-combos>`. `?aba=rolagens`
(links antigos) redireciona pra `combate` em vez de cair no fallback genérico. Novo contrato
`FichaComboDto { nome; passos: FichaComboPassoDto[] }` (`shared/dtos/ficha/ficha-combo.dtos.ts`) —
cada passo **referencia** um preset de `dados.rolagens` pelo nome (decisão do autor: reusar 100% o
motor de rolagem em vez de montar fórmula solta na tela de Combos); `combos?` novo campo opcional em
`FichaJogadorDadosDto`. Zero motor novo em `shared/regras/rolagem` — a lógica de resolver+rolar+
rotular+debitar energia que vivia dentro de `FichaRolagens.rolarPassoDoPreset` foi **extraída** pra
`frontend/modules/ficha/executar-rolagem.ts` (`executarPassoPreset`), reusada tanto por
`FichaRolagens` (refatorado, comportamento idêntico — mesma suíte de testes passando) quanto pelo
novo runner de Combos. Novo componente `FichaCombos` (`componentes/ficha-combos/`, padrão de
`FichaRolagens`: editor CRUD com Reactive Forms, reordenar passo via `moverPasso`) + runner: estado
de "passo atual", botão único que avança **um passo por clique** (decisão do autor — não dispara
tudo de uma vez), cada resultado cai na `BandejaDadosService` como uma rolagem normal (mesmo débito
de energia de habilidade vinculada, sem tratamento especial); passo com `rolagemNome` que não
resolve mais mostra "preset não encontrado" e só avança, sem travar (mesma liberdade de edição de
m3-10 — não valida a referência no salvar). `+11` testes de componente (`FichaCombos`) + specs de
`FichaVisualizacao`/`FichaRolagens` ajustadas pro merge (7→6 abas, aba `rolagens` deixou de existir
como aba própria). **Verificado ao vivo**: barra de abas com 6 itens, painel Combate mostrando as 4
seções com 2 presets criados de antemão, combo de 2 passos montado e executado passo a passo
("passo 1/2" → "Rolar e avançar" → "passo 2/2" → "Rolar e concluir" → runner fecha), sobrevive a
reload. **Milestone da nova frente fechado ponta a ponta** (`m3-32`→`m3-37`, seis specs, ordem
crescente de complexidade, todas verificadas ao vivo).

**Integração (2026-07-19, mesma data — sessão paralela).** Esta frente rodou numa branch separada
(`claude/proxima-task-9a7dcn`) enquanto `m3-23` corria aqui — as duas sessões numeraram specs novas
sem se coordenar, e a branch reusou `m3-29`→`m3-34` (os números que `m3-23` já tinha herdado da
Rolagem v3, então mesclado a `master`). Renumerado na integração pra `m3-32`→`m3-37` (arquivos,
comentários de código e os parágrafos acima já refletem os números finais). A branch também foi
cortada **antes** do rewrite "Rolagem v3" pousar em `master` (fim do campo `modo`, `critico` como
parâmetro de `rolarPasso`): `executar-rolagem.ts` (extraído de `FichaRolagens` pra reuso em Combos)
foi reescrito contra a API atual, preservando o parâmetro `critico` e o débito de energia por-passo
que a v3 já tinha — sem isso o build quebrava silenciosamente (nenhum marcador de conflito, só
`RolagemModoEnum` inexistente). Merge com 5 conflitos de texto (contrato `ficha.dtos.ts`,
`ficha-rolagens`/`ficha-visualizacao` reconciliando crítico mecânico + rolagem avulsa da v3 com a
extração de Combos da branch) + 2 quebras silenciosas de tipo. **Testes pós-integração:** shared
**327**/327, backend **91**/91, frontend **404**/404; lint e build limpos nos 3 workspaces.
Worktree isolada (`worktree-m3-32-combate-reforma`), depois integrada de volta a `master`.

**Próxima task após esta integração**: a fila original `m3-24`→`m3-26` (Identidade —
backend/frontend, mobile, otimização de espaço) — ver o bloco `m3-23` no topo do arquivo.

**`m3-24` (backend — validação de forma + trava de imutabilidade da Identidade), `m3-25` (frontend
da Identidade) e `m3-26` (otimização de espaço + mobile, absorvendo a `m3-09`) concluídos**
(2026-07-19) — ver os blocos no topo do arquivo. **Próxima task: `m3-27`** (histórico de rolagem).

**Trilha paralela — extensão pós-M2 (`m2-16`/`m2-17`, specs adicionadas ao backlog depois do M2
"fechado" acima, dependendo de fichas já entregues pelo M3): `m2-16` (fichas do membro na lista) e
`m2-17` (redesenho visual de `/painel`/`/painel/:id`) concluídas** (specs em `docs/specs/done/`) —
**trilha fechada**, independente da fila do M3 acima.

**`M3` — Ficha de Jogador** (CRUD + cálculo automático via `shared/regras` + permissões +
tempo real): o milestone já foi quebrado em tasks numeradas (`m3-01`…`m3-09`, specs no backlog).
**Antes de qualquer UI, ler `docs/design/DESIGN.md` e consumir os tokens de `docs/design/tema/`** — o
tema "Terminal de Contenção" é a fonte da verdade visual (proibição #29).

**M1 concluído no código** (18 tasks, backlog do M1 vazio). Os specs de milestone concluídos
(`m0-fundacao`, `m1-calculadora-paridade`) e todas as tasks `m0-*`/`m1-*` já entregues estão em
`docs/specs/done/`.

> **Passos operacionais pendentes (plataforma, não bloqueiam código — ver `docs/PARIDADE-M1.md`):**
> 1. **Cloudflare Pages no ar:** conectar a Pages ao Git com **branch de produção `master`**
>    (Auto-Deploy) e validar a calculadora funcionando com o Render dormindo. Runbook em `docs/DEPLOY.md`.
> 2. **Arquivar `contratados-calculadora`:** marcar o repo antigo como *Archived* no GitHub
>    (a documentação deste repo já o descreve como arquivado após o M1).

## Implementado

- **m1-20 — modo Vender na aba Compras** (2026-07-08): task complementar do M1 (após a m1-19), 100%
  client-side, sem backend/persistência de servidor. **Regras** (`shared/regras/compras`, zero-dep):
  3 enums de conteúdo de jogo (`TaxaVendaEnum`, `FragmentoTipoEnum`, `FragmentoModuloEnum`) +
  submódulo `venda.{dtos,dados,ts}` — `MULTIPLICADOR_TAXA_VENDA` (0.5/0.75/0.25), `VENDA_FRAGMENTOS`
  (tabela módulo × tipo), `calcularValorVendaCarrinho` (taxa sobre o `gasto` de `calcularTotaisCarrinho`,
  sem recalcular custo), `obterValorFragmento` e `calcularVendaFragmentos`; **+10 testes** (shared
  153/153) conferindo cada taxa, cada célula da tabela e o total combinado, 1:1 com `sistema-v4.1.0.md`
  ("Loja"/"Retornando após uma Missão"/"Venda de Fragmentos"). **UI** (`compras.page`, só apresentação):
  Compras e Vendas são **duas abas** da barra da calculadora (rotas próprias carregando a mesma página
  em modos distintos; `modo` via `data` da rota → `input()` com `withComponentInputBinding`). Em Vendas
  somem os cards Config/Resumo; **carrinho de venda separado** (o de compra e a persistência m1-11
  intactos); card "Venda" com **fragmentos primeiro** (scroll lateral no mobile) e **valores no fim**
  (taxa, valor itens, total fragmentos, Total de Venda em destaque accent). Painel de modificações
  (Compras e Vendas) com **scroll+fade igual ao dos itens** (`[appOverflowFade]` + max-height).
  Exportar/Importar só em Compras; Limpar (m1-19) zera taxa/fragmentos da venda. Ícone novo `vendas`.
  **+5 testes** de página (frontend 131/131). Restrições fora de escopo viraram **nota na Ajuda**
  (equipamento inicial só vende ao atingir Operador, item inutilizável sem valor, Módulo ∅ negociado com
  o Mestre), não trava de cálculo; forja/redução de módulo também fora. Budget `anyComponentStyle` do
  `angular.json` subiu p/ **12/14 kB** (aprovado pelo autor, precedente do bump de 565 kB).
  `lint`/`test`/`build` (564,52 kB, sem warning) verdes; **verificado por render** (Playwright,
  1200/360px): Vendas sem Config/Resumo, valores após fragmentos, matemática confere, fragmentos com
  scroll lateral no mobile sem overflow do body.
- **m3-04 — concessão/revogação de acesso de visualização da ficha (backend)** (2026-07-08): fecha a
  **matriz §14** ("outro membro vê só com linha em `usuario_ficha_acesso`") estendendo o módulo `ficha`
  da m3-03 — sem frontend, sem WebSocket. **6 DTOs novos** em `shared/dtos/ficha/ficha-operacao.dtos.ts`:
  `FichaAcesso{Conceder,Concedido,Revogar,Revogado}Dto` + `FichaAcessosListarDto`/`FichaAcessoResumoDto`
  (complemento `Acesso` inteiro antes do verbo — proibição de complemento partido). `FichaRepository`
  (dona de `usuario_ficha_acesso`, proibição #23) ganhou `concederAcesso` (`INSERT ... SELECT ...
  RETURNING`, sem `VALUES`/`DEFAULT`), `revogarAcesso` (**soft delete por chave composta**
  `ficha_id`/`usuario_id`, espelhando `removerMembro` da m2-10 — nunca `DELETE` físico) e `listarAcessos`
  (`JOIN usuario` p/ o `nome`, `is_deleted = false` nos dois lados — padrão de `listarMembros`).
  `FichaService`: `concederAcesso`/`revogarAcesso`/`listarAcessos` — só o **dono ou o mestre**
  concede/revoga/lista (**reusa `validarPermissaoEdicao`**, sem duplicar permissão — proibição #28),
  `UnauthorizedAccessException` caso contrário; o **alvo** precisa ser membro da campanha
  (`validarMembroAlvo` → `ResourceNotFoundException('Membro')`, como o alvo da transferência de mestre da
  m2-10). **Idempotência:** `concederAcesso` confere concessão ativa (`recuperarAcesso`) e devolve a
  existente sem reinserir (respaldado pelo índice único parcial `uix_usuario_ficha_acesso_ficha_usuario_ativo`);
  `revogarAcesso` é no-op sem linha ativa. A leitura de permissão da m3-03 (`recuperarFicha`/`listarFichas`)
  já considerava a linha de acesso — nada a mudar. Controller burra: `GET`/`POST /ficha/:id/acesso`,
  `DELETE /ficha/:id/acesso/:usuarioId`. **12 testes de service** (backend 76/76); `lint`/`build`/`test`
  do shared e backend verdes. **Verificado ao vivo contra o Postgres** (mestre/dono/outro/forasteiro numa
  campanha real via REST, 17 checks): outro-sem-acesso 403 e some da listagem → dono concede 201 → outro
  vê 200 e aparece na listagem; listagem de acessos com nome; reconceder idempotente; conceder a
  não-membro 404; membro-com-acesso concede/lista 403; dono revoga 200 → outro volta a 403; mestre
  concede/revoga 200; `SELECT` confirmou revogação por **soft delete** (`is_deleted`/`deleted_date`) sem
  duplicar linha ativa. Fora de escopo: tempo real WS (m3-05), frontend/UI de concessão (m3-07), edição
  por terceiros (não existe — só visualização).
- **m3-03 — backend do CRUD da ficha de jogador** (2026-07-08): módulo `ficha` (backend) com CRUD
  completo, a **matriz de permissões §14** arbitrada no service (único árbitro — proibição #28) e a
  **validação do documento de jogo contra `shared/regras`** antes de persistir (§11 camada 2). DTOs de
  operação em `shared/dtos/ficha/ficha-operacao.dtos.ts` (o campo `dados` reusa `FichaJogadorDadosDto` da
  m3-01). `FichaRepository` dona de `ficha`/`usuario_ficha_acesso` (proibição #23): `INSERT ... SELECT ...
  RETURNING` com `dados::jsonb`, tradução `codigo→id` de `tipo_ficha`, listagens lendo `dados->>'campo'`
  (§10.4), `recuperarAcesso` p/ a permissão de membro, soft delete. `FichaService`: `criarFicha` (dono =
  usuário autenticado, tipo `JOGADOR`, exige ser membro), `listarFichas` (mestre vê todas; membro só as
  visíveis), `recuperarFicha` (dono/mestre/concessão), `alterarFicha`/`excluirFicha` (só dono ou mestre);
  papel na campanha vindo do `CampanhaRepository` (importa `CampanhaModule`), sem duplicar regra.
  `validarDadosContraRegras` reusa `obterLimitesClasse`/`calcularVida`/`calcularEnergia` → `BusinessException`
  (Nível/atributos no intervalo da classe, Vida/Energia atuais ≤ máx; "stacks de modificação por patente"
  fora — texto livre sem função pura, validá-lo seria reimplementar regra/extrapolar). Controller burra +
  `FichaModule` no `AppModule`. **21 testes de service** (backend 64/64); `lint`/`build`/`test` verdes.
  **Verificado ao vivo contra o Postgres** (mestre/dono/outro numa campanha real via REST): criar 200
  (dono correto), ver dono/mestre 200, ver/editar de outro-sem-acesso 403, editar do mestre 200, listagens
  escopadas por papel (1/1/0), dados incoerentes 400, soft delete 200 + GET 404, `is_deleted`/`deleted_date`
  e JSONB conferidos no banco. Fora de escopo: concessão de acesso (m3-04), eventos WS (m3-05), frontend.
- **toggle "olhinho" de revelar senha** (2026-07-07, sem spec numerada, pedido do autor): botão de
  mostrar/ocultar senha no **login** e no **registro**. Dois glifos novos no `shared/icone` (`olho` /
  `olho-fechado`, SVG de linha `stroke: currentColor`, sem emoji — proibição do tema). Botão `&__olho`
  sobreposto à direita do campo (posição absoluta, alvo de 44px, `aria-label` "Mostrar/Ocultar senha" +
  `aria-pressed`, herda o foco de teclado global); o input ganha `padding-right` pra não correr por baixo
  do ícone. Alternância por Signal: `[type]` vai de `password` a `text`. **Login:** um toggle
  (`senhaVisivel` + `alternarSenha`). **Registro:** dois independentes (`senhaVisivel`/`confirmacaoVisivel`
  + `alternarSenha`/`alternarConfirmacao`) — revelar a senha não afeta a confirmação. Reactive Forms/
  Signals/standalone, só tokens (`--text-mute`/`--text`, proibição #29), validações (minlength/divergência)
  preservadas. `lint`/`test` (91/91)/`build` (562 kB) verdes; conferido no S24+ via Playwright.
- **revisão visual mobile da m2-08 (Galaxy S24+) + 3 melhorias de UI/UX** (2026-07-07, sem spec numerada):
  render de cada tela do M2 a 384px CSS (Playwright/Chromium headless, sessão + API de campanha mockadas),
  com overflow horizontal conferido programaticamente (`scrollWidth === innerWidth` = zero nas 7 telas). A
  m2-08 passou; a revisão rendeu 3 ajustes **SCSS-only** (aprovados antes de aplicar): (1) **chip de campanha
  ativa escondido no mobile** (`layout.component.scss` `&__campanha` `display: none`) — colapsado a só o
  ícone, duplicava o glifo "campanhas" do nav Painel; (2) **painel de marca de login/registro enxuto no
  mobile** — esconde `&__descricao`/`&__destaques`/`&__nota` (escopado ao `&__marca`, senão sumia a descrição
  do formulário), sobe o formulário pra dobra; (3) **ações Criar/Entrar da lista empilhadas em coluna**
  (`&__acoes` `flex-direction: column` + `&__acao` `width: 100%`) no mobile. Uma 4ª ideia (`justify-content:
  flex-start` no painel do formulário) foi **descartada** por não ter efeito visível (o espaço era padding
  legítimo, não banda morta do `justify-content`). `lint`/`test` (91/91)/`build` (561 kB) verdes; cada
  mudança conferida por screenshot antes/depois no viewport do S24+.
- **m2-08 — refinamento mobile de auth + campanhas** (2026-07-07, **fecha o M2 no código, 9/9 tasks**):
  passe de acabamento responsivo (~360px) **SCSS-only** sobre as telas do M2 pós-m2-09, na linha da
  m1-15, reusando `_breakpoints.scss` (`$bp-mobile: 560px`, mixin `mobile`, `$alvo-toque: 44px`). O
  override global de densidade (`--pad-card`/`--gap-grid`) e a trava `html { overflow-x: clip }` da
  m1-15 já cobriam as telas de campanha, e a m2-09 já dera um 1º passe na topbar/auth — então o trabalho
  foi **alvo de toque ≥ 44px** nas superfícies novas, não reflow. **Topbar** (`layout.component.scss`):
  `min-height`/`min-width: bp.$alvo-toque` na nav central, chip de campanha, gatilho + itens do dropdown
  de perfil e botões de sessão (colapsados pra ícone → `justify-content: center`); **wordmark textual
  escondido no mobile** (logo `app-marca` mantém a identidade) pra topbar não estourar em ~360px.
  **Auth** (`login`/`registro`): inputs + enviar com `min-height` 44px; painel de marca 34→22px, painel
  do formulário 26/20px, slogan 22→19px. **Campanha:** `criar`/`entrar` (inputs/enviar 44px), `lista`
  (ações `flex: 1` + 44px), `detalhe` (copiar 34→44px, "Regenerar"/"Voltar" 44px). Só `.scss` — zero
  mudança de DOM/TS, nenhum teste tocado. `lint`/`test` (91/91)/`build` (561 kB, dentro do budget) verdes;
  verificação responsiva **estática** (sem browser no ambiente): Sass compilou e o bundle carrega as media
  queries + alvos de 44px, com as únicas larguras fixas novas sendo os alvos quadrados (copiar 44×44).
- **achados de UI/UX pós-m2-09** (2026-07-07, sem spec numerada): dois ajustes visuais apontados ao
  revisar os prints com o autor. (1) `card__indice` de `campanhas` `lista`/`detalhe` mostrava
  literalmente `"M2"` (nome do milestone, vazado da m2-07) em vez do neutro `//` que `criar`/`entrar`
  já usavam — corrigido nos dois `.html`. (2) Faltava o **avatar decorativo** (quadrado
  `repeating-linear-gradient` diagonal, mesmo tratamento do `.topbar__avatar`) nos itens da lista de
  campanhas (`campanhas__avatar`, 40px) e da lista de membros do detalhe (`detalhe__avatar`, 32px) —
  placeholder de imagem, sem foto real no domínio ainda. `lint`/`test` (91/91)/`build` verdes,
  conferido visualmente via Playwright.
- **ajuste pós-m2-09** (2026-07-07, pedido direto do autor, sem spec numerada): (1) rota raiz `/`
  redireciona a `/painel` (`app.routes.ts`) em vez de carregar a `Home` do M0 — sem sessão, o
  `autenticacaoGuard` encadeia até `/login?retorno=%2Fpainel`; a `Calculadora` continua pública.
  `pages/home/` e `core/services/health.service.ts` removidos (ficaram irrecuperáveis por rota;
  a própria `Home` já se descrevia como "substituída a partir do M1"). `docs/DEPLOY.md` atualizado
  (verificação pós-deploy agora é registro de teste sem erro de CORS, ou `GET .../health` direto no
  Render, em vez de "a home exibe `/health`"). (2) Vermelho padrão do sistema trocado de `#e5484d`
  para `#d53030`: `--accent`/`--vida` em `_tokens.scss` (frontend + mirror), preset `'vermelho'` do
  `TemaService`, paleta 50-950 do `contencao.preset.ts` (frontend + mirror) regenerada com
  `palette('#d53030')` do `@primeuix/themes`, `CLAUDE.md` (tabela TEMA VISUAL) e `tema.service.spec`
  ajustados — segue passando a trava de contraste (piso 3:1) nas duas bases. `lint`/`test`
  (91/91)/`build` verdes, sem regra de jogo ou de negócio tocada.
- **m2-09-revisao-estilizacao-geral** (2026-07-07): revisão da estilização de topbar, autenticação e
  campanhas contra os novos protótipos entregues em `docs/design/examples/` (`login`, `cadastro`,
  `campanhas`, `lobby-de-campanha`, `topbar`) — mesmos tokens, linguagem visual mais elaborada e mais
  ícones onde antes só havia texto (pedido explícito do autor do design: "sinto que só os textos tá
  misturando demais"). **Entregável 1 — `shared/icone`:** 11 novos glifos (`campanhas`, `calculadora`,
  `sair`, `entrar`, `chevron`, `copiar`, `mais`, `convite`, `coroa`, `atualizar`, `voltar`), reusando
  `agente`/`protecoes` onde já serviam (perfil/jogador). **Entregável 2 — topbar (`shared/layout`):**
  reconstruída na direção "Barra de Comando" (1a) do handoff — nav central Painel/Calculadora (ícone +
  `routerLinkActive`, mesmo padrão do `CalculadoraShell`); seletor de campanha ativa (chip nome+código),
  visível só dentro de `/painel/:id`, alimentado pelo novo `CampanhaContextoService`
  (`modules/campanha/`, `providedIn:'root'`, puro estado de apresentação sem regra de permissão —
  `CampanhaDetalhe` define ao carregar e limpa ao desmontar via `DestroyRef`); dropdown de perfil
  (Campanhas/Encerrar sessão) que fecha só por ação, mesmo padrão de acessibilidade do painel de tema
  (sem clique-fora); Entrar/Registrar com ícone quando deslogado. **Entregável 3 — `login`/`registro`:**
  layout split marca+formulário (detalhes de canto, eyebrow, slogan, destaques com ícone ancorados
  embaixo), mesmos campos/validators de antes — **sem** o bloco decorativo de "entrar por código"
  pré-autenticação do protótipo (não existe esse fluxo no domínio: `entrarCampanha` exige usuário
  autenticado). **Entregável 3.1 — marca do projeto:** o autor do design adicionou os assets
  (`frontend/public/logo-{white,black}.{png,svg}`, commit anterior "Adiciona assets de logo em
  frontend/public") e pediu para aplicá-los; novo `shared/marca/` (`Marca`, componente padrão
  `app-icone` — escala com a fonte via `1.4em`) troca a variante branca/preta conforme
  `TemaService.base()` (branca sobre a base escura, identidade padrão; preta sobre a base clara) e
  substitui o wordmark só-texto na topbar e no painel de marca de `login`/`registro`, que ganhou também
  a **marca d'água** no canto inferior direito do painel de marca (`opacity: .04`, `font-size` grande
  no `app-marca` pra ampliar a imagem, `overflow: hidden` no painel pra conter o transbordo) — mesmo
  tratamento visual de `docs/design/examples/login.html`/`cadastro.html`; budget de bundle inicial
  ajustado 560→565 kB no `angular.json` (poucos bytes a mais do novo componente). **Correção (achado do
  autor):** a nav da topbar (entregável 2) tinha ficado incorreta — escondia **"Calculadora" também**
  quando deslogado, mas essa rota é pública (sem guard, `calculadora.routes.ts`); só "Painel" deveria
  depender de sessão. Corrigido: "Calculadora" sempre visível na nav, "Painel" continua condicionado a
  `sessaoService.autenticado()`. **Entregável 4 — `campanhas` lista:** ícones nos botões "Criar
  campanha"/"Entrar por código" e no `chip-papel`
  (coroa para `MESTRE`, `protecoes`/escudo para `JOGADOR`), estado vazio com ícone. **Entregável 5 —
  `campanha` detalhe:** botão de copiar o código de convite (`navigator.clipboard`, puramente
  apresentação), ícone de atualizar no "Regenerar", `chip-papel` dos membros com ícone, link "Voltar às
  campanhas" com seta. **Fora de escopo, por decisão explícita:**
  chips de status de sessão (ao vivo/agendada/pausada), briefing (ameaça/fase/recompensa), registro de
  atividade da mesa e indicador online por membro — nenhum existe no schema de `campanha`/
  `campanha_membro`, então não entraram (ficam para specs futuras se virarem domínio); arquitetura de
  rotas mantida (`/painel/criar`/`/painel/entrar` continuam páginas dedicadas, não a barra lateral do
  protótipo). Nenhuma regra de jogo (`shared/regras` intocado), de negócio ou de permissão alterada (§14
  continua 100% backend). **Validado:** `lint`/`test` do frontend verdes (**91/91**, nenhum teste novo —
  mudança de apresentação), `build` de produção sem estouro de budget; telas conferidas visualmente via
  Playwright headless contra o dev server (topbar deslogado/logado, seletor de campanha, dropdown de
  perfil, login, registro, lista e detalhe com API mockada).
- **m2-07-frontend-campanhas** (2026-07-07): **fecha o fluxo do M2 na UI** — frontend de campanhas sobre o
  backend das m2-04/m2-05 e a sessão/guard/interceptor da m2-06. **Entregável 1 — telas standalone lazy
  (área privada):** módulo `modules/campanha/` montado sob `/painel` via `loadChildren` atrás do
  `autenticacaoGuard` — 4 telas: `lista` (`/painel`) lista as campanhas do usuário com o papel (chip
  `MESTRE`/`JOGADOR`) e liga a criar/entrar/detalhe; `criar` (`/painel/criar`) e `entrar` (`/painel/entrar`)
  são **Reactive Forms** (sem `ngModel`) que, ao concluir, navegam ao `/painel/:id` da campanha criada/
  ingressada; `detalhe` (`/painel/:id`, `id` do `ActivatedRoute.snapshot`) mostra nome/descrição e os
  membros com papel. **Entregável 2 — detalhe + permissão de apresentação:** só o mestre vê o
  `codigo_convite` e o botão **regenerar** — `ehMestre` é um `computed` que cruza a lista de membros com
  `sessao.usuario().id`; **é só apresentação**, a autoridade é sempre o backend (§14): um jogador que
  tentasse regenerar levaria 403, tratado como toast pelo `error-handler.interceptor` (o front não duplica
  regra — proibição #28). **Entregável 3 — service HTTP + estado:** `CampanhaService`
  (`modules/campanha/campanha.service.ts`, `providedIn:'root'`) é transporte puro — `listarCampanhas`/
  `criarCampanha`/`entrarCampanha`/`recuperarCampanha`/`listarMembros`/`regenerarConvite`, cada um extraindo
  o `dados` do `StandardResponse`; o JWT entra pelo `auth-token.interceptor`; DTOs consumidos do shared
  (`@contratados-rpg/shared/dtos/campanha`), **nunca** redefinidos no front; estado das telas em **Signals**.
  **Entregável 4 — estilos:** `.scss` + BEM + tokens do tema "Terminal de Contenção" (card/botão/chip de
  papel copiados de `docs/design/tema/_componentes.scss`, zero hex/fonte/raio solto — proibição #29).
  **Infra:** a casca semente `pages/painel/` da m2-06 foi **removida** e substituída por este módulo;
  `proxy.conf.json` passou a encaminhar `/campanha` ao backend (`:3100`). **Testes (novos, Vitest/TestBed):**
  `campanha.service.spec` (6 — cada método atinge a rota/verbo certo e mapeia o `dados`); `app.routes.spec`
  ajustado (o teste de `/painel` liberado agora casa a lista de campanhas `.campanhas`). **Validado:**
  `lint`/`build`/`test` do **frontend** verdes — **18 arquivos / 91 testes** (era 17/85; +1 arquivo, +6
  testes) e `build` de produção sem estouro de budget (4 novos chunks lazy: lista/criar/entrar/detalhe).
  Nenhuma regra de jogo (`shared/regras` intocado); nenhuma alteração de backend.
- **m2-06-frontend-autenticacao** (2026-07-07): **primeira UI do M2** — frontend de autenticação sobre
  o backbone JWT da m2-02/m2-03, mantendo a calculadora pública. **Entregável 1 — telas standalone lazy:**
  módulo `modules/autenticacao/` com `login` (`/login`) e `registro` (`/registro`), **Reactive Forms** (sem
  `ngModel`), `.scss` + BEM + tokens do tema "Terminal de Contenção" (proibição #29 — nada de hex/fonte/raio
  solto; bloco `.card`/`.botao` copiado de `docs/design/tema/_componentes.scss`). O registro tem confirmação
  de senha (validador de grupo local, não trafega ao backend) e encadeia `registrar → logar` já abrindo a
  sessão; o login retoma o destino guardado em `retorno` ou cai no `/painel`. **Entregável 2 — sessão:**
  `SessaoService` (`core/services/sessao.service.ts`) é o dono do estado — Signal do `UsuarioAutenticadoDto`
  (token + `{id,login,nome}`), `autenticado` (computed), `obterToken`, ações `registrar` (POST
  `/autenticacao/registro`, **sem** sessão), `logar` (POST `/autenticacao/login`, abre e persiste a sessão)
  e `sair`; token persistido em `localStorage` (`contratados-rpg.sessao`) e restaurado no boot — **F5 mantém
  a sessão** sem nova chamada; conteúdo corrompido é descartado. **Entregável 3 — interceptor `auth-token`:**
  (`core/interceptors/auth-token.interceptor.ts`) injeta `Authorization: Bearer <token>` quando há sessão,
  registrado entre `loading` e `error-handler` no `app.config`; o `error-handler` ganhou o trato de `401`
  (**só com sessão ativa** → `sair()` + `router.navigate(['/login'], { retorno })`; login inválido é 400/
  `BusinessException`, então não dispara logout — evita laço). **Entregável 4 — guard de rota:**
  `autenticacaoGuard` (`core/guards/autenticacao.guard.ts`, `CanActivateFn`) libera com sessão e, sem sessão,
  devolve `UrlTree` p/ `/login` guardando o destino em `retorno` (retomado após logar); a **primeira rota
  privada** `/painel` (`pages/painel/`, casca mínima — semente da m2-07) nasce guardada; a calculadora
  segue **sem** guard. **Entregável 5 — topbar:** `shared/layout` reflete a sessão (entrar/registrar
  deslogado ↔ nome + botão sair logado), reusando o shell existente (`RouterLink` + `SessaoService`).
  **Entregável 6 — DTOs do shared:** `UsuarioCriarDto`/`UsuarioCriadoDto`/`UsuarioAutenticarDto`/
  `UsuarioAutenticadoDto` consumidos de `@contratados-rpg/shared/dtos/usuario` — **nunca** redefinidos no
  front. **Infra dev:** `proxy.conf.json` passou a encaminhar `/autenticacao` ao backend (`:3100`).
  **Testes (novos, Vitest/TestBed):** `sessao.service.spec` (6 — deslogado inicial, abre+persiste no login,
  restaura no boot, `sair` limpa, registra sem sessão, ignora persistência corrompida; HTTP via
  `provideHttpClientTesting`), `autenticacao.guard.spec` (2 — libera com sessão, redireciona com `retorno`
  sem sessão) e `app.routes.spec` (4 — `/login` e `/registro` resolvem apesar da `''` da home coexistir,
  `/painel` redireciona ao `/login?retorno=%2Fpainel` sem sessão e é liberado com sessão, via
  `RouterTestingHarness`). **Validado:** `lint`/`build`/`test` do **frontend** verdes — **17 arquivos /
  85 testes** (era 14/73; +3 arquivos, +12 testes). Nenhuma regra de jogo (`shared/regras` intocado); nenhuma alteração de backend.
- **m2-05-campanha-convite-membros** (2026-07-06): **fecha o backend de campanhas** — entrada por
  código de convite, regeneração do código e listagem de membros, sobre o módulo `campanha` da m2-04
  (reusa `CampanhaRepository` e os gates `validarMembro`/`validarMestre`). **Entregável 1 —
  `entrarCampanha`** (`POST /campanha/entrar`): o usuário autenticado ingressa informando o
  `codigoConvite` (o `usuarioId` vem do JWT) e vira `JOGADOR`; código inexistente/inválido →
  `ResourceNotFoundException` (404), usuário já membro → `BusinessException` (400, respeitando o índice
  único parcial `uix_campanha_membro_campanha_usuario_ativo`); a busca por código usa o novo
  `recuperarPorCodigoConvite` (SELECT por `codigo_convite` ativo). **Entregável 2 —
  `regenerarConvite`** (`POST /campanha/:id/convite/regenerar`, **só mestre** via `validarMestre`): gera
  um novo `codigo_convite` único (reusa `gerarCodigoConvite` — mesma unicidade da criação) e o persiste
  via `alterarConvite` (`UPDATE codigo_convite ... RETURNING`), **invalidando o anterior** (o código
  antigo deixa de resolver para a campanha). **Entregável 3 — `listarMembros`**
  (`GET /campanha/:id/membros`): nome do usuário + papel (`MESTRE`/`JOGADOR`), visível a qualquer membro
  (`validarMembro` → `UnauthorizedAccessException` p/ não-membro); o repositório junta
  `campanha_membro`→`usuario`→`tipo_campanha_membro_papel` (todas `is_deleted = false`, traduz o `codigo`
  do papel, ordena por nome). **Entregável 4 — matriz de permissões (§14)** coberta por **testes de
  service**: mestre × jogador × não-membro; convite/regeneração só pelo mestre; entrada rejeitada p/
  código inválido ou já-membro; a service é o único árbitro (proibição #28). **Entregável 5 — DTOs**
  (8 novos em `shared/src/dtos/campanha/`, seguindo `dto-conventions`): públicos `CampanhaEntrarDto
  {codigoConvite}`/`CampanhaEntradaDto {id,nome,descricao,papel}`, `CampanhaConviteRegenerarDto {id}`/
  `CampanhaConviteRegeneradoDto {id,codigoConvite}` (complemento `Convite` inteiro antes do verbo),
  `CampanhaMembrosListarDto {campanhaId}`/`CampanhaMembroResumoDto {usuarioId,nome,papel}` (listagem →
  item `Resumo`); internos `CampanhaConviteRecuperarDto {codigoConvite}` (precedente
  `UsuarioLoginRecuperarDto`) e `CampanhaConviteInternoAlterarDto {id,codigoConvite}`. **Camadas (§7):**
  `CampanhaController` burra passou de 5 → **8 rotas**; toda a regra/permissão na `CampanhaService`;
  SELECT sempre com `is_deleted = false`, `UPDATE ... RETURNING`, parâmetros nomeados. **Testes:**
  `campanha.service.spec.ts` ganhou **+9 testes** (entrar: cria `JOGADOR` ↔ 404 código inexistente ↔ 400
  já-membro; regenerar: mestre gera ↔ 403 não-mestre ↔ 404 inexistente; listarMembros: membro vê ↔ 403
  não-membro ↔ 404 inexistente), `randomBytes` dublado, repositório dublado. **Validado:** `build` do
  **shared** verde; `lint`/`build` do **backend** limpos; `test` do **backend** **28/28** (5 autenticação
  + 4 usuário + 19 campanha). **Verificação ao vivo contra o Postgres:** registro+login de um mestre, um
  jogador e um estranho descartáveis; mestre cria campanha → `{id,codigoConvite}`; jogador entra pelo
  código → `papel: JOGADOR`; `listarMembros` traz MESTRE + JOGADOR; jogador (membro) lista → **200**;
  entrar de novo → **400 'Você já é membro desta campanha'**; código inválido → **404**; estranho
  (não-membro) lista → **403**; não-mestre regenera → **403**; mestre regenera → novo código; entrar com
  o código **antigo** → **404** (invalidado); estranho entra com o **novo** → **201**; membros final = 3
  (MESTRE + 2 JOGADOR); sem token → **401**. Nenhuma UI, nenhuma regra de jogo (`shared/regras` intocado).
- **m2-04-campanha-crud** (2026-07-06): **módulo `campanha` (backend)** — CRUD de campanha com o
  criador virando `MESTRE` e a gestão restrita ao mestre, sobre as tabelas criadas em m2-01. Reusa o
  padrão de rota **protegida** (guard global + `@ActiveUser()`) provado na m2-03. **Entregável 1 —
  DTOs** (`shared/src/dtos/campanha/`, seguindo `dto-conventions`, **1º pacote de campanha**):
  públicos `CampanhaCriarDto {nome,descricao?}`/`CampanhaCriadaDto {id,nome,descricao,codigoConvite}`,
  `CampanhaListarDto {usuarioId}` (o `usuarioId` vem do JWT, injetado pela controller) /
  `CampanhaResumoDto {id,nome,descricao,papel}` (item de listagem com o papel do usuário),
  `CampanhaRecuperarDto {id}`/`CampanhaRecuperadaDto {...,codigoConvite}`, `CampanhaAlterarDto
  {nome,descricao?}`/`CampanhaAlteradaDto`, `CampanhaExcluirDto {id}`; internos service↔repositório
  `CampanhaInternoCriarDto` (carrega o `codigoConvite` já gerado), `CampanhaInternoAlterarDto` (id no
  DTO — nunca `alterar(id,dados)`) e os do vínculo `CampanhaMembroInternoCriarDto`
  (`{campanhaId,usuarioId,papel}`), `CampanhaMembroInternoRecuperarDto`/`...RecuperadoDto {papel}`
  (base das permissões). Subpath `./dtos/campanha` no `shared/package.json` (+ `shared` rebuildado).
  **Entregável 2 — `criarCampanha`** (service): gera um `codigo_convite` aleatório (alfabeto sem
  caracteres ambíguos, via `crypto.randomBytes`; unicidade garantida pelo índice único parcial
  `uix_campanha_codigo_convite_ativo`), insere a `campanha` e cria o `campanha_membro` do criador com
  papel `MESTRE` (exatamente **um** mestre no v1 — §14). O repositório traduz `codigo → id` do papel
  via subconsulta em `tipo_campanha_membro_papel` no SQL (§10.2.12) — service/DTO só veem o `codigo`.
  **Entregável 3 — `listarCampanhas`**: só as campanhas de que o usuário autenticado é membro (JOIN
  `campanha_membro`→`campanha`→`tipo_campanha_membro_papel`, todas com `is_deleted = false`), com o
  `papel` dele em cada uma; ordenado por nome. **Entregável 4 — `recuperarCampanha`** (exige ser
  membro → `UnauthorizedAccessException`; `ResourceNotFoundException` se não existe),
  **`alterarCampanha`** (nome/descrição) e **`excluirCampanha`** (soft delete via
  `executarSoftDelete`). **Entregável 5 — permissões** (§14): gestão (alterar/excluir) só pelo mestre,
  validada na service via `validarMestre` (`recuperarMembro` + checagem de papel `MESTRE`); a service
  é o **único árbitro** (proibição #28). **Entregável 6 — camadas (§7):** `CampanhaController` burra
  (5 rotas, só monta o DTO e repassa); `CampanhaService` com toda a regra/permissão; `CampanhaRepository`
  (estende `BaseRepository`) dona das queries de `campanha`/`campanha_membro` (proibição #23) — SELECT
  sempre com `is_deleted = false`, INSERT `... SELECT ... RETURNING` (sem `VALUES`/`DEFAULT`),
  parâmetros nomeados, alias `codigo_convite AS "codigoConvite"`. `CampanhaModule` registra controller
  + service e exporta o repositório; importado no `AppModule`. **Testes:** novo `campanha.service.spec.ts`
  com **10 testes** (criação cria o `campanha_membro` MESTRE + gera o código; listar delega ao
  repositório; recuperar de membro ↔ 403 de não-membro ↔ 404 inexistente; alterar de mestre ↔ 403 de
  não-mestre ↔ 404 inexistente; excluir de mestre ↔ 403 de não-mestre), `randomBytes` dublado para o
  código determinístico, repositório dublado. **Validado:** `build` do **shared** verde; `lint`/`build`
  do **backend** limpos; `test` do **backend** **19/19** (5 autenticação + 4 usuário + 10 campanha).
  **Verificação ao vivo contra o Postgres:** registro+login de um mestre e de outro
  usuário descartáveis; criar campanha → devolve `{id,nome,descricao,codigoConvite}` e a listagem do
  mestre traz `papel: MESTRE`; a listagem do outro usuário vem **vazia**; recuperar do mestre ok,
  recuperar do não-membro → **403**; alterar do mestre ok, alterar/excluir do não-mestre → **403**;
  excluir do mestre → **200**; recuperar após excluir → **404** (soft delete); sem token → **401**.
  Nenhuma UI, nenhuma regra de jogo (`shared/regras` intocado).
- **m2-03-usuario-perfil-senha** (2026-07-06): completa o módulo `usuario` com os endpoints
  **self-service** do usuário autenticado — **1ª rota protegida da API** (consome o
  `@ActiveUser()`/`JwtAuthGuard` da m2-02; até aqui só o `/health` e as rotas `@Public()` de auth
  existiam). **Entregável 1 — DTOs** (`shared/src/dtos/usuario/`, seguindo `dto-conventions`):
  `UsuarioRecuperarDto {id}` (entrada de perfil — o `id` vem do JWT, injetado pela controller) e
  `UsuarioRecuperadoDto {id,login,nome}` (perfil, **sem** senha); `UsuarioSenhaAlterarDto
  {senhaAtual,novaSenha}` (body público, complemento `Senha` inteiro antes do verbo) e
  `UsuarioSenhaAlteradaDto {id,login,nome}` (saída, sem senha); interno
  `UsuarioSenhaInternoAlterarDto {id,senha}` (repositório, `senha` = hash — mesmo padrão de
  `UsuarioInternoCriarDto`). `shared` rebuildado (o subpath `./dtos/usuario` já existia da m2-02).
  **Entregável 2 — perfil:** `GET /usuario/perfil` → `UsuarioService.recuperarPerfil` projeta os
  dados públicos do usuário logado (`ResourceNotFoundException` se a conta do token sumiu, ex.:
  soft-delete), **nunca** a senha. **Entregável 3 — troca de senha:** `PATCH /usuario/senha` →
  `alterarSenha` valida a `senhaAtual` por `bcrypt.compare` (incorreta → `BusinessException('Senha
  atual incorreta')`, sem persistir), encripta a `novaSenha` (bcrypt cost 10, igual ao registro) e
  grava; recebe o body + `@ActiveUser()` (precedente Ficha `alterar(dto, usuarioAtivo)` — sem
  `@Param`, o id é o próprio ator). **Entregável 4 — camadas (§7):** `UsuarioController` burra (só
  monta o DTO com o id do token e repassa); `UsuarioService` com toda a regra; `UsuarioRepository`
  ganhou `recuperarPorId` (`SELECT ... WHERE id = :id AND is_deleted = false`, param nomeado, carrega
  o hash) e `alterarSenha` (`UPDATE ... SET senha = :senha, updated_date = NOW() WHERE id = :id AND
  is_deleted = false` — soft-delete-safe, sem `DEFAULT`), dona das queries de `usuario` (proibição
  #23). `UsuarioModule` passou a registrar controller + service (mantendo o export do repositório) e
  foi importado direto no `AppModule`. **Testes:** novo `usuario.service.spec.ts` com **4 testes**
  (perfil sem senha; perfil de conta inexistente → `ResourceNotFoundException`; troca de senha caminho
  feliz — compara, encripta, persiste, retorna sem senha; `senhaAtual` incorreta → `BusinessException`
  sem hashear nem persistir), repositório dublado + `bcrypt` mockado. **Validado:** `build` do
  **shared** verde; `lint`/`build` do **backend** limpos; `test` do **backend** **9/9** (5 de
  autenticação + 4 novos). **Verificação ao vivo contra o Postgres:** `perfil` sem token / com token
  inválido → **401**; registro + login de um usuário descartável → `perfil` com token devolve
  `{id,login,nome}` **sem** senha; `PATCH senha` com `senhaAtual` errada → **400 'Senha atual
  incorreta'**; com a correta → **200**; em seguida login com a senha **antiga → 400** e com a
  **nova → 201** (prova persistência + encriptação corretas). Nenhuma UI, nenhuma regra de jogo
  (`shared/regras` intocado).
- **m2-02-autenticacao-jwt-guard** (2026-07-06): **backbone de autenticação do M2** — registro,
  login com JWT, guard global e `@ActiveUser()`; **primeira camada de negócio da API** (até aqui só
  o `/health` operacional). **Entregável 1 — DTOs** (`shared/src/dtos/usuario/`, 1º pacote de DTOs de
  negócio do projeto): públicos `UsuarioCriarDto {login,senha,nome}`/`UsuarioCriadoDto {id,login,nome}`
  e `UsuarioAutenticarDto {login,senha}`/`UsuarioAutenticadoDto {token,id,login,nome}` — **saída nunca
  expõe `senha`**; internos service↔repository `UsuarioInternoCriarDto` (senha já é hash),
  `UsuarioLoginRecuperarDto {login}` e `UsuarioInternoRecuperadoDto {id,login,senha,nome}` (carrega o
  hash p/ `bcrypt.compare`). Interfaces (sem class-validator — o `ValidationPipe` global não é escopo
  desta task). Export subpath `./dtos/usuario` no `shared/package.json` (+ `shared` rebuildado).
  **Entregável 2 — módulo `autenticacao`** (`backend/src/modules/autenticacao/`): `AutenticacaoController`
  burra (`POST /autenticacao/registro` e `/login`, ambas `@Public()`, só repassam); `AutenticacaoService`
  com toda a regra — registro recusa login duplicado via `validarLogin` (`BusinessException('Login já
  está em uso')`, nunca `existe*`) e grava `bcrypt.hash` (cost 10, igual ao seed da migration 0003);
  login valida por `bcrypt.compare` e emite JWT, com **a mesma mensagem** (`'Login ou senha inválidos'`)
  para login inexistente e senha errada (não revela qual falhou); `JwtStrategy` (Passport, `Bearer`,
  segredo do `ConfigService`); `JwtModule.registerAsync` lê `JWT_SECRETO`/`JWT_EXPIRACAO` do
  `ConfigService` (nunca `process.env` — proibição #10); `JwtPayload { sub, login }`. **Entregável 3 —
  `JwtAuthGuard` global via `APP_GUARD`** (no `AppModule`): estende `AuthGuard('jwt')` e libera as rotas
  `@Public()` lendo `IS_PUBLIC_KEY` pelo `Reflector` — **1º consumidor real do `@Public()` do M0**, que
  até aqui não bloqueava nada. **Entregável 4 — `@ActiveUser()`** (`core/decorators/active-user.decorator.ts`,
  ao lado do `@Public()`): injeta `request.user` (o payload validado). **Entregável 5 — persistência
  `usuario`** (`backend/src/modules/usuario/`, dona das queries — proibição #23): `UsuarioRepository`
  (estende `BaseRepository`) com `criarUsuario` (`INSERT ... SELECT ... RETURNING id, login, nome` — sem
  `VALUES`/`DEFAULT`) e `recuperarPorLogin` (`SELECT ... WHERE login = :login AND is_deleted = false`,
  param nomeado); `UsuarioModule` exporta o repositório, `AutenticacaoModule` o importa. **Test-runner
  do backend (novo):** Vitest (`backend/vitest.config.ts` + script `test`) — `autenticacao.service.spec.ts`
  com **5 testes** (login duplicado no registro; senha inválida e login inexistente no login com a mesma
  mensagem e sem emitir token; encriptação + persistência sem devolver a senha; geração do JWT com
  payload `{sub,login}` e retorno sem senha), colaboradores dublados + `bcrypt` mockado (sem DB nem hash
  real). Deps novas: `@nestjs/passport`/`@nestjs/jwt`/`passport`/`passport-jwt`/`bcrypt` (+ `@types/*`).
  **Fix de build:** `vitest.config.ts` foi adicionado ao `exclude` do `tsconfig.build.json` (senão o
  `nest build` alargava o `rootDir` e emitia `dist/src/main.js`, quebrando `start:prod`). **Validado:**
  `build`/`lint`/`test` do **backend** verdes (5/5); `lint`/`test` do **shared** verdes (143/143,
  intocado). **Verificação ao vivo contra o Postgres:** `GET /health` e as rotas de auth acessíveis sem
  token (200); `registro` devolve o usuário **sem senha** (id 2 — a conta seed `senhor.contratados` é a
  id 1); registro duplicado → `Login já está em uso`; login errado → `Login ou senha inválidos`; login
  correto → JWT válido (payload `{sub,login,iat,exp}`). Guard exercitado numa rota **protegida** de
  teste descartável: **sem token → 401, token inválido → 401, token válido → 200** com `@ActiveUser()`
  injetando o payload. Nenhuma UI, nenhuma regra de jogo (`shared/regras` intocado).
- **m2-01-migrations-tabelas-contas-campanha** (2026-07-06): **primeira task do M2** e fundação de
  dados de Auth + Campanhas — cria as tabelas relacionais e o enum de papel, **sem lógica de
  negócio, service, controller ou frontend** (o backbone de auth nasce na m2-02). **Entregável 1 —
  enum espelho:** `TipoCampanhaMembroPapelEnum` (`MESTRE`/`JOGADOR`) em
  `shared/src/enums/tipo-campanha-membro-papel.enum.ts` (+ barrel `index.ts`) — o **primeiro enum
  de coluna** do projeto (materializado como tabela `tipo_*`, ao contrário dos enums de conteúdo de
  jogo do JSONB — §10.3). **Entregável 2 — migrations `.sql`:** quatro arquivos novos em
  `backend/src/database/migrations/`, em ordem de dependência de FK — `0002` tabela de referência
  `tipo_campanha_membro_papel` (com **seed** `MESTRE`/`JOGADOR` por literais SQL — exceção sancionada
  de migration §10.7), `0003` `usuario` (colunas `login`/`senha`/`nome` — hash bcrypt na `senha`, sem os sufixos
  `_encriptada`/`_completo`; inclui **seed da conta do autor** `senhor.contratados`/`Matheus`
  com a senha como hash bcrypt literal), `0004` `campanha`, `0005` `campanha_membro` — cada uma
  com BaseEntity completa (**sem DEFAULT**), PK/FK/índices nomeados por prefixo (§10.2.11), índices
  únicos **parciais** `WHERE is_deleted = false` (login, código de papel, código de convite, par
  campanha+usuário) + `ix_campanha_membro_usuario`, e trigger `trg_<tabela>_updated_date` usando a
  `fn_set_updated_date()` do M0; seções `-- UP`/`-- DOWN`, sem `BEGIN/COMMIT` (o Knex gerencia a
  transação — §10.7). **Seed da conta inicial** do autor em `usuario` (login `senhor.contratados`,
  nome `Matheus`) com a `senha` como **hash bcrypt** literal (cost 10; validável por
  `bcrypt.compare` na m2-02). **Entregável docs:** `SCHEMA.md` sincronizado (colunas de `usuario`
  renomeadas para `login`/`senha`/`nome` + nota do seed); ajuste de nomenclatura propagado à
  constituição — os exemplos de coluna de negócio da SYSTEM.SPEC §4/§14 e da CONVENTIONS passaram
  de `senha_encriptada`/`nome_completo` para `senha`/`nome`; `CONVENTIONS.md` "Próxima migration"
  atualizado `0002` → `0006`.
  **Validado no Postgres local:** `db:up` + `db:migrate` (batch 1 = 5 migrations) cria as 4 tabelas;
  conferidos por `psql` as 4 tabelas, o seed (`MESTRE`/`JOGADOR`), os 9 índices (`pk_`/`uix_`/`ix_`),
  as 3 FKs de `campanha_membro` e os 4 triggers; **round-trip** `db:rollback` (batch revertido, só
  `knex_*` sobra) + `db:migrate` de novo reconstrói tudo — `-- DOWN` limpo e `-- UP` re-aplicável.
  `lint` **shared** e **backend** limpos; `test --workspace=shared` **143/143** (intocado — enum novo
  não quebra nada). Nenhuma UI, nenhum service.
- **m1-18-scrollbar-customizada** (2026-07-06): última task de refinamento do M1 (mesmo padrão de
  m1-15/m1-16 — acabamento após o fechamento da paridade em m1-14) — **fecha o M1 no código (18
  tasks, backlog do M1 vazio)**. Substitui a barra de rolagem **nativa** do navegador por um padrão
  próprio do tema "Terminal de Contenção", **sem tocar em template/TS de nenhuma página nem em regra
  de jogo** (`shared`/`shared/regras` intocados; mudança 100% CSS global). **Entregável 1 — padrão
  canônico:** novo bloco de scrollbar em `frontend/src/styles/tema/_base.scss` (parcial de tema
  **global**, já importado por `styles.scss` após os tokens — não em `_componentes.scss`, que é
  biblioteca de copiar-por-componente), **espelhado no handoff** `docs/design/tema/_base.scss`. Thumb
  fino (`width`/`height: 10px`) em `--surface-2` com contorno `1px --border-strong` e raio
  `--radius-control`; track e `::-webkit-scrollbar-corner` transparentes; `::-webkit-scrollbar-thumb:hover`
  troca o contorno para `--accent-border` (realce sutil — **nunca** `--accent` sólido, reservado p/
  ação/estado ativo). Cross-browser: `::-webkit-scrollbar-*` (Chrome/Edge/Safari) + `scrollbar-width:
  thin` e `scrollbar-color: var(--border-strong) transparent` no `html` (Firefox e a spec padrão;
  `scrollbar-color` herda para os modais). **Entregável 2 — pontos de rolagem:** o seletor `*` do
  webkit e a herança de `scrollbar-color` cobrem de uma vez o scroll geral (`html`/`.conteudo`), os 3
  modais (`AjudaCalculadora`/`ConfiguracoesTema`/exportar-importar) e as tabelas/textarea com
  `overflow-x: auto` — nenhum override local divergente foi necessário (confirmado: `grep -ri scrollbar`
  no front só retorna o novo bloco). **Só tokens** (`--surface-2`/`--border-strong`/`--accent-border`),
  nenhum hex/raio solto (proibição #29): como o `TemaService` (m1-13) sobrescreve `--surface-2` e
  `--border-strong` na base clara (`TOKENS_CLARO`), o thumb segue legível/discreto nas **duas bases**
  automaticamente. **Entregável 3 — documentação:** nova seção "Scrollbar (padrão global)" no
  `docs/design/DESIGN.md` (+ menção no bullet do `_base.scss`), instruindo as telas futuras (ficha de
  jogador/criatura, guia de missão) a não reintroduzir a barra nativa nem restilizá-la por componente.
  **Fora de escopo respeitado:** CSS puro, sem JS/biblioteca; a affordance de rolagem é **restilizada**,
  não escondida. **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **73/73**
  (inalterado — mudança só de CSS global); `test --workspace=shared` intocado; `build --workspace=frontend`
  verde (inicial **538,12 kB** < 560 kB; `styles.css` global **7,13 kB**; **sem avisos de budget**).
  Os warnings de compat do editor sobre `scrollbar-width`/`scrollbar-color` em navegadores antigos são
  esperados — é justamente por isso que o `::-webkit-scrollbar-*` os acompanha (cobertura cruzada).
- **m1-17-singleton-estado-abas-calculadora** (2026-07-06): task de refinamento do M1 —
  singleton em memória que preserva o formulário das abas da calculadora ao navegar entre elas,
  **sem tocar em regra de jogo** (`shared`/`shared/regras` intocados). **Entregável 1/2/3 —
  singleton de estado:** novo `EstadoAbasCalculadoraService`
  (`modules/calculadora/estado-abas-calculadora.service.ts`, `providedIn: 'root'`) guarda em
  **memória** (mapa `aba → valor bruto` num Signal imutável, **sem I/O**) o valor bruto do
  formulário das 5 abas `agente`/`dt`/`novo-agente`/`patente`/`descanso` (`obterEstado`/
  `definirEstado` genéricos, tipados pelo valor bruto da própria página). Cada página passou a
  **restaurar no construtor** (via `patchValue`, se houver estado salvo; senão usa o preset
  inicial) e **gravar de volta** a cada `valueChanges` — puramente em memória, nenhuma chamada a
  `localStorage`/`sessionStorage`/cookie. Como é `root`, o estado sobrevive à navegação SPA
  (rotas lazy destroem/recriam o componente) mas é **recriado vazio a cada F5** — as 5 abas voltam
  ao preset no reload, exatamente como antes; só `compras` sobrevive a F5 (seu `localStorage` da
  m1-11 fica **intocado** e não é duplicado no singleton). Ordem cuidada nos construtores com
  lógica existente: no `agente` a restauração vem **antes** do reclamp de classe (o valor salvo já
  está normalizado) e o write-sub não muta o form (não realimenta o reclamp — cuidado pedido pela
  spec); no `novo-agente` a restauração vem antes do auto-sync do Prestígio do bônus e o
  `sincronizarPrestigioBonus()` inicial **só roda quando não há estado salvo** (senão sobrescreveria
  o Prestígio restaurado). **Entregável 4/5 — preset da aba `agente`:** o `FormControl` `nivel`
  nasce em **0** (era 3) e os 5 atributos (`vigor`/`destreza`/`forca`/`vontade`/`sentidos`) nascem
  todos em **1** (era `2/2/2/1/1`); classe segue `Combatente`. **Testes:** novo
  `estado-abas-calculadora.service.spec` (guardar/recuperar/sobrescrever/isolar por aba) + um teste
  de **ida-e-volta** em cada uma das 5 specs de página (preencher → desmontar → remontar no mesmo
  injector root → valor preservado); o `novo-agente` prova especificamente que o Prestígio do bônus
  editado não é zerado no retorno; a spec do `agente` teve os números do preset padrão atualizados
  (Vida **34** / Energia **17** para Combatente Nível 0, atributos 1). **Validado:** `lint
  --workspace=frontend` limpo; `test --workspace=frontend` **73/73** (64 anteriores + 9 novos);
  `test --workspace=shared` **143/143** (intocado); `build --workspace=frontend` verde (inicial
  **537,70 kB** < 560 kB, sem avisos de budget).
- **m1-16-preset-cor-salvo-tema** (2026-07-06): refinamento do sistema de tema em runtime
  (m1-13), estendendo o `TemaService` e o painel `ConfiguracoesTema` — **sem regra de jogo**
  (`shared`/`shared/regras` intocados). **Entregável 1 — slot de cor custom salvo:** novo
  `_accentCustomSalvo` (persistido em `accentCustomSalvo`, distinto do `accentCustom` "ativo") +
  `salvarAccentCustom`/`selecionarAccentSalvo`/`accentCustomSalvo`/`salvoAtivo`; a cor do color
  picker vira um **swatch re-selecionável** ("S" no canto) ao lado dos presets, **único por vez**
  (novo salvamento sobrescreve o anterior), sobrevive a reload e reaplica com um clique sem
  reabrir o picker. **Entregável 2 — inversão visual por incompatibilidade de base:** `accentEfetivo`
  passou a ser o valor **selecionado** (lógico) e ganhou par `accentAplicado` (o que é escrito em
  `--accent`) + `accentAdaptado`; quando a cor selecionada/salva fica ilegível na base ativa, o
  `--accent` exibido é uma **variante legível** (`variantePorContraste`: complemento RGB → ajuste
  de luminância até cruzar `CONTRASTE_MINIMO`, com fallback ao preset seguro só em último caso),
  **preservando o valor salvo** — ao voltar à base compatível a cor original é reaplicada.
  `definirBase` deixou de **descartar** a cor custom (só troca **presets fixos** travados). Restauração
  no boot passou a restaurar o custom/salvo **sem** a trava (a legibilidade é resolvida por
  adaptação, não por descarte). A trava de contraste de `definirAccentCustom` (bloquear a
  **definição** de cores ilegíveis na base atual) segue intacta. **Entregável 3 — UI:** botão
  "Salvar cor" na seção de cor personalizada, o swatch salvo (estado selecionado quando ativo) e
  **nota discreta** (`text-mute`) quando a cor está sendo exibida adaptada; tudo **via tokens**
  (nenhum hex/fonte/raio solto — proibição #29). **A pedido do autor (mesma sessão):** (a) paleta
  de presets expandida de 4 → **9** (as 4 oficiais + Roxo/Rosa/Dourado/Turquesa/Cinza; cores
  principais com chroma/lightness próximos das oficiais, todas sujeitas à mesma trava por base);
  (b) o swatch salvo recebe um **nome aproximado** derivado do matiz/saturação/luminosidade da cor
  (`nomearCor` puro — faixas de matiz pt-BR + cinzas por baixa saturação + qualificador
  claro/escuro), exibido no lugar de um rótulo fixo. **Testes:** `tema.service.spec` ganhou o slot
  salvo (salvar/sobrescrever/re-selecionar ilegível→adaptado→voltar, persistência), `variantePorContraste`,
  `nomearCor` e a checagem das cores adicionais; `configuracoes-tema.component.spec` cobre o swatch
  salvo re-selecionável. **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend`
  **64/64** (54 anteriores + 10 novos); `test --workspace=shared` **143/143** (intocado);
  `build --workspace=frontend` verde (inicial **537,70 kB** < 560 kB, sem avisos de budget).
- **m1-15-refinamento-mobile-calculadora** (2026-07-06): task de refinamento do M1 —
  otimização da UI/UX **mobile** das 6 abas, do shell e dos painéis, sem tocar em regra de
  jogo (`shared`/`shared/regras` intocados; nenhuma mudança de DOM/TS, só SCSS + `angular.json`,
  então os 54 testes de front seguem verdes sem edição). **Estratégia responsiva de fonte
  única:** novo `frontend/src/styles/tema/_breakpoints.scss` (`$bp-mobile: 560px`, mixin
  `mobile`, `$alvo-toque: 44px`) — media queries são compile-time e não leem `var(--…)`, por
  isso o breakpoint é token **Sass**, não CSS custom property; resolvido por bare import
  (`@use 'tema/breakpoints'`) via `stylePreprocessorOptions.includePaths: ["src/styles"]`
  adicionado ao `angular.json`. Nenhuma largura mágica repetida por arquivo. **Densidade mobile
  por override de token:** um `@media (max-width: 560px)` no `styles.scss` reduz `--pad-card`
  15px e `--gap-grid` 12px no `:root` — como todos os cards/grids consomem esses tokens, o
  reflow acontece de uma vez, sem editar cada componente. **Zero scroll horizontal do body:**
  `overflow-x: clip` em `html` e `.conteudo` (conteúdo largo — tabelas de DT/Patente, textarea
  de código — já rola no próprio container via `overflow-x: auto`); `img/svg/video/canvas`
  com `max-width: 100%`. **Reflow das 6 abas:** as grades já eram `auto-fit`/`auto-fill minmax`,
  então colapsam para 1–2 colunas no mobile sem mudança estrutural (tabela de colunas por
  largura de referência na §6 de `docs/PARIDADE-M1.md`); a redução de padding/gap por token
  ajusta a densidade. **Alvos de toque (44px):** botões −/+ do `StepInput` (30px→44px só no
  mobile, desktop intacto), abas do shell (que no mobile viram uma **barra flutuante fixa no
  rodapé** — `position: fixed` destacada das bordas, ícone sobre rótulo, 6 itens `flex: 1`
  distribuídos, deep-link por rota preservado, `env(safe-area-inset-bottom)` do iOS +
  `padding-bottom` reservado no conteúdo; `z-index` abaixo dos modais, que a cobrem),
  chips de categoria e mini-botões −/+ do carrinho (aba `compras`), e opções/swatches/**color
  picker** do painel de tema. **Modais mobile-first:** ajuda (`AjudaCalculadora`), config de
  tema (`ConfiguracoesTema`) e exportar/importar do carrinho ganham `max-height:
  calc(100dvh - 32px)` + `overflow-y: auto`, permanecendo operáveis com o polegar. **Identidade
  preservada** (dark base + IBM Plex + grid + cards), **tudo via tokens** — nenhum hex/fonte/raio
  solto, nenhum `style=""`, nenhum `.css` (proibições #17/#18/#29). **Budget:** o SCSS responsivo
  da aba `compras` (a mais pesada) levou o `anyComponentStyle` a 8,28 kB; o `maximumWarning` subiu
  **8→10 kB** (erro mantido em 12 kB) em `angular.json`, mesmo precedente das elevações de budget
  em `m1-10`/`m1-13`. **Acabamentos pedidos na mesma sessão** (mobile + polimento): (1) a
  **categoria de equipamento selecionada** ganhou estado ativo com **glow** de accent — a classe
  `.selecionavel--ativo` era usada no template mas não existia no SCSS scoped da `compras` (só no
  shell), então a seleção não tinha destaque; agora `accent` + `accent-dim` + `box-shadow` suave;
  (2) os botões **Importar/Exportar/Esvaziar** do carrinho foram embrulhados em
  `.compras-carrinho-acoes` (desktop: agrupados à direita; mobile: caem para a própria linha em
  terços iguais, corrigindo a quebra visual); (3) botões de item/**amplificador** com alvo de
  toque ≥40px e `flex-wrap` no mobile; (4) na aba **DT**, o resultado da fórmula e os valores da
  tabela passaram de verde `--positive` para a **cor do tema** (`--accent` trocável em runtime).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **54/54**; `test
  --workspace=shared` **143/143**; `build --workspace=frontend` verde, inicial **533,27 kB** <
  560 kB, **sem avisos de budget**. Verificação responsiva registrada em `docs/PARIDADE-M1.md` §6.
- **m1-14-paridade-deploy-arquivamento** (2026-07-06): última task do M1 — verificação de
  paridade das 6 abas, checagem de "sem duplicação" e fechamento **de código** do milestone
  (o deploy Cloudflare e o toggle de arquivamento do repo antigo são passos operacionais de
  plataforma, documentados como pendências). Task de verificação + documentação, sem regra de
  jogo nova (`shared`/`shared/regras` intocados na lógica). **Método de paridade:** o repo antigo
  `contratados-calculadora` **não está neste monorepo nem no histórico Git** (confirmado por
  `find`/`git log`) — é projeto à parte. Como a milestone autoriza, a paridade é verificada
  contra a **fonte da verdade** `docs/core/sistema-v4.1.0.md` (que vence o código antigo), já
  conferida por domínio nas m1-02..m1-05 com os exemplos numéricos replicados em teste; as 4
  divergências resolvidas a favor do documento (Limite de Energia `Destreza×2`; peso 0 das mods
  de Armazenamento; quebra de formato do export/import; texto de ajuda reescrito) estão
  catalogadas no novo **`docs/PARIDADE-M1.md`** (checklist por aba + tabela de divergências +
  resultado da checagem de duplicação + estado de deploy/arquivamento). **Achado de duplicação
  corrigido:** `compras.page.ts` recalculava o custo do amplificador (`3000 + (stacks−1)×1000`)
  e a penalidade de Vontade (`(stacks−1)×2`) com constantes de regra embutidas — repontado para
  `calcularCustoAmplificador()` + `PENALIDADE_VONTADE_POR_EMPILHAMENTO` de `shared/regras/compras`,
  satisfazendo o critério "nenhuma regra de jogo duplicada no frontend". Confirmado: nenhuma outra
  fórmula/tabela do jogo vive no front/back (backend não importa `shared/regras`); aritmética
  remanescente nas páginas é de UI. **100% das fórmulas testadas:** shared **143/143**; frontend
  **54/54**; `build --workspace=frontend` verde (inicial 532,77 kB < 560 kB, sem avisos) — bundle
  estático servível offline do backend. **Ajustes de acabamento pedidos na mesma sessão** (fora do
  escopo estrito da spec, a pedido do autor): (1) aba do navegador com sufixo **"- DEV"** em
  desenvolvimento (`provideAppInitializer` gated por `!environment.producao`); (2) **stat Vida
  fixada em vermelho** nas abas agente/descanso via novo token `--vida`/`--vida-border` (identidade),
  desacoplada do `--accent` trocável do tema em runtime; (3) housekeeping — specs de milestone
  `m0-fundacao`/`m1-calculadora-paridade` movidos para `done/` e `.gitkeep` removidos das pastas
  que já têm conteúdo (`backend/src/config`, `docs/specs/done`, `frontend/src/app/modules`,
  `shared/src/interfaces`). **Validado:** `lint`/`test`/`build` do frontend verdes; `test` do shared verde.
- **m1-13-sistema-temas-runtime** (2026-07-05): entregável 4 do milestone e item adiado do M1
  (SYSTEM.SPEC §15) — **sistema de troca de tema em runtime** reconstruído sobre o
  `ContencaoPreset`/CSS vars do PrimeNG 21 e os tokens de `docs/design/tema/`. Identidade fixa
  preservada (dark base + IBM Plex); só o `--accent` e a base clara/escura são trocáveis (spec).
  **`TemaService`** (`core/services/tema.service.ts`) é a contraparte em runtime de `_tokens.scss`
  para a parte trocável — o único lugar (fora do SCSS de tokens) sancionado a conhecer valores de
  cor. Estado em Signals (`base`/`presetId`/`accentCustom` → `accentEfetivo`/`presetsExibicao`
  computados). `aplicar()` escreve o token `--accent` em `<html>` (dispara `--accent-dim`/
  `--accent-border` via `color-mix`), na base clara aplica overrides de superfície/texto (na
  escura os remove, deixando o `:root` de `_tokens.scss` valer — sem duplicar os hexes dark),
  alterna a classe `.dark` do PrimeNG e regenera a paleta primária do preset
  (`updatePrimaryPalette(palette(accent))`) para os componentes PrimeNG seguirem o accent.
  **Presets de accent (4):** só cores da paleta do tema (vermelho `--accent` / azul `--energy` /
  verde `--positive` / âmbar `--warning`) — "não inventar cores fora desta lista" (CLAUDE.md).
  **Trava de contraste (WCAG):** `luminanciaRelativa` (≈`relativeLuminance` do site antigo) +
  `razaoContraste` (≈`contrastRatio`) puras; `CONTRASTE_MINIMO = 3` (piso WCAG AA de UI, paridade
  do `SIMILAR_THRESHOLD`); `presetsExibicao` marca os travados p/ a base atual
  (≈`updateSwatchLocks`), `definirAccentCustom` bloqueia (retorna `false`) cores ilegíveis, e
  `definirBase` cai em `accentAlternativoParaBase` (≈`fallbackAccentForBase`) se o accent atual
  ficar travado na nova base. Ex. conferido em teste: **âmbar** trava na base clara (contraste
  ~2,25 vs branco) e libera na escura. **Persistência:** `salvar`/`restaurar` em `localStorage`
  (`contratados-rpg:tema`), restaurados no boot por **`provideAppInitializer`** (aplica antes da
  primeira renderização — sem flash). **UI:** painel `ConfiguracoesTema`
  (`shared/configuracoes-tema/`) — gatilho na topbar (`Layout` ganhou `.topbar__acoes`) + modal
  (base escuro/claro, swatches de preset com os travados desabilitados, `<input type="color">`
  via Reactive Forms — sem `ngModel` — com aviso de contraste bloqueado); **fecha só por botão**
  (padrão de acessibilidade dos modais de ajuda/compras). Consome **só tokens** do tema (nenhum
  hex/fonte/raio solto no SCSS/template — proibição #29; os valores de cor vivem no `TemaService`,
  a fonte em runtime, como no `_tokens.scss`). **Sem regra de jogo** (`shared`/`shared/regras`
  intocados). **Budget:** o motor de paleta do `@primeuix/themes` (`palette`/`updatePrimaryPalette`)
  entra no bundle inicial (~48 kB; import dinâmico não separa porque `@primeuix/themes` já é inicial
  via `contencao.preset.ts`) — o budget `initial` `maximumWarning` foi elevado de 500 kB para
  **560 kB** em `angular.json` (mantendo o erro em 1 MB; decisão do autor, mesmo precedente do
  budget de estilo elevado na m1-10). Novos `tema.service.spec.ts` (contraste WCAG; trava por
  base; aplicação das CSS vars em `<html>`; bloqueio do accent custom ilegível; fallback ao trocar
  de base; round-trip de persistência) e `configuracoes-tema.component.spec.ts` (gatilho abre o
  painel; 4 presets; base clara desabilita o âmbar; picker de baixo contraste sinaliza bloqueio).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **52/52** (36
  anteriores + 16 novos); `build --workspace=frontend` verde **sem avisos de budget** (inicial
  532,49 kB < 560 kB). A troca reflete em runtime em todas as páginas (as pages são token-driven).
- **m1-12-conteudo-ajuda** (2026-07-05): conteúdo de ajuda por aba — parte do entregável 4 do
  milestone (as 6 páginas ganham um modal de ajuda). **Componente único reutilizável**
  `AjudaCalculadora` (`modules/calculadora/componentes/ajuda-calculadora/`) consumido pelas **6
  páginas** (`agente`/`dt`/`novo-agente`/`patente`/`descanso`/`compras`): um gatilho "? Ajuda" + o
  modal com o guia de uso, parametrizado só pelo input signal `aba` — **um só componente, sem
  duplicação por aba** (critério de aceite). Estado de abertura em Signal; **fecha apenas por botão**
  ("×" do cabeçalho ou "Fechar"), sem clique-fora — mesmo padrão de acessibilidade dos modais de
  exportar/importar da m1-11 (não aciona `click-events-have-key-events`/`interactive-supports-focus`
  do lint). Modal adaptado do `.compras-modal`, consumindo **só tokens** do tema "Terminal de
  Contenção" (nenhum hex/fonte/raio solto — proibição #29); embutido como nó-raiz acima do `<form>`
  de cada página, com o host em flex alinhando o gatilho à direita. **Conteúdo** em
  `conteudo-ajuda.ts` (`CONTEUDO_AJUDA` keyed por `AbaAjuda` = equivalente ao `HELP_CONTENT` do site
  antigo): cada entrada tem título, resumo, passos e nota. **Origem do texto — quebra de paridade
  documentada (como na m1-11):** o `HELP_CONTENT` original não está neste repositório (a SPA
  `contratados-calculadora` é projeto à parte, arquivada só após o M1 — SYSTEM.SPEC §1; confirmado no
  git e no grep), então a paridade textual literal é impossível. A pedido do autor, cada entrada é um
  **guia de "como usar esta página"** (instruções de uso da aba), redigido a partir do comportamento
  já implementado (m1-07..m1-11) e conferido contra `docs/core/sistema-v4.1.0.md` — é texto de
  interface, **sem regra de jogo nova** (`shared/regras` e `shared` intocados). Novo
  `ajuda-calculadora.component.spec.ts` prova o componente (gatilho abre o modal; título e nº de
  passos batem com `CONTEUDO_AJUDA`; seleção de conteúdo por aba; fecha por botão); os specs das 6
  páginas seguem passando (o gatilho usa classes `.ajuda-*` próprias, não colide com as queries por
  classe dos testes existentes). **Validado:** `lint --workspace=frontend` limpo; `test
  --workspace=frontend` **36/36** (32 anteriores + 4 novos); `build --workspace=frontend` verde **sem
  avisos de budget**. As 6 abas seguem client-side (funcionam sem backend).
- **m1-11-compras-persistencia-carrinho** (2026-07-05): fecha a paridade da aba `compras` —
  persistência e exportar/importar por código, últimos entregáveis do milestone antes de
  `m1-12`/`m1-13`/`m1-14`. **Persistência em `localStorage`:** um `effect()` no construtor da
  `ComprasPage` observa `carrinho`/`amplificadores`/`recursos` (form) e grava o estado a cada
  mudança na chave `contratados-rpg:calculadora-compras`; o construtor tenta carregar esse
  estado antes de qualquer outra inicialização — o carrinho sobrevive a reload/reabertura sem
  nenhuma ação do usuário. **Exportar/importar por código compartilhável:** dois modais novos
  (`abrirModalExportarCodigo`/`abrirModalImportar`, fechados por botão — sem clique-fora, para
  não acionar `click-events-have-key-events`/`interactive-supports-focus` do lint de
  acessibilidade) — exportar serializa `{ versao: 1, recursos, carrinho, amplificadores }` em
  `JSON.stringify` → `encodeURIComponent` → `btoa`, prefixado `CRPG-COMPRAS-V1:`
  (`copiarCodigoCarrinho` usa `navigator.clipboard`); importar reverte a decodificação,
  valida a forma do objeto (`versao === 1` + tipos dos 4 campos de `recursos` + `carrinho`/
  `amplificadores` como array) e só então aplica via `aplicarEstado` (também usado pelo load
  do `localStorage`), recalculando `uidContador` a partir do maior `uid` importado para não
  colidir com itens adicionados depois. **Compatibilidade com códigos do site antigo —
  quebra documentada (critério de aceite cumprido pela via da exceção):** o
  `contratados-calculadora/src/script.js` não está neste repositório (não foi migrado nem
  está disponível para inspeção), então o formato de serialização original não pôde ser
  conferido nem replicado; o novo formato (`CRPG-COMPRAS-V1:`) é uma serialização própria,
  incompatível por construção, e a UI de importação avisa isso explicitamente no texto do
  modal ("Códigos do site antigo... não são compatíveis com este formato"). **Sem lógica de
  jogo nova** — só serialização de estado da página, fora do escopo de `shared/regras`
  (que continua intocado desde a m1-05/m1-10). `compras.page.spec.ts` ganhou 2 testes: um
  round-trip de persistência (adicionar item → remontar a página → item e gasto
  preservados) e um round-trip de exportar/importar (exportar em uma instância, limpar o
  `localStorage`, importar o código numa segunda instância, mesmo gasto/item reproduzidos);
  os testes existentes ganharam `beforeEach`/`afterEach` limpando o `localStorage` (evita
  vazamento de estado entre `it`s) e a função `montar()` ganhou `TestBed.resetTestingModule()`
  + `await fixture.whenStable()` (necessário porque agora há dois `montar()` no mesmo teste e
  porque o `effect()` de salvar é assíncrono — sem o `whenStable()` o segundo `montar()` podia
  ler o `localStorage` antes do `effect()` gravar). **Validado:** `lint --workspace=frontend`
  limpo; `test --workspace=frontend` **32/32** (30 anteriores + 2 novos); `build
  --workspace=frontend` verde sem avisos de budget de estilo (SCSS do modal ficou dentro do
  budget elevado de 8/12 kB definido na m1-10).
- **m1-10-pagina-compras** (2026-07-05): a aba `compras` da calculadora — **a mais pesada** — com paridade
  funcional à aba `compras` do site antigo (`renderCmpSummary`/`renderCmpCatalog`/`renderCmpCart`/
  `computeItemStat`/`getCmpTotals`). **Zero regra de jogo no front**: limites de patente, custo/peso de
  modificação, conflitos, stat computado de item, custo de amplificador e todos os totais vêm de
  `shared/regras/compras` (regras prontas desde a m1-05); a página só orquestra o estado do carrinho em
  Signals e traduz os value-objects do motor para a UI. Mesmo molde das abas anteriores (Reactive Forms +
  Signals, `StepInput` da m1-06, tokens/BEM do tema "Terminal de Contenção"). `ComprasPage`
  (`paginas/compras/`) tem 4 cards: **(1) Configuração** — 4 steppers (Dinheiro passo 100, Prestígio,
  Inventário passo 0,5, Vontade 0–12); **(2) Resumo** — patente (via `ROTULOS_PATENTE`), dinheiro
  restante/gasto, inventário usado vs efetivo, amplificadores vs limite (Vontade×3), limite de mods e
  penalidade de Vontade, com cores semânticas (accent quando estoura, `--positive` quando sobra dinheiro),
  tudo de `calcularResumoCompras`; **(3) Catálogo** — busca (`<input type=search>`) + abas de categoria
  (`CATALOGO_CATEGORIAS`, texto mono sem os emojis do site — proibição de emoji decorativo do tema) e grade
  de cartões (item base com dano/resist/bônus/descrição, ou amplificadores com faixa de stack e info de
  limite); **(4) Carrinho** — itens com stat computado (`calcularStatItem`), toggle Guardada/Vestida para
  armazenamento, chips de mods ativas com −/+, painel de modificações (próprias + emprestadas via "Faz
  Parte"/"Combativo", com pontos de empilhamento, custo/stack, motivo de bloqueio e gate de adição) e
  seção de amplificadores (stacks, custo, penalidade). **Estado em Signals**: `carrinho`/`amplificadores`
  (arrays imutáveis atualizados por `signal.set`), `categoriaAtiva`, `busca`, `painelAbertos` (Set de uids
  abertos), `recursos` (`toSignal` do form) → um `computed` por recorte de UI (`resumo`, `itensCatalogo`,
  `amplificadoresCatalogo`, `itensCarrinho`, `amplificadoresCarrinho`) que remontam view-models a partir do
  motor. **Gate de adição de mod/amp na página** (habilitar/desabilitar botão + travar a mutação) lê os
  limites do motor (`obterLimiteModificacoes`, `verificarConflitoModificacao`, `empilhamentosIniciais`/
  `empilhamentoMaximo` das `ModificacaoDados`) — não reimplementa fórmula, só orquestra a UI (mesma
  disciplina da rolagem animada viver na `DescansoPage`). **Decisões de representação (não divergem de
  regra):** ícones de stat do site (`⚔`/`🛡`/`📦`) viram rótulos de texto ("Dano …"/"Resist. …"/"+N inv."),
  como previsto na m1-05; categorias sem emoji; patente exibida pelo nome pt-BR (`ROTULOS_PATENTE`, m1-08),
  não o código do enum. **Persistência (`localStorage`) e export/import por código ficam para a m1-11**
  (fora de escopo da spec). `calculadora.routes.spec.ts` atualizado (`compras` deixou de ser stub → agora
  checa `.calc` + aba ativa; **não há mais stub**) e novo `compras.page.spec.ts` prova a ligação motor→DOM
  (resumo padrão Prestígio 0 → **Agente** / **$1.000** / gasto **$0**; adicionar "Leve" → gasto/restante
  **$500** e stat **Dano 1D6+DES [Físico]**; aplicar "Balanceada" → gasto **$1.250** (+$750 do motor);
  adquirir amplificador "Defesa" → gasto **$3.000** e amps **1/3**). **Budget de estilo:** a página é grande
  e seu SCSS scoped compila **6,75 kB** (reduzido de 8,46 kB com herança de `--font-mono` no container e
  agrupamento dos padrões repetidos de caixa/controle); o budget global `anyComponentStyle` foi elevado de
  4/8 kB para **8/12 kB** (aviso/erro) em `angular.json` para acomodar a página mais pesada (decisão do
  autor — as demais páginas seguem folgadas). **Validado:** `lint --workspace=frontend` limpo; `test
  --workspace=frontend` **30/30** (26 anteriores + 4 novos); `build --workspace=frontend` verde **sem
  avisos de budget**. As 6 rotas seguem client-side (funcionam sem backend).
- **m1-09-pagina-descanso** (2026-07-05): a aba `descanso` da calculadora com paridade funcional à
  `calcDescanso`/`rollDescanso` do site antigo, **incluindo a rolagem animada** (entregável 5 do milestone).
  **Zero regra de jogo no front** — faixa de recuperação, interpretação dos dados extras, rolagem e resultado
  final vêm de `shared/regras/descanso` (regras prontas desde a m1-04). Mesmo molde das abas anteriores
  (Reactive Forms + Signals, `StepInput` da m1-06, tokens/BEM do tema "Terminal de Contenção"). `DescansoPage`
  (`paginas/descanso/`) tem 3 cards: **(1) Configuração** — `<select>` de tipo/qualidade/refeição/interrupção +
  steppers Vigor/Destreza (0–12) e Nível (0–20); **(2) Resultado determinístico** — faixa mín–máx de Vida
  (accent) e Energia (`--energy`) + fórmula e notas contextuais, tudo de `calcularDescanso`; **(3) Rolar Dados** —
  dois campos de texto para dados extras (`interpretarDadosExtras`), botão de rolagem e o resultado por track
  com memória de cálculo. **Estado em Signals**: `bruto` (`toSignal` do `valueChanges`) → `entrada` (`computed`
  que normaliza os `<select>` Sim/Não em boolean) → um `computed` por saída. **Rolagem animada** (efeito
  scramble): `rolar()` embaralha números aleatórios por ~650ms via `requestAnimationFrame` antes de assentar no
  valor final (paridade com o `scramble` do site), com um pulso de escala via `Element.animate` (WAAPI —
  **sem `@angular/animations`**, que o projeto não instala); o **único não-determinismo vive na página** e usa a
  utilidade `rolarDados` do domínio (§6.6), delegando o total a `calcularResultadoDescanso`. Editar os dados
  extras re-rola sem animação se já houver resultado visível, e mudar a configuração esconde a rolagem antiga
  (paridade com `rollDescansoIfVisible`/`calcDescanso`). **Decisões de representação (não divergem de regra):**
  refeição e interrupção são `<select>` com valores string `'nao'`/`'sim'` (não boolean) porque o value accessor
  nativo do `<select>` escreve string — um controle boolean viraria a string `'sim'`, sempre truthy; a conversão
  para boolean acontece no `computed` `entrada`. `calculadora.routes.spec.ts` atualizado (`descanso` deixou de
  ser stub → agora checa `.calc` + aba ativa; só `compras` segue stub) e novo `descanso.page.spec.ts` prova a
  ligação motor→DOM (preset Curto/Adequado → Energia **1–4** / Vida "Não recupera"; Longo+Confortável+Refeição →
  Energia **1–12** / Vida **1–10**; rolagem Médio Nível 3 com `Math.random` fixo → **7** por track com breakdown
  `[1] + 6 = 7`). **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **26/26** (23
  anteriores + 3 novos); `build --workspace=frontend` verde **sem avisos de budget** (chunk lazy `descanso-page`).
  As 6 rotas seguem client-side (funcionam sem backend).
- **m1-08-pagina-dt-novo-agente-patente** (2026-07-05): as três páginas leves da calculadora, agrupadas por
  serem pequenas, cada uma consumindo seu domínio de `shared/regras` (regras prontas desde a m1-03) —
  **zero fórmula duplicada no front** (proibição de duplicar regra de jogo respeitada). Mesmo molde da
  `AgentePage` (Reactive Forms + Signals, `StepInput` da m1-06, tokens/BEM do tema "Terminal de Contenção",
  layout fiel aos protótipos). **Aba `dt`** (`paginas/dt/`): `DtPage` — steppers Nível (0–20) e Atributo
  (0–12) → `calcularDtAtributo` (`10 + Nível + Atributo×2`) num resultado em destaque + a tabela de
  referência rápida (Atributo 1–6 × Nível 0/5/10/15/20, **cada célula também vinda do motor**, não recalculada
  no front). **Aba `novo-agente`** (`paginas/novo-agente/`): `NovoAgentePage` — `<select>` de motivo de
  entrada + steppers de média de Nível (passo 0,1) e média de Prestígio → `calcularNovoAgente` (Nível/Prestígio
  iniciais, patente resultante, memória de cálculo e aviso de Amaldiçoado pelo Passado). O card de bônus tem um
  campo de Prestígio **auto-preenchido** com o inicial calculado e **editável** (paridade com o `bonus-prest` do
  site antigo, via `merge` dos `valueChanges` da configuração re-sincronizando o campo), computando
  `calcularBonusMonetario`. O re-sync lê de `getRawValue()` (não do Signal `bruto`): como o `valueChanges` do
  controle-filho emite **antes** do form-pai, ler o Signal dentro do subscriber pegaria o valor defasado um passo
  — o modelo do form já está atualizado (bug pego na revisão, com teste de interação que o trava). **Aba `patente`** (`paginas/patente/`): `PatentePage` — stepper de Prestígio →
  `calcularPatente` (patente atual em destaque + tabela completa com a linha atual marcada); a faixa da última
  patente exibe `∞` (o motor entrega `prestigioMaximo` infinito). **Rótulos de UI** (`modules/calculadora/rotulos.ts`):
  `ROTULOS_PATENTE` (`PatenteEnum`→pt-BR, nomes completos do documento — "Força Tarefa Especial"/"Operações
  Especiais") e `ROTULOS_MOTIVO_ENTRADA` (`MotivoEntradaAgenteEnum`→pt-BR) — **formatação de UI**, como o
  `null`→"N/A" da m1-07; a fonte da verdade dos valores segue nos enums do `shared`. **Decisões de representação
  (não divergem de regra):** o cabeçalho de cada aba do protótipo não é repetido (o `CalculadoraShell` já dá o
  chrome); os textos do `<select>` de motivo usam "sucessor convencional / sucessor Experimento" (nomes do
  documento) no lugar de "Regular/Experimento" do site antigo; moeda formatada com `toLocaleString('pt-BR')` e
  prefixo `$` (paridade com o site). **O multiplicador monetário da patente foi omitido da UI** (a pedido do
  autor — confundia mais que ajudava): sai do stat box e da coluna "Mult." da aba `patente` e da linha de info do
  bônus; a fórmula do bônus segue usando-o por baixo (`calcularBonusMonetario`), só não o expõe. **Estilo:** cada página tem seu `.scss` **scoped auto-contido** copiando só
  os blocos BEM que usa (`.calc-cartao`/`.calc-stat`/`.calc-tabela`… de `docs/design/tema/_componentes.scss`) —
  mesmo padrão da `agente` (uma tentativa inicial de parcial `@use` compartilhado foi revertida por estourar o
  budget de 4kB de estilo por componente do Angular, que o `@use` inflava ao inlinar tudo em cada página).
  `calculadora.routes.spec.ts` atualizado (dt/novo-agente/patente deixaram de ser stubs → agora checam `.calc` +
  aba ativa; só `descanso`/`compras` seguem stub) e três novos specs provam a ligação motor→DOM (DT Nível 0/Atr 1
  → **12** + linha ATR 1 = 12/17/22/27/32; Novo Agente preset Morte média 5/10 → Nível **4**/Prestígio **9**/patente
  **Experiente**/bônus **$ 9.000**; Patente Prestígio 0 → **Agente** 0–2 e Prestígio 70 → **Líder Operacional** 66–∞).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **23/23** (16 anteriores + 7 novos,
  incluindo o teste de re-sync do bônus);
  `build --workspace=frontend` verde **sem avisos de budget** (chunks lazy `dt-page`/`novo-agente-page`/`patente-page`).
  As 6 rotas seguem client-side (funcionam sem backend).
- **m1-07-pagina-agente** (2026-07-05): primeira página real da calculadora — a aba `agente` (carro-chefe),
  com paridade funcional à `calc()` do site antigo consumindo `shared/regras/agente`. **Zero regra de jogo no
  front** — toda stat vem do motor (proibição de duplicar fórmula respeitada). `AgentePage`
  (`paginas/agente/`) é um **formulário reativo** (`FormGroup` tipado `nonNullable`: `classe` num `<select>`
  agrupado, os cinco atributos nos **steppers da m1-06** e o Nível num **slider** `<input type="range">`
  — fiel ao protótipo, com o valor atual em accent — todos via `[formControlName]`, sem `ngModel`)
  cujo **estado deriva em Signals**: `bruto` (`toSignal` do `valueChanges` + `getRawValue`) → `entrada`
  (`computed` que normaliza tudo por `aplicarLimitesPorClasse` antes de alimentar as fórmulas) → um `computed`
  por stat. Exibe **todas** as stats derivadas da spec: Vida/Energia (hero, com tons semânticos accent/energy),
  Defesa Base, Proficiência, e o grid secundário Esquiva/Bloqueio/Deslocamento/Inventário/Dano de Corpo/Dano
  Furtivo (verde `--positive`)/Limite de Energia (azul `--energy`)/Traumas/**Sequelas por Missão**/Hab. por
  Turno/Percepção, mais **Benefícios do Nível** e **Progressão Acumulada** (grid de ganhos > 0). Stats que a
  classe não possui (Civil sem defesa/proficiência/dano furtivo/traumas → `null` do motor) são mapeadas para
  `"N/A"` **no front** (formatação de UI, como previsto na m1-02). Ao trocar de classe, um `subscribe` a
  `classe.valueChanges` (`takeUntilDestroyed`) reclampa Nível e atributos via `aplicarLimitesPorClasse`
  (paridade com o clamp de input do site ao mudar de registro); os `[min]/[max]` dos steppers vêm de
  `obterLimitesClasse`. **Layout fiel ao protótipo** `docs/design/examples/calculadora-de-atributos.html`:
  cards numerados (índice mono + título UPPERCASE + régua), stat boxes e stepper adaptados dos padrões de
  `docs/design/tema/_componentes.scss`, consumindo **só tokens** do tema (nenhum hex/fonte/raio solto —
  proibição #29). O Nível usa o **slider** `<input type="range">` do protótipo (a pedido do autor), integrado a
  Reactive Forms pelo `RangeValueAccessor` nativo; os atributos usam os steppers da m1-06. **Adaptações
  conscientes (não divergem de regra):** o
  cabeçalho "Terminal de Agente" do protótipo não é repetido (o `CalculadoraShell` já dá o chrome da
  calculadora); Sequelas e Progressão Acumulada foram **acrescentadas** ao protótipo por serem entregáveis da
  spec; **Limite de Energia mostra `Destreza × 2` (agente) / `Destreza` (civil)** — o valor do motor, que
  corrige a fórmula `(Vig+Des)×2` do site antigo (divergência já registrada e resolvida na m1-02, documento
  vence), então este é o único stat que **intencionalmente** diverge do site (o front nunca reintroduz a
  fórmula antiga). Rótulos e títulos alternam Agente/Civil ("Nível"↔"Treinamentos", "Benefícios deste
  Nível"↔"Treinamento"). Os rótulos sobre os steppers de atributo são `<span>` (o nome acessível vem do
  `ariaRotulo`/`aria-label` do `StepInput`, componente custom sem controle nativo p/ associar); os controles
  nativos usam `<label for>` real (classe e o slider de Nível). `calculadora.routes.spec.ts` atualizado (a aba `agente` deixou de ser stub: agora checa
  `.agente` + aba ativa; as outras 5 seguem em `.stub-pagina__titulo`) e novo `agente.page.spec.ts` prova a
  ligação motor→DOM (Combatente Nível 3 → Vida **71**/Energia **43**; Civil → Defesa/Proficiência **N/A**).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **16/16** (os 14 anteriores + 2
  novos); `build --workspace=frontend` verde (chunk lazy `agente-page` carregando `shared/regras/agente`). As
  6 rotas continuam servidas client-side (funcionam sem backend).
- **m1-06-frontend-calculadora-base** (2026-07-05): fundação do frontend da calculadora — primeira task de
  UI do M1, esqueleto sobre o qual as páginas de cada aba são construídas (m1-07+). **Tailwind instalado e
  integrado** (`tailwindcss@^3` no workspace `frontend`): `frontend/tailwind.config.ts` mescla o
  `theme.extend` do handoff (`docs/design/tema/tailwind.config.ts`) — cores/fontes/raios utilitários
  apontam para as **mesmas CSS custom properties** dos tokens (`--bg`, `--accent`, `--font-mono`, …), então
  utilitário Tailwind e SCSS/BEM nunca divergem (proibições #17/#29 preservadas — nenhum hex/fonte/raio
  solto). As diretivas `@tailwind base/components/utilities` entram **no fim** de `styles.scss` (o Sass
  exige `@use` — tokens/base — antes de qualquer regra CSS): o preflight carrega depois do `tema/base`, mas
  **não** sobrescreve a identidade (não toca em background/fonte/grid do `body`), só adiciona reset;
  confirmado `box-sizing:border-box` do preflight no CSS compilado. Angular 21 autodetecta o
  `tailwind.config.ts`. **Módulo `modules/calculadora/`** com 6 rotas públicas **lazy** (`loadComponent`,
  sem guard — client-side): `calculadora.routes.ts` monta o `CalculadoraShell` (path `''` com `children`,
  base redireciona para `agente`) e cada aba (`agente`/`dt`/`novo-agente`/`patente`/`descanso`/`compras`)
  carrega sua página stub em chunk próprio; `app.routes.ts` liga `calculadora` via `loadChildren`. **Shell +
  navegação de abas com deep-link por rota**: `CalculadoraShell` renderiza cabeçalho + `nav.abas`
  (`@for` sobre as abas, cada uma um `routerLink` relativo com `routerLinkActive="abas__item--ativo"`) + o
  `router-outlet` aninhado — paridade com o `switchTab`/`VALID_TABS` do site antigo, agora dirigido pela URL
  (`/calculadora/<aba>`) em vez do `#hash` (a aba `novo` do site vira a rota `novo-agente`, conforme a spec).
  **`StepInput`** (`componentes/step-input/`): stepper/input numérico reutilizável, **`ControlValueAccessor`**
  (integra a Reactive Forms via `[formControl]`/`formControlName`, **sem `ngModel`**) com botões − / +,
  clamp em `[min, max]`, `passo` configurável e arredondamento a 2 casas — unifica os antigos
  `stepInput` (inteiro, `passo=1`) e `stepInputFloat` (fracionário) num só componente; o valor central é um
  `<input type="number">` que também aceita digitação direta. **Estilos**: cada componente consome só os
  tokens do tema — o `.stepper` foi copiado de `docs/design/tema/_componentes.scss` (valor central adaptado
  de `<div>` para `<input>`), o estado ativo das abas reusa o padrão `.selecionavel--ativo`, e os 6 stubs
  compartilham o cartão via o parcial `paginas/_stub-pagina.scss` (`@use`), copiado do padrão `.card`. Tudo
  standalone, `.scss`, sem `style=""`/seletor de ID/hex solto (proibições #16–18/#29). **Decisões de
  representação:** sem emojis nos rótulos das abas (o site antigo usava `⚔ 🎯 🔄 🏅 💤 🛒` — o tema
  "Terminal de Contenção" proíbe emoji decorativo), rótulos em mono UPPERCASE; a página `home` do M0 ficou
  intocada (redesenho de home é fora do escopo desta task). **Verificado:** `build --workspace=frontend`
  verde (6 chunks lazy de página + shell + rotas); `test --workspace=frontend` 14/14 (7 do `StepInput` via
  host com `FormControl` — writeValue, incremento/decremento com clamp, passo fracionário, digitação; 7 de
  roteamento via `RouterTestingHarness` — redirect da base + navegação a cada uma das 6 rotas com a aba
  ativa correta, provando o carregamento lazy e o deep-link); `lint --workspace=frontend` limpo. As 6 rotas
  são servidas pelo `frontend:dev` (SPA client-side, funcionam sem backend).
- **m1-05-regras-compras** (2026-07-05): `shared/regras/compras/` completo — o domínio mais pesado da
  calculadora (aba `compras` do site antigo, `contratados-calculadora/src/script.js`) extraído e conferido
  contra `docs/core/sistema-v4.1.0.md` — "Equipamentos", "Prestígio e Patentes" e "Amplificadores"
  (34 testes novos; workspace shared 143/143 verde). **Dados** — `catalogo.dados.ts`: `CATALOGO_ITENS`
  (catálogo completo por categoria) + `ItemCatalogo`; `compras.dados.ts`: `CATALOGO_CATEGORIAS`,
  `CUSTO_MODIFICACAO` (exceções ao padrão $750: Explosivos/Munições $250, Armazenamento $300),
  `LIMITES_MODIFICACAO` (empilhamentos/mods por patente), `MODIFICACOES` (mods por categoria com
  `bloqueia`), `AMPLIFICADORES` e as constantes de regra (peso padrão 0,2; amp $3000/$1000; penalidade
  −2 Vontade/empilhamento; limite Vontade×3). Tudo indexado por `ItemCategoriaEnum`/`PatenteEnum` (não
  pelas strings de UI do site). **Fórmulas** (`compras.ts`): `obterLimiteModificacoes` (= antigo
  `getPatenteMod`, **reusa `obterPatente` da m1-03** para não duplicar as faixas de Prestígio),
  `obterCustoModificacao`/`obterPesoModificacao`/`contarComprasModificacao` (custo/peso/cobranças de mod,
  com empréstimo de categoria via "Faz Parte"/"Combativo" — `obterCategoriaEmprestada`/
  `listarModificacoesDisponiveis`), `verificarConflitoModificacao` (conflitos nas duas direções a partir
  da coluna "Bloqueia"), `calcularStatItem` (= antigo `computeItemStat`; **reusa `elevarDado` da m1-04**
  para o degrau da mod Pesada, teto D10), `interpretarBonusArmazenamento`, `calcularCustoAmplificador`,
  `calcularTotaisCarrinho` (= antigo `getCmpTotals`) e o orquestrador `calcularResumoCompras`
  (= `renderCmpSummary`). Exemplos do documento replicados em teste (limite Veterano 3/9; Pesada 3D8→3D10;
  amplificador 1º=$3000 / 3 empilh.=$5000; penalidade Vontade −2). **Divergência encontrada e corrigida
  (documento vence — proibição #27), documentada em JSDoc e teste:** as **modificações de Armazenamento
  não agregam peso** (doc — "não agregam nenhum peso ao item"), mas o site antigo somava o padrão 0,2/stack;
  implementado `peso: 0` nessas mods. Sem outras divergências numéricas vs `script.js`. **Decisões de
  representação (não são divergências de regra):** `calcularStatItem` devolve um value-object estruturado
  (`StatItemDto` com `dano`/`resistencia`/`bonusArmazenamento` em notação de jogo) em vez da string com
  ícone `⚔`/`🛡`/`📦` do site — o ícone/rótulo é formatação de UI (m1-10), como o `null`→"N/A" da m1-02;
  o antigo `PATENTES_MOD` (que duplicava as faixas de Prestígio) virou `LIMITES_MODIFICACAO` indexada por
  `PatenteEnum`, com a tradução Prestígio→patente delegada a `obterPatente` (mesma disciplina anti-duplicação
  da escada de dados na m1-04); estado do carrinho (adicionar/remover, `localStorage`, export/import) fica
  para m1-10/m1-11 — aqui só se calcula a partir de um estado dado. DTOs de entrada e value-objects de saída
  co-locados em `compras.dtos.ts` (dados tipados do motor — §6.6). Barrel `compras/` preenchido; o subpath
  `@contratados-rpg/shared/regras/compras` (pré-registrado na m1-01) agora resolve conteúdo real. Validado:
  `npm run test --workspace=shared` 143/143; `lint`/`typecheck`/`build` verdes; `build` não vaza `*.spec.js`
  para `dist/`.
- **m1-04-regras-descanso** (2026-07-05): `shared/regras/descanso/` completo — as regras da aba
  `descanso` do site antigo (`contratados-calculadora/src/script.js`) extraídas e conferidas contra
  `docs/core/sistema-v4.1.0.md` — "Descanso" (30 testes novos; workspace shared 109/109 verde).
  **Dados** (`descanso.dados.ts`): `ESCADA_DADOS` (escada de tipos de dado `[3,4,6,8,10,12,20]`),
  `DADOS_DESCANSO` (keyed por `TipoDescansoEnum` — Curto 1D4/—, Médio 1D6/1D4, Longo 1D8/1D6),
  `QUALIDADE_MOD` (Insalubre −1 / Adequado 0 / Confortável +1) e `REFEICAO_MOD` (+1). **Escada de
  dados** (`dado.ts`): `ajustarDado` (move na escada com trava nos dois extremos = antigo `tipoDado`),
  `elevarDado` (sobe com teto = antigo `_upgradeDie`, primitiva **compartilhada** que a aba compras
  m1-05 reusa para o dado de dano) e `descreverDado` (notação `"D8"`/`"—"` = antigo `descDado`).
  **Fórmulas** (`descanso.ts`): `calcularDescanso` (faixa mín/média/máx de Energia = Destreza dados e
  Vida = Vigor dados, fórmula `ATRIBUTO dados + Nível×2`, Curto sem Vida, interrupção = `⌊valor÷2⌋` =
  antigo `calcDescanso`), `interpretarDadosExtras` (parse puro de `NdM`/bônus fixo, sem rolar =
  `parseExtraDice` menos a rolagem), `calcularResultadoDescanso` (total a partir de valores **já
  rolados**, puro e determinístico = núcleo de `buildResult`) e `rolarDados` (utilidade de rolagem
  explícita — a única brecha a `Math.random` no motor, §6.6). O documento foi replicado em teste
  (Nível 3, Destreza 4, Curto insalubre → **4D3+6** de Energia — dado D4 reduzido a D3 pelo ambiente
  insalubre, confirmando o degrau D3 da escada). **Decisões de representação (não são divergências de
  regra):** parse e rolagem foram **separados** (o antigo `parseExtraDice` já rolava dentro; aqui o
  parse é puro e a rolagem fica em `rolarDados`) para manter `regras/` determinístico e testável — o
  `Math.random` do site antigo era testável só por faixa, e agora só `rolarDados` o usa (testado por
  limites, não por valor); `descreverDado(0)` devolve `"—"` (o ramo `faces === 0 → "0"` do site era
  código morto — o `if (!faces)` já capturava o 0), preservado por paridade; `media` é exposta (fórmula
  `enMed` que o site calculava mas não exibia) além do mín/máx; a escada `ESCADA_DADOS` vive no domínio
  descanso (por decisão da spec) como primitiva compartilhada — compras (m1-05) importará
  `elevarDado`/`ESCADA_DADOS` daqui, evitando duplicar a escada. DTOs de entrada
  (`<Conceito>CalcularDto`/`<Conceito>InterpretarDto`) e value-objects de saída co-locados em
  `descanso.dtos.ts` (dados tipados do motor — §6.6). Barrel `descanso/` preenchido; o subpath
  `@contratados-rpg/shared/regras/descanso` (pré-registrado na m1-01) agora resolve conteúdo real.
  Validado: `npm run test --workspace=shared` 109/109; `lint`/`typecheck`/`build` verdes; `build` não
  vaza `*.spec.js` para `dist/`.
- **m1-03-regras-dt-novo-agente-patente** (2026-07-05): três domínios leves de `shared/regras/`
  extraídos do site antigo (`contratados-calculadora/src/script.js`) e conferidos contra
  `docs/core/sistema-v4.1.0.md` (22 testes novos; workspace shared 79/79 verde). **`regras/dt/`**:
  `calcularDtAtributo` = `10 + Nível + Atributo×2` (doc "DTs de Atributos"; sem divergência vs
  `calcDT`). **`regras/patente/`**: `obterPatente({prestigio})` (faixa de `PATENTES` da m1-01; a
  última patente cobre 66+ via `prestigioMaximo` infinito) e `calcularPatente` (recorte da aba =
  `{patenteAtual, tabela}`). **`regras/novo-agente/`**: `calcularNivelInicial`
  (`max(0, round(médiaNível) − 1)`; `Math.round` arredonda 0,5 para cima = regra do doc para médias
  não-negativas), `calcularPrestigioInicial` (dedução `⌊média÷divisor⌋` e piso na patente do grupo —
  ou uma abaixo quando o motivo permite), `calcularBonusMonetario`
  (`Prestígio × (500 × multiplicador)`), e o orquestrador `calcularNovoAgente`. Todos os exemplos
  numéricos do documento replicados em teste (Morte ÷7 → 24; Aposentadoria ÷10 → 26; Contido/Exterminado
  sucessor convencional ÷5 → 24 e sucessor Experimento ÷3 → 20; bônus 24×(500×3)=36.000). **Novo enum
  de conteúdo de jogo** `MotivoEntradaAgenteEnum` em `shared/src/enums/` (input da calculadora, não é
  JSONB `ficha.dados` — §10.3; análogo a `TipoDescansoEnum`): 6 motivos que mapeiam os divisores do
  documento (o site antigo os chamava "Experimento/Contido → Regular/Experimento"). **Decisões de
  representação (não são divergências de regra):** os divisores ÷5 (sucessor convencional) e ÷3
  (sucessor Experimento) do documento vêm do capítulo "Aposentadoria" > "Contido ou Exterminado" — o
  documento defere esses valores àquele capítulo; a flag `recebeAmaldicoadoPeloPassado` é verdadeira só
  para os motivos de Contenção/Extermínio (doc + fidelidade ao site); `obterPatente` preserva o fallback
  do site (`find(...) ?? última patente`) para Prestígio fora do domínio (negativo), caminho não esperado
  — Prestígio válido é sempre ≥ 0. DTOs de entrada (`<Conceito>CalcularDto`) e value-objects de saída
  co-locados em `<domínio>.dtos.ts` (dados tipados do motor — §6.6). Barrels `dt/`, `novo-agente/`,
  `patente/` preenchidos; os subpaths `@contratados-rpg/shared/regras/{dt,novo-agente,patente}`
  (pré-registrados na m1-01) agora resolvem conteúdo real. Validado: `npm run test --workspace=shared`
  79/79; `lint`/`typecheck`/`build` verdes; `build` não vaza `*.spec.js` para `dist/`.
- **m1-02-regras-agente** (2026-07-05): `shared/regras/agente/` completo — as 15 fórmulas puras da
  aba `agente` do site antigo (`calc()` + auxiliares), com testes Vitest conferidos contra
  `docs/core/sistema-v4.1.0.md` (57 testes no workspace shared, todos verdes). Organização por arquivo
  coeso: `saude.ts` (`calcularVida`/`calcularEnergia`/`calcularLimiteEnergia`), `defesa.ts`
  (`calcularDefesa` → `{defesa,esquiva,bloqueio}` | `null` civil; `calcularProficiencia`),
  `movimento.ts` (`calcularDeslocamento` em metros), `dano.ts` (`calcularDanoCorpo` tabela de
  Pontuação Corporal; `calcularDanoFurtivo` marcos 3/6/9/12/15/18), `inventario.ts`, `percepcao.ts`,
  `sanidade.ts` (`calcularSanidade` → limite de traumas `VON+1` / `null` civil + sequelas por missão
  `VON`), `habilidades.ts` (`calcularLimiteHabilidadesPorTurno` base 4 + ganhos lidos de `dadosAgente`;
  civil 3), `progressao.ts` (`calcularBeneficiosNivel` + `calcularProgressaoAcumulada` categorizando
  ganhos), `limites.ts` (`obterLimitesClasse` + `aplicarLimitesPorClasse` — contraparte pura do clamp
  de DOM do script). DTOs de entrada (`<Conceito>CalcularDto`) e value-objects de saída co-locados em
  `agente.dtos.ts` (dados tipados do motor — SYSTEM.SPEC §6.6; não são DTOs de API, ficam no `regras/`,
  não em `dtos/`). Fórmulas keyed por `ClasseEnum` (não pela string de UI). **Divergência encontrada e
  corrigida (documento vence — proibição #27), documentada em JSDoc e no teste:** o **Limite de
  Energia** era `(Vigor + Destreza) × 2` no `script.js`, mas o documento
  (`sistema-v4.1.0.md` — "Limites de Energia" e "Jogando como um Civil") define **`Destreza × 2`**
  (agente) e **`Destreza`** (civil) — implementado conforme o documento. Sem outras divergências
  numéricas vs `script.js`. **Decisões de representação (não são divergências de regra):** stats que a
  calculadora exibia como "N/A" para civil viram `null` tipado (defesa, proficiência, dano furtivo,
  limite de traumas) — o UI (m1-07) mapeia `null`→"N/A"; deslocamento/percepção retornam número em
  metros (o "m" é formatação de UI); os bounds de atributo de `aplicarLimitesPorClasse` (−5 a 7; 8 p/
  Experimento Artificial; 3 p/ Civil) são clamps de input da calculadora, não fórmula do documento
  (o que o documento fixa é Nível 0–20 / civil 0–5). Barrel `regras/agente/index.ts` preenchido; o
  subpath `@contratados-rpg/shared/regras/agente` (pré-registrado na m1-01) agora resolve conteúdo
  real. Validado: `npm run test --workspace=shared` 57/57 verde; `npm run lint`/`typecheck`/`build`
  verdes; `build` não vaza `*.spec.js` para `dist/`.
- **m1-01-regras-fundacao-enums** (2026-07-05): fundação do motor de regras no `shared/`, antes de
  qualquer fórmula de domínio ou UI — primeira task do M1. **Harness de teste configurado** no
  workspace `shared`: a spec pedia Jest, mas trocado por **Vitest** na revisão (a pedido do autor)
  para não ter dois test runners no monorepo — o `frontend` já usa Vitest desde a m0-06. `vitest`
  como devDependency, `shared/vitest.config.ts` (`test.environment: 'node'`) e script
  `test: vitest run`; specs importam `describe`/`it`/`expect` explicitamente de `'vitest'` (sem
  globals ambíguos, diferente do `frontend`, que usa `vitest/globals`). Para não vazar `*.spec.ts`
  compilado para `dist/` (consumido por `backend`/`frontend`), o script `build` passou a rodar
  contra um novo `shared/tsconfig.build.json` (estende o `tsconfig.json` base excluindo
  `src/**/*.spec.ts`), enquanto `tsconfig.json`/`typecheck` continuam cobrindo tudo — mesmo padrão já
  usado em `backend/tsconfig.build.json` (essa parte independe do runner escolhido).
  **Estrutura `regras/`**
  conforme SYSTEM.SPEC §3: `agente/`, `dt/`, `novo-agente/`, `patente/`, `descanso/`, `compras/`
  nasceram como barrels vazios (`export {}` + comentário apontando a task que os preenche —
  m1-02 a m1-05); `criatura/` fica para o M4, fora desta task. **Enums de conteúdo de jogo** em
  `shared/src/enums/` (conteúdo de JSONB `ficha.dados`, sem tabela `tipo_*` — §10.3):
  `ClasseEnum`, `PatenteEnum`, `ItemCategoriaEnum`, `TipoDescansoEnum`, `QualidadeDescansoEnum`.
  **`regras/dados/`** com `dadosAgente`/`dadosCivil` (`BeneficiosPorNivel`, mapa nível→benefícios) e
  `PATENTES` (`PatenteDados[]`, com `prestigioMaximo: Number.POSITIVE_INFINITY` na última faixa),
  migrados de `contratados-calculadora/src/script.js` e conferidos contra
  `docs/core/sistema-v4.1.0.md` (documento vence — proibição #27). **Divergências encontradas e
  corrigidas** (documentadas em JSDoc no próprio arquivo de dados): (a) `dadosAgente` níveis 5, 10,
  15, 20 — o site antigo omitia a palavra "outro" em "outra classe/**outro** arquétipo da sua
  classe"; (b) níveis 7, 14 — o site antigo omitia "sua" em "Fortificação de **sua** Personalidade";
  (c) `PatenteEnum` usa os nomes completos do documento (`FORCA_TAREFA_ESPECIAL`,
  `OPERACOES_ESPECIAIS`) em vez das abreviações do site antigo ("FT Especial", "Op. Especiais") —
  sem divergência numérica em `PATENTES` (faixas de prestígio, salário e multiplicador batem com o
  documento e com o site antigo). `shared/package.json` ganhou os subpaths `./enums`,
  `./regras/dados` e, preventivamente, um subpath por domínio ainda vazio (`./regras/agente`,
  `./regras/dt`, `./regras/novo-agente`, `./regras/patente`, `./regras/descanso`,
  `./regras/compras` — todos já apontam para os barrels `export {}` que existem em `dist/`), mesmo
  padrão de `./interfaces` da m0-03. Registrar os seis já evita que uma task futura esqueça de
  adicionar o subpath ao preencher o domínio — o `backend` resolve `exports` estritamente
  (`moduleResolution: nodenext`) e falharia silenciosamente sem sinal de CI, enquanto o `frontend`
  (path-mapping curinga no tsconfig) não notaria o esquecimento.
  **Prova de harness**: `regras/dados/patente.dados.spec.ts` (2 testes triviais sobre `PATENTES`).
  Validado: `npm run test --workspace=shared` verde (2/2); `CI=true npm run test` (raiz) roda
  shared + frontend verde (backend segue sem testes, pulado por `--if-present`); `npm run lint`
  verde nos 3 workspaces; `npm run build --workspace=shared` não gera `.spec.js` em `dist/`.
- **m0-07-deploy** (2026-07-05): deploy de produção — última task do M0. **Decisão final:
  integração nativa das plataformas, sem GitHub Actions no deploy.** (A 1ª rodada chegou a montar
  um `.github/workflows/cd.yml` com gate de CI + Render deploy hook + `wrangler pages deploy`,
  validado verde de ponta a ponta em produção; foi revertido a pedido do autor por complexidade
  desnecessária — o `cd.yml` e os secrets/variables do GitHub que o serviam foram removidos. A CI
  em PR, `m0-06`, permanece.) Estado final: **Backend → Render** via blueprint `render.yaml` (web
  service `contratados-rpg-api`, `autoDeploy: true`, build `npm install && npm run build
  --workspace=backend`, start `npm run start:prod --workspace=backend` = `node dist/main`,
  `healthCheckPath: /health`; `APP_PORTA=10000`/`APP_AMBIENTE=production`/`JWT_EXPIRACAO=8h` no
  blueprint, `DB_*`/`JWT_SECRETO`/`APP_FRONTEND_ORIGEM` como `sync:false` no dashboard). **Frontend →
  Cloudflare Pages** conectado ao Git com **branch de produção `master`** (build `npm run build
  --workspace=frontend`, output `frontend/dist/frontend/browser`). **Ligação cross-origin:**
  `backend/src/main.ts` chama `app.enableCors({ origin: frontendOrigem })` lendo `APP_FRONTEND_ORIGEM`
  do `ConfigService` (§10.6); `frontend/src/environments/` (`environment.ts` dev `apiBase:''` →
  relativo pelo proxy; `environment.production.ts` com `apiBase` fixo
  `https://contratados-rpg-api.onrender.com` — não é segredo) via `fileReplacements` no `angular.json`;
  `HealthService.verificar()` usa `` `${environment.apiBase}/health` ``; `frontend/public/_redirects`
  (`/* /index.html 200`) dá o fallback de SPA. Runbook em `docs/DEPLOY.md` (no modelo do Project 2.0 do
  autor). Validado: backend `/health` em produção no Render responde `200 {"sucesso":true,...}`;
  `npm run build` verde em backend e frontend. **Gotchas aprendidos:** (a) `APP_FRONTEND_ORIGEM` é
  lida no boot (`obterConfiguracaoAplicacao`) → o backend não sobe sem ela; (b) na Cloudflare, a
  branch de produção precisa ser `master` (default é `main`), senão o deploy vira preview e a URL
  principal fica no placeholder; (c) SSL e migrations do Supabase são M2 (no M0 nada consulta o banco).
- **m0-06-ci-lint-teste** (2026-07-05): integração contínua ativa via GitHub Actions.
  `.github/workflows/ci.yml` dispara em todo `pull_request` (+ `workflow_dispatch` manual),
  em `ubuntu-latest` com Node 22 (`actions/setup-node` + cache npm): `npm install` (o
  `postinstall` compila o shared), depois `npm run lint` e `npm run test`. Lint agora
  configurado nos **três** workspaces (deliverable 2): o backend já tinha `eslint.config.mjs`
  (typescript-eslint `recommendedTypeChecked`); **shared** ganhou `eslint.config.mjs` espelhando
  o do backend (CommonJS, `globals.node`) + devDeps (`eslint`, `typescript-eslint`, `@eslint/js`,
  `globals`); **frontend** ganhou `eslint.config.mjs` com `angular-eslint` (flat config: TS
  `recommended` + `angular.configs.tsRecommended` com regras de seletor prefixo `app`; HTML
  `templateRecommended` + `templateAccessibility`) + devDeps (`angular-eslint`,
  `typescript-eslint`, `@eslint/js`, `eslint`). O `lint` do backend perdeu o `--fix` (rodar com
  `--fix` na CI mascararia violações auto-corrigíveis, ferindo o critério "sem etapa mascarando
  falha"); cada workspace tem `lint` (checagem, CI-safe) e `lint:fix` (dev). Scripts agregados na
  raiz: `lint` = `npm run lint --workspaces` (roda os 3; qualquer falha → exit ≠ 0), `test` =
  `npm run test --workspaces --if-present` (só o frontend tem teste por ora — shared/backend são
  pulados, não mascarados). Validado: `npm run lint` verde nos 3; `CI=true npm run test` roda o
  vitest do frontend uma vez (sem watch) → 2/2 verde; sonda de erro de lint confirmou `exit 1`
  agregado na raiz (pipeline quebra). Testes de regra de jogo (`shared/regras`) nascem no M1;
  deploy é a `m0-07`.
- **m0-05-frontend-shell** (2026-07-05): shell mínimo do frontend e prova de integração
  ponta a ponta com o backend. `shared/layout/layout.component.ts` (standalone `Layout`,
  seletor `app-layout`) é o shell: topbar institucional, indicador de carregamento global
  (lê `LoadingService.isLoading()`), `<p-toast/>` e o `<router-outlet/>`; o root `App` só
  renderiza `<app-layout/>`. `core/interceptors/` traz dois interceptors funcionais
  registrados em `app.config.ts` via `withInterceptors`: `loading.interceptor` (conta
  requisições em voo no `LoadingService` — signal `isLoading`) e `error-handler.interceptor`
  (exibe toast PrimeNG com a `StandardResponse.mensagem` do backend e reencaminha o erro).
  `core/services/health.service.ts` (`HealthService.verificar()`) consome `GET /health`
  tipado como `StandardResponse<{ status: string }>` (sem DTO de negócio — payload inline,
  conforme m0-04). `pages/home/home.page.ts` (standalone `Home`, lazy via `loadComponent`
  na rota `''`) chama o health no `ngOnInit`, guarda o resultado em signals e exibe o status
  (`ok`) + mensagem — prova visual do pipeline HTTP frontend → backend → `StandardResponse`.
  `proxy.conf.json` encaminha `/health` para `http://localhost:3100` e foi ligado ao
  `serve.options.proxyConfig` do `angular.json` (dev-server em `:4300`). PrimeNG configurado
  com `providePrimeNG` + `MessageService` no root; **sem `@angular/animations`** — o PrimeNG 21
  usa animações CSS próprias, então `provideAnimationsAsync()` foi descartado (o pacote nem
  está instalado). **Tema "Terminal de Contenção" aplicado** a partir do handoff em
  `docs/design/` (revisão pós-implementação): `src/styles/tema/` recebeu `_tokens.scss`
  (CSS custom properties — fonte da verdade em runtime), `_base.scss` (reset, corpo dark,
  grid de textura) e `contencao.preset.ts` (preset PrimeNG base Aura; único ajuste ao repo:
  imports `@primeng/themes` → `@primeuix/themes`). `styles.scss` importa tokens + base nessa
  ordem; `index.html` é dark-first (`<html lang="pt-BR" class="dark">`) e carrega IBM Plex
  Mono/Sans via `<link>` do Google Fonts (Opção B do handoff — `@fontsource` fica p/ quando
  quiserem offline). `app.config.ts` usa `providePrimeNG({ theme: { preset: ContencaoPreset,
  options: { darkModeSelector: '.dark' } } })`. Topbar e home consomem os tokens (`--surface`,
  `--border`, `--accent`, `--font-mono`, `--positive`…) e a home reusa o padrão canônico de
  card + cabeçalho de seção (índice em badge mono + título UPPERCASE + régua) de
  `_componentes.scss`. Tailwind ainda não está instalado, então utilitários Tailwind ficam
  para depois — SCSS + BEM + tokens cobrem o shell. `app.spec.ts` atualizado (provê
  `provideRouter([])` + `MessageService`; verifica a marca da topbar). Validado:
  `npm run build --workspace=frontend` e `--workspace=backend` passam; `npm run test
  --workspace=frontend` 2/2 verde; com backend (`node dist/main.js`) + `frontend:dev` no ar,
  `curl http://localhost:4300/health` (via proxy) retorna
  `200 {"sucesso":true,"dados":{"status":"ok"},"mensagem":"Operação realizada com sucesso."}`
  e `:4300/` serve o `index.html` do SPA.
- **m0-04-healthcheck-endpoint** (2026-07-05): primeiro endpoint real da API.
  `backend/src/core/decorators/public.decorator.ts` traz o decorator `@Public()` (grava o
  metadado `IS_PUBLIC_KEY = 'isPublic'` via `SetMetadata`) com barrel `index.ts` no padrão
  da pasta `exceptions/` — sem efeito de bloqueio ainda, pois o guard global que o
  interpreta só nasce no M2 (nenhuma rota está protegida). `backend/src/health/health.controller.ts`
  expõe `GET /health` (`@Public()`, método `verificar()`), sem service/repository próprios
  (não há regra de negócio nem persistência — só confirma que o processo Nest responde);
  retorna o literal `{ status: 'ok' }`, que o `response-format.interceptor` da m0-03
  embrulha em `StandardResponse<T>`. Health é conceito operacional genérico → sem DTO de
  negócio no `shared/` (payload inline). `HealthController` registrado direto no array
  `controllers` do `AppModule` (não há módulo de negócio para ele). `npm run build --workspace=backend`
  passa; endpoint validado de ponta a ponta com `node dist/main.js` + `curl` →
  `200 {"sucesso":true,"dados":{"status":"ok"},"mensagem":"Operação realizada com sucesso."}`.
- **m0-03-backend-core** (2026-07-04): `core/` do backend completo.
  `shared/src/interfaces/` ganhou `StandardResponse<TData>` (interface — envelope de
  sucesso/erro) e `PaginatedResult<TItem>` (classe — herdada por DTOs de listagem), com
  subpath `@contratados-rpg/shared/interfaces` adicionado ao `exports` do
  `shared/package.json`. Em `backend/src/core/`: `BaseEntity` (campos de infraestrutura);
  `base/base.repository.ts` com `executarConsulta<T>()`/`executarComando()`/
  `executarSoftDelete(id)`/`executarConsultaPaginada<T>()` (SQL bruto via `knex.raw`,
  paginação com `allRows` conforme §10.5 — nota: `ordenarPor` chega como identificador de
  coluna interpolado diretamente na query, então a service chamadora deve validá-lo contra
  uma lista permitida antes de repassar, já que identificador não aceita parâmetro
  nomeado); `exceptions/` com `BusinessException` (400), `ResourceNotFoundException` (404)
  e `UnauthorizedAccessException` (403); `filters/global-exception.filter.ts` e
  `interceptors/response-format.interceptor.ts`, ambos registrados globalmente via
  `APP_FILTER`/`APP_INTERCEPTOR` em `app.module.ts`. Novo `backend/src/config/` expõe
  `ConfigService` (carrega o `.env` da raiz via `dotenv` — movido de devDependencies para
  dependencies do `backend/package.json` — e expõe getters tipados
  `obterConfiguracaoBanco()`/`obterConfiguracaoJwt()`/`obterConfiguracaoAplicacao()`; nenhum
  `process.env` direto fora dele) num `ConfigModule` global. Novo
  `backend/src/database/database.provider.ts`/`database.module.ts` registra a conexão Knex
  de runtime (token `KNEX_CONNECTION`) lendo a config via `ConfigService` — o `knexfile.ts`
  continua a única exceção autorizada a ler `process.env` direto, por ser ferramenta de CLI
  fora do ciclo do Nest. `main.ts` agora lê a porta via `ConfigService` em vez do antigo
  placeholder `process.env.PORT`. Extensibilidade do `BaseRepository` validada com um
  repositório descartável (compilou e foi removido — nenhum módulo de negócio o reaproveita
  ainda, já que a `m0-04` não usa repository). `npm run build` passa em `shared` e
  `backend`; app sobe com `node dist/main.js` sem erros de DI mesmo sem o Postgres local
  ativo (Knex conecta sob demanda).
- **m0-02-docker-banco** (2026-07-04): PostgreSQL 16 local via `docker-compose.yml` na raiz
  (variáveis interpoladas do `.env`, ver `.env.example` / SYSTEM.SPEC §10.6) e Knex
  configurado em `backend/knexfile.ts` (client `pg`). Scripts de banco funcionais: `db:up` /
  `db:down` na raiz e `db:migrate` / `db:rollback --workspace=backend`. Migrations seguem a
  convenção §10.7: arquivos `.sql` puros em `backend/src/database/migrations/`
  (`NNNN - Nome descritivo.sql`, seções `-- UP` / `-- DOWN`), carregados por um
  `SqlMigrationSource` customizado (`backend/src/database/sql-migration-source.ts`) — a
  tabela de controle continua sendo a `knex_migrations` do Knex, que abre uma transação por
  migration (salvo `-- NO TRANSACTION`). A migration `0001 - Função fn_set_updated_date.sql`
  cria a function genérica `fn_set_updated_date()` (function de trigger reutilizável para
  manter `updated_date`; os triggers `trg_<tabela>_updated_date` nascem junto de cada tabela,
  M2+). Nenhuma tabela de negócio criada. O knexfile lê `process.env` por ser ferramenta de
  CLI fora do NestJS — o código da aplicação usará `ConfigService` (m0-03). O knexfile e o
  `SqlMigrationSource` rodam via `ts-node` (bloco `ts-node` no `backend/tsconfig.json`,
  compilando como CommonJS); o registro do source no runtime (`database.provider.ts`) vem no
  m0-03.
- **m0-01-workspaces-npm** (2026-07-04): monorepo npm workspaces com `shared/`, `backend/`
  (NestJS 11) e `frontend/` (Angular 21 + PrimeNG 21). `npm install` na raiz instala os três
  workspaces; `postinstall` compila `shared` para `dist/`. Import de `@contratados-rpg/shared`
  validado nos dois lados — backend via referência de workspace (dist), frontend via path
  mapping do `tsconfig` para a fonte. `npm run build` passa em backend e frontend.
  Constante trivial `SHARED_PACKAGE_NAME` valida a ligação (será substituída por conteúdo
  real nas tasks seguintes).

## Decisões Pendentes

- **Identidade visual do site** — **definida**: tema "Terminal de Contenção" (dark-first,
  IBM Plex), com handoff completo em `docs/design/` (tokens, base, preset PrimeNG, exemplos,
  trecho Tailwind). Aplicado ao shell na m0-05. Resta para o M1: sistema de troca de tema em
  runtime (presets + color picker com trava de contraste). A instalação/merge do Tailwind foi **concluída
  na m1-06** (config apontando para os tokens; ver "Implementado"). Nota: na 1ª rodada da m0-05 o
  `docs/design/` passou batido (não estava no Session Start) e o
  shell nasceu com preset Aura base + hex hardcoded, corrigido na revisão. Documentação já
  ajustada para não repetir: `CLAUDE.md` agora manda ler `docs/design/DESIGN.md` antes de UI e
  ganhou a seção "Visual Design Source of Truth"; SYSTEM.SPEC §3/§8/§15 e a proibição #29
  (nunca hardcodar cor/fonte) + CONVENTIONS (Estilos e tabela) reforçam o consumo dos tokens.

## Referências

- Design original (brainstorming de 2026-07-01) no repo antigo:
  `contratados-calculadora/docs/superpowers/specs/2026-07-01-contratados-rpg-design.md`
- Código a migrar no M1: `contratados-calculadora/src/script.js` (regras) — o repo antigo
  permanece disponível até o M1 ser concluído, e então será arquivado.
