# m11-oficina-regras.spec.md

> **Milestone M11 — Oficina das Regras (editor da estrutura dos livros no site).** Consolida a
> conversa de 09/10/2026 com o autor. Este arquivo é guarda-chuva: implementar somente pelas tasks
> `m11-01`…`m11-10`, cada uma com a sua spec em `docs/specs/backlog/` (a quebra abaixo é a proposta;
> as specs de task são escritas antes de cada implementação). Promove a `I-053` do `IDEAS.md`.

> **Fontes visuais (anexos desta spec, aprovados pelo autor em 09/10/2026):**
> - [`m11-oficina-regras/m11-oficina-exemplao.html`](m11-oficina-regras/m11-oficina-exemplao.html) —
>   exemplão interativo da Oficina (edição no lugar, inserção, sumário, comparador, publicação).
> - [`m11-oficina-regras/m11-modelagem.html`](m11-oficina-regras/m11-modelagem.html) — diagrama da
>   modelagem, exemplo do Combatente em linhas, estados e comparador.
>
> Mockup é fonte visual, **nunca de mecânica nem de texto**. O exemplão usa só um trecho do Sistema;
> os valores alterados no exemplo de comparação da modelagem são ilustrativos.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`. Todo
> controle usa o primitivo de `shared/ui/` com a API completa; se faltar variante, glifo ou
> primitivo, **parar e perguntar ao autor**. O exemplão usa quatro peças que hoje **não existem** em
> `shared/ui/` e exigem decisão do autor na task correspondente: barra de ferramentas da peça,
> menu de inserção ("/" e "+"), paleta "Ir para peça" (Ctrl+K) e menu suspenso do botão Publicar.

## Vocabulário

- **Livro** = um documento de regras: Sistema (guia do jogador), Guia do Mestre e, no futuro,
  expansões (ex.: "Contratados Medieval"). Os livros juntos continuam sendo **as Regras**.
- **Peça** = uma unidade com identidade dentro de um livro (seção, parágrafo, classe, arquétipo,
  habilidade, equipamento, condição…). É uma linha de `regra_peca`.
- **Cópia de trabalho** = o livro em edição (`regra_peca`). **Fotografia** = uma publicação
  congelada do livro inteiro (`livro_versao`).
- **Oficina das Regras** = o modo de edição do próprio leitor de Regras.

## Objetivo

Tirar o Google Docs do fluxo: o autor edita a estrutura e o texto dos livros dentro do site, publica
rascunho para testers ou versão para todos, e compara versões peça a peça. O banco passa a ser a
fonte da verdade das Regras.

## Decisões de produto fechadas

| Tema | Decisão |
|---|---|
| Nome | **Oficina das Regras**. |
| Quem edita e publica | Só `ADMIN` nesta milestone. Edição por outros usuários fica para depois (`I-060`, permissões extras). |
| Estados | **Em edição** (só admin vê, na Oficina) → **rascunho publicado** (testers veem o rascunho atual) → **versão publicada** (todos veem a atual). Quem não é tester vê só a versão publicada atual. |
| Versões | Toda publicação (rascunho ou versão) é guardada e imutável. Abrir uma versão antiga **só para leitura** é recurso de admin e entra na M11 (o comparador de histórico depende dele). |
| Fonte da verdade | **O banco.** Importação única do `.md` atual; o Google Docs sai do fluxo. Cada versão publicada é exportada para `docs/core/` como **cópia gerada** (git e agentes continuam lendo as regras); ninguém a edita à mão. Emenda ao SYSTEM.SPEC §1.1 e ao `CLAUDE.md`/`AGENTS.md` na `m11-10`. |
| Expansões | A modelagem aceita N livros desde o início. Criar livro novo pela interface fica fora da M11. |
| Comparador | Entra na M11, nos dois usos: **edição × versão publicada** (conferir antes de publicar) e **histórico** (duas versões quaisquer). Casa peças pelo `identificador`, não pelo título. |
| Motor | Editar texto **não** altera `shared/regras`. Catálogos do motor gerados do livro continuam ideia (`I-052`). |

## Modelagem fechada

Detalhe visual no anexo `m11-modelagem.html`. Toda tabela tem as colunas de BaseEntity
(SYSTEM.SPEC §10.1); enums de coluna são tabelas `tipo_*` (§10.3).

| Tabela | Papel | Colunas próprias |
|---|---|---|
| `livro` | quais livros existem | `codigo` (`sistema`, `guia`… → URL `/regras/<codigo>`), `titulo`, `ordem` |
| `tipo_regra_peca` | tipos de peça | `codigo` (`SECAO`, `PARAGRAFO`, `CLASSE`, `ARQUETIPO`, `HABILIDADE`…) |
| `regra_peca` | cópia de trabalho, uma linha por peça | `livro_id`, `peca_pai_id` (árvore), `tipo_regra_peca_id`, `identificador` (UUID estável), `ancora` (única por livro), `ordem`, `dados` (JSONB tipado no `shared/`), `revisao` (trava otimista) |
| `regra_peca_ancora_antiga` | links antigos continuam funcionando | `regra_peca_id`, `ancora` |
| `tipo_livro_versao_situacao` | situação da publicação | `codigo` (`RASCUNHO`, `PUBLICADA`) |
| `livro_versao` | fotografias imutáveis | `livro_id`, situação, `numero` (editorial, ex. `4.1.5`), `formato` (versão do contrato do JSON), `conteudo` (JSONB do livro inteiro, com o `identificador` de cada peça), `publicacao_data`, `usuario_id`, `nota` |

Regras da modelagem:

- **Vira peça própria** o que tem identidade (pode ser linkado, aparecer na ficha ou ser comparado):
  seção, parágrafo, nota, lista, tabela, classe, arquétipo, subclasse, origem, habilidade,
  equipamento, modificação, condição, termo, ficha de criatura, roteiro. **Fica em `dados`** o que é
  só conteúdo da peça (citação, fórmulas de Saúde, texto rico com negrito/NA/links).
- **Link interno aponta para o `identificador`**; a publicação o resolve em âncora na fotografia.
  Renomear uma peça não quebra referência; a âncora antiga vai para `regra_peca_ancora_antiga`.
- **Texto rico não é normalizado**: os trechos (o `RegrasTrecho` atual) ficam como JSON em `dados`.
- `revisao` existe desde já, embora haja um único editor: custa pouco e é pré-requisito da `I-060`.
- O rascunho e a versão atuais de cada livro são a `livro_versao` mais recente de cada situação.

## Decisões de usabilidade fechadas (exemplão aprovado)

O uso principal do autor é **editar o que já existe** (revisar texto, ajustar custos, adicionar e
remover habilidades); criação é menos frequente; edição pesada no computador, correções no celular.

- **Editar no próprio livro.** A Oficina é o leitor de Regras com o interruptor **Leitura / Oficina**
  (só admin vê). O livro aparece com o mesmo desenho do leitor; nada de página de formulário.
- **Campos no lugar:** clicar em nome, efeito, citação ou fórmula torna o campo editável ali.
  Custo de Energia: clique no selo, digita número ou `X`, Enter. Enter em campo curto pula para o
  próximo campo; Enter no fim de um parágrafo cria outro; Backspace em parágrafo vazio o remove.
- **Atalhos de escrita:** Ctrl+B/Ctrl+I; `NA0`…`NA7` + espaço vira o selo de nível de ameaça.
- **Ir para peça (Ctrl+K):** busca por nome em todo o livro e leva até a peça já em edição.
- **Ferramentas da peça** só aparecem no modo Oficina, com a peça selecionada: REAÇÃO (habilidade),
  mover ↑↓, duplicar, remover. Remover avisa com "Desfazer".
- **Inserir:** "+" entre peças e no fim das listas; "/" em linha vazia abre o menu de peças filtrável
  (`/hab`, `/nota`…). As opções dependem do contexto (dentro de classe só Arquétipo). Peças compostas
  nascem com o esqueleto (arquétipo já com a habilidade inicial vazia).
- **Estrutura pelo sumário:** arrastar seções e arquétipos entre irmãos.
- **Nunca perder trabalho:** salvamento automático por peça com indicador ("Salvando…"/"Salvo"),
  Ctrl+Z e botão Desfazer para a sessão inteira.
- **Avisar sem travar:** pendências (habilidade sem nome, custo ou efeito; link para peça
  inexistente) aparecem na peça e num contador; **rascunho** pode sair com pendência, **versão não**.
- **Marcas de mudança:** ponto amarelo em peça alterada e verde em peça nova, sempre contra a
  versão publicada.
- **O que mudou:** gaveta com abas *Edição × publicada* (clique leva à peça) e *Histórico* (duas
  versões); mudanças classificadas em nova, removida, alterada (campo a campo, texto palavra a
  palavra) e movida, com caminho da peça.
- **Publicar ▾:** rascunho ou versão; diálogo com o resumo das mudanças, número sugerido
  (patch + 1), nota opcional "o que mudou".
- **Celular:** editar o que existe (campos, custo, ferramentas) funciona; a edição pesada (arrastar,
  criar classe) é pensada para desktop. Adaptar a edição pesada ao celular fica para depois.

## Quebra em tasks (proposta)

| Task | Entrega | Depende de |
|---|---|---|
| `m11-01` | Contrato da árvore no `shared/`: tipos de peça, `dados` por tipo, validador puro, versão do formato; tipos do leitor passam a vir do `shared/` | — |
| `m11-02` | Migration e repositórios: `livro`, `tipo_regra_peca`, `regra_peca`, `regra_peca_ancora_antiga`, `tipo_livro_versao_situacao`, `livro_versao` | 01 |
| `m11-03` | Importador único `.md` → `regra_peca` com identificadores; diagnóstico revisado com o autor (as 11 grades e avisos restantes); Sistema 4.1.4 e Guia 4.2.0 entram como primeira `PUBLICADA` | 01, 02 |
| `m11-04` | Publicação e leitura por papel: montar fotografia, publicar rascunho/versão (só `ADMIN`), API de leitura (todos → publicada, tester → rascunho, admin → qualquer versão); leitor passa a ler da API | 02, 03 |
| `m11-05` | Comparador puro no `shared/`: casar por `identificador`, campos alterados, diff por palavras, movidas; testes | 01 |
| `m11-06` | Oficina — núcleo: modo Oficina no leitor, campos no lugar, custo, ferramentas da peça, salvamento por peça com `revisao`, desfazer, pendências, Ctrl+K | 04 (+ decisão de primitivos) |
| `m11-07` | Oficina — inserir e estruturar: "+" e "/", esqueletos de peças compostas, arrastar no sumário, âncora antiga ao renomear | 06 |
| `m11-08` | Oficina — demais blocos ricos editáveis no lugar (equipamento, modificação, origem, subclasse, termos, ficha de criatura, roteiro, tabela, grade) | 06 |
| `m11-09` | O que mudou, Publicar e histórico: gaveta do comparador, diálogo de publicação, abrir versão antiga só leitura (admin) | 04, 05, 06 |
| `m11-10` | Troca da fonte da verdade: `regras:exportar` para `docs/core/`, emenda ao SYSTEM.SPEC §1.1, `CLAUDE.md`/`AGENTS.md` e skill `regras-do-jogo`; normalizador sai do `prestart`/`prebuild` (fica só como importador) | 03, 04 |

`m11-05` pode correr em paralelo com `02`–`04`. `m11-08` pode ser fatiada por bloco.

## Questões a decidir nas specs de task

- **Primitivos** (`m11-06`/`07`/`09`): barra de ferramentas da peça, menu de inserção, paleta
  Ctrl+K e menu suspenso não existem em `shared/ui/`; ampliar ou criar é decisão do autor.
  `editor-markdown`, `valor-editavel`, `gaveta`, `modal`, `segmentado` e `notificacao` são os
  candidatos a reuso.
- **Formato exportado** para `docs/core/` (`m11-10`): Markdown legível com identificadores, JSON da
  fotografia, ou os dois.
- **Leitura pública** (`m11-04`): API direta com cache, ou fotografia publicada como asset estático
  na publicação; impacto no tempo de abertura e no modo offline do painel.
- **Granularidade do salvamento** (`m11-06`): por campo ao sair dele ou com debounce; tamanho da
  pilha de desfazer e se ela sobrevive a recarregar a página.
- **Versões anteriores à importação** (4.1.3 e antes) não têm identificador: ficam fora do
  comparador peça a peça; decidir na `m11-03` se alguma entra como fotografia só de leitura.

## Fora de escopo

Edição por não-admins e permissões extras (`I-060`); criar livro novo pela interface; edição pesada
adaptada ao celular; catálogos do `shared/regras` gerados do livro (`I-052`); "Ver regra" na ficha
(`I-054`, fica mais fácil com o `identificador`); link interno por `@` no editor; ingestão de `.docx`
(`I-055`, perde sentido com o Docs fora do fluxo); Paged.js (`I-056`).
