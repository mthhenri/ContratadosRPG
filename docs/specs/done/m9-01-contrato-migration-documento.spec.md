# m9-01-contrato-migration-documento.spec.md

> Primeira task do milestone `m9-documentos-campanha.spec.md` — shared + banco. Sem esta base,
> nenhuma outra task do milestone tem onde pendurar dado. Mesmo papel da `m7-21` para a Cena.

## Objetivo

Criar o contrato e o schema do **documento de campanha**, sem tocar em nenhum endpoint ou tela:
enum, limites compartilhados, DTOs da entidade e a migration da tabela com a busca textual já
mantida pelo banco.

## Estado atual

- **Molde de enum de coluna:** `tipo_cena` (`backend/src/database/migrations/0031 - Tabelas
  tipo_cena, tipo_cena_status e cena.sql`) — BaseEntity + `codigo` + `descricao`, seed por
  `INSERT ... SELECT ... UNION ALL`, `UNIQUE INDEX ... WHERE is_deleted = false`, trigger de
  `updated_date`. `docs/CONVENTIONS.md` (seção "Enums") fixa o nome do enum TS como o da tabela em
  PascalCase + `Enum`: `tipo_documento` → `TipoDocumentoEnum` (a Cena adotou `CenaTipoEnum`; aqui
  vale a convenção escrita).
- **Molde da busca textual:** `0018 - Caderno de campanha e busca textual.sql` já criou a extensão
  `unaccent` e a configuração `public.contratados_portugues` (unaccent + stemmer português) e mostra
  o desenho a copiar: coluna `busca TSVECTOR NOT NULL` mantida por trigger
  `BEFORE INSERT OR UPDATE OF titulo, conteudo_markdown` (título peso `A`, corpo peso `B`) e índice
  GIN. **A configuração não é recriada** — a migration nova só a usa.
- **Limites compartilhados:** `shared/src/validators/pagina-caderno.validators.ts` (título 120,
  conteúdo 100 000 — o mesmo `LIMITE_MARKDOWN` do `EditorMarkdown`) é o precedente de constantes
  que as três camadas importam, em vez de cada uma repetir o número.
- **Contrato de imagem:** o upload de imagem usa `FichaImagemArquivoDto`
  (`shared/src/dtos/ficha/ficha-operacao.dtos.ts:364`, `{ conteudo, mimetype, tamanho }`). Ele é
  reutilizado, não duplicado (decisão do guarda-chuva) — mas só entra nos DTOs de `m9-02`, que é
  quem faz o upload.
- **Barril de DTOs:** cada módulo de `shared/src/dtos/<modulo>/` tem `index.ts` e uma entrada
  `exports` em `shared/package.json` (ex.: `./dtos/cena`). Sem a entrada, o import
  `@contratados-rpg/shared/dtos/documento` não resolve no backend nem no frontend.
- **Última migration:** `0033 - Encontro sempre dentro de uma cena.sql`. Esta task usa a `0034`
  (conferir o próximo número livre no momento de começar — outra sessão pode ter usado). Uma só
  migration: a tabela nasce vazia, não há backfill a separar (a `m7-21` separou schema e backfill
  porque tinha dados de produção para migrar).

## Entregáveis

1. **`TipoDocumentoEnum`** (`shared/src/enums/tipo-documento.enum.ts`, export em
   `shared/src/enums/index.ts`): `TEXTO | IMAGEM`. Comentário: enum de coluna, espelha
   `tipo_documento`; PDF fica de fora do MVP (guarda-chuva, decisão #1).
2. **Limites** (`shared/src/validators/documento.validators.ts`, export em
   `shared/src/validators/index.ts`): `DOCUMENTO_TITULO_MAXIMO = 120`,
   `DOCUMENTO_CONTEUDO_MAXIMO = 100_000`, `DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024`
   e `DOCUMENTO_IMAGEM_MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']` (o cliente
   valida antes de enviar, o backend valida de verdade). O teto de imagem é maior que o do avatar
   (2 MB) porque um documento de imagem costuma ser mapa, carta ou foto de cena — ver "Decisões
   assumidas" abaixo.
3. **Migration `0034`** — `tipo_documento` (seed `TEXTO`, `IMAGEM`) e `documento`:
   - BaseEntity + `campanha_id` (fk `fk_documento_campanha`), `tipo_documento_id` (fk
     `fk_documento_tipo_documento`), `titulo VARCHAR(120) NOT NULL`, `conteudo_markdown TEXT`
     (nullable — só `TEXTO`), `imagem_url VARCHAR` (nullable — só `IMAGEM`), `revelado BOOLEAN NOT
     NULL`, `ordem INTEGER NOT NULL`, `busca TSVECTOR NOT NULL`. Sem `DEFAULT` em nenhuma coluna.
   - CHECKs: `chk_documento_titulo` (`char_length(btrim(titulo)) BETWEEN 1 AND 120`),
     `chk_documento_conteudo` (`conteudo_markdown IS NULL OR char_length(conteudo_markdown) <=
     100000`) e `chk_documento_conteudo_ou_imagem` (`NOT (conteudo_markdown IS NOT NULL AND
     imagem_url IS NOT NULL)` — um documento nunca carrega os dois). A coerência com o tipo
     (`TEXTO` ⇒ sem imagem; `IMAGEM` ⇒ sem markdown) **não** vira CHECK: dependeria de uma consulta a
     `tipo_documento`, que o PostgreSQL não permite; é da `DocumentoService` (`m9-02`).
   - `fn_documento_busca` + `trg_documento_busca` (`BEFORE INSERT OR UPDATE OF titulo,
     conteudo_markdown`), no molde da `0018`, com `COALESCE` em ambos os campos (uma imagem tem só o
     título no vetor). `trg_documento_updated_date` (`fn_set_updated_date`).
   - `ix_documento_campanha_ordem` `(campanha_id, ordem)` e `ix_documento_busca` `GIN (busca)`.
   - `DOWN` simétrico (índices, triggers, função, tabelas), sem tocar em `contratados_portugues`
     (é da `0018`).
4. **DTOs da entidade** (`shared/src/dtos/documento/documento.dtos.ts`, barril `index.ts`, entrada
   `./dtos/documento` em `shared/package.json`), seguindo `dto-conventions` — interfaces `readonly`,
   sem herança entre DTOs de negócio:
   - `DocumentoCriarDto { campanhaId, titulo, tipo: TipoDocumentoEnum, conteudoMarkdown?: string }` —
     `conteudoMarkdown` só faz sentido para `TEXTO`; a imagem chega depois, por upload (`m9-02`).
   - `DocumentoCriadoDto`, `DocumentoRecuperadoDto` e `DocumentoAlteradoDto` — mesmos campos, cada um
     declarado por extenso: `id, campanhaId, titulo, tipo, conteudoMarkdown: string | null,
     imagemUrl: string | null, revelado, ordem, createdDate, updatedDate`.
   - `DocumentoRecuperarDto { id }`, `DocumentoRemoverDto { id }`.
   - `DocumentoAlterarDto { id, titulo, conteudoMarkdown: string | null, updatedDate }` — versão
     otimista (`updatedDate`), como `PaginaCadernoAlterarDto`; `conteudoMarkdown` é `null` para
     `IMAGEM`.
   - `DocumentoResumoDto` — item de listagem: `id, campanhaId, titulo, tipo, imagemUrl: string | null,
     revelado, ordem, updatedDate`. **Sem `conteudoMarkdown`** (até 100 000 caracteres por item); com
     `imagemUrl` porque a lista mostra a miniatura da imagem.
   - Os DTOs de comportamento (revelar/ocultar/reordenar/listar/imagem/evento) ficam para a `m9-02`,
     e os de busca para a `m9-03` — não declarar contrato sem um consumidor na mesma task.
5. **Documentação:** `docs/SCHEMA.md` ganha as seções `tipo_documento` e `documento` no formato das
   de `cena`/`pagina_caderno` (colunas, índices, o que a service arbitra em vez do banco).

## Critérios de Aceite

- `npm run test -w shared` verde, com `documento.spec.ts` (novo) cobrindo os valores do enum
  (`['TEXTO', 'IMAGEM']`) e os limites — mesmo desenho de `pagina-caderno.spec.ts`.
- `npm run build -w shared` gera `dist/dtos/documento` e o import por
  `@contratados-rpg/shared/dtos/documento` compila no backend e no frontend (basta um import de
  tipo em cada um durante a verificação; não fica no diff).
- Migration aplicada sobre o banco de dev **e** sobre um banco limpo: `tipo_documento` tem duas
  linhas; inserir documento com título vazio, com título acima de 120 caracteres ou com markdown e
  imagem juntos falha no CHECK; inserir um `TEXTO` (o `busca` é preenchido sem o `INSERT` mencioná-lo)
  e `UPDATE` do título refaz o vetor; `websearch_to_tsquery('public.contratados_portugues', 'cafe')`
  casa um título "Café"; com `SET enable_seqscan = off` o plano de uma busca usa `ix_documento_busca`.
- `DOWN` → `UP` → `DOWN` deixa o schema idêntico ao anterior à task (comparar `\d documento` e a
  lista de funções/triggers antes e depois).
- Nenhum endpoint, service, repository ou componente muda de comportamento; `npm run test -w backend`
  segue verde (só garante que o novo módulo de DTOs não quebrou a compilação).
- `npm run lint -w shared` sem erros.

## Fora de Escopo

- Qualquer endpoint, service ou repository de `documento` — `m9-02`.
- A consulta de busca em si (só o vetor e o índice nascem aqui) — `m9-03`.
- Telas — `m9-04`/`m9-05`.
- PDF como tipo, pastas, tags, versionamento e `revelado_date` (não há consumidor que precise de
  quando o documento foi revelado; se a `m7-25` precisar, entra lá).
- `imagem_foco` (o esboço do guarda-chuva a previa): sem consumidor nas telas do milestone — a
  miniatura é centralizada por `object-fit` e o leitor mostra a imagem inteira. Vira ideia em
  `IDEAS.md` ao fechar a `m9-04`, se o autor quiser o enquadramento do avatar também aqui.

## Dependências

`M2` (`campanha`), migration `0018` (configuração `contratados_portugues` e o molde de busca),
migration `0031` (molde de tabela `tipo_*`), `docs/CONVENTIONS.md` (enums, migrations, DTOs),
`dto-conventions`.

## Decisões assumidas ao especificar (confirmadas pelo autor em 2026-09-26)

1. **Teto da imagem em 10 MB** (o autor subiu dos 5 MB propostos), contra 2 MB do avatar da ficha.
   Constante nomeada, um único lugar para mudar.
2. **`imagem_foco` fora do MVP**, pelo motivo acima.

## Riscos e Mitigação

- **Numeração de migration:** já houve colisão (`m7-21` precisou pular a `0030`, tomada por outra
  sessão). Listar `backend/src/database/migrations` imediatamente antes de nomear o arquivo.
- **`busca NOT NULL` sem o `INSERT` informar a coluna:** funciona porque o trigger `BEFORE INSERT`
  roda antes da checagem de `NOT NULL` (é o que a `0018` faz). Testar com um `INSERT` real, não só
  ler o SQL.
