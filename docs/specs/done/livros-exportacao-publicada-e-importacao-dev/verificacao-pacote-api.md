# Verificação — pacote e API administrativa

Recorte implementado: contrato portátil em `shared`, transporte/validação, consulta de
publicações atuais e `GET /livros/pacotes/publicados`. Sem alteração de regras, schema,
permissões existentes, cópia de trabalho ou exportador Markdown.

## Contrato e segurança

- `LivroPacoteDto` e `LivroPacoteItemDto` seguem o plano. Hash SHA-256 sobre JSON
  recursivamente ordenado por chave, sem `sha256`; arrays mantêm a ordem. Datas originais
  com microssegundos e nota Markdown/null são preservadas. Hash não atesta procedência.
- Validação recebe `unknown`, limita profundidade128, valores1000000, arrays100000,
  strings2000000 caracteres e JSON32MiB. Recusa ciclos, getters, tipos não JSON, números
  não finitos, campos desconhecidos e formatos incompatíveis antes de acessar o motor.
- Schemas discriminados cobrem todos os tipos de peça, blocos de lista, células e trechos.
  UUIDs são únicos globalmente, âncoras e links são coerentes; mapas antigos apontam para
  âncoras atuais existentes. Após shape seguro, `validarArvoreLivro` valida fotografia.
- Números editoriais aceitam somente `[\w.-]`, entre1 e40 caracteres (VARCHAR40), para
  composição segura do arquivo/cabeçalho canônico. Teste adversarial recalcula o hash.
- A consulta usa um statement SQL/snapshot MVCC para ambos os livros, ordenando
  `publicacao_data DESC, id DESC` exclusivamente em `PUBLICADA`. Título vem da fotografia;
  ordem vem do cadastro. Nunca consulta peças de trabalho nem seleciona autoria/ids.
- ADMIN é exigido no decorator e na service. Publicação faltante ou pacote incoerente
  falha sem resposta parcial. `Cache-Control: no-store` no sucesso HTTP.

## Evidências executadas

- `npm run build --workspace=shared`: passou.
- `npm run build --workspace=backend`: passou; dist atualizado após última mudança funcional.
- `npx tsc --noEmit -p tsconfig.json` no backend: passou.
- ESLint focado nos novos arquivos de pacote, API e testes: passou sem avisos.
- Testes backend focados: `pacote-livros.spec.ts`, `livro-pacote.spec.ts`,
  `livro-pacote.http.spec.ts`, `openapi.document.spec.ts`: **34 testes,4 arquivos, passaram**.
- HTTP Nest real/guard autorização real: visitante401, NORMAL403, TESTER403, ADMIN200;
  sucesso possui no-store e dois livros. Identificação da sessão e banco são dublados
  neste ensaio; JWT e estado real do PostgreSQL ficam no gate integrado do principal.
- OpenAPI regenerado; teste confere rota privada, DTO e equivalência das operações geradas.
- `git diff --check`: passou (avisos de normalização LF/CRLF, sem erro de whitespace).

O sandbox impediu rename de cache temporário do Vitest (EPERM). A repetição autorizada
fora do sandbox passou; o erro inicial não foi falha de teste do produto.

## Impacto e revisão

`npm run impacto -- --simbolo LivroVersaoConteudoDto`:13 consumidores de produção e4
testes identificados; contrato existente preservado. DTO de pacote é aditivo; consumidores
novos são API administrativa, download da Oficina e importador local, todos pedidos pela
spec. Barrel recebeu novo export. Cadastro de `LivroPacoteController` no mapa do gerador
OpenAPI é aditivo e preserva as tags anteriores; módulo registra controller antes das rotas
dinâmicas existentes. Não houve mudança de service, DTO ou enum existente.

Revisão manual: controller só repassa; autorização/orquestração na service; SQL no
repository com filtros de soft delete e parâmetros nomeados; nenhum SQL mutável no
recorte; DTOs readonly no shared sem herança; motor compartilhado reutilizado após shape
seguro. `validarConteudoLivro` é wrapper público para recuperação de fotografia isolada;
coerência com o cadastro/alvo da recuperação cabe ao importador.

Limites: este relatório não comprova seleção sobre PostgreSQL real, geração/importação,
JWT real ou UI. Esses gates pertencem à verificação integrada da task e permanecem
dependentes do relatório principal.
