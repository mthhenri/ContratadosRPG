# m9-04-frontend-biblioteca-mestre.spec.md

> Quarta task do milestone `m9-documentos-campanha.spec.md` — frontend. Entrega a biblioteca do
> **mestre** e o **`LeitorDocumento`** compartilhado (o guarda-chuva o listava na `m9-05`; sobe para cá
> porque o mestre lê e edita no mesmo lugar, e porque a `m7-25` o consome para mostrar o documento em
> foco no palco da Investigação — assim a `m7-25` só espera `m9-02` + `m9-04`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`. Todo
> controle usa o primitivo de `shared/ui/` com a API completa (`[variante]`, `[tamanho]`,
> `[posicaoIcone]`…); se `shared/ui/` não cobrir o que a tela pede, **parar e perguntar ao autor**
> (`CLAUDE.md`, "Biblioteca de componentes é obrigatória").

## Objetivo

A página **Biblioteca** do mestre (`/campanhas/:campanhaId/documentos`): lista todos os documentos da
campanha (revelados e ocultos), cria `TEXTO` e `IMAGEM`, lê e edita no próprio lugar, revela/oculta
para a mesa, remove e reordena — tudo atualizado ao vivo pelo `documento:alterado`.

## Análogo aprovado (registrar no fecho da task)

- **Casca da página:** `HubCenas` (`modules/cena/paginas/hub/`, `m7-23`) — cabeçalho com `//`, título e
  botão principal no cabeçalho, cartões, chips de estado, reordenação por setas (`app-botao-icone` +
  `chevron` girado, precedente do `app-paginador`), estado vazio e esqueleto de lista
  (`docs/design/DESIGN.md`, "Estado vazio e esqueleto de lista").
- **Lista + conteúdo (desktop) e duas vistas (mobile):** o Caderno
  (`modules/pagina-caderno/caderno-conteudo.component`) — lista de páginas de um lado, editor do outro;
  no celular, a lista e o conteúdo são vistas separadas, com um botão de volta ("Páginas").
- **Editor de texto:** `app-editor-markdown` (`shared/ui/editor-markdown/`), o mesmo do Caderno.
- **Upload de imagem:** o controle do avatar em `ficha-campanha-card` (`aoSelecionarImagem`, valida tipo
  e tamanho no cliente antes de enviar).
- **Confirmação destrutiva:** `ConfirmacaoService` (`docs/design/DESIGN.md`, "Confirmação destrutiva").

## Estado atual

- Não existe módulo `documento` no frontend. `modules/cena/cena.service.ts` é o molde de service REST;
  `core/services/tempo-real.service.ts` expõe um `Subject` por evento (`cenaAlterada$`) e o `HubCenas`
  mostra o padrão de uso: `entrarSalaCampanha` ao abrir, `sairSalaCampanha` no `onDestroy`,
  `switchMap` para refazer a listagem a cada evento e um `effect` sobre `reconexao()` para refazer
  depois de uma queda.
- O papel de quem olha sai dos membros + sessão (`HubCenas.ehMestre`); a tela só desenha quando sabe
  quem olha.
- **Colisão de nome:** a topbar já tem um item **"Documentos"** (`shared/layout/layout.component.html`,
  ícone `documentos`) que abre o leitor de PDFs das regras (`shared/leitor-documentos/`, "Documentos do
  sistema"). A biblioteca da campanha **não** pode se chamar "Documentos" na interface — ver "Decisões
  assumidas".
- **Colisão de proxy:** a rota de app `/campanhas/:id/documentos` (plural) é prefixo-casada por engano
  por uma chave `"/documento"` do `frontend/proxy.conf.json` (Vite compara `startsWith`) — o mesmo caso
  de `/ficha` × `/fichas` e `/campanha` × `/campanhas`, que ali usam regex com fronteira. As rotas
  `campanha/:id/documento…` já passam pela regex `^/campanha(?:$|[/?])`; falta a de `/documento/:id…`.
- `EditorMarkdown` propaga o texto com um debounce (~200 ms): um "Salvar" lê o rascunho sem o fim do
  texto se não chamar `confirmarValor()` antes (`P-081`).
- `ESPECTADOR` e o jogador chegam à mesma rota nas próximas tasks; nesta, só o mestre.

## Entregáveis

1. **`DocumentoService`** (`frontend/src/app/modules/documento/documento.service.ts`): `listar`,
   `recuperar`, `criar`, `alterar`, `remover`, `revelar`, `ocultar`, `reordenar` e `enviarImagem`
   (`FormData` com o campo `arquivo`), um método por endpoint da `m9-02`. Spec com os verbos e URLs.
2. **Tempo real:** `TempoRealService.documentoAlterado$` (`documento:alterado` →
   `DocumentoBibliotecaAlteradaDto`), com spec, no molde de `cenaAlterada$`.
3. **Rota e casca:** `documento.routes.ts` montada em `app.routes.ts` como
   `campanhas/:campanhaId/documentos`, **antes** do prefixo genérico `campanhas` (mesmo comentário e
   mesma razão das rotas de ficha/criatura/cenas), só `autenticacaoGuard` — o papel é resolvido na
   tela e o recorte de verdade é do backend. Uma casca (`BibliotecaDocumentos`) bifurca por papel: o
   mestre monta a página desta task; **quem não é mestre é redirecionado à campanha** até a `m9-05`
   (pendência explícita, não funcionalidade). `proxy.conf.json` ganha `^/documento(?:$|[/?])`, com
   comentário da colisão.
4. **`LeitorDocumento`** (`modules/documento/componentes/leitor-documento/`), somente leitura:
   `TEXTO` → `app-editor-markdown` com `[somenteLeitura]="true"` (Milkdown, sem HTML cru — o mesmo
   renderizador do Caderno, sem segundo sanitizador); `IMAGEM` → `<img>` com `alt` do título, esqueleto
   até carregar, estado de erro se a URL falhar (`app-estado-vazio`) e alternância **"ajustar à
   largura" ↔ "tamanho real"** (`app-botao-icone` com `aria-label` e `appTooltip`; o contêiner rola no
   tamanho real). Sem `imagem_foco`/enquadramento (`m9-01`).
5. **Página do mestre** (`biblioteca-mestre`):
   - **Cabeçalho** como o do hub: voltar à campanha, `//`, "Biblioteca", nome da campanha, botão
     **"Novo documento"**.
   - **Lista** (`ul` de cartões, na ordem `ordem`): tipo, título e `app-chip` de severidade — **Revelado**
     (`primario`, ícone `olho`) ou **Oculto** (`secundario`, ícone `olho-fechado`); setas subir/descer
     (a primeira sobe e a última desce ficam desabilitadas) que enviam a lista **completa** de ids na
     nova ordem. Estado vazio ("Nenhum documento ainda.") e esqueleto durante o carregamento.
   - **Painel do documento** (à direita no desktop; vista própria no mobile): cabeçalho com título,
     chip de estado e as ações — **Revelar/Ocultar** (um botão, o rótulo troca), **Editar**, **Remover**.
     O corpo é o `LeitorDocumento`; **Editar** troca o corpo, no mesmo lugar, para o editor (título +
     `app-editor-markdown` editável para `TEXTO`; título + **"Trocar imagem"** para `IMAGEM`), com
     **Salvar** e **Cancelar** explícitos. Salvar chama `confirmarValor()` antes de enviar; os limites de
     `shared` (título 120, markdown 100 000) aparecem no campo.
   - **Novo documento:** `app-modal` com título (`app-campo`) e tipo (`app-segmentado`: Texto | Imagem).
     `TEXTO` cria e abre no editor; `IMAGEM` cria e abre pedindo o arquivo (validação de MIME e tamanho
     no cliente com as constantes de `shared`; erro do servidor vira mensagem no controle, não um toast
     genérico). Um documento novo nasce **Oculto**.
   - **Revelar/Ocultar** acontecem na hora, sem modal, com toast de confirmação ("Revelado para a
     mesa" / "Oculto") pela fila de notificações (`ui-20`) — a decisão é do mestre, é reversível e o
     chip muda de estado. **Remover** pede confirmação destrutiva.
   - **Conflito (409)** ao salvar: aviso "alterado em outra sessão" com **Recarregar** (o rascunho
     local não é descartado sem o mestre pedir). **Rascunho não salvo:** trocar de documento, fechar o
     editor ou sair da rota pede confirmação ("Descartar alterações?").
   - **Ao vivo:** qualquer `documento:alterado` da campanha (e a `reconexao()`) refaz a lista; se o
     evento é do documento aberto — `REMOVIDO` fecha o painel com aviso; `ALTERADO` recarrega o
     conteúdo **se não há edição em curso** (com edição, vale o 409 no salvar).
6. **Navegação:** item **"Biblioteca"** na categoria "Campanha" da `app-coluna-acoes` de
   `detalhe-mestre` (e no menu mobile equivalente, se houver), ao lado de "Cenas".
7. **Documentação de design:** seção "Biblioteca de documentos" em `docs/design/DESIGN.md` com a
   composição aprovada (casca, lista, painel, chips, mobile em duas vistas) — o que a `m9-05` reusa.

## Critérios de Aceite

- `npm run test -w frontend` verde, com testes novos: `DocumentoService`, `documentoAlterado$`,
  `LeitorDocumento` (texto somente leitura; imagem, erro e alternância de tamanho) e a página
  (criar `TEXTO` e `IMAGEM`, validação do modal, editar e salvar chamando `confirmarValor()`, conflito
  409, descartar rascunho, revelar/ocultar, remover com confirmação, reordenar enviando a lista
  completa, estado vazio, esqueleto, evento refazendo a lista, `REMOVIDO` do aberto fechando o painel).
- `npm run lint -w frontend` sem erros.
- **Verificação pela skill `verify` em `1920×1080` e `360×800`**, com backend e frontend reais
  (portas isoladas se o `ng serve` do autor tiver o proxy antigo — sem `^/documento` ele não roteia a
  API), percorrendo: lista vazia e esqueleto; criar um `TEXTO` e um `IMAGEM` (upload de JPEG real;
  arquivo de tipo inválido e acima de 10 MB recusados); editar e salvar; **conflito de versão com duas
  abas**; trocar de documento com rascunho; revelar e ocultar (o toast, o chip, e — como a visão do
  jogador só chega na `m9-05` — o efeito para a mesa provado com um `socket.io-client` cru de jogador:
  recebe `REVELADO`/`OCULTADO`); remover; reordenar (uma seta no limite fica desabilitada); no mobile,
  as duas vistas e o voltar. Sem overflow horizontal, alvos de toque ≥ 44 px, foco visível.
- **Comparação visual com o análogo** (hub de cenas e Caderno), registrada no fecho: mesma densidade e
  hierarquia, chips e botões canônicos, ícones do conjunto de `app-icone`, "parece parte do mesmo
  produto".

## Fora de Escopo

- A visão do jogador e do espectador — `m9-05`.
- A caixa de busca e seus resultados (o backend é a `m9-03`; o componente compartilhado nasce na
  `m9-05`, onde as três visões o usam).
- O passe responsivo fino (`960×1080`, `1366×768`, polimento do celular) — `m9-06`; aqui a tela só
  precisa funcionar em `360×800` sem overflow.
- Apresentar um documento numa cena, `cena_documento` — `m7-25`.
- Autosave, arrastar-e-soltar, importar `.md`, filtro por estado, seleção múltipla, PDF, pastas/tags.

## Dependências

`m9-02` (endpoints e `documento:alterado`), `m7-23` (`HubCenas`, o análogo), `ui-15` (confirmação
destrutiva), `ui-20` (notificações), `docs/design/DESIGN.md`, `shared/ui/editor-markdown`.

## Decisões assumidas ao especificar (1–3 confirmadas pelo autor em 2026-09-26; 4 ainda em aberto)

1. **Rótulo "Biblioteca"** para a entrada de navegação e o título da página, porque "Documentos" já é o
   leitor de PDFs das regras na topbar. A rota e os nomes de código seguem em português do domínio
   (`documentos`, `documento`). Trocar é uma string.
2. **Salvar explícito, sem autosave.** O Caderno salva sozinho porque a página é do próprio autor; aqui,
   com o documento **já revelado**, cada digitação salva seria visível aos jogadores em tempo real. O
   mestre edita à vontade e publica com "Salvar".
3. **Revelar sem confirmação.** Fluxo frequente durante a sessão e reversível; a proteção é o toast e o
   chip. (A `m7-25` pode reforçar isso no "Apresentar".)
4. **Ícones:** `IconeNome` não tem um ícone de **imagem** nem de **biblioteca** (`documentos` é o da
   topbar; `olho`/`olho-fechado` cobrem o estado). Antes de escolher, propor ao autor (regra de
   `shared/ui`); candidatos para o texto: `anotacoes`. **Ainda não decidido** — perguntar ao autor ao
   abrir esta task.

## Riscos e Mitigação

- **Revelar por engano** é irreversível na prática (a mesa já viu). Mitigação: o botão sempre traz o
  rótulo da ação ("Revelar"/"Ocultar"), o chip do estado atual fica ao lado e o toast diz o que
  aconteceu. Se o uso mostrar acidentes, reforçar com confirmação é uma linha.
- **Barra do editor no celular** (ancorada acima do teclado, `editor-markdown-barra-e-mobile`): o painel
  do documento precisa dar espaço a ela — verificar no `360×800` com o editor focado.
- **Perda de rascunho** ao navegar: a confirmação de saída cobre trocar de documento e fechar o editor;
  para sair da rota, usar o mecanismo que o Caderno/ficha já usam, ou registrar o limite no fecho.
