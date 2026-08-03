# m3-ficha-jogador.spec.md

> **Milestone M3 — Ficha de Jogador.** Receberá design detalhado (brainstorming próprio)
> quando chegar a vez; este spec fixa o escopo acordado. Quebrar em tasks numeradas.

> **Revisado por `m3-10` (edição no próprio lugar + máximos editáveis + Maestria).** Dois pontos
> deste umbrella foram deliberadamente revistos: (1) o critério "**HP ≤ máximo calculado**" e o
> modelo "**stats derivados ao vivo**" **deixam de valer** — agora **nada é exclusivamente calculado**:
> todo derivado é snapshot na criação e depois **stored/editável** (bloco `derivados`; atual pode
> exceder o máximo); (2) o backend **não rejeita mais** ficha por faixa de estado, só por forma e pela
> regra de **Maestria**.
>
> **Escopo expandido em tasks (edição granular + abas + sub-coleções):** `m3-10` (edição por pedaço,
> Maestria, `derivados` editáveis), `m3-11` (abas: Visão Geral/Combate/Inventário/Habilidades/Sanidade/
> Rolagens), `m3-12` (editor de Sanidade), `m3-13` (editor de Habilidades), `m3-14` (editor de
> Inventário — reusa carrinho M1), `m3-15` (presets de rolagem + motor de dados em `shared/regras`).
> Acesso de visualização vira **menu → dialog** (em `m3-10`). Ver as specs em `docs/specs/`.
>
> **Assistente de criação** (`m3-16`, entregue fora de spec): "Nova ficha" coleta as escolhas cruciais
> antes de criar. **Merge de edição concorrente** (`m3-17`, concluída): o `ficha:alterada` remoto é
> mesclado com a edição local em vez de descartado — fechava uma perda de dados silenciosa.
>
> **Identidade — pacote de três tasks** (`sistema-v4.1.0.md` §⬡ Identidade), hoje **fora do contrato**
> (`SCHEMA.md`): `m3-23` (contrato `FichaIdentidadeDto` + motor `shared/regras/identidade` com as 21
> linhas da tabela de Formação), `m3-24` (backend: validação de forma + imutabilidade — trava para o
> dono, mestre passa) e `m3-25` (frontend, **aguardando a aba Identidade da `m3-11`**). Personalidade
> é a palavra; a **habilidade** de Personalidade já tem casa em `habilidades[]`
> (`HabilidadeCategoriaEnum.PERSONALIDADE`, m3-01) e as Fortificações (níveis 7/14) são o Mestre
> reescrevendo-a. Só **5 das 21** linhas de Formação têm campo na ficha hoje; as outras 16 nascem
> modeladas e **sem consumidor**, por decisão do autor — ver o aviso na `m3-23`.
>
> **Lote de refino da ficha (`m3-40`…`m3-56`)** — 17 tasks derivadas de uma lista de ajustes/
> correções/features sobre a ficha já entregue, agrupadas por bloco de trabalho similar (specs em
> `docs/specs/backlog/`): `m3-40` (cabeçalho: "Agente" + campo "Contrato" só-mestre + mestre edita
> Personalidade), `m3-41` (motor de Origem: Formações afetam derivados server-side + Especialidade
> atrelada à Origem + Experimento c/ peculiaridade perde Origem), `m3-42` (mecânicas de fragmento
> hoje deferidas: Preço de Sanidade, Afinidade, fragmento-como-Modificação), `m3-43` (bugs de
> motor: mods de armadura na Esquiva/Defesa, resistência de armazenamento, amplificador de
> inventário), `m3-44` (Inventário: pochete/bolsa como sub-inventários, lista própria de
> Fragmentos, amplificadores em 2 colunas), `m3-45` (rolar dano direto na arma), `m3-46` (gramática
> de rolagem v4: `(…)#N` e `(ATRIBUTO+n)dM`, exige parênteses no parser), `m3-47` (preset de
> Iniciativa `DESd6` automático na criação), `m3-48` (Habilidades: filtro por tipo pelo contador +
> limpar), `m3-49` (card "Informações Extras": exibir Origem, Personalidade, afinidade — **sem aba
> nova**), `m3-50` (aba **História** privada — só dono/mestre, dado não recuperado p/ visualizador;
> **introduz** o mecanismo de campo-privado-por-permissão), `m3-51` (permissões granulares:
> visualizador não rola, trauma só em edição, revogar acesso expulsa em tempo real, Anotações com
> gate de visualização reusando o mecanismo da `m3-50`), `m3-52` (acervo: excluir + duplicar ficha),
> `m3-53` (exportar ficha em PDF do tema), `m3-54` (calculadora comum flutuante/arrastável na
> ficha), `m3-55` (refino visual desktop: alinhar ícones das tabs, hover do atributo mostra DT,
> largura+animação da bandeja), `m3-56` (passe mobile de todas as abas + skeletons dos novos
> layouts). Implementar uma por vez, movendo cada spec `backlog/ → active/ → done/` e atualizando
> `CONTEXT.md` (fluxo padrão). `m3-27`/`m3-28` seguem à frente na fila.
>
> **Cor e imagem de ficha (`m3-61`, `m3-62`)** — duas tasks novas, independentes entre si e do
> lote de refino acima: `m3-61` dá a cada ficha uma **cor de identidade** (coluna relacional
> nova, ao lado de `nome`) que tinge as rolagens daquele personagem na bandeja, no histórico e
> no feed "Rolagens Recentes" do painel de campanha — sem colidir com o `--accent` (esse é a
> cor de tema **por usuário**, do seletor M1; a cor de ficha é um token novo,
> `--cor-ficha`). `m3-62` dá upload de **avatar**, guardando só o caminho/URL numa coluna
> nova (`imagem_url`) — o binário nunca entra no Postgres; o provedor de blob storage de
> produção é **decisão adiada pelo autor**, então a task entrega uma interface de
> armazenamento com implementação em disco local por ora. As duas também entram no momento da
> **criação** da ficha (`FichaCriarDialog` hoje; Passo 01 // BASE do guia quando `m3-57`
> existir — ver nota na spec da `m3-57`).

> **Fechamento de Fragmentos (`m3-63`…`m3-68`)** — seis tasks que fecham o que `m3-35`/`m3-42`
> deixaram parcial ou deferido, a partir de uma auditoria completa da seção "⬡ Fragmentos" do
> `sistema-v4.1.0.md` contra o código: `m3-63` (cardápio do Potencializador: 5ª opção "N× maior
> dado do item", regra de função única por item, restrição de alvo corrigida), `m3-64` (bônus
> "Consumido" da tabela do Potencializador — hoje o Consumo só cobra preço, não dá o benefício
> mecânico do doc — e rastro do consumo via `descricao` da sequela gerada), `m3-65` (tabela fixa de
> bônus do Construtor por módulo, ação "Recarregar" de munição, dobro de custo/peso zero em
> modificações do Construtor), `m3-66` (exibição detalhada de Afinidade: chips por fragmento, custo
> já reduzido no catálogo e nos paineis de ação, hoje sempre bruto), `m3-67` (Limite mínimo de
> Energia `(Vigor+Destreza)×2` e o estado "Anomalia Biológica" — efeitos exibidos, não empurrados
> automaticamente no motor de Defesa/testes; Colapso fica de fora, ver `IDEAS.md` `I-007`), `m3-68`
> (Redução de Módulo via item consumível e via LDA/Força Tarefa+, sem sistema de missão real —
> espera liberada manualmente pelo Mestre). Identificação de Poder, auto-desacoplamento por perda
> de uso, Colapso e Forja de Fragmentos ficaram de fora por decisão do autor — registrados em
> `IDEAS.md` `I-005`…`I-008`. Venda de fragmentos na ficha (a regra já existe, só falta o botão) fica
> em `I-004`.

> **Guia de criação de ficha (`m3-57`…`m3-59`)** — trio que substitui o assistente-dialog da `m3-16`
> por uma **tela guiada por passos** (`/painel/:campanhaId/ficha/nova`), conduzindo o jogador pelas
> escolhas de criação com as travas do documento: `m3-57` (tela, trilha de passos, rascunho em
> `localStorage`, regra nova de **orçamento de atributos** em `shared/regras/agente/criacao.ts` — os
> 4 pontos da criação que o dialog ignora —, passo **Novo Agente** calculando Nível/Prestígio/**Bônus
> Monetário** a partir das médias do esquadrão, Identidade completa, rolagem visível do dinheiro
> inicial e mobile), `m3-58` (passo das **melhorias de nível**: as vagas de habilidade e as
> Fortificações que `calcularProgressaoAcumulada` já conta e ninguém consome) e `m3-59` (passo do
> **Equipamento Inicial** na loja, tetos de $2500 e 5 de peso, orçamento à parte do dinheiro
> rolado). O `FichaCriarDialog` é removido na `m3-57` — caminho único de criação.

## Objetivo

Fichas de jogador persistentes com cálculo automático de stats, permissões e atualização
em tempo real — o coração do sistema.

## Escopo Acordado

- **Fechamento do contrato `FichaJogadorDadosDto`** (forma do JSONB `dados`) a partir do
  `docs/core/sistema-v4.1.0.md` — atualizar `SCHEMA.md`.
- **Módulo `ficha` (backend)**: CRUD com matriz de permissões (dono edita a própria;
  mestre vê/edita qualquer ficha da campanha; outro membro vê só com
  `usuario_ficha_acesso`); validação dos dados contra `shared/regras`
  (HP ≤ máximo calculado, atributos dentro dos limites de classe/nível, etc.);
  concessão/revogação de acesso de visualização. Migrations de `ficha`, `tipo_ficha`,
  `usuario_ficha_acesso`.
- **Tempo real**: gateway Socket.IO broadcast-only (SYSTEM.SPEC §9) — handshake com JWT,
  salas `ficha:<id>` e `campanha:<id>`, eventos `ficha:alterada`, `ficha:criada`,
  `membro:entrou`; emissão pela service após mutação; cliente ressincroniza ao reconectar.
- **Frontend**: criação de ficha (reusando os formulários/cálculos da calculadora de
  agente), visualização/edição com stats derivados ao vivo via `shared/regras`,
  lista de fichas da campanha (respeitando permissões), tela do mestre com fichas
  atualizando em tempo real.
- **Refinamento de UI/UX mobile** (task numerada dedicada no fim do milestone): a ficha de
  jogador é o ecrã mais denso do sistema — criação/edição, ficha completa com stats
  derivados e a lista/painel do mestre precisam ser confortáveis no mobile (~360px, sem
  scroll horizontal do body, alvos de toque adequados, seções colapsáveis onde fizer sentido),
  reusando o padrão responsivo por tokens de `m1-15` e a identidade `docs/design/` (o protótipo
  `docs/design/examples/ficha-de-jogador.html` é alvo desktop). Ver `m1-15-*`.

## Critérios de Aceite (mínimos)

- Jogador cria/edita a própria ficha; mestre edita qualquer uma; terceiro só vê com acesso
  concedido — matriz coberta por testes de service (REST e entrada em sala WS)
- Backend rejeita ficha salva com dados incoerentes com o motor de regras
- Mestre com a ficha aberta vê alterações do jogador sem recarregar
- Ficha (criação/edição/visualização) e lista usáveis no mobile (~360px) sem scroll horizontal

## Dependências

- M1 (`shared/regras` completo) e M2 (auth + campanhas)
