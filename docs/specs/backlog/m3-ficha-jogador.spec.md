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
> **Lote de refino da ficha (`m3-38`…`m3-54`)** — 17 tasks derivadas de uma lista de ajustes/
> correções/features sobre a ficha já entregue, agrupadas por bloco de trabalho similar (specs em
> `docs/specs/backlog/`): `m3-38` (cabeçalho: "Agente" + campo "Contrato" só-mestre + mestre edita
> Personalidade), `m3-39` (motor de Origem: Formações afetam derivados server-side + Especialidade
> atrelada à Origem + Experimento c/ peculiaridade perde Origem), `m3-40` (mecânicas de fragmento
> hoje deferidas: Preço de Sanidade, Afinidade, fragmento-como-Modificação), `m3-41` (bugs de
> motor: mods de armadura na Esquiva/Defesa, resistência de armazenamento, amplificador de
> inventário), `m3-42` (Inventário: pochete/bolsa como sub-inventários, lista própria de
> Fragmentos, amplificadores em 2 colunas), `m3-43` (rolar dano direto na arma), `m3-44` (gramática
> de rolagem v4: `(…)#N` e `(ATRIBUTO+n)dM`, exige parênteses no parser), `m3-45` (preset de
> Iniciativa `DESd6` automático na criação), `m3-46` (Habilidades: filtro por tipo pelo contador +
> limpar), `m3-47` (card "Informações Extras": exibir Origem, Personalidade, afinidade — **sem aba
> nova**), `m3-48` (aba **História** privada — só dono/mestre, dado não recuperado p/ visualizador;
> **introduz** o mecanismo de campo-privado-por-permissão), `m3-49` (permissões granulares:
> visualizador não rola, trauma só em edição, revogar acesso expulsa em tempo real, Anotações com
> gate de visualização reusando o mecanismo da `m3-48`), `m3-50` (acervo: excluir + duplicar ficha),
> `m3-51` (exportar ficha em PDF do tema), `m3-52` (calculadora comum flutuante/arrastável na
> ficha), `m3-53` (refino visual desktop: alinhar ícones das tabs, hover do atributo mostra DT,
> largura+animação da bandeja), `m3-54` (passe mobile de todas as abas + skeletons dos novos
> layouts). Implementar uma por vez, movendo cada spec `backlog/ → active/ → done/` e atualizando
> `CONTEXT.md` (fluxo padrão). `m3-27`/`m3-28` seguem à frente na fila.

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
