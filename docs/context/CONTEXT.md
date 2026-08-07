# CONTEXT.md — Painel do Projeto

> **Última revisão:** 2026-08-07 · **Última decisão registrada:** o guia de criação de ficha
> (`m3-57`–`m3-59`) também atende `/fichas/nova` (acervo, sem campanha) — `FichaCriarDialog` foi
> removido do código, era o último consumidor
>
> Este arquivo diz **o que é verdade agora**. Ele é **reescrito**, nunca acrescido — teto de
> ~400 linhas. O relato de *como se chegou aqui* está em [`HISTORY.md`](HISTORY.md).
>
> Vizinhos: [`PROBLEMS.md`](PROBLEMS.md) (o que está quebrado) ·
> [`MEMORY.md`](MEMORY.md) (onde fica o quê) · [`IDEAS.md`](IDEAS.md) (o que ainda não é sistema) ·
> [`HISTORY.md`](HISTORY.md) (o que aconteceu e por quê).

---

## 1. Próxima Task

Nenhuma task de milestone aberto está explicitamente encadeada; a fila do backlog abaixo é a
referência. O trio do guia de criação (`m3-57` base, `m3-58` melhorias de nível, `m3-59`
equipamento inicial) **concluiu** — as três specs estão em `docs/specs/done/`; o que o guia faz
hoje de ponta a ponta está descrito na seção 4, em "Guia de criação de ficha". Registrado em
`PROBLEMS.md` (`P-012`, `CONTORNADO`): o pacote de habilidades **de criação** (Nível/Treinamento 0)
do documento — separado da tabela de progressão por nível e nunca modelado em `shared/regras` —
não tem consumidor no guia; contorno via edição livre da ficha (`m3-13`).

`m2-18`/`m2-19`/`m2-20`/`m2-21` fecharam a frente de redesenho do painel de campanhas —
`/painel/:id` tem layout dedicado para mestre e para jogador. Fica **em aberto, por decisão do
autor**: um recorte de UI pensado especificamente para o **mobile** da visão do jogador (a `m2-21`
só adaptou o visual de desktop).

### Fila do backlog (`docs/specs/backlog/`)

| Spec | Frente | O que é |
|---|---|---|
| `m3-53` | ficha | exportar ficha em PDF fiel ao tema |
| `m3-61` | ficha | cor de tema por ficha |
| `m3-62` | ficha | imagem/avatar da ficha (blob storage: **Cloudflare R2**, fixado na spec) |

Milestones ainda não abertos: `m4-ficha-criatura-npc`, `m5-guia-missao`, `m6-gestao-usuarios-papeis`.

---

## 2. Estado Geral

Monorepo npm workspaces (`shared/`, `backend/`, `frontend/`) rodando de ponta a ponta: Angular 21
SPA → NestJS 11 REST + Socket.IO → PostgreSQL 16. **M0, M1 e M2 concluídos; M3 (ficha de jogador)
em fase de refino avançado** — a ficha lê, edita, rola dados, persiste e sincroniza em tempo real.

Deploy em produção por **integração nativa das plataformas**, sem GitHub Actions no deploy: push em
`master` → Render (backend) e Cloudflare Pages (frontend) puxam do Git sozinhos; banco no Supabase.
O GitHub Actions só roda **CI** (lint + testes nos 3 workspaces em todo PR).

**Suítes:** shared 532 testes fonte aprovados (o comando completo ainda coleta `dist`, `P-011`) ·
backend 170/170 · frontend 733/**735** — as 2 falhas são conhecidas e pré-existentes, ver
[`PROBLEMS.md`](PROBLEMS.md) `P-001`/`P-010`. `npm run lint` **não fecha limpo**
hoje em nenhum dos dois workspaces (frontend/backend) — falhas pré-existentes não relacionadas a
nenhuma task recente, ver `PROBLEMS.md` `P-009`.

---

## 3. Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, `core/`, CI, deploy) | **concluído** |
| M1 | Calculadora com paridade | **concluído no código** (`m1-01`…`m1-20`). Restam 2 passos **operacionais** de plataforma — ver `PROBLEMS.md` `P-006` |
| M2 | Auth + Campanhas | **concluído**, incluindo o redesenho do painel (`m2-01`…`m2-09` + extensões `m2-10`…`m2-17`; `m2-18` lista, `m2-19` detalhe/mestre, `m2-20` detalhe/jogador, `m2-21` abas + Rolagens na lateral + menu de ficha do jogador) |
| M3 | Ficha de Jogador | **em andamento** — CRUD, editores, tempo real e rolagens prontos; guia de criação completo (`m3-57`/`m3-58`/`m3-59` — base, melhorias de nível, equipamento inicial); faltam `m3-53` e `m3-61`/`m3-62` |
| M4 | Ficha de Criatura/NPC | não iniciado |
| M5 | Guia de Missão | não iniciado |
| M6 | Gestão de Usuários e Papéis | não iniciado |

---

## 4. O Que o Sistema Faz Hoje

> Catálogo por capacidade. O detalhe task a task (o **porquê** de cada decisão) está no
> `HISTORY.md` — busque pelo código da task.

### Motor de regras — `shared/regras/` (funções puras, zero dependências)

Nove domínios implementados e testados contra `docs/core/sistema-v4.1.0.md`: `agente/` (15 fórmulas
— vida, energia, defesa/esquiva/bloqueio, proficiência, deslocamento, dano de corpo/furtivo,
inventário), `compras/` (catálogo, limites por patente, modificações, amplificadores, fragmentos,
venda), `dados/`, `descanso/`, `dt/`, `identidade/`, `novo-agente/`, `patente/`, `rolagem/`.

**Fonte única:** frontend e backend consomem o mesmo motor. Nenhuma regra de jogo é reimplementada
em nenhum dos dois lados.

### Autenticação e conta — `backend/autenticacao`, `backend/usuario`, `frontend/autenticacao`, `frontend/usuario`

Registro e login com JWT (bcrypt, guard global, `@Public()` para abrir rota, `@ActiveUser()` para o
payload). Telas `/login` e `/registro` (split-panel). Perfil self-service em `/perfil`: alterar
nome/login, trocar senha e excluir a própria conta.

### Campanhas — `backend/campanha`, `frontend/campanha`

CRUD de campanha com papéis (mestre/jogador), entrada por `codigo_convite` com regeneração pelo
mestre, listagem de membros, remoção de jogador e transferência de mestre. UI sob `/painel`
(guardada): lista de campanhas (`/painel`) é um **painel de controle** (m2-18) — linhas densas por
campanha com tira de 4 estatísticas agregadas no topo (Campanhas/Você mestra/Fichas em
campo/Alertas), alerta visual + nome da ficha crítica por linha, resumo da própria ficha
(Vida atual/máxima, jogador) e convite copiável direto na linha (mestre), sem abrir o detalhe. O
detalhe (`/painel/:id`) tem banner de alerta condicional no topo (ficha crítica, com link direto
pra ela), tira de estatísticas (Membros/Fichas/Convite [só mestre]/Alertas) e tira horizontal
rolável de rolagens da última hora (sem limite fixo de itens — a lista completa/sem limite de
tempo só na sidebar de histórico, aberta pelo seu próprio gatilho D20; cada pill tem rótulo +
dadinho d20 lado a lado na mesma linha flex — hover/foco no d20 mostra o resultado completo na
bandeja de dados flutuante, `BandejaDados`, a mesma que exibe rolagens ao vivo, mas sem timer/
barra de auto-sumir — `semAutoSumir`, a prévia só fecha no `mouseleave`/`blur`) — compartilhados
pelos dois papéis. Abaixo disso, o corpo diverge por papel (`@if (ehMestre())`/`@else`):

- **Mestre** (m2-19) — duas colunas: **Membros** (450px no desktop; nome/papel/gestão, sem
  fichas; mestre sempre primeiro, depois jogadores em ordem alfabética) e **Esquadrão** (grid fixo
  de 2 colunas — 1 no mobile, e antes de Membros quando a grade empilha; segue a mesma ordem
  mestre→alfabética da coluna Membros — com todas as fichas da campanha achatadas, nome do dono em
  cada mini-card, Vida/Energia com ajuste rápido ± sem abrir a ficha, reações
  (Defesa/Esquiva/Bloqueio/Contra-ataque, cada uma só aparece se a ficha tiver o valor — Contra-
  ataque recalculado ao vivo no backend quando o snapshot não foi persistido) e o kebab de ações da
  ficha — duplicar/remover-da-campanha/excluir).
- **Jogador** (m2-20 + m2-21) — a ficha exibida na coluna principal (a própria, por padrão, ou a de
  um colega via "Ver ficha") como card embutido (`<app-ficha-visualizacao modo="compacto">`, o
  componente real da tela de ficha, não uma réplica): 2 colunas que **repartem a linha** —
  Identidade/Vitalidade/Reações/Resistências à esquerda, card de Status à direita com uma barra de
  **3 abas** (Informações · Inventário · Habilidades). **Informações** = Atributos (o mesmo bloco
  que o `modo="padrao"` põe na coluna própria, via `ng-template`) + glance de Combate só leitura
  (com os dadinhos de rolar dano) + Anotações editáveis inline; Sanidade, Extras, História e
  Prestígio ficam de fora, alcançáveis por "Abrir ficha completa" (link no cabeçalho do card +
  botão no rodapé) → `/painel/:campanhaId/ficha/:id` (`modo="padrao"`, sem corte). Inventário e
  Habilidades rolam por dentro com teto de 420px (subiu de 230/250px pós-m2-21, a pedido do autor —
  o teto antigo datava de quando Atributos ainda morava na coluna ao lado). Ao lado, uma coluna
  lateral de 450px com **três** cards: **Equipe** (roster compacto — Vida/Energia resumidas + um
  botão "Ver ficha" por ficha visível de cada colega, trocando a ficha exibida sem navegar),
  **Rolagens** (`<app-ficha-rolagens-painel>` — presets/rolagem avulsa + o toggle "Rolagem oculta";
  saiu do card na m2-21 pra ficar ao lado do histórico; **só rola** os presets existentes —
  `editavel` fixo em `false` aqui, criar/duplicar/editar/remover preset continua exclusivo da
  ficha completa) e **Sessão** (as mesmas rolagens da última hora, empilhadas em vez da tira
  horizontal, com teto de 3 pills — 179px — antes de rolar). O cabeçalho dá ao jogador um menu "⋯" próprio (mesmo
  lugar do kebab do mestre) com **Criar nova ficha** e **Vincular ficha existente** (`PUT
  /ficha/:id/campanha` da m3-28, só fichas com `campanhaId === null`); as duas ações também
  aparecem no estado vazio, e nenhuma delas tira o jogador da página. No mobile a barra inferior
  (`.ficha-nav`, m3-60) lista 5 destinos (Agente/Status/Inventário/Habilidades/Rolagens) — e
  `Rolagens` é o **único que não é uma aba**: rola a página até o card da lateral. Os handlers de
  edição (`ajustar*`) vêm de `FichaEdicaoService` e a flag/registro de rolagem de
  `FichaRolagemRegistroService`, os dois composables reusados com `VisualizarPage` — a ficha de um
  colega aparece só leitura (`ajustavel=false`) quando o usuário não é dono nem mestre. O cabeçalho
  também traz `<app-calculadora-flutuante>` ao lado do gatilho de histórico de rolagens, pros dois
  papéis.

O cabeçalho tem nome da campanha em linha própria (mais destaque no mobile) e, abaixo/ao lado,
indicador de tempo real, botão "Voltar às campanhas", gatilho de histórico de rolagens e (mestre)
o menu kebab de ações da campanha (editar nome/descrição, excluir). Usável em ~360px.

### Ficha de jogador — `backend/ficha`, `frontend/ficha`

CRUD completo com a matriz de permissões §14 arbitrada **só no service**, validação do documento
contra `shared/regras` antes de persistir, e concessão/revogação de acesso de visualização
(`usuario_ficha_acesso`).

A tela de visualização (`FichaVisualizacao`, componente reusável) é um **layout de três colunas**
(Identidade · Atributos · Status com abas internas), com **toda edição no próprio lugar** — nada
de página de formulário separada. Editores prontos: atributos e maestria (com modificador de teste
e ajuste manual de dados/`dadosTeste` por atributo, este último só afetando a contagem de dados
rolada, nunca o valor exibido nem os derivados; em edição, os atributos viram uma lista vertical —
nome completo + steppers — em vez da grade compacta do modo leitura), vitais, sanidade e
lesões, habilidades (com filtro e contador), inventário completo (itens, modificações,
amplificadores, fragmentos Potencializador — "Aplicar em..." num item (`m3-35`; cardápio "em um
item" com 4 destinos exclusivos — dano [`N× maior dado do alvo`, dano de verdade], teste, **efeito**
[`m3-68`: tipo `EFEITO` próprio, descritivo — reforça o efeito do item, ex.: "Em Chamas" de uma
granada, nunca soma no dano] e resistência; "uma única função" por item, checado por
`existeFragmentoNaMesmaFuncao`) ou "Consumir" pro bônus permanente do agente (teste/Defesa/dano do
Corpo, cardápio fechado por módulo, `m3-64`;
consumir sempre deixa um registro incondicional na aba Extras, acima da Afinidade — não depende da
sequela "Rejeição Biológica", que é evitável — e é **removível**: desfaz o bônus, a Energia Máxima e
devolve o item ao inventário, mas não mexe na sequela já gerada) — e fragmentos Construtor (nascem
com o bônus fixo do módulo já aplicado como modificação automática — Arma ganha dano/teste, Proteção
ganha resistência/Esquiva/Bloqueio/Defesa, `m3-65`; Munição não modifica item, tem a ação própria
"Recarregar" que debita Energia e concede dano por 1 cena, reset manual; modificações comuns
adicionadas a um Construtor custam o dobro e não pesam; `m3-69`: o form de item custom ganhou um
seletor "Base" — escolher uma arma/proteção real de `CATALOGO_ITENS[categoriaEmprestada]` trava
dano/informação/resistência com os valores daquele item e pré-preenche o peso, "Outra" continua livre
pra homebrew; `calcularStatItem` funde a Resistência de um Construtor Proteção com o bônus do módulo
desde essa task — antes só Proteções/Armazenamento eram elegíveis a esse bloco) —, sub-inventários,
custom), Limite mínimo
de Energia/Anomalia Biológica (`m3-67`: `(Vigor + Destreza) × 2` — abaixo dele, aviso não-bloqueante
na aquisição de fragmento e, na aba Extras, os efeitos calculados como texto informativo (−15
testes, −10 Defesa, teto de 10% da Vida Máxima) + atalho pra pré-preencher o trauma "Limiar da
Humanidade" na aba Sanidade, sem nunca disparar sozinho), identidade (origem,
personalidade, afinidade de fragmentos), história privada, anotações e dinheiro. Extras possui a
subnavegação persistente **Identidade / Fragmentos** (`m3-71`), com ícones canônicos e painel interno
rolável limitado à altura de Agente/Atributos no desktop e ao viewport em telas empilhadas.
Persistência **otimista + em lote**, com
merge de edição concorrente — a lógica (~18 handlers `ajustar*` + progressão) mora em
`FichaEdicaoService` (`@Injectable()` sem `providedIn: 'root'`, uma instância por página via
`providers: []`), reusado por `VisualizarPage` (`/painel/:campanhaId/ficha/:id` e `/fichas/:id`) e
por `CampanhaDetalhe` (m2-20, ficha embutida na visão do jogador). O mesmo padrão vale para
`FichaRolagemRegistroService` (m2-21): a flag "Rolagem oculta" e o registro do histórico (m3-27)
moram na página porque no painel do jogador o toggle está **fora** do card (coluna lateral)
enquanto o teste de atributo e o dano continuam sendo rolados de dentro dele.

Input `modo: 'padrao' | 'compacto'` no componente: `'compacto'` reduz as 3 colunas pra 2
(Identidade/Vitalidade/Reações/Resistências ao lado do card de Status) e corta a barra de abas ao
trio Informações/Inventário/Habilidades, some com Prestígio, Sanidade, Extras e História, e leva
Atributos + Combate pra aba Informações (uso de `CampanhaDetalhe`, coluna estreita numa tela larga
— ver seção "Painel de campanhas" acima). No mobile a tela vira **HUD fixo no topo + barra de
navegação no rodapé** (não empilhamento de colunas) — por breakpoint real de viewport, não pelo
`modo`; em `'compacto'` a barra some com os destinos que não existem nesse modo.

Rolagem de dados: gramática v4, presets, teste de atributo, dano de item, iniciativa automática,
calculadora flutuante e **histórico persistido** com visibilidade `PUBLICA`/`PRIVADA`.

### Guia de criação de ficha — `frontend/src/app/modules/ficha/paginas/criar/`

Rota `/painel/:campanhaId/ficha/nova` (`m3-57`/`m3-58`/`m3-59`) — mesmo componente `FichaCriar`
montado de novo, sem `campanhaId`, em `/fichas/nova` (acervo, m3-28: ficha avulsa, sem campanha).
`FichaCriarDialog` (o formulário único antigo) **não existe mais no código**: era a última
consumidora quem faltava migrar. Tela única por passos — trilha vertical + resumo operacional
progressivo que nunca antecipa classe/Nível/dinheiro antes da escolha real —, rodando sobre
`shared/regras` sem nenhuma chamada ao backend até o "Criar ficha" final. Sem `campanhaId`
(`null`), o guia pula `listarMembros`/`listarFichas` (sem esquadrão, sem seletor de dono no passo
01) e o passo 03 sempre segue o caminho "primeiro agente" (Nível 0, Prestígio 0, sem bônus — o
mesmo já usado para uma campanha ainda sem fichas), com o aviso trocando "Primeiro agente da
campanha" por "Ficha avulsa, sem campanha"; ao final, `POST /ficha` sai sem a chave `campanhaId` e
o guia termina em `/fichas/:id`, não em `/painel/.../ficha/:id`. Passos: **01 Base** (dono, só
mestre — não aparece sem campanha —, + codinome) · **02 Classe** (classe/arquétipo, bônus fixo de
atributos, Habilidade Inicial, Saúde base sem Nível/atributos ainda) · **03 Novo agente** (motivo
de entrada + médias de Nível/Prestígio pré-calculadas da campanha, `calcularNovoAgente`, memorial
de cálculo; primeira ficha da campanha, ou ficha sem campanha, pula direto para Nível/Prestígio 0)
· **04 Atributos** (orçamento de 4 pontos de criação,
`calcularOrcamentoAtributos`/`validarDistribuicaoAtributos`) · **05 Identidade** (Personalidade +
Origem com catálogo de Formações e `Outra`, imutáveis para o dono após a criação) · **06 Melhorias**
(só existe com Nível inicial > 0 — vagas de habilidade da progressão acumulada,
`calcularProgressaoAcumulada`, reusa `FichaHabilidadeSeletor` da `m3-13`, Fortificações de
Personalidade nos níveis 7/14) · **07 Recursos** (rolagem única e definitiva de `1000 + 4D4×250` +
Bônus Monetário) · **08 Equipamento inicial** (kit da loja, orçamento **à parte** do dinheiro —
nunca descontado —, teto $2500/peso 5 do documento — mesma regra para toda classe, inclusive Civil
—, sem modificação; componente próprio `GuiaEquipamentoLoja`, catálogo + carrinho sobre
`CATALOGO_ITENS`/`calcularTotaisCarrinho` de `shared/regras/compras`; pulável, kit vazio é válido) ·
**09 Revisão** (resumo completo + `POST /ficha`, erro do backend não perde o estado do guia). Os
passos 04/06/08 têm **trava dura** por padrão (não avança com saldo/vaga/orçamento em aberto) com
um "modo livre" que ignora as travas (sempre disponível ao mestre) — regra só do guia, client-side;
o backend segue com a liberdade de edição da `m3-10`. Rascunho (`GuiaCriacaoRascunhoService`)
serializa o estado em `localStorage` por campanha, oferece "retomar"/"começar do zero" ao reabrir e
some ao concluir; sair do guia usa um `<dialog>` nativo (não `confirm()` nem `beforeunload`, que não
permite UI customizada), com aviso de que o progresso está salvo. Mobile: trilha vira barra de
progresso no topo, resumo operacional vira bottom sheet aberto por um botão dedicado no cabeçalho.

### Tempo real — `backend/core/gateway`

Gateway Socket.IO **broadcast-only**: toda mutação passa por REST, o gateway nunca recebe escrita.
Handshake autenticado pelo mesmo `JwtService` do Passport. Salas `ficha:<id>` e `campanha:<id>`,
reusando a permissão §14 das services. Eventos: `ficha:criada`, `ficha:alterada`, `membro:entrou`,
`rolagem:registrada`.

### Calculadoras públicas — `frontend/calculadora`

Seis abas públicas e 100% client-side (consomem `shared/regras` direto, sem backend): `agente`,
`dt`, `novo-agente`, `patente`, `descanso`, `compras` (com modo Vender). Paridade com a calculadora
antiga confirmada.

### Tema — `frontend/tema`

"Terminal de Contenção" dark-first com **troca em runtime** (`TemaService`: presets + color picker
com trava de contraste). Tokens CSS + preset PrimeNG + Tailwind apontando para os tokens.

### Infraestrutura

11 migrations (`0001`…`0011`), Knex + Docker Compose local, CI de lint+testes em PR, deploy nativo.

---

## 5. Decisões Vigentes

Decisões que **continuam governando código novo**. Não as re-litigue sem falar com o autor.

- **DTOs são `interface readonly`, não classes** — o projeto não instala `class-validator` e o
  backend **não liga o `ValidationPipe`**. A validação estrutural fica documentada campo a campo na
  spec; a validação real é de regra de negócio, no service. Não converter DTOs em classes nem
  instalar `class-validator` sem pedir.
- **Deploy nativo, não Actions** — o autor prefere Render/Cloudflare puxando do Git a pipelines de
  deploy no GitHub Actions. O Actions fica só com o CI.
- **Edição no próprio lugar** — toggle inline na mesma tela, nunca uma página de formulário
  separada. Vale para ficha, campanha e perfil.
- **Enum de coluna relacional é tabela `tipo_*`** (SYSTEM.SPEC §10.2.12, proibição #24). A exceção
  "enum só em `shared/`" vale **apenas** para conteúdo dentro do JSONB `ficha.dados` (classes,
  patentes, categorias de item). Enum que vira coluna ganha tabela de referência — foi assim com
  `tipo_rolagem_visibilidade` na `m3-27`.
- **Rolagem `PRIVADA` nunca trafega por WebSocket** — o gateway só emite `rolagem:registrada` para
  rolagens públicas. A privada só chega por REST, a quem tem permissão.
- **PrimeNG 21 sem `@angular/animations`** — o pacote não está instalado e o PrimeNG 21 usa
  animações CSS próprias. Não wirar `provideAnimationsAsync()`; o build quebra.
- **A ficha aposentou o sistema de abas de página inteira da `m3-11`** (substituído pelas 3 colunas
  da `m3-38`). `AbaFicha`/`ABAS_FICHA`/`ehAbaFicha` ainda existem no código mas estão **fora do
  template** — não estenda esse sistema, mesmo que uma spec antiga peça.
- **`docs/specs/active/m3-38-*.spec.md` é uma spec deliberadamente permanente** — ela documenta
  retroativamente o redesenho da tela de ficha e novos ajustes dessa mesma frente entram nela em vez
  de virar spec solta. É a **exceção** consciente ao "active/ = task da sessão atual".
- **A ficha permite estado incoerente de propósito** — a validação do backend só checa **teto**
  (Vida ≤ máximo, Nível no intervalo da classe). Condições (Morrendo/Machucado/Inconsciente) são
  alternadas à mão e nunca validadas; exceder o Inventário máximo é **aviso**, não trava.
- **Gate de qualidade é definição de pronto** — toda tarefa exige evidência contra a spec e as
  convenções, revisão do diff e verificação proporcional. UI exige verificação ao vivo conforme
  `verify`; item sem uma verificação obrigatória permanece aberto. **Qualidade acima de velocidade**
  é decisão expressa do autor: nenhuma pressa, delegação ou limite de execução autoriza atalhos. UI
  exige análogo aprovado e inspeção pessoal do agente principal em 1920×1080 e 360×800; build,
  testes, tokens e relato de subagente não substituem a comparação visual. O checklist canônico está
  em `AGENTS.md` “Gate obrigatório de qualidade e conclusão”.

---

## 6. Sempre Lembrar

Armadilhas que já custaram retrabalho neste repositório. Cada uma tem um episódio no `HISTORY.md`.

**CSS / layout**

- **`overflow-x: clip` + `overflow-y: visible`** é a combinação usada em `html` (`styles.scss`) e
  `.conteudo` (`layout.component.scss`). Trocar qualquer um desses `clip` por `hidden`/`auto`
  **mata todo `position: sticky` da tela em silêncio** — é a tentação natural de quem está caçando
  overflow horizontal. Está comentado no SCSS; leia antes de mexer.
- **`@extend` + media query:** o seletor é injetado no media query, mas uma declaração **posterior**
  no arquivo com a **mesma especificidade** vence lá dentro. Foi assim que um `width: 18px` anulou
  um alvo de toque de 44px que "parecia" corrigido.
- **Especificidade anula media query:** `.bloco--modificador` (0,2,0) vence uma regra de media query
  em `.bloco` (0,1,0), e a regra simplesmente nunca roda. A correção é repetir o media query
  **dentro** do bloco do modificador, empatando a especificidade.
- **Nunca hardcodar hex/fonte/raio** (proibição #29) — sempre `var(--token)`. O tema troca em
  runtime; um hex solto não acompanha.
- **Base fixa + `min-width` num flex row transborda em silêncio.** `flex: 0 0 500px` numa coluna e
  `min-width: 260px` na irmã pedem 776px; numa linha de 644px o flexbox **não** encolhe nenhuma das
  duas — a segunda simplesmente sai por baixo do que estiver à direita, sem barra de rolagem e sem
  erro. Achado na `m2-21` (o card de Status do painel do jogador ficava por baixo da coluna lateral
  desde a m2-20). Em duas colunas que dividem uma linha de largura desconhecida, use `flex: 1 1
  <base>` + `min-width: 0` nas duas e trave o teto com `max-width`, nunca o piso.

**Angular**

- **Ler `input.required()` no corpo do construtor causa `NG0950` em runtime** e os testes **não
  pegam** (o TestBed injeta o input antes do primeiro change detection). Envolva em `effect()`.

**Backend / SQL**

- Todo SELECT precisa de `WHERE [tabela].is_deleted = false`; parâmetros nomeados (`:nome`), nunca
  posicionais nem interpolação; INSERT via `INSERT ... SELECT ... RETURNING`, nunca `VALUES`;
  nenhuma coluna com `DEFAULT`; soft delete sempre, `DELETE` físico nunca.
- **`COUNT(*)` do Postgres é `bigint`, e o driver `pg` devolve `bigint` como `string`** (evita
  perda de precisão) — um `COUNT(*)` sem `::int` explícito quebra silenciosamente qualquer DTO
  tipado `number` (TypeScript não pega; só aparece numa soma/comparação estranha em runtime).
  Sempre `COUNT(*)::int` quando o resultado alimenta um campo `number`. Achado na `m2-18`.
- **Controller é burro** — sem lógica, sem `try/catch`, sem `if`. A única micro-inteligência aceita
  é fundir id de `@Param`/`@Query` no DTO.

**Regras de jogo**

- **Amplificadores e Modificações escalam por COMPRA, não por stack bruto** — a 1ª compra em ■■
  (Flexível/Resistente/Potente/Conservador/Veloz) **não** dobra o bônus; a penalidade continua no
  bruto.
- Se código e `docs/core/sistema-v4.1.0.md` divergirem, **o documento vence** (proibição #27).

**Processo**

- **Antes de qualquer UI**, ler `docs/design/DESIGN.md` e consumir `docs/design/tema/`. Isso já foi
  esquecido uma vez (`m0-05`) e a tela nasceu com preset Aura base + hex hardcoded.
- **Sessões concorrentes na mesma branch acontecem** — reconferir `git status`/`HEAD` antes de
  commitar ou revisar um diff.

---

## 7. Decisões Pendentes

Nenhuma decisão de rumo em aberto no momento.

A única que existia — **identidade visual do site** — está **resolvida**: tema "Terminal de
Contenção", handoff completo em `docs/design/`, com troca em runtime entregue na `m1-13`.

Questões que precisam de resposta do autor mas não são decisões de rumo estão marcadas com **⚠** na
seção 1 e em [`PROBLEMS.md`](PROBLEMS.md).
