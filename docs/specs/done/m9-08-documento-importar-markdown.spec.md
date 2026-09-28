# m9-08-documento-importar-markdown.spec.md

> **Task avulsa pós-M9 (pedido direto do autor, 2026-09-28).** Segunda de quatro specs de melhoria da
> Biblioteca (`m9-07` desselecionar, `m9-08` importar Markdown, `m9-09`/`m9-10` quem está lendo).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` (seção "Biblioteca de documentos") e o handoff
> em `docs/design/tema/`. Todo controle usa o primitivo de `shared/ui/` com a API completa; se faltar
> um, **parar e perguntar ao autor**.

## Objetivo

O mestre, editando um documento de **texto** da Biblioteca, escolhe um arquivo `.md` do computador e o
conteúdo dele entra no editor, formatado (títulos, listas, tabelas GFM). O texto importado vira
**rascunho**: só é gravado quando o mestre clica em **Salvar**, como qualquer outra edição da
Biblioteca.

**O arquivo nunca é enviado nem armazenado.** A leitura é client-side (`arquivo.text()`); só o texto
normalizado vai ao backend, no `conteudoMarkdown` do `PUT` que o "Salvar" já faz. Sem upload, sem
endpoint, DTO ou migration novos — mesmo princípio de `caderno-importar-markdown` (concluída).

## Análogo aprovado (registrar no fecho da task)

- **A importação do Caderno** (`docs/specs/done/caderno-importar-markdown.spec.md`), já aprovada:
  normalização, validações, mensagens e ícone `importar`. Implementação em
  `frontend/src/app/modules/pagina-caderno/importar-markdown.ts` e o handler
  `aoSelecionarArquivo` de `caderno-conteudo.component.ts:323`.
- **O controle "Trocar imagem"** da edição de documento `IMAGEM` na própria Biblioteca
  (`biblioteca-mestre.page.html`, bloco `.biblioteca__upload`): `app-botao` `tamanho="pequeno"` que
  aciona um `<input type="file" hidden>`, com dica e erro logo abaixo. O botão de importar é o
  equivalente dele no documento de texto — mesma posição, densidade e tratamento de erro.

## Estado atual

- Edição de `TEXTO` na página do mestre (`biblioteca-mestre.page.html:83-115`): `app-campo` "Título",
  rótulo "Conteúdo", `app-editor-markdown` ligado a `conteudoEdicao` por `[valor]`/`(valorChange)` e a
  dica `n/100000 caracteres`. Salvar é explícito; `haRascunho()` compara título e
  `editor.confirmarValor()` com o salvo e alimenta a confirmação de descarte e o `beforeunload`.
- `EditorMarkdown` reaplica `[valor]` quando ele difere do conteúdo atual (`definirMarkdown`,
  `editor-markdown.component.ts:241-258`) — trocar `conteudoEdicao` substitui o texto do editor.
- O editor compartilhado já tem o preset GFM (tabelas, riscado, lista de tarefas).
- `importar-markdown.ts` vive dentro de `modules/pagina-caderno/` e usa
  `PAGINA_CADERNO_TITULO_MAXIMO` em `derivarTituloDeArquivo`. `normalizarMarkdownImportado` e
  `possuiFrontMatterYaml` não dependem do Caderno.
- Limite do documento: `DOCUMENTO_CONTEUDO_MAXIMO = 100_000`
  (`shared/src/validators/documento.validators.ts`), validado de verdade pelo backend.

## Entregáveis

1. **Normalização compartilhada, sem cópia.** Mover a parte genérica de `importar-markdown.ts`
   (`normalizarMarkdownImportado`, `possuiFrontMatterYaml`, o tipo `FalhaImportacaoMarkdown`) para um
   lugar comum do frontend (ex.: `frontend/src/app/shared/markdown/importar-markdown.ts`), com o
   `.spec.ts` junto. O Caderno passa a importar de lá; `derivarTituloDeArquivo` (título do Caderno)
   fica onde for mais coeso — no Caderno ou parametrizado pelo limite. **Nenhuma regra duplicada**, e
   os testes do Caderno continuam verdes sem enfraquecer asserção.
2. **Validação do arquivo em função pura** reaproveitada pelos dois consumidores: extensão
   `.md`/`.markdown` (sem diferenciar maiúsculas), tamanho em bytes (1 MB, a constante que hoje é local
   no Caderno), conteúdo vazio depois de normalizar e limite de caracteres **recebido por parâmetro**
   (Caderno: `PAGINA_CADERNO_CONTEUDO_MAXIMO`; documento: `DOCUMENTO_CONTEUDO_MAXIMO`). Acima do limite
   **recusa, não trunca**.
3. **Botão "Importar Markdown"** na edição de documento `TEXTO`, ao lado do rótulo "Conteúdo" (ou logo
   abaixo do editor, junto da dica de caracteres — decidir pela comparação visual com o "Trocar
   imagem"): `app-botao` `variante="secundario"` `tamanho="pequeno"` com `<app-icone nome="importar" />`
   e o texto "Importar Markdown", acionando um `<input type="file" hidden tabindex="-1"
   accept=".md,.markdown,text/markdown">`. Zera `input.value` depois de ler (escolher o mesmo arquivo
   de novo dispara outra vez). Só existe para o mestre e só em edição de `TEXTO`.
4. **Substituir, com confirmação quando houver texto.** Se o conteúdo atual do editor
   (`confirmarValor()`) não está vazio, perguntar pelo `ConfirmacaoService` antes de trocar:
   título "Substituir o conteúdo?", mensagem dizendo que o texto atual do documento será trocado pelo
   do arquivo e que nada é salvo até clicar em Salvar; rótulos "Substituir" / "Cancelar". Confirmado (ou
   editor vazio): `conteudoEdicao.set(normalizado)`. O título do documento **não** muda.
5. **Aviso** no mesmo lugar e formato do erro de imagem da edição (`erroImagem`), com `role="status"`:
   - sucesso: `Importado de "<arquivo>". Salve para gravar.` — e, se havia front matter,
     `Importado de "<arquivo>". Front matter removido. Salve para gravar.`;
   - erros com os textos do Caderno, trocando "página" por "documento" onde houver
     (`Arquivo maior que o limite do documento (100.000 caracteres)`).
   O aviso some ao salvar, cancelar a edição ou trocar de documento.
6. **Documentação de design:** a seção "Biblioteca de documentos" de `DESIGN.md` registra o controle de
   importar na edição de texto.

## Critérios de Aceite

- `npm run test -w frontend` verde, com testes novos/movidos: validação compartilhada (extensão,
  tamanho, vazio, limite por parâmetro, sem truncar); página do mestre (importar com editor vazio não
  pergunta; com texto pergunta, e "Cancelar" mantém o texto; sucesso muda `conteudoEdicao` e não chama
  `alterar`; `.txt` mostra erro e não mexe no conteúdo; o botão não existe em `IMAGEM` nem fora da
  edição); Caderno sem regressão.
- `npm run lint -w frontend` sem erros; nenhuma dependência nova no `package.json`.
- **Verificação pela skill `verify`** em `1920×1080` e `360×800`, sessão de mestre e de jogador:
  - importar um `.md` com títulos, lista, tabela GFM (com alinhamento) e uma imagem remota: o editor
    mostra tudo formatado, a imagem virou link, e **nenhuma requisição** sai ao escolher o arquivo (aba
    Rede); ao Salvar, o `PUT` leva só JSON de texto;
  - recarregar (F5) e reabrir o documento: a tabela continua tabela;
  - documento revelado: o jogador vê o conteúdo novo ao vivo depois do Salvar (`documento:alterado`
    existente), nunca antes;
  - importar e clicar em outro documento → dialog de descarte (o importado é rascunho);
  - arquivo `.txt`, arquivo > 1 MB e arquivo vazio mostram o aviso e não mexem no editor;
  - mobile: botão com alvo ≥ 44 px, aviso visível, sem overflow horizontal.
- Comparação visual com o bloco "Trocar imagem": mesma densidade, mesmo primitivo e tamanho, mesmo
  tratamento de dica/erro.

## Fora de Escopo

- Importar direto no dialog "Novo documento" (criar já a partir do arquivo, com o nome do arquivo como
  título). Hoje o fluxo é "Novo documento → Texto → abre no editor → Importar Markdown".
- Importar vários arquivos de uma vez, arrastar-e-soltar, exportar documento como `.md` (`IDEAS.md`
  `I-022` cobre o equivalente no Caderno).
- Acrescentar o arquivo ao fim do texto existente em vez de substituir.
- Imagens do arquivo como upload de documento `IMAGEM`: imagem remota vira link, local vira o texto
  alternativo — mesma regra do Caderno.
- Backend e `shared/`: nenhuma alteração.

## Dependências

`caderno-importar-markdown` (normalização, ícone `importar`), `m9-04` (`BibliotecaMestre`, edição
explícita, `confirmarDescarte`), `shared/src/validators/documento.validators.ts` (limite, só
consumido), `docs/design/DESIGN.md`.

## Decisões assumidas ao especificar (confirmar com o autor)

1. **Importar é na edição do documento, e substitui o conteúdo** (com confirmação quando há texto) —
   é a leitura literal de "num documento de texto, importar o Markdown de fora". Importar na criação e
   acrescentar ao fim ficam fora.
2. **Importado é rascunho, não salva sozinho** — diferente do Caderno (que grava na hora), porque a
   Biblioteca tem salvar explícito e um documento revelado vai direto para a tela dos jogadores.
3. **Título não muda** ao importar: o documento já tem título escolhido na criação.
