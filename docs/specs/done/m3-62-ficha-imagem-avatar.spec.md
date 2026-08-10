# m3-62-ficha-imagem-avatar.spec.md

> Task 58 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Permitir upload de uma imagem de avatar para a ficha. O binário **não** entra no Postgres —
só o caminho/URL da imagem persiste numa coluna nova; o arquivo em si fica num armazenamento
externo ao banco.

**Provedor de blob storage escolhido pelo autor: Cloudflare R2** (S3-compatible). Em dev
continua o fallback de disco local — nenhuma credencial real é necessária para rodar
localmente; em produção, o upload vai para o bucket R2 configurado. As duas implementações
vivem atrás da mesma **interface de armazenamento**, selecionada por um toggle de ambiente
(`ARMAZENAMENTO_PROVEDOR`).

## Entregáveis

1. Migration `0013 - Ficha imagem.sql`:
   ```sql
   -- UP
   ALTER TABLE ficha ADD COLUMN imagem_url VARCHAR;
   -- DOWN
   ALTER TABLE ficha DROP COLUMN IF EXISTS imagem_url;
   ```
   Nullable, sem `DEFAULT` (proibição #7).
2. Backend — módulo pequeno de armazenamento (local a definir na implementação, ex.
   `backend/src/core/armazenamento/`): interface com dois métodos —
   `salvarImagem(dto): Promise<{ caminho: string }>` e `excluirImagem(dto: { caminho: string })`.
   **Duas implementações**, escolhidas por um **toggle de ambiente** (não por "variável
   ausente" — todo grupo de config no `ConfigService` é obrigatório uma vez declarado, então a
   escolha precisa ser explícita):
   - Nova dependência: `@aws-sdk/client-s3` (R2 é S3-compatible; SDK oficial recomendado pela
     Cloudflare, só apontando o `endpoint` para o domínio da conta).
   - Novo grupo de configuração `ConfiguracaoArmazenamento` em `config.service.ts`, seguindo o
     padrão exato de `ConfiguracaoBanco`/`ConfiguracaoJwt` (getter tipado +
     `obterVariavelObrigatoria`):
     - `ARMAZENAMENTO_PROVEDOR` (`local` | `r2`) — sempre obrigatória.
     - Quando `r2`: `ARMAZENAMENTO_R2_ACCOUNT_ID`, `ARMAZENAMENTO_R2_ACCESS_KEY_ID`,
       `ARMAZENAMENTO_R2_SECRET_ACCESS_KEY`, `ARMAZENAMENTO_R2_BUCKET`,
       `ARMAZENAMENTO_R2_URL_PUBLICA` (domínio público do bucket — custom domain ou o padrão
       `*.r2.dev` habilitado no painel Cloudflare) — só lidas via `obterVariavelObrigatoria`
       quando o provedor é `r2`; em `local` nenhuma delas é exigida.
     - `.env.example` ganha `ARMAZENAMENTO_PROVEDOR=local` (dev não precisa de nenhuma
       credencial R2); `render.yaml` ganha as 6 chaves com `sync: false` (mesmo padrão de
       `DB_SENHA`/`JWT_SECRETO`), com `ARMAZENAMENTO_PROVEDOR=r2` fixo em produção.
   - `ArmazenamentoLocalProvedor` (disco local, `backend/uploads/ficha/<uuid>.<extensão>`,
     servido estático via `app.useStaticAssets` — `NestExpressApplication`, já habilitado por
     `@nestjs/platform-express`, sem dependência nova — sob o prefixo `/uploads`) e
     `ArmazenamentoR2Provedor` (novo): `S3Client` do `@aws-sdk/client-s3` com `endpoint:
     https://<accountId>.r2.cloudflarestorage.com`, `region: 'auto'`; `salvarImagem` →
     `PutObjectCommand` (chave `ficha/<uuid>.<extensão>`), devolve `imagem_url` = URL pública
     base + chave; `excluirImagem` → `DeleteObjectCommand`. Um factory/provider escolhe qual
     implementação injetar com base em `ConfigService.obterConfiguracaoArmazenamento().provedor`.
   - Nota em `docs/DEPLOY.md`: passo a passo de provisionamento do bucket R2 (criar bucket,
     habilitar acesso público — custom domain ou `r2.dev` —, criar API token com permissão
     Object Read & Write escopado ao bucket), mesma seção-runbook de Supabase/JWT hoje.
3. Endpoint dedicado — não cabe no `PUT /ficha/:id` genérico por ser multipart:
   - `POST /ficha/:id/imagem` (`FileInterceptor('arquivo')`) → controller monta
     `{ id, arquivo }` e chama `FichaService.alterarImagem` (controller continua burra,
     proibição #2). Validações de negócio (`BusinessException` se falhar): MIME em
     `image/jpeg`/`image/png`/`image/webp`; tamanho máximo (ex.: 2MB). Permissão: mesma
     `validarPermissaoEdicao` (dono ou mestre) já usada em `alterarFicha`. Ao trocar de
     imagem, **exclui o arquivo anterior** do armazenamento (não acumula lixo). Retorna
     `FichaImagemAlteradaDto`.
   - `DELETE /ficha/:id/imagem` → remove o avatar (seta `imagem_url = null` e exclui o
     arquivo do armazenamento).
4. DTOs (`shared/src/dtos/ficha/ficha-operacao.dtos.ts`):
   - `FichaImagemAlteradaDto { imagemUrl: string | null }` — saída do upload/remoção.
   - `imagemUrl: string | null` somado aos DTOs de leitura que já carregam `nome`/`cor`:
     `FichaCriadaDto`, `FichaAlteradaDto`, `FichaRecuperadaDto`, e também `FichaResumoDto`
     (para o card do acervo).
5. `FichaRepository`: `imagem_url AS "imagemUrl"` nas `SELECT`s relevantes (`recuperarPorId`,
   `colunasResumo()`) + um método de `UPDATE` dedicado só para esse campo — não passa pelo
   `alterarFicha` genérico, que continua só `nome` + `cor` + `dados`.
6. Frontend:
   - `ficha-ident__avatar` (bloco `ficha-ident` do cabeçalho, hoje um `<span>` decorativo
     vazio): troca por um `<img>` real quando `ficha.imagemUrl` existir, mantendo o
     placeholder atual como fallback. Affordance de upload (ícone sobre o avatar), visível só
     a quem tem permissão de edição do cabeçalho — abre
     `<input type="file" accept="image/jpeg,image/png,image/webp">`, valida tamanho no client
     antes de enviar (feedback imediato), envia via `FormData`
     (`FichaService.alterarImagem(id, arquivo)`), atualiza o signal local direto com a nova
     `imagemUrl` — **sem** passar pelo `agendarPersistencia` debounced (upload é imediato,
     não é edição de campo em lote).
   - Card do acervo (`acervo.page.html`): mesma troca de placeholder por `<img>` real quando o
     item (`FichaResumoDto`) tiver `imagemUrl`.
7. **Assistente/guia de criação também coleta o avatar.** Mesmo raciocínio da cor
   (`m3-61`, item 6):
   - **Hoje** (`FichaCriarDialog`): affordance de upload (mesmo `<input type="file">`
     validado no client) ao lado do Codinome. Como `POST /ficha` cria a ficha antes de existir
     um `id` para usar em `POST /ficha/:id/imagem`, o fluxo é **criar a ficha primeiro, então
     subir a imagem em seguida** (dois requests em sequência); falha no upload não desfaz a
     ficha criada — só fica sem avatar, podendo subir depois pelo cabeçalho.
   - **Quando `m3-57` existir**, entra no **Passo 01 // BASE**, com a mesma ressalva de ordem:
     a ficha só existe de fato após o "Criar ficha" do passo 09 // REVISÃO — o passo 01 apenas
     guarda o arquivo escolhido até lá, e o upload real acontece só depois do `POST /ficha`.

## Critérios de Aceite

- Dono ou mestre sobe uma imagem (jpg/png/webp, até 2MB) pela ficha; ela substitui o avatar
  decorativo no cabeçalho e no card do acervo.
- A imagem também pode ser escolhida no momento da criação (`FichaCriarDialog` hoje; Passo 01
  do guia quando `m3-57` existir), sem impedir a criação da ficha se o upload falhar.
- Trocar a imagem remove a anterior do armazenamento — não acumula arquivo órfão.
- Upload fora do tipo ou tamanho permitido é rejeitado com mensagem clara, sem afetar o resto
  da ficha.
- Nenhum binário de imagem é gravado em coluna do Postgres — só `imagem_url` (caminho/URL).
- Em dev, a imagem é servida do disco local (sem credencial real necessária); em produção, o
  upload vai para o bucket R2 configurado (durável, sobrevive a redeploy) — comportamento
  escolhido via `ARMAZENAMENTO_PROVEDOR`.

## Fora de Escopo

- Redimensionamento/compressão da imagem no servidor — sem `sharp` por ora, só validação de
  tipo/tamanho.
- Crop/editor de imagem no client.
- Imagem de criatura/NPC (M4, ainda não existe) — a coluna é ficha-wide, mas sem consumidor
  lá ainda.
- Migração de imagens já existentes (não há nenhuma hoje).

## Dependências

- `m3-28` (acervo de fichas, para o card), CRUD de ficha (`m3-03`).
- Enriquece (não bloqueia) `m3-57` quando esta for implementada.
