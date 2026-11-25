# calendario-campanha-mundo.spec.md

> Task avulsa (feature nova). Origem: Sessão 5 da campanha (10/11/2026): faltava um jeito de **ancorar as
> datas da história**, e os jogadores ficam conferindo "que dia é hoje" fora do site. Pedido **B** de
> `PEDIDO_CLAUDE_CODE_SPECS_SITE.md`. Só especificação: nenhum código, migration ou tela nesta etapa.
> **Deve poder sair antes** do remodelamento de campanhas/missões
> (`campanhas-missoes-esquadrao-levantamento.spec.md`) e depender o mínimo dele.

## Objetivo

Um **calendário do mundo do RPG** (não da vida real), compartilhado pela campanha, no qual se marcam
**missões** (data de início, duração e a missão atual), **eventos de personagem** (quem morreu, quem entrou no
esquadrão) e **anotações** dos jogadores, com o **dia de hoje no jogo** sempre visível. Trechos dos cadernos
podem ser **atrelados** a um evento do calendário, reaproveitando o mecanismo que já vincula trechos do Caderno
a documentos da Biblioteca.

## Estado atual encontrado no código e na documentação

| Tema | Achado |
|---|---|
| Calendário | **Não existe** nada: nenhuma tabela, DTO, tela ou menção em `SCHEMA.md`. |
| Missão | **Não existe como entidade.** O único estado "de missão" é o booleano `campanha.naBase` ("Na Base" / "Em Missão"), que só liga/desliga o acesso de jogadores ao inventário do esquadrão (`CampanhaService.validarAcessoInventario`, `campanha:estado-alterado`; exibido em `detalhe-mestre.page.html:134-139` e `detalhe-jogador.page.html:202`). |
| Regra do jogo sobre missão e tempo | `docs/core/sistema-v4.1.5.md` §"Missões" (l.2575-2620): missão é entregue a um esquadrão de 4 a 6 agentes e tem Criatura, Descrição, Objetivo e Prestígio; **tipos "Missão Direta" (1 ou 2 dias operacionais) e "Campanha" (múltiplos dias)**; **"Dias Operacionais"** são "unidade de tempo narrativa in-game, marcada pelo Mestre", que ele pode pausar. Isto é a granularidade natural do calendário: **dia**. |
| Colisão de termos | No livro, **"Campanha" é um tipo de missão** longa; no site, **"campanha" é a mesa** (`campanha`, `campanha_membro`). A spec usa "campanha" = mesa e "missão" = unidade de jogo, e pede decisão de nomenclatura (pergunta 1). |
| Cena | `cena` (PLANEJADA → ATIVA → ENCERRADA, `campanha_id`, `ordem`, tipos) **não tem data de jogo**. Cena de combate é o único vínculo com `encontro`. |
| Eventos de personagem | **Não existe** estado "morto" na ficha (`FichaJogadorDadosDto`); morte hoje é só Vida ≤ 0 (`tem_critica` nos agregados). Entrada no esquadrão é implícita: ficha com `campanha_id` (`ficha:criada` / `membro:entrou`) e, na criação de agente, `MotivoEntradaAgenteEnum` (calculadora). **Nada registra quando** isso aconteceu no mundo do jogo. |
| Caderno | `pagina_caderno` (pessoal por `(campanha_id, usuario_autor_id)`) e Caderno do Esquadrão (Yjs, `caderno-esquadrao:*`). O editor é `app-editor-markdown`. |
| Vínculo trecho → Biblioteca | **Já existe** (`caderno-vincular-trecho-biblioteca`, done 19/10/2026): o trecho selecionado vira um **link Markdown** `#biblioteca-documento-<id>` (`PREFIXO_DOCUMENTO_CADERNO` e `lerDocumentoDoVinculo`, `caderno-vinculo-biblioteca.component.ts:14-20`), **sem tabela nova**; menu de contexto (botão direito, alternativa por toque); o vínculo **não concede acesso** (cada leitor só abre o que pode ver) e **não vaza título** quando o documento deixa de ser visível. Documentos da Biblioteca são `TEXTO` ou `IMAGEM` (`TipoDocumentoEnum`). |
| Tempo real | Broadcast-only, escrita só por REST (`SYSTEM.SPEC.md` §9, proibição #25). Salas `campanha:<id>`, `campanha:<id>:mestre` (conteúdo exclusivo do mestre) e `campanha:<id>:espectador`. Padrão de **invalidador sem dados** (`documento:organizacao-alterada`, `ficha:recortes-alterados`): o evento só avisa e cada cliente refaz o GET no **próprio recorte**. |
| Permissões | Matriz em `SYSTEM.SPEC.md` §14: "Caderno / inventário de esquadrão" é ✅ mestre e jogador, ❌ espectador. |
| Última migration | `0040 - Pastas da biblioteca.sql` (a próxima é `0041`). |

> "Do mesmo jeito que já se faz com **imagens**": o autor provavelmente se refere a esse vínculo Caderno →
> Biblioteca (que inclui documentos de imagem). Esta spec assume isso e o reaproveita; pergunta 7 confirma.

## Proposta

### Modelo de dados — data do jogo independente de data real e de fuso

- **Data do jogo** é uma **data de calendário pura** (ano-mês-dia), **não um instante**. Armazenar como `DATE` do
  PostgreSQL (sem fuso), nomeada `_data` por ser data de negócio (`CONVENTIONS`), e **trafegar como texto
  `AAAA-MM-DD`**. **Nunca** construir `Date` do JavaScript a partir dela (o fuso local deslocaria o dia);
  toda a aritmética (somar dias, intervalo, dia da semana, grade do mês, intervalos que cruzam mês/ano) vive
  em **funções puras em `shared/`**, sobre inteiros (ano, mês, dia ou número de dia absoluto), com testes
  de virada de mês, de ano e de ano bissexto.
- Intervalo: `inicio_data` e `fim_data` **inclusivos** (missão de 3 dias = 3 dias marcados); `fim_data` nulo =
  evento de um dia ou missão em aberto.
- **Calendário gregoriano ou próprio?** O mundo é a Terra paralela da Fundação SCP, mas o autor pode querer
  meses/dias próprios. Recomendação: **gregoriano** (cabe em `DATE`, grade e dia da semana prontos); calendário
  customizado é outra spec (pergunta 2). O ano é livre (ex.: 2026 ou um ano de ficção); `DATE` aceita qualquer
  ano plausível.
- Precisão: **dia**. Hora do dia fica fora (dias operacionais são a unidade do livro).

### Tabelas (proposta; nomes e colunas em português snake_case, soft delete, padrão `BaseEntity`)

- `tipo_calendario_evento` (enum de coluna, espelha `CalendarioEventoTipoEnum`): `MISSAO`, `MORTE`, `ENTRADA`,
  `NOTA`, `MARCO` (outros). Pergunta 3 decide se `MORTE`/`ENTRADA` entram já.
- `calendario_evento`:
  - `campanha_id`, `tipo_calendario_evento_id`, `titulo`, `descricao` (texto/Markdown curto), `inicio_data`,
    `fim_data` (nulo), `oculto` (boolean; segredo do mestre), `usuario_autor_id`, `ficha_id` (nulo; o personagem
    de um evento de morte/entrada), `atual` **não** é coluna: "missão atual" é derivada (ver abaixo).
  - Índice por `(campanha_id, inicio_data)`.
- `calendario_campanha` (1 linha por campanha, ou colunas em `campanha`; pergunta 4): `hoje_data` ("o dia de hoje
  no jogo"), e, se um dia o calendário for próprio, a configuração.
- **Missão sem entidade:** nesta spec uma missão **é um `calendario_evento` do tipo `MISSAO`** com início e fim. A
  "missão atual" é aquela cujo intervalo contém `hoje_data` (ou a marcada pelo mestre; pergunta 5). Quando o
  levantamento de campanhas/missões produzir uma entidade `missao`, entra uma coluna `missao_id` **nula** no
  evento. É isso que mantém o calendário **independente** do remodelamento.
- Migration `0041`, com `INSERT … SELECT … RETURNING` e `is_deleted`, conforme `sql-migrations`; a decisão de
  onde cada dado vive (coluna × `tipo_*` × JSONB) é registrada no fecho.

### Permissões (validadas na service, vale para REST e socket)

| Ação | Mestre | Jogador | Espectador |
|---|---|---|---|
| Ver eventos públicos | ✅ | ✅ | **a decidir** (pergunta 6; a matriz atual nega o Caderno ao espectador) |
| Ver evento `oculto` | ✅ | ❌ | ❌ |
| Criar evento/nota | ✅ | ✅ (a proposta) | ❌ |
| Editar evento | ✅ qualquer | só o **próprio** | ❌ |
| Apagar evento | ✅ qualquer | **só o próprio**; **não** apaga o de outro | ❌ |
| Marcar/mover `hoje_data` | ✅ | **a decidir** (pergunta 8) | ❌ |
| Criar/alterar missão e evento de morte/entrada | ✅ | a decidir (pergunta 3) | ❌ |
| Revelar evento oculto | ✅ | — | — |

- Resposta à pergunta do autor: **sim, existe evento secreto do mestre** na proposta (`oculto`), visível só a
  ele até ser revelado. **Um jogador não apaga o evento de outro** (recomendação; o mestre sim). Decisão final
  do autor.
- **Segredo:** evento oculto **nunca** vai para a sala cheia; o título de um evento oculto não pode vazar por
  vínculo de caderno, por busca, nem por contagem.

### Tempo real (skill `tempo-real`)

- Escrita **só por REST**; a service emite **depois** de salvar. Evento **sem dados** `calendario:alterado
  { campanhaId }` para `campanha:<id>` (menos `…:mestre`, para não duplicar) e a mutação de evento oculto só para
  `campanha:<id>:mestre`. Cada cliente refaz o GET no seu recorte (mesmo padrão de `documento:organizacao-alterada`).
- Ressincronizar ao reconectar (como os demais). A spec **não** introduz edição colaborativa por Yjs (um evento é
  um registro, não um documento).
- Edição concorrente: último a gravar vence, com aviso se o registro mudou desde a abertura (pergunta 9).

### Vínculo com os cadernos (reaproveitamento explícito)

- Mecanismo reaproveitado: **link Markdown no próprio texto do caderno**, sem tabela de vínculo. Novo prefixo
  **`#calendario-evento-<id>`** ao lado de `#biblioteca-documento-<id>`, com o mesmo parser estrito (somente
  inteiro positivo seguro). O menu de contexto sobre a seleção ganha a ação **"Vincular ao Calendário…"**, com
  seletor de evento (busca por título, só eventos que **aquele jogador** pode ver); clicar no trecho abre o
  calendário no evento.
- Herda as garantias da spec de Biblioteca: o vínculo **não concede acesso**; evento oculto/apagado **não vaza
  título**; sobrevive à edição colaborativa; funciona por toque.
- **Impacto de reuso:** o primitivo `EditorMarkdown` e o `MenuAcoes` já foram ampliados para o vínculo à
  Biblioteca; o tratamento de múltiplos tipos de vínculo exige **generalizar** `lerDocumentoDoVinculo` e o
  componente `CadernoVinculoBiblioteca` (nome e API) **sem regredir** a Biblioteca. Aplicar a skill
  `gerenciamento-de-impacto` a todos os consumidores antes de generalizar.
- Direção inversa (evento mostrar os trechos de caderno que apontam para ele) **fica fora**: exigiria índice de
  backlinks (ver `I-022`).

### Eventos de personagem: manuais, automáticos ou assistidos

| Opção | Prós | Contras |
|---|---|---|
| **A. Sempre manuais** | Sem mudança na ficha; zero acoplamento; sai já | O mestre precisa lembrar; esquecimento gera buraco no calendário |
| **B. Automáticos** (ficha entra na campanha, ficha "morre") | Calendário sempre completo | **Não há estado "morto" na ficha** (precisaria de campo novo e contrato em `shared/`); "quando" no mundo do jogo é desconhecido para o sistema (a data de entrada real ≠ data do jogo); regra de Vida ≤ 0 não é morte (há socorro e "Morrendo"); acopla ficha, campanha e calendário |
| **C. Assistidos (recomendada)** | Ação "Registrar no calendário" nos menus da ficha e do membro, que **pré-preenche** tipo, personagem e a data de hoje do jogo; o mestre confirma | Um passo a mais; ainda depende do humano |

Recomendação: **A + C** na primeira entrega; B só depois de existir o estado de morte da ficha (spec própria).

### Interface

- **Visão principal: grade de mês** (dias bem marcados, hoje destacado, missões como faixas contínuas que
  cruzam semanas, marcadores de evento por dia), com **navegação por mês/ano** e salto para "hoje do jogo".
- **Visão secundária: linha do tempo/agenda** (lista cronológica por dia), **padrão no mobile** (360×800), onde a
  grade de 7 colunas fica estreita. A spec **propõe grade + agenda** (não só uma) e justifica: a grade responde
  "o que aconteceu nesta semana", a agenda responde "o que aconteceu desde a última sessão" e funciona no celular.
- Destaques: faixa "Hoje no jogo: 14/03/2027 · Missão atual: …" no topo e, em pequeno, na página da campanha.
- Superfície: **página** `/campanhas/:id/calendario` (análogo: hub de cenas/Biblioteca) e, se o autor quiser,
  **painel flutuante** como a Biblioteca e o Caderno (pergunta 10). Primitivos de `shared/ui` pela API completa;
  se faltar um (grade de calendário), **parar e propor ao autor** (regra "Biblioteca de componentes é obrigatória").
- Tokens: nenhum novo previsto; cores dos tipos via tokens `--selo-*`/`--dano-*` existentes. Alteração de token
  é explícita e vai ao autor.

## Entregáveis

> Anexos em `calendario-campanha-mundo/` ao lado da spec.

1. **Decisões fechadas** (perguntas 1-10) registradas no topo da spec antes de qualquer código.
2. **Contrato em `shared/`:** enum de tipo de evento, DTOs (`Calendario…Dto` pela skill `dto-conventions`) e
   **funções puras de calendário** (soma de dias, intervalo inclusivo, grade do mês, dia da semana) com testes de
   virada de mês/ano/bissexto e sem `Date`.
3. **Migration `0041`** + repository (SQL puro) + service (permissões, emissão) + controller fino + atualização de
   `docs/SCHEMA.md` e `SYSTEM.SPEC.md` §9 e §14 (evento e matriz).
4. **Tempo real:** evento `calendario:alterado` e recortes por sala, com consumidor no frontend e reconexão.
5. **Frontend:** página (grade de mês + agenda), formulário de evento, faixa de hoje/missão atual, estados vazio,
   carregando e erro, e acesso a partir da campanha do mestre e do jogador.
6. **Vínculo Caderno → Calendário** conforme acima, com a generalização segura do vínculo da Biblioteca.
7. **Ação assistida** "Registrar no calendário" para morte e entrada (opção C).
8. Testes (shared, backend com permissões por papel e segredo, frontend) e documentação (`CONTEXT`, `HISTORY`,
   `MEMORY`, `SCHEMA`).

## Critérios de Aceite

- **Data:** `2027-02-28 + 1 dia`, `2028-02-28 + 2 dias` (bissexto), `2026-12-31 + 1 dia` e um intervalo de missão
  que cruza mês e ano estão corretos nos testes **e** na tela, com o navegador em fusos diferentes (ex.: UTC−12 e
  UTC+14) e **sem** o dia deslocar.
- **Permissões:** teste de API por papel (mestre, jogador autor, jogador não autor, espectador, não membro):
  jogador não edita nem apaga o evento de outro; evento oculto nunca aparece para jogador ou espectador, **inclusive**
  em busca, vínculo de caderno e evento de tempo real.
- **Tempo real** com dois usuários (`verify`): jogador cria uma nota e o mestre vê sem recarregar; mestre revela
  um evento oculto e o jogador passa a ver; reconexão ressincroniza.
- **Vínculo:** selecionar trecho do caderno, vincular a um evento e abrir o evento pelo clique, no desktop (botão
  direito) e no mobile (toque); evento oculto/apagado não vaza título; o vínculo à Biblioteca continua igual
  (regressão).
- Gate visual completo (`verify`, `design-fidelity`) em `1920×1080` e `360×800`, grade e agenda, mês com várias
  missões sobrepostas, mês vazio, dia com muitos eventos, texto longo; comparação com o análogo; sem overflow;
  foco, contraste e alvo de 44px; base clara e escura.
- `npm run test` dos três workspaces, lint, `repo:verificar`.

## Fora de Escopo

- **Entidade `missao`**, remodelamento de campanhas e "missões do esquadrão"
  (`campanhas-missoes-esquadrao-levantamento.spec.md`).
- Calendário customizado (meses/dias próprios), hora do dia, fusos do mundo do jogo.
- Eventos **automáticos** (opção B) e novo estado "morto" na ficha.
- Edição colaborativa em tempo real de um evento (Yjs) e comentários.
- Backlinks (evento → trechos de caderno que o citam), exportação do calendário (`I-022`).
- Pagamento, Prestígio e salário por duração de campanha (regras do livro; dependem do modelo de missão).
- Notificações e lembretes.

## Dependências

- **Nenhuma spec precisa estar concluída.** Depende de decisões do autor (perguntas abaixo).
- `caderno-vincular-trecho-biblioteca` (done) e `caderno-esquadrao-colaborativo` (done): código reaproveitado.
- Recomendável ler `campanhas-missoes-esquadrao-levantamento.spec.md` para alinhar nomes (missão × campanha).
- Fontes: `docs/SYSTEM.SPEC.md` §9 e §14, `docs/SCHEMA.md`, `docs/CONVENTIONS.md`, `docs/core/sistema-v4.1.5.md`
  (Missões, Dias Operacionais), `docs/design/DESIGN.md`, skills `tempo-real`, `sql-migrations`, `dto-conventions`.

## Impacto (skill `gerenciamento-de-impacto`)

| Camada | Efeito |
|---|---|
| `shared/` | Enum, DTOs e funções puras de calendário (novo diretório); **sem** mexer em `regras/` de regra de jogo |
| Backend | Novo módulo `calendario` (controller/service/repository); `CampanhaGateway` ganha emissão; `CampanhaService` só consultado para papel |
| Banco | Migration `0041` (2-3 tabelas) |
| Frontend | Novo módulo de página; ajuste em `CadernoVinculoBiblioteca`/`lerDocumentoDoVinculo`, `EditorMarkdown`/`MenuAcoes` já ampliados; entradas de menu da campanha e da ficha |
| Tempo real | Novo evento e salas; recorte por papel |
| Regras | Nenhuma alteração; terminologia "Dias Operacionais" respeitada |
| Docs | `SCHEMA`, `SYSTEM.SPEC` §9/§14, `CONTEXT`, `HISTORY`, `MEMORY` |
| Deploy | Backend (migration roda no Cloud Build) e frontend |

## Riscos e Mitigação

- **Data deslocada por fuso:** a maior armadilha de calendário. Mitigação: texto `AAAA-MM-DD`, `DATE` sem fuso,
  aritmética em funções puras de inteiros e teste em fusos extremos.
- **Vazamento de evento oculto** por busca, vínculo, evento de socket ou contagem: testes por canal.
- **Quebrar o vínculo da Biblioteca ao generalizar:** regressão obrigatória e análise de impacto prévia.
- **Acoplar à remodelagem de campanhas:** missão como evento tipado, `missao_id` nulo adiado.
- **Nomenclatura:** "campanha" × "Campanha" (tipo de missão) confunde jogadores; decidir antes de rotular a tela.
- **Escopo crescer para "sistema de missões":** qualquer regra de prestígio, pagamento ou status de missão é
  recusada aqui.

## Estratégia de testes e verificação (skill `verify`)

Puros (shared): datas. Backend: permissões por papel e segredo, eventos de socket por sala, migration em banco
real. Frontend: grade, agenda, formulário, vínculo e estados. Stack real com **dois usuários**, mestre e jogador,
e um espectador, em 1920×1080 e 360×800.

## Perguntas abertas

1. **Nomenclatura:** como chamar a unidade de jogo e a mesa? (o livro usa "Campanha" para missão longa). Rótulo da
   tela: "Calendário"? "Linha do tempo"? "Diário de campanha"?
2. **Calendário:** gregoriano, ou meses/dias próprios do mundo? Em que **ano** o jogo começa?
3. **Tipos de evento da primeira entrega:** `MISSAO`, `MORTE`, `ENTRADA`, `NOTA` bastam? Quem cria missão e
   morte/entrada: só o mestre ou também jogadores?
4. **Onde guardar "hoje":** em tabela própria do calendário ou como colunas de `campanha`?
5. **Missão atual:** derivada da data de hoje (a que contém o dia) ou **marcada manualmente** pelo mestre?
6. **Espectador:** vê o calendário (apenas eventos públicos) ou não, dado que o Caderno lhe é negado?
7. **"Como já se faz com imagens":** o autor se referia ao vínculo de trecho do Caderno a documentos da
   **Biblioteca** (inclui imagens)? Quer o mesmo para o calendário?
8. **Quem move o "hoje":** só o mestre (recomendado) ou qualquer jogador?
9. **Conflito de edição:** último a gravar vence com aviso é suficiente?
10. **Superfície:** só página, ou também painel flutuante como a Biblioteca e o Caderno? Faixa de "hoje/missão
    atual" na página da campanha e na ficha?
11. **Jogador apagar o evento de outro:** confirmar que **não** (só o mestre).
12. **Evento oculto:** o jogador deve ver que "existe algo oculto" naquele dia (marcador sem título) ou nada?
