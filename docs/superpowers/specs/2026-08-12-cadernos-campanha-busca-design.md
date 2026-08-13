# Cadernos de campanha e busca unificada — Design

**Goal:** cada membro mantém um caderno privado por campanha, composto por várias páginas em
Markdown. O autor administra as próprias páginas; o mestre lê e pesquisa as páginas dos jogadores,
mas nunca as altera. Uma busca PostgreSQL unifica páginas de caderno e as anotações já existentes
nas fichas, com filtros combináveis conforme o papel do usuário.

## 1. Escopo e decisões fechadas

- O caderno existe sempre no contexto de uma campanha e de um autor.
- O caderno é conceitual: o conjunto das páginas ativas de `(campanha, autor)`; não haverá tabela
  `caderno` sem propriedades próprias.
- Cada página possui título e conteúdo Markdown. Não aceita imagem, anexo, upload ou HTML livre.
- Jogador administra somente as próprias páginas e não lista nem descobre páginas de outro jogador.
- Mestre administra o próprio caderno e tem somente leitura sobre os cadernos dos jogadores.
- As anotações de ficha continuam em `ficha.dados.anotacoes`; não serão copiadas nem convertidas em
  páginas.
- A busca é única, mas suas fontes são selecionáveis e combináveis.
- PostgreSQL/Supabase é fonte de verdade e mecanismo inicial de busca. Elasticsearch permanece uma
  evolução opcional e, se adotado, será apenas um índice reconstruível.
- O Caderno é um utilitário flutuante, na mesma pilha da Calculadora e dos Documentos.

Ficam fora desta entrega: documentos compartilhados pelo mestre, anexos, imagens, pastas, tags,
links entre páginas, versionamento navegável, colaboração simultânea, busca semântica, embeddings e
Elasticsearch.

## 2. Modelo relacional

Nova tabela `pagina_caderno`:

```sql
CREATE TABLE pagina_caderno (
  -- BaseEntity...
  campanha_id       INTEGER NOT NULL, -- fk_pagina_caderno_campanha
  usuario_autor_id  INTEGER NOT NULL, -- fk_pagina_caderno_usuario_autor
  titulo            VARCHAR NOT NULL,
  conteudo_markdown TEXT NOT NULL,
  busca              TSVECTOR NOT NULL
);

-- ix_pagina_caderno_campanha_autor: (campanha_id, usuario_autor_id)
-- ix_pagina_caderno_busca: GIN (busca)
```

Não existe unicidade por `(campanha_id, usuario_autor_id)`, pois essa dupla identifica o caderno e
pode possuir várias páginas. `pagina_caderno.id` identifica cada página.

`usuario_autor_id` precisa corresponder a um membro ativo da campanha ao criar a página. Se o membro
sair posteriormente, as páginas permanecem armazenadas e não são reatribuídas, mas deixam de
aparecer em listagens e buscas para qualquer usuário enquanto o autor não for membro ativo. Esta
preservação evita perda física silenciosa sem transformar ex-membros em uma nova categoria de
permissão. Exclusões continuam sempre lógicas.

`busca` é mantido pelo banco a partir de `titulo` e `conteudo_markdown`. A configuração textual deve
tratar português e acentos e atribuir peso maior ao título (`A`) que ao conteúdo (`B`). A migration
também cria a função/trigger necessária e atualiza as linhas preexistentes antes de impor `NOT NULL`,
seguindo a estratégia segura de migrations do projeto e sem `DEFAULT`.

As anotações das fichas não ganham uma coluna de busca própria nesta entrega. Como estão em JSONB,
a consulta usa uma expressão `to_tsvector` sobre `dados ->> 'anotacoes'`, protegida por índice GIN
parcial para fichas ativas que tenham anotações. Se o plano real do PostgreSQL não aproveitar esse
índice, a implementação deve preferir uma coluna `tsvector` mantida por trigger em `ficha`; essa
decisão será comprovada com `EXPLAIN` no plano, sem alterar o contrato funcional.

## 3. Contratos compartilhados

Os DTOs vivem em `shared/src/dtos/pagina-caderno/`; são interfaces `readonly`, sem herança entre
DTOs de negócio.

```ts
export interface PaginaCadernoCriarDto {
  readonly campanhaId: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
}

export interface PaginaCadernoAlterarDto {
  readonly id: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
  readonly updatedDate: string;
}

export interface PaginaCadernoRecuperarDto {
  readonly id: number;
}

export interface PaginaCadernoExcluirDto {
  readonly id: number;
}

export interface PaginaCadernoResumoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioAutorId: number;
  readonly autorNome: string;
  readonly titulo: string;
  readonly updatedDate: string;
}

export interface PaginaCadernoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioAutorId: number;
  readonly autorNome: string;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
  readonly somenteLeitura: boolean;
  readonly createdDate: string;
  readonly updatedDate: string;
}
```

`updatedDate` em `PaginaCadernoAlterarDto` é a versão otimista enviada pelo cliente. A alteração só
ocorre quando ela ainda coincide com a linha persistida.

Para pesquisa, uma consulta calculada não usa verbo no nome:

```ts
export enum BuscaCampanhaFonteEnum {
  MEU_CADERNO = 'MEU_CADERNO',
  CADERNOS_JOGADORES = 'CADERNOS_JOGADORES',
  MINHAS_FICHAS = 'MINHAS_FICHAS',
  FICHAS_CAMPANHA = 'FICHAS_CAMPANHA',
}

export enum BuscaCampanhaResultadoTipoEnum {
  PAGINA_CADERNO = 'PAGINA_CADERNO',
  ANOTACAO_FICHA = 'ANOTACAO_FICHA',
}

export interface BuscaCampanhaDto {
  readonly campanhaId: number;
  readonly termo: string;
  readonly fontes?: readonly BuscaCampanhaFonteEnum[];
  readonly pagina?: number;
  readonly limite?: number;
}

export interface BuscaCampanhaResultadoDto {
  readonly tipo: BuscaCampanhaResultadoTipoEnum;
  readonly id: number;
  readonly titulo: string;
  readonly trecho: string;
  readonly autorNome: string;
  readonly fichaNome?: string;
  readonly updatedDate: string;
  readonly relevancia: number;
}
```

A resposta da busca é `PaginatedResult<BuscaCampanhaResultadoDto>`. Os enums vivem em
`shared/src/enums/`, têm valores `SCREAMING_SNAKE_CASE` iguais aos nomes e não correspondem a
colunas relacionais.

## 4. API, camadas e permissões

Novo módulo de negócio `pagina-caderno`, seguindo controller fino → service → repository:

- `GET /campanha/:campanhaId/caderno/paginas` — lista o caderno do usuário autenticado.
- `GET /campanha/:campanhaId/caderno/membros/:usuarioId/paginas` — somente mestre; lista as páginas
  de um jogador que seja membro ativo da campanha.
- `GET /pagina-caderno/:id` — autor ou mestre da campanha.
- `POST /campanha/:campanhaId/caderno/paginas` — cria página para o próprio usuário.
- `PUT /pagina-caderno/:id` — somente autor, com controle otimista por `updatedDate`.
- `DELETE /pagina-caderno/:id` — somente autor, com soft delete.
- `GET /campanha/:campanhaId/busca` — membro ativo; pesquisa as fontes autorizadas.

Controllers apenas mesclam ids de rota/query nos DTOs. A service valida associação à campanha,
papel, autoria, fontes permitidas e conflito de versão. Repositories contêm somente SQL, filtram
`is_deleted = false` em todo `SELECT` e usam parâmetros nomeados.

Matriz de acesso às páginas:

| Ação | Autor ativo | Mestre da campanha | Outro jogador | Não membro |
|---|---:|---:|---:|---:|
| Listar/abrir própria página | sim | sim, quando é autor | não | não |
| Criar própria página | sim | sim | não | não |
| Alterar/excluir própria página | sim | sim | não | não |
| Listar/abrir página de jogador | — | somente leitura | não | não |
| Alterar/excluir página de jogador | — | não | não | não |

O mestre não recebe um endpoint especial de mutação e a service não interpreta o papel `MESTRE`
como autorização de escrita sobre página alheia.

## 5. Busca unificada no PostgreSQL

As fontes permitidas são:

| Fonte | Jogador | Mestre | Recorte |
|---|---:|---:|---|
| `MEU_CADERNO` | sim | sim | páginas cujo autor é o requisitante |
| `CADERNOS_JOGADORES` | não | sim | páginas de autores jogadores da campanha |
| `MINHAS_FICHAS` | sim | não | fichas da campanha pertencentes ao requisitante |
| `FICHAS_CAMPANHA` | não | sim | todas as fichas ativas da campanha |

Sem `fontes`, a service usa todas as fontes permitidas para o papel atual. Fonte desconhecida ou
proibida gera erro de negócio; não é ignorada silenciosamente.

A repository monta um `UNION ALL` entre páginas e fichas, já com os recortes fornecidos pela
service. Cada ramo produz a mesma forma: tipo, id, título, trecho, autor, personagem opcional, data e
relevância. O resultado combinado ordena por relevância decrescente, depois `updated_date`
decrescente e `id` decrescente para paginação estável.

- Consulta amigável: `websearch_to_tsquery`.
- Página: título com peso superior ao conteúdo Markdown.
- Ficha: nome do personagem ajuda a localizar o resultado; o trecho vem somente de `anotacoes`.
- O trecho destacado é produzido pelo PostgreSQL, limitado em tamanho e retornado como texto seguro.
- Termo vazio ou composto apenas de espaços não executa busca e retorna lista vazia.
- O mestre vê o autor de cada página; resultados de ficha mostram dono e personagem.

A autorização ocorre antes de montar os ramos SQL. Testes precisam provar que nenhum trecho de uma
fonte proibida aparece em resposta, contagem ou mensagem de erro.

## 6. Markdown e segurança

O banco armazena somente o Markdown original. O frontend renderiza uma visualização sanitizada com
uma biblioteca já presente no projeto ou uma dependência pequena e dedicada, escolhida no plano de
implementação.

- HTML embutido no Markdown fica desabilitado.
- URLs perigosas (`javascript:`, `data:` e equivalentes) são rejeitadas.
- Não há sintaxe própria para upload nem colagem automática de imagem.
- Links externos abrem com proteção contra acesso ao `window.opener`.
- A visualização nunca usa conteúdo do autor diretamente como HTML confiável.

## 7. Utilitário flutuante

O análogo visual e comportamental aprovado é a combinação de
`frontend/src/app/shared/calculadora-flutuante/` e
`frontend/src/app/shared/leitor-documentos/`. O Caderno não será um `p-dialog` modal.

### Desktop

- Novo acionador na mesma pilha de utilitários da Calculadora e dos Documentos (opção C aprovada).
- Janela não modal, arrastável pelo cabeçalho, redimensionável e minimizável.
- Clique/foco traz a janela para frente sem fechar os outros utilitários.
- Posição, dimensões e estado minimizado são preferências locais do dispositivo; conteúdo, página
  selecionada e busca continuam estado da aplicação.
- A janela nasce em tamanho suficiente para lista de páginas + editor, respeitando limites do
  viewport.
- Ao trocar/sair da campanha, conclui o salvamento pendente e fecha; nunca reaproveita conteúdo de
  uma campanha na outra.

### Mobile

- Abre como painel que ocupa quase todo o viewport, sem arraste nem redimensionamento.
- Lista de páginas e conteúdo são duas vistas navegáveis, em vez de colunas comprimidas.
- Mantém fechar e minimizar, com alvos de toque canônicos e sem overflow.

### Conteúdo da janela

- Cabeçalho: nome do utilitário, campanha atual, estado de salvamento, minimizar e fechar.
- Coluna/lista: páginas do caderno ativo, criar página e, para mestre, alternar entre **Meu caderno**
  e **Cadernos dos jogadores**.
- Ao consultar jogadores, o mestre escolhe o autor e toda página exibe **Somente leitura**.
- Editor: título, alternância **Editar / Visualizar** e conteúdo Markdown.
- Busca: campo único, filtros combináveis e lista normalizada de resultados.
- Resultado de página abre a página dentro do utilitário; resultado de ficha navega para a ficha e
  posiciona a seção de anotações.

Uma página nova só é persistida após receber título não vazio. O conteúdo pode ficar vazio. Título
e conteúdo usam salvamento automático em lote, com estados **Salvando…**, **Salvo** e **Falha ao
salvar**. Fechar/minimizar não descarta rascunho local; excluir exige confirmação.

## 8. Concorrência, falhas e tempo real

O `PUT` usa concorrência otimista: `UPDATE ... WHERE id = :id AND updated_date = :updatedDate`.
Resultado sem linha alterada produz conflito e não sobrescreve o texto persistido. A interface
mantém o rascunho local e oferece recarregar a versão atual; mesclagem automática de Markdown fica
fora do escopo.

Erros esperados:

- 400: título ausente, Markdown acima dos limites definidos no plano, termo/fonte de busca inválido.
- 403: não membro, fonte proibida, tentativa de ler página sem autorização ou de alterar página
  alheia.
- 404: campanha/página inexistente ou excluída.
- 409: `updatedDate` defasado.

Página removida, permissão revogada ou troca de campanha invalida o conteúdo aberto sem revelar texto
anterior em mensagens. Falha de salvamento mantém o rascunho e permite tentar novamente.

Não haverá broadcast do conteúdo das páginas nem sincronização de caderno por WebSocket nesta
entrega. Outra sessão do autor ou uma leitura já aberta pelo mestre recebe a versão nova no próximo
carregamento ou pesquisa. Tempo real pode ser especificado depois com evento contendo somente ids e
novo recorte REST autorizado.

## 9. Verificação e critérios de aceite

### Backend e banco

- Criar/listar/recuperar/alterar/excluir página com soft delete.
- Provar a matriz completa de autorização, incluindo mestre sem mutação sobre página alheia.
- Jogador nunca recebe página, trecho, contagem ou metadado de outro jogador.
- Membro removido perde acesso e suas páginas deixam de aparecer também para o mestre enquanto ele
  não fizer parte da campanha.
- Conflito de `updatedDate` não sobrescreve a versão atual.
- Busca por título e conteúdo, acentos e múltiplas palavras.
- Peso do título, ordenação estável, paginação e filtros combinados.
- `EXPLAIN` confirma uso de índice GIN para páginas e fichas no volume representativo definido no
  plano de implementação.

### Frontend

- Criar, renomear, editar, visualizar Markdown e excluir páginas.
- Estados vazio, carregando, salvando, salvo, falha, conflito e somente leitura.
- Mestre alterna entre o próprio caderno e os cadernos dos jogadores sem ganhar controles de edição.
- Filtros exibidos correspondem ao papel; combinações produzem somente as fontes escolhidas.
- Resultado de página abre no Caderno; resultado de ficha abre a seção correta da ficha.
- Minimizar/restaurar preserva estado; trocar de campanha não vaza conteúdo.
- Calculadora, Documentos e Caderno coexistem e recebem foco corretamente.

### Gate visual obrigatório

Antes de concluir a implementação, usar a skill `verify` na aplicação real em `1920×1080` e
`360×800`. Comparar pessoalmente com os utilitários flutuantes aprovados e percorrer: fechado,
aberto, redimensionado, minimizado, edição, visualização Markdown, busca com filtros, resultado,
somente leitura, vazio, erro e confirmação de exclusão. Confirmar ausência de overflow, contraste,
foco, alvos de toque e que a janela parece parte do mesmo produto.
