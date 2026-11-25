# regras-exportar-markdown-pdf.spec.md

> Task avulsa. Origem: pedido do autor após as Sessões 4 e 5 da campanha (27/10 e 10/11/2026) e a
> revisão posterior. O sistema agora vive só no site (o Google Docs foi abandonado); o autor precisa
> levá-lo para o ambiente local e passá-lo a uma IA de escrita que trabalha com arquivos.
> Pedido **A** de `PEDIDO_CLAUDE_CODE_SPECS_SITE.md`, prioridade alta. Só especificação: nenhum
> código nesta etapa.

## Objetivo

Permitir que o próprio site entregue o **Sistema** (e o **Guia de Mestre**) como arquivo **Markdown**
completo, estável e legível por pessoa e por IA, sem o autor precisar rodar o repositório. O
**PDF** segue como segundo formato, para leitura e impressão. O banco continua sendo a única fonte
editável: a exportação é leitura.

## Estado atual encontrado no código

O pedido é **em boa parte já resolvido pela infraestrutura existente**; falta a porta de entrada no site.

| Peça | Onde | O que faz hoje |
|---|---|---|
| Conversor de livro em Markdown | `shared/src/livro/exportar-markdown.ts` (`exportarLivroEmMarkdown`) | Função **pura e determinística** sobre `LivroVersaoConteudoDto`. Já cobre títulos (`##` no nível 1), tabelas, listas, citações, tarjas (`█`), links internos, cartões (classe, arquétipo, origem, equipamento, ficha de criatura) e marcas em comentário HTML. Exportada por `shared/src/livro/index.ts`; o frontend **já importa** `@contratados-rpg/shared/livro` em outros pontos. |
| Geração da cópia em `docs/core/` | `backend/tools/regras/exportar-livros.ts`, `backend/src/modules/livro/exportador/arquivo-gerado.ts` (`npm run regras:exportar`) | Lê as versões **PUBLICADAS** do banco, aplica `exportarLivroEmMarkdown` e grava `docs/core/sistema-v<N>.md` e `guia_de_mestre-v<N>.md` com cabeçalho "gerado — não edite" e `sha256` do corpo. É o que as notas do autor descrevem. **Cobre o conteúdo, mas exige o repositório e o banco local.** |
| Leitura pública da publicação atual | `GET /livros/:codigo/publicada` (`livro.controller.ts`, `@AutenticacaoOpcional`) | Devolve `LivroLeituraDto` com `numero`, `publicacaoData` e o `conteudo` completo, **sem exigir login**, sempre a versão publicada (nunca rascunho). `RegrasService.carregarPublicada` já a consome. |
| Leitura "do papel" | `GET /livros/:codigo` | ADMIN/TESTER enxergam o **rascunho** quando ele é mais novo que a publicação (`PAPEIS_QUE_VEEM_RASCUNHO`). Não serve de base para exportar: o arquivo exportado nunca deve conter rascunho. |
| Pacote JSON administrativo | `GET /livros/pacotes/publicados` (`ADMIN`), `oficina/oficina-exportar.component.*`, `oficina-exportacao.service.ts`, `livro-pacote.*` | Baixa JSON **estruturado** da publicação atual para importar em outro ambiente (`regras:importar-pacote`). É transporte entre bancos, não leitura. Não gera Markdown. |
| PDF | `frontend/src/app/modules/regras/regras-impressao.service.ts` e `regras-impressao.component.*` | **Impressão nativa** do navegador (`window.print`) com CSS `@media print` (M10-10). **Sistema está suspenso** em `exportarDocumento` (`documento.id === "sistema"` retorna sem fazer nada) por causa do **P-108** (formatação "bem estranha"). Guia exporta. |
| Revisão do PDF | `docs/specs/backlog/revisao-formatacao-pdf-regras.spec.md` | Já planejada: avaliar página a página, ajustar a impressão nativa e **reativar o Sistema** só após aprovação do autor. Esta spec **não a duplica**. |
| Botão na tela | `regras.page.html`, `regras-flutuante.component.html` | Existe a ação **Exportar PDF** (cabeçalho do trilho). **Não existe** ação de Markdown. |

Observações de fidelidade, medidas em `docs/core/sistema-v4.1.5.md` (3.331 linhas) e confirmadas no
código do conversor:

- Títulos saem com âncora no estilo `## ⬢ Introdução {#introducao}` (213 âncoras). `{#id}` **não é
  CommonMark**: viewers comuns mostram o texto cru; IAs e Pandoc/kramdown entendem.
- Marcas que o Markdown não carrega saem em comentário HTML (`<!-- nota -->`, `<!-- exemplo -->`,
  `<!-- grade -->`, `<!-- fórmula -->`, `<!-- termos: ... -->`; 52 ocorrências). Preservam semântica
  para IA, mas o autor pediu "sem lixo de HTML".
- Células de tabela com quebra usam `<br>`.
- Glifos de seção (⬢ ⬡ ⬥ ⬦) são texto simples e sobrevivem; tarjas viram `█`.
- O corpo do Sistema 4.1.5 ainda traz a linha `**VERSÃO 4.1.4**` (conteúdo editorial do livro, não do
  exportador). O cabeçalho do arquivo gerado deve vir do `numero` da publicação, nunca dessa linha.
  Correção do texto é da Oficina das Regras, fora desta spec.

## Proposta

### Fase 1 — Markdown pelo próprio site (a entrega principal)

1. **Geração no cliente**, sem endpoint novo: o frontend lê `GET /livros/:codigo/publicada`, chama
   `exportarLivroEmMarkdown(livro.conteudo)` (a mesma função pura que alimenta `docs/core/`) e baixa um
   `Blob` `text/markdown;charset=utf-8`. Uma única implementação do conversor, então o arquivo do site
   e o de `docs/core/` **não divergem** por construção.
2. **Nome do arquivo:** `sistema-v4.1.5.md` e `guia_de_mestre-v4.2.0.md`, o mesmo padrão de
   `arquivo-gerado.ts`, para o autor tratar os dois de forma idêntica.
3. **Cabeçalho de procedência no topo do arquivo**, em comentário, no espírito do cabeçalho de
   `docs/core/`: livro, número da versão, data da publicação (`publicacaoData`, ISO UTC) e instante de
   geração. Diferente de `docs/core/` (determinístico, sem data), o arquivo do site **pode** trazer o
   instante de geração, pois não é versionado no Git.
4. **O arquivo exportado não é a fonte da verdade.** O cabeçalho diz isso, e o hash `sha256` do corpo
   só entra se o autor quiser conferência (pergunta aberta). Nenhuma rota importa esse Markdown de volta.
5. **Ponto de entrada:** ação "Exportar Markdown" ao lado de "Exportar PDF" na página de Regras e no
   painel flutuante/gaveta, com os primitivos de `shared/ui/` (botão de ícone com tooltip, como a ação de
   PDF) e ícone do catálogo. Análogo aprovado: a própria ação "Exportar PDF" do trilho.
6. **Escopo:** Sistema **e** Guia (o conversor já trata os dois códigos; o custo é o mesmo).

### Fase 2 — PDF

- Reaproveita a impressão nativa existente. **Reativar o Sistema depende da spec
  `revisao-formatacao-pdf-regras`** (P-108). Esta spec **não** altera o CSS de impressão.
- O mínimo desta spec para o PDF: mensagem clara na interface quando o Sistema está suspenso (hoje o
  clique simplesmente não faz nada, sem aviso) e o Markdown como caminho alternativo enquanto isso.

### Alternativas consideradas

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| **Cliente + `shared` (proposta)** | Zero backend; reuso total do conversor; sem custo de servidor; funciona para visitante | Depende de a página ter a publicação; geração no navegador (3.300 linhas, instantâneo) | **Recomendada** |
| Endpoint `GET /livros/:codigo/markdown` | Arquivo igual para qualquer cliente (curl, automação); cabeçalho de `Content-Disposition` | Endpoint novo, teste HTTP, cache; para o uso do autor não agrega | Só se o autor quiser automatizar o download fora do navegador (pergunta 3) |
| Reaproveitar o pacote JSON do admin | Já existe | É JSON de transporte; exigiria conversor no cliente do mesmo jeito; exige ADMIN | Descartada |
| PDF por biblioteca no cliente (`jsPDF`, `pdf-lib`) | PDF sem diálogo de impressão | Dependência nova não prevista nas convenções; refaz do zero tabelas, quebras e paleta que o CSS de impressão já resolve; manutenção dupla do layout | Descartada nesta spec; só com decisão do autor |
| PDF no servidor (Chromium headless no Cloud Run) | Arquivo idêntico para todos; automatizável | Imagem grande, memória e custo no Cloud Run; segundo pipeline de layout; risco operacional | Descartada |
| **Impressão nativa existente** | Sem dependência, já feita, mesmo CSS do leitor | Depende da avaliação editorial do P-108; sumário sem número de página (limite conhecido da M10-10) | **Mantida para a Fase 2** |

### Permissões

O Sistema e o Guia **já são públicos** na leitura (`/livros/:codigo/publicada` aceita visitante). O
Markdown é o mesmo conteúdo que a página mostra, então a recomendação é **a mesma regra da leitura**:
quem lê, exporta. Papéis de campanha (mestre/jogador/espectador) **não se aplicam**: o livro é global,
não pertence a campanha. Pergunta aberta 2 confirma isso com o autor.

## Entregáveis

1. Função/serviço de exportação no frontend (módulo `regras`) que lê a publicação **atual** pelo
   endpoint `/publicada`, converte com `exportarLivroEmMarkdown` e baixa o arquivo `.md`.
2. Cabeçalho de procedência (livro, versão, `publicacaoData`, instante de geração, "não é fonte da
   verdade") definido numa função pura testável, ao lado do conversor ou do serviço.
3. Ação "Exportar Markdown" nos mesmos lugares da ação de PDF, com estados de carregamento, sucesso e
   erro recuperável (padrão de `oficina-exportar.component`: notificação de sucesso/erro).
4. Mensagem explícita quando a exportação de PDF do Sistema está suspensa (P-108), no lugar do clique
   sem efeito.
5. Documentação: ponteiro em `docs/context/MEMORY.md` (onde vive a exportação do site) e nota em
   `CONTEXT.md` na seção de Regras. Nenhuma edição em `docs/core/`.
6. Decisão registrada sobre os pontos de fidelidade (âncoras `{#id}`, comentários HTML, `<br>` em
   células): cada um com a escolha do autor e, se mudar o conversor, o efeito em `docs/core/`.

## Critérios de Aceite

- O arquivo baixado pelo site, para um livro publicado, é **idêntico byte a byte** ao corpo gerado por
  `npm run regras:exportar` para a mesma publicação (exceto o cabeçalho de procedência). Teste
  automatizado com a mesma fixture.
- Visitante sem login baixa Sistema e Guia; usuário ADMIN/TESTER com rascunho mais novo baixa **a
  publicação**, não o rascunho (teste com sessão de admin e rascunho pendente).
- O nome e o cabeçalho trazem o número da versão **publicada** (`4.1.5`), não a linha `VERSÃO` do corpo.
- O arquivo abre em dois visualizadores Markdown comuns e é lido por uma IA de arquivos sem lixo
  estrutural; tabelas, listas, tarjas e glifos ⬢ ⬡ ⬥ ⬦ preservados. Conferência manual registrada.
- Falha de rede ou 404 mostra erro recuperável; o botão não fica preso em "exportando".
- Gate visual com a skill `verify` nos viewports `1920×1080` e `360×800`, na página e no painel
  flutuante, comparando com a ação "Exportar PDF" (análogo). Testes de `shared` e `frontend`, lint e
  `npm run repo:verificar` verdes.

## Fora de Escopo

- Importar Markdown de volta para o livro (a Oficina é a única edição).
- Alterar conteúdo do Sistema/Guia (inclusive a linha `VERSÃO 4.1.4`) e `docs/core/`.
- Reformatar o PDF ou reativar o Sistema no PDF: `revisao-formatacao-pdf-regras.spec.md`.
- Exportar fichas (Agente, Criatura, NPC): `ficha-exportar-criatura-npc-agente.spec.md`.
- Exportar o Caderno (`I-022` em `IDEAS.md`).
- Substituir ou alterar `regras:exportar`, o pacote JSON administrativo ou o importador.
- Endpoint de download no backend (salvo a decisão da pergunta 3).

## Dependências

- Nenhuma para a Fase 1 (tudo já existe).
- Fase 2: `revisao-formatacao-pdf-regras.spec.md` (P-108) em `done/`.
- Fontes de consulta: `docs/SYSTEM.SPEC.md` §1.1, `docs/core/` (apenas leitura), skill `regras-do-jogo`
  (não altera regra), `docs/design/DESIGN.md` para o botão.

## Impacto (skill `gerenciamento-de-impacto`)

| Camada | Efeito |
|---|---|
| `shared/` | Opcional: função pura do cabeçalho de procedência. O conversor existente só muda se o autor decidir mexer em âncoras/comentários (pergunta 1). |
| Backend | **Nenhum** na recomendação. Mudar o conversor altera `docs/core/` na próxima exportação e o hash do corpo; `repo:verificar` acusará a diferença até regerar. |
| Frontend | Serviço + ação de UI em `modules/regras`; consumidores de `regras.page`, `regras-flutuante` e gaveta mobile. |
| Banco / migrations | Nenhum. |
| Tempo real | Nenhum. |
| Regras do jogo | Nenhum (leitura). |
| Docs | `MEMORY.md`, `CONTEXT.md`, `HISTORY.md` no fecho. |
| Deploy | Só frontend; sem variável nova. |

## Riscos e Mitigação

- **Segunda fonte editável:** mitigada pelo cabeçalho "não é fonte da verdade" e por não existir rota de
  importação. Qualquer pedido de "importar" é outra spec.
- **Divergência entre arquivo do site e `docs/core/`:** mitigada por usar a mesma função e pelo teste
  de igualdade byte a byte.
- **Rascunho vazando para o arquivo:** mitigado por usar `/publicada` e teste com admin.
- **Mudar o conversor por estética:** muda `docs/core/` inteiro e invalida hashes. Qualquer ajuste de
  formato é uma decisão separada e vai com regeneração e conferência de `repo:verificar`.

## Estratégia de testes e verificação (skill `verify`)

- `shared`: teste do cabeçalho de procedência; conversor já tem `exportar-markdown.spec.ts`.
- `frontend`: teste do serviço (chama `/publicada`, nunca `/livros/:codigo`; monta nome e cabeçalho;
  trata erro) e do componente (estados de botão).
- `backend`: nenhum teste novo na recomendação; rodar a suíte existente do exportador.
- App real (`verify`) nos dois viewports, baixando e abrindo o arquivo dos dois livros.

## Perguntas abertas

1. **Fidelidade do Markdown:** manter `{#âncora}` nos títulos e os comentários `<!-- nota -->`,
   `<!-- exemplo -->`, `<!-- grade -->`, `<!-- fórmula -->` (preservam semântica para a IA) ou entregar
   uma variante **limpa** (sem âncoras e sem comentários) para leitura humana? Pode ser as duas, com uma
   opção na ação.
2. **Quem pode exportar:** confirmar "quem lê, exporta" (público, inclusive visitante) ou restringir a
   usuário logado.
3. **Automação:** existe a necessidade de baixar o arquivo **sem navegador** (script do autor, `curl`)?
   Se sim, entra o endpoint de download.
4. **Conferência:** incluir `sha256` do corpo no cabeçalho, como em `docs/core/`?
5. **PDF do Sistema:** manter suspenso até a revisão do P-108 (recomendado) ou liberar o PDF atual
   com aviso enquanto isso?
